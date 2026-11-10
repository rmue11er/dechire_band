import { fail, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Free stock videos for the reel machine.
 *
 * Preferred provider: Pexels (free for commercial use, no attribution needed).
 * Set `PEXELS_API_KEY` – a free key takes a minute on pexels.com/api.
 *
 * Without a key the route falls back to Wikimedia Commons, which needs no key.
 * Only CC0, public domain and plain CC BY clips are returned (no NC/ND/SA),
 * with the author kept next to the file so credit is possible.
 */

const UA = 'DECHIRE-BandHQ/1.0 (band reel lab)';
const PAGE_SIZE = 18;
const MAX_SECONDS = 30;
const MAX_BYTES = 80 * 1024 * 1024;

export type StockVideo = {
  id: string;
  title: string;
  thumb: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  creator: string;
  provider: string;
  license: string;
};

type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const TTL = 10 * 60 * 1000;

function stripHtml(value: unknown) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function freeLicense(value: string) {
  const license = value.toLowerCase();
  if (license.includes('cc0') || license.includes('public domain')) return true;
  if (!license.includes('cc by')) return false;
  return !license.includes('-sa') && !license.includes('nc') && !license.includes('nd');
}

async function searchPexels(query: string, page: number, key: string) {
  const target = new URL('https://api.pexels.com/videos/search');
  target.searchParams.set('query', query);
  target.searchParams.set('per_page', String(PAGE_SIZE));
  target.searchParams.set('page', String(page));
  target.searchParams.set('orientation', 'portrait');
  target.searchParams.set('min_duration', '3');
  target.searchParams.set('max_duration', String(MAX_SECONDS));

  const response = await fetch(target, {
    headers: { Authorization: key, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Pexels answered ${response.status}`);
  }
  const data: any = await response.json();

  const results: StockVideo[] = (data.videos ?? [])
    .map((video: any): StockVideo | null => {
      const files = (video.video_files ?? [])
        .filter((file: any) => file?.link && String(file.file_type ?? '').includes('mp4'))
        .sort((a: any, b: any) => {
          const widthA = Number(a.width ?? 0);
          const widthB = Number(b.width ?? 0);
          return Math.abs(widthA - 1080) - Math.abs(widthB - 1080);
        });
      const file = files[0];
      if (!file) return null;
      return {
        id: `pexels-${video.id}`,
        title: String(video.title ?? 'Stock clip').replace(/\s+/g, ' ').trim().slice(0, 120),
        thumb: String(video.image ?? ''),
        url: String(file.link),
        width: Number(file.width ?? video.width ?? 0),
        height: Number(file.height ?? video.height ?? 0),
        duration: Number(video.duration ?? 0),
        creator: String(video.user?.name ?? '').slice(0, 80),
        provider: 'Pexels',
        license: 'Pexels License',
      };
    })
    .filter(Boolean) as StockVideo[];

  return {
    results,
    page,
    hasMore: Boolean(data.next_page),
    provider: 'Pexels',
    keyed: true,
  };
}

async function searchCommons(query: string, page: number) {
  const target = new URL('https://commons.wikimedia.org/w/api.php');
  target.searchParams.set('action', 'query');
  target.searchParams.set('format', 'json');
  target.searchParams.set('generator', 'search');
  target.searchParams.set('gsrsearch', `filetype:video ${query}`);
  target.searchParams.set('gsrnamespace', '6');
  target.searchParams.set('gsrlimit', String(PAGE_SIZE));
  target.searchParams.set('gsroffset', String((page - 1) * PAGE_SIZE));
  target.searchParams.set('prop', 'imageinfo');
  target.searchParams.set('iiprop', 'url|size|mime|extmetadata|duration');
  target.searchParams.set('iiurlwidth', '480');

  const response = await fetch(target, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Wikimedia Commons answered ${response.status}`);
  }
  const data: any = await response.json();
  const pages = Object.values(data?.query?.pages ?? {}) as any[];

  const results: StockVideo[] = pages
    .map((item: any): StockVideo | null => {
      const info = item?.imageinfo?.[0];
      if (!info?.url) return null;
      const mime = String(info.mime ?? '');
      if (!/^(video\/|application\/ogg)/i.test(mime)) return null;
      const duration = Number(info.duration ?? 0);
      if (!duration || duration < 2 || duration > MAX_SECONDS) return null;
      if (Number(info.size ?? 0) > MAX_BYTES) return null;
      const meta = info.extmetadata ?? {};
      const license = stripHtml(meta.LicenseShortName?.value);
      if (!freeLicense(license)) return null;

      const title = String(item.title ?? 'Stock clip')
        .replace(/^File:/, '')
        .replace(/\.(webm|ogv|ogg|mp4)$/i, '')
        .replace(/_/g, ' ')
        .slice(0, 120);

      return {
        id: `commons-${item.pageid}`,
        title,
        thumb: String(info.thumburl ?? ''),
        url: String(info.url).split('?')[0],
        width: Number(info.width ?? 0),
        height: Number(info.height ?? 0),
        duration,
        creator: stripHtml(meta.Artist?.value).slice(0, 80),
        provider: 'Wikimedia Commons',
        license,
      };
    })
    .filter(Boolean) as StockVideo[];

  return {
    results,
    page,
    hasMore: pages.length >= PAGE_SIZE,
    provider: 'Wikimedia Commons',
    keyed: false,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  if (query.length < 2) return ok({ results: [], page, hasMore: false });

  const key = `${query.toLowerCase()}::${page}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return ok(hit.payload);

  const pexelsKey = String(process.env.PEXELS_API_KEY ?? '').trim();
  try {
    const payload = pexelsKey
      ? await searchPexels(query, page, pexelsKey)
      : await searchCommons(query, page);
    cache.set(key, { at: Date.now(), payload });
    if (cache.size > 60) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    return ok(payload);
  } catch (error: any) {
    // A broken/expired Pexels key should not kill the feature – fall back.
    if (pexelsKey) {
      try {
        const payload = await searchCommons(query, page);
        return ok({ ...payload, note: 'Pexels unavailable – using Wikimedia Commons' });
      } catch {
        /* fall through */
      }
    }
    return fail(error?.message ?? 'Stock video search is unreachable right now', 502);
  }
}
