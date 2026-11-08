import { fail, ok, readJson } from '@/lib/api';
import { createPost, getPost, listPosts } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TYPES = ['photo', 'carousel', 'reel', 'story'];
const STATUS = ['draft', 'scheduled', 'published'];

export async function GET() {
  return ok({ posts: listPosts() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  if (!body || typeof body !== 'object') return fail('Invalid request');

  const type = TYPES.includes(body.type) ? body.type : 'photo';
  const status = STATUS.includes(body.status) ? body.status : 'draft';
  const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.map(Number).filter(Boolean) : [];

  const id = createPost({ ...body, type, status, mediaIds });
  return ok({ post: getPost(id) }, 201);
}
