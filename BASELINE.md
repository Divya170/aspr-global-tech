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
