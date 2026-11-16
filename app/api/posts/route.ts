import { fail, ok, readJson } from '@/lib/api';
import { createPost, getMedia, getPost, listPosts } from '@/lib/repo';

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

  const platform = body.platform === 'tiktok' ? 'tiktok' : 'instagram';
  const type = platform === 'tiktok' ? 'reel' : TYPES.includes(body.type) ? body.type : 'photo';
  const status = STATUS.includes(body.status) ? body.status : 'draft';
  const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.map(Number).filter(Boolean) : [];

  if (platform === 'tiktok') {
    const media = mediaIds.map((id) => getMedia(id)).filter(Boolean);
    if (media.length !== 1 || !media[0].mime.startsWith('video/')) {
      return fail('TikTok posts need exactly one video', 400);
    }
  }

  const id = createPost({ ...body, platform, type, status, mediaIds });
  return ok({ post: getPost(id) }, 201);
}
