// Client-side checks for instant feedback. The API applies the same rules and is authoritative
// (backend/src/common/rules.ts, backend/src/leads/leads.service.ts).

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_MESSAGE = 20;

export function emailError(v: string): string {
  const s = v.trim();
  if (!s) return 'Enter an email address.';
  if (!EMAIL_RE.test(s)) return 'That email looks incomplete. Check for a missing @ or domain.';
  return '';
}

export function phoneError(v: string, required = false): string {
  const s = v.trim();
  if (!s) return required ? 'Enter a phone number.' : '';
  if (!/^[+()\d\s.\-]{7,40}$/.test(s)) return 'Use digits, spaces, + and brackets only.';
  const digits = s.replace(/\D/g, '').length;
  if (digits < 8) return 'Enter a phone number with at least 8 digits.';
  if (digits > 15) return 'That phone number looks too long.';
  return '';
}

export function fileError(f: File, ext: string[], maxBytes: number): string {
  const e = (f.name.split('.').pop() || '').toLowerCase();
  if (!ext.includes(e)) return `${f.name} isn't a supported file type.`;
  if (f.size > maxBytes) return `${f.name} is larger than ${Math.round(maxBytes / 1048576)} MB.`;
  return '';
}
