import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { fail, ok, readJson, toInt } from '@/lib/api';
import {
  getMediaFileRow,
  getPost,
  getTikTokConnection,
  listPosts,
  saveTikTokConnection,
  updatePost,
} from '@/lib/repo';
import {
  fetchTikTokStatus,
  publishTikTok,
  refreshTikTokToken,
  testTikTokConnection,
  tiktokAuthorizeUrl,
  tiktokConfigured,
  tiktokLive,
  tiktokRedirectUri,
} from '@/lib/tiktok';
import type { TikTokConnection } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATE_COOKIE = 'tt_oauth_state';

function publicConnection(connection: TikTokConnection) {
  return {
    clientKey: connection.clientKey,
    hasClientSecret: Boolean(connection.clientSecret || process.env.TIKTOK_CLIENT_SECRET),
    redirectUri: connection.redirectUri,
    privacyLevel: connection.privacyLevel,
    sandbox: connection.sandbox,
    autoPublish: connection.autoPublish,
    username: connection.username,
    displayName: connection.displayName,
    avatarUrl: connection.avatarUrl,
    openId: connection.openId,
    scope: connection.scope,
    connected: Boolean(connection.accessToken),
    accessExpiresAt: connection.accessExpiresAt,
    refreshExpiresAt: connection.refreshExpiresAt,
    lastRunAt: connection.lastRunAt,
    configured: tiktokConfigured(connection),
    live: tiktokLive(connection),
  };
}

export async function GET(request: Request) {
  const connection = getTikTokConnection();
  return ok({
    connection: publicConnection(connection),
    redirectUriDefault: tiktokRedirectUri(connection, request.url),
  });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const action = String(body.action ?? '');
  const connection = getTikTokConnection();

  if (action === 'save') {
    const privacy = body.privacyLevel === 'PUBLIC_TO_EVERYONE' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY';
    const saved = saveTikTokConnection({
      clientKey: String(body.clientKey ?? '').trim(),
      clientSecret:
        typeof body.clientSecret === 'string' && body.clientSecret.trim()
          ? body.clientSecret.trim()
          : connection.clientSecret,
      redirectUri: String(body.redirectUri ?? '').trim(),
      privacyLevel: privacy,
      sandbox: body.sandbox === undefined ? connection.sandbox : Boolean(body.sandbox),
      autoPublish: body.autoPublish === undefined ? connection.autoPublish : Boolean(body.autoPublish),
    });
    return ok({ connection: publicConnection(saved) });
  }

  if (action === 'disconnect') {
    const saved = saveTikTokConnection({
      accessToken: '',
      refreshToken: '',
      openId: '',
      username: '',
      displayName: '',
      avatarUrl: '',
      scope: '',
      accessExpiresAt: null,
      refreshExpiresAt: null,
      autoPublish: false,
      sandbox: true,
    });
    return ok({ connection: publicConnection(saved) });
  }

  if (action === 'authorize-url') {
    if (!tiktokConfigured(connection)) {
      return fail('Set the TikTok client key and secret first', 400);
    }
    const state = randomBytes(16).toString('hex');
    const redirectUri = tiktokRedirectUri(connection, request.url);
    const url = tiktokAuthorizeUrl(connection, redirectUri, state);
    if (!url) return fail('Could not build the TikTok login URL', 400);
    const response = NextResponse.json({ ok: true, url, redirectUri, state });
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    });
    return response;
  }

  if (action === 'test') {
    if (!connection.accessToken && !connection.sandbox) {
      return fail('Connect your TikTok account first', 400);
    }
    const result = await testTikTokConnection(connection);
    if (!result.ok || !result.data) return fail(result.error ?? 'TikTok test failed', 400);
    const saved = saveTikTokConnection({
      username: result.data.username || connection.username,
      displayName: result.data.displayName || connection.displayName,
      avatarUrl: result.data.avatarUrl || connection.avatarUrl,
      openId: result.data.openId || connection.openId,
    });
    return ok({ result: result.data, sandbox: result.sandbox, connection: publicConnection(saved) });
  }

  if (action === 'refresh') {
    const result = await refreshTikTokToken(connection);
    if (!result.ok || !result.data) return fail(result.error ?? 'Token refresh failed', 400);
    const saved = saveTikTokConnection({
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token || connection.refreshToken,
      openId: result.data.open_id || connection.openId,
      scope: result.data.scope || connection.scope,
      accessExpiresAt: new Date(Date.now() + result.data.expires_in * 1000).toISOString(),
      refreshExpiresAt: new Date(Date.now() + result.data.refresh_expires_in * 1000).toISOString(),
    });
    return ok({ connection: publicConnection(saved) });
  }

  if (action === 'publish') {
    const postId = toInt(body.postId);
    const post = postId ? getPost(postId) : null;
    if (!post) return fail('Post not found', 404);
    if (post.media.length !== 1 || !post.media[0].mime.startsWith('video/')) {
      return fail('TikTok needs exactly one video in the post', 400);
    }
    const file = getMediaFileRow(post.media[0].id);
    if (!file) return fail('The video file is missing', 404);

    const result = await publishTikTok(connection, {
      filename: file.filename,
      caption: post.caption,
      coverAt: 0.5,
    });
    if (!result.ok || !result.data) return fail(result.error ?? 'TikTok publishing failed', 400);

    const stamp = new Date().toISOString();
    updatePost(post.id, {
      status: 'published',
      publishedAt: stamp,
      ttPublishId: result.data.publishId,
      ttStatus: result.data.status,
      ttPermalink: result.data.permalink,
      ttPublishedAt: stamp,
      ttError: null,
      ttLastAttempt: stamp,
    });
    return ok({ published: result.data, sandbox: result.sandbox, post: getPost(post.id) });
  }

  if (action === 'sync') {
    const postId = toInt(body.postId);
    const targets = postId
      ? [getPost(postId)].filter(Boolean)
      : listPosts().filter((post) => post.status === 'published' && post.ttPublishId);
    const results: any[] = [];
    for (const post of targets) {
      if (!post || !post.ttPublishId) continue;
      const status = await fetchTikTokStatus(connection, post.ttPublishId);
      if (!status.ok || !status.data) {
        results.push({ postId: post.id, error: status.error });
        continue;
      }
      const finished = status.data.status === 'PUBLISH_COMPLETE';
      const failed = status.data.status === 'FAILED';
      const permalink =
        finished && status.data.postIds.length && connection.username
          ? `https://www.tiktok.com/@${connection.username}/video/${status.data.postIds[0]}`
          : post.ttPermalink;
      updatePost(post.id, {
        ttStatus: status.data.status,
        ttPermalink: permalink,
        ttError: failed ? status.data.failReason ?? 'TikTok rejected the video' : null,
        status: failed ? 'scheduled' : post.status,
        ttPublishedAt: failed ? null : post.ttPublishedAt,
      });
      results.push({ postId: post.id, status: status.data.status, permalink, sandbox: status.sandbox });
    }
    if (!results.length) return fail('No TikTok post with a publish id yet', 400);
    return ok({ results });
  }

  return fail('Unknown action', 400);
}