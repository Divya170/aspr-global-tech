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
