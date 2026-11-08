import { isLive, publish } from './instagram';
import {
  dueScheduledPosts,
  getConnection,
  listSchedulerLog,
  logSchedulerRun,
  nextScheduledPost,
  saveConnection,
  updatePost,
} from './repo';

export type SchedulerSummary = {
  skipped?: string;
  attempted: number;
  published: number;
  failed: number;
  results: { postId: number; ok: boolean; message?: string; permalink?: string | null }[];
};

/** Cheap throttle so several open tabs cannot hammer the Graph API. */
const THROTTLE_MS = 20_000;
let lastRun = 0;
let running = false;

export function schedulerStatus() {
  const connection = getConnection();
  const due = dueScheduledPosts();
  const next = nextScheduledPost();
  return {
    enabled: connection.autoPublish,
    live: isLive(connection),
    sandbox: connection.sandbox,
    lastRunAt: connection.lastRunAt,
    dueNow: due.length,
    due: due.map((post) => ({ id: post.id, at: post.scheduledAt, caption: post.caption.split('\n')[0].slice(0, 70) })),
    next: next ? { id: next.id, at: next.scheduledAt, caption: next.caption.split('\n')[0].slice(0, 70) } : null,
    log: listSchedulerLog(),
  };
}

/**
 * Publishes every scheduled post that is due. Runs when the app is open (heartbeat)
 * or when an external cron calls `/api/scheduler`.
 */
export async function runScheduler(options: { force?: boolean } = {}): Promise<SchedulerSummary> {
  const connection = getConnection();
  const empty: SchedulerSummary = { attempted: 0, published: 0, failed: 0, results: [] };

  if (!connection.autoPublish && !options.force) {
    return { ...empty, skipped: 'Auto-publish is switched off' };
  }
  if (!isLive(connection)) {
    // Sandbox stays a manual demo: the heartbeat never “publishes” fake posts.
    if (!connection.sandbox || !options.force) {
      return {
        ...empty,
        skipped: connection.sandbox
          ? 'Sandbox mode – turn the sandbox off and connect your account to publish automatically'
          : 'Instagram is not connected (account id / token missing)',
      };
    }
  }
  if (running) return { ...empty, skipped: 'Already running' };

  const now = Date.now();
  if (!options.force && now - lastRun < THROTTLE_MS) {
    return { ...empty, skipped: 'Throttled' };
  }

  const due = dueScheduledPosts();
  if (!due.length) return empty;

  running = true;
  lastRun = now;
  const summary: SchedulerSummary = { attempted: due.length, published: 0, failed: 0, results: [] };

  try {
    for (const post of due) {
      const images = post.media.filter((item) => item.mime.startsWith('image/')).map((item) => item.url);
      const stamp = new Date().toISOString();

      if (!images.length) {
        const message = 'No image in this post – nothing to publish';
        updatePost(post.id, { igError: message, igLastAttempt: stamp });
        summary.failed += 1;
        summary.results.push({ postId: post.id, ok: false, message });
        continue;
      }
      if (post.type === 'story') {
        const message = 'Stories cannot be published through the API – use the ZIP export';
        updatePost(post.id, { igError: message, igLastAttempt: stamp });
        summary.failed += 1;
        summary.results.push({ postId: post.id, ok: false, message });
        continue;
      }

      const caption = [post.caption, post.firstComment ? `\n\n${post.firstComment}` : ''].join('').trim();
      const result = await publish(connection, { images, caption, kind: post.type });

      if (!result.ok) {
        updatePost(post.id, { igError: result.error ?? 'Publishing failed', igLastAttempt: stamp });
        summary.failed += 1;
        summary.results.push({ postId: post.id, ok: false, message: result.error });
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
      summary.results.push({ postId: post.id, ok: true, permalink: result.data?.permalink ?? null });
    }

    saveConnection({ lastRunAt: new Date().toISOString() });
    logSchedulerRun({
      published: summary.published,
      failed: summary.failed,
      message: `${summary.published} published, ${summary.failed} failed${
        isLive(connection) ? '' : ' (sandbox run)'
      }`,
    });
    return summary;
  } finally {
    running = false;
  }
}
