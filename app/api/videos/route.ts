import { fail, ok, readJson, toOptionalId } from '@/lib/api';
import { createVideoProject, getDocument, getMedia, getSong, listVideoProjects } from '@/lib/repo';
import { VIDEO_STATUS } from '@/lib/videos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = new Set<string>(VIDEO_STATUS.map((entry) => entry.value));

export async function GET() {
  return ok({ videos: listVideoProjects() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const title = String(body.title ?? '').trim();
  if (!title) return fail('Title is required');
  const songId = toOptionalId(body.songId);
  if (songId === false || (songId !== null && !getSong(songId))) return fail('Song not found');
  const audioMediaId = toOptionalId(body.audioMediaId);
  const audioMedia = audioMediaId === null || audioMediaId === false ? null : getMedia(audioMediaId);
  if (audioMediaId === false || (audioMediaId !== null && !audioMedia))
    return fail('Audio file not found');
  if (audioMedia && !audioMedia.mime.startsWith('audio/')) return fail('Choose an audio file');
  const treatmentDocId = toOptionalId(body.treatmentDocId);
  if (treatmentDocId === false || (treatmentDocId !== null && !getDocument(treatmentDocId)))
    return fail('Treatment document not found');
  const video = createVideoProject({
    title: title.slice(0, 160),
    songId,
    audioMediaId,
    treatmentDocId,
    status: STATUSES.has(String(body.status)) ? String(body.status) : 'idea',
    shootDate: String(body.shootDate ?? '').slice(0, 10),
    location: String(body.location ?? '').slice(0, 160),
    director: String(body.director ?? '').slice(0, 120),
    notes: String(body.notes ?? '').slice(0, 4000),
  });
  return ok({ video }, 201);
}
