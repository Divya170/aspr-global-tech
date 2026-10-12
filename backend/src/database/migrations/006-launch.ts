import type { DatabaseService } from '../database.service';

/**
 * Launch content decisions. Each change applies only while the text is still the original, so
 * edits made in the admin are never overwritten.
 * - Brand identity timeline: "2–3 weeks" everywhere (the branding service already says so).
 * - Team chips (About, Careers): game development, video and SEO are not offered services.
 */
const FAQ_FIXES: [string, string, string][] = [
  ['how-long', 'a brand identity 2–4 weeks', 'a brand identity 2–3 weeks'],
];
const DROP_TEAM_ROLES = ['Game developers', 'Video editors', 'SEO'];

export function up(db: DatabaseService): void {
  for (const [slug, from, to] of FAQ_FIXES) {
    db.run("UPDATE faqs SET answer = REPLACE(answer, ?, ?), updated_at = datetime('now') WHERE slug = ? AND INSTR(answer, ?) > 0", [from, to, slug, from]);
  }
  const roles = db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'teamRoles'")?.value;
  if (roles) {
    const list = JSON.parse(roles) as string[];
    const kept = list.filter((r) => !DROP_TEAM_ROLES.includes(r));
    if (kept.length !== list.length) db.run("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'teamRoles'", [JSON.stringify(kept)]);
  }
}
