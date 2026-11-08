import { fail, ok, readJson } from '@/lib/api';
import { listPosts, reorderPosts, sortPostsByDate } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await readJson<{ ids?: number[]; action?: string }>(request);

  if (body.action === 'sort-by-date') {
    sortPostsByDate();
    return ok({ posts: listPosts() });
  }

  if (!Array.isArray(body.ids)) return fail('ids missing');
  reorderPosts(body.ids.map(Number).filter(Boolean));
  return ok({ posts: listPosts() });
}
