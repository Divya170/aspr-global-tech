import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { toCsv } from '../common/csv';
import { assertValid, fail } from '../common/errors';
import { newReference } from '../common/reference';
import { checkEmail, checkLength, checkOptionalPhone, Errors, MIN_MESSAGE, str } from '../common/rules';
import { config } from '../config';
import { ContentService } from '../content/content.service';
import { DatabaseService, parseJson, Row } from '../database/database.service';
import type { SessionUser } from '../admin/permissions';
import { MailService } from '../mail/mail.service';
import { LeadEmailData, leadForClient, leadForTeam } from '../mail/templates';
import { ActivityService } from '../ops/activity.service';
import { NotificationsService } from '../ops/notifications.service';
import { AttachmentsService } from '../uploads/attachments.service';

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal-sent', 'negotiation', 'won', 'lost', 'spam'] as const;
export const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', 'proposal-sent': 'Proposal sent', negotiation: 'Negotiation', won: 'Won', lost: 'Lost', spam: 'Spam',
};
export const LEAD_SOURCES = ['quote', 'contact', 'chat', 'brief-builder', 'contact-page', 'product-demo'] as const;
export type LeadSource = 'quote' | 'contact' | 'chat';

export interface LeadInput {
  source: LeadSource; projectType: string; name: string; email: string; phone: string; company: string;
  budget: string; timeline: string; heardFrom: string; message: string;
}

export interface ListParams {
  q?: string; status?: string; source?: string; projectType?: string; budget?: string; assignedTo?: string;
  from?: string; to?: string; page?: number; pageSize?: number; sort?: string;
}

const SORTS: Record<string, string> = {
  newest: 'e.created_at DESC, e.id DESC', oldest: 'e.created_at ASC, e.id ASC', name: 'LOWER(e.name) ASC', updated: 'e.updated_at DESC',
  status: `CASE e.status ${LEAD_STATUSES.map((s, i) => `WHEN '${s}' THEN ${i}`).join(' ')} END, e.created_at DESC`,
};

