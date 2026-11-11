import { fail, ok, toInt } from '@/lib/api';
import { deleteDocumentComment } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const comment = deleteDocumentComment(toInt(id));
  if (!comment) return fail('Comment not found', 404);
  return ok({ ok: true });
}