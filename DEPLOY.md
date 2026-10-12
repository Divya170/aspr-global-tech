# Deploying the ASPR website on Hostinger

In production the website, the admin and the API run as **one Node.js process** (`server.js`):

```
Visitor ──► (nginx or Hostinger's proxy) :443 ──► server.js on PORT (3000)
                                                    ├─ Next.js website + admin (/admin)
                                                    └─ NestJS API on 127.0.0.1:4000 (private, reached via /api/*)
                                                          └─► SQLite + uploads in ~/aspr-data (outside the app folder)
```

Run **one** instance only: SQLite and the in-memory rate limiter assume a single process.

**Which Hostinger product?**

| | **A. Hostinger VPS (recommended)** | **B. Node.js Web App in hPanel (Business / Cloud)** |
|---|---|---|
| Control | Full (SSH as root, nginx, PM2) | Managed; no nginx or PM2 |
| `admin.asprglobaltech.com` | Yes (deploy/nginx.conf) | Admin stays at `asprglobaltech.com/admin` |
| Caching, gzip, chat streaming | Set by deploy/nginx.conf | Whatever Hostinger's proxy does |
| Backups | cron + `npm --prefix backend run db:backup` | hPanel Cron Jobs + the same script |

---

## A. Hostinger VPS (Ubuntu)

### 0. In hPanel

1. **VPS → OS & Panel → Operating system:** plain **Ubuntu 24.04** (no control panel).
2. **VPS → Overview:** note the server IP and the root password, or add your SSH key.
3. **VPS → Firewall:** allow TCP **22, 80, 443** (and nothing else inbound).
4. **Domains → asprglobaltech.com → DNS:** `A` records for `@`, `www` and `admin`, all pointing at the VPS IP. Remove any old `A`/`AAAA` records for those names.

Then SSH in: `ssh root@<server-ip>`. The steps below work as root, where `~` is `/root`.

### 1. Install system packages

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx git build-essential python3 certbot python3-certbot-nginx
npm install -g pm2
node -v    # v22.x (matches .nvmrc)
```

`build-essential` and `python3` let `better-sqlite3` compile if no prebuilt binary matches.

### 2. Get the code and a data folder

```bash
git clone https://github.com/Divya170/aspr-global-tech.git ~/aspr-global-tech
cd ~/aspr-global-tech
git checkout main          # or release/final-platform until it is merged
mkdir -p ~/aspr-data/uploads ~/aspr-backups
```

The database and uploads live in `~/aspr-data`, outside the app folder, so `git pull` and rebuilds never touch them. (For a private repo, clone with a GitHub deploy key or a personal access token.)

### 3. Configure the environment

```bash
cp .env.example .env
nano .env
chmod 600 .env
```

Every key is documented in [.env.example](.env.example); leave a key empty to use its default. The app **refuses to start** in production if any of these are wrong:

| Key | Value on the VPS |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://asprglobaltech.com` |
| `DB_PATH` | `/root/aspr-data/app.sqlite` (absolute) |
| `UPLOAD_DIR` | `/root/aspr-data/uploads` (absolute) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first super admin; 12+ characters, not the example |
| `SMTP_USER`, `SMTP_PASS` | required whenever `SMTP_HOST` is set |

Email (recommended): for Gmail use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false` and an app password. For Hostinger mail use `smtp.hostinger.com`, `465`, `SMTP_SECURE=true`. Also set `MAIL_FROM` and `LEADS_NOTIFY_TO`. Optional: `GEMINI_API_KEY` (chat assistant), `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (analytics). There is no session secret to set: admin sessions are random tokens stored hashed.

### 4. Install and build

```bash
npm ci                     # installs root, backend/ and frontend/ from the lockfiles
npm run build              # reads .env: the /api proxy port and NEXT_PUBLIC_* values are fixed now
```

### 5. Start it (this also migrates the database)

```bash
pm2 start ecosystem.config.js
pm2 logs aspr-global-tech --lines 40    # expect "Applied migration …", "ASPR API listening", "ASPR website listening"
pm2 save
pm2 startup                              # run the command it prints, so the app comes back after a reboot
```

The first start creates the database at `DB_PATH`, seeds the site content, applies migrations 002–006, and creates the first super admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Later starts apply only new migrations.

### 6. Another admin, or locked out

```bash
cd ~/aspr-global-tech
npm --prefix backend run admin:create -- you@example.com "Your Name"
```

This creates a super admin, or resets and unlocks an existing account, and prints a temporary password. It reads the same `.env`.

### 7. nginx

```bash
cp deploy/aspr-proxy.conf /etc/nginx/snippets/aspr-proxy.conf
cp deploy/nginx.conf /etc/nginx/sites-available/aspr
ln -s /etc/nginx/sites-available/aspr /etc/nginx/sites-enabled/aspr
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

This serves the website on `asprglobaltech.com` (with `www` redirected) and the admin on `admin.asprglobaltech.com`. It also adds gzip (brotli once you install the module), one-year caching for `/_next/static` and one-week caching for `/assets`, and unbuffered chat streaming. `portal.` has a commented placeholder for later. Security headers come from the app itself.

### 8. HTTPS

```bash
certbot --nginx -d asprglobaltech.com -d www.asprglobaltech.com -d admin.asprglobaltech.com --redirect
certbot renew --dry-run
```

HTTPS is required: in production the admin cookie is `__Host-…; Secure`, so the admin only works over HTTPS.

### 9. Smoke test

```bash
curl -s https://asprglobaltech.com/api/health          # {"ok":true,…}
curl -sI https://asprglobaltech.com | grep -i -E "strict-transport|content-security"
curl -s https://asprglobaltech.com/sitemap.xml | head
```

Then in a browser:
- open the home page, a service page and `/portfolio`
- send a test request from `/quote`
- sign in at `https://admin.asprglobaltech.com`
- check the lead is under **Leads** and that **Settings → Email delivery** shows both emails as "sent"
- change the admin password under **Account**, and add your team under **Team**

