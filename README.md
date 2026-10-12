# ASPR Global Tech — website, admin and API

The ASPR Global Tech platform: a premium marketing site with a real-time 3D hero, a quote and lead pipeline, a portfolio/CMS, and a role-based admin dashboard.

| Layer | Tech | Folder |
|---|---|---|
| Website + admin dashboard | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, three.js | `frontend/` |
| API and business logic | NestJS 11, TypeScript | `backend/` |
| Database | SQLite (`better-sqlite3`), versioned migrations | `DB_PATH` (default `database/app.sqlite`) |
| Email | SMTP via Nodemailer, through a retrying outbox | `backend/src/mail/` |

## Quick start

Requires Node.js 20 or newer.

```bash
npm install                              # also installs backend/ and frontend/
cp backend/.env.example backend/.env     # set ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars)
cp frontend/.env.example frontend/.env.local
npm run dev                              # API on :4000, website on :3000
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`; that first super admin is created on the API's first start.
- API health: http://localhost:4000/api/health

On first start the API creates the database, seeds the original content and applies every migration. Existing databases upgrade themselves the same way. `npm run db:reset` deletes the local database so the next start rebuilds it.

Production: `npm run build && npm start` runs the website and API in one Node process (`server.js`). See [DEPLOY.md](DEPLOY.md) for Hostinger.

## How it fits together

```
Browser ──► Next.js (:3000) ──/api/* proxy──► NestJS (127.0.0.1:4000) ──► SQLite
              │  pages render per request from cached API reads          ├─► uploads (UPLOAD_DIR, outside the web root)
              │  (cache cleared by the API after every admin edit)       └─► SMTP (email outbox worker)
              └─ /admin dashboard (same API, cookie session + CSRF)
```

The browser only talks to its own origin: `/api/*` is proxied to the API, so there is no CORS to configure and the session cookie is first-party. Content pages render on request from API reads cached for five minutes; when an admin saves anything, the API calls `/internal/revalidate` (shared `REVALIDATE_SECRET`, generated automatically by `server.js`) so changes appear on the next page load.

## Public site

| Route | What it is |
|---|---|
| `/` | Hero with a real-time 3D scene, credibility, services, featured work, process, technology, testimonials (only genuine, approved ones), FAQ |
| `/services`, `/services/[slug]` | Service overview and one detail page per service: what we build, process, technologies, example projects, FAQ |
| `/portfolio`, `/portfolio/[slug]` | Filterable portfolio and case studies (overview, challenge, solution, features, technologies, process, results, gallery) |
| `/quote`, `/quote/success` | Four-step quote wizard: project type, budget, timeline, requirements and files, contact; returns an inquiry ID like `ASPR-2026-7KQ4` |
| `/contact` | Contact form and direct contact details |
| `/about`, `/process`, `/technologies`, `/faq`, `/careers`, `/insights` | Company pages, hiring with applications, and the blog |
| `/privacy-policy`, `/terms` | Legal pages, editable in the admin (Content → Pages) |
| `/sitemap.xml`, `/robots.txt`, `/opengraph-image` | SEO |

Design system: dark tokens in `frontend/app/globals.css` (`bg-surface`, `text-muted`, `border-line`, `brand`, `accent`…), Schibsted Grotesk for display type and Geist for text. Reusable components live in `frontend/components/ui` (Button, Badge, Accordion, Reveal, SectionHeading…), `components/sections` (PageHero, ServiceCard, PortfolioCard, TestimonialCard, ProcessTimeline, CTASection…) and `components/forms` (accessible form kit).

### The 3D hero and performance

