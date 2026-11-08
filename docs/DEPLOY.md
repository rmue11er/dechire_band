# Deploying DECHIRE Band HQ

Two things run from this one repo:

- the **workspace** (`/`, `/planner`, `/settings`, …) — needs to stay private,
- the **public one-pager** (`/site`) — should be reachable by everyone.

Both are the same Next.js process. The guide below is written for **IONOS with Plesk**, but the second option
works on any Linux box.

---

## 1. What the app needs

| | |
| --- | --- |
| **Node.js 24+** | `node:sqlite` is used without a flag. On Node 22 it works with `NODE_OPTIONS=--experimental-sqlite`. |
| **One writable folder** | `data/` — SQLite database, WAL files, `uploads/`. This folder *is* the app's state. |
| **No database server** | no MySQL/Postgres, no Docker, no Redis, no external services. |
| **RAM** | ~150 MB at runtime; the `next build` step wants a bit more — on a 1 GB VPS add swap. |
| **Port** | the app listens on `PORT` (default `3000`); Plesk or nginx puts HTTPS in front. |

Check the Node version before anything else:

```bash
node -v   # must be v24.x or newer (or v22 with the flag above)
```

Plesk ships its own Node builds under `/opt/plesk/node/<major>/bin/node`. If 24 is missing, update the
extension: `plesk ext nodejs --update`, then pick the version in **Websites & Domains → domain → Node.js**.

---

## 2. Put the files on the server

```bash
# Plesk installs Node outside the normal PATH – the build needs it
# (npm spawns `next`, whose shebang is `#!/usr/bin/env node`).
export PATH=/opt/plesk/node/24/bin:$PATH
node -v            # v24.x

# adjust domain + path to your subscription
cd /var/www/vhosts/example.com
git clone https://github.com/rmue11er/dechire_band.git bandhq
cd bandhq

mkdir -p data/uploads
npm ci
npm run build
```

`npm ci && npm run build` needs SSH access. Plesk has the button **Websites & Domains → Web Hosting Access**
to enable it (or use the Plesk **Git** extension to clone).

> **If you build as `root`,** the app later runs as the subscription user and cannot write `data/`
> (`SQLITE_CANTOPEN`). Fix ownership before starting the app:
>
> ```bash
> chown -R "$(stat -c '%U' /var/www/vhosts/example.com)":psacln /var/www/vhosts/example.com/bandhq
> ```

> Build on the server, not on your laptop: `.next` is tied to the Node major and the OpenSSL build of the
> machine. Deploy the source and build there.

---

## 3. Option A — Plesk's Node.js extension (a few clicks)

Plesk → **Websites & Domains → your domain → Node.js**:

| Field | Value |
| --- | --- |
| **Node.js** | enable it |
| **Node.js version** | `24.x` |
| **Document Root** | `/bandhq` |
| **Application Root** | `/bandhq` |
| **Application Mode** | `production` |
| **Application Startup File** | `server.js` |
| **Custom environment variables** | `NODE_ENV=production`, `HQ_USER=dechire`, `HQ_PASSWORD=<long random>` |

`server.js` is in the repo for exactly this case: Passenger needs a startable module, not a CLI.

If your Plesk only accepts a Document Root inside `httpdocs`, put the project there
(`httpdocs/bandhq`) and use `httpdocs/bandhq` for both fields — Next serves every request itself, so no file is
ever read from the document root.

Then, in the same panel:

- **NPM Install** (if you did not run `npm ci` over SSH)
- **Run Script** → `build` if your Plesk version offers it, otherwise `npm run build` over SSH
- **Restart App** — after every build

Your domain now serves the app over HTTPS (Plesk terminates TLS and proxies to Passenger).

---

## 4. Option B — systemd + nginx reverse proxy (more control)

Best when you want log files, a fixed Node binary, and no Passenger surprises.

`/etc/systemd/system/dechire.service`:

```ini
[Unit]
Description=DECHIRE Band HQ
After=network.target

[Service]
Type=simple
# the subscription user from Plesk (Websites & Domains → Web Hosting Access)
User=example_user
WorkingDirectory=/var/www/vhosts/example.com/bandhq
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=HQ_USER=dechire
Environment=HQ_PASSWORD=change-me-to-something-long
# path from `which node`, often /opt/plesk/node/24/bin/node
ExecStart=/opt/plesk/node/24/bin/node server.js
Restart=always
RestartSec=3
StandardOutput=append:/var/www/vhosts/example.com/bandhq/data/app.log
StandardError=append:/var/www/vhosts/example.com/bandhq/data/app.log

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now dechire
systemctl status dechire
journalctl -u dechire -n 50 --no-pager     # or tail data/app.log
```

In Plesk → **Apache & nginx Settings → Additional nginx directives**:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 120s;
}
```

Leave the app on `127.0.0.1` and keep ports 3000 closed in the firewall — only nginx should reach it.
Plesk's Let's Encrypt certificate keeps working, because TLS ends at nginx.

---

## 5. Protecting the workspace

**The app has no login of its own.** Anyone who reaches `/settings` can read the Instagram token, download
backups and delete posts. Never expose it unprotected.

