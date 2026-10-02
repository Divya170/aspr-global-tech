import { Injectable, NotFoundException } from '@nestjs/common';
import { assertValid } from '../common/errors';
import { newReference } from '../common/reference';
import { checkEmail, checkLength, checkPhone, Errors, MIN_MESSAGE, str } from '../common/rules';
import { ContentService } from '../content/content.service';
import { DatabaseService, parseJson, Row } from '../database/database.service';
import { AttachmentsService } from '../uploads/attachments.service';

export const ENQUIRY_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const;
export const ENQUIRY_SOURCES = ['brief-builder', 'contact-page', 'product-demo', 'chat'] as const;

export interface EnquiryInput {
  source: string; needs: string[]; name: string; email: string; phone: string; company: string;
  contactMethod: string; budget: string; timeline: string; message: string;
}

export interface ListParams {
  q?: string; status?: string; source?: string; from?: string; to?: string;
  page?: number; pageSize?: number; sort?: string;
}

@Injectable()
export class EnquiriesService {
  constructor(private readonly db: DatabaseService, private readonly content: ContentService, private readonly attachments: AttachmentsService) {}

  /** Validates a raw payload against the brief rules and the live option lists. */
  validate(raw: Row): EnquiryInput {
    const settings = this.content.settings(['budgets', 'timelines', 'contactMethods']);
    const allowedNeeds = this.content.items('needs').map((n) => n.label as string);
    const e: Errors = {};
    const needs: string[] = Array.isArray(raw.needs) ? [...new Set(raw.needs.map(str).filter(Boolean))] as string[] : [];
    const input: EnquiryInput = {
      source: str(raw.source) || 'brief-builder',
      needs,
      name: str(raw.name), email: str(raw.email).toLowerCase(), phone: str(raw.phone), company: str(raw.company),
      contactMethod: str(raw.contactMethod) || 'Email', budget: str(raw.budget), timeline: str(raw.timeline), message: str(raw.message),
    };
    if (!(ENQUIRY_SOURCES as readonly string[]).includes(input.source)) input.source = 'brief-builder';
    if (!needs.length) e.needs = 'Pick at least one thing you need — or "Not sure yet".';
    else if (needs.some((n) => !allowedNeeds.includes(n))) e.needs = 'One of the selected needs is no longer offered — please pick again.';
    if (!input.name) e.name = 'Enter your name so we know who to reply to.';
    checkEmail(e, input.email);
    checkPhone(e, input.phone);
    if (input.message.length < MIN_MESSAGE) e.message = 'Give us a little more — at least 20 characters.';
    checkLength(e, 'name', input.name, 'Name');
    checkLength(e, 'company', input.company, 'Company');
    checkLength(e, 'message', input.message, 'Message');
    if (!(settings.contactMethods || []).includes(input.contactMethod)) e.contactMethod = 'Choose how we should reach you.';
    if (input.budget && !(settings.budgets || []).includes(input.budget)) e.budget = 'Choose one of the budget ranges.';
    if (input.timeline && !(settings.timelines || []).includes(input.timeline)) e.timeline = 'Choose one of the launch timelines.';
    assertValid(e);
    return input;
  }

