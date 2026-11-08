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

### 2.1 “Build directory is not writeable” (EACCES on `.next`)

Almost always the same story: the last `npm run build` ran as **root** (SSH as root, or a script started by
root), so `.next/` belongs to root. The web app and the Plesk Node.js buttons run as the **subscription user**
and cannot write into it.

```bash
WEB=/var/www/vhosts/example.com/dechire.example.com/www   # your document root
OWNER=$(stat -c '%U' "$WEB")                              # e.g. example_user

# 1. who owns what?
ls -ld "$WEB" "$WEB/.next" 2>/dev/null
#    drwxr-xr-x 4 root root … .next      ← that's the problem

# 2. remove the root-owned build (safe, it is generated)
sudo rm -rf "$WEB/.next"

# 3. hand the whole app back to the subscription user
sudo chown -R "$OWNER":psacln "$WEB"
sudo find "$WEB" -type d -exec chmod 755 {} +
sudo find "$WEB" -type f -exec chmod 644 {} +

# 4. build as that user – never as root
sudo -u "$OWNER" -H bash -lc "
  export PATH=/opt/plesk/node/24/bin:\$PATH
  cd '$WEB' && npm ci && npm run build
"
```

Then **Restart App** in the Plesk Node.js panel.

#### If `npm ci` already fails with `EACCES … mkdir node_modules`

Then the directory above is the problem, not `.next`: the document root itself is not writable by the
subscription user (`www`, `httpdocs` or `public` are often created as `root:psaserv`).

```bash
WEB=/var/www/vhosts/example.com/dechire.example.com/www
OWNER=$(stat -c '%U' /var/www/vhosts/example.com)     # the subscription's system user
ls -ld "$WEB"                                          # drwxr-xr-x root psaserv …  ← the cause

sudo rm -rf "$WEB/node_modules" "$WEB/.next"           # remove leftovers from a root build
sudo chown -R "$OWNER":psacln "$WEB"
```

Then `npm ci && npm run build` as that user (see above). nginx/Apache keep serving the folder – they read as
root – so nothing breaks for the web server.

> If Plesk later resets the ownership (`plesk repair web -y` restores `root:psaserv` on document roots), move the
> app one level up instead – `/var/www/vhosts/example.com/dechire.example.com/app` – chown **that** to the
> subscription user and set it as **Application Root** *and* **Document Root** in the Node.js extension. The
> document root of the domain then stays untouched.

Rules of thumb:

- Every command that touches the app directory (`git pull`, `npm ci`, `npm run build`, backups) must run as the
  **subscription user** – `sudo -u <owner> -H bash -lc '…'`.
- `data/` and `data/uploads/` must stay writable by that user (`chown -R <owner>:psacln data`).
- Never `npm run dev` on the server (Turbopack watches the SQLite WAL and restarts in a loop).
- If you add files as root later, only the new files need `chown` – `.next` and `node_modules` can always be
  deleted and rebuilt.

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

**Paths are relative to the subscription root** – no `/var/www/vhosts`, no trailing slash:

| Folder on disk | Value in Plesk |
| --- | --- |
| `/var/www/vhosts/example.com/dechire.example.com/www` | `/dechire.example.com/www` |
| `/var/www/vhosts/example.com/httpdocs/bandhq` | `/httpdocs/bandhq` |

