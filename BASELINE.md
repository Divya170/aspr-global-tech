# Phase 0 Baseline — website (`release/final-platform`)

- **Date:** 2026-10-11
- **Branch:** `release/final-platform` = `origin/feature/platform-upgrade` (9830b99) + `fix: use npm ci in postinstall so lockfiles stay reproducible`
- **Node:** v22.23.1 (`.nvmrc`: 22) · **npm:** 10.9.8
- **Registry:** https://registry.npmjs.org/ — `npm ping` → PONG
- **Scope:** install and verification only. No feature, theme, dependency or lockfile changes.

| Command | Result |
|---|---|
| `npm ci` (root; postinstall runs `npm --prefix backend ci --include=dev` and `npm --prefix frontend ci --include=dev`) | PASS (exit 0). npm audit: backend 1 high, root 2 critical (not addressed) |
| `npm --prefix frontend run typecheck` | PASS (exit 0, `tsc --noEmit`, no errors) |
| `npm --prefix backend run build` | PASS (exit 0, `nest build`) |
| `npm --prefix frontend run build` | PASS (exit 0, Next.js 15.5.27, 37/37 pages generated) |
| `npm test` (backend e2e, `node --test`) | PASS: 29 tests, 29 pass, 0 fail, 0 skipped, 4 suites |

## Notes
- The expected count was 31, but `backend/test/api.e2e.test.mjs` defines 29 tests and none are skipped, so 29 is the true baseline.
- A second session ran the same installs/builds in this folder at the same time. The frontend build was then re-run on its own after `rm -rf frontend/.next`: PASS (exit 0, 37/37 pages). All other results above come from runs that exited 0.
- Lockfiles were unchanged after install (`git status` clean apart from this file).

# Phase 1 — light identity re-skin (`release/final-platform`)

- **Date:** 2026-10-11
- **Node:** v22.23.1 · **npm:** 10.9.8
- **Scope:** feature-branch code re-skinned with main's light identity. No backend, API, database, dependency or copy changes. Admin UI left for Phase 3.

## Commits

| Commit | Summary |
|---|---|
| `2a772a8` | feat: switch theme tokens and fonts to main's light identity |
| `15adc18` | feat: replace hard-coded colours with theme tokens |
| `f40d84d` | feat: re-theme component styles for light identity |
| `561c92c` | feat: port main's header and footer design |
| `d818988` | feat: port main's hero onto feature home page |
| `ecba06e` | feat: light identity for OG image and status pages |
| `2c8e7fc` | fix: readable gradient text on light process and outcome cards |

Every commit above was preceded by `npm --prefix frontend run typecheck` and `npm --prefix frontend run build`, both passing (37/37 pages).

## Final checks (run after the last code commit)

| Command | Result |
|---|---|
| `npm --prefix frontend run typecheck` | PASS (exit 0, no errors) |
| `npm --prefix frontend run build` | PASS (exit 0, 37/37 pages) |
| `npm --prefix backend run build` | PASS (exit 0) |
| `npm test` (backend e2e) | PASS: 29 tests, 29 pass, 0 fail, 0 skipped (same as Phase 0) |

## Contrast (WCAG AA, computed from the token values)

