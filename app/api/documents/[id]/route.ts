import { fail, ok, readJson, toInt, toOptionalId } from '@/lib/api';
import { deleteDocument, getDocument, getSong, updateDocument } from '@/lib/repo';

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
  const songId = body.songId === undefined ? undefined : toOptionalId(body.songId);
  if (songId === false || (songId !== undefined && songId !== null && !getSong(songId)))
    return fail('Song not found');
  const document = updateDocument(documentId, {
    title: typeof body.title === 'string' ? body.title.slice(0, 160) : undefined,
    kind: typeof body.kind === 'string' ? body.kind : undefined,
    folderId: body.folderId === undefined ? undefined : body.folderId ? Number(body.folderId) : null,
    songId,
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
