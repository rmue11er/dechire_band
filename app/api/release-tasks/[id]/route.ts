import { fail, ok, readJson, toInt } from '@/lib/api';
import { getReleaseTask, updateReleaseTask } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const taskId = toInt(id);
  if (!getReleaseTask(taskId)) return fail('Task not found', 404);

  const body = await readJson<Record<string, any>>(request);
  updateReleaseTask(taskId, {
    done: typeof body.done === 'boolean' ? body.done : undefined,
    postId: body.postId === undefined ? undefined : body.postId ? Number(body.postId) : null,
    documentId: body.documentId === undefined ? undefined : body.documentId ? Number(body.documentId) : null,
  });
  return ok({ task: getReleaseTask(taskId) });
}
