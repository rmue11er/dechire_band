import { isLive, publish } from './instagram';
import {
  dueScheduledPosts,
  getConnection,
  getMediaFileRow,
  getTikTokConnection,
  listSchedulerLog,
  logSchedulerRun,
  nextScheduledPost,
  saveConnection,
  saveTikTokConnection,
  updatePost,
} from './repo';
import { publishTikTok, refreshTikTokToken, tiktokConfigured, tiktokLive } from './tiktok';
import type { Post, PostPlatform, TikTokConnection } from './types';

export type SchedulerSummary = {
  skipped?: string;
  attempted: number;
  published: number;
  failed: number;
  results: {
    postId: number;
    platform: PostPlatform;
    ok: boolean;
    message?: string;
    permalink?: string | null;
  }[];
};

/** Cheap throttle so several open tabs cannot hammer the APIs. */
const THROTTLE_MS = 20_000;
let lastRun = 0;
let running = false;

const platformOf = (post: Post): PostPlatform => (post.platform === 'tiktok' ? 'tiktok' : 'instagram');

export function schedulerStatus() {
  const connection = getConnection();
  const tiktok = getTikTokConnection();
  const due = dueScheduledPosts();
  const next = nextScheduledPost();
  const igDue = due.filter((post) => platformOf(post) === 'instagram').length;
  const ttDue = due.filter((post) => platformOf(post) === 'tiktok').length;

  return {
    /** Legacy fields: true when either platform auto-publishes. */
    enabled: connection.autoPublish || tiktok.autoPublish,
    live: isLive(connection) || tiktokLive(tiktok),
    sandbox: connection.sandbox || tiktok.sandbox,
    lastRunAt:
      [connection.lastRunAt, tiktok.lastRunAt]
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    dueNow: due.length,
    due: due.map((post) => ({
      id: post.id,
      at: post.scheduledAt,
      platform: platformOf(post),
      caption: post.caption.split('\n')[0].slice(0, 70),
    })),
    next: next
      ? {
          id: next.id,
          at: next.scheduledAt,
          platform: platformOf(next),
          caption: next.caption.split('\n')[0].slice(0, 70),
        }
      : null,
    log: listSchedulerLog(),
    instagram: {
      enabled: connection.autoPublish,
      live: isLive(connection),
      sandbox: connection.sandbox,
      username: connection.username,
      dueNow: igDue,
    },
    tiktok: {
      enabled: tiktok.autoPublish,
      live: tiktokLive(tiktok),
      sandbox: tiktok.sandbox,
      configured: tiktokConfigured(tiktok),
      username: tiktok.username || tiktok.displayName,
      dueNow: ttDue,
    },
  };
}

/** Refresh the short-lived token shortly before publishing. */
async function freshTikTok(tiktok: TikTokConnection): Promise<TikTokConnection> {
  if (!tiktokLive(tiktok) || !tiktok.accessExpiresAt) return tiktok;
  const expires = new Date(tiktok.accessExpiresAt).getTime();
  if (!Number.isFinite(expires) || expires > Date.now() + 2 * 60 * 1000) return tiktok;
  const refreshed = await refreshTikTokToken(tiktok);
  if (!refreshed.ok || !refreshed.data) return tiktok;
  return saveTikTokConnection({
    accessToken: refreshed.data.access_token,
    refreshToken: refreshed.data.refresh_token || tiktok.refreshToken,
    accessExpiresAt: new Date(Date.now() + refreshed.data.expires_in * 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + refreshed.data.refresh_expires_in * 1000).toISOString(),
    scope: refreshed.data.scope || tiktok.scope,
  });
}

/**
 * Publishes every scheduled post that is due. Runs when the app is open (heartbeat)
 * or when an external cron calls `/api/scheduler`. Each post is routed by platform.
 */
