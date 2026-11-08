import { fail, ok, readJson, toInt } from '@/lib/api';
import { bestTimeInsight, getPost, listMetrics, saveMetrics } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const number = (value: any) => (Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId');
  if (postId) {
    return ok({ metrics: listMetrics(toInt(postId)) });
  }
  return ok({ insight: bestTimeInsight() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const postId = toInt(body.postId);
  if (!postId || !getPost(postId)) return fail('Post not found', 404);

  const metrics = saveMetrics({
    postId,
    source: body.source === 'instagram' ? 'instagram' : 'manual',
    reach: number(body.reach),
    likes: number(body.likes),
    comments: number(body.comments),
    saves: number(body.saves),
    shares: number(body.shares),
  });
  return ok({ metrics }, 201);
}
