import { fail, ok } from '@/lib/api';
import { getReelJob } from '@/lib/reelJobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const job = getReelJob(id);
  if (!job) return fail('Render job not found', 404);
  return ok({ job });
}
