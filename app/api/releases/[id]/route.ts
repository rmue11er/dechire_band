import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteRelease, getRelease, listReleaseTasks, updateRelease, updateReleaseTask } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const release = getRelease(toInt(id));
  if (!release) return fail('Release not found', 404);
  return ok({ release, tasks: listReleaseTasks(release.id) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const releaseId = toInt(id);
  if (!getRelease(releaseId)) return fail('Release not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 140);
  if (typeof body.type === 'string') patch.type = body.type;
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.releaseDate)) {
    patch.releaseDate = body.releaseDate;
  }
  if (body.announceDate === null || typeof body.announceDate === 'string') {
    patch.announceDate = body.announceDate || null;
  }
  if (typeof body.presaveUrl === 'string') patch.presaveUrl = body.presaveUrl.slice(0, 500);
  if (body.coverMediaId !== undefined) {
    patch.coverMediaId = body.coverMediaId ? Number(body.coverMediaId) : null;
  }
  if (body.audioMediaId !== undefined) {
    patch.audioMediaId = body.audioMediaId ? Number(body.audioMediaId) : null;
  }
  if (body.videoMediaId !== undefined) {
    patch.videoMediaId = body.videoMediaId ? Number(body.videoMediaId) : null;
  }
  if (typeof body.notes === 'string') patch.notes = body.notes;

  updateRelease(releaseId, patch);

  // Setting the cover/master/video at the top also fills the matching step.
  for (const [field, key, mediaKind] of [
    ['coverMediaId', 'cover-art', 'image'],
    ['audioMediaId', 'master-final', 'audio'],
    ['videoMediaId', 'video-edit', 'video'],
  ] as const) {
    const mediaId = body[field];
    if (mediaId === undefined || !mediaId) continue;
    const task = listReleaseTasks(releaseId).find((entry) => entry.key === key);
    if (task) updateReleaseTask(task.id, { mediaId: Number(mediaId), mediaKind });
  }

  return ok({ release: getRelease(releaseId), tasks: listReleaseTasks(releaseId) });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteRelease(toInt(id));
  return ok({ deleted: true });
}
