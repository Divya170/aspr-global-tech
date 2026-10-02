// Client-side mirror of the backend's validation rules (backend/src/common/rules.ts).
// The server is the source of truth and re-validates every submission; these run
// in the browser so people get instant, inline feedback with identical wording.

import { phoneError } from './countries';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_MESSAGE = 20;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 10;
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'key', 'fig', 'zip'];

export const digits = (s) => String(s || '').replace(/\D/g, '');

export function emailError(email, incomplete = 'That email looks incomplete — check for a missing @ or domain.') {
  const e = String(email || '').trim();
  if (EMAIL_RE.test(e)) return null;
  return e ? incomplete : 'Enter an email address.';
}

export function fileError(files) {
  if (files.length > MAX_FILES) return `Attach up to ${MAX_FILES} files.`;
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return `${f.name} isn't a supported file — use PDF, images or docs.`;
    if (f.size > MAX_FILE_BYTES) return `${f.name} is larger than 10 MB.`;
  }
  return null;
}

/** Project brief — `step` = 0|1|2 for the three-step builder, or 'all' for the contact page. */
export function briefErrors(f, step = 'all') {
  const e = {};
  const on = (n) => step === 'all' || step === n;
  if (on(0) && !f.needs.length) e.needs = 'Pick at least one thing you need — or "Not sure yet".';
  if (on(1)) {
    if (!f.name.trim()) e.name = 'Enter your name so we know who to reply to.';
    const em = emailError(f.email); if (em) e.email = em;
    const pe = phoneError(f.country, f.phone); if (pe) e.phone = pe;
  }
  if (on(2)) {
    if (f.message.trim().length < MIN_MESSAGE) e.message = 'Give us a little more — at least 20 characters.';
    const fe = fileError(f.files); if (fe) e.files = fe;
  }
  return e;
}

export function applicationErrors(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Enter your name.';
  const em = emailError(f.email, 'That email looks incomplete.'); if (em) e.email = em;
  if (digits(f.phone).length < 10) e.phone = 'Enter a phone number with at least 10 digits.';
  if (!f.portfolio.trim() && !f.files.length) e.portfolio = 'Send work, not a template CV — add a portfolio link or attach files.';
  const fe = fileError(f.files); if (fe) e.files = fe;
  return e;
}

/** Best-matching package: the one sharing the most services with the picks (min. 2). */
export function suggestPackage(packages, needs) {
  let pkg = null, best = 1;
  for (const p of packages || []) {
    const m = p.services.filter((n) => needs.includes(n)).length;
    if (m > best) { best = m; pkg = { ...p, match: m + ' OF ' + p.services.length + ' MATCH', servicesLabel: p.services.join(' + ') }; }
  }
  return pkg;
}
