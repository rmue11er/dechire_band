import { fail, ok, readJson } from '@/lib/api';
import { createDocument, listDocFolders, listDocuments, listSongs } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get('kind');
  const documents = kind ? listDocuments().filter((document) => document.kind === kind) : listDocuments();
  return ok({ documents, folders: listDocFolders(), songs: listSongs() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const title = String(body.title ?? '').trim();
  if (!title) return fail('Title is required');

  const document = createDocument({
    title: title.slice(0, 160),
    kind: body.kind || 'other',
    folderId: body.folderId ? Number(body.folderId) : null,
    songId: body.songId ? Number(body.songId) : null,
    content: String(body.content ?? '<p></p>'),
    plainText: String(body.plainText ?? ''),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
  });
  return ok({ document }, 201);
}
