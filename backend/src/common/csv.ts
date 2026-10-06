import type { Row } from '../database/database.service';

/** CSV with a BOM (so Excel reads UTF-8) and spreadsheet-formula injection neutralised. */
export function toCsv(cols: string[], rows: Row[]): string {
  const esc = (v: unknown) => {
    let s = Array.isArray(v) ? v.join('; ') : v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}
