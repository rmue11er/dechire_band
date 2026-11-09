import { fail, ok, toInt } from '@/lib/api';
import { getRelease, listReleaseTasks, restorePlaybook } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Adds the researched playbook steps that are missing (e.g. after deleting them). */
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const releaseId = toInt(id);
  if (!getRelease(releaseId)) return fail('Release not found', 404);

  const added = restorePlaybook(releaseId);
  return ok({ added, tasks: listReleaseTasks(releaseId) });
}
