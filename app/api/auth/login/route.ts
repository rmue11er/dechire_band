import { NextResponse } from 'next/server';
import { authEnabled, checkPassword, createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Very small in-memory brake: 8 wrong tries per address per 5 minutes.
 * One server process, so a Map is enough – nobody is running a botnet here.
 */
const attempts = new Map<string, { count: number; until: number }>();
const LIMIT = 8;
const WINDOW = 5 * 60 * 1000;

function clientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}

export async function POST(request: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: true, open: true });
  }

  const key = clientKey(request);
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && entry.until > now && entry.count >= LIMIT) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    password = '';
  }

  if (!checkPassword(password)) {
    const next = entry && entry.until > now ? { count: entry.count + 1, until: entry.until } : { count: 1, until: now + WINDOW };
    attempts.set(key, next);
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }

  attempts.delete(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSession(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