Both fields may point at the **same folder** (that is what `/bandhq` does above). If your Plesk refuses that and
insists on a subfolder of the application root, create an empty `public/` inside the project and use
`/dechire.example.com/www/public` as Document Root – Next answers every request itself, so nothing is ever read
from there. There is no `public/` in the repo on purpose.

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
- `data/fonts/` holds the self-hosted Google Fonts you added in the studio (plus a cached catalogue list).
  Adding a font needs outbound HTTPS to `fonts.google.com` **once per font**; after that the studio and the
  exports work without internet.
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
| **403 Forbidden** on every URL | usually not the app: Node.js is not enabled for the domain, the Document Root does not exist / is empty, or the web server cannot read the folder (group lost after `chown`). See §9.1 |
| 502 / “Web application could not be started” (Passenger) | no `.next` (build missing), wrong Application Root, or startup file ≠ `server.js`; check the app log |
| `SQLITE_CANTOPEN` or `EACCES: permission denied, open '.../data/band.db'` | `data/` not writable by the service user → `chown -R` |
| `EACCES: permission denied, open '.../.next/trace'` + `Build directory is not writeable` | `.next` was created by another user (usually `root` from an earlier SSH build) → delete it and rebuild as the subscription user, see §2.1 |
| `npm ci` → `EACCES … mkdir '…/node_modules'` | the document root itself is owned by `root:psaserv` → `chown -R <sub-user>:psacln` on the app directory (see §2.1) |
| `EACCES` on `package-lock.json` after switching Plesk users | same cause → `chown -R <sub-user>:psacln` on the app directory |
| Basic Auth prompt on `/site` | the matcher in `proxy.ts` must keep excluding `site`, `_next`, `api/files` |
| **no** password prompt at all | `HQ_PASSWORD` is not set (or not passed by Plesk) → the gate is opt-in; log line must say `auth on` |
| Pages look unstyled after an update | stale build → `npm run build` again and restart |
| Build dies with `Killed` | RAM → add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| Instagram upload: “media could not be fetched” | `publicBase` wrong, or `/api/files` is blocked by Basic Auth/firewall |
| Reload loop while developing on the server | `npm run dev` only — Turbopack watches the WAL files in `data/`. Use the built app in production |

### 9.1 403 Forbidden

A 403 comes from **nginx/Apache, not from the app** – our own gate would answer *401*. Work through this list:

```bash
WEB=/var/www/vhosts/example.com/dechire.example.com/www

# 1. Is Node.js running for this domain? Plesk → Node.js panel → status must be
#    "enabled / running". If it says "disabled", the domain is a plain static site
#    and nginx looks for an index.html in the Document Root → 403.

# 2. Can the web server read the folder? (this is the classic after a chown)
namei -l "$WEB"
#    every directory on the way needs x for others (755), files 644.
#    Plesk's Apache/nginx run as group `psaserv`, so:
sudo chown -R <sub-user>:psaserv "$WEB"
sudo find "$WEB" -type d -exec chmod 755 {} +
sudo find "$WEB" -type f -exec chmod 644 {} +
sudo chown -R <sub-user>:psacln "$WEB/data"        # keep the DB writable for the app

# 3. Does the Document Root exist and match the panel?
#    /dechire.example.com/www  →  /var/www/vhosts/example.com/dechire.example.com/www
ls -la "$WEB" | head

# 4. Does the app answer at all? (bypasses the proxy)
sudo -u <sub-user> -H bash -lc 'cd "$WEB" && PORT=3999 node server.js' &
curl -sI http://127.0.0.1:3999/site | head -1     # 200 = app fine, 403 = proxy/permissions
kill %1
```

Logs to read, in this order: `~/logs/` in Plesk → `*_error_log` (nginx/Apache),
`/var/www/vhosts/example.com/logs/*/error_log` (Passenger/app).

Most common causes, in the order they actually happen:

1. `chown -R user:psacln` was used for the whole app → the web server is no longer in the folder's group →
   `chgrp -R psaserv <app>` (keep the **owner** as the subscription user, only the group changes; `data/` stays
   `psacln` so the app can write).
2. Node.js extension not enabled for the *subdomain* (only for the main domain).
3. Document Root points at `/…/www/public` but that folder was never created.
4. Application Root ≠ folder with `package.json` / `server.js`.

---

## 10. Done checklist

- [ ] `https://example.com/site` renders the one-pager without a password prompt
- [ ] `https://example.com/` asks for user + password, and accepts them
- [ ] `curl -fsS -u user:pass -X POST https://example.com/api/scheduler` returns JSON
- [ ] Uploading a photo in **Media** works (write permission on `data/uploads`)
- [ ] **Settings → Backup** downloads a ZIP that contains `band.db` and `uploads/`
- [ ] Cron entry exists for the scheduler (if you publish automatically)
- [ ] `data/` is excluded from every deploy step, and a backup runs somewhere else
