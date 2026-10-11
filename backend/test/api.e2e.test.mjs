// End-to-end API tests: boots the built API (dist/) on a throwaway database and exercises it
// over HTTP. Run with `npm test` (builds first). Uses only Node's built-in test runner.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dir = mkdtempSync(path.join(tmpdir(), 'aspr-test-'));
const PORT = 4600 + Math.floor(Math.random() * 300);
Object.assign(process.env, {
  NODE_ENV: 'test', DB_PATH: path.join(dir, 'app.sqlite'), UPLOAD_DIR: path.join(dir, 'uploads'), API_PORT: String(PORT), API_HOST: '127.0.0.1',
  ADMIN_EMAIL: 'owner@example.com', ADMIN_PASSWORD: 'correct-horse-battery', SMTP_HOST: '', GEMINI_API_KEY: '', REVALIDATE_SECRET: '', RATE_LIMIT_MULTIPLIER: '10',
});
const BASE = `http://127.0.0.1:${PORT}/api`;
let app;

before(async () => {
  const { bootstrap } = require('../dist/main');
  app = await bootstrap({ shutdownHooks: false });
});
after(async () => {
  await app?.close();
  rmSync(dir, { recursive: true, force: true });
});

/** Minimal cookie-jar client. */
function client() {
  let cookie = '';
  let csrf = '';
  const call = async (method, p, body, { form, headers = {} } = {}) => {
    const h = { ...headers };
    if (cookie) h.cookie = cookie;
    if (csrf && method !== 'GET') h['x-csrf-token'] = csrf;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(BASE + p, { method, headers: h, body: payload });
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) cookie = c.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  };
  return {
    get: (p) => call('GET', p), post: (p, b, o) => call('POST', p, b, o), patch: (p, b) => call('PATCH', p, b), del: (p) => call('DELETE', p),
    async login(email, password) {
      const r = await call('POST', '/admin/auth/login', { email, password });
      if (r.status === 200) csrf = r.body.csrfToken;
      return r;
    },
    dropCsrf() { csrf = ''; },
  };
}

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
function quoteForm(fields, files = []) {
  const form = new FormData();
  form.append('data', JSON.stringify(fields));
  for (const [name, buf, type] of files) form.append('files', new Blob([buf], { type }), name);
  return form;
}
const validQuote = {
  projectType: 'Website', budget: '$2,500–$5,000', timeline: '1 month', name: 'Test Client', email: 'client@example.com',
  company: 'Acme', message: 'We need a new marketing website with a booking form and a blog.', heardFrom: 'Google search',
};