/**
 * Leads: quote requests, contact enquiries and chat leads. Each new lead gets an inquiry ID,
 * a staff notification, an audit entry, an email to the team and a confirmation to the client.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger('Leads');

  constructor(
    private readonly db: DatabaseService,
    private readonly content: ContentService,
    private readonly attachments: AttachmentsService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  /** Validates a public submission against the rules and the live option lists in Settings. */
  validate(raw: Row, source: LeadSource): LeadInput {
    const s = this.content.settings(['projectTypes', 'budgets', 'timelines', 'heardFrom']);
    const input: LeadInput = {
      source,
      projectType: str(raw.projectType), name: str(raw.name), email: str(raw.email).toLowerCase(), phone: str(raw.phone),
      company: str(raw.company), budget: str(raw.budget), timeline: str(raw.timeline), heardFrom: str(raw.heardFrom), message: str(raw.message),
    };
    const e: Errors = {};
    const oneOf = (key: keyof LeadInput, list: string[] | undefined, required: boolean, msg: string) => {
      const v = input[key];
      if (!v) { if (required) e[key] = msg; } else if (!(list || []).includes(v)) e[key] = msg;
    };
    oneOf('projectType', s.projectTypes, true, 'Choose the type of project.');
    oneOf('budget', s.budgets, source === 'quote', 'Choose a budget range.');
    oneOf('timeline', s.timelines, source === 'quote', 'Choose a timeline.');
    oneOf('heardFrom', s.heardFrom, false, 'Choose one of the options.');
    if (!input.name) e.name = 'Enter your name so we know who to reply to.';
    checkEmail(e, input.email);
    checkOptionalPhone(e, input.phone);
    const min = source === 'chat' ? 10 : MIN_MESSAGE;
    if (input.message.length < min) e.message = `Tell us a little more: at least ${min} characters.`;
    checkLength(e, 'name', input.name, 'Name');
    checkLength(e, 'company', input.company, 'Company');
    checkLength(e, 'message', input.message, 'Message');
    assertValid(e);
    return input;
  }

  create(raw: Row, source: LeadSource, files: Express.Multer.File[] = [], meta: { ip?: string; userAgent?: string } = {}) {
    const input = this.validate(raw, source);
    // Honeypot: a hidden field people never fill in. Bots get the normal answer; the lead is filed as spam, silently.
    const spam = !!str(raw.website);
    const lead = this.db.tx(() => {
      const refNo = newReference(this.db, 'enquiries');
      const { lastInsertRowid: id } = this.db.run(
        `INSERT INTO enquiries (ref_no, source, project_type, needs, name, email, phone, company, budget, timeline, heard_from, message, status, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [refNo, source, input.projectType, [input.projectType], input.name, input.email, input.phone, input.company, input.budget, input.timeline,
          input.heardFrom, input.message, spam ? 'spam' : 'new', meta.ip || null, (meta.userAgent || '').slice(0, 300)]);
      this.attachments.save('enquiry', id, files);
      return { id, refNo };
    });
    if (!spam) this.announce({ ...input, ...lead, attachments: files.length });
    return {
      refNo: lead.refNo,
      message: 'Thanks! Your inquiry is with our team. We reply to every inquiry within one working day.',
    };
  }

  /** Notification, audit entry and the two emails. Never throws: the lead is already saved. */
  private announce(l: LeadEmailData) {
    try {
      const label = l.source === 'contact' ? 'New contact message' : l.source === 'chat' ? 'New chat lead' : 'New quote request';
      this.notifications.create({
        type: l.source === 'contact' ? 'contact' : 'lead', title: `${label}: ${l.name}`,
        body: [l.refNo, l.projectType, l.budget].filter(Boolean).join(' · '), link: `/admin/leads/${l.id}`, entity: 'lead', entityId: l.id,
      });
      this.activity.log(null, { action: 'lead.created', entity: 'lead', entityId: l.id, summary: `${label} ${l.refNo} from ${l.name}` });
      const company = this.content.settings(['company']).company || {};
      this.mail.send('lead-team', config.leadsNotifyTo || company.email || config.adminEmail, leadForTeam(l), l.email);
      this.mail.send('lead-client', l.email, leadForClient(l, company), company.email);
    } catch (e) {
      this.logger.error(`Lead ${l.refNo} saved, but follow-up failed: ${(e as Error).message}`);
    }
  }

  // ─────────── admin ───────────

  private map(r: Row): Row {
    return {
      id: r.id, refNo: r.ref_no, source: r.source, projectType: r.project_type, needs: parseJson(r.needs, []), name: r.name, email: r.email,
      phone: r.phone, company: r.company, budget: r.budget, timeline: r.timeline, heardFrom: r.heard_from, message: r.message,
      status: r.status, statusLabel: STATUS_LABELS[r.status] || r.status,
      assignedTo: r.assigned_to ? { id: r.assigned_to, name: r.assignee_name } : null,
      attachmentCount: r.attachment_count ?? undefined, noteCount: r.note_count ?? undefined,
      createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  private where(p: ListParams): { sql: string; params: unknown[] } {
    const w: string[] = [], params: unknown[] = [];
    if (p.q && p.q.trim()) {
      const like = `%${p.q.trim().toLowerCase()}%`;
      w.push('(LOWER(e.name) LIKE ? OR LOWER(e.email) LIKE ? OR LOWER(e.company) LIKE ? OR LOWER(e.ref_no) LIKE ? OR LOWER(e.project_type) LIKE ? OR e.phone LIKE ? OR LOWER(e.message) LIKE ?)');
      params.push(like, like, like, like, like, like, like);
    }
    if (p.status === 'open') w.push("e.status NOT IN ('won','lost','spam')");
    else if (p.status && (LEAD_STATUSES as readonly string[]).includes(p.status)) { w.push('e.status = ?'); params.push(p.status); }
    else if (!p.status) w.push("e.status <> 'spam'");
    if (p.source && (LEAD_SOURCES as readonly string[]).includes(p.source)) { w.push('e.source = ?'); params.push(p.source); }
    if (p.projectType) { w.push('e.project_type = ?'); params.push(String(p.projectType)); }
    if (p.budget) { w.push('e.budget = ?'); params.push(String(p.budget)); }
    if (p.assignedTo === 'none') w.push('e.assigned_to IS NULL');
    else if (p.assignedTo && /^\d+$/.test(String(p.assignedTo))) { w.push('e.assigned_to = ?'); params.push(Number(p.assignedTo)); }
    if (p.from && /^\d{4}-\d{2}-\d{2}$/.test(p.from)) { w.push('date(e.created_at) >= date(?)'); params.push(p.from); }
    if (p.to && /^\d{4}-\d{2}-\d{2}$/.test(p.to)) { w.push('date(e.created_at) <= date(?)'); params.push(p.to); }
    return { sql: w.length ? 'WHERE ' + w.join(' AND ') : '', params };
  }

  list(p: ListParams) {
    const { sql, params } = this.where(p);
    const pageSize = Math.min(Math.max(Number(p.pageSize) || 25, 1), 100);
    const page = Math.max(Number(p.page) || 1, 1);
    const total = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM enquiries e ${sql}`, params)!.n;
    const rows = this.db.all(
      `SELECT e.*, u.name AS assignee_name,
        (SELECT COUNT(*) FROM attachments a WHERE a.owner_type = 'enquiry' AND a.owner_id = e.id) AS attachment_count,
        (SELECT COUNT(*) FROM lead_notes n WHERE n.enquiry_id = e.id) AS note_count
       FROM enquiries e LEFT JOIN users u ON u.id = e.assigned_to ${sql} ORDER BY ${SORTS[String(p.sort)] || SORTS.newest} LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]);
    return { items: rows.map((r) => this.map(r)), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  /** Filter options for the leads table. */
  facets() {
    const distinct = (col: string) => this.db.all<{ v: string }>(`SELECT DISTINCT ${col} AS v FROM enquiries WHERE ${col} <> '' ORDER BY v`).map((r) => r.v);
    return {
      statuses: LEAD_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
      projectTypes: [...new Set([...(this.content.settings(['projectTypes']).projectTypes || []), ...distinct('project_type')])],
      budgets: [...new Set([...(this.content.settings(['budgets']).budgets || []), ...distinct('budget')])],
      sources: LEAD_SOURCES,
    };
  }

  private row(id: number): Row {
    const r = this.db.get('SELECT e.*, u.name AS assignee_name FROM enquiries e LEFT JOIN users u ON u.id = e.assigned_to WHERE e.id = ?', [id]);
    if (!r) throw new NotFoundException('Lead not found');
    return r;
  }

  get(id: number) {
    const r = this.row(id);
    return {
      ...this.map(r),
      attachments: this.attachments.list('enquiry', id),
      notes: this.db.all(`SELECT n.id, n.body, n.created_at AS createdAt, u.name AS author FROM lead_notes n LEFT JOIN users u ON u.id = n.user_id
        WHERE n.enquiry_id = ? ORDER BY n.id DESC`, [id]).map((n) => ({ ...n, author: n.author || 'Imported note' })),
      activity: this.activity.list({ entity: 'lead', entityId: id, pageSize: 50 }).items,
    };
  }

  update(id: number, body: Row, actor: SessionUser, ip?: string) {
    const before = this.row(id);
    const e: Errors = {}, sets: string[] = [], params: unknown[] = [], changes: string[] = [];
    if (body.status !== undefined && body.status !== before.status) {
      if (!(LEAD_STATUSES as readonly string[]).includes(String(body.status))) e.status = 'Choose a valid status.';
      else { sets.push('status = ?'); params.push(body.status); changes.push(`status ${STATUS_LABELS[before.status]} → ${STATUS_LABELS[String(body.status)]}`); }
    }
    if (body.assignedTo !== undefined) {
      const to = body.assignedTo === null || body.assignedTo === '' ? null : Number(body.assignedTo);
      if (to !== before.assigned_to) {
        const user = to === null ? null : this.db.get("SELECT id, name FROM users WHERE id = ? AND kind = 'staff' AND status = 'active'", [to]);
        if (to !== null && !user) e.assignedTo = 'Choose an active team member.';
        else { sets.push('assigned_to = ?'); params.push(to); changes.push(user ? `assigned to ${user.name}` : 'unassigned'); }
      }
    }
    assertValid(e);
    if (sets.length) {
      this.db.run(`UPDATE enquiries SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...params, id]);
      this.activity.log(actor, { action: 'lead.updated', entity: 'lead', entityId: id, summary: `${before.ref_no}: ${changes.join(', ')}` }, ip);
    }
    return this.get(id);
  }

  addNote(id: number, body: Row, actor: SessionUser, ip?: string) {
    const lead = this.row(id);
    const text = str(body.body);
    if (!text) fail({ body: 'Write a note first.' });
    const e: Errors = {};
    checkLength(e, 'note', text, 'Note');
    assertValid(e);
    this.db.run('INSERT INTO lead_notes (enquiry_id, user_id, body) VALUES (?, ?, ?)', [id, actor.id, text]);
    this.db.run("UPDATE enquiries SET updated_at = datetime('now') WHERE id = ?", [id]);
    this.activity.log(actor, { action: 'lead.note', entity: 'lead', entityId: id, summary: `${lead.ref_no}: added a note` }, ip);
    return this.get(id);
  }

  remove(id: number, actor: SessionUser, ip?: string) {
    const lead = this.row(id);
    this.db.tx(() => {
      this.attachments.removeFor('enquiry', id);
      this.db.run('DELETE FROM enquiries WHERE id = ?', [id]);
    });
    this.activity.log(actor, { action: 'lead.deleted', entity: 'lead', entityId: id, summary: `Deleted ${lead.ref_no} (${lead.name})` }, ip);
    return { deleted: true, id };
  }

  csv(p: ListParams): string {
    const { sql, params } = this.where(p);
    const rows = this.db.all(`SELECT e.*, u.name AS assignee_name FROM enquiries e LEFT JOIN users u ON u.id = e.assigned_to ${sql} ORDER BY e.created_at DESC`, params)
      .map((r) => ({ ...this.map(r), status: STATUS_LABELS[r.status] || r.status, assignedTo: r.assignee_name || '' }));
    return toCsv(['refNo', 'createdAt', 'status', 'source', 'projectType', 'budget', 'timeline', 'name', 'email', 'phone', 'company', 'heardFrom', 'assignedTo', 'message'], rows);
  }
}
