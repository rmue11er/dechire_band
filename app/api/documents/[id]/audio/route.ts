import { fail, ok, readJson, toInt } from '@/lib/api';
import { attachDocumentAudio, getDocument, getMedia, listDocumentAudio } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const documentId = toInt(id);
  if (!getDocument(documentId)) return fail('Document not found', 404);
  return ok({ audio: listDocumentAudio(documentId) });
}

/** Attaches an audio file from the media library (demos, rough mixes, voice memos). */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const documentId = toInt(id);
  if (!getDocument(documentId)) return fail('Document not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const mediaId = toInt(body.mediaId);
  const media = getMedia(mediaId);
  if (!media) return fail('Audio file not found in the library', 404);
  if (!media.mime.startsWith('audio/')) return fail('Only audio files can be attached here', 400);

  const label = String(body.label ?? '').trim() || media.title;
  const item = attachDocumentAudio(documentId, mediaId, label);
  if (!item) return fail('Could not attach the audio file', 400);
  return ok({ item, audio: listDocumentAudio(documentId) }, 201);
}
