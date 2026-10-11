import type { DatabaseService } from '../database.service';

/**
 * Phase 2 content fixes. FAQ answers that still offered services the site no longer publishes
 * (graphics, video, SEO and games are unpublished since 003). Each fix applies only while the
 * text is still exactly the original, so edits made in the admin are never overwritten.
 */
const FAQ_FIXES: [string, string, string][] = [
  ['brand-only', 'Logo, graphics and video are services on their own.', 'Branding is a service on its own.'],
  ['alongside', 'say the app, the brand or SEO', 'say the app, the website or the brand'],
  ['tech', ' Unity for games;', ''],
];

export function up(db: DatabaseService): void {
  for (const [slug, from, to] of FAQ_FIXES) {
    db.run("UPDATE faqs SET answer = REPLACE(answer, ?, ?), updated_at = datetime('now') WHERE slug = ? AND INSTR(answer, ?) > 0", [from, to, slug, from]);
  }
}
