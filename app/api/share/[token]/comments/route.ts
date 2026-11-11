import { fail, ok, readJson } from '@/lib/api';
import { createDocumentComment, getDocumentByShareToken, listDocumentComments } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ token: string }> };

/** Public comments need a brake – one shared link should not become a spam target. */
const WINDOW = 10 * 60 * 1000;
const LIMIT = 8;
const hits = new Map<string, number[]>();

const clientKey = (request: Request, token: string) => {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
  return `${token}:${ip}`;
};

const allow = (key: string) => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 400) {
    for (const [entry, times] of hits) {
      if (!times.some((time) => now - time < WINDOW)) hits.delete(entry);
    }
  }
  return true;
};

/** Keeps comments plain text: React escapes on render, this just trims and strips control characters. */
const clean = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);

export async function GET(_request: Request, { params }: Ctx) {
  const { token } = await params;
  const document = getDocumentByShareToken(token);
  if (!document) return fail('Document not found', 404);
  return ok({ comments: listDocumentComments(document.id) });
}

export async function POST(request: Request, { params }: Ctx) {
  const { token } = await params;
  const document = getDocumentByShareToken(token);
  if (!document) return fail('Document not found', 404);

  if (!allow(clientKey(request, token))) {
    return fail('Too many comments – please wait a few minutes.', 429);
  }

  const body = await readJson<Record<string, any>>(request);
  // Honeypot – real readers never fill this hidden field.
  if (String(body.website ?? '').trim()) return fail('Comment rejected', 400);

  const text = clean(body.body, 2000);
  if (text.length < 2) return fail('Write a comment first.', 400);

  const comment = createDocumentComment(document.id, {
    author: clean(body.author, 60) || 'anonymous',
    body: text,
  });
  return ok({ comment }, 201);
}