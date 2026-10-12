import { randomInt } from 'crypto';
import type { DatabaseService } from '../database/database.service';

/** No 0/O or 1/I/L, so a reference read out over the phone is unambiguous. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const code = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/**
 * Human-friendly reference numbers, unique in their table:
 * ASPR-2026-7KQ4 for project inquiries, ASPR-JOB-2026-7KQ4 for job applications.
 */
export function newReference(db: DatabaseService, table: 'enquiries' | 'applications'): string {
  const prefix = `ASPR-${table === 'applications' ? 'JOB-' : ''}${new Date().getUTCFullYear()}-`;
  for (let len = 4; len <= 8; len++) {
    for (let i = 0; i < 10; i++) {
      const ref = prefix + code(len);
      if (!db.get(`SELECT 1 FROM ${table} WHERE ref_no = ?`, [ref])) return ref;
    }
  }
  throw new Error('Could not allocate a reference number');
}
