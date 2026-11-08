import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, authEnabled, verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Tells the sidebar whether a login is required at all – and whether it happened. */
export async function GET() {
  const required = authEnabled();
  if (!required) return NextResponse.json({ required: false, signedIn: true });

  const store = await cookies();
  const signedIn = await verifySession(store.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ required: true, signedIn });
}
