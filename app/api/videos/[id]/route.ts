import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteVideoProject, getVideoProject, listVideoShots, updateVideoProject } from '@/lib/repo';
import { VIDEO_STATUS } from '@/lib/videos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = new Set<string>(VIDEO_STATUS.map((entry) => entry.value));

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const videoId = toInt(id);
  const video = getVideoProject(videoId);
  if (!video) return fail('Video project not found', 404);
  return ok({ video, shots: listVideoShots(videoId) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const videoId = toInt(id);
  if (!getVideoProject(videoId)) return fail('Video project not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (typeof body.title === 'string') {
    const title = body.title.trim();
    if (!title) return fail('Title is required');
    patch.title = title.slice(0, 160);
  }
  if (body.songId !== undefined) patch.songId = body.songId ? Number(body.songId) : null;
  if (body.audioMediaId !== undefined)
    patch.audioMediaId = body.audioMediaId ? Number(body.audioMediaId) : null;
  if (body.treatmentDocId !== undefined)
    patch.treatmentDocId = body.treatmentDocId ? Number(body.treatmentDocId) : null;
  if (typeof body.status === 'string' && STATUSES.has(body.status)) patch.status = body.status;
  if (body.shootDate !== undefined) patch.shootDate = String(body.shootDate ?? '').slice(0, 10);
  if (body.location !== undefined) patch.location = String(body.location ?? '').slice(0, 160);
  if (body.director !== undefined) patch.director = String(body.director ?? '').slice(0, 120);
  if (body.notes !== undefined) patch.notes = String(body.notes ?? '').slice(0, 4000);

  const video = updateVideoProject(videoId, patch);
  return ok({ video });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const videoId = toInt(id);
  if (!getVideoProject(videoId)) return fail('Video project not found', 404);
  deleteVideoProject(videoId);
  return ok({ ok: true });
}
