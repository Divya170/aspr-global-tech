import type { DatabaseService } from '../database.service';

/**
 * Phase 2 content fixes.
 *
 * FAQ answers that still offered services the site no longer publishes
 * (graphics, video, SEO and games are unpublished since 003). Each fix applies only while the
 * text is still exactly the original, so edits made in the admin are never overwritten.
 */
const FAQ_FIXES: [string, string, string][] = [
  ['brand-only', 'Logo, graphics and video are services on their own.', 'Branding is a service on its own.'],
  ['alongside', 'say the app, the brand or SEO', 'say the app, the website or the brand'],
  ['tech', ' Unity for games;', ''],
  ['tech', 'AI features such as chatbots, smart search and automation', 'AI features such as smart search and automation'],
];

/**
 * v1 mockup images reused as illustrations. Kept ones get alt text that describes the image as a
 * mockup; ones that read as delivered client work, carry a third-party credit or don't match the
 * entry are removed (the layouts fall back to no image). Rows are matched on the original image
 * and alt, so anything changed in the admin is left alone. Draft services and projects are untouched.
 */
const MOCKUP = (what: string) => `Illustrative mockup of ${what}`;
type ImageFix = [table: 'services' | 'industries' | 'products', key: 'slug' | 'name', value: string, img: string, alt: string, next: [string, string] | null];
const IMAGE_FIXES: ImageFix[] = [
  ['services', 'slug', 'website-development', '/assets/responsive-web.png', 'Responsive website on laptop, tablet and phone',
    ['/assets/responsive-web.png', MOCKUP('a responsive website on a laptop, tablet and phone')]],
  // The screens carry another designer's credit ("@白白的设计 · UI设计"); not ours to show.
  ['services', 'slug', 'mobile-app-development', '/assets/shop-app.png', 'Shopping app screens', null],
  ['services', 'slug', 'web-application-development', '/assets/ops-dashboard.png', 'Operations SaaS dashboard',
    ['/assets/ops-dashboard.png', MOCKUP('an operations dashboard with a live map')]],
  ['services', 'slug', 'business-automation', '/assets/inventory.png', 'Inventory management dashboard',
    ['/assets/inventory.png', MOCKUP('an inventory dashboard with stock charts')]],
  ['services', 'slug', 'branding-digital-design', '/assets/logo-design.png', 'Logo concept sketches and applications',
    ['/assets/logo-design.png', 'Illustration of logo design: pencil sketches and a finished mark on a tablet, watch and phone']],
  ['industries', 'name', 'Retail', '/assets/ecommerce.png', 'E-commerce storefront on a desktop monitor',
    ['/assets/ecommerce.png', MOCKUP('an e-commerce storefront on a desktop monitor')]],
  // The old alt described a clinic site that was never built; the image is a generic responsive site.
  ['industries', 'name', 'Healthcare', '/assets/responsive-web.png', 'Clinic website and booking flow across laptop, tablet and phone',
    ['/assets/responsive-web.png', MOCKUP('a responsive website on a laptop, tablet and phone')]],
  // A mobile game screen says nothing about education.
  ['industries', 'name', 'Education', '/assets/game-ui.png', 'Mobile game interface', null],
  ['industries', 'name', 'Real Estate', '/assets/responsive-web.png', 'Responsive website across devices',
    ['/assets/responsive-web.png', MOCKUP('a responsive website on a laptop, tablet and phone')]],
  ['industries', 'name', 'Manufacturing', '/assets/inventory.png', 'Inventory and production dashboard',
    ['/assets/inventory.png', MOCKUP('an inventory dashboard with stock charts')]],
  ['industries', 'name', 'Logistics', '/assets/ops-dashboard.png', 'Live job and route map dashboard',
    ['/assets/ops-dashboard.png', MOCKUP('an operations dashboard with a live map')]],
  // A finished poster for a named café reads as delivered client work.
  ['industries', 'name', 'Hospitality', '/assets/poster.png', 'Café promotional poster', null],
  ['industries', 'name', 'Startups', '/assets/logo-design.png', 'Logo concept and brand applications',
    ['/assets/logo-design.png', 'Illustration of logo design: pencil sketches and a finished mark on a tablet, watch and phone']],
  // Ready-made products: a picture on a product entry reads as a screenshot of that product, and these are not.
  ['products', 'name', 'Billing Software', '/assets/banking-app.png', 'Billing and payments app screens', null],
  ['products', 'name', 'Employee Management', '/assets/ops-dashboard.png', 'Workforce scheduling dashboard', null],
  ['products', 'name', 'Inventory Management', '/assets/inventory.png', 'Inventory overview dashboard', null],
  ['products', 'name', 'Finance & FinServ', '/assets/finance-dashboard.png', 'Finance dashboard with inflow and budget charts', null],
];

/**
 * Copy carried over from main where it is more specific and factual. Branding deliverables use
 * main's serviceDetails["logo-design"] list (the service's own outcomes already promise three
 * concepts and two rounds). Applied only while each list or fact is still the original.
 */
const BRANDING_LISTS: [column: 'deliverables' | 'ideal_for', from: string[], to: string[]][] = [
  ['deliverables',
    ['Brand discovery questionnaire', 'Original logo concepts', 'Colour palette and typography', 'Brand guidelines', 'Business cards and stationery',
      'Social media kit and templates', 'Ad creatives and presentations', 'Print and web-ready files'],
    ['Brand discovery questionnaire', '3 original logo concepts', 'Two rounds of refinements', 'Full colour, mono and icon versions',
      'Colour palette and typography', 'Brand guidelines', 'Business cards and stationery', 'Social media kit and templates',
      'Ad creatives and presentations', 'Print (PDF, EPS) and web (SVG, PNG) files']],
  ['ideal_for',
    ['New businesses and startups', 'Brands that look dated', 'Businesses preparing signage or packaging', 'Teams that need on-brand templates'],
    ['New businesses and startups', 'Brands that look dated', 'Companies merging or rebranding', 'Businesses preparing signage or packaging',
      'Teams that need on-brand templates']],
];

export function up(db: DatabaseService): void {
  for (const [column, from, to] of BRANDING_LISTS) {
    db.run(`UPDATE services SET ${column} = ?, updated_at = datetime('now') WHERE slug = 'branding-digital-design' AND ${column} = ?`,
      [JSON.stringify(to), JSON.stringify(from)]);
  }
  // Where the firm is based, as in the About text, the privacy policy and main: Mettupalayam, Tamil Nadu.
  const facts = db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'facts'")?.value;
  if (facts) {
    const list = JSON.parse(facts) as { k: string; v: string }[];
    const based = list.find((f) => f.k === 'BASED IN' && f.v === 'India · Serving worldwide');
    if (based) {
      based.v = 'Mettupalayam, Tamil Nadu, India · Serving worldwide';
      db.run("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'facts'", [JSON.stringify(list)]);
    }
  }
  for (const [table, key, value, img, alt, next] of IMAGE_FIXES) {
    db.run(`UPDATE ${table} SET img = ?, alt = ?, updated_at = datetime('now') WHERE ${key} = ? AND img = ? AND alt = ?`,
      [next ? next[0] : null, next ? next[1] : '', value, img, alt]);
  }
  for (const [slug, from, to] of FAQ_FIXES) {
    db.run("UPDATE faqs SET answer = REPLACE(answer, ?, ?), updated_at = datetime('now') WHERE slug = ? AND INSTR(answer, ?) > 0", [from, to, slug, from]);
  }
}
