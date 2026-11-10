import fs from 'node:fs';
import path from 'node:path';
import { fail, ok, readJson, slugify } from '@/lib/api';
import { UPLOAD_DIR } from '@/lib/db';
import { createMedia, listMedia } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Copies a free stock clip into the band's media library.
 *
 * Reels need local files: ffmpeg renders server-side, the browser preview needs
 * same-origin video, and the licence should travel with the asset even if the
 * provider disappears.
 */

const UA = 'DECHIRE-BandHQ/1.0 (band reel lab)';
const MAX_BYTES = 120 * 1024 * 1024;

const EXT: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'application/ogg': '.ogv',
  'video/quicktime': '.mov',
};

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
};

export async function POST(request: Request) {
  const body = await readJson<{
    url?: string;
    title?: string;
    provider?: string;
    license?: string;
    creator?: string;
    width?: number;
    height?: number;
  }>(request);

  const raw = String(body.url ?? '').trim();
  if (!raw) return fail('No video URL');

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return fail('Invalid video URL');
  }
  if (target.protocol !== 'https:') return fail('Only https videos are allowed');

  let response: Response;
  try {
    response = await fetch(target, {
      headers: { 'User-Agent': UA, Accept: 'video/*,application/ogg;q=0.9,*/*;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(90000),
      cache: 'no-store',
    });
  } catch {
    return fail('Could not download that clip', 502);
  }
  if (!response.ok) return fail(`Download failed (${response.status})`, 502);

  const rawMime = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const pathExt = path.extname(decodeURIComponent(target.pathname)).toLowerCase();
  const mime = rawMime.startsWith('video/') || rawMime === 'application/ogg'
    ? rawMime
    : MIME_BY_EXT[pathExt] ?? rawMime;
  const isVideo = mime.startsWith('video/') || mime === 'application/ogg';
  if (!isVideo) return fail('That link is not a video');

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) return fail('The video came back empty');
  if (buffer.length > MAX_BYTES) return fail('Video is too large (120 MB limit)');

  const ext = EXT[mime] ?? '.mp4';
  const base = slugify(String(body.title ?? 'stock clip')) || 'stock-clip';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-stock-${base}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  const provider = String(body.provider ?? 'stock').slice(0, 40);
  const license = String(body.license ?? 'free').slice(0, 40);
  const creator = String(body.creator ?? '').slice(0, 100);
  const title = String(body.title ?? 'Stock clip').slice(0, 120);
  const note = [creator, provider, license].filter(Boolean).join(' · ');

  const id = createMedia({
    title,
    filename,
    originalName: `${base}${ext}`,
    mime,
    size: buffer.length,
    width: Number(body.width) > 0 ? Number(body.width) : null,
    height: Number(body.height) > 0 ? Number(body.height) : null,
    alt: note ? `${title} – ${note}` : title,
    tags: ['stock', 'video', license, provider].filter(Boolean),
    groupId: null,
    variantLabel: '',
  });

  const media = listMedia().find((item) => item.id === id);
  return ok({ media }, 201);
}
