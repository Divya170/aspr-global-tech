import type { DatabaseService, Row } from './database.service';

interface SeedFile {
  services: Row[]; products: Row[]; industries: Row[]; work: Row[]; steps: Row[]; roles: Row[];
  articles: Row[]; faqGroups: Row[]; faqs: Row[]; packages: Row[]; needs: Row[]; settings: Row;
}

/** v1 table for each seed key. The seed is frozen at the v1 schema; migrations take it from there. */
const TABLES: [keyof SeedFile, string][] = [
  ['services', 'services'], ['products', 'products'], ['industries', 'industries'], ['work', 'work_items'],
  ['steps', 'process_steps'], ['roles', 'roles'], ['articles', 'articles'], ['faqGroups', 'faq_groups'],
  ['packages', 'packages'], ['needs', 'needs'],
];

const column = (key: string) => key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

/**
 * Inserts the original site content into a brand-new database (v1 schema). Rows are written
 * as-is, without the admin collection rules, so this keeps working however those rules change.
 * Keys with no matching column are skipped.
 */
export function seedDatabase(db: DatabaseService, seed: SeedFile): Record<string, number> {
  const counts: Record<string, number> = {};
  const insert = (table: string, rows: Row[]) => {
    const cols = new Set(db.all<{ name: string }>(`PRAGMA table_info(${table})`).map((c) => c.name));
    for (const row of rows) {
      const entries = Object.entries({ active: true, ...row }).filter(([k]) => cols.has(column(k)));
      db.run(`INSERT INTO ${table} (${entries.map(([k]) => column(k)).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`, entries.map(([, v]) => v));
    }
    counts[table] = rows.length;
  };
  db.tx(() => {
    for (const [key, table] of TABLES) insert(table, seed[key] as Row[]);
    const groups = db.all<{ id: number; sort: number }>('SELECT id, sort FROM faq_groups');
    insert('faqs', seed.faqs.map(({ groupSort, ...q }) => ({ ...q, groupId: groups.find((g) => g.sort === groupSort)!.id })));
    for (const [key, value] of Object.entries(seed.settings)) {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    }
    counts.settings = Object.keys(seed.settings).length;
  });
  return counts;
}
