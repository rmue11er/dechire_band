import { fail, ok, readJson } from '@/lib/api';
import { createReelJob, failReelJob, finishReelJob, listReelJobs, updateReelJob } from '@/lib/reelJobs';
import { ffmpegStatus, renderReel } from '@/lib/reelRender';
import { REEL_MAX_SECONDS, type ReelPlan } from '@/lib/reels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validPlan(value: any): value is ReelPlan {
  if (!value || typeof value !== 'object') return false;
  if (!Array.isArray(value.clips) || value.clips.length < 1 || value.clips.length > 12) return false;
  if (!value.audio || typeof value.audio.mediaId !== 'number') return false;
  if (!value.look || !value.text) return false;
  const total = value.clips.reduce((sum: number, clip: any) => sum + Number(clip.duration || 0), 0);
  if (!Number.isFinite(total) || total < 1 || total > REEL_MAX_SECONDS) return false;
  const lyrics = value.text?.lyrics;
  if (lyrics != null) {
    if (!Array.isArray(lyrics) || lyrics.length > 80) return false;
    const valid = lyrics.every(
      (line: any) =>
        typeof line?.text === 'string' &&
        line.text.trim().length > 0 &&
        line.text.length <= 120 &&
        Number.isFinite(line.start) &&
        line.start >= 0
    );
    if (!valid) return false;
  }
  return value.clips.every(
    (clip: any) =>
      typeof clip.mediaId === 'number' &&
      Number.isFinite(clip.start) &&
      clip.start >= 0 &&
      Number.isFinite(clip.duration) &&
      clip.duration > 0.25
  );
}

export async function GET() {
  return ok({ ffmpeg: ffmpegStatus(), jobs: listReelJobs() });
}

export async function POST(request: Request) {
  const body = await readJson<{
    plan?: ReelPlan;
    overlay?: string | null;
    overlays?: { start?: number; end?: number; png?: string }[];
  }>(request);
  if (!validPlan(body.plan)) return fail('The reel plan is incomplete');
  if (!ffmpegStatus().ok) return fail('ffmpeg is not installed on this server', 503);

  const plan = body.plan;
  const duration = plan.clips.reduce((sum, clip) => sum + clip.duration, 0);
  const overlays = Array.isArray(body.overlays)
    ? body.overlays.slice(0, 80).filter(
        (entry) =>
          Number.isFinite(entry?.start) &&
          Number.isFinite(entry?.end) &&
          Number(entry?.end) > Number(entry?.start) &&
          String(entry?.png ?? '').startsWith('data:image/png;base64,')
      )
    : [];
  const job = createReelJob({
    title: plan.title || 'Reel',
    duration: Number(duration.toFixed(2)),
    clipCount: plan.clips.length,
  });
  updateReelJob(job.id, { status: 'rendering', progress: 0.01 });

  // fire and forget – the client polls /api/reels/<id>
  void renderReel(
    plan,
    body.overlay ?? null,
    overlays.map((entry) => ({ start: Number(entry.start), end: Number(entry.end), png: String(entry.png) })),
    (progress) => {
      updateReelJob(job.id, { progress });
    }
  )
    .then((result) => finishReelJob(job.id, result))
    .catch((error: any) => failReelJob(job.id, error?.message ?? 'The render failed'));

  return ok({ job }, 202);
}
