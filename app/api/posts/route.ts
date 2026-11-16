import { fail, ok, readJson } from '@/lib/api';
import { createPost, getMedia, getPost, listPosts } from '@/lib/repo';
import type { PostPlatform } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TYPES = ['photo', 'carousel', 'reel', 'story'];
const STATUS = ['draft', 'scheduled', 'published'];
const PLATFORMS: PostPlatform[] = ['instagram', 'tiktok', 'both'];

export async function GET() {
  return ok({ posts: listPosts() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  if (!body || typeof body !== 'object') return fail('Invalid request');

  const platform: PostPlatform = PLATFORMS.includes(body.platform) ? body.platform : 'instagram';
  const videoOnly = platform !== 'instagram';
  const type = videoOnly ? 'reel' : TYPES.includes(body.type) ? body.type : 'photo';
  const status = STATUS.includes(body.status) ? body.status : 'draft';
  const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.map(Number).filter(Boolean) : [];

  if (videoOnly) {
    const media = mediaIds.map((id) => getMedia(id)).filter(Boolean);
    if (media.length !== 1 || !media[0].mime.startsWith('video/')) {
      return fail(
        platform === 'both'
          ? 'Instagram + TikTok needs exactly one video (it becomes a Reel and a TikTok)'
          : 'TikTok posts need exactly one video',
        400
      );
    }
  }

  const id = createPost({ ...body, platform, type, status, mediaIds });
  return ok({ post: getPost(id) }, 201);
}
