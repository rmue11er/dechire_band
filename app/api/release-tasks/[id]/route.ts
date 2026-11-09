import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteReleaseTask, getMedia, getRelease, getReleaseTask, updateRelease, updateReleaseTask } from '@/lib/repo';
import type { ReleasePhaseId, TaskModule } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

const PHASES: ReleasePhaseId[] = ['production', 'tease', 'announce', 'countdown', 'release', 'sustain'];
const MODULES: TaskModule[] = ['planner', 'studio', 'media', 'docs', 'press', 'website', 'orga'];
const MEDIA_KINDS = ['image', 'video', 'audio', ''];

const dayDiff = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000
  );

/** A task step can set the release assets – that is the point of the coupling. */
function syncReleaseAsset(taskId: number) {
  const task = getReleaseTask(taskId);
  if (!task?.mediaId) return;
  const media = getMedia(task.mediaId);
  if (!media) return;
  if (task.key === 'cover-art' && media.mime.startsWith('image/')) {
    updateRelease(task.releaseId, { coverMediaId: media.id });
  }
  if (task.key === 'master-final' && media.mime.startsWith('audio/')) {
    updateRelease(task.releaseId, { audioMediaId: media.id });
  }
  if (task.key === 'video-edit' && media.mime.startsWith('video/')) {
    updateRelease(task.releaseId, { videoMediaId: media.id });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const taskId = toInt(id);
  if (!getReleaseTask(taskId)) return fail('Task not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Parameters<typeof updateReleaseTask>[1] = {
    done: typeof body.done === 'boolean' ? body.done : undefined,
    critical: typeof body.critical === 'boolean' ? body.critical : undefined,
    postId: body.postId === undefined ? undefined : body.postId ? Number(body.postId) : null,
    documentId: body.documentId === undefined ? undefined : body.documentId ? Number(body.documentId) : null,
    designId: body.designId === undefined ? undefined : body.designId ? Number(body.designId) : null,
    mediaId: body.mediaId === undefined ? undefined : body.mediaId ? Number(body.mediaId) : null,
    label: typeof body.label === 'string' ? body.label.trim().slice(0, 180) : undefined,
    detail: typeof body.detail === 'string' ? body.detail.slice(0, 2000) : undefined,
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : undefined,
    reference: typeof body.reference === 'string' ? body.reference.slice(0, 500) : undefined,
    mediaKind:
      typeof body.mediaKind === 'string' && MEDIA_KINDS.includes(body.mediaKind) ? body.mediaKind : undefined,
  };
  if (typeof body.phase === 'string' && PHASES.includes(body.phase as ReleasePhaseId)) {
    patch.phase = body.phase as ReleasePhaseId;
  }
  if (typeof body.module === 'string' && MODULES.includes(body.module as TaskModule)) {
    patch.module = body.module as TaskModule;
  }
  if (typeof body.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
    const task = getReleaseTask(taskId);
    const release = task ? getRelease(task.releaseId) : null;
    patch.dueDate = body.dueDate;
    if (release) patch.offsetDays = dayDiff(release.releaseDate, body.dueDate);
  }

  updateReleaseTask(taskId, patch);
  syncReleaseAsset(taskId);
  return ok({ task: getReleaseTask(taskId) });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteReleaseTask(toInt(id));
  return ok({ deleted: true });
}
