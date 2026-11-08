import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Clears the session cookie – used by the sidebar button and by `/login?logout`. */
export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const url = new URL('/login', request.url);
  const response = NextResponse.redirect(url);
  response.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 });
  return response;
}
