# ASPR Global Tech — website + API

The approved ASPR design (Home and Company pages), turned into a working, data-driven application.

| Layer | Tech | Folder |
|---|---|---|
| Website + admin dashboard | Next.js 15 (App Router), React 19 | `frontend/` |
| API and business logic | NestJS 11 | `backend/` |
| Database | SQLite3 (`better-sqlite3`) | `database/app.sqlite` |

## Quick start

Requires Node.js 20 or newer.

```bash
npm run install:all                      # installs root, backend and frontend
cp backend/.env.example backend/.env     # then set ADMIN_PASSWORD and ADMIN_TOKEN_SECRET
cp frontend/.env.example frontend/.env.local
npm run dev                              # API on :4000, website on :3000
```

- Website: http://localhost:3000 (company section at `/company#about`, `/company#careers`, …; `/about`, `/careers` etc. redirect there)
- Admin dashboard: http://localhost:3000/admin (password from `ADMIN_PASSWORD`)
- API health: http://localhost:4000/api/health

`database/app.sqlite` ships already seeded with all the content from the design. If you delete it, the API recreates the schema and re-seeds it on the next start (`npm run db:reset` does this for you).

Production: `npm run build && npm start`.

## How it fits together

```
Browser ──► Next.js (:3000) ──/api/* proxy──► NestJS (:4000) ──► SQLite (database/app.sqlite)
               │  server-renders pages with                        │
               │  content fetched from the API                     └─► uploads in database/uploads/
               └─ /admin dashboard (same API, token-protected)
```

The browser only ever talks to its own origin; `next.config.mjs` proxies `/api/*` to the backend, so there is no CORS setup to get wrong. Pages are server-rendered with live content (`force-dynamic`), so edits made in the admin appear on the next page load.

## The UI is the design, unmodified

The views are **generated** from the design templates rather than rewritten by hand, so the markup and inline styles are exactly the designer's:

- `design/` holds the original `.dc.html` templates (the source of truth).
- `tools/prepare_templates.py` applies a small, auditable set of edits. It only binds hard-coded content to data, rewrites file links to routes, and adds the loading, error and success feedback the static mock-up had no slot for. These additions reuse the design's own error-box, inline-error and success-card styles.
- `tools/dc2jsx.py` converts each template into `frontend/components/views/*View.jsx`. Hover, focus and active styles are compiled into `frontend/app/pseudo.css`.

To change layout, edit the template in `design/` and run `npm run views`. Re-running it on the current templates reproduces the committed views byte-for-byte.

The behaviour is the design's own logic, ported into `frontend/components/logic/HomeLogic.jsx` and `CompanyLogic.jsx`. That includes the drifting strip, count-ups, waveform, scroll-linked process arc, industry rotation, filters, accordions, hash routing and the three-step brief builder. The only change is where the data comes from and where submissions go: data comes from the API, and submissions go to it.

Verification: pixel comparison against the original design in a headless browser. All seven company pages (including an article) came out 0 pixels different on desktop and mobile. The home page is identical apart from the intended change of FAQ answers now showing real content from the database.

## Features

### Public site

- All content is served from the database: services, products, industries, work, process steps, roles, insights and articles, FAQs, packages, brief options and company details.
- **Project brief**, from the home page's 3-step modal and the contact page:
  - inline validation, with the same rules on client and server
  - a suggested package that updates as you pick needs
  - file attachments: PDF, images or docs, up to 10 MB each, up to 10 files
  - a server-issued reference number, then a success card with next actions
- **Job applications**: one form per open role, needing a portfolio link or files. On success it shows a reference number plus "See how we work" and "Apply for another role".
- **Newsletter**: validation, de-duplication (already-subscribed and re-subscribe cases handled), and a success card linking to Insights.
- Error handling:
  - loading, error and 404 screens
  - server and network errors shown in the design's alert style
  - disabled "Sending…" buttons while submitting
  - server field errors mapped back onto the right field; the brief builder jumps back to the relevant step
- Rate limiting on every public form, per client IP.

### Admin dashboard (`/admin`)

- **Dashboard**: new briefs and applications, last 7 days, pipeline by status, most-requested needs, latest activity.
- **Enquiries** and **Applications**:
  - search, filter by status / source / role, sort, pagination
  - a detail drawer with attachment downloads
  - status workflow and internal notes
  - delete (removes the files too) and CSV export
- **Subscribers**: search, filter, unsubscribe or reactivate, delete, CSV export.
- **Content**:
  - create, edit, delete, publish/hide and reorder every collection
  - forms generated from the backend's collection schema, including an article body editor (standfirst, paragraphs, subheadings, pull quotes)
- **Settings**: edit structured site settings (company contact details, stats, budgets, timelines, process stage copy, …) as validated JSON.

### Site assistant (AI chat)

A chat widget on the public pages answers visitors' questions with Google Gemini, using only the site's own content:

