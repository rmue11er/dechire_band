import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteDocument, getDocument, updateDocument } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const document = getDocument(toInt(id));
  if (!document) return fail('Document not found', 404);
  return ok({ document });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const documentId = toInt(id);
  if (!getDocument(documentId)) return fail('Document not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const document = updateDocument(documentId, {
    title: typeof body.title === 'string' ? body.title.slice(0, 160) : undefined,
    kind: typeof body.kind === 'string' ? body.kind : undefined,
    folderId: body.folderId === undefined ? undefined : body.folderId ? Number(body.folderId) : null,
    songId: body.songId === undefined ? undefined : body.songId ? Number(body.songId) : null,
    content: typeof body.content === 'string' ? body.content : undefined,
    plainText: typeof body.plainText === 'string' ? body.plainText : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
  });
  return ok({ document });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteDocument(toInt(id));
  return ok({ ok: true });
}