- Text on bg / bg-2 / surface / surface-2 / surface-3: text 14.39–16.45, muted 6.88–7.86, subtle 4.96–5.66, brand 6.10–6.97, brand-strong 8.26–9.43, danger 5.05–5.76, warning 4.88–5.57, success 4.56–5.21.
- White on brand 6.97, on brand-strong 9.43, on navy 15.60, on danger 5.76.
- On navy: on-navy (#C9D6F7) 10.73, brand-soft 6.71, accent 8.10. Navy on accent 8.10.
- Category tones (`--color-tone-*`) on surface / bg / surface-3: all 4.56–6.97.
- Signal (icons and dots only, non-text): 3.57–4.08 (needs 3:1).
- brand-soft and accent are not used for text on light surfaces.

## Page-by-page check

The feature site (production build, API with a scratch SQLite database) and main (port 3100) were run side by side. Full-page captures at 375px, 768px and 1440px: home, about, services, service detail (website-development), portfolio, contact, quote, careers, faq, insights, an insight post, process, technologies, privacy, terms, 404.

- An automated scan of all 48 captures found no violet pixels. The only dark blocks are the footer and the two intended navy bands (stat band, service outcomes band).
- Visual review found one issue: white-start gradient text on light process and outcome cards. Fixed in `2c8e7fc`.
- **Not checked:** a case-study page. The seeded database has no projects, so `/portfolio/[slug]` has nothing to render. The portfolio "in progress" state was checked.

## Left over / for later phases

- **Admin UI (Phase 3):** admin pages pick up the new tokens but were not reviewed. `components/admin/charts.tsx` still has dark-theme hex colours (`#4170ff`, `#1fa18c`, `#7d86a0`, white/indigo alphas).
- **3D hero:** `components/three/` (Hero3D, heroScene, HeroFallback) is no longer rendered and was not recoloured. Bring it back or delete it after review.
- **Hero proof badges** show the admin stats (`settings.stats`, seeded at 300 projects / 150 clients). Those figures could not be verified from the codebase.
- **Hero chat script** is main's copy, including "Typically 8–16 weeks"; review the claim.
- **Unused effect styles** with no remaining callers in the header (`.fx-navlink`) can be removed in a cleanup pass.
- **npm audit** findings from Phase 0 are unchanged.

# Phase 2 audit — content and assets (before any change)

- **Date:** 2026-10-11 · scratch database reset with `npm --prefix backend run db:reset` (seed + migrations 002-platform, 003-content, 004-copy), API and production frontend running against it.

## Content in the database

| Kind | Published | Draft (hidden) |
|---|---|---|
| Services | 8: website-development, 3d-website-development, web-application-development, custom-software-development, mobile-app-development, ui-ux-design, business-automation, branding-digital-design | 5 (from 003): ai-and-chatbot-solutions, game-development, graphics-design, video-editing, seo |
| Projects | 0 | 6 v1 work items: retail-brand-coimbatore (ecommerce.png), clinic-group-tamil-nadu (responsive-web.png), manufacturer-mettupalayam (inventory.png), food-brand-tamil-nadu (poster.png), education-group (seo-dashboard.png), indie-game-studio (game-ui.png) |
| Products | 4: Billing Software, Employee Management, Inventory Management, Finance & FinServ | 0 |
| Industries | 8: Retail, Healthcare, Education, Real Estate, Manufacturing, Logistics, Hospitality, Startups | 0 |
| Articles | 6 | 0 |
| Testimonials | 0 | 0 |

`car-app.png`, `video-edit.png` and `logo-design.png` are image files, not projects. `settings.heroStrip` is already deleted by migration 003, so it has no images.

## Images the public site renders

- Every page: `aspr-logo.png` (header, 404) and `aspr-logo-white.png` (footer).
- Service detail overview image, which is also that page's OG/JSON-LD image:
  - website-development → responsive-web.png, alt "Responsive website on laptop, tablet and phone"
  - mobile-app-development → shop-app.png, "Shopping app screens"
  - web-application-development → ops-dashboard.png, "Operations SaaS dashboard"
  - business-automation → inventory.png, "Inventory management dashboard"
  - branding-digital-design → logo-design.png, "Logo concept sketches and applications"
  - The other three published services have no image.
- No other page renders a content image. Articles have none, portfolio has no published projects, and the industries (about) and products (service pages) render without images.
- Industry and product image paths are returned by the public `/api/content/industries` and `/api/content/products` JSON, but no page renders them. The alt text includes "Café promotional poster" (Hospitality) and "Mobile game interface" (Education).

## Draft leak checks (live)

| Check | Result |
|---|---|
| Public API queries (`ContentService.list` adds `active = 1` for every public read; `bySlug` requires `active = 1`; query filters can only narrow results further) | OK |
| `/api/services/<draft>` and `/api/projects/<draft>` | 404 for all 11 drafts |
| `/services/<draft>` and `/portfolio/<draft>` pages | 404 for all, except `/services/graphics-design` → 308 to `/services/branding-digital-design` (existing v1-URL redirect in next.config.mjs, not a leak) |
| `/sitemap.xml` | 27 URLs, no draft slug |
| `/robots.txt` | Disallows /admin, /api, /internal; points at the sitemap |
| site, home, about, services, projects, `/api/content/services?active=false`, `/api/projects?category=…` | No draft name or slug |
| Rendered pages: home, about, services, portfolio, service details, insights, faq, process, careers, OG image | No draft name or slug |
| Admin (`/api/admin/content/{services,projects}?active=false`, signed in) | All 5 draft services and 6 draft projects listed |

## Text that presents unpublished services as current offerings

1. **Home hero rotating line** (Phase 1): "…AI Chatbots, Games…". The orbit icons include bot, gamepad and search.
2. **Chat assistant system prompt** (`backend/src/chat/gemini.service.ts`): "builds websites, mobile apps, SaaS platforms, AI chatbots and games, designs logos, graphics and video, and runs SEO… ten services".
3. **Chat company note** (`backend/src/chat/kb/company/about.md`): "AI chatbots and games…", "Services: 10". The generated knowledge docs read only published rows, so they are fine.
4. **FAQ "brand-only"**: "Logo, graphics and video are services on their own."
5. **FAQ "alongside"**: "say the app, the brand or SEO".
6. **FAQ "tech"**: "Unity for games".

Not changed (these describe the team or are real roles, not offered services): the about/careers team chips (Game developers, Video editors, SEO), the careers roles (Video editor, Graphic designer), the article "What SEO cannot fix", and the 3D technology group listing Unity.

Deferred by the owner and not touched: the 300+/150+ stats (including in `kb/company/about.md`), `components/three/`, the "Typically 8–16 weeks" chat line, and the admin UI.

# Phase 2 — results

## Commits
`8765980` docs: Phase 2 content audit · `100b668` fix: keep unpublished projects and services off the public site · `1781f4c` fix: stop mockup images reading as client work · `65122c8` fix: hero lists only services we publish · `b7486ba` feat: carry main's richer copy into the platform site · `46a49f6` perf: compress portfolio and service images · `d2a7643` chore: remove unused assets

## Final checks (run after the last code commit)
| Command | Result |
|---|---|
| `npm --prefix frontend run typecheck` | PASS |
| `npm --prefix frontend run build` | PASS (37/37 pages) |
| `npm --prefix backend run build` | PASS |
| `npm test` | PASS: 35 tests, 35 pass, 0 fail, 0 skipped (29 before Phase 2 + 6 new) |

## Images
`frontend/public/assets` went from 11.32 MB to 3.75 MB (same names and format), and coding.png and icons.png (1.5 MB) were removed. Per-file sizes are in the perf commit.

## Lighthouse (mobile, local production build)
| Page | Before | After |
|---|---|---|
| Home | perf 36–37, a11y 100, LCP 5.6–5.9 s | not run (stopped at the owner's request) |
| /services/website-development | perf 29, a11y 100, LCP 7.0–8.6 s | not run |

## Not run
- The 375/768/1440 screenshot check of the Phase 2 pages (stopped at the owner's request). Phase 1's full check covered the layouts; Phase 2 changed only content, hero words and icons, the footer line and image bytes.

## Left over
- "After" Lighthouse numbers and the Phase 2 screenshot pass.
- FAQ "how-long" says a brand identity takes 2–4 weeks; the branding service says 2–3 weeks. The owner needs to pick one.
- `settings.teamRoles` still lists Game developers, Video editors and SEO as team skills (About and Careers).
- Main's mission/vision wording and the careers line "Mettupalayam • Full-time • Internships" were not carried over (tone, or unverified).
- The industry and product images removed by 005 can be re-added in the admin if real assets exist.
- Deferred by the owner: the 300+/150+ stats, `components/three/`, the "8–16 weeks" lines, and the admin UI (Phase 3).
