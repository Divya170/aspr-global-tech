import type { DatabaseService, Row } from '../database.service';

function parseJson<T>(value: unknown, fallback: T): T {
  try { return typeof value === 'string' && value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

type Pair = [string, string];
interface ServiceSpec {
  slug: string; name: string; pillar: 'Build' | 'Brand' | 'Grow'; icon: string; line: string;
  /** v1 service name this one replaces (its row, id and image are kept). */
  from?: string;
  /** v1 serviceDetails entry whose copy is reused. */
  details?: string;
  copy?: Partial<{ tagline: string; intro: string; outcomes: Pair[]; deliverables: string[]; idealFor: string[]; process: Pair[];
    timeline: string; budget: string; addOns: string[]; faqs: Pair[] }>;
  tech: string[];
}

/** The eight services of the v2 site, in display order. */
const SERVICES: ServiceSpec[] = [
  {
    slug: 'website-development', name: 'Website Development', pillar: 'Build', icon: 'globe', from: 'Website Development', details: 'website-development',
    line: 'Custom business websites, landing pages, corporate websites and advanced web experiences.',
    tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'WordPress', 'Shopify', 'Vercel'],
  },
  {
    slug: '3d-website-development', name: '3D Website Development', pillar: 'Build', icon: 'box',
    line: 'Interactive WebGL and 3D websites, product viewers and immersive digital experiences.',
    copy: {
      tagline: 'Interactive 3D experiences that make a brand impossible to scroll past.',
      intro: 'We build real-time 3D into the browser: product viewers and configurators, interactive showrooms, scroll-driven stories and immersive landing pages. Every scene is optimised to load fast, falls back gracefully on low-power phones, and keeps its content readable for search engines and screen readers.',
      outcomes: [['WebGL', 'real-time 3D in the browser'], ['Mobile', 'lightweight fallbacks for every device'], ['SEO', 'content stays crawlable']],
      deliverables: ['Concept and interaction design', '3D modelling and optimisation in Blender', 'Three.js and React Three Fiber development', 'Scroll- and cursor-driven animation', 'Product viewers and configurators', 'Compressed models and textures', 'Low-power and reduced-motion fallbacks', 'Performance testing on real devices'],
      idealFor: ['Product brands that need to show, not tell', 'Launches and campaigns that must stand out', 'Real estate and architecture walkthroughs', 'Studios and agencies that sell on craft'],
      process: [['Concept', 'Story, interactions and a performance budget agreed up front.'], ['Model', 'Assets built or optimised for the web.'], ['Build', 'The scene, wired to scroll, cursor and content.'], ['Tune', 'Tested on low-end phones, with fallbacks where needed.']],
      addOns: ['Product configurator', '3D asset creation', 'CMS integration', 'Monthly care plan'],
      faqs: [
        ['Will 3D slow my website down?', 'Not when it is built properly. We set a performance budget, compress every model and texture, load the 3D after the page is usable, and serve a lighter version to devices that need it.'],
        ['Does it work on mobile?', 'Yes. Capable phones get the full experience; older or low-power devices get a lightweight alternative with the same content.'],
        ['Can you use our existing 3D models?', 'Usually, yes. We optimise CAD or Blender files for the web so they load quickly.'],
      ],
    },
    tech: ['Three.js', 'WebGL', 'React Three Fiber', 'Blender', 'Next.js'],
  },
  {
    slug: 'web-application-development', name: 'Web Application Development', pillar: 'Build', icon: 'layout-dashboard', from: 'SaaS & Software Solutions', details: 'saas-and-software-solutions',
    line: 'Custom dashboards, SaaS platforms, portals and business applications.',
    copy: { tagline: 'Dashboards, portals and SaaS platforms built to scale.' },
    tech: ['Next.js', 'React', 'TypeScript', 'NestJS', 'Django', 'PostgreSQL', 'Stripe', 'AWS'],
  },
  {
    slug: 'custom-software-development', name: 'Custom Software Development', pillar: 'Build', icon: 'cpu',
    line: "Software designed around a company's specific operational requirements.",
    copy: {
      tagline: 'Software shaped around how your business actually works.',
      intro: 'When off-the-shelf tools force you to change the way you work, it is time for software built for you. We design and build secure internal systems, portals and platforms around your real operations: documented, tested and owned by you.',
      outcomes: [['Yours', 'code and data you own'], ['Secure', 'roles, permissions and audit trails'], ['Connected', 'to the tools you already use']],
      deliverables: ['Requirements and process workshops', 'System architecture and data design', 'Custom web-based software', 'Role-based access and audit logs', 'Integrations with existing tools and APIs', 'Reports and dashboards', 'Data migration', 'Documentation, training and support'],
      idealFor: ['Operations that have outgrown spreadsheets', 'Companies with workflows no product fits', 'Businesses juggling several disconnected tools', 'Teams that need a secure internal portal'],
      process: [['Discover', 'How work flows today and where it breaks.'], ['Architect', 'Data model, integrations and a phased plan.'], ['Build', 'In phases, with a demo at the end of each.'], ['Launch', 'Data migrated, users trained, support in place.']],
      addOns: ['Mobile companion app', 'AI features', 'Hosting and maintenance', 'Dedicated team'],
      faqs: [
        ['Do we own the software?', 'Yes. The code, data and accounts are yours from day one, with no licence fees to us.'],
        ['Can it work with the tools we already use?', 'Usually, yes. We integrate accounting, CRM, payment and messaging tools through their APIs.'],
        ['Can it be built in phases?', 'Yes. We start with the part that saves the most time, then build on it.'],
      ],
    },
    tech: ['Node.js', 'NestJS', 'Python', 'Django', 'PostgreSQL', 'MySQL', 'REST APIs', 'AWS'],
  },
  {
    slug: 'mobile-app-development', name: 'Mobile App Development', pillar: 'Build', icon: 'smartphone', from: 'App Development', details: 'app-development',
    line: 'Custom mobile applications for Android and iOS, native or cross-platform.',
    tech: ['Flutter', 'React Native', 'Kotlin', 'Swift', 'Node.js', 'Firebase'],
  },
  {
    slug: 'ui-ux-design', name: 'UI/UX Design', pillar: 'Brand', icon: 'pen-tool',
    line: 'Modern interfaces focused on usability, conversion and brand identity.',
    copy: {
      tagline: 'Interfaces people understand at first glance, and come back to.',
      intro: 'Good design is how a product feels to use. We learn how your users think, map the journeys that matter, and design clean, consistent interfaces in Figma, tested as clickable prototypes before a line of code is written.',
      outcomes: [['Research', 'decisions based on real users'], ['Prototype', 'clickable before it is built'], ['System', 'reusable components and styles']],
      deliverables: ['User and competitor research', 'User journeys and information architecture', 'Wireframes', 'High-fidelity UI design', 'Clickable prototypes', 'Design system and component library', 'Accessibility review', 'Developer-ready handoff in Figma'],
      idealFor: ['Products designed from scratch', 'Apps and dashboards users find confusing', 'Teams that need a consistent design system', 'Founders preparing an investor demo'],
      process: [['Research', 'Who uses it, what they need and where they get stuck.'], ['Structure', 'Journeys, flows and wireframes.'], ['Design', 'High-fidelity screens in your brand.'], ['Validate', 'Prototype testing and a clean developer handoff.']],
      addOns: ['Usability testing', 'Design system documentation', 'Brand identity', 'Front-end development'],
      faqs: [
        ['Can you redesign an existing product?', 'Yes. We start by reviewing what works today, then fix the parts that cause friction rather than starting over for the sake of it.'],
        ['What do we receive at the end?', 'Figma files with every screen, a component library and a prototype, organised so any developer can build from them.'],
        ['Do you also build what you design?', 'Yes. Our developers work from the same files, so what ships matches what was approved.'],
      ],
    },
    tech: ['Figma', 'Adobe Creative Cloud'],
  },
  {
    slug: 'business-automation', name: 'Business Automation', pillar: 'Grow', icon: 'workflow', from: 'Business Management', details: 'business-management',
    line: 'Automating repetitive workflows and improving business operations.',
    copy: {
      tagline: 'Automate the repetitive work and run the business from one place.',
      intro: 'Stock, billing, staff and orders spread across WhatsApp and Excel? We map how work really flows, then build the systems and automations that take the repetitive steps off your team: approvals, reminders, reports and the data entry nobody enjoys.',
    },
    tech: ['NestJS', 'Django', 'PostgreSQL', 'React', 'REST APIs'],
  },
  {
    slug: 'branding-digital-design', name: 'Branding & Digital Design', pillar: 'Brand', icon: 'palette', from: 'Logo Design', details: 'logo-design',
    line: 'Logos, visual identity, business materials and digital assets.',
    copy: {
      tagline: 'Logos, identity and digital assets that make a business recognisable everywhere.',
      intro: 'Your brand is the first thing people remember. We design distinctive logos and visual identities, then carry them into everything the business uses: stationery, social media, ads, packaging and presentations, with every file you will ever need.',
      deliverables: ['Brand discovery questionnaire', 'Original logo concepts', 'Colour palette and typography', 'Brand guidelines', 'Business cards and stationery', 'Social media kit and templates', 'Ad creatives and presentations', 'Print and web-ready files'],
      idealFor: ['New businesses and startups', 'Brands that look dated', 'Businesses preparing signage or packaging', 'Teams that need on-brand templates'],
      addOns: ['Packaging design', 'Signage design', 'Monthly design plan', 'Motion graphics'],
    },
    tech: ['Figma', 'Adobe Creative Cloud'],
  },
];

/** v1 services the new list does not include: kept (with slugs and copy) but unpublished. */
const RETIRED: Record<string, { slug: string; icon: string; tech: string[] }> = {
  'AI & Chatbot Solutions': { slug: 'ai-and-chatbot-solutions', icon: 'bot', tech: ['Node.js', 'Python'] },
  'Game Development': { slug: 'game-development', icon: 'gamepad-2', tech: ['Unity', 'C#', 'Blender'] },
  'Graphics Design': { slug: 'graphics-design', icon: 'palette', tech: ['Adobe Creative Cloud', 'Figma'] },
  'Video Editing': { slug: 'video-editing', icon: 'clapperboard', tech: ['Adobe Creative Cloud'] },
  SEO: { slug: 'seo', icon: 'search', tech: ['Next.js'] },
};

/** What ASPR builds with: the brief's list plus the stack already published on the v1 site. */
const TECHNOLOGIES: [string, string[]][] = [
  ['frontend', ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS']],
  ['backend', ['Node.js', 'NestJS', 'Python', 'Django', 'PHP', 'Java', 'C#', 'REST APIs']],
  ['database', ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite']],
  ['mobile', ['Flutter', 'React Native', 'Kotlin', 'Swift']],
  ['3d', ['Three.js', 'WebGL', 'React Three Fiber', 'Blender', 'Unity']],
  ['infrastructure', ['AWS', 'Vercel', 'Git', 'CI/CD']],
  ['design', ['Figma', 'Adobe Creative Cloud']],
  ['platforms', ['WordPress', 'Shopify', 'Stripe', 'Firebase']],
];

const CATEGORIES: Pair[] = [
  ['websites', 'Websites'], ['3d-websites', '3D Websites'], ['web-applications', 'Web Applications'], ['software', 'Software'],
  ['mobile-apps', 'Mobile Apps'], ['ui-ux', 'UI/UX'], ['branding', 'Branding'],
];

/** v1 work items → portfolio category and services, by client label. */
const WORK_MAP: Record<string, { category: string; services: string[] }> = {
  'Retail brand, Coimbatore': { category: 'websites', services: ['website-development', 'branding-digital-design'] },
  'Clinic group, Tamil Nadu': { category: 'web-applications', services: ['web-application-development', 'website-development'] },
  'Manufacturer, Mettupalayam': { category: 'software', services: ['business-automation', 'branding-digital-design'] },
  'Food brand, Tamil Nadu': { category: 'branding', services: ['branding-digital-design'] },
  'Education group': { category: 'web-applications', services: ['web-application-development'] },
  'Indie game studio': { category: 'mobile-apps', services: [] },
};

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pairs = (v: unknown): Pair[] => (Array.isArray(v) ? v.filter((p) => Array.isArray(p) && p.length === 2).map((p) => [String(p[0]), String(p[1])] as Pair) : []);

const PRIVACY = [
  ['standfirst', 'This policy explains what information ASPR Global Tech collects through this website, why we collect it, and the choices you have. We collect only what we need to answer you and to run the website.'],
  ['h2', 'Who we are'],
  ['p', 'ASPR Global Tech is a partnership firm based in Mettupalayam, Tamil Nadu, India. For any privacy question, write to support@asprglobaltech.com.'],
  ['h2', 'What we collect'],
  ['list', 'Details you send through our contact, quote and careers forms: your name, email, and optionally phone, company, project details and files you attach\nMessages you type into the site assistant (chat)\nYour email address if you subscribe to updates\nTechnical data needed to run and protect the site, such as your IP address and browser type'],
  ['h2', 'How we use it'],
  ['list', 'To reply to your enquiry, prepare a quote and deliver work you ask us for\nTo consider job applications\nTo protect the site from spam and abuse (for example, rate limiting by IP address)\nTo understand, in aggregate, which pages are useful'],
  ['p', 'We do not sell your information, and we do not use it for advertising profiles.'],
  ['h2', 'Analytics and cookies'],
  ['p', 'If analytics is enabled, we use a privacy-friendly, cookieless analytics service that counts page views and events without identifying individual visitors. The site itself sets no advertising or tracking cookies. Signing in to the admin area uses a strictly necessary session cookie.'],
  ['h2', 'The site assistant'],
  ['p', 'Questions typed into the chat are processed by an AI provider (Google Gemini) to generate an answer, and the conversation is stored so the chat can continue across pages. Transcripts are deleted automatically after a limited period. Please do not share sensitive personal information in the chat.'],
  ['h2', 'Files you upload'],
  ['p', 'Attachments are stored privately on our server. They are never publicly accessible and can only be downloaded by signed-in ASPR staff.'],
  ['h2', 'How long we keep it'],
  ['p', 'Enquiries and applications are kept for as long as needed to respond and for our business records, then deleted. You can ask us to delete your information at any time.'],
  ['h2', 'Your rights'],
  ['p', 'You can ask for a copy of the information we hold about you, ask us to correct it, or ask us to delete it, by emailing support@asprglobaltech.com. You can unsubscribe from updates using the link in any email.'],
  ['h2', 'Changes'],
  ['p', 'If we change this policy we will update this page. Significant changes will be highlighted here.'],
];

const TERMS = [
  ['standfirst', 'These terms cover your use of the asprglobaltech.com website. Work we do for clients is governed by the written proposal or contract agreed for that project.'],
  ['h2', 'Using this website'],
  ['p', 'You may browse the site and contact us through it for genuine enquiries. Please do not attempt to disrupt the site, access areas you are not authorised to use, or submit content that is unlawful, harmful or not yours to share.'],
  ['h2', 'Information on the site'],
  ['p', 'We keep the content of this site accurate and up to date, but it is provided for general information. Prices, timelines and examples on the site are indicative; a project is only agreed once scope, price and timeline are confirmed in writing.'],
  ['h2', 'Intellectual property'],
  ['p', 'The design, text, graphics and code of this website belong to ASPR Global Tech unless stated otherwise. Project images in our portfolio are shown with our clients’ permission and remain the property of their owners.'],
  ['h2', 'Enquiries and quotes'],
  ['p', 'Sending an enquiry or quote request does not create a contract. We will reply with questions or a written proposal, and work begins only after both sides agree to it.'],
  ['h2', 'Links to other sites'],
  ['p', 'Links to external websites are provided for convenience. We are not responsible for their content or practices.'],
  ['h2', 'Liability'],
  ['p', 'To the extent permitted by law, ASPR Global Tech is not liable for any indirect loss arising from use of this website.'],
  ['h2', 'Governing law'],
  ['p', 'These terms are governed by the laws of India, and the courts of Tamil Nadu have jurisdiction over any dispute about them.'],
  ['h2', 'Contact'],
  ['p', 'Questions about these terms: support@asprglobaltech.com.'],
];
const blocks = (b: string[][]) => b.map(([type, text]) => ({ type, text }));

/**
 * v2 content: the eight-service line-up with detail-page copy, the technology list, portfolio
 * categories, legal pages and the quote-form options. v1 work items become unpublished draft
 * projects (they were hidden on the v1 site until real projects could be shown).
 */
export function up(db: DatabaseService): void {
  const setting = (key: string) => parseJson<any>(db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])?.value, null);
  const save = (key: string, value: unknown) => db.run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, JSON.stringify(value)]);
  const details: Row = setting('serviceDetails') || {};

  // Technologies.
  TECHNOLOGIES.forEach(([grp, names]) => names.forEach((name, i) =>
    db.run('INSERT OR IGNORE INTO technologies (name, grp, sort) VALUES (?, ?, ?)', [name, grp, i + 1])));
  const techId = new Map(db.all<{ id: number; name: string }>('SELECT id, name FROM technologies').map((t) => [t.name.toLowerCase(), t.id]));
  const linkTech = (serviceId: number, names: string[]) => {
    db.run('DELETE FROM service_technologies WHERE service_id = ?', [serviceId]);
    for (const n of names) {
      const id = techId.get(n.toLowerCase());
      if (id) db.run('INSERT OR IGNORE INTO service_technologies (service_id, technology_id) VALUES (?, ?)', [serviceId, id]);
    }
  };

  // Services: reuse the v1 row a service replaces, so ids, images and edits survive.
  const used = new Set<number>();
  SERVICES.forEach((s, i) => {
    const d: Row = { ...(s.details ? details[s.details] || {} : {}), ...(s.copy || {}) };
    const row = (s.from && db.get<{ id: number }>('SELECT id FROM services WHERE name = ? AND slug IS NULL', [s.from]))
      || db.get<{ id: number }>('SELECT id FROM services WHERE slug = ?', [s.slug]);
    const values = [s.slug, String(i + 1).padStart(2, '0'), s.name, s.pillar, s.line, s.icon, d.tagline || '', d.intro || '',
      pairs(d.outcomes), d.deliverables || [], d.idealFor || [], pairs(d.process), d.timeline || '', d.budget || '', d.addOns || [], pairs(d.faqs), i + 1];
    let id: number;
    if (row) {
      db.run(`UPDATE services SET slug = ?, num = ?, name = ?, pillar = ?, line = ?, icon = ?, tagline = ?, intro = ?, outcomes = ?, deliverables = ?,
        ideal_for = ?, process = ?, timeline = ?, budget = ?, add_ons = ?, faqs = ?, sort = ?, active = 1, updated_at = datetime('now') WHERE id = ?`, [...values, row.id]);
      id = row.id;
    } else {
      id = db.run(`INSERT INTO services (slug, num, name, pillar, line, icon, tagline, intro, outcomes, deliverables, ideal_for, process, timeline, budget,
        add_ons, faqs, sort, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, values).lastInsertRowid;
    }
    used.add(id);
    linkTech(id, s.tech);
  });
  for (const r of db.all<{ id: number; name: string }>('SELECT id, name FROM services')) {
    if (used.has(r.id)) continue;
    const retired = RETIRED[r.name];
    const slug = retired?.slug || slugify(r.name);
    const d: Row = details[slug] || {};
    db.run(`UPDATE services SET slug = ?, icon = ?, tagline = ?, intro = ?, outcomes = ?, deliverables = ?, ideal_for = ?, process = ?, timeline = ?,
      budget = ?, add_ons = ?, faqs = ?, sort = 100 + sort, active = 0, updated_at = datetime('now') WHERE id = ?`,
    [slug, retired?.icon || 'sparkles', d.tagline || '', d.intro || '', pairs(d.outcomes), d.deliverables || [], d.idealFor || [], pairs(d.process),
      d.timeline || '', d.budget || '', d.addOns || [], pairs(d.faqs), r.id]);
    if (retired) linkTech(r.id, retired.tech);
  }

  // Portfolio categories, and v1 work items as unpublished drafts.
  CATEGORIES.forEach(([slug, name], i) => db.run('INSERT OR IGNORE INTO project_categories (slug, name, sort) VALUES (?, ?, ?)', [slug, name, i + 1]));
  const categoryId = new Map(db.all<{ id: number; slug: string }>('SELECT id, slug FROM project_categories').map((c) => [c.slug, c.id]));
  const serviceId = new Map(db.all<{ id: number; slug: string }>('SELECT id, slug FROM services').map((c) => [c.slug, c.id]));
  if (db.hasTable('work_items')) {
    for (const w of db.all('SELECT * FROM work_items ORDER BY sort, id')) {
      const map = WORK_MAP[w.client] || { category: w.pillar === 'Brand' ? 'branding' : 'websites', services: [] };
      let slug = slugify(w.client) || `project-${w.id}`;
      if (db.get('SELECT 1 FROM projects WHERE slug = ?', [slug])) slug += `-${w.id}`;
      const id = db.run(`INSERT INTO projects (slug, title, client, category_id, summary, features, cover_image, cover_alt, cover_pos, featured, sort, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [slug, w.client, w.client, categoryId.get(map.category)!, w.outcome, parseJson(w.scope, []), w.img, w.alt, w.pos, w.featured, w.sort, w.created_at]).lastInsertRowid;
      for (const s of map.services) if (serviceId.has(s)) db.run('INSERT INTO project_services (project_id, service_id) VALUES (?, ?)', [id, serviceId.get(s)!]);
    }
    db.exec('DROP TABLE work_items');
  }

  // The brief builder's needs and package suggestions are replaced by the quote form.
  if (db.hasTable('packages')) db.exec('DROP TABLE packages');
  if (db.hasTable('needs')) db.exec('DROP TABLE needs');

  // Legal pages.
  db.run('INSERT OR IGNORE INTO pages (slug, title, summary, blocks, sort) VALUES (?, ?, ?, ?, 1)',
    ['privacy-policy', 'Privacy Policy', 'What we collect through this website, why, and your choices.', blocks(PRIVACY)]);
  db.run('INSERT OR IGNORE INTO pages (slug, title, summary, blocks, sort) VALUES (?, ?, ?, ?, 2)',
    ['terms', 'Terms & Conditions', 'The terms for using the ASPR Global Tech website.', blocks(TERMS)]);

  // Quote and contact form options.
  save('projectTypes', ['Website', '3D Website', 'Web Application', 'Custom Software', 'Mobile App', 'UI/UX Design', 'Business Automation', 'Branding', 'Other']);
  save('budgets', ['Under $1,000', '$1,000–$2,500', '$2,500–$5,000', '$5,000–$10,000', '$10,000+', 'Not sure yet']);
  save('timelines', ['ASAP', '1–2 weeks', '1 month', '1–3 months', 'Flexible']);
  save('heardFrom', ['Google search', 'Social media', 'Referral from a friend or client', 'AI assistant (ChatGPT, Gemini…)', 'Saw our work', 'Other']);
  save('hero', {
    eyebrow: 'Software studio · Websites · 3D · Apps',
    headline: 'We build websites, *3D experiences* & software that make businesses stand out.',
    sub: 'ASPR Global Tech designs and engineers premium websites, web applications and custom software, built around how your business works and made to perform.',
  });
  for (const key of ['serviceDetails', 'heroStrip', 'proof', 'showTestimonials', 'contactMethods']) db.run('DELETE FROM settings WHERE key = ?', [key]);
}
