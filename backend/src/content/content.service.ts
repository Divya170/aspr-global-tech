import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { assertValid } from '../common/errors';
import { DatabaseService, parseJson, Row } from '../database/database.service';
import type { SessionUser } from '../admin/permissions';
import { ActivityService } from '../ops/activity.service';
import { RevalidateService } from '../ops/revalidate.service';
import { fromApi, toApi } from './collection-mapper';
import { CollectionDef, FieldDef, getCollection } from './collections';

export interface ListQuery {
  q?: string;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  filters?: Record<string, string>;
}

/** Settings keys the public site may read (everything else is admin-only). */
export const PUBLIC_SETTINGS = ['company', 'hero', 'stats', 'why', 'timeline', 'values', 'facts', 'teamRoles', 'hiring',
  'budgets', 'timelines', 'projectTypes', 'heardFrom', 'processGroups', 'productDetails'];

type Actor = { user?: SessionUser; ip?: string };

@Injectable()
export class ContentService {
  constructor(private readonly db: DatabaseService, private readonly activity: ActivityService, private readonly revalidate: RevalidateService) {}

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
    return { items: this.hydrate(def, rows.map((r) => toApi(def, r)!)), total, page, pageSize };
  }

  items(name: string, filters: Record<string, string> = {}): Row[] {
    return this.list(name, { filters }).items;
  }

  get(name: string, id: number, includeInactive = true): Row {
    const def = this.def(name);
    const row = this.db.get(`SELECT * FROM ${def.table} WHERE id = ?${includeInactive ? '' : ' AND active = 1'}`, [id]);
    if (!row) throw new NotFoundException(`${def.label}: item ${id} not found`);
    return this.hydrate(def, [toApi(def, row)!])[0];
  }

  bySlug(name: string, slug: string): Row {
    const def = this.def(name);
    const row = this.db.get(`SELECT * FROM ${def.table} WHERE slug = ? AND active = 1`, [String(slug)]);
    if (!row) throw new NotFoundException(`${def.label.replace(/s$/, '')} not found`);
    return this.hydrate(def, [toApi(def, row)!])[0];
  }

  /** Fills many-to-many fields with the linked ids, one query per field. */
  private hydrate(def: CollectionDef, items: Row[]): Row[] {
    const refs = def.fields.filter((fd) => fd.type === 'refs');
    if (!refs.length || !items.length) return items;
    const ids = items.map((i) => i.id);
    for (const fd of refs) {
      const t = fd.through!;
      const links = this.db.all<{ own: number; other: number }>(
        `SELECT ${t.own} AS own, ${t.other} AS other FROM ${t.table} WHERE ${t.own} IN (${ids.map(() => '?').join(',')})`, ids);
      for (const item of items) item[fd.key] = links.filter((l) => l.own === item.id).map((l) => l.other);
    }
    return items;
  }

  // ─────────── generic writes (admin) ───────────
  create(name: string, input: Row, actor: Actor = {}): Row {
    const def = this.def(name);
    const m = fromApi(def, input, false);
    assertValid(m.errors);
    this.checkRefs(def, input);
    this.checkRules(name, { ...input });
    if (input.sort === undefined || input.sort === null || input.sort === '') {
      const next = this.db.get<{ s: number }>(`SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM ${def.table}`)!.s;
      const i = m.columns.indexOf('sort');
      if (i >= 0) m.values[i] = next; else { m.columns.push('sort'); m.values.push(next); }
    }
    const id = this.db.tx(() => {
      const newId = this.unique(def, () => this.db.run(`INSERT INTO ${def.table} (${m.columns.join(', ')}) VALUES (${m.columns.map(() => '?').join(', ')})`, m.values).lastInsertRowid);
      this.writeRefs(def, newId, input);
      return newId;
    });
    const item = this.get(name, id);
    this.changed(def, 'created', item, actor);
    return item;
  }

  update(name: string, id: number, input: Row, actor: Actor = {}): Row {
    const def = this.def(name);
    const before = this.get(name, id);
    const m = fromApi(def, input, true);
    assertValid(m.errors);
    this.checkRefs(def, input);
    this.checkRules(name, { ...before, ...input });
    this.db.tx(() => {
      if (m.columns.length) {
        this.unique(def, () => this.db.run(`UPDATE ${def.table} SET ${m.columns.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...m.values, id]));
      }
      this.writeRefs(def, id, input);
    });
    const item = this.get(name, id);
    this.changed(def, 'updated', item, actor);
    return item;
  }

  remove(name: string, id: number, actor: Actor = {}): { deleted: true; id: number } {
    const def = this.def(name);
    const item = this.get(name, id);
    const blockers: Record<string, [string, string]> = {
      'faq-groups': ['SELECT COUNT(*) AS n FROM faqs WHERE group_id = ?', 'question(s) in this group'],
      'project-categories': ['SELECT COUNT(*) AS n FROM projects WHERE category_id = ?', 'project(s) in this category'],
    };
    if (blockers[name]) {
      const n = this.db.get<{ n: number }>(blockers[name][0], [id])!.n;
      if (n) throw new ConflictException(`Move or delete the ${n} ${blockers[name][1]} first.`);
    }
    this.db.run(`DELETE FROM ${def.table} WHERE id = ?`, [id]);
    this.changed(def, 'deleted', item, actor);
    return { deleted: true, id };
  }

  private changed(def: CollectionDef, verb: string, item: Row, actor: Actor) {
    const title = String(item[def.titleKey] ?? `#${item.id}`);
    this.activity.log(actor.user, { action: `content.${verb}`, entity: def.name, entityId: item.id, summary: `${def.label}: ${verb} "${title.slice(0, 120)}"` }, actor.ip);
    this.revalidate.content();
  }

  /** Rules that span fields. */
  private checkRules(name: string, merged: Row) {
    if (name === 'testimonials' && merged.active !== false && !merged.consent) {
      assertValid({ consent: 'Confirm the client approved publishing, or keep the testimonial unpublished.' });
    }
    if (name === 'projects' && merged.caseStudy && !(String(merged.overview || '').trim() && String(merged.solution || '').trim())) {
      assertValid({ caseStudy: 'Write at least the overview and solution before turning on the case study page.' });
    }
  }

  private checkRefs(def: CollectionDef, input: Row): void {
    for (const fd of def.fields.filter((x) => (x.type === 'ref' || x.type === 'refs') && input[x.key] !== undefined && input[x.key] !== null && input[x.key] !== '')) {
      const target = this.def(fd.ref!.collection);
      const ids = fd.type === 'refs' ? this.refIds(fd, input[fd.key]) : [Number(input[fd.key])];
      for (const id of ids) {
        if (!this.db.get(`SELECT 1 FROM ${target.table} WHERE id = ?`, [id])) assertValid({ [fd.key]: `Choose an existing ${target.label.toLowerCase().replace(/s$/, '')}.` });
      }
    }
  }

  private refIds(fd: FieldDef, raw: unknown): number[] {
    if (!Array.isArray(raw)) assertValid({ [fd.key]: `${fd.label} must be a list.` });
    return [...new Set((raw as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  }

  private writeRefs(def: CollectionDef, id: number, input: Row) {
    for (const fd of def.fields.filter((x) => x.type === 'refs' && input[x.key] !== undefined)) {
      const t = fd.through!;
      this.db.run(`DELETE FROM ${t.table} WHERE ${t.own} = ?`, [id]);
      for (const other of this.refIds(fd, input[fd.key] ?? [])) this.db.run(`INSERT INTO ${t.table} (${t.own}, ${t.other}) VALUES (?, ?)`, [id, other]);
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

  saveSetting(key: string, value: unknown, actor: Actor = {}): Row {
    if (!/^[a-zA-Z][\w-]{0,40}$/.test(key)) assertValid({ key: 'Setting keys may contain letters, numbers, dashes and underscores.' });
    if (value === undefined) assertValid({ value: 'A value is required.' });
    this.db.run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, JSON.stringify(value)]);
    this.activity.log(actor.user, { action: 'settings.updated', entity: 'settings', summary: `Updated setting "${key}"` }, actor.ip);
    this.revalidate.content();
    return { key, value };
  }

  // ─────────── public payloads ───────────
  private techMap(): Map<number, Row> {
    return new Map(this.items('technologies').map((t) => [t.id, { id: t.id, name: t.name, group: t.grp }]));
  }

  private categoryMap(): Map<number, Row> {
    return new Map(this.items('project-categories').map((c) => [c.id, { id: c.id, slug: c.slug, name: c.name }]));
  }

  /** Card-sized service: what lists, menus and the footer need. */
  private serviceCard = (s: Row) => ({ id: s.id, slug: s.slug, num: s.num, name: s.name, pillar: s.pillar, icon: s.icon, line: s.line, tagline: s.tagline });

  private projectCard(p: Row, cats: Map<number, Row>, techs: Map<number, Row>) {
    return {
      id: p.id, slug: p.slug, title: p.title, client: p.client, year: p.year, summary: p.summary, category: cats.get(p.categoryId) || null,
      technologies: (p.technologies as number[]).map((id) => techs.get(id)).filter(Boolean),
      coverImage: p.coverImage, coverAlt: p.coverAlt, coverPos: p.coverPos, videoUrl: p.videoUrl, caseStudy: p.caseStudy, featured: p.featured,
      liveUrl: p.liveUrl,
    };
  }

  /** Site-wide data for the header, footer and forms. */
  site(): Row {
    return {
      settings: this.settings(PUBLIC_SETTINGS),
      services: this.items('services').map(this.serviceCard),
      hasProjects: this.list('projects', { pageSize: 1 }).total > 0,
      hasTestimonials: this.list('testimonials', { pageSize: 1 }).total > 0,
      openRoles: this.list('roles', { pageSize: 1 }).total,
    };
  }

  home(): Row {
    const cats = this.categoryMap(), techs = this.techMap();
    const faqs = this.items('faqs').filter((q) => q.featured > 0 && q.answer).sort((a, b) => a.featured - b.featured).slice(0, 4);
    return {
      services: this.items('services').map(this.serviceCard),
      projects: this.items('projects', { featured: 'true' }).slice(0, 4).map((p) => this.projectCard(p, cats, techs)),
      testimonials: this.publicTestimonials().filter((t) => t.featured).slice(0, 3),
      steps: this.items('steps').map(({ id, num, title, description, stage }) => ({ id, num, title, description, stage })),
      technologies: [...techs.values()],
      faqs: faqs.map(({ slug, question, answer }) => ({ slug, question, answer })),
    };
  }

  services(): Row[] {
    return this.items('services').map(this.serviceCard);
  }

  service(slug: string): Row {
    const s = this.bySlug('services', slug);
    const techs = this.techMap(), cats = this.categoryMap();
    const projectIds = this.db.all<{ project_id: number }>('SELECT project_id FROM project_services WHERE service_id = ?', [s.id]).map((r) => r.project_id);
    const projects = this.items('projects').filter((p) => projectIds.includes(p.id)).slice(0, 3).map((p) => this.projectCard(p, cats, techs));
    const { technologies, active, sort, createdAt, ...rest } = s;
    return {
      ...rest,
      technologies: (technologies as number[]).map((id) => techs.get(id)).filter(Boolean),
      projects,
      related: this.items('services').filter((x) => x.id !== s.id).slice(0, 3).map(this.serviceCard),
      products: s.slug === 'custom-software-development' || s.slug === 'business-automation'
        ? this.items('products').map(({ name, tag, icon }) => ({ name, tag, icon, ...((this.settings(['productDetails']).productDetails || {})[name] || {}) }))
        : [],
    };
  }

  projects(category?: string): Row {
    const cats = this.categoryMap(), techs = this.techMap();
    const all = this.items('projects');
    const used = new Set(all.map((p) => p.categoryId));
    const categories = [...cats.values()].filter((c) => used.has(c.id));
    const cat = category ? categories.find((c) => c.slug === category) : undefined;
    return {
      categories,
      items: all.filter((p) => !cat || p.categoryId === cat.id).map((p) => this.projectCard(p, cats, techs)),
    };
  }

  project(slug: string): Row {
    const p = this.bySlug('projects', slug);
    const cats = this.categoryMap(), techs = this.techMap();
    const services = this.items('services').filter((s) => (p.services as number[]).includes(s.id)).map(this.serviceCard);
    const card = this.projectCard(p, cats, techs);
    const others = this.items('projects').filter((x) => x.id !== p.id);
    const next = others.find((x) => x.categoryId === p.categoryId) || others[0];
    return {
      ...card,
      overview: p.overview, challenge: p.challenge, solution: p.solution, features: p.features, results: p.results, process: p.process,
      gallery: p.gallery, seoTitle: p.seoTitle, seoDescription: p.seoDescription, services,
      testimonial: this.publicTestimonials().find((t) => t.projectId === p.id) || null,
      next: next ? this.projectCard(next, cats, techs) : null,
    };
  }

  technologies(): Row[] {
    return [...this.techMap().values()];
  }

  publicTestimonials(): Row[] {
    return this.items('testimonials').filter((t) => t.consent).map(({ id, clientName, company, position, body, image, rating, projectId, featured }) =>
      ({ id, clientName, company, position, body, image, rating, projectId, featured }));
  }

  faqs(): Row[] {
    const faqs = this.items('faqs').filter((q) => q.answer);
    return this.items('faq-groups').map((g) => ({
      id: g.id, title: g.title,
      faqs: faqs.filter((q) => q.groupId === g.id).map(({ slug, question, answer }) => ({ slug, question, answer })),
    })).filter((g) => g.faqs.length);
  }

  about(): Row {
    return {
      industries: this.items('industries').map(({ id, name, problem, builds }) => ({ id, name, problem, builds })),
      steps: this.items('steps').map(({ id, num, title, description, stage }) => ({ id, num, title, description, stage })),
      testimonials: this.publicTestimonials(),
    };
  }

  process(): Row {
    return { steps: this.items('steps').map(({ id, num, title, description, outputs, stage }) => ({ id, num, title, description, outputs, stage })) };
  }

  careers(): Row {
    return { roles: this.items('roles').map(({ id, title, meta, description }) => ({ id, title, meta, description })) };
  }

  articles(): Row[] {
    return this.items('articles').map(({ id, slug, title, category, author, publishedAt, readTime, img, alt, pos, blocks }) => ({
      id, slug, title, category, author, publishedAt, readTime, img, alt, pos,
      standfirst: ((blocks as Row[]).find((b) => b.type === 'standfirst') || {}).text || '',
    }));
  }

  article(slug: string): Row {
    const a = this.bySlug('articles', slug);
    const more = this.articles().filter((x) => x.slug !== a.slug).slice(0, 3);
    return { ...a, more };
  }

  page(slug: string): Row {
    const p = this.bySlug('pages', slug);
    return { slug: p.slug, title: p.title, summary: p.summary, blocks: p.blocks, updatedAt: p.updatedAt };
  }

  /** Everything the sitemap lists, with last-modified dates. */
  sitemap(): Row {
    const pick = (name: string) => this.items(name).map((x) => ({ slug: x.slug, updatedAt: x.updatedAt, caseStudy: x.caseStudy }));
    return { services: pick('services'), projects: pick('projects'), articles: pick('articles'), pages: pick('pages') };
  }
}
