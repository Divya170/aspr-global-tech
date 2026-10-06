import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

/** scrypt parameters (N = 2^16, r = 8, p = 1 ≈ 64 MB, ~100 ms). Stored with each hash so they can be raised later. */
const N = 65536, R = 8, P = 1, KEYLEN = 64;
const MAXMEM = 256 * 1024 * 1024;

export const MIN_PASSWORD = 12;
export const MAX_PASSWORD = 200;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, key] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Returns an error message, or '' when the password is acceptable. */
export function passwordProblem(password: unknown, email = ''): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use ${MAX_PASSWORD} characters or fewer.`;
  if (/^(.)\1+$/.test(password)) return 'Use a less predictable password.';
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase()) && email.split('@')[0].length > 3) return "Don't include your email name in the password.";
  return '';
}
