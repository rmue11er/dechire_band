import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteVideoShot, getVideoShot, updateVideoShot } from '@/lib/repo';
import { SHOT_STATUS } from '@/lib/videos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = new Set<string>(SHOT_STATUS.map((entry) => entry.value));

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const shotId = toInt(id);
  if (!getVideoShot(shotId)) return fail('Shot not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (body.start !== undefined) patch.start = Math.max(0, Number(body.start) || 0);
  if (body.duration !== undefined) patch.duration = Math.max(0.2, Number(body.duration) || 0.2);
  if (body.section !== undefined) patch.section = String(body.section ?? 'verse').slice(0, 40);
  if (body.description !== undefined)
    patch.description = String(body.description ?? '').slice(0, 500);
  if (body.location !== undefined) patch.location = String(body.location ?? '').slice(0, 160);
  if (body.shotType !== undefined) patch.shotType = String(body.shotType ?? '').slice(0, 80);
  if (body.movement !== undefined) patch.movement = String(body.movement ?? '').slice(0, 80);
  if (body.lighting !== undefined) patch.lighting = String(body.lighting ?? '').slice(0, 120);
  if (typeof body.status === 'string' && STATUSES.has(body.status)) patch.status = body.status;
  if (body.mediaId !== undefined) patch.mediaId = body.mediaId ? Number(body.mediaId) : null;
  if (body.notes !== undefined) patch.notes = String(body.notes ?? '').slice(0, 2000);

  const shot = updateVideoShot(shotId, patch);
  return ok({ shot });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const shotId = toInt(id);
  if (!getVideoShot(shotId)) return fail('Shot not found', 404);
  deleteVideoShot(shotId);
  return ok({ ok: true });
}
