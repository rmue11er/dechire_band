import type { InstagramConnection } from './types';

/**
 * Instagram publishing + insights via the Meta Graph API.
 *
 * Real publishing needs (a) an Instagram *business* account linked to a Facebook
 * page, (b) a Meta app with the `instagram_content_publish` / `instagram_manage_insights`
 * permissions and (c) **publicly reachable media URLs** – the API fetches the image
 * itself, so a localhost URL cannot work. `publicBase` holds that public prefix
 * (for example a Cloudflare tunnel or your own domain).
 *
 * Without credentials everything runs in `sandbox` mode: the same code paths,
 * simulated responses, clearly labelled in the UI.
 */

export const GRAPH_VERSION = 'v21.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type IgResult<T> = { ok: boolean; data?: T; error?: string; sandbox: boolean };

const isConfigured = (conn: InstagramConnection) => Boolean(conn.accountId && conn.token);

export const isLive = (conn: InstagramConnection) => !conn.sandbox && isConfigured(conn);

export function publicUrl(conn: InstagramConnection, fileUrl: string) {
  if (!conn.publicBase) return null;
  return `${conn.publicBase.replace(/\/+$/, '')}${fileUrl}`;
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(params);
  const response = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    const message = payload?.error?.message ?? `Graph API error (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params);
  const response = await fetch(`${GRAPH}${path}?${query.toString()}`, { cache: 'no-store' });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    const message = payload?.error?.message ?? `Graph API error (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

/* --------------------------------------------------------------------- test */

export async function testConnection(
  conn: InstagramConnection
): Promise<IgResult<{ username: string; followers?: number }>> {
  if (!isLive(conn)) {
    return { ok: true, sandbox: true, data: { username: conn.username || 'sandbox.band', followers: 4218 } };
  }
  try {
    const data = await graphGet<any>(`/${conn.accountId}`, {
      fields: 'username,followers_count',
      access_token: conn.token,
    });
    return {
      ok: true,
      sandbox: false,
      data: { username: data.username ?? conn.username, followers: data.followers_count },
    };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'Could not reach Instagram' };
  }
}

/* ------------------------------------------------------------------ publish */

export type PublishInput = {
  /** Public URLs, first one is the cover. */
  images: string[];
  caption: string;
  /** 'photo' | 'carousel' | 'reel' | 'story' */
  kind: string;
};

export type PublishResult = { mediaId: string; permalink: string | null; sandbox: boolean };

export async function publish(conn: InstagramConnection, input: PublishInput): Promise<IgResult<PublishResult>> {
  if (!input.images.length) return { ok: false, sandbox: !isLive(conn), error: 'The post has no media' };

  if (!isLive(conn)) {
    const fake = `sandbox_${Date.now().toString(36)}`;
    return {
      ok: true,
      sandbox: true,
      data: { mediaId: fake, permalink: `https://instagram.com/p/${fake}`, sandbox: true },
    };
  }

  if (!conn.publicBase) {
    return {
      ok: false,
      sandbox: false,
      error:
        'Instagram needs a public URL for the media. Set a public base URL (tunnel or domain) in the Instagram settings.',
    };
  }

  const urls = input.images
    .map((item) => publicUrl(conn, item))
    .filter((item): item is string => Boolean(item));
  if (urls.length !== input.images.length) {
    return { ok: false, sandbox: false, error: 'Some media URLs could not be made public' };
  }

  if (input.kind === 'story') {
    // Stories are not part of content publishing via this endpoint.
    return { ok: false, sandbox: false, error: 'Stories cannot be published through the API – use the ZIP export.' };
  }

  try {
    let creationId: string;

    if (urls.length === 1) {
      const created = await graph<{ id: string }>(`/${conn.accountId}/media`, {
        image_url: urls[0],
        caption: input.caption,
        access_token: conn.token,
      });
      creationId = created.id;
    } else {
      const children: string[] = [];
      for (const url of urls) {
        const item = await graph<{ id: string }>(`/${conn.accountId}/media`, {
          image_url: url,
          is_carousel_item: 'true',
          access_token: conn.token,
        });
        children.push(item.id);
      }
      const parent = await graph<{ id: string }>(`/${conn.accountId}/media`, {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption: input.caption,
        access_token: conn.token,
      });
      creationId = parent.id;
    }

    const published = await graph<{ id: string }>(`/${conn.accountId}/media_publish`, {
      creation_id: creationId,
      access_token: conn.token,
    });

    let permalink: string | null = null;
    try {
      const detail = await graphGet<any>(`/${published.id}`, { fields: 'permalink', access_token: conn.token });
      permalink = detail.permalink ?? null;
    } catch {
      /* permalink is a nice to have */
    }

    return { ok: true, sandbox: false, data: { mediaId: published.id, permalink, sandbox: false } };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'Publishing failed' };
  }
}

/* ----------------------------------------------------------------- insights */

export type Insights = { reach: number; likes: number; comments: number; saves: number; shares: number };

const METRICS = ['reach', 'likes', 'comments', 'saves', 'shares'];

export async function fetchInsights(conn: InstagramConnection, mediaId: string): Promise<IgResult<Insights>> {
  if (!isLive(conn)) {
    // deterministic-ish sandbox numbers so the UI can be judged
    const seed = [...mediaId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const reach = 900 + (seed % 3200);
    return {
      ok: true,
      sandbox: true,
      data: {
        reach,
        likes: Math.round(reach * 0.11),
        comments: Math.round(reach * 0.012),
        saves: Math.round(reach * 0.02),
        shares: Math.round(reach * 0.009),
      },
    };
  }

  try {
    const data = await graphGet<any>(`/${mediaId}/insights`, {
      metric: METRICS.join(','),
      access_token: conn.token,
    });
    const result: Insights = { reach: 0, likes: 0, comments: 0, saves: 0, shares: 0 };
    for (const entry of data.data ?? []) {
      const name = String(entry.name ?? '') as keyof Insights;
      if (!(name in result)) continue;
      const value =
        entry.total_value?.value ??
        entry.values?.[entry.values.length - 1]?.value ??
        (typeof entry.value === 'number' ? entry.value : 0);
      result[name] = Number(value ?? 0);
    }
    return { ok: true, sandbox: false, data: result };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'Could not load insights' };
  }
}

/** Long-lived token exchange (60 days) – keeps the connection alive. */
export async function refreshToken(conn: InstagramConnection): Promise<IgResult<{ token: string; expiresAt: string }>> {
  if (!isLive(conn)) return { ok: false, sandbox: true, error: 'Sandbox mode – nothing to refresh' };
  try {
    const data = await graphGet<any>('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_secret: process.env.META_APP_SECRET ?? '',
      fb_exchange_token: conn.token,
    });
    return {
      ok: true,
      sandbox: false,
      data: { token: data.access_token, expiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString() },
    };
  } catch (error: any) {
    return { ok: false, sandbox: false, error: error.message ?? 'Token refresh failed' };
  }
}
