import { fail, ok, readJson } from '@/lib/api';
import { listMedia, moveMedia } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Bulk move: one drag can drop several selected files into a folder. */
export async function POST(request: Request) {
  const body = await readJson<{ ids?: number[]; folderId?: number | null }>(request);
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((id) => Number.isFinite(id) && id > 0) : [];
  if (!ids.length) return fail('No files given');

  const folderId = body.folderId == null ? null : Number(body.folderId);
  moveMedia(ids, Number.isFinite(folderId as number) ? folderId : null);
  return ok({ media: listMedia() });
}
