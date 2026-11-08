import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteMilestone, getMilestone, updateMilestone } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const milestone = getMilestone(toInt(id));
  if (!milestone) return fail('Milestone not found', 404);
  return ok({ milestone });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const milestoneId = toInt(id);
  if (!getMilestone(milestoneId)) return fail('Milestone not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const milestone = updateMilestone(milestoneId, {
    title: typeof body.title === 'string' ? body.title.slice(0, 160) : undefined,
    date: typeof body.date === 'string' ? body.date : undefined,
    kind: typeof body.kind === 'string' ? body.kind : undefined,
    note: typeof body.note === 'string' ? body.note : undefined,
    done: typeof body.done === 'boolean' ? body.done : undefined,
  });
  return ok({ milestone });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteMilestone(toInt(id));
  return ok({ ok: true });
}
