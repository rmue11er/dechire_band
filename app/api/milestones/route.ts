import { fail, ok, readJson } from '@/lib/api';
import { createMilestone, listMilestones } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ milestones: listMilestones() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const title = String(body.title ?? '').trim();
  if (!title) return fail('Title is required');
  if (!body.date) return fail('Date is required');

  const milestone = createMilestone({
    title: title.slice(0, 160),
    date: String(body.date),
    kind: body.kind || 'other',
    note: String(body.note ?? ''),
  });
  return ok({ milestone }, 201);
}