export async function runScheduler(
  options: { force?: boolean; platform?: PostPlatform } = {}
): Promise<SchedulerSummary> {
  const connection = getConnection();
  let tiktok = getTikTokConnection();
  const empty: SchedulerSummary = { attempted: 0, published: 0, failed: 0, results: [] };
  const scope = options.platform;

  if (!options.force) {
    if (scope === 'instagram' && !connection.autoPublish) {
      return { ...empty, skipped: 'Instagram auto-publish is switched off' };
    }
    if (scope === 'tiktok' && !tiktok.autoPublish) {
      return { ...empty, skipped: 'TikTok auto-publish is switched off' };
    }
    if (!scope && !connection.autoPublish && !tiktok.autoPublish) {
      return { ...empty, skipped: 'Auto-publish is switched off' };
    }
  }
  if (running) return { ...empty, skipped: 'Already running' };

  const now = Date.now();
  if (!options.force && now - lastRun < THROTTLE_MS) {
    return { ...empty, skipped: 'Throttled' };
  }

  const allDue = dueScheduledPosts();
  const due = scope ? allDue.filter((post) => platformOf(post) === scope) : allDue;
  if (!due.length) return empty;

  running = true;
  lastRun = now;
  const summary: SchedulerSummary = { attempted: due.length, published: 0, failed: 0, results: [] };
  let igRuns = 0;
  let ttRuns = 0;

  try {
    if (tiktok.accessToken) tiktok = await freshTikTok(tiktok);

    for (const post of due) {
      const platform = platformOf(post);
      const stamp = new Date().toISOString();

      if (platform === 'tiktok') {
        if (!tiktok.autoPublish && !options.force) {
          summary.results.push({ postId: post.id, platform, ok: false, message: 'TikTok auto-publish is off' });
          continue;
        }
        if (!tiktokLive(tiktok) && !(tiktok.sandbox && options.force)) {
          const message = tiktok.sandbox
            ? 'TikTok sandbox – use “Run now” to simulate'
            : 'TikTok is not connected (client key + login missing)';
          updatePost(post.id, { ttError: message, ttLastAttempt: stamp });
          summary.failed += 1;
          summary.results.push({ postId: post.id, platform, ok: false, message });
          continue;
        }

        const videos = post.media.filter((item) => item.mime.startsWith('video/'));
        if (videos.length !== 1 || post.media.length !== 1) {
          const message = 'TikTok needs exactly one video – no photos or carousels';
          updatePost(post.id, { ttError: message, ttLastAttempt: stamp });
          summary.failed += 1;
          summary.results.push({ postId: post.id, platform, ok: false, message });
          continue;
        }

        const file = getMediaFileRow(videos[0].id);
        if (!file) {
          const message = 'The TikTok video file is missing';
          updatePost(post.id, { ttError: message, ttLastAttempt: stamp });
          summary.failed += 1;
          summary.results.push({ postId: post.id, platform, ok: false, message });
          continue;
        }

        const result = await publishTikTok(tiktok, {
          filename: file.filename,
          caption: post.caption,
          coverAt: 0.5,
        });
        ttRuns += 1;

        if (!result.ok || !result.data) {
          updatePost(post.id, {
            ttError: result.error ?? 'TikTok publishing failed',
            ttLastAttempt: stamp,
          });
          summary.failed += 1;
          summary.results.push({ postId: post.id, platform, ok: false, message: result.error });
          continue;
        }

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
        summary.published += 1;
        summary.results.push({
          postId: post.id,
          platform,
          ok: true,
          permalink: result.data.permalink,
        });
        continue;
      }

      if (!connection.autoPublish && !options.force) {
        summary.results.push({ postId: post.id, platform, ok: false, message: 'Instagram auto-publish is off' });
        continue;
      }
      if (!isLive(connection) && !(connection.sandbox && options.force)) {
        const message = connection.sandbox
          ? 'Instagram sandbox – use “Run now” to simulate'
          : 'Instagram is not connected (account id / token missing)';
        updatePost(post.id, { igError: message, igLastAttempt: stamp });
        summary.failed += 1;
        summary.results.push({ postId: post.id, platform, ok: false, message });
        continue;
      }

      const images = post.media.filter((item) => item.mime.startsWith('image/')).map((item) => item.url);
      if (!images.length) {
        const message = 'No image in this post – nothing to publish';
        updatePost(post.id, { igError: message, igLastAttempt: stamp });
        summary.failed += 1;
        summary.results.push({ postId: post.id, platform, ok: false, message });
        continue;
      }
      if (post.type === 'story') {
        const message = 'Stories cannot be published through the API – use the ZIP export';
        updatePost(post.id, { igError: message, igLastAttempt: stamp });
        summary.failed += 1;
        summary.results.push({ postId: post.id, platform, ok: false, message });
        continue;
      }

      const caption = [post.caption, post.firstComment ? `\n\n${post.firstComment}` : ''].join('').trim();
      const result = await publish(connection, { images, caption, kind: post.type });
      igRuns += 1;

      if (!result.ok) {
        updatePost(post.id, { igError: result.error ?? 'Publishing failed', igLastAttempt: stamp });
        summary.failed += 1;
        summary.results.push({ postId: post.id, platform, ok: false, message: result.error });
        continue;
      }

      updatePost(post.id, {
        status: 'published',
        publishedAt: stamp,
        igMediaId: result.data?.mediaId ?? null,
        igPermalink: result.data?.permalink ?? null,
        igPublishedAt: stamp,
        igError: null,
        igLastAttempt: stamp,
      });
      summary.published += 1;
      summary.results.push({
        postId: post.id,
        platform,
        ok: true,
        permalink: result.data?.permalink ?? null,
      });
    }

    const lastRunAt = new Date().toISOString();
    if (igRuns) saveConnection({ lastRunAt });
    if (ttRuns) tiktok = saveTikTokConnection({ lastRunAt });
    if (igRuns || ttRuns) {
      logSchedulerRun({
        published: summary.published,
        failed: summary.failed,
        message: `${summary.published} published, ${summary.failed} failed (${igRuns} Instagram, ${ttRuns} TikTok)`,
      });
    }
    return summary;
  } finally {
    running = false;
  }
}
