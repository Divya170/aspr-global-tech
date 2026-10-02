import { fromApi } from '../content/collection-mapper';
import { getCollection } from '../content/collections';
import type { DatabaseService, Row } from './database.service';

interface SeedFile {
  services: Row[]; products: Row[]; industries: Row[]; work: Row[]; steps: Row[]; roles: Row[];
  articles: Row[]; faqGroups: Row[]; faqs: Row[]; packages: Row[]; needs: Row[]; settings: Row;
}

/** Inserts the approved design's content. Runs once, when the database is created. */
export function seedDatabase(db: DatabaseService, seed: SeedFile): Record<string, number> {
  const counts: Record<string, number> = {};
  const insert = (collection: string, rows: Row[]) => {
    const def = getCollection(collection)!;
    for (const row of rows) {
      const m = fromApi(def, { active: true, ...row }, false);
      if (Object.keys(m.errors).length) throw new Error(`Seed ${collection}: ${JSON.stringify(m.errors)}`);
      db.run(`INSERT INTO ${def.table} (${m.columns.join(', ')}) VALUES (${m.columns.map(() => '?').join(', ')})`, m.values);
    }
    counts[collection] = rows.length;
  };
  db.tx(() => {
    insert('services', seed.services);
    insert('products', seed.products);
    insert('industries', seed.industries);
    insert('work', seed.work);
    insert('steps', seed.steps);
    insert('roles', seed.roles);
    insert('articles', seed.articles);
    insert('faq-groups', seed.faqGroups);
    const groupIds = db.all<{ id: number; sort: number }>('SELECT id, sort FROM faq_groups');
    insert('faqs', seed.faqs.map(({ groupSort, ...q }) => ({ ...q, groupId: groupIds.find((g) => g.sort === groupSort)!.id })));
    insert('packages', seed.packages);
    insert('needs', seed.needs);
    for (const [key, value] of Object.entries(seed.settings)) {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    }
    counts.settings = Object.keys(seed.settings).length;
  });
  return counts;
}
