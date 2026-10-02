import { randomInt } from 'crypto';
import type { DatabaseService } from '../database/database.service';

/**
 * Human-friendly reference numbers (ASPR-482913 for briefs, ASPR-C-482913 for
 * applications), guaranteed unique in their table.
 */
export function newReference(db: DatabaseService, table: 'enquiries' | 'applications'): string {
  const prefix = table === 'enquiries' ? 'ASPR-' : 'ASPR-C-';
  for (let i = 0; i < 20; i++) {
    const ref = prefix + String(randomInt(100000, 1000000));
    if (!db.get(`SELECT 1 FROM ${table} WHERE ref_no = ?`, [ref])) return ref;
  }
  return prefix + Date.now().toString().slice(-9);
}
