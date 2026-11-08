import { fail, ok, readJson, toInt } from '@/lib/api';
import { deletePost, getPost, updatePost } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TYPES = ['photo', 'carousel', 'reel', 'story'];
const STATUS = ['draft', 'scheduled', 'published'];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const post = getPost(toInt(id));
  if (!post) return fail('Post not found', 404);
  return ok({ post });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const postId = toInt(id);
  if (!getPost(postId)) return fail('Post not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = { ...body };
  if (patch.type !== undefined && !TYPES.includes(patch.type)) delete patch.type;
  if (patch.status !== undefined && !STATUS.includes(patch.status)) delete patch.status;
  if (patch.mediaIds !== undefined) {
    patch.mediaIds = Array.isArray(patch.mediaIds) ? patch.mediaIds.map(Number).filter(Boolean) : [];
  }

  updatePost(postId, patch);
  return ok({ post: getPost(postId) });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deletePost(toInt(id));
  return ok({ ok: true });
}
