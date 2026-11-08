import { fail, ok, readJson } from '@/lib/api';
import { createDocument, listDocuments } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ documents: listDocuments() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const title = String(body.title ?? '').trim();
  if (!title) return fail('Title is required');

  const document = createDocument({
    title: title.slice(0, 160),
    kind: body.kind || 'other',
    status: body.status === 'final' ? 'final' : 'draft',
    content: String(body.content ?? '<p></p>'),
    plainText: String(body.plainText ?? ''),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
  });
  return ok({ document }, 201);
}
