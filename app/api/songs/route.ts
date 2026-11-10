import { fail, ok, readJson } from '@/lib/api';
import { createSong, listSongs } from '@/lib/repo';
import { SONG_STATUS } from '@/lib/songs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = new Set<string>(SONG_STATUS.map((entry) => entry.value));

export async function GET() {
  return ok({ songs: listSongs() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const title = String(body.title ?? '').trim();
  if (!title) return fail('Title is required');
  const status = STATUSES.has(String(body.status)) ? String(body.status) : 'idea';
  const bpmRaw = body.bpm == null || body.bpm === '' ? null : Number(body.bpm);
  const durationRaw = body.duration == null || body.duration === '' ? null : Number(body.duration);

  const song = createSong({
    title: title.slice(0, 160),
    status,
    songKey: String(body.songKey ?? '').trim().slice(0, 24),
    bpm: bpmRaw != null && Number.isFinite(bpmRaw) ? Math.max(0, Math.min(400, Math.round(bpmRaw))) : null,
    duration:
      durationRaw != null && Number.isFinite(durationRaw)
        ? Math.max(0, Math.min(3600, Math.round(durationRaw)))
        : null,
    notes: String(body.notes ?? '').slice(0, 4000),
  });
  return ok({ song }, 201);
}
