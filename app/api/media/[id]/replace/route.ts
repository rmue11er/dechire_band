import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { fail, ok, slugify } from '@/lib/api';
import { UPLOAD_DIR } from '@/lib/db';
import { getMedia, getMediaFileRow, replaceMediaFile } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Swaps the file of an existing asset; every post keeps using the same media id. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const mediaId = Number(id);
  const existing = getMedia(mediaId);
  if (!existing) return fail('Asset not found', 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Could not read the upload');
  }
  const file = form.get('file');
  if (!file || typeof (file as any).arrayBuffer !== 'function') return fail('No file received');

  const upload = file as File;
  const buffer = Buffer.from(await upload.arrayBuffer());
  const ext = path.extname(upload.name).toLowerCase() || path.extname(existing.originalName) || '';
  const base = slugify(path.basename(upload.name, path.extname(upload.name))) || 'asset';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  let width: number | null = null;
  let height: number | null = null;
  try {
    const size = imageSize(buffer);
    width = size.width ?? null;
    height = size.height ?? null;
  } catch {
    /* video or unknown format */
  }

  const old = getMediaFileRow(mediaId);
  const media = replaceMediaFile(mediaId, {
    filename,
    originalName: upload.name,
    mime: upload.type || existing.mime,
    size: upload.size,
    width,
    height,
  });

  if (old?.filename && old.filename !== filename) {
    try {
      fs.rmSync(path.join(UPLOAD_DIR, old.filename), { force: true });
    } catch {
      /* old file already gone */
    }
  }

  return ok({ media });
}
