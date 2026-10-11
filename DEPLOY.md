# Deploying the ASPR website (first deploy on a fresh Ubuntu server)

In production the website, the admin and the API run as **one Node.js process** (`server.js`), kept alive by PM2 behind nginx:

```
Visitor ──► nginx :443 ──► 127.0.0.1:3000  server.js
  asprglobaltech.com            ├─ Next.js website + admin (/admin)
  admin.asprglobaltech.com      └─ NestJS API on 127.0.0.1:4000 (private, reached via /api/*)
                                       └─► SQLite + uploads in ~/aspr-data (outside the app folder)
```

Run **one** instance only: SQLite and the in-memory rate limiter assume a single process.

You need: an Ubuntu 22.04/24.04 server with SSH and sudo, DNS A records for `asprglobaltech.com`, `www.asprglobaltech.com` and `admin.asprglobaltech.com` pointing at it, and the secrets listed in step 3.

---

## 1. Install system packages

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx git build-essential python3 sqlite3 certbot python3-certbot-nginx
sudo npm install -g pm2
node -v    # v22.x (matches .nvmrc)
```

`build-essential` and `python3` let `better-sqlite3` compile if no prebuilt binary matches.

## 2. Get the code and a data folder

```bash
git clone https://github.com/Divya170/aspr-global-tech.git ~/aspr-global-tech
cd ~/aspr-global-tech
git checkout main          # or the release branch you are deploying
mkdir -p ~/aspr-data/uploads ~/aspr-backups
```

The database and uploads live in `~/aspr-data`, outside the app folder, so `git pull` and rebuilds never touch them.

## 3. Configure the environment

```bash
cp .env.example .env
nano .env
```

Every key is documented in [.env.example](.env.example). The app **refuses to start** in production if any of these are wrong:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://asprglobaltech.com` |
| `DB_PATH` | `/home/<user>/aspr-data/app.sqlite` (absolute) |
| `UPLOAD_DIR` | `/home/<user>/aspr-data/uploads` (absolute) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first super admin; 12+ characters, not the example |
| `SMTP_USER`, `SMTP_PASS` | required whenever `SMTP_HOST` is set |

Recommended: `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `MAIL_FROM` / `LEADS_NOTIFY_TO` (without SMTP, leads are saved but no email is sent). Optional: `GEMINI_API_KEY` (chat assistant), `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (analytics). There is no session secret to set: admin sessions are random tokens stored hashed.

```bash
chmod 600 .env
```

## 4. Install and build

```bash
npm ci                     # installs root, backend/ and frontend/ from the lockfiles
npm run build              # builds the API and the website (NEXT_PUBLIC_* values are fixed now)
```

## 5. Start it (this also migrates the database)

```bash
pm2 start ecosystem.config.js
pm2 logs aspr-global-tech --lines 50    # expect "ASPR API listening" and "ASPR website listening"
pm2 save
pm2 startup                              # run the command it prints, so the app comes back after a reboot
```

On first start the API creates the database at `DB_PATH`, seeds the site content and applies every migration (002–006). Later starts apply only new migrations, each in a transaction. It also creates the first super admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## 6. First admin (if you need another one, or are locked out)

```bash
cd ~/aspr-global-tech
npm --prefix backend run admin:create -- you@example.com "Your Name"
```

This creates a super admin, or resets and unlocks an existing account, and prints a temporary password. Run it with the same `.env` in place.

## 7. nginx

```bash
sudo cp deploy/aspr-proxy.conf /etc/nginx/snippets/aspr-proxy.conf
sudo cp deploy/nginx.conf /etc/nginx/sites-available/aspr
sudo ln -s /etc/nginx/sites-available/aspr /etc/nginx/sites-enabled/aspr
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

The config serves the website on `asprglobaltech.com` (with `www` redirected), the admin on `admin.asprglobaltech.com`, gzip (brotli if you install the module), one-year caching for `/_next/static` and one-week caching for `/assets`. `portal.` has a commented placeholder for later. Security headers come from the app itself.

## 8. HTTPS

```bash
sudo certbot --nginx -d asprglobaltech.com -d www.asprglobaltech.com -d admin.asprglobaltech.com --redirect
sudo certbot renew --dry-run
```

HTTPS is required: in production the admin cookie is `__Host-…; Secure`, so the admin only works over HTTPS.

## 9. Smoke test

```bash
curl -s https://asprglobaltech.com/api/health          # {"ok":true,…}
curl -sI https://asprglobaltech.com | grep -i -E "strict-transport|content-security"
curl -s https://asprglobaltech.com/sitemap.xml | head
```

Then in a browser:
- open the home page, a service page and `/portfolio`
- send a test request from `/quote`
- sign in at `https://admin.asprglobaltech.com` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- check the lead is under **Leads** and that **Settings → Email delivery** shows the two emails as "sent"
- change the admin password under **Account**, and add your team under **Team**

## 10. Backups

The whole state is `~/aspr-data` (the SQLite file and uploads). Make a consistent copy while the app is running:

```bash
sqlite3 ~/aspr-data/app.sqlite ".backup '$HOME/aspr-backups/app-$(date +%F).sqlite'" \
  && tar -czf ~/aspr-backups/uploads-$(date +%F).tgz -C ~/aspr-data uploads
```

Daily at 03:15, keeping 14 days (`crontab -e`):

```
15 3 * * * sqlite3 $HOME/aspr-data/app.sqlite ".backup '$HOME/aspr-backups/app-$(date +\%F).sqlite'" && tar -czf $HOME/aspr-backups/uploads-$(date +\%F).tgz -C $HOME/aspr-data uploads && find $HOME/aspr-backups -mtime +14 -delete
```

Copy `~/aspr-backups` off the server too (e.g. `rsync` to another machine, or the host's snapshot feature). To restore, stop the app (`pm2 stop aspr-global-tech`), copy the backup over `DB_PATH`, and start it again.

---

## Updating

```bash
cd ~/aspr-global-tech
sqlite3 ~/aspr-data/app.sqlite ".backup '$HOME/aspr-backups/pre-update-$(date +%F-%H%M).sqlite'"
git pull && npm ci && npm run build && pm2 restart aspr-global-tech
```

Pending migrations run on restart; existing leads, applications, subscribers and content are kept.

## Before go-live checklist

- [ ] DNS for the apex, `www` and `admin` points at the server; certbot issued all three
- [ ] `.env` filled in, `chmod 600`, not committed; the first admin password changed after first sign-in
- [ ] SMTP set, and a test quote produced both emails (Settings → Email delivery shows "sent")
- [ ] `/api/health` ok; a test request from `/quote` shows up under Leads
- [ ] Stats (300+ / 150+) and their wording confirmed in Settings; testimonials only with client approval
- [ ] Privacy Policy and Terms reviewed (Content → Pages)
- [ ] Daily backup cron in place, and the backups copied off the server

## Notes

- If you change `API_PORT` or any `NEXT_PUBLIC_*` value, rebuild: they are fixed at build time.
- Moving an existing database to the server: stop the app, copy `app.sqlite` to `DB_PATH`, start it.
- Hostinger's managed "Node.js Web App" (hPanel) can also run this: framework "Other", entry `server.js`, install `npm ci`, build `npm run build`, start `npm start`, the same env keys (don't set `PORT` there), and `DB_PATH` / `UPLOAD_DIR` under your home directory.
