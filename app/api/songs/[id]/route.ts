import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteSong, getSong, updateSong } from '@/lib/repo';
import { SONG_STATUS } from '@/lib/songs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = new Set<string>(SONG_STATUS.map((entry) => entry.value));

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const song = getSong(toInt(id));
  if (!song) return fail('Song not found', 404);
  return ok({ song });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const songId = toInt(id);
  if (!getSong(songId)) return fail('Song not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (typeof body.title === 'string') {
    const title = body.title.trim();
    if (!title) return fail('Title is required');
    patch.title = title.slice(0, 160);
  }
  if (typeof body.status === 'string' && STATUSES.has(body.status)) patch.status = body.status;
  if (body.songKey !== undefined) patch.songKey = String(body.songKey ?? '').trim().slice(0, 24);
  if (body.bpm !== undefined) {
    const bpm = body.bpm == null || body.bpm === '' ? null : Number(body.bpm);
    patch.bpm = bpm != null && Number.isFinite(bpm) ? Math.max(0, Math.min(400, Math.round(bpm))) : null;
  }
  if (body.duration !== undefined) {
    const duration = body.duration == null || body.duration === '' ? null : Number(body.duration);
    patch.duration =
      duration != null && Number.isFinite(duration)
        ? Math.max(0, Math.min(3600, Math.round(duration)))
        : null;
  }
  if (body.notes !== undefined) patch.notes = String(body.notes ?? '').slice(0, 4000);

  const song = updateSong(songId, patch);
  return ok({ song });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const songId = toInt(id);
  if (!getSong(songId)) return fail('Song not found', 404);
  deleteSong(songId);
  return ok({ ok: true });
}
