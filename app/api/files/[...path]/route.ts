import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Ctx) {
  const { path: parts } = await params;
  const filename = path.basename(parts.join('/'));
  if (!filename || filename.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const row = queryOne<{ filename: string; original_name: string; mime: string }>(
    'SELECT filename, original_name, mime FROM media WHERE filename = ?',
    [filename]
  );
  if (!row) return new Response('Not found', { status: 404 });

  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, row.filename));
    const headers: Record<string, string> = {
      'Content-Type': row.mime || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
    };
    if (new URL(request.url).searchParams.get('download')) {
      const ascii = row.original_name.replace(/[^\x20-\x7E]/g, '_');
      headers['Content-Disposition'] = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(
        row.original_name
      )}`;
    }

    // Range requests let the audio player seek inside a demo instead of reloading it.
    const range = request.headers.get('range');
    const match = range?.match(/^bytes=(\d*)-(\d*)$/);
    if (match && data.length) {
      const start = match[1] ? Number(match[1]) : Math.max(0, data.length - Number(match[2] || 0));
      const end = match[2] && match[1] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
      if (start <= end && start < data.length) {
        headers['Content-Range'] = `bytes ${start}-${end}/${data.length}`;
        headers['Content-Length'] = String(end - start + 1);
        return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers });
      }
    }

    return new Response(new Uint8Array(data), { headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
