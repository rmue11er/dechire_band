import { fail, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Free stock photos via Openverse (openverse.org, run by WordPress/Automattic).
 *
 * Filtered to `cc0` + `pdm` only – public domain / CC0 means the band may use
 * every result commercially, without credit and without paying. The API needs
 * no key; anonymous calls are rate limited, so results are cached in-process.
 */

const ENDPOINT = 'https://api.openverse.org/v1/images/';
const UA = 'DECHIRE-BandHQ/1.0 (band design studio)';

type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const TTL = 10 * 60 * 1000;

export type StockPhoto = {
  id: string;
  title: string;
  thumb: string;
  url: string;
  width: number;
  height: number;
  creator: string;
  provider: string;
  license: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);

  if (query.length < 2) return ok({ results: [], page, hasMore: false });

  const key = `${query.toLowerCase()}::${page}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return ok(hit.payload);

  const target = new URL(ENDPOINT);
  target.searchParams.set('q', query);
  target.searchParams.set('license', 'cc0,pdm');
  // anonymous requests are capped at 20 results per page
  target.searchParams.set('page_size', '20');
  target.searchParams.set('page', String(page));
  target.searchParams.set('mature', 'false');
  // without these the index returns scans, memes and 230px thumbnails
  target.searchParams.set('category', 'photograph');
  target.searchParams.set('size', 'large');
  target.searchParams.set('filter_dead', 'true');

  let data: any;
  try {
    const response = await fetch(target, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    if (!response.ok) {
      return fail(`Stock search failed (${response.status})`, 502);
    }
    data = await response.json();
  } catch {
    return fail('Stock search is unreachable right now', 502);
  }

  const results: StockPhoto[] = (data.results ?? [])
    .filter((item: any) => item?.url && (item.width ?? 0) >= 900)
    .map((item: any) => ({
      id: String(item.id ?? item.url),
      title: String(item.title ?? 'Untitled').slice(0, 120),
      thumb: item.thumbnail || item.url,
      url: item.url,
      width: Number(item.width ?? 0),
      height: Number(item.height ?? 0),
      creator: String(item.creator ?? '').slice(0, 80),
      provider: String(item.provider ?? item.source ?? '').slice(0, 40),
      license: String(item.license ?? 'cc0'),
    }));

  const payload = {
    results,
    page,
    hasMore: Number(data.page_count ?? 0) > page,
    total: Number(data.result_count ?? results.length),
  };
  cache.set(key, { at: Date.now(), payload });
  if (cache.size > 60) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  return ok(payload);
}