The repo ships a small HTTP Basic Auth gate in `proxy.ts`. It switches on as soon as `HQ_PASSWORD` is set:

```bash
HQ_USER=dechire
HQ_PASSWORD=<long random string>
```

What stays public: `/site`, `/_next` (JS/CSS), `/api/files/*` (the images Instagram has to fetch) and
`/icon.svg`. Everything else asks for user + password.

Two ways to provide the values — pick one:

1. **Plesk Node.js panel → Custom environment variables** (or the systemd unit). Needs **Restart App**
   afterwards, no rebuild.
2. **A `.env` file** next to `package.json` (Next loads it on start, `.env` is git-ignored):

   ```bash
   cd /var/www/vhosts/example.com/bandhq
   printf 'HQ_USER=dechire\nHQ_PASSWORD=%s\n' "$(openssl rand -base64 24)" > .env
   chmod 600 .env
   ```

Verify it — the app prints the state on start, and the root URL answers `401`:

```bash
curl -sI https://example.com/ | head -1          # HTTP/2 401
curl -sI https://example.com/site | head -1      # HTTP/2 200
# in the Plesk app log / journalctl:
# DECHIRE Band HQ ready on … (production, auth on)
```

If the root URL still returns `200` and the log says `auth off`, the variable did not reach the process —
set it again, restart, and check the log line.

Want more? Add an IP allow-list for the workspace in the same nginx block:

```nginx
# allow your home/office, block the rest of the world for the internal pages
location ~ ^/(?!site) {
    allow 203.0.113.7;
    deny all;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Also worth it: keep the GitHub repository private, and rotate the Instagram token if it ever leaked.

---

## 6. Permissions and data

```bash
cd /var/www/vhosts/example.com/bandhq
mkdir -p data/uploads
chown -R example_user:psacln data      # the user Plesk runs the app as
chmod -R u+rwX data
```

- `data/band.db` + `data/band.db-wal` are the database, `data/uploads/` the files. Move them together.
- **Never delete or replace `data/` when deploying.** It is not in git and it is not in the build.
- Backups: the button in **Settings → Backup** (ZIP with a consistent database copy + uploads), or from cron:

```bash
tar czf /var/backups/dechire-$(date +%F).tgz -C /var/www/vhosts/example.com/bandhq data
```

---

## 7. Auto-publish without an open browser tab

The heartbeat only runs while someone has the workspace open. On a server, fire it from cron
(**Tools & Settings → Scheduled Tasks**, every 5 minutes):

```bash
curl -fsS -u dechire:<HQ_PASSWORD> -X POST https://example.com/api/scheduler
```

Two requirements, otherwise it is a no-op and logs why:

1. Instagram is **live** (account id + token, sandbox off) and auto-publish is enabled in Settings.
2. `publicBase` in Settings points at the real domain — Instagram **downloads** the image from
   `https://example.com/api/files/...`, so localhost or a private IP cannot work.

Stories are never published by the API; they stay a ZIP export.

---

## 8. Updating

```bash
cd /var/www/vhosts/example.com/bandhq
git pull
npm ci
npm run build
```

Then restart: **Restart App** in the Plesk Node.js panel, or `systemctl restart dechire`.
Schema changes run themselves on start (`ensureColumn` in `lib/db.ts`); `data/` stays untouched.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `env: 'node': No such file or directory` on `npm run build` | `/opt/plesk/node/<major>/bin` is not in `PATH` → `export PATH=/opt/plesk/node/24/bin:$PATH` |
| `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite` | Node too old → 24.x, or `NODE_OPTIONS=--experimental-sqlite` on 22 |
| 502 / “Web application could not be started” (Passenger) | no `.next` (build missing), wrong Application Root, or startup file ≠ `server.js`; check the app log |
| `SQLITE_CANTOPEN` or `EACCES: permission denied, open '.../data/band.db'` | `data/` not writable by the service user → `chown -R` |
| Basic Auth prompt on `/site` | the matcher in `proxy.ts` must keep excluding `site`, `_next`, `api/files` |
| **no** password prompt at all | `HQ_PASSWORD` is not set (or not passed by Plesk) → the gate is opt-in; log line must say `auth on` |
| Pages look unstyled after an update | stale build → `npm run build` again and restart |
| Build dies with `Killed` | RAM → add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| Instagram upload: “media could not be fetched” | `publicBase` wrong, or `/api/files` is blocked by Basic Auth/firewall |
| Reload loop while developing on the server | `npm run dev` only — Turbopack watches the WAL files in `data/`. Use the built app in production |

---

## 10. Done checklist

- [ ] `https://example.com/site` renders the one-pager without a password prompt
- [ ] `https://example.com/` asks for user + password, and accepts them
- [ ] `curl -fsS -u user:pass -X POST https://example.com/api/scheduler` returns JSON
- [ ] Uploading a photo in **Media** works (write permission on `data/uploads`)
- [ ] **Settings → Backup** downloads a ZIP that contains `band.db` and `uploads/`
- [ ] Cron entry exists for the scheduler (if you publish automatically)
- [ ] `data/` is excluded from every deploy step, and a backup runs somewhere else
