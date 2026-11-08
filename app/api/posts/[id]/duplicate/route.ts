import { fail, ok } from '@/lib/api';
import { duplicatePost } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const post = duplicatePost(Number(id));
  if (!post) return fail('Post not found', 404);
  return ok({ post }, 201);
}
