import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteNote, getNote, updateNote } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const note = getNote(toInt(id));
  if (!note) return fail('Note not found', 404);
  return ok({ note });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const noteId = toInt(id);
  if (!getNote(noteId)) return fail('Note not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const note = updateNote(noteId, {
    title: typeof body.title === 'string' ? body.title : undefined,
    content: typeof body.content === 'string' ? body.content : undefined,
    plainText: typeof body.plainText === 'string' ? body.plainText : undefined,
    folder: typeof body.folder === 'string' ? body.folder : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    pinned: typeof body.pinned === 'boolean' ? body.pinned : undefined,
  });
  return ok({ note });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteNote(toInt(id));
  return ok({ ok: true });
}