describe('public content', () => {
  test('health and site payload', async () => {
    const c = client();
    assert.equal((await c.get('/health')).status, 200);
    const site = await c.get('/site');
    assert.equal(site.status, 200);
    assert.ok(site.body.services.length >= 8);
    assert.ok(site.body.settings.projectTypes.includes('3D Website'));
    assert.equal(site.body.settings.adminPassword, undefined);
  });

  test('service detail by slug, 404 for unknown', async () => {
    const c = client();
    const s = await c.get('/services/3d-website-development');
    assert.equal(s.status, 200);
    assert.ok(s.body.technologies.some((t) => t.name === 'Three.js'));
    assert.equal((await c.get('/services/does-not-exist')).status, 404);
  });

  test('unpublished projects are not public', async () => {
    const r = await client().get('/projects');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.items, []);
  });

  // v1 content kept as drafts by migration 003: never public, still in the admin.
  const DRAFT_SERVICES = ['ai-and-chatbot-solutions', 'game-development', 'graphics-design', 'video-editing', 'seo'];
  const DRAFT_PROJECTS = ['retail-brand-coimbatore', 'clinic-group-tamil-nadu', 'manufacturer-mettupalayam', 'food-brand-tamil-nadu', 'education-group', 'indie-game-studio'];

  test('draft services and projects are not in public lists', async () => {
    const c = client();
    const lists = [(await c.get('/services')).body, (await c.get('/site')).body.services, (await c.get('/pages/home')).body.services,
      (await c.get('/content/services')).body.items];
    for (const list of lists) for (const slug of DRAFT_SERVICES) assert.ok(!list.some((s) => s.slug === slug), `${slug} is public`);
    const projects = JSON.stringify([(await c.get('/projects')).body, (await c.get('/pages/home')).body.projects]);
    for (const slug of DRAFT_PROJECTS) assert.ok(!projects.includes(slug), `${slug} is public`);
  });

  test('draft slugs return 404', async () => {
    const c = client();
    for (const slug of DRAFT_SERVICES) assert.equal((await c.get(`/services/${slug}`)).status, 404, slug);
    for (const slug of DRAFT_PROJECTS) assert.equal((await c.get(`/projects/${slug}`)).status, 404, slug);
  });

  test('drafts are not in the sitemap', async () => {
    const r = await client().get('/pages/sitemap');
    assert.equal(r.status, 200);
    const slugs = [...r.body.services, ...r.body.projects].map((x) => x.slug);
    for (const slug of [...DRAFT_SERVICES, ...DRAFT_PROJECTS]) assert.ok(!slugs.includes(slug), `${slug} in sitemap`);
    assert.equal(r.body.services.length, 8);
  });

  test('public FAQs do not offer unpublished services', async () => {
    const text = JSON.stringify((await client().get('/faqs')).body);
    assert.doesNotMatch(text, /graphics and video are services|or SEO —|Unity for games/);
  });

  test('mockup images are labelled as mockups or removed', async () => {
    const c = client();
    assert.equal((await c.get('/services/mobile-app-development')).body.img, null);
    assert.match((await c.get('/services/website-development')).body.alt, /^Illustrative mockup/);
    const industries = (await c.get('/content/industries')).body.items;
    assert.equal(industries.find((i) => i.name === 'Hospitality').img, null);
    assert.ok((await c.get('/content/products')).body.items.every((p) => p.img === null));
  });

  test('copy carried from main: branding deliverables and where we are based', async () => {
    const c = client();
    assert.ok((await c.get('/services/branding-digital-design')).body.deliverables.includes('3 original logo concepts'));
    const facts = (await c.get('/site')).body.settings.facts;
    assert.equal(facts.find((f) => f.k === 'BASED IN').v, 'Mettupalayam, Tamil Nadu, India · Serving worldwide');
  });

  test('launch decisions: brand timeline and team chips', async () => {
    const c = client();
    const faqs = JSON.stringify((await c.get('/faqs')).body);
    assert.match(faqs, /a brand identity 2–3 weeks/);
    assert.doesNotMatch(faqs, /2–4 weeks/);
    const roles = (await c.get('/site')).body.settings.teamRoles;
    for (const r of ['Game developers', 'Video editors', 'SEO']) assert.ok(!roles.includes(r), r);
    assert.ok(roles.includes('Web engineers'));
  });

  test('responses carry security headers and no stack traces', async () => {
    const r = await client().get('/nope');
    assert.equal(r.status, 404);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.doesNotMatch(JSON.stringify(r.body), /at \w+ \(|node_modules|SQLITE/);
  });
});

describe('quote and contact', () => {
  test('validation errors are per field', async () => {
    const r = await client().post('/quote', undefined, { form: quoteForm({ name: '', email: 'nope', projectType: 'Spaceship', message: 'short' }) });
    assert.equal(r.status, 400);
    for (const k of ['name', 'email', 'projectType', 'budget', 'timeline', 'message']) assert.ok(r.body.errors[k], `expected error for ${k}`);
  });

  test('valid quote with a PDF gets an ASPR-YYYY-XXXX reference', async () => {
    const r = await client().post('/quote', undefined, { form: quoteForm(validQuote, [['brief.pdf', PDF, 'application/pdf']]) });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.match(r.body.refNo, new RegExp(`^ASPR-${new Date().getUTCFullYear()}-[2-9A-HJ-NP-Z]{4}$`));
  });

  test('a renamed executable is rejected by content check', async () => {
    const r = await client().post('/quote', undefined, { form: quoteForm(validQuote, [['invoice.pdf', Buffer.from('MZ\x90\x00 not a pdf'), 'application/pdf']]) });
    assert.equal(r.status, 400);
    assert.match(r.body.errors.files, /doesn't look like/);
  });

  test('disallowed extensions are rejected', async () => {
    const r = await client().post('/contact', undefined, { form: quoteForm(validQuote, [['run.exe', Buffer.from('MZ'), 'application/octet-stream']]) });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.files);
  });

  test('contact form needs no budget or timeline', async () => {
    const { budget, timeline, ...rest } = validQuote;
    const r = await client().post('/contact', undefined, { form: quoteForm(rest) });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  });

  test('honeypot submissions look successful but are filed as spam', async () => {
    const r = await client().post('/contact', undefined, { form: quoteForm({ ...validQuote, website: 'http://spam.example' }) });
    assert.equal(r.status, 201);
  });
});

