import { fail, ok, readJson, toInt } from '@/lib/api';
import { createNote, listNotes } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ notes: listNotes() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const note = createNote({
    title: body.title || 'Ohne Titel',
    content: body.content || '<p></p>',
    plainText: body.plainText || '',
    folder: body.folder || 'General',
    tags: Array.isArray(body.tags) ? body.tags : [],
    pinned: Boolean(body.pinned),
  });
  return ok({ note }, 201);
}
