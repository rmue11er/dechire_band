import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteSnippet, getSnippet, updateSnippet } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const snippetId = toInt(id);
  if (!getSnippet(snippetId)) return fail('Snippet not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const snippet = updateSnippet(snippetId, {
    kind: ['caption', 'hashtags', 'hook'].includes(String(body.kind)) ? String(body.kind) : undefined,
    label: typeof body.label === 'string' ? body.label.slice(0, 90) : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
  });
  return ok({ snippet });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteSnippet(toInt(id));
  return ok({ ok: true });
}
