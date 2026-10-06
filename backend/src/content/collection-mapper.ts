import { parseJson, Row } from '../database/database.service';
import { CollectionDef, FieldDef } from './collections';

// takeaways, list and checklist hold one item per line; callout is a highlighted tip box.
export const BLOCK_TYPES = ['standfirst', 'p', 'h2', 'quote', 'takeaways', 'list', 'checklist', 'callout'];

export function toApi(def: CollectionDef, row: Row | undefined): Row | null {
  if (!row) return null;
  const out: Row = { id: row.id };
  for (const fd of def.fields) {
    if (fd.type === 'refs') continue; // filled in by ContentService.hydrate
    const v = row[fd.column];
    switch (fd.type) {
      case 'boolean': out[fd.key] = !!v; break;
      case 'number': case 'ref': out[fd.key] = v === null || v === undefined ? null : Number(v); break;
      case 'select': out[fd.key] = typeof fd.options?.[0] === 'number' ? Number(v) : v; break;
      case 'list': case 'blocks': case 'pairs': case 'gallery': out[fd.key] = parseJson(v, []); break;
      default: out[fd.key] = v === undefined ? null : v;
    }
  }
  out.createdAt = row.created_at;
  out.updatedAt = row.updated_at;
  return out;
}

/** Images are served from our own origin only: uploaded media or files shipped with the site. */
const SAFE_SRC = /^\/(api\/media|assets)\/(?!.*\.\.)[\w.\-\/]+$/;

export interface Mapped {
  columns: string[];
  values: unknown[];
  errors: Record<string, string>;
}

function coerce(fd: FieldDef, raw: unknown, errors: Record<string, string>): unknown {
  const bad = (msg: string) => { errors[fd.key] = msg; return undefined; };
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '' && fd.type !== 'boolean')) {
    if (fd.required) return bad(`${fd.label} is required.`);
    if (fd.nullable) return null;
    if (fd.type === 'list' || fd.type === 'blocks' || fd.type === 'pairs' || fd.type === 'gallery') return [];
    if (fd.type === 'number') return 0;
    if (fd.type === 'boolean') return false;
    return '';
  }
  switch (fd.type) {
    case 'number': case 'ref': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return bad(`${fd.label} must be a number.`);
      if (fd.type === 'number' && fd.min !== undefined && n < fd.min) return bad(`${fd.label} must be ${fd.min} or more.`);
      if (fd.type === 'number' && fd.max !== undefined && n > fd.max) return bad(`${fd.label} must be ${fd.max} or less.`);
      return Math.trunc(n);
    }
    case 'boolean':
      return raw === true || raw === 1 || raw === '1' || raw === 'true';
    case 'select': {
      const opt = fd.options!.find((o) => String(o) === String(raw));
      if (opt === undefined) return bad(`${fd.label} must be one of: ${fd.options!.join(', ')}.`);
      return opt;
    }
    case 'list': {
      const arr = Array.isArray(raw) ? raw : String(raw).split(/\r?\n/);
      const clean = arr.map((x) => String(x).trim()).filter(Boolean);
      if (fd.required && !clean.length) return bad(`${fd.label} needs at least one entry.`);
      return clean;
    }
    case 'blocks': {
      if (!Array.isArray(raw)) return bad(`${fd.label} must be a list of blocks.`);
      const clean = raw
        .map((b: any) => ({ type: String(b?.type ?? 'p'), text: String(b?.text ?? '').trim() }))
        .filter((b) => b.text);
      const wrong = clean.find((b) => !BLOCK_TYPES.includes(b.type));
      if (wrong) return bad(`Unknown block type "${wrong.type}".`);
      return clean;
    }
    case 'pairs': {
      if (!Array.isArray(raw)) return bad(`${fd.label} must be a list of rows.`);
      const clean = raw
        .map((p: any) => (Array.isArray(p) ? [String(p[0] ?? '').trim(), String(p[1] ?? '').trim()] : null))
        .filter((p): p is string[] => !!p && !!(p[0] || p[1]));
      if (clean.some((p) => !p[0] || !p[1])) return bad(`Fill in both parts of every ${fd.label.toLowerCase()} row.`);
      if (clean.some((p) => p[0].length > 300 || p[1].length > 2000)) return bad(`One of the ${fd.label.toLowerCase()} rows is too long.`);
      return clean;
    }
    case 'gallery': {
      if (!Array.isArray(raw)) return bad(`${fd.label} must be a list of images.`);
      const clean = raw
        .map((g: any) => ({ src: String(g?.src ?? '').trim(), alt: String(g?.alt ?? '').trim().slice(0, 200) }))
        .filter((g) => g.src);
      if (clean.some((g) => !SAFE_SRC.test(g.src))) return bad('Gallery items must be uploaded media or site paths.');
      return clean.slice(0, 30);
    }
    case 'image': {
      const s = String(raw).trim();
      if (!SAFE_SRC.test(s)) return bad(`${fd.label} must be an uploaded file (/api/media/…) or a site path (/assets/…).`);
      return s;
    }
    default: {
      const s = String(raw).trim();
      if (fd.max && s.length > fd.max) return bad(`${fd.label} must be ${fd.max} characters or fewer.`);
      if (fd.pattern && !fd.pattern.test(s)) return bad(`${fd.label} may only contain ${fd.patternHint}.`);
      return s;
    }
  }
}

/** Validates and maps an API payload to columns. `partial` = PATCH semantics. */
export function fromApi(def: CollectionDef, input: Row, partial: boolean): Mapped {
  const errors: Record<string, string> = {};
  const columns: string[] = [];
  const values: unknown[] = [];
  for (const fd of def.fields) {
    if (fd.type === 'refs') continue; // join table, written by ContentService
    const present = Object.prototype.hasOwnProperty.call(input, fd.key);
    if (partial && !present) continue;
    if (!present && fd.key === 'active') { columns.push(fd.column); values.push(true); continue; }
    const v = coerce(fd, input[fd.key], errors);
    if (v !== undefined) { columns.push(fd.column); values.push(v); }
  }
  return { columns, values, errors };
}
