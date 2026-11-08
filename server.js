/**
 * Minimal Node server.
 *
 * `next start` is a CLI, but Plesk's Node.js extension (Phusion Passenger) and
 * systemd both want a startable module and a listening server. This file is that
 * entry point – see docs/DEPLOY.md.
 *
 *   node server.js            # production (needs a prior `npm run build`)
 *   PORT=8080 node server.js  # different port
 */
const { createServer } = require('node:http');
const next = require('next');

// The app resolves `data/` from the working directory – pin it to the app root.
process.chdir(__dirname);

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || '0.0.0.0';

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    // `next()` loads .env files, so the check has to happen after prepare().
    const auth = Boolean(process.env.HQ_PASSWORD);

    // The Basic Auth gate in proxy.ts is opt-in – say it out loud instead of
    // silently serving the workspace to whoever finds the domain.
    if (!dev && !auth) {
      console.warn(
        [
          '',
          '  ┌──────────────────────────────────────────────────────────────────┐',
          '  │  HQ_PASSWORD is NOT set – the workspace is open to everyone.     │',
          '  │  Set HQ_USER + HQ_PASSWORD in the Plesk Node.js panel (or the    │',
          '  │  systemd unit / a .env file) and restart the app to lock         │',
          '  │  /planner, /settings, /api/* …                                   │',
          '  └──────────────────────────────────────────────────────────────────┘',
          '',
        ].join('\n')
      );
    }

    createServer((request, response) => {
      handle(request, response).catch((error) => {
        console.error('[server] request failed:', error);
        if (!response.headersSent) response.statusCode = 500;
        response.end('Internal Server Error');
      });
    }).listen(port, hostname, () => {
      console.log(
        `DECHIRE Band HQ ready on http://${hostname}:${port} (${dev ? 'dev' : 'production'}, auth ${auth ? 'on' : 'off'})`
      );
    });
  })
  .catch((error) => {
    console.error('[server] could not start Next.js:', error);
    process.exit(1);
  });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`[server] ${signal} – bye`);
    process.exit(0);
  });
}
