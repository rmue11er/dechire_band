import { fail, ok, readJson } from '@/lib/api';
import { createRelease, getRelease, listReleaseTasks, listReleases } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TYPES = ['single', 'ep', 'album', 'video'];

export async function GET() {
  return ok({ releases: listReleases() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const title = String(body.title ?? '').trim();
  const releaseDate = String(body.releaseDate ?? '').trim();
  if (!title) return fail('Title is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return fail('A release date is required');

  const id = createRelease({
    title: title.slice(0, 140),
    type: TYPES.includes(body.type) ? body.type : 'single',
    releaseDate,
    presaveUrl: String(body.presaveUrl ?? '').slice(0, 500),
    notes: String(body.notes ?? ''),
    announceDate: null,
  });

  const release = getRelease(id);
  return ok({ release, tasks: listReleaseTasks(id) }, 201);
}
