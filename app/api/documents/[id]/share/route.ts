import { fail, ok, readJson, toInt } from '@/lib/api';
import { getDocument, shareDocument, unshareDocument } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Creates the public link (or keeps the current one). */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const documentId = toInt(id);
  if (!getDocument(documentId)) return fail('Document not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const document = shareDocument(documentId, Boolean(body.rotate));
  if (!document) return fail('Could not share the document', 400);
  return ok({ document });
}

/** Revokes the link – anyone holding it gets a 404 afterwards. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const document = unshareDocument(toInt(id));
  if (!document) return fail('Document not found', 404);
  return ok({ document });
}
