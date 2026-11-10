import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { fail, ok, slugify } from '@/lib/api';
import { UPLOAD_DIR } from '@/lib/db';
import { createMedia, listFolders, listGroups, listMedia, listSongs } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE = 80 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/webm': '.weba',
};

/** Browsers sometimes hand over `application/octet-stream` – the extension knows better. */
const EXT_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.weba': 'audio/webm',
};

function isFile(value: any): value is File {
  return value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && 'name' in value;
}

export async function GET() {
  return ok({ media: listMedia(), groups: listGroups(), folders: listFolders(), songs: listSongs() });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Could not read the upload');
  }

  const incoming = [...form.getAll('files'), ...form.getAll('file')].filter(isFile);
  if (!incoming.length) return fail('No file received');

  const groupRaw = form.get('groupId');
  const groupId = groupRaw && String(groupRaw) !== '' && String(groupRaw) !== 'null' ? Number(groupRaw) : null;
  const folderRaw = form.get('folderId');
  const folderId =
    folderRaw && String(folderRaw) !== '' && String(folderRaw) !== 'null' ? Number(folderRaw) : null;
  const songRaw = form.get('songId');
  const songId = songRaw && String(songRaw) !== '' && String(songRaw) !== 'null' ? Number(songRaw) : null;
  const titleField = String(form.get('title') ?? '').trim();
  const variantField = String(form.get('variantLabel') ?? '').trim();
  const altField = String(form.get('alt') ?? '').trim();
  const kindField = String(form.get('kind') ?? '').trim();
  const tags = String(form.get('tags') ?? '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);

  const created: any[] = [];
  const skipped: string[] = [];

  for (const file of incoming) {
    if (file.size > MAX_SIZE) {
      skipped.push(`${file.name} (too large)`);
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase() || MIME_EXT[file.type] || '';
    const mime =
      file.type && file.type !== 'application/octet-stream'
        ? file.type
        : EXT_MIME[ext] ?? 'application/octet-stream';
    const base = slugify(path.basename(file.name, path.extname(file.name))) || 'datei';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    let width: number | null = null;
    let height: number | null = null;
    try {
      const size = imageSize(buffer);
      width = size.width ?? null;
      height = size.height ?? null;
    } catch {
      /* Video or unknown format */
    }

    const id = createMedia({
      title: incoming.length === 1 && titleField ? titleField : base.replace(/-/g, ' '),
      filename,
      originalName: file.name,
      mime,
      size: file.size,
      width,
      height,
      alt: altField,
      tags: [...tags, ...(kindField ? [kindField] : [])],
      groupId: Number.isFinite(groupId as number) ? groupId : null,
      folderId: Number.isFinite(folderId as number) ? folderId : null,
      songId: Number.isFinite(songId as number) ? songId : null,
      variantLabel: incoming.length === 1 ? variantField : '',
    });
    created.push(id);
  }

  return ok(
    {
      media: listMedia().filter((item) => created.includes(item.id)),
      groups: listGroups(),
      folders: listFolders(),
      songs: listSongs(),
      skipped,
    },
    201
  );
}
