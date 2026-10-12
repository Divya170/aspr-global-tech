import type { DatabaseService } from '../database.service';

/**
 * v1 copy that still counted "ten services" (the v2 site has eight). Each fix applies only
 * while the text is still exactly the original, so edits made in the admin are never overwritten.
 */
const FAQ_FIXES: [string, string, string][] = [
  ['who', 'One point of contact across all ten services', 'One point of contact across every service'],
  ['app-web', 'Ten services sit under one roof, so app, web, brand and SEO come from one team', 'Websites, apps, software and brand sit under one roof, so they come from one team'],
];

export function up(db: DatabaseService): void {
  for (const [slug, from, to] of FAQ_FIXES) {
    db.run("UPDATE faqs SET answer = REPLACE(answer, ?, ?), updated_at = datetime('now') WHERE slug = ? AND INSTR(answer, ?) > 0", [from, to, slug, from]);
  }
  const setting = (key: string) => db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])?.value;
  const save = (key: string, value: unknown) => db.run("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?", [JSON.stringify(value), key]);

  const facts = setting('facts');
  if (facts) {
    const list = JSON.parse(facts) as { k: string; v: string }[];
    const svc = list.find((f) => f.k === 'SERVICES' && f.v === '10');
    if (svc) { svc.v = '8'; save('facts', list); }
  }
  const timeline = setting('timeline');
  if (timeline) {
    const list = JSON.parse(timeline) as { k: string; t: string }[];
    const now = list.find((f) => f.k === 'Now' && f.t === '10 services under one roof');
    if (now) { now.t = 'Websites, 3D, software and brand under one roof'; save('timeline', list); }
  }
}
