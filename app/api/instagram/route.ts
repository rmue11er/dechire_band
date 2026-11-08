import { fail, ok, readJson, toInt } from '@/lib/api';
import { fetchInsights, isLive, publish, testConnection } from '@/lib/instagram';
import { getConnection, getPost, listPosts, saveConnection, saveMetrics } from '@/lib/repo';
import { getMedia } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const connection = getConnection();
  return ok({
    connection: {
      accountId: connection.accountId,
      username: connection.username,
      publicBase: connection.publicBase,
      sandbox: connection.sandbox,
      tokenExpiresAt: connection.tokenExpiresAt,
      hasToken: Boolean(connection.token),
      live: isLive(connection),
    },
  });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const action = String(body.action ?? '');
  const connection = getConnection();

  if (action === 'save') {
    const saved = saveConnection({
      accountId: String(body.accountId ?? '').trim(),
      username: String(body.username ?? '').replace(/^@/, '').trim(),
      token: typeof body.token === 'string' && body.token.trim() ? body.token.trim() : connection.token,
      publicBase: String(body.publicBase ?? '').trim(),
      sandbox: body.sandbox === undefined ? connection.sandbox : Boolean(body.sandbox),
    });
    return ok({ connection: { ...saved, token: undefined, hasToken: Boolean(saved.token) }, live: isLive(saved) });
  }

  if (action === 'disconnect') {
    const saved = saveConnection({ accountId: '', username: '', token: '', publicBase: '', sandbox: true });
    return ok({ connection: { ...saved, token: undefined, hasToken: false }, live: false });
  }

  if (action === 'test') {
    if (!connection.sandbox && !isLive(connection)) {
      return fail('Live mode needs an account id and an access token first', 400);
    }
    const result = await testConnection(connection);
    if (!result.ok) return fail(result.error, 400);
    if (!result.sandbox && result.data.username) {
      saveConnection({ username: result.data.username });
    }
    return ok({ result: result.data, sandbox: result.sandbox });
  }

  if (action === 'publish') {
    if (!connection.sandbox && !isLive(connection)) {
      return fail('Live mode needs an account id and an access token first', 400);
    }
    const postId = toInt(body.postId);
    const post = postId ? getPost(postId) : null;
    if (!post) return fail('Post not found', 404);
    if (!post.media.length) return fail('This post has no media');

    const images = post.media
      .filter((item) => item.mime.startsWith('image/'))
      .map((item) => item.url);
    if (!images.length) return fail('Only image posts can be published through the API');

    const caption = [post.caption, post.firstComment ? `\n\n${post.firstComment}` : ''].join('').trim();
    const result = await publish(connection, {
      images,
      caption,
      kind: post.type === 'carousel' ? 'carousel' : post.type,
    });
    if (!result.ok) return fail(result.error, 400);

    const { updatePost } = await import('@/lib/repo');
    updatePost(post.id, {
      status: 'published',
      publishedAt: new Date().toISOString(),
      igMediaId: result.data.mediaId,
      igPermalink: result.data.permalink,
      igPublishedAt: new Date().toISOString(),
    });
    return ok({ published: result.data, sandbox: result.sandbox, post: getPost(post.id) });
  }

  if (action === 'sync') {
    if (!connection.sandbox && !isLive(connection)) {
      return fail('Live mode needs an account id and an access token first', 400);
    }
    const postId = toInt(body.postId);
    const targets = postId
      ? [getPost(postId)].filter(Boolean)
      : listPosts().filter((post) => post.status === 'published' && post.igMediaId);

    const results: any[] = [];
    for (const post of targets) {
      if (!post || !post.igMediaId) continue;
      const insights = await fetchInsights(connection, post.igMediaId);
      if (!insights.ok) {
        results.push({ postId: post.id, error: insights.error });
        continue;
      }
      const metrics = saveMetrics({ postId: post.id, source: 'instagram', ...insights.data });
      results.push({ postId: post.id, metrics, sandbox: insights.sandbox });
    }

    if (!results.length) return fail('No published post with an Instagram id yet', 400);
    return ok({ results });
  }

  if (action === 'media-preview') {
    const mediaId = toInt(body.mediaId);
    const media = mediaId ? getMedia(mediaId) : null;
    if (!media) return fail('Media not found', 404);
    return ok({ url: media.url, publicBase: connection.publicBase });
  }

  return fail('Unknown action', 400);
}
