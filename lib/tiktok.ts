import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from './db';
import type { TikTokConnection } from './types';

/**
 * TikTok Content Posting API (Direct Post) for single videos.
 *
 * Setup (TikTok for Developers):
 *  - app with `video.publish` + `user.info.basic`
 *  - redirect URI `<HQ>/api/tiktok/callback`
 *  - client key/secret either here in Settings or via
 *    `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`
 *
 * Important: until the app has passed TikTok's audit, posts created through
 * the API are limited to `SELF_ONLY`. The setting is exposed in the UI.
 * Without credentials everything runs in sandbox mode (simulated success).
 */

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const API = 'https://open.tiktokapis.com/v2';
const SCOPES = 'user.info.basic,video.publish';

export type TikTokResult<T> = { ok: boolean; data?: T; error?: string; sandbox: boolean };

export type TikTokPublishInput = {
  /** Filename inside data/uploads. */
  filename: string;
  caption: string;
  /** Seconds into the video used as cover. */
  coverAt?: number;
};

export type TikTokPublishResult = {
  publishId: string;
  status: string;
  permalink: string | null;
  sandbox: boolean;
};

export const tiktokCredentials = (conn: TikTokConnection) => ({
  clientKey: conn.clientKey || process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: conn.clientSecret || process.env.TIKTOK_CLIENT_SECRET || '',
});

export const tiktokConfigured = (conn: TikTokConnection) => {
  const { clientKey, clientSecret } = tiktokCredentials(conn);
  return Boolean(clientKey && clientSecret);
};

export const tiktokLive = (conn: TikTokConnection) =>
  !conn.sandbox && tiktokConfigured(conn) && Boolean(conn.accessToken);

export const tiktokRedirectUri = (conn: TikTokConnection, requestUrl: string) =>
  conn.redirectUri.trim() || `${new URL(requestUrl).origin}/api/tiktok/callback`;

export function tiktokAuthorizeUrl(conn: TikTokConnection, redirectUri: string, state: string) {
  const { clientKey } = tiktokCredentials(conn);
  if (!clientKey) return null;
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_key', clientKey);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

const form = (values: Record<string, string>) => new URLSearchParams(values);

type TokenPayload = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(values: Record<string, string>): Promise<TokenPayload> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: form(values),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error_description || payload?.error || `TikTok token error (${response.status})`);
  }
  return payload as TokenPayload;
}

export async function exchangeTikTokCode(
  conn: TikTokConnection,
  code: string,
  redirectUri: string
): Promise<TikTokResult<TokenPayload>> {
  const { clientKey, clientSecret } = tiktokCredentials(conn);
  if (!clientKey || !clientSecret) {
    return { ok: false, sandbox: false, error: 'TikTok client key/secret are not set' };
  }
  try {
    const payload = await tokenRequest({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    return { ok: true, sandbox: false, data: payload };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'TikTok login failed' };
  }
}

export async function refreshTikTokToken(conn: TikTokConnection): Promise<TikTokResult<TokenPayload>> {
  const { clientKey, clientSecret } = tiktokCredentials(conn);
  if (!clientKey || !clientSecret || !conn.refreshToken) {
    return { ok: false, sandbox: false, error: 'No TikTok refresh token available' };
  }
  try {
    const payload = await tokenRequest({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: conn.refreshToken,
    });
    return { ok: true, sandbox: false, data: payload };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'TikTok token refresh failed' };
  }
}

async function apiRequest<T>(
  conn: TikTokConnection,
  endpoint: string,
  body: Record<string, any>
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const response = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${conn.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload: any = await response.json().catch(() => ({}));
  const code = String(payload?.error?.code ?? '');
  if (!response.ok || (code && code !== 'ok')) {
    return {
      ok: false,
      error: payload?.error?.message || payload?.error?.log_id || `TikTok API error (${response.status})`,
    };
  }
  return { ok: true, data: payload?.data ?? payload };
}

export async function testTikTokConnection(
  conn: TikTokConnection
): Promise<TikTokResult<{ username: string; displayName: string; avatarUrl: string; openId: string }>> {
  if (!tiktokLive(conn)) {
    return {
      ok: true,
      sandbox: true,
      data: {
        username: conn.username || 'dechire.band',
        displayName: conn.displayName || 'déchire',
        avatarUrl: conn.avatarUrl,
        openId: conn.openId || 'sandbox',
      },
    };
  }
  try {
    const response = await fetch(
      `${API}/user/info/?fields=open_id,union_id,avatar_url,display_name,username`,
      { headers: { Authorization: `Bearer ${conn.accessToken}` }, cache: 'no-store' }
    );
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok || payload?.error?.code !== 'ok') {
      throw new Error(payload?.error?.message ?? `TikTok user error (${response.status})`);
    }
    const user = payload?.data?.user ?? {};
    return {
      ok: true,
      sandbox: false,
      data: {
        username: user.username ?? conn.username,
        displayName: user.display_name ?? conn.displayName,
        avatarUrl: user.avatar_url ?? conn.avatarUrl,
        openId: user.open_id ?? conn.openId,
      },
    };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'Could not reach TikTok' };
  }
}

