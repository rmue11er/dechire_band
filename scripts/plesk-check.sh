#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# DECHIRE Band HQ – Plesk doctor (read-only)
#
# Run it on the server, as root, with the folder that Plesk uses as Document
# Root (the folder with package.json / server.js):
#
#   bash scripts/plesk-check.sh /var/www/vhosts/example.com/dechire.example.com/www
#
# It changes nothing – it only prints what a 403 / 502 needs to be diagnosed.
# ---------------------------------------------------------------------------
set -u

WEB="${1:-$(pwd)}"
SITE_PARENT="$(dirname "$WEB")"
DOMAIN="$(basename "$SITE_PARENT")"
PORT_CHECK="${PORT:-3000}"

line() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✘\033[0m %s\n' "$1"; }

line "1. Paths"
echo "  Document Root (argument): $WEB"
echo "  Domain:                   $DOMAIN"
if [ ! -d "$WEB" ]; then
  bad "folder does not exist – the Document Root in Plesk points somewhere else"
  exit 1
fi
if [ -L "$WEB" ]; then
  warn "$WEB is a symlink → $(readlink -f "$WEB")"
fi
ok "folder exists"

line "2. Is the app actually here?"
missing=0
for file in package.json server.js next.config.ts next.config.js proxy.ts; do
  if [ -e "$WEB/$file" ]; then ok "$file"; else echo "     – $file (absent)"; fi
done
[ -e "$WEB/package.json" ] || { bad "package.json missing → wrong Document Root / Application Root"; missing=1; }
[ -e "$WEB/server.js" ] || { bad "server.js missing → wrong folder"; missing=1; }
if [ -e "$WEB/.next/BUILD_ID" ]; then
  ok ".next build present ($(cat "$WEB/.next/BUILD_ID" 2>/dev/null | head -c 12))"
else
  bad ".next is missing or incomplete → npm run build as the subscription user"
fi
[ -d "$WEB/node_modules" ] && ok "node_modules present" || bad "node_modules missing → npm ci"
if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg $(ffmpeg -version 2>/dev/null | head -n1 | awk '{print $3}') – Reel Lab renders"
else
  warn "ffmpeg missing → Reel Lab cannot render (apt install ffmpeg, or set FFMPEG_PATH)"
fi

line "3. Ownership (what the permissions trace looks like)"
namei -l "$WEB" 2>/dev/null || ls -ld "$WEB"
echo
ls -ld "$WEB" "$WEB/.next" "$WEB/data" 2>/dev/null

OWNER="$(ls -ld "$WEB" | awk '{print $3}')"
GROUP="$(ls -ld "$WEB" | awk '{print $4}')"
echo
if [ "$GROUP" = "psaserv" ] || [ "$GROUP" = "psacln" ]; then
  ok "group is $GROUP"
else
  warn "group is $GROUP – Plesk's web server usually needs psaserv on the document root"
fi
if id "$OWNER" >/dev/null 2>&1; then ok "owner $OWNER exists"; else bad "owner $OWNER is unknown"; fi

line "4. Can the web server read / traverse?"
if sudo -u nginx test -r "$WEB" 2>/dev/null || sudo -u apache test -r "$WEB" 2>/dev/null; then
  ok "nginx/apache can read the folder"
else
  warn "could not verify as nginx/apache – check 'namei -l' above for missing x bits (755)"
fi

line "5. data/ writable by the app user?"
if sudo -u "$OWNER" test -w "$WEB/data" 2>/dev/null; then
  ok "data/ is writable for $OWNER"
else
  bad "data/ not writable for $OWNER → chown -R $OWNER:psacln $WEB/data"
fi

line "6. Redirects / deny rules in the folder"
if [ -f "$WEB/.htaccess" ]; then
  warn ".htaccess exists – check for 'Require all denied' / 'AuthType Basic':"
  grep -nE 'Require|Deny|AuthType' "$WEB/.htaccess" 2>/dev/null | sed 's/^/     /'
else
  ok "no .htaccess"
fi

line "7. Logs (last lines)"
for log in \
  "/var/www/vhosts/system/$DOMAIN/logs/error_log" \
  "/var/www/vhosts/system/$DOMAIN/logs/proxy_error_log" \
  "/var/www/vhosts/$DOMAIN/logs/error_log"; do
  if [ -r "$log" ]; then
    echo "  --- $log"
    tail -n 12 "$log" | sed 's/^/     /'
  fi
done

line "8. Does the app answer directly? (bypasses nginx/Passenger)"
if command -v curl >/dev/null; then
  echo "  curl -sI http://127.0.0.1:$PORT_CHECK/site"
  curl -sI --max-time 4 "http://127.0.0.1:$PORT_CHECK/site" | head -3 | sed 's/^/     /' \
    || warn "nothing listening on 127.0.0.1:$PORT_CHECK (app not started by systemd/Passenger?)"
fi

line "9. What to look for"
cat <<'EOF'
  error_log says    → fix
  ─────────────────────────────────────────────────────────────────────────────
  "directory index of … is forbidden"      the Node.js app is not handling this domain
                                           (Node.js extension not enabled for the
                                           subdomain, or Application Root wrong)
  "Permission denied"                      group/permissions → chgrp -R psaserv,
                                           chmod 755 on every folder in 'namei -l'
  "client denied by server configuration"  a deny rule: .htaccess, Plesk "password
                                           protected directories", or nginx directive
  "ModSecurity" / "Access denied"          Apache & nginx Settings → Web Application
                                           Firewall off, or whitelist the domain
  nothing in the logs at all               the request never reaches this vhost –
                                           DNS / another vhost / Plesk forwarding
EOF
