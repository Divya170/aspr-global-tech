import { parseJson, Row } from '../database/database.service';
import { CollectionDef, FieldDef } from './collections';

// takeaways, list and checklist hold one item per line; callout is a highlighted tip box.
export const BLOCK_TYPES = ['standfirst', 'p', 'h2', 'quote', 'takeaways', 'list', 'checklist', 'callout'];

export function toApi(def: CollectionDef, row: Row | undefined): Row | null {
  if (!row) return null;
  const out: Row = { id: row.id };
  for (const fd of def.fields) {
    const v = row[fd.column];
    switch (fd.type) {
      case 'boolean': out[fd.key] = !!v; break;
      case 'number': case 'ref': out[fd.key] = v === null || v === undefined ? null : Number(v); break;
      case 'select': out[fd.key] = typeof fd.options?.[0] === 'number' ? Number(v) : v; break;
      case 'list': case 'blocks': out[fd.key] = parseJson(v, []); break;
      default: out[fd.key] = v === undefined ? null : v;
    }
  }
  out.createdAt = row.created_at;
  out.updatedAt = row.updated_at;
  return out;
}

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
    if (fd.type === 'list' || fd.type === 'blocks') return [];
    if (fd.type === 'number') return 0;
    if (fd.type === 'boolean') return false;
    return '';
  }
  switch (fd.type) {
    case 'number': case 'ref': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return bad(`${fd.label} must be a number.`);
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
    const present = Object.prototype.hasOwnProperty.call(input, fd.key);
    if (partial && !present) continue;
    if (!present && fd.key === 'active') { columns.push(fd.column); values.push(true); continue; }
    const v = coerce(fd, input[fd.key], errors);
    if (v !== undefined) { columns.push(fd.column); values.push(v); }
  }
  return { columns, values, errors };
}