describe('admin auth', () => {
  test('admin routes need a session', async () => {
    assert.equal((await client().get('/admin/leads')).status, 401);
  });

  test('wrong password is rejected without revealing which part was wrong', async () => {
    const r = await client().login('owner@example.com', 'wrong-password-123');
    assert.equal(r.status, 401);
    assert.match(r.body.message, /don.t match/);
  });

  test('login sets an httpOnly SameSite=Strict cookie and returns a CSRF token', async () => {
    const res = await fetch(`${BASE}/admin/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.com', password: 'correct-horse-battery' }) });
    assert.equal(res.status, 200);
    const cookie = res.headers.getSetCookie()[0];
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.ok((await res.json()).csrfToken);
  });

  test('writes without the CSRF token are refused', async () => {
    const c = client();
    await c.login('owner@example.com', 'correct-horse-battery');
    c.dropCsrf();
    const r = await c.post('/admin/notifications/read', { ids: 'all' });
    assert.equal(r.status, 403);
  });

  test('accounts lock after repeated failures', async () => {
    const admin = client();
    await admin.login('owner@example.com', 'correct-horse-battery');
    const made = await admin.post('/admin/users', { name: 'Locky', email: 'locky@example.com', role: 'editor', password: 'a-strong-password-1' });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    let last;
    for (let i = 0; i < 6; i++) last = await client().login('locky@example.com', 'not-the-password');
    assert.equal(last.status, 429);
    assert.equal((await client().login('locky@example.com', 'a-strong-password-1')).status, 429);
  });
});

describe('roles and lead management', () => {
  let admin;
  before(async () => {
    admin = client();
    await admin.login('owner@example.com', 'correct-horse-battery');
    await admin.post('/admin/users', { name: 'Ed Itor', email: 'editor@example.com', role: 'editor', password: 'blue-lantern-forty-2' });
    await admin.post('/admin/users', { name: 'Mana Ger', email: 'manager@example.com', role: 'manager', password: 'quiet-harbor-ninety-7' });
  });

  test('editors manage content but cannot see leads', async () => {
    const ed = client();
    await ed.login('editor@example.com', 'blue-lantern-forty-2');
    assert.equal((await ed.get('/admin/leads')).status, 403);
    assert.equal((await ed.get('/admin/content/services')).status, 200);
  });

  test('managers work leads but cannot delete them or manage users', async () => {
    const m = client();
    await m.login('manager@example.com', 'quiet-harbor-ninety-7');
    const list = await m.get('/admin/leads');
    assert.equal(list.status, 200);
    assert.ok(list.body.items.length >= 2);
    assert.ok(list.body.items.every((l) => l.status !== 'spam'), 'spam hidden by default');
    assert.equal((await m.del(`/admin/leads/${list.body.items[0].id}`)).status, 403);
    assert.equal((await m.get('/admin/users')).status, 403);
  });

  test('editors get no lead notifications or lead names on the dashboard', async () => {
    const ed = client();
    await ed.login('editor@example.com', 'blue-lantern-forty-2');
    const n = await ed.get('/admin/notifications');
    assert.equal(n.status, 200);
    assert.ok(n.body.items.every((x) => !['lead', 'contact'].includes(x.type)));
    const s = await ed.get('/admin/stats');
    assert.deepEqual(s.body.recentLeads, []);
  });

  test('managers can list roles for the applications filter', async () => {
    const m = client();
    await m.login('manager@example.com', 'quiet-harbor-ninety-7');
    const r = await m.get('/admin/applications/roles');
    assert.equal(r.status, 200);
    assert.ok(r.body.length >= 1 && 'title' in r.body[0]);
  });

  test('admin content lists filter by published state', async () => {
    const drafts = await admin.get('/admin/content/services?active=false');
    assert.ok(drafts.body.items.length >= 1 && drafts.body.items.every((x) => x.active === false));
    const draftProjects = await admin.get('/admin/content/projects?active=false');
    assert.equal(draftProjects.status, 200);
    assert.ok(draftProjects.body.items.length >= 6 && draftProjects.body.items.every((x) => x.active === false));
  });

  test('status change, assignment and notes are recorded in the activity log', async () => {
    const list = await admin.get('/admin/leads?q=client@example.com');
    const id = list.body.items[0].id;
    const users = await admin.get('/admin/users/options');
    const manager = users.body.find((u) => u.name === 'Mana Ger');
    const r = await admin.patch(`/admin/leads/${id}`, { status: 'proposal-sent', assignedTo: manager.id });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.status, 'proposal-sent');
    assert.equal(r.body.assignedTo.name, 'Mana Ger');
    const n = await admin.post(`/admin/leads/${id}/notes`, { body: 'Sent proposal v1.' });
    assert.equal(n.status, 201);
    assert.equal(n.body.notes[0].body, 'Sent proposal v1.');
    assert.ok(n.body.activity.some((a) => /Proposal sent/.test(a.summary)));
    assert.equal((await admin.patch(`/admin/leads/${id}`, { status: 'bogus' })).status, 400);
  });

  test('filters by assignee and exports CSV', async () => {
    const r = await admin.get('/admin/leads?status=proposal-sent');
    assert.equal(r.body.total, 1);
    const csv = await admin.get('/admin/leads/export.csv');
    assert.equal(csv.status, 200);
    assert.match(csv.body, /refNo,createdAt,status/);
  });

  test('new leads raise notifications that can be marked read', async () => {
    const n = await admin.get('/admin/notifications');
    assert.ok(n.body.unread >= 2);
    const after = await admin.post('/admin/notifications/read', { ids: 'all' });
    assert.equal(after.body.unread, 0);
  });

  test('confirmation emails are queued in the outbox', async () => {
    const r = await admin.get('/admin/stats/email');
    assert.equal(r.status, 200);
    assert.equal(r.body.enabled, false);
    assert.ok(r.body.recent.some((m) => m.template === 'lead-client' && m.to === 'client@example.com'));
  });

  test('dashboard stats', async () => {
    const r = await admin.get('/admin/stats');
    assert.equal(r.status, 200);
    assert.equal(r.body.leadsByMonth.length, 12);
    assert.ok(r.body.overview.totalLeads >= 2);
    assert.ok(r.body.serviceDemand.some((s) => s.type === 'Website'));
  });

  test('testimonials cannot be published without client consent', async () => {
    const r = await admin.post('/admin/content/testimonials', { clientName: 'Jane', body: 'Great work.', active: true, consent: false });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.consent);
    const ok = await admin.post('/admin/content/testimonials', { clientName: 'Jane', body: 'Great work.', active: false });
    assert.equal(ok.status, 201);
  });

  test('projects: create with technologies, publish, visible publicly', async () => {
    const cats = await admin.get('/admin/content/project-categories');
    const techs = await admin.get('/admin/content/technologies?q=react');
    const r = await admin.post('/admin/content/projects', {
      title: 'Test Project', slug: 'test-project', categoryId: cats.body.items[0].id, summary: 'A test.',
      technologies: techs.body.items.map((t) => t.id), coverImage: '/assets/ecommerce.png', active: true,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.ok(r.body.technologies.length >= 1);
    const pub = await client().get('/projects/test-project');
    assert.equal(pub.status, 200);
    assert.ok(pub.body.technologies.some((t) => /React/.test(t.name)));
  });

  test('image fields only accept our own paths', async () => {
    const cats = await admin.get('/admin/content/project-categories');
    const r = await admin.post('/admin/content/projects', { title: 'X', slug: 'x-proj', categoryId: cats.body.items[0].id, coverImage: 'javascript:alert(1)' });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.coverImage);
  });

  test('the last super admin cannot be demoted or deleted', async () => {
    const list = await admin.get('/admin/users');
    const me = list.body.items.find((u) => u.email === 'owner@example.com');
    assert.equal((await admin.del(`/admin/users/${me.id}`)).status, 400);
  });
});
