// Formatting helpers for the admin. API timestamps are UTC "YYYY-MM-DD HH:MM:SS" strings.

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = /Z$|[+-]\d\d:?\d\d$/.test(value) ? value : value.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const monthLongFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatDate = (v: string | null | undefined) => { const d = parseDate(v); return d ? dateFmt.format(d) : '—'; };
export const formatDateTime = (v: string | null | undefined) => { const d = parseDate(v); return d ? dateTimeFmt.format(d) : '—'; };

/** "2026-10" → "Oct" / "October 2026". */
export const monthShort = (ym: string) => monthFmt.format(new Date(`${ym}-01T00:00:00Z`));
export const monthLong = (ym: string) => monthLongFmt.format(new Date(`${ym}-01T00:00:00Z`));

export function timeAgo(v: string | null | undefined): string {
  const d = parseDate(v);
  if (!d) return '—';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(v);
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0)} MB`;
}

export const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n);

/** "proposal-sent" → "Proposal sent". */
export const humanize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ') : s);

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';
