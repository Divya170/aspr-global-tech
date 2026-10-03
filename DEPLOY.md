# Deploying to Hostinger

In production the website and the API run as **one Node.js process** (`server.js`):

```
Visitor ──► Hostinger / nginx ──► server.js
                                   ├─ Next.js website   on PORT (public)
                                   └─ NestJS API        on 127.0.0.1:4000 (private, reached via /api/*)
                                         └─► SQLite + uploads in DB_PATH / UPLOAD_DIR (outside the app folder)
```

What the host has to run:

| Step | Command |
|---|---|
| Node.js version | 20 or 22 (`.nvmrc` says 22) |
| Install | `npm install`. This also installs `backend/` and `frontend/` through `postinstall`. |
| Build | `npm run build` |
| Start | `npm start`, which runs `node server.js` |

`database/app.sqlite` is no longer in git. On first start the API creates the database at `DB_PATH` and seeds it with the site content. Later deploys never touch it.

Hostinger offers two ways to run this, depending on the plan.

---

## Option A: Hostinger Node.js Web App (Business / Cloud hosting, hPanel)

1. **Push the code to GitHub**, or create a zip with `npm run package`. The zip is made from the last commit, so it leaves out `node_modules`, `.next`, `dist` and `.env`.
   Never upload your local `node_modules`. `better-sqlite3` is a native module and must be installed on the server.
2. In hPanel, go to **Websites → Add website → Node.js Apps**. Import the GitHub repo or upload the zip.
3. Build settings:
   - Framework: **Other / Custom** (not "Next.js": the app is started by `server.js`)
   - Node version: **22.x**
   - Root directory: `/` (the repo root)
   - Entry file: `server.js`
   - Install command: `npm install`
   - Build command: `npm run build`
   - Start command: `npm start`
4. **Environment variables**: add the keys from [.env.example](.env.example). The ones that must be set:
   - `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`. The app refuses to start with the defaults. Generate the secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   - `DB_PATH` and `UPLOAD_DIR`: absolute paths **outside** the app folder, e.g. `/home/u123456789/aspr-data/app.sqlite` and `/home/u123456789/aspr-data/uploads`. The home path is shown in hPanel → File Manager or over SSH (`echo $HOME`).
   - `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`
   - `TRUST_PROXY=true`
   - `GEMINI_API_KEY` (optional, enables the AI chat)

   Do **not** set `PORT`; Hostinger assigns it.
5. Deploy, then open `https://yourdomain.com/api/health`. It should return `{"ok":true,…}`.
6. Log in at `https://yourdomain.com/admin` with `ADMIN_PASSWORD`.

To update: push to GitHub (or upload a new zip) and redeploy. Your data in `DB_PATH` stays as it is.

---

## Option B: Hostinger VPS (Ubuntu)

```bash
# 1. Node 22, PM2, nginx, build tools (for better-sqlite3 if no prebuilt binary matches)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx build-essential python3
sudo npm install -g pm2

# 2. Code
git clone https://github.com/Divya170/aspr-global-tech.git ~/aspr-global-tech
cd ~/aspr-global-tech
mkdir -p ~/aspr-data
cp .env.example .env        # edit: secrets, DB_PATH=/home/<user>/aspr-data/app.sqlite, UPLOAD_DIR=…, site URL

# 3. Build and run
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save && pm2 startup     # run the command it prints, so the site restarts after a reboot

# 4. nginx + HTTPS
sudo cp deploy/nginx.conf /etc/nginx/sites-available/aspr   # edit server_name
sudo ln -s /etc/nginx/sites-available/aspr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

To update:

```bash
cd ~/aspr-global-tech && git pull && npm install && npm run build && pm2 restart aspr-global-tech
```

---

## Before go-live checklist

- [ ] `ADMIN_PASSWORD` is strong, and `ADMIN_TOKEN_SECRET` is a long random string
- [ ] `DB_PATH` / `UPLOAD_DIR` point outside the app folder
- [ ] `NEXT_PUBLIC_SITE_URL` is the real domain (it is fixed at build time, so rebuild after changing it)
- [ ] HTTPS is on (hPanel → SSL, or certbot on a VPS)
- [ ] `/api/health` returns ok, and a test brief from the contact page shows up in `/admin`
- [ ] Backups: copy the `aspr-data` folder regularly (Hostinger's daily backups cover the home directory)

## Notes

- Run **one** instance only. SQLite and the in-memory rate limiter assume a single process.
- If you change `API_PORT`, rebuild, because the `/api` proxy target is fixed at build time.
- Moving the existing local database to the server: upload `database/app.sqlite` to the path in `DB_PATH` **while the app is stopped**.
