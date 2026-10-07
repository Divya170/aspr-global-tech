import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../admin/permissions';
import { toCsv } from '../common/csv';
import { assertValid } from '../common/errors';
import { newReference } from '../common/reference';
import { checkEmail, checkLength, checkPhone, Errors, str } from '../common/rules';
import { config } from '../config';
import { ContentService } from '../content/content.service';
import { DatabaseService, Row } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { applicationForApplicant, applicationForTeam } from '../mail/templates';
import { ActivityService } from '../ops/activity.service';
import { NotificationsService } from '../ops/notifications.service';
import { AttachmentsService } from '../uploads/attachments.service';

const MAX_LINKS = 6;

export const APPLICATION_STATUSES = ['new', 'shortlisted', 'task-sent', 'interview', 'offer', 'rejected'] as const;

export interface AppListParams { q?: string; status?: string; roleId?: string; page?: number; pageSize?: number; sort?: string }

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger('Applications');

  constructor(
    private readonly db: DatabaseService,
    private readonly attachments: AttachmentsService,
    private readonly content: ContentService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  create(roleId: number, raw: Row, files: Express.Multer.File[] = [], meta: { ip?: string; userAgent?: string } = {}) {
    const role = this.db.get('SELECT id, title FROM roles WHERE id = ? AND active = 1', [roleId]);
    if (!role) throw new NotFoundException('This role is no longer open.');
    // Work links arrive as `links` (portfolio, GitHub, LinkedIn…); a single `portfolio` string is still accepted.
    const links: string[] = (Array.isArray(raw.links) ? raw.links.map(str) : str(raw.portfolio).split(/\s*\n\s*/)).filter(Boolean);
    const input = {
      name: str(raw.name), email: str(raw.email).toLowerCase(), phone: str(raw.phone),
      portfolio: links.join('\n'), message: str(raw.message),
    };
    const e: Errors = {};
    if (!input.name) e.name = 'Enter your name.';
    checkEmail(e, input.email, 'That email looks incomplete.');
    checkPhone(e, input.phone);
    const URL_RE = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i;
    if (!links.length && !files.length) e.portfolio = 'Send work, not a template CV — add a portfolio link or attach files.';
    else if (links.length > MAX_LINKS) e.portfolio = `Add up to ${MAX_LINKS} links.`;
    else if (links.some((l) => !URL_RE.test(l))) e.portfolio = 'One of the links doesn\'t look right — paste the full URL.';
    checkLength(e, 'name', input.name, 'Name');
    checkLength(e, 'portfolio', input.portfolio, 'Your links');
    checkLength(e, 'message', input.message, 'Message');
    assertValid(e);
    const { id, refNo } = this.db.tx(() => {
      const ref = newReference(this.db, 'applications');
      const { lastInsertRowid } = this.db.run(
        'INSERT INTO applications (ref_no, role_id, role_title, name, email, phone, portfolio, message, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ref, role.id, role.title, input.name, input.email, input.phone, input.portfolio, input.message, meta.ip || null, (meta.userAgent || '').slice(0, 300)]);
      this.attachments.save('application', lastInsertRowid, files);
      return { id: lastInsertRowid, refNo: ref };
    });
    try {
      const data = { id, refNo, role: role.title, name: input.name, email: input.email, phone: input.phone, portfolio: input.portfolio, attachments: files.length };
      this.notifications.create({ type: 'application', title: `New application: ${role.title}`, body: `${input.name} · ${refNo}`, link: '/admin/applications', entity: 'application', entityId: id });
      this.activity.log(null, { action: 'application.created', entity: 'application', entityId: id, summary: `${input.name} applied for ${role.title} (${refNo})` });
      const company = this.content.settings(['company']).company || {};
      this.mail.send('application-team', company.careersEmail || company.email || config.adminEmail, applicationForTeam(data), input.email);
      this.mail.send('application-applicant', input.email, applicationForApplicant(data), company.careersEmail);
    } catch (e) {
      this.logger.error(`Application ${refNo} saved, but follow-up failed: ${(e as Error).message}`);
    }
    return { refNo, role: role.title, attachments: files.length, message: 'Application received. We look at the work first and reply within one working day.' };
  }

  roles() {
    return this.db.all('SELECT id, title, active FROM roles ORDER BY sort, id').map((r) => ({ id: r.id, title: r.title, open: !!r.active }));
  }

  private map(r: Row): Row {
    return { id: r.id, refNo: r.ref_no, roleId: r.role_id, roleTitle: r.role_title, name: r.name, email: r.email, phone: r.phone,
      portfolio: r.portfolio, message: r.message, status: r.status, notes: r.notes, attachmentCount: r.attachment_count ?? undefined,
      createdAt: r.created_at, updatedAt: r.updated_at };
  }

  private where(p: AppListParams) {
    const w: string[] = [], params: unknown[] = [];
    if (p.q && p.q.trim()) {
      const like = `%${p.q.trim().toLowerCase()}%`;
      w.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(ref_no) LIKE ? OR LOWER(role_title) LIKE ? OR LOWER(portfolio) LIKE ?)');
      params.push(like, like, like, like, like);
    }
    if (p.status && (APPLICATION_STATUSES as readonly string[]).includes(p.status)) { w.push('status = ?'); params.push(p.status); }
    if (p.roleId && /^\d+$/.test(String(p.roleId))) { w.push('role_id = ?'); params.push(Number(p.roleId)); }
    return { sql: w.length ? 'WHERE ' + w.join(' AND ') : '', params };
  }

  list(p: AppListParams) {
    const { sql, params } = this.where(p);
    const pageSize = Math.min(Math.max(Number(p.pageSize) || 20, 1), 100);
    const page = Math.max(Number(p.page) || 1, 1);
    const order = p.sort === 'oldest' ? 'created_at ASC, id ASC' : p.sort === 'name' ? 'LOWER(name) ASC' : 'created_at DESC, id DESC';
    const total = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM applications ${sql}`, params)!.n;
    const rows = this.db.all(`SELECT a.*, (SELECT COUNT(*) FROM attachments t WHERE t.owner_type = 'application' AND t.owner_id = a.id) AS attachment_count
      FROM applications a ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    return { items: rows.map((r) => this.map(r)), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  get(id: number): Row {
    const r = this.db.get('SELECT * FROM applications WHERE id = ?', [id]);
    if (!r) throw new NotFoundException('Application not found');
    return { ...this.map(r), attachments: this.attachments.list('application', id) };
  }

  update(id: number, body: Row, actor: SessionUser, ip?: string) {
    const before = this.get(id);
    const e: Errors = {}, sets: string[] = [], params: unknown[] = [];
    if (body.status !== undefined) {
      if (!(APPLICATION_STATUSES as readonly string[]).includes(String(body.status))) e.status = `Status must be one of: ${APPLICATION_STATUSES.join(', ')}.`;
      else { sets.push('status = ?'); params.push(body.status); }
    }
    if (body.notes !== undefined) { const n = str(body.notes); checkLength(e, 'note', n, 'Notes'); sets.push('notes = ?'); params.push(n); }
    assertValid(e);
    if (sets.length) {
      this.db.run(`UPDATE applications SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...params, id]);
      this.activity.log(actor, { action: 'application.updated', entity: 'application', entityId: id, summary: `${before.refNo}${body.status && body.status !== before.status ? `: status → ${body.status}` : ': notes updated'}` }, ip);
    }
    return this.get(id);
  }

  remove(id: number, actor: SessionUser, ip?: string) {
    const a = this.get(id);
    this.db.tx(() => { this.attachments.removeFor('application', id); this.db.run('DELETE FROM applications WHERE id = ?', [id]); });
    this.activity.log(actor, { action: 'application.deleted', entity: 'application', entityId: id, summary: `Deleted ${a.refNo} (${a.name})` }, ip);
    return { deleted: true, id };
  }

  csv(p: AppListParams): string {
    const { sql, params } = this.where(p);
    const rows = this.db.all(`SELECT * FROM applications ${sql} ORDER BY created_at DESC`, params).map((r) => this.map(r));
    return toCsv(['refNo', 'createdAt', 'status', 'roleTitle', 'name', 'email', 'phone', 'portfolio', 'message', 'notes'], rows);
  }
}
