import { fail, ok, readJson } from '@/lib/api';
import { createSnippet, listSnippets } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KINDS = ['caption', 'hashtags', 'hook'];

export async function GET() {
  return ok({ snippets: listSnippets() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const body_ = String(body.body ?? '').trim();
  if (!body_) return fail('A snippet needs text');

  const snippet = createSnippet({
    kind: KINDS.includes(String(body.kind)) ? String(body.kind) : 'caption',
    label: String(body.label ?? '').trim().slice(0, 90) || body_.slice(0, 40),
    body: body_,
  });
  return ok({ snippet }, 201);
}
