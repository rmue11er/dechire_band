import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getTikTokConnection, saveTikTokConnection } from '@/lib/repo';
import { exchangeTikTokCode, testTikTokConnection, tiktokRedirectUri } from '@/lib/tiktok';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATE_COOKIE = 'tt_oauth_state';

function back(request: Request, params: Record<string, string>) {
  const url = new URL('/admin/settings', request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  if (error) {
    return back(request, { tiktok: 'error', reason: errorDescription || error });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code) return back(request, { tiktok: 'error', reason: 'Missing authorization code' });

  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  if (!expected || state !== expected) {
    return back(request, { tiktok: 'error', reason: 'State mismatch – please try connecting again' });
  }

  const connection = getTikTokConnection();
  const redirectUri = tiktokRedirectUri(connection, request.url);
  const exchanged = await exchangeTikTokCode(connection, code, redirectUri);
  if (!exchanged.ok || !exchanged.data) {
    return back(request, { tiktok: 'error', reason: exchanged.error || 'Token exchange failed' });
  }

  const data = exchanged.data;
  let saved = saveTikTokConnection({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    openId: data.open_id,
    scope: data.scope,
    accessExpiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + data.refresh_expires_in * 1000).toISOString(),
    sandbox: false,
  });

  // Profile data is cosmetic but makes the settings panel much friendlier.
  const profile = await testTikTokConnection(saved);
  if (profile.ok && profile.data) {
    saved = saveTikTokConnection({
      username: profile.data.username || saved.username,
      displayName: profile.data.displayName || saved.displayName,
      avatarUrl: profile.data.avatarUrl || saved.avatarUrl,
      openId: profile.data.openId || saved.openId,
    });
  }

  return back(request, { tiktok: 'connected', user: saved.username || saved.displayName || '' });
}