/** Reads the local file and uploads it in chunks allowed by TikTok. */
async function uploadVideo(conn: TikTokConnection, input: TikTokPublishInput, uploadUrl: string) {
  const filePath = path.join(UPLOAD_DIR, path.basename(input.filename));
  const size = fs.statSync(filePath).size;
  const buffer = fs.readFileSync(filePath);
  const MIN = 5 * 1024 * 1024;
  const MAX = 64 * 1024 * 1024;
  const chunkSize = size < MIN ? size : Math.min(MAX, 32 * 1024 * 1024);
  const total = Math.max(1, Math.ceil(size / chunkSize));

  for (let index = 0; index < total; index++) {
    const start = index * chunkSize;
    const end = Math.min(size, start + chunkSize) - 1;
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
      body: buffer.subarray(start, end + 1),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`TikTok upload failed (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`);
    }
  }
}

export async function fetchTikTokStatus(
  conn: TikTokConnection,
  publishId: string
): Promise<TikTokResult<{ status: string; failReason?: string; postIds: number[] }>> {
  if (!tiktokLive(conn)) {
    return { ok: true, sandbox: true, data: { status: 'PUBLISH_COMPLETE', postIds: [] } };
  }
  try {
    const result = await apiRequest<any>(conn, '/post/publish/status/fetch/', { publish_id: publishId });
    if (!result.ok || !result.data) return { ok: false, sandbox: false, error: result.error };
    const ids = Array.isArray(result.data.publicaly_available_post_id)
      ? result.data.publicaly_available_post_id.map(Number).filter(Boolean)
      : [];
    return {
      ok: true,
      sandbox: false,
      data: {
        status: String(result.data.status ?? 'PROCESSING'),
        failReason: result.data.fail_reason,
        postIds: ids,
      },
    };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'Could not load TikTok status' };
  }
}

export async function publishTikTok(
  conn: TikTokConnection,
  input: TikTokPublishInput
): Promise<TikTokResult<TikTokPublishResult>> {
  if (!input.caption.trim()) {
    return { ok: false, sandbox: !tiktokLive(conn), error: 'TikTok needs a caption' };
  }
  if (!tiktokLive(conn)) {
    const publishId = `sandbox_${Date.now().toString(36)}`;
    return {
      ok: true,
      sandbox: true,
      data: { publishId, status: 'PUBLISH_COMPLETE', permalink: null, sandbox: true },
    };
  }

  const filePath = path.join(UPLOAD_DIR, path.basename(input.filename));
  if (!fs.existsSync(filePath)) {
    return { ok: false, sandbox: false, error: 'The video file is missing on disk' };
  }
  const size = fs.statSync(filePath).size;
  if (!size) return { ok: false, sandbox: false, error: 'The video file is empty' };

  const MIN = 5 * 1024 * 1024;
  const MAX = 64 * 1024 * 1024;
  const chunkSize = size < MIN ? size : Math.min(MAX, 32 * 1024 * 1024);
  const total = Math.max(1, Math.ceil(size / chunkSize));
  const coverMs = Math.max(0, Math.round((input.coverAt ?? 0.5) * 1000));

  try {
    const init = await apiRequest<any>(conn, '/post/publish/video/init/', {
      post_info: {
        title: input.caption.slice(0, 2200),
        privacy_level: conn.privacyLevel,
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
        video_cover_timestamp_ms: Math.min(coverMs, 60_000),
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: chunkSize,
        total_chunk_count: total,
      },
    });
    if (!init.ok || !init.data?.publish_id || !init.data?.upload_url) {
      return { ok: false, sandbox: false, error: init.error ?? 'TikTok did not return an upload URL' };
    }

    const publishId = String(init.data.publish_id);
    await uploadVideo(conn, input, String(init.data.upload_url));

    let status = 'PROCESSING_UPLOAD';
    let permalink: string | null = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const check = await fetchTikTokStatus(conn, publishId);
      if (!check.ok || !check.data) break;
      status = check.data.status;
      if (status === 'FAILED') {
        return { ok: false, sandbox: false, error: check.data.failReason || 'TikTok rejected the video' };
      }
      if (status === 'PUBLISH_COMPLETE') {
        if (check.data.postIds.length && conn.username) {
          permalink = `https://www.tiktok.com/@${conn.username}/video/${check.data.postIds[0]}`;
        }
        break;
      }
    }

    return { ok: true, sandbox: false, data: { publishId, status, permalink, sandbox: false } };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'TikTok upload failed' };
  }
}