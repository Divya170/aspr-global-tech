import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { assertValid } from '../common/errors';
import { suggestPackage } from '../common/rules';
import { DatabaseService, parseJson, Row } from '../database/database.service';
import { fromApi, toApi } from './collection-mapper';
import { CollectionDef, getCollection } from './collections';

export interface ListQuery {
  q?: string;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  filters?: Record<string, string>;
}

/** Settings keys the public site may read (everything else is admin-only). */
export const PUBLIC_SETTINGS = ['company', 'heroStrip', 'stats', 'why', 'proof', 'timeline', 'values', 'facts', 'stack', 'teamRoles',
  'hiring', 'budgets', 'timelines', 'contactMethods', 'processGroups', 'showTestimonials', 'serviceDetails', 'productDetails'];

@Injectable()
export class ContentService {
  constructor(private readonly db: DatabaseService) {}

  def(name: string): CollectionDef {
    const d = getCollection(name);
    if (!d) throw new NotFoundException(`Unknown collection "${name}"`);
    return d;
  }

  // ─────────── generic reads ───────────
  list(name: string, query: ListQuery = {}): { items: Row[]; total: number; page: number; pageSize: number } {
    const def = this.def(name);
    const where: string[] = [];
    const params: unknown[] = [];
    if (!query.includeInactive) where.push('active = 1');
    if (query.q && query.q.trim()) {
      const like = `%${query.q.trim().toLowerCase()}%`;
      where.push('(' + def.search.map((c) => `LOWER(COALESCE(${c}, '')) LIKE ?`).join(' OR ') + ')');
      def.search.forEach(() => params.push(like));
    }
    for (const [key, value] of Object.entries(query.filters || {})) {
      const fd = def.fields.find((x) => x.key === key);
      if (!fd || !def.filters.includes(key) || value === undefined || value === '') continue;
      if (fd.type === 'boolean') { where.push(`${fd.column} = ?`); params.push(value === 'true' || value === '1' ? 1 : 0); }
      else if (key === 'featured' && fd.type === 'number') { where.push(value === 'true' ? `${fd.column} > 0` : `${fd.column} = ?`); if (value !== 'true') params.push(Number(value)); }
      else { where.push(`${fd.column} = ?`); params.push(value); }
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${def.table} ${w}`, params)!.n;
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 500, 1), 500);
    const page = Math.max(Number(query.page) || 1, 1);
    const rows = this.db.all(`SELECT * FROM ${def.table} ${w} ORDER BY ${def.orderBy} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    return { items: rows.map((r) => toApi(def, r)!), total, page, pageSize };
  }

  items(name: string, filters: Record<string, string> = {}): Row[] {
    return this.list(name, { filters }).items;
  }

  get(name: string, id: number, includeInactive = true): Row {
    const def = this.def(name);
    const row = this.db.get(`SELECT * FROM ${def.table} WHERE id = ?${includeInactive ? '' : ' AND active = 1'}`, [id]);
    if (!row) throw new NotFoundException(`${def.label}: item ${id} not found`);
    return toApi(def, row)!;
  }

  articleBySlug(slug: string): Row {
    const row = this.db.get('SELECT * FROM articles WHERE slug = ? AND active = 1', [slug]);
    if (!row) throw new NotFoundException('Article not found');
    return toApi(this.def('articles'), row)!;
  }

  // ─────────── generic writes (admin) ───────────
  create(name: string, input: Row): Row {
    const def = this.def(name);
    const m = fromApi(def, input, false);
    assertValid(m.errors);
    this.checkRefs(def, input);
    if (input.sort === undefined || input.sort === null || input.sort === '') {
      const next = this.db.get<{ s: number }>(`SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM ${def.table}`)!.s;
      const i = m.columns.indexOf('sort');
      if (i >= 0) m.values[i] = next; else { m.columns.push('sort'); m.values.push(next); }
    }
    const id = this.unique(def, () => this.db.run(`INSERT INTO ${def.table} (${m.columns.join(', ')}) VALUES (${m.columns.map(() => '?').join(', ')})`, m.values).lastInsertRowid);
    return this.get(name, id);
  }

  update(name: string, id: number, input: Row): Row {
    const def = this.def(name);
    this.get(name, id);
    const m = fromApi(def, input, true);
    assertValid(m.errors);
    this.checkRefs(def, input);
    if (m.columns.length) {
      this.unique(def, () => this.db.run(`UPDATE ${def.table} SET ${m.columns.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...m.values, id]));
    }
    return this.get(name, id);
  }

  remove(name: string, id: number): { deleted: true; id: number } {
    const def = this.def(name);
    this.get(name, id);
    if (name === 'faq-groups') {
      const n = this.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM faqs WHERE group_id = ?', [id])!.n;
      if (n) throw new ConflictException(`Move or delete the ${n} question(s) in this group first.`);
    }
    this.db.run(`DELETE FROM ${def.table} WHERE id = ?`, [id]);
    return { deleted: true, id };
  }

  private checkRefs(def: CollectionDef, input: Row): void {
    for (const fd of def.fields.filter((x) => x.type === 'ref' && input[x.key] !== undefined)) {
      const target = this.def(fd.ref!.collection);
      if (!this.db.get(`SELECT 1 FROM ${target.table} WHERE id = ?`, [Number(input[fd.key])])) assertValid({ [fd.key]: `Choose an existing ${target.label.toLowerCase()}.` });
    }
  }

  private unique<T>(def: CollectionDef, fn: () => T): T {
    try {
      return fn();
    } catch (e: any) {
      const m = /UNIQUE constraint failed: \w+\.(\w+)/.exec(String(e?.message));
      if (m) {
        const fd = def.fields.find((x) => x.column === m[1]);
        assertValid({ [fd?.key || m[1]]: `That ${fd?.label.toLowerCase() || m[1]} is already used by another item.` });
      }
      throw e;
    }
  }

  // ─────────── settings ───────────
  settings(keys?: string[]): Row {
    const rows = this.db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
    const out: Row = {};
    for (const r of rows) if (!keys || keys.includes(r.key)) out[r.key] = parseJson(r.value, null);
    return out;
  }

  saveSetting(key: string, value: unknown): Row {
    if (!/^[a-zA-Z][\w-]{0,40}$/.test(key)) assertValid({ key: 'Setting keys may contain letters, numbers, dashes and underscores.' });
    if (value === undefined) assertValid({ value: 'A value is required.' });
    this.db.run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, JSON.stringify(value)]);
    return { key, value };
  }

  // ─────────── page payloads ───────────
  /** Everything the home page renders, in one request. */
  home(): Row {
    const faqs = this.items('faqs').filter((q) => q.featured > 0).sort((a, b) => a.featured - b.featured).slice(0, 4);
    return {
      settings: this.settings(PUBLIC_SETTINGS),
      services: this.items('services'),
      products: this.items('products'),
      industries: this.items('industries'),
      work: this.items('work', { featured: 'true' }).slice(0, 3),
      steps: this.items('steps'),
      faqs: faqs.map(({ slug, question, answer }) => ({ slug, question, answer })),
      faqTotal: this.list('faqs').total,
      packages: this.items('packages'),
      needs: this.items('needs'),
    };
  }

  /** Everything the company section (About…Contact) renders, in one request. */
  company(): Row {
    const groups = this.items('faq-groups');
    const faqs = this.items('faqs');
    return {
      settings: this.settings(PUBLIC_SETTINGS),
      steps: this.items('steps'),
      work: this.items('work'),
      roles: this.items('roles'),
      articles: this.items('articles'),
      faqGroups: groups.map((g) => ({ id: g.id, title: g.title, faqs: faqs.filter((q) => q.groupId === g.id).map(({ slug, question, answer }) => ({ slug, question, answer })) })),
      products: this.items('products').map(({ name }) => ({ name })),
      packages: this.items('packages'),
      needs: this.items('needs'),
    };
  }

  suggest(needs: string[]): Row | null {
    const p = suggestPackage(this.items('packages') as any[], needs);
    return p ? { name: p.name, services: p.services, outcome: p.outcome, price: p.price, matched: p.matched, match: `${p.matched} OF ${p.services.length} MATCH` } : null;
  }
}