  create(raw: Row, files: Express.Multer.File[] = [], meta: { ip?: string; userAgent?: string } = {}) {
    const input = this.validate(raw);
    const pkg = this.content.suggest(input.needs);
    return this.db.tx(() => {
      const refNo = newReference(this.db, 'enquiries');
      const { lastInsertRowid: id } = this.db.run(
        `INSERT INTO enquiries (ref_no, source, needs, name, email, phone, company, contact_method, budget, timeline, message, suggested_package, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [refNo, input.source, input.needs, input.name, input.email, input.phone, input.company, input.contactMethod, input.budget, input.timeline,
          input.message, pkg ? pkg.name : null, meta.ip || null, (meta.userAgent || '').slice(0, 300)]);
      this.attachments.save('enquiry', id, files);
      return {
        refNo,
        suggestedPackage: pkg,
        attachments: files.length,
        replyVia: input.contactMethod,
        message: 'Brief received — we reply to every enquiry within one working day.',
      };
    });
  }

  private map(r: Row): Row {
    return {
      id: r.id, refNo: r.ref_no, source: r.source, needs: parseJson(r.needs, []), name: r.name, email: r.email, phone: r.phone,
      company: r.company, contactMethod: r.contact_method, budget: r.budget, timeline: r.timeline, message: r.message,
      suggestedPackage: r.suggested_package, status: r.status, notes: r.notes, attachmentCount: r.attachment_count ?? undefined,
      createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  private where(p: ListParams): { sql: string; params: unknown[] } {
    const w: string[] = [], params: unknown[] = [];
    if (p.q && p.q.trim()) {
      const like = `%${p.q.trim().toLowerCase()}%`;
      w.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ? OR LOWER(ref_no) LIKE ? OR phone LIKE ? OR LOWER(message) LIKE ?)');
      params.push(like, like, like, like, like, like);
    }
    if (p.status && (ENQUIRY_STATUSES as readonly string[]).includes(p.status)) { w.push('status = ?'); params.push(p.status); }
    if (p.source && (ENQUIRY_SOURCES as readonly string[]).includes(p.source)) { w.push('source = ?'); params.push(p.source); }
    if (p.from && /^\d{4}-\d{2}-\d{2}$/.test(p.from)) { w.push('date(created_at) >= date(?)'); params.push(p.from); }
    if (p.to && /^\d{4}-\d{2}-\d{2}$/.test(p.to)) { w.push('date(created_at) <= date(?)'); params.push(p.to); }
    return { sql: w.length ? 'WHERE ' + w.join(' AND ') : '', params };
  }

  list(p: ListParams) {
    const { sql, params } = this.where(p);
    const pageSize = Math.min(Math.max(Number(p.pageSize) || 20, 1), 100);
    const page = Math.max(Number(p.page) || 1, 1);
    const order = p.sort === 'oldest' ? 'created_at ASC, id ASC' : p.sort === 'name' ? 'LOWER(name) ASC' : 'created_at DESC, id DESC';
    const total = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM enquiries ${sql}`, params)!.n;
    const rows = this.db.all(
      `SELECT e.*, (SELECT COUNT(*) FROM attachments a WHERE a.owner_type = 'enquiry' AND a.owner_id = e.id) AS attachment_count
       FROM enquiries e ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    return { items: rows.map((r) => this.map(r)), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  get(id: number) {
    const r = this.db.get('SELECT * FROM enquiries WHERE id = ?', [id]);
    if (!r) throw new NotFoundException('Enquiry not found');
    return { ...this.map(r), attachments: this.attachments.list('enquiry', id) };
  }

  update(id: number, body: Row) {
    this.get(id);
    const e: Errors = {}, sets: string[] = [], params: unknown[] = [];
    if (body.status !== undefined) {
      if (!(ENQUIRY_STATUSES as readonly string[]).includes(String(body.status))) e.status = `Status must be one of: ${ENQUIRY_STATUSES.join(', ')}.`;
      else { sets.push('status = ?'); params.push(body.status); }
    }
    if (body.notes !== undefined) {
      const notes = str(body.notes);
      checkLength(e, 'note', notes, 'Notes');
      sets.push('notes = ?'); params.push(notes);
    }
    assertValid(e);
    if (sets.length) this.db.run(`UPDATE enquiries SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...params, id]);
    return this.get(id);
  }

  remove(id: number) {
    this.get(id);
    this.db.tx(() => {
      this.attachments.removeFor('enquiry', id);
      this.db.run('DELETE FROM enquiries WHERE id = ?', [id]);
    });
    return { deleted: true, id };
  }

  csv(p: ListParams): string {
    const { sql, params } = this.where(p);
    const rows = this.db.all(`SELECT * FROM enquiries ${sql} ORDER BY created_at DESC`, params).map((r) => this.map(r));
    const cols = ['refNo', 'createdAt', 'status', 'source', 'name', 'email', 'phone', 'company', 'contactMethod', 'budget', 'timeline', 'needs', 'suggestedPackage', 'message', 'notes'];
    return toCsv(cols, rows);
  }
}

export function toCsv(cols: string[], rows: Row[]): string {
  const esc = (v: unknown) => {
    let s = Array.isArray(v) ? v.join('; ') : v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}
