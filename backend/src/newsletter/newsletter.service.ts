import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { assertValid } from '../common/errors';
import { checkEmail, Errors, str } from '../common/rules';
import { DatabaseService, Row } from '../database/database.service';
import { toCsv } from '../enquiries/enquiries.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly db: DatabaseService) {}

  subscribe(raw: Row) {
    const email = str(raw.email).toLowerCase();
    const source = str(raw.source).slice(0, 40) || 'footer';
    const e: Errors = {};
    checkEmail(e, email);
    assertValid(e);
    const existing = this.db.get('SELECT id, status FROM subscribers WHERE email = ?', [email]);
    if (existing && existing.status === 'active') return { subscribed: true, alreadySubscribed: true, message: 'You\'re already on the list.' };
    if (existing) {
      this.db.run("UPDATE subscribers SET status = 'active', updated_at = datetime('now') WHERE id = ?", [existing.id]);
      return { subscribed: true, alreadySubscribed: false, message: 'Welcome back — you\'re subscribed again.' };
    }
    this.db.run('INSERT INTO subscribers (email, source, token) VALUES (?, ?, ?)', [email, source, randomBytes(18).toString('base64url')]);
    return { subscribed: true, alreadySubscribed: false, message: 'Subscribed — one email a month.' };
  }

  unsubscribe(token: string) {
    const r = this.db.get('SELECT id FROM subscribers WHERE token = ?', [str(token)]);
    if (!r) throw new NotFoundException('That unsubscribe link is not valid.');
    this.db.run("UPDATE subscribers SET status = 'unsubscribed', updated_at = datetime('now') WHERE id = ?", [r.id]);
    return { unsubscribed: true };
  }

  private map = (r: Row) => ({ id: r.id, email: r.email, status: r.status, source: r.source, createdAt: r.created_at, updatedAt: r.updated_at });

  private where(p: Row) {
    const w: string[] = [], params: unknown[] = [];
    if (p.q && String(p.q).trim()) { w.push('LOWER(email) LIKE ?'); params.push(`%${String(p.q).trim().toLowerCase()}%`); }
    if (p.status === 'active' || p.status === 'unsubscribed') { w.push('status = ?'); params.push(p.status); }
    return { sql: w.length ? 'WHERE ' + w.join(' AND ') : '', params };
  }

  list(p: Row) {
    const { sql, params } = this.where(p);
    const pageSize = Math.min(Math.max(Number(p.pageSize) || 50, 1), 200);
    const page = Math.max(Number(p.page) || 1, 1);
    const total = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM subscribers ${sql}`, params)!.n;
    const rows = this.db.all(`SELECT * FROM subscribers ${sql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    return { items: rows.map(this.map), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  update(id: number, body: Row) {
    if (!this.db.get('SELECT 1 FROM subscribers WHERE id = ?', [id])) throw new NotFoundException('Subscriber not found');
    if (body.status !== 'active' && body.status !== 'unsubscribed') assertValid({ status: 'Status must be active or unsubscribed.' });
    this.db.run("UPDATE subscribers SET status = ?, updated_at = datetime('now') WHERE id = ?", [body.status, id]);
    return this.map(this.db.get('SELECT * FROM subscribers WHERE id = ?', [id])!);
  }

  remove(id: number) {
    const r = this.db.run('DELETE FROM subscribers WHERE id = ?', [id]);
    if (!r.changes) throw new NotFoundException('Subscriber not found');
    return { deleted: true, id };
  }

  csv(p: Row) {
    const { sql, params } = this.where(p);
    return toCsv(['email', 'status', 'source', 'createdAt'], this.db.all(`SELECT * FROM subscribers ${sql} ORDER BY created_at DESC`, params).map(this.map));
  }
}
