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
import type { InstagramConnection, Post, PostPlatform, TikTokConnection } from './types';

type ScopedPlatform = 'instagram' | 'tiktok';

type PartResult = { ok: boolean; message?: string; permalink?: string | null };

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

const targetsInstagram = (post: Post) => post.platform !== 'tiktok';
const targetsTikTok = (post: Post) => post.platform !== 'instagram';

export function schedulerStatus() {
  const connection = getConnection();
  const tiktok = getTikTokConnection();
  const due = dueScheduledPosts();
  const next = nextScheduledPost();
  const igDue = due.filter((post) => targetsInstagram(post) && !post.igPublishedAt).length;
  const ttDue = due.filter((post) => targetsTikTok(post) && !post.ttPublishedAt).length;

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
      platform: post.platform,
      caption: post.caption.split('\n')[0].slice(0, 70),
    })),
    next: next
      ? {
          id: next.id,
          at: next.scheduledAt,
          platform: next.platform,
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

/** Refresh the short-lived TikTok token shortly before publishing. */
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

/** Instagram part of a post – photos/carousels or a Reel from the video. */
async function publishInstagramPart(
  connection: InstagramConnection,
  post: Post,
  stamp: string
): Promise<PartResult> {
  if (post.type === 'story') {
    const message = 'Stories cannot be published through the API – use the ZIP export';
    updatePost(post.id, { igError: message, igLastAttempt: stamp });
    return { ok: false, message };
  }

  const video = post.media.find((item) => item.mime.startsWith('video/'));
  const useVideo = Boolean(video) && (post.type === 'reel' || post.platform === 'both');
  const images = useVideo
    ? []
    : post.media.filter((item) => item.mime.startsWith('image/')).map((item) => item.url);

  if (!useVideo && !images.length) {
    const message = 'No image or video in this post – nothing to publish';
    updatePost(post.id, { igError: message, igLastAttempt: stamp });
    return { ok: false, message };
  }

  const caption = [post.caption, post.firstComment ? `\n\n${post.firstComment}` : ''].join('').trim();
  const result = await publish(connection, {
    images,
    video: useVideo ? video!.url : undefined,
    caption,
    kind: post.type,
  });

  if (!result.ok || !result.data) {
    const message = result.error ?? 'Instagram publishing failed';
    updatePost(post.id, { igError: message, igLastAttempt: stamp });
    return { ok: false, message };
  }

  updatePost(post.id, {
    igMediaId: result.data.mediaId,
    igPermalink: result.data.permalink,
    igPublishedAt: stamp,
    igError: null,
    igLastAttempt: stamp,
  });
  return { ok: true, permalink: result.data.permalink };
}

/** TikTok part of a post – always exactly one video. */
async function publishTikTokPart(tiktok: TikTokConnection, post: Post, stamp: string): Promise<PartResult> {
  const videos = post.media.filter((item) => item.mime.startsWith('video/'));
  if (videos.length !== 1 || post.media.length !== 1) {
    const message = 'TikTok needs exactly one video – no photos or carousels';
    updatePost(post.id, { ttError: message, ttLastAttempt: stamp });
    return { ok: false, message };
  }

  const file = getMediaFileRow(videos[0].id);
  if (!file) {
    const message = 'The TikTok video file is missing';
    updatePost(post.id, { ttError: message, ttLastAttempt: stamp });
    return { ok: false, message };
  }

  const result = await publishTikTok(tiktok, {
    filename: file.filename,
    caption: post.caption,
    coverAt: 0.5,
  });

  if (!result.ok || !result.data) {
    const message = result.error ?? 'TikTok publishing failed';
    updatePost(post.id, { ttError: message, ttLastAttempt: stamp });
    return { ok: false, message };
  }

  updatePost(post.id, {
    ttPublishId: result.data.publishId,
    ttStatus: result.data.status,
    ttPermalink: result.data.permalink,
    ttPublishedAt: stamp,
    ttError: null,
    ttLastAttempt: stamp,
  });
  return { ok: true, permalink: result.data.permalink };
}

/**
 * Publishes every scheduled post that is due. Runs when the app is open (heartbeat)
 * or when an external cron calls `/api/scheduler`. “Both” posts publish each platform
 * independently, so a failed TikTok upload does not trigger a second Instagram post.
 */
export async function runScheduler(
  options: { force?: boolean; platform?: ScopedPlatform } = {}
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
  const due = scope
    ? allDue.filter((post) =>
        scope === 'instagram'
          ? targetsInstagram(post) && !post.igPublishedAt
          : targetsTikTok(post) && !post.ttPublishedAt
      )
    : allDue;
  if (!due.length) return empty;

  running = true;
  lastRun = now;
  const summary: SchedulerSummary = { attempted: due.length, published: 0, failed: 0, results: [] };
  let igRuns = 0;
  let ttRuns = 0;

  try {
    if (tiktok.accessToken) tiktok = await freshTikTok(tiktok);

    for (const post of due) {
      const stamp = new Date().toISOString();
      const wantsInstagram = targetsInstagram(post);
      const wantsTikTok = targetsTikTok(post);
      let igDone = !wantsInstagram || Boolean(post.igPublishedAt);
      let ttDone = !wantsTikTok || Boolean(post.ttPublishedAt);
      let postFailed = false;

      if (wantsInstagram && !igDone && (!scope || scope === 'instagram')) {
        if (!connection.autoPublish && !options.force) {
          summary.results.push({
            postId: post.id,
            platform: 'instagram',
            ok: false,
            message: 'Instagram auto-publish is off',
          });
        } else if (!isLive(connection) && !(connection.sandbox && options.force)) {
          const message = connection.sandbox
            ? 'Instagram sandbox – use “Run now” to simulate'
            : 'Instagram is not connected (account id / token missing)';
          updatePost(post.id, { igError: message, igLastAttempt: stamp });
          summary.results.push({ postId: post.id, platform: 'instagram', ok: false, message });
          postFailed = true;
        } else {
          const part = await publishInstagramPart(connection, post, stamp);
          igRuns += 1;
          if (part.ok) {
            igDone = true;
            summary.results.push({
              postId: post.id,
              platform: 'instagram',
              ok: true,
              permalink: part.permalink,
            });
          } else {
            postFailed = true;
            summary.results.push({
              postId: post.id,
              platform: 'instagram',
              ok: false,
              message: part.message,
            });
          }
        }
      }

      if (wantsTikTok && !ttDone && (!scope || scope === 'tiktok')) {
        if (!tiktok.autoPublish && !options.force) {
          summary.results.push({
            postId: post.id,
            platform: 'tiktok',
            ok: false,
            message: 'TikTok auto-publish is off',
          });
        } else if (!tiktokLive(tiktok) && !(tiktok.sandbox && options.force)) {
          const message = tiktok.sandbox
            ? 'TikTok sandbox – use “Run now” to simulate'
            : 'TikTok is not connected (client key + login missing)';
          updatePost(post.id, { ttError: message, ttLastAttempt: stamp });
          summary.results.push({ postId: post.id, platform: 'tiktok', ok: false, message });
          postFailed = true;
        } else {
          const part = await publishTikTokPart(tiktok, post, stamp);
          ttRuns += 1;
          if (part.ok) {
            ttDone = true;
            summary.results.push({
              postId: post.id,
              platform: 'tiktok',
              ok: true,
              permalink: part.permalink,
            });
          } else {
            postFailed = true;
            summary.results.push({
              postId: post.id,
              platform: 'tiktok',
              ok: false,
              message: part.message,
            });
          }
        }
      }

      if (igDone && ttDone) {
        updatePost(post.id, { status: 'published', publishedAt: stamp });
        summary.published += 1;
      } else if (postFailed) {
        summary.failed += 1;
      }
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
