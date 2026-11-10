import { fail, ok, readJson } from '@/lib/api';
import { createVideoProject, listVideoProjects } from '@/lib/repo';
import { VIDEO_STATUS } from '@/lib/videos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = new Set<string>(VIDEO_STATUS.map((entry) => entry.value));

export async function GET() {
  return ok({ videos: listVideoProjects() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const title = String(body.title ?? '').trim();
  if (!title) return fail('Title is required');
  const video = createVideoProject({
    title: title.slice(0, 160),
    songId: body.songId ? Number(body.songId) : null,
    audioMediaId: body.audioMediaId ? Number(body.audioMediaId) : null,
    treatmentDocId: body.treatmentDocId ? Number(body.treatmentDocId) : null,
    status: STATUSES.has(String(body.status)) ? String(body.status) : 'idea',
    shootDate: String(body.shootDate ?? '').slice(0, 10),
    location: String(body.location ?? '').slice(0, 160),
    director: String(body.director ?? '').slice(0, 120),
    notes: String(body.notes ?? '').slice(0, 4000),
  });
  return ok({ video }, 201);
}