- `components/three/heroScene.ts` builds the scene in code: a glowing core, interface panels drawn on canvas, data streams and particles. There are no model or texture downloads.
- three.js (about 75 KB gzipped) loads only after the page is idle, and only on devices that can run it smoothly: WebGL2, 4+ GB memory, no data-saver, not a small touch screen, no reduced-motion preference. Everyone else, and every first paint, gets the static HTML/CSS version.
- The render loop pauses when the hero scrolls off screen or the tab is hidden.
- Scroll reveals are CSS scroll-driven animations, with no JavaScript. The chat assistant's code loads only when it is opened. Card hover effects share a single pointer listener.
- Lighthouse (mobile, production build, CPU throttling calibrated to the test machine): Performance 88–95, Accessibility 100, Best Practices 100, SEO 100.

## Admin dashboard (`/admin`)

- **Dashboard:** lead KPIs, leads by month, service demand, pipeline by status, recent leads and activity, email delivery status.
- **Leads:**
  - Search by name, email, company, inquiry ID or project type.
  - Filter by status, project type, budget, source, assignee or date; sort and paginate.
  - Export to CSV.
  - Detail page: status pipeline (New → Contacted → Qualified → Proposal sent → Negotiation → Won/Lost), assign to staff, internal notes, attachments, activity timeline.
- **Applications, subscribers, chat transcripts.**
- **Content (CMS):**
  - Sections: services, portfolio projects and categories, technologies, testimonials, FAQs, process steps, insights, products, industries, open roles, pages.
  - The forms are generated from the API's collection schema, with media picker, block editor, galleries and many-to-many links.
  - Testimonials can't be published without the client's approval.
- **Media library** for images and videos.
- **Team:** staff accounts and roles. **Activity:** audit log. **Settings:** company details, hero copy, stats, form options. **Account:** change password.

Roles:

| Role | Can do |
|---|---|
| Super admin | Everything, including managing other super admins |
| Admin | Everything except super admin accounts |
| Manager | Leads, applications, subscribers, chat, activity |
| Editor | Content and media |

## Security

- **Sign-in:**
  - Passwords are hashed with scrypt.
  - Sessions are stored server-side; the browser holds an opaque `HttpOnly`, `SameSite=Strict`, `Secure` (in production) cookie.
  - Every admin write needs the session's CSRF token.
  - Accounts lock for 15 minutes after 5 failed sign-ins, on top of per-IP rate limits.
  - Password reset works by emailed one-time link; `npm --prefix backend run admin:create` is the recovery path.
- **Roles** are enforced by the API on every route; the UI only hides what a role can't use.
- **Input:** every public form is validated on the client and on the server, rate-limited and has a spam honeypot. All SQL uses bound parameters. CSV exports neutralise formula injection.
- **Uploads:**
  - Checked by extension and by actual file content (magic bytes); SVG and executables are refused.
  - Stored with random names outside the web root.
  - Attachments download only for signed-in staff; media is served with `nosniff` and a sandbox CSP.
- **Headers:** nonce-based Content Security Policy, HSTS, `X-Frame-Options: DENY`, Permissions-Policy and `nosniff` on every page.
- **Errors:** unexpected errors are logged on the server and answered with a generic message, never a stack trace.

## API overview

All routes are under `/api`. Errors are `{ statusCode, message, errors?: { field: message } }`.

| Public | |
|---|---|
| `GET /health`, `/site`, `/pages/home`, `/pages/about`, `/pages/process`, `/pages/careers`, `/pages/:slug` | Page payloads |
| `GET /services`, `/services/:slug`, `/projects?category=`, `/projects/:slug`, `/technologies`, `/testimonials`, `/faqs`, `/articles[/:slug]` | Content |
| `POST /quote`, `POST /contact` | Multipart: `data` (JSON) + up to 5 `files` → `{ refNo }` |
| `POST /roles/:id/applications`, `POST /newsletter/subscribe`, `POST /chat/message`, `POST /chat/lead` | Other submissions |
| `GET /media/:name` | Uploaded images and videos |

