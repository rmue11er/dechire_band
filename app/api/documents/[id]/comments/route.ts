import { fail, ok, toInt } from '@/lib/api';
import { getDocument, listDocumentComments } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const documentId = toInt(id);
  if (!getDocument(documentId)) return fail('Document not found', 404);
  return ok({ comments: listDocumentComments(documentId) });
}