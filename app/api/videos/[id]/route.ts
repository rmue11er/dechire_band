import { fail, ok, readJson, toInt, toOptionalId } from '@/lib/api';
import {
  deleteVideoProject,
  getDocument,
  getMedia,
  getSong,
  getVideoProject,
  listVideoShots,
  updateVideoProject,
} from '@/lib/repo';
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
  if (body.songId !== undefined) {
    const songId = toOptionalId(body.songId);
    if (songId === false || (songId !== null && !getSong(songId))) return fail('Song not found');
    patch.songId = songId;
  }
  if (body.audioMediaId !== undefined) {
    const audioMediaId = toOptionalId(body.audioMediaId);
    const audioMedia = audioMediaId === null || audioMediaId === false ? null : getMedia(audioMediaId);
    if (audioMediaId === false || (audioMediaId !== null && !audioMedia))
      return fail('Audio file not found');
    if (audioMedia && !audioMedia.mime.startsWith('audio/')) return fail('Choose an audio file');
    patch.audioMediaId = audioMediaId;
  }
  if (body.treatmentDocId !== undefined) {
    const treatmentDocId = toOptionalId(body.treatmentDocId);
    if (treatmentDocId === false || (treatmentDocId !== null && !getDocument(treatmentDocId)))
      return fail('Treatment document not found');
    patch.treatmentDocId = treatmentDocId;
  }
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
