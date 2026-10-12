import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { DatabaseService } from '../database/database.service';
import type { Email } from './templates';

const MAX_ATTEMPTS = 6;
const TICK_MS = 15_000;

/**
 * Transactional email through an outbox: send() only writes a row, so a mail-server outage
 * never fails or slows a form submission. A worker delivers due rows over SMTP and retries
 * failures with exponential backoff (1, 2, 4, 8, 16 minutes). Without SMTP settings, rows are
 * marked "skipped" so nothing piles up.
 */
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Mail');
  private transport: Transporter | null = null;
  private timer?: NodeJS.Timeout;
  private busy = false;

  constructor(private readonly db: DatabaseService) {}

  get enabled(): boolean {
    return !!config.smtp.host;
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.transport = nodemailer.createTransport({
        host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      });
      this.logger.log(`Email via ${config.smtp.host}:${config.smtp.port}`);
    } else {
      this.logger.warn('SMTP_HOST is not set: emails are recorded in the outbox but not sent.');
    }
    this.timer = setInterval(() => void this.flush(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Queues an email. `to` may be a comma-separated list. */
  send(template: string, to: string, email: Email, replyTo?: string): void {
    const recipients = to.split(',').map((s) => s.trim()).filter(Boolean);
    for (const addr of recipients) {
      this.db.run('INSERT INTO email_outbox (template, to_addr, reply_to, subject, html, text, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [template, addr, replyTo || null, email.subject, email.html, email.text, this.enabled ? 'pending' : 'skipped']);
    }
    if (this.enabled) setImmediate(() => void this.flush());
  }

  async flush(): Promise<void> {
    if (!this.transport || this.busy) return;
    this.busy = true;
    try {
      const due = this.db.all("SELECT * FROM email_outbox WHERE status = 'pending' AND send_after <= datetime('now') ORDER BY id LIMIT 10");
      for (const m of due) {
        try {
          await this.transport.sendMail({ from: config.mailFrom, to: m.to_addr, replyTo: m.reply_to || undefined, subject: m.subject, html: m.html, text: m.text });
          this.db.run("UPDATE email_outbox SET status = 'sent', attempts = attempts + 1, sent_at = datetime('now'), last_error = NULL WHERE id = ?", [m.id]);
        } catch (e) {
          const attempts = m.attempts + 1;
          const failed = attempts >= MAX_ATTEMPTS;
          this.db.run(`UPDATE email_outbox SET attempts = ?, last_error = ?, status = ?, send_after = datetime('now', ?) WHERE id = ?`,
            [attempts, String((e as Error).message).slice(0, 500), failed ? 'failed' : 'pending', `+${2 ** (attempts - 1)} minutes`, m.id]);
          this.logger.warn(`Email #${m.id} (${m.template}) attempt ${attempts} failed: ${(e as Error).message}`);
        }
      }
    } finally {
      this.busy = false;
    }
  }

  status() {
    const counts = Object.fromEntries(this.db.all<{ status: string; n: number }>('SELECT status, COUNT(*) AS n FROM email_outbox GROUP BY status').map((r) => [r.status, r.n]));
    const recent = this.db.all('SELECT id, template, to_addr AS "to", subject, status, attempts, last_error AS lastError, created_at AS createdAt, sent_at AS sentAt FROM email_outbox ORDER BY id DESC LIMIT 20');
    return { enabled: this.enabled, counts, recent };
  }
}