- **Knowledge base**: hand-written Markdown in `backend/src/chat/kb/` (story, contact), plus documents generated from the live content tables (services, products, industries, process, FAQs, packages, work, careers). Admin edits reach the assistant within a minute.
- **Streaming**: answers stream token by token over Server-Sent Events (`POST /api/chat/message`).
- **Lead capture**: when a visitor wants a quote or to start a project, a form opens in the chat. The lead is saved as an ordinary enquiry with source `chat`, with the visitor's questions attached, and appears under Enquiries in `/admin`.
- **Memory**: conversations are stored in SQLite (`chat_sessions`, `chat_messages`). The browser keeps only a random session id, so the chat continues across pages. Transcripts expire after `CHAT_SESSION_TTL_DAYS`.
- **Without a key**: set `GEMINI_API_KEY` in `backend/.env` to enable it. Without one, the widget still works and replies with a link to the most relevant page.

## API reference

All routes are prefixed with `/api`.

**Public**

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/content/home`, `/content/company` | Everything a page renders, in one call |
| GET | `/content/:collection` | `services`, `products`, `industries`, `work`, `steps`, `roles`, `articles`, `faq-groups`, `faqs`, `packages`, `needs`. Supports `?q=`, `?page=`, `?pageSize=` and filters, e.g. `?pillar=Build`, `?category=Grow` |
| GET | `/content/:collection/:id`, `/content/articles/slug/:slug` | Single item |
| GET | `/settings/public` | Public site settings |
| POST | `/packages/suggest` | `{ needs: [] }` → best-matching package |
| POST | `/enquiries` | multipart: `data` (JSON) + `files[]` → `{ refNo, suggestedPackage }` |
| POST | `/roles/:roleId/applications` | multipart: `data` (JSON) + `files[]` → `{ refNo }` |
| POST | `/newsletter/subscribe` | `{ email, source }` |
| GET | `/newsletter/unsubscribe?token=` | Unsubscribe link |

Validation failures return `400 { message, errors: { field: "message" } }`.

**Admin** (header `Authorization: Bearer <token>`, token from `POST /admin/auth/login { password }`)

| Route | Purpose |
|---|---|
| `GET /admin/auth/me` | Check the session |
| `GET /admin/stats` | Dashboard numbers |
| `GET, PATCH, DELETE /admin/enquiries[/:id]` | Plus `GET /admin/enquiries/export.csv` |
| `GET, PATCH, DELETE /admin/applications[/:id]` | Plus `GET /admin/applications/export.csv` |
| `GET, PATCH, DELETE /admin/subscribers[/:id]` | Plus `GET /admin/subscribers/export.csv` |
| `GET /admin/attachments/:id/download` | Download an attached file |
| `GET /admin/content/schema` | Collection schema (drives the admin forms) |
| `GET, POST /admin/content/:collection` | List (including hidden items) and create |
| `GET, PATCH, DELETE /admin/content/:collection/:id` | Read, update, delete |
| `GET /admin/settings`, `PUT /admin/settings/:key` | Site settings |

## Project structure

```
aspr-global-tech/
├── backend/                  NestJS API
│   └── src/
│       ├── main.ts, app.module.ts, config.ts
│       ├── database/         SQLite service, seeder
│       ├── content/          collections registry, public + admin content APIs
│       ├── enquiries/        project briefs
│       ├── careers/          job applications
│       ├── newsletter/       subscribers
│       ├── uploads/          multer config, attachments
│       ├── admin/            auth (signed tokens), guard, stats
│       └── common/           business rules, reference numbers, rate limiting
├── frontend/                 Next.js
│   ├── app/                  pages: /, /company, /admin, loading / error / 404
│   ├── components/views/     generated from the design (do not hand-edit)
│   ├── components/logic/     page behaviour (ported design logic + API calls)
│   ├── components/admin/     admin dashboard
│   ├── lib/                  API client, client-side rules
│   └── public/assets/        design images
├── database/
│   ├── app.sqlite            seeded database
│   ├── schema.sql            schema (applied idempotently on boot)
│   └── seed/content.json     content from the design
├── design/                   original design templates
├── tools/                    template → JSX converter, seed builder
├── package.json
└── README.md
```

## Configuration

**`backend/.env`**

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DB_PATH` | `../database/app.sqlite` | SQLite file |
| `UPLOAD_DIR` | `../database/uploads` | Where attachments are stored |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed browser origin(s), comma-separated |
| `ADMIN_PASSWORD` | `change-me-aspr` | Admin dashboard password — **change this** |
| `ADMIN_TOKEN_SECRET` | dev value | Signs admin session tokens — **change this** |
| `ADMIN_TOKEN_TTL_HOURS` | `12` | Admin session length |
| `TRUST_PROXY` | `false` | Set `true` behind a reverse proxy so rate limits see real client IPs |

**`frontend/.env.local`**

| Variable | Default | Purpose |
|---|---|---|
| `API_INTERNAL_URL` | `http://localhost:4000` | Where Next.js reaches the API |

## Content notes

Some design copy was still placeholder text, such as `[Outcome pending]`, `[One-line body required]`, `[Answer required from ASPR]` and article bodies. It was seeded exactly as designed, so the site looks identical today, and every one of those fields is now editable in the admin under Content or Settings.

## Known limits

- The rate limiter is in-memory, which suits a single API instance. Use a shared store if you run several.
- The site does not send email notifications. New submissions appear in the admin dashboard.
