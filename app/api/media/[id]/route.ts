import fs from 'node:fs';
import path from 'node:path';
import { fail, ok, readJson, toInt } from '@/lib/api';
import { UPLOAD_DIR } from '@/lib/db';
import { deleteMedia, getMedia, mediaUsage, updateMedia } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const media = getMedia(toInt(id));
  if (!media) return fail('File not found', 404);
  return ok({ media, usage: mediaUsage(media.id) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const mediaId = toInt(id);
  const existing = getMedia(mediaId);
  if (!existing) return fail('File not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.variantLabel === 'string') patch.variantLabel = body.variantLabel;
  if (typeof body.alt === 'string') patch.alt = body.alt;
  if (Array.isArray(body.tags)) patch.tags = body.tags.map(String);
  if (body.groupId !== undefined) patch.groupId = body.groupId ? Number(body.groupId) : null;
  if (body.folderId !== undefined) patch.folderId = body.folderId ? Number(body.folderId) : null;

  updateMedia(mediaId, patch);
  return ok({ media: getMedia(mediaId) });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const mediaId = toInt(id);
  const row = deleteMedia(mediaId);
  if (row?.filename) {
    const target = path.join(UPLOAD_DIR, path.basename(row.filename));
    try {
      fs.unlinkSync(target);
    } catch {
      /* file was already gone */
    }
  }
  return ok({ ok: true });
}
