import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { fail, ok, readJson, slugify } from '@/lib/api';
import { UPLOAD_DIR } from '@/lib/db';
import { createMedia, listMedia } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Pulls a picture that lives somewhere else into the band's own media library.
 *
 * Documents used to keep whatever the clipboard handed over – `blob:` URLs from
 * the session, `data:` blobs, or hot-linked pictures from another site. Those
 * look fine on the machine that pasted them and break everywhere else, so
 * anything that is not our own `/api/files/…` gets copied here and referenced
 * locally afterwards (see `repairImages()` in the document editor).
 */

const UA = 'DECHIRE-BandHQ/1.0 (document images)';
const MAX_BYTES = 30 * 1024 * 1024;

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

function storeImage(buffer: Buffer, mime: string, name: string, source: string) {
  const ext = EXT[mime] ?? path.extname(name).toLowerCase() ?? '.jpg';
  let base = slugify(name.replace(/\.[a-z0-9]+$/i, '')) || 'image';
  if (/^\d+$/.test(base) || base.length < 3) base = 'image';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  let width: number | null = null;
  let height: number | null = null;
  try {
    const size = imageSize(buffer);
    width = size.width ?? null;
    height = size.height ?? null;
  } catch {
    /* unknown format – dimensions stay empty */
  }

  const id = createMedia({
    title: base.replace(/-/g, ' ').slice(0, 120),
    filename,
    originalName: name.slice(0, 160),
    mime,
    size: buffer.length,
    width,
    height,
    alt: '',
    tags: ['document', source].filter(Boolean),
    groupId: null,
    variantLabel: '',
  });

  return listMedia().find((item) => item.id === id) ?? null;
}

export async function POST(request: Request) {
  const body = await readJson<{ url?: string; dataUrl?: string }>(request);
  const dataUrl = String(body.dataUrl ?? '').trim();
  const url = String(body.url ?? '').trim();

  /* ---------------------------------------------------------- data: URL */
  if (dataUrl.startsWith('data:')) {
    const match = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(dataUrl);
    if (!match) return fail('That data URL is not a base64 image');
    const mime = match[1].toLowerCase();
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) return fail('The image came back empty');
    if (buffer.length > MAX_BYTES) return fail('Image is too large (30 MB limit)');
    const media = storeImage(buffer, mime, 'pasted image', 'clipboard');
    if (!media) return fail('Could not store the image', 500);
    return ok({ media }, 201);
  }

  /* ------------------------------------------------------------ remote */
  if (!url) return fail('No image URL');

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return fail('Invalid image URL');
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return fail('Only http(s) images can be imported');
  }

  let response: Response;
  try {
    response = await fetch(target, {
      headers: { 'User-Agent': UA, Accept: 'image/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
      cache: 'no-store',
    });
  } catch {
    return fail('Could not download that image', 502);
  }
  if (!response.ok) return fail(`Download failed (${response.status})`, 502);

  const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!mime.startsWith('image/')) return fail('That link is not an image');

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) return fail('The image came back empty');
  if (buffer.length > MAX_BYTES) return fail('Image is too large (30 MB limit)');

  const name = path.basename(target.pathname) || 'image';
  const media = storeImage(buffer, mime, name, 'imported');
  if (!media) return fail('Could not store the image', 500);
  return ok({ media }, 201);
}