| Admin (cookie session; `X-CSRF-Token` on writes) | |
|---|---|
| `POST /admin/auth/login`, `logout`, `password`, `forgot`, `reset`; `GET /admin/auth/me` | Authentication |
| `GET/PATCH/DELETE /admin/leads[/:id]`, `POST /admin/leads/:id/notes`, `GET /admin/leads/facets`, `/admin/leads/export.csv` | Leads |
| `/admin/applications`, `/admin/subscribers`, `/admin/chat/sessions` | Other submissions |
| `GET /admin/content/schema`, `GET/POST /admin/content/:collection`, `GET/PATCH/DELETE /admin/content/:collection/:id` | CMS |
| `/admin/media`, `/admin/users`, `/admin/activity`, `/admin/notifications`, `/admin/settings`, `/admin/stats` | Everything else |

## Project structure

```
backend/src/
  admin/       auth (sessions, CSRF, lockout, reset), roles/permissions, users, dashboard stats
  leads/       quote + contact submissions and the lead pipeline
  content/     collection registry (drives validation, public API and admin forms), page payloads
  database/    SQLite service, v1 seed, migrations/ (002 platform schema, 003 content, 004 copy)
  mail/        outbox worker and branded templates
  ops/         activity log, notifications, website cache revalidation
  uploads/     file-type verification, attachments, media library
  careers/ newsletter/ chat/
backend/test/  end-to-end API tests (node:test)
frontend/app/(site)/    public pages      frontend/app/admin/   admin dashboard
frontend/components/    ui, layout, sections, forms, three, chat, admin
frontend/lib/           API clients, types, SEO, analytics, validation
```

## Testing

```bash
npm test          # builds the API and runs the end-to-end suite against a throwaway database
npm --prefix frontend run typecheck
```

The suite covers public content, quote/contact validation and uploads (including disguised files), honeypot handling, sign-in, cookie flags, CSRF, lockout, role permissions, the lead pipeline, notifications, the email outbox, dashboard stats, testimonial consent, projects and image-path validation.

## Configuration

Put everything in one `.env` at the project root in production (see [.env.example](.env.example)); in development `backend/.env` and `frontend/.env.local` work too.

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | First super admin, created on first start (the API refuses to start in production without a strong password) |
| `ADMIN_SESSION_TTL_HOURS` | Admin session length (default 12) |
| `DB_PATH`, `UPLOAD_DIR` | Data locations; keep them outside the app folder in production |
| `NEXT_PUBLIC_SITE_URL` | Public URL (SEO, emails); fixed at build time |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `LEADS_NOTIFY_TO` | Email. Without `SMTP_HOST` emails are recorded in the outbox but not sent |
| `REVALIDATE_SECRET`, `WEB_INTERNAL_URL` | Cache refresh after admin edits (set automatically by `server.js`) |
| `TRUST_PROXY` | `true` behind Hostinger/nginx so rate limits see real IPs |
| `COOKIE_SECURE` | Defaults to `true` in production; set `false` only to test a production build over plain http |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional AI chat assistant |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional cookieless analytics (events: CTA clicks, quote/contact submissions, portfolio and service views) |

## Content still needed before launch

The site shows only real information, so some sections stay hidden until there is real content:

- **Portfolio:** the six v1 work items were imported as *unpublished drafts*. Publish real projects (with client approval) under Content → Portfolio; until then the portfolio shows an honest "being prepared" state.
- **Testimonials:** none yet; the section appears once an approved testimonial is published.
- **Stats** (Settings → Stats: 300+ projects, 150+ clients, 10–15 specialists): confirm they are accurate or edit them.
- **Privacy Policy and Terms:** drafts based on how the site actually handles data; have them reviewed.
- **SMTP credentials** so inquiry emails are actually sent.

## Future-ready

- `users.kind` already separates staff from (future) client accounts, and roles are a permission map, so a client portal (projects, milestones, files, invoices) can be added without reworking auth.
- Payments should go through a provider (Stripe/Razorpay); no card data is ever stored here.
- Run one instance only: SQLite and the in-memory rate limiter assume a single process.
