import { fail, ok, readJson, toInt, toOptionalId } from '@/lib/api';
import { bulkCreateVideoShots, createVideoShot, getMedia, getVideoProject, listVideoShots } from '@/lib/repo';
import { SHOT_STATUS } from '@/lib/videos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = new Set<string>(SHOT_STATUS.map((entry) => entry.value));

type Ctx = { params: Promise<{ id: string }> };

const cleanShot = (input: Record<string, any>) => ({
  start: Math.max(0, Number(input.start) || 0),
  duration: Math.max(0.2, Number(input.duration) || 4),
  section: String(input.section ?? 'verse').slice(0, 40),
  description: String(input.description ?? 'New shot').slice(0, 500),
  location: String(input.location ?? '').slice(0, 160),
  shotType: String(input.shotType ?? '').slice(0, 80),
  movement: String(input.movement ?? '').slice(0, 80),
  lighting: String(input.lighting ?? '').slice(0, 120),
  status: STATUSES.has(String(input.status)) ? String(input.status) : 'idea',
  mediaId: toOptionalId(input.mediaId) || null,
  notes: String(input.notes ?? '').slice(0, 2000),
});

const hasInvalidMedia = (inputs: Record<string, any>[]) =>
  inputs.some((input) => {
    const mediaId = toOptionalId(input.mediaId);
    return mediaId === false || (mediaId !== null && !getMedia(mediaId));
  });

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const videoId = toInt(id);
  if (!getVideoProject(videoId)) return fail('Video project not found', 404);
  return ok({ shots: listVideoShots(videoId) });
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const videoId = toInt(id);
  if (!getVideoProject(videoId)) return fail('Video project not found', 404);

  const body = await readJson<Record<string, any>>(request);
  if (Array.isArray(body.shots)) {
    if (!body.shots.length || body.shots.length > 80) return fail('Add 1–80 shots at a time');
    if (hasInvalidMedia(body.shots)) return fail('Media not found');
    const shots = bulkCreateVideoShots(videoId, body.shots.map(cleanShot));
    return ok({ shots }, 201);
  }

  if (hasInvalidMedia([body])) return fail('Media not found');
  const shot = createVideoShot(videoId, cleanShot(body));
  return ok({ shot }, 201);
}
