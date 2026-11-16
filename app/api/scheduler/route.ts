import { ok, readJson } from '@/lib/api';
import { runScheduler, schedulerStatus } from '@/lib/scheduler';
import { saveConnection, saveTikTokConnection } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ scheduler: schedulerStatus() });
}

/** Called by the in-app heartbeat, a manual “run now” or an external cron job. */
export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);

  if (body.action === 'toggle') {
    if (body.platform === 'tiktok') {
      const connection = saveTikTokConnection({ autoPublish: Boolean(body.enabled) });
      return ok({ enabled: connection.autoPublish, scheduler: schedulerStatus() });
    }
    const connection = saveConnection({ autoPublish: Boolean(body.enabled) });
    return ok({ enabled: connection.autoPublish, scheduler: schedulerStatus() });
  }

  const summary = await runScheduler({
    force: Boolean(body.force),
    platform: body.platform === 'tiktok' ? 'tiktok' : body.platform === 'instagram' ? 'instagram' : undefined,
  });
  return ok({ summary, scheduler: schedulerStatus() });
}
