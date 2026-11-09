import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { fail, ok, readJson, slugify } from '@/lib/api';
import { UPLOAD_DIR } from '@/lib/db';
import { createMedia, listMedia } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Pulls a stock photo into the band's own media library.
 *
 * Why copy instead of hot-linking: the design canvas exports through
 * html-to-image, which needs same-origin (or CORS-enabled) images. Keeping a
 * local copy also means the design still works when the provider is down, and
 * the licence lives with the file.
 */

const UA = 'DECHIRE-BandHQ/1.0 (band design studio)';
const MAX_BYTES = 30 * 1024 * 1024;

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

export async function POST(request: Request) {
  const body = await readJson<{ url?: string; title?: string; provider?: string; license?: string }>(request);
  const raw = String(body.url ?? '').trim();
  if (!raw) return fail('No image URL');

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return fail('Invalid image URL');
  }
  if (target.protocol !== 'https:') return fail('Only https images are allowed');

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

  const ext = EXT[mime] ?? '.jpg';
  const base = slugify(String(body.title ?? 'stock photo')) || 'stock-photo';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-stock-${base}${ext}`;
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

  const provider = String(body.provider ?? 'openverse').slice(0, 40);
  const license = String(body.license ?? 'cc0').slice(0, 20);
  const id = createMedia({
    title: String(body.title ?? 'Stock photo').slice(0, 120),
    filename,
    originalName: `${base}${ext}`,
    mime,
    size: buffer.length,
    width,
    height,
    alt: String(body.title ?? '').slice(0, 200),
    tags: ['stock', license, provider].filter(Boolean),
    groupId: null,
    variantLabel: '',
  });

  const media = listMedia().find((item) => item.id === id);
  return ok({ media }, 201);
}
