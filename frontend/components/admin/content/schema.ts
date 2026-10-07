import { adminApi } from '@/lib/admin/api';
import type { Block, CollectionSchema, ContentItem, ContentList, FieldSchema, GalleryItem } from '@/lib/admin/types';

export type FormValue = string | boolean | number[] | Block[] | string[][] | GalleryItem[];
export type FormValues = Record<string, FormValue>;

/** API value → editable form value. */
export function toForm(f: FieldSchema, v: unknown): FormValue {
  switch (f.type) {
    case 'boolean': return !!v;
    case 'list': return Array.isArray(v) ? v.join('\n') : '';
    case 'blocks': return Array.isArray(v) ? (v as Block[]).map((b) => ({ type: String(b.type || 'p'), text: String(b.text ?? '') })) : [];
    case 'pairs': return Array.isArray(v) ? (v as unknown[][]).map((p) => [String(p?.[0] ?? ''), String(p?.[1] ?? '')]) : [];
    case 'gallery': return Array.isArray(v) ? (v as GalleryItem[]).map((g) => ({ src: String(g.src ?? ''), alt: String(g.alt ?? '') })) : [];
    case 'refs': return Array.isArray(v) ? v.map(Number) : [];
    default: return v === null || v === undefined ? '' : String(v);
  }
}

/** Form value → API payload value (the API coerces strings for numbers, selects and refs). */
export function toPayload(f: FieldSchema, v: FormValue): unknown {
  switch (f.type) {
    case 'number': case 'ref': return v === '' ? null : Number(v);
    case 'blocks': return (v as Block[]).filter((b) => b.text.trim());
    case 'pairs': return (v as string[][]).filter((p) => p[0].trim() || p[1].trim());
    case 'gallery': return (v as GalleryItem[]).filter((g) => g.src.trim());
    default: return v;
  }
}

export function emptyItem(schema: CollectionSchema): FormValues {
  const out: FormValues = {};
  for (const f of schema.fields) {
    out[f.key] = toForm(f, f.type === 'boolean' ? false : f.type === 'select' && f.required ? f.options?.[0] : null);
    if (f.key === 'active') out[f.key] = false;
  }
  return out;
}

export function itemToForm(schema: CollectionSchema, item: ContentItem): FormValues {
  const out: FormValues = {};
  for (const f of schema.fields) out[f.key] = toForm(f, item[f.key]);
  return out;
}

/** Client-side checks that mirror the API's rules, so most mistakes are caught before saving. */
export function validate(schema: CollectionSchema, values: FormValues): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of schema.fields) {
    const v = values[f.key];
    const empty = v === '' || (Array.isArray(v) && !v.length) || (f.type === 'list' && !String(v).trim());
    if (f.required && empty && f.type !== 'boolean') { e[f.key] = `${f.label} is required.`; continue; }
    if (typeof v === 'string' && v && (f.type === 'text' || f.type === 'textarea')) {
      if (f.max && v.trim().length > f.max) e[f.key] = `${f.label} must be ${f.max} characters or fewer.`;
      else if (f.pattern && !new RegExp(f.pattern).test(v.trim())) e[f.key] = `${f.label} may only contain ${f.patternHint || 'valid characters'}.`;
    }
    if (f.type === 'number' && v !== '') {
      const n = Number(v);
      if (!Number.isFinite(n)) e[f.key] = `${f.label} must be a number.`;
      else if (f.min !== undefined && n < f.min) e[f.key] = `${f.label} must be ${f.min} or more.`;
      else if (f.max !== undefined && n > f.max) e[f.key] = `${f.label} must be ${f.max} or less.`;
    }
    if (f.type === 'pairs' && (v as string[][]).some((p) => (p[0].trim() || p[1].trim()) && !(p[0].trim() && p[1].trim()))) {
      e[f.key] = `Fill in both parts of every ${f.label.toLowerCase()} row.`;
    }
  }
  return e;
}

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/** Items of a referenced collection for ref/refs pickers, cached for the page's lifetime. */
const refCache = new Map<string, Promise<ContentItem[]>>();
export function loadRefItems(collection: string): Promise<ContentItem[]> {
  let p = refCache.get(collection);
  if (!p) {
    p = adminApi.get<ContentList>(`/content/${collection}`, { pageSize: 500 }).then((r) => r.items);
    p.catch(() => refCache.delete(collection));
    refCache.set(collection, p);
  }
  return p;
}
export function invalidateRefItems(collection: string) { refCache.delete(collection); }

/** Group fields into form sections; "Publishing" always last. */
export function sectionsOf(schema: CollectionSchema): { name: string; fields: FieldSchema[] }[] {
  const map = new Map<string, FieldSchema[]>();
  for (const f of schema.fields) {
    const s = f.section || 'Details';
    if (!map.has(s)) map.set(s, []);
    map.get(s)!.push(f);
  }
  const out = [...map.entries()].map(([name, fields]) => ({ name, fields }));
  return [...out.filter((s) => s.name !== 'Publishing'), ...out.filter((s) => s.name === 'Publishing')];
}

/** Extra guidance shown under a section heading. */
export const SECTION_HELP: Record<string, Record<string, string>> = {
  projects: {
    Details: 'What the project is and who it was for. The title, summary and cover appear on the portfolio card.',
    Media: 'The cover is the card image and the case-study hero. Use a large screenshot (at least 1600px wide), not a stock photo.',
    'Case study': 'A case study page tells the story: the situation (overview), what was hard (challenge), what you built (solution) and what changed (results). Turn on “Has a case study page” once the overview and solution are written — until then the project shows as a card only.',
    Publishing: 'Drafts stay hidden from the website until you publish.',
  },
  services: { 'Detail page': 'Everything below appears on the service’s own page.' },
  testimonials: { Details: 'Only publish words a real client said, with their permission.' },
};

export const IMAGE_KEYS = ['coverImage', 'img', 'image'];
