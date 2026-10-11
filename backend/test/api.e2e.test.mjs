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

// Last on purpose: the rate-limit test at the end locks this IP out of login.
describe('admin security', () => {
  const ADMIN_ROUTES = [
    ['GET', '/admin/leads'], ['GET', '/admin/leads/facets'], ['GET', '/admin/leads/export.csv'], ['GET', '/admin/leads/1'],
    ['PATCH', '/admin/leads/1'], ['POST', '/admin/leads/1/notes'], ['DELETE', '/admin/leads/1'],
    ['GET', '/admin/applications'], ['GET', '/admin/applications/roles'], ['GET', '/admin/applications/export.csv'],
    ['GET', '/admin/applications/1'], ['PATCH', '/admin/applications/1'], ['DELETE', '/admin/applications/1'],
    ['GET', '/admin/subscribers'], ['GET', '/admin/subscribers/export.csv'], ['PATCH', '/admin/subscribers/1'], ['DELETE', '/admin/subscribers/1'],
    ['GET', '/admin/chat/sessions'], ['GET', '/admin/chat/sessions/x/messages'],
    ['GET', '/admin/media'], ['POST', '/admin/media'], ['DELETE', '/admin/media/1'],
    ['GET', '/admin/stats'], ['GET', '/admin/stats/email'],
    ['GET', '/admin/users'], ['GET', '/admin/users/options'], ['POST', '/admin/users'], ['PATCH', '/admin/users/1'], ['DELETE', '/admin/users/1'],
    ['GET', '/admin/content/schema'], ['GET', '/admin/content/services'], ['GET', '/admin/content/services/1'], ['POST', '/admin/content/services'],
    ['PATCH', '/admin/content/services/1'], ['DELETE', '/admin/content/services/1'],
    ['GET', '/admin/settings'], ['PUT', '/admin/settings/hero'],
    ['GET', '/admin/notifications'], ['POST', '/admin/notifications/read'], ['GET', '/admin/activity'],
    ['GET', '/admin/attachments/1/download'], ['GET', '/admin/auth/me'], ['POST', '/admin/auth/logout'], ['POST', '/admin/auth/password'],
  ];
  const send = (c, [method, p]) => method === 'GET' ? c.get(p) : method === 'POST' ? c.post(p, {}) : method === 'PATCH' ? c.patch(p, {}) : method === 'DELETE' ? c.del(p) : c.call?.('PUT', p, {});

  test('every admin route rejects anonymous requests', async () => {
    const c = client();
    for (const [method, p] of ADMIN_ROUTES) {
      const res = method === 'PUT'
        ? await fetch(BASE + p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"value":1}' })
        : await send(c, [method, p]);
      assert.ok([401, 403].includes(res.status), `${method} ${p} answered ${res.status}`);
    }
  });

  test('roles are enforced server-side', async () => {
    const owner = client(); await owner.login('owner@example.com', 'correct-horse-battery');
    await owner.post('/admin/users', { name: 'Ad Min', email: 'admin2@example.com', role: 'admin', password: 'amber-river-sixty-3' });
    const ed = client(); await ed.login('editor@example.com', 'blue-lantern-forty-2');
    const mg = client(); await mg.login('manager@example.com', 'quiet-harbor-ninety-7');
    const ad = client(); await ad.login('admin2@example.com', 'amber-river-sixty-3');
    for (const p of ['/admin/leads', '/admin/leads/export.csv', '/admin/applications', '/admin/subscribers', '/admin/subscribers/export.csv',
      '/admin/chat/sessions', '/admin/users', '/admin/settings', '/admin/activity', '/admin/stats/email']) {
      assert.equal((await ed.get(p)).status, 403, `editor GET ${p}`);
    }
    for (const p of ['/admin/content/services', '/admin/media']) assert.equal((await ed.get(p)).status, 200, `editor GET ${p}`);
    for (const p of ['/admin/content/services', '/admin/media', '/admin/settings', '/admin/users']) assert.equal((await mg.get(p)).status, 403, `manager GET ${p}`);
    assert.equal((await mg.get('/admin/leads')).status, 200);
    assert.equal((await mg.del('/admin/leads/1')).status, 403);
    for (const p of ['/admin/users', '/admin/settings', '/admin/leads', '/admin/content/services']) assert.equal((await ad.get(p)).status, 200, `admin GET ${p}`);
  });

  test('reset tokens are single-use and expire', async () => {
    const Database = require('better-sqlite3');
    const db = new Database(process.env.DB_PATH);
    const c = client();
    const tokenFor = async () => {
      await c.post('/admin/auth/forgot', { email: 'editor@example.com' });
      const row = db.prepare("SELECT text FROM email_outbox WHERE template = 'password-reset' ORDER BY id DESC LIMIT 1").get();
      return row.text.match(/token=([A-Za-z0-9_-]+)/)[1];
    };
    const t1 = await tokenFor();
    assert.equal((await c.post('/admin/auth/reset', { token: t1, newPassword: 'new-lantern-forty-3' })).status, 200);
    assert.equal((await c.post('/admin/auth/reset', { token: t1, newPassword: 'other-lantern-forty-4' })).status, 400, 'second use');
    const t2 = await tokenFor();
    db.prepare("UPDATE password_resets SET expires_at = datetime('now', '-1 minute')").run();
    assert.equal((await c.post('/admin/auth/reset', { token: t2, newPassword: 'late-lantern-forty-5' })).status, 400, 'expired');
    db.close();
  });

  test('media uploads reject fakes, wrong types and oversized images', async () => {
    const ed = client(); await ed.login('editor@example.com', 'new-lantern-forty-3');
    const up = (name, buf, type) => { const f = new FormData(); f.append('file', new Blob([buf], { type }), name); return ed.post('/admin/media', undefined, { form: f }); };
    const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b10000000049454e44ae426082', 'hex');
    assert.equal((await up('ok.png', PNG, 'image/png')).status, 201);
    assert.equal((await up('fake.png', Buffer.from('MZ\x90\x00not an image'), 'image/png')).status, 400);
    assert.equal((await up('notes.txt', Buffer.from('hello'), 'text/plain')).status, 400);
    const big = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]);
    assert.equal((await up('big.png', big, 'image/png')).status, 400);
  });

  test('forgot-password and login are rate-limited', async () => {
    const c = client();
    let forgot = 0;
    for (let i = 0; i < 60 && forgot !== 429; i++) forgot = (await c.post('/admin/auth/forgot', { email: `nobody${i}@example.com` })).status;
    assert.equal(forgot, 429);
    let login = 0;
    for (let i = 0; i < 120 && login !== 429; i++) login = (await c.post('/admin/auth/login', { email: `nobody${i}@example.com`, password: 'x' })).status;
    assert.equal(login, 429);
  });
});
