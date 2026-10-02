/**
 * Business rules for public submissions. The Next.js site runs the same rules
 * (frontend/lib/rules.js) for instant feedback; these are authoritative.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_MESSAGE = 20;
export const MAX_LEN = { name: 120, email: 200, phone: 40, company: 160, message: 5000, portfolio: 2000, note: 5000 };

export type Errors = Record<string, string>;

export const str = (v: unknown): string => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v)).trim();
export const digits = (s: string): string => s.replace(/\D/g, '');

export function checkEmail(e: Errors, email: string, incomplete = 'That email looks incomplete — check for a missing @ or domain.'): void {
  if (!EMAIL_RE.test(email)) e.email = email ? incomplete : 'Enter an email address.';
  else if (email.length > MAX_LEN.email) e.email = 'That email is too long.';
}

export function checkPhone(e: Errors, phone: string): void {
  const d = digits(phone);
  // Brief forms send +<dial code><national number>; short national numbers (e.g. Sweden, Finland) still total 8+ digits.
  if (d.length < 8) e.phone = 'Enter a phone number with at least 8 digits.';
  else if (d.length > 15 || phone.length > MAX_LEN.phone) e.phone = 'That phone number looks too long.';
}

export function checkLength(e: Errors, key: keyof typeof MAX_LEN, value: string, label: string): void {
  if (value.length > MAX_LEN[key] && !e[key]) e[key] = `${label} must be ${MAX_LEN[key]} characters or fewer.`;
}

export interface PackageLike { name: string; services: string[]; outcome: string; price: string }

/** Best-matching package: the one sharing the most services with the picks (at least 2). */
export function suggestPackage<T extends PackageLike>(packages: T[], needs: string[]): (T & { matched: number }) | null {
  let best: (T & { matched: number }) | null = null;
  let score = 1;
  for (const p of packages) {
    const m = p.services.filter((n) => needs.includes(n)).length;
    if (m > score) { score = m; best = { ...p, matched: m }; }
  }
  return best;
}