### 10. Backups

The whole state is `~/aspr-data`. This makes a consistent copy while the app runs and keeps the newest 14:

```bash
cd ~/aspr-global-tech && npm --prefix backend run db:backup            # -> ~/aspr-backups
```

Daily at 03:15 (`crontab -e`):

```
15 3 * * * cd /root/aspr-global-tech && /usr/bin/node backend/scripts/backup-db.js /root/aspr-backups >> /root/aspr-backups/backup.log 2>&1
```

Copy the backups off the server too: enable Hostinger's VPS **Snapshots / Backups** in hPanel, or `rsync` `~/aspr-backups` elsewhere. To restore: `pm2 stop aspr-global-tech`, copy a backup over `DB_PATH`, untar the uploads into `~/aspr-data`, then `pm2 start aspr-global-tech`.

### Updating

```bash
cd ~/aspr-global-tech
npm --prefix backend run db:backup
git pull && npm ci && npm run build && pm2 restart aspr-global-tech
```

Pending migrations run on restart; existing leads, applications, subscribers and content are kept.

---

## B. Node.js Web App in hPanel (managed hosting)

Use this only if you don't have a VPS. Hostinger runs the app and handles HTTPS for you.

1. **hPanel → Websites → Add website → Node.js Apps.** Connect the GitHub repo (branch `main`, or `release/final-platform` until merged), or upload a zip made with `npm run package`. Never upload `node_modules`: `better-sqlite3` is a native module and must be installed on the server.
2. **Build settings:**
   - Framework: **Other / Custom** (not "Next.js"; `server.js` starts both halves)
   - Node version: **22.x**
   - Root directory: `/`
   - Entry file: `server.js`
   - Install: `npm ci`
   - Build: `npm run build`
   - Start: `npm start`
3. **Environment variables** (hPanel, not a `.env` file): the same keys as in step A3, with:
   - `DB_PATH=/home/<your-user>/aspr-data/app.sqlite` and `UPLOAD_DIR=/home/<your-user>/aspr-data/uploads`. Find your home path in File Manager or via SSH (`echo $HOME`), and create the `aspr-data` folder in File Manager.
   - `TRUST_PROXY=true`, `NEXT_PUBLIC_SITE_URL=https://asprglobaltech.com`
   - **Don't set `PORT` or `HOST`.** Hostinger assigns the port, and the app must listen on all interfaces for Hostinger's proxy.
4. **Domain + SSL:** attach `asprglobaltech.com` to the app and enable SSL in hPanel. The admin is at `https://asprglobaltech.com/admin` (deploy/nginx.conf and the `admin.` subdomain are VPS-only).
5. Deploy, then run the smoke test from A9 against `https://asprglobaltech.com`.
6. **Backups:** hPanel → Advanced → **Cron Jobs**, daily, command `cd <app folder> && node backend/scripts/backup-db.js /home/<your-user>/aspr-backups` (the app folder path is shown in the Node.js app settings). Hostinger's daily account backups also cover the home directory.
7. **Updating:** push to the connected branch (or upload a new zip) and redeploy. Your data in `aspr-data` stays as it is.

Not under our control on managed hosting:
- whether the proxy buffers the chat's streamed answers (answers still arrive, just not word by word)
- build memory on small plans (if `npm run build` is killed, use the VPS)

---

## Before go-live checklist

- [ ] DNS points at the server; HTTPS works for every hostname you use
- [ ] Environment set, `.env` `chmod 600` and never committed; the first admin password changed after first sign-in
- [ ] SMTP set, and a test quote produced both emails (Settings → Email delivery shows "sent")
- [ ] `/api/health` ok; a test request from `/quote` shows up under Leads
- [ ] Stats (300+ / 150+) and their wording confirmed in Settings; testimonials only with client approval
- [ ] Privacy Policy and Terms reviewed (Content → Pages)
- [ ] Daily backup running, with copies off the server

## Notes

- If you change `API_PORT` or any `NEXT_PUBLIC_*` value, rebuild: they are fixed at build time.
- Moving an existing database to the server: stop the app, copy `app.sqlite` to `DB_PATH`, start it.

## How this guide was checked

On 2026-10-12, steps 2–6, 9 and 10 were rehearsed on a fresh clone of `release/final-platform` with a `.env` made from `.env.example`, running `server.js` in production mode (PM2 runs the same command):
- `npm ci` and `npm run build` succeeded
- the first start created the database outside the app folder, applied migrations 002–006 and created the first admin
- `admin:create` worked
- `/api/health`, the pages, the sitemap and a quote request worked through the site
- the production login cookie was `__Host-aspr_session; HttpOnly; Secure; SameSite=Strict`
- `db:backup` produced a readable copy

The rehearsal found and fixed two bugs: empty `.env` values blocked start-up, and `next.config.mjs` ignored the root `.env` at build time. nginx, certbot, PM2 and the hPanel screens were not run here; follow `nginx -t` and the smoke test on the server.
