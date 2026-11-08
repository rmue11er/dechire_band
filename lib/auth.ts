/**
 * Session handling for the workspace login.
 *
 * Stateless and runtime-agnostic: the cookie carries an expiry timestamp and an
 * HMAC of it, signed with `HQ_SESSION_SECRET` (or `HQ_PASSWORD` when that is not
 * set). No database table, no server memory, works in the proxy (edge) and in
 * route handlers (node) alike.
 *
 *   HQ_USER=dechire
 *   HQ_PASSWORD=<long, random>
 *   HQ_SESSION_SECRET=<optional, rotates the sessions when changed>
 */
export const SESSION_COOKIE = 'hq_session';

/** 30 days – this is a band workspace, not an online bank. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

export function authEnabled() {
  return Boolean(process.env.HQ_PASSWORD);
}

function secret() {
  const base = process.env.HQ_SESSION_SECRET || process.env.HQ_PASSWORD || '';
  return `dechire-hq-session::${base}`;
}

const base64url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64url(new Uint8Array(signature));
}

/** Length-safe comparison so timing does not leak the secret. */
export function sameSecret(given: string, expected: string) {
  const a = encoder.encode(given);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

export function checkPassword(given: string) {
  const expected = process.env.HQ_PASSWORD ?? '';
  if (!expected) return false;
  return sameSecret(given, expected);
}

export async function createSession() {
  const expiry = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = String(expiry);
  return `${payload}.${await sign(payload)}`;
}

export async function verifySession(token?: string | null) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;

  const expected = await sign(payload);
  return sameSecret(signature, expected);
}
