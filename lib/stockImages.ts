/**
 * Free stock photos from several providers.
 *
 * Every provider here grants commercial use without payment. What differs is the
 * licence language (CC0 / public domain / provider licence) and whether an API key
 * is needed – the keyed ones read their key from the environment, so a provider
 * simply disappears from the picker when it is not configured.
 */

export type StockPhoto = {
  /** provider-prefixed id, unique across providers */
  id: string;
  title: string;
  thumb: string;
  url: string;
  width: number;
  height: number;
  creator: string;
  /** human label for the badge, e.g. "Pexels" */
  provider: string;
  /** machine key, e.g. "pexels" */
  source: StockSource;
  license: string;
  /** page where the photo lives (attribution link) */
  pageUrl: string;
};

export type StockSource = 'openverse' | 'wikimedia' | 'pexels' | 'unsplash' | 'pixabay';

export type StockProviderInfo = {
  key: StockSource;
  label: string;
  hint: string;
  available: boolean;
  keyEnv?: string;
};

const UA = 'DECHIRE-BandHQ/1.0 (band design studio)';
const TIMEOUT = 15000;

const imageProviders = (): StockProviderInfo[] => [
  {
    key: 'openverse',
    label: 'Openverse',
    hint: 'CC0 / Public Domain – keine Namensnennung nötig.',
    available: true,
  },
  {
    key: 'wikimedia',
    label: 'Wikimedia',
    hint: 'CC0, Public Domain und CC-BY (ohne ShareAlike) aus Wikimedia Commons.',
    available: true,
  },
  {
    key: 'pexels',
    label: 'Pexels',
    hint: 'Pexels-Lizenz, kostenlos kommerziell. Braucht PEXELS_API_KEY.',
    available: Boolean(process.env.PEXELS_API_KEY),
    keyEnv: 'PEXELS_API_KEY',
  },
  {
    key: 'unsplash',
    label: 'Unsplash',
    hint: 'Unsplash-Lizenz, sehr gute Band-/Konzertfotos. Braucht UNSPLASH_ACCESS_KEY.',
    available: Boolean(process.env.UNSPLASH_ACCESS_KEY),
    keyEnv: 'UNSPLASH_ACCESS_KEY',
  },
  {
    key: 'pixabay',
    label: 'Pixabay',
    hint: 'Pixabay-Lizenz, riesiger Bestand. Braucht PIXABAY_API_KEY.',
    available: Boolean(process.env.PIXABAY_API_KEY),
    keyEnv: 'PIXABAY_API_KEY',
  },
];

export { imageProviders };

const stripHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const bigEnough = (width: number, height: number) => width >= 900 && height >= 600;

/**
 * Wikimedia is only usable when the licence allows commercial use, remixing and does
 * not force ShareAlike on our own artwork (CC0, Public Domain, plain CC BY).
 */
const wikimediaLicenceOk = (name: string) =>
  /^(cc0|public domain|pd)/i.test(name.trim()) ||
  (/^cc[- ]by/i.test(name.trim()) && !/\b(nc|nd|sa)\b/i.test(name));

type ProviderResult = { results: StockPhoto[]; hasMore: boolean; total: number };

/* ------------------------------------------------------------------ openverse */

async function openverse(query: string, page: number): Promise<ProviderResult> {
  const target = new URL('https://api.openverse.org/v1/images/');
  target.searchParams.set('q', query);
  target.searchParams.set('license', 'cc0,pdm');
  target.searchParams.set('page_size', '20');
  target.searchParams.set('page', String(page));
  target.searchParams.set('mature', 'false');
  /* without these the index returns scans, memes and 230px thumbnails */
  target.searchParams.set('category', 'photograph');
  target.searchParams.set('size', 'large');
  target.searchParams.set('filter_dead', 'true');

  const response = await fetch(target, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Openverse ${response.status}`);
  const data: any = await response.json();

  const results: StockPhoto[] = (data.results ?? [])
    .filter((item: any) => item?.url)
    .map((item: any) => ({
      id: `openverse:${item.id ?? item.url}`,
      title: String(item.title ?? 'Untitled').slice(0, 120),
      thumb: item.thumbnail || item.url,
      url: item.url,
      width: Number(item.width ?? 0),
      height: Number(item.height ?? 0),
      creator: String(item.creator ?? '').slice(0, 80),
      provider: 'Openverse',
      source: 'openverse' as const,
      license: String(item.license ?? 'cc0'),
      pageUrl: String(item.foreign_landing_url ?? item.url ?? ''),
    }))
    .filter((item: StockPhoto) => item.width === 0 || bigEnough(item.width, item.height));

  return {
    results,
    hasMore: Number(data.page_count ?? 0) > page,
    total: Number(data.result_count ?? results.length),
  };
}

/* ------------------------------------------------------------------ wikimedia */

async function wikimedia(query: string, page: number): Promise<ProviderResult> {
  const target = new URL('https://commons.wikimedia.org/w/api.php');
  target.searchParams.set('action', 'query');
  target.searchParams.set('format', 'json');
  target.searchParams.set('generator', 'search');
  target.searchParams.set('gsrsearch', `filetype:bitmap ${query}`);
  target.searchParams.set('gsrnamespace', '6');
  target.searchParams.set('gsrlimit', '24');
  target.searchParams.set('gsroffset', String((page - 1) * 24));
  target.searchParams.set('prop', 'imageinfo');
  target.searchParams.set('iiprop', 'url|size|extmetadata');
  target.searchParams.set('iiurlwidth', '480');

  const response = await fetch(target, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Wikimedia ${response.status}`);
  const data: any = await response.json();
  const pages = Object.values(data?.query?.pages ?? {}) as any[];

  const results: StockPhoto[] = pages
    .map((item: any) => {
      const info = item?.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata ?? {};
      const licence = stripHtml(meta.LicenseShortName?.value ?? '');
      if (!wikimediaLicenceOk(licence)) return null;
      if (!bigEnough(Number(info.width ?? 0), Number(info.height ?? 0))) return null;
      return {
        id: `wikimedia:${item.pageid}`,
        title: String(item.title ?? '')
          .replace(/^File:/, '')
          .replace(/\.[a-z]+$/i, '')
          .slice(0, 120),
        thumb: info.thumburl || info.url,
        url: info.url,
        width: Number(info.width ?? 0),
        height: Number(info.height ?? 0),
        creator: stripHtml(meta.Artist?.value ?? '').slice(0, 80),
        provider: 'Wikimedia',
        source: 'wikimedia' as const,
        license: licence || 'free',
        pageUrl: `https://commons.wikimedia.org/?curid=${item.pageid}`,
      };
    })
    .filter(Boolean) as StockPhoto[];

  return { results, hasMore: pages.length >= 24, total: results.length };
}

/* --------------------------------------------------------------------- pexels */

async function pexels(query: string, page: number): Promise<ProviderResult> {
  const key = process.env.PEXELS_API_KEY ?? '';
  if (!key) throw new Error('Pexels key missing');
  const target = new URL('https://api.pexels.com/v1/search');
  target.searchParams.set('query', query);
  target.searchParams.set('per_page', '24');
  target.searchParams.set('page', String(page));
  target.searchParams.set('orientation', 'landscape');

  const response = await fetch(target, {
    headers: { Authorization: key, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Pexels ${response.status}`);
  const data: any = await response.json();

  const results: StockPhoto[] = (data.photos ?? []).map((photo: any) => ({
    id: `pexels:${photo.id}`,
    title: String(photo.alt ?? 'Pexels photo').slice(0, 120),
    thumb: photo.src?.medium ?? photo.src?.small ?? photo.src?.tiny,
    url: photo.src?.large2x ?? photo.src?.original ?? photo.src?.large,
    width: Number(photo.width ?? 0),
    height: Number(photo.height ?? 0),
    creator: String(photo.photographer ?? '').slice(0, 80),
    provider: 'Pexels',
    source: 'pexels' as const,
    license: 'Pexels',
    pageUrl: String(photo.url ?? 'https://www.pexels.com'),
  }));

  return { results, hasMore: Boolean(data.next_page), total: Number(data.total_results ?? results.length) };
}

/* ------------------------------------------------------------------- unsplash */

async function unsplash(query: string, page: number): Promise<ProviderResult> {
  const key = process.env.UNSPLASH_ACCESS_KEY ?? '';
  if (!key) throw new Error('Unsplash key missing');
  const target = new URL('https://api.unsplash.com/search/photos');
  target.searchParams.set('query', query);
  target.searchParams.set('per_page', '24');
  target.searchParams.set('page', String(page));
  target.searchParams.set('orientation', 'landscape');
  target.searchParams.set('content_filter', 'high');

  const response = await fetch(target, {
    headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1', Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Unsplash ${response.status}`);
  const data: any = await response.json();

  const results: StockPhoto[] = (data.results ?? []).map((photo: any) => ({
    id: `unsplash:${photo.id}`,
    title: String(photo.description ?? photo.alt_description ?? 'Unsplash photo').slice(0, 120),
    thumb: photo.urls?.small ?? photo.urls?.thumb,
    url: photo.urls?.full ?? photo.urls?.regular,
    width: Number(photo.width ?? 0),
    height: Number(photo.height ?? 0),
    creator: String(photo.user?.name ?? '').slice(0, 80),
    provider: 'Unsplash',
    source: 'unsplash' as const,
    license: 'Unsplash',
    pageUrl: String(photo.links?.html ?? 'https://unsplash.com'),
  }));

  return { results, hasMore: page < Number(data.total_pages ?? 0), total: Number(data.total ?? results.length) };
}

/* -------------------------------------------------------------------- pixabay */

async function pixabay(query: string, page: number): Promise<ProviderResult> {
  const key = process.env.PIXABAY_API_KEY ?? '';
  if (!key) throw new Error('Pixabay key missing');
  const target = new URL('https://pixabay.com/api/');
  target.searchParams.set('key', key);
  target.searchParams.set('q', query);
  target.searchParams.set('image_type', 'photo');
  target.searchParams.set('per_page', '24');
  target.searchParams.set('page', String(page));
  target.searchParams.set('safesearch', 'true');
  target.searchParams.set('min_width', '1200');

  const response = await fetch(target, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Pixabay ${response.status}`);
  const data: any = await response.json();

  const results: StockPhoto[] = (data.hits ?? []).map((hit: any) => ({
    id: `pixabay:${hit.id}`,
    title: String(hit.tags ?? 'Pixabay photo').slice(0, 120),
    thumb: hit.webformatURL,
    url: hit.largeImageURL ?? hit.webformatURL,
    width: Number(hit.imageWidth ?? 0),
    height: Number(hit.imageHeight ?? 0),
    creator: String(hit.user ?? '').slice(0, 80),
    provider: 'Pixabay',
    source: 'pixabay' as const,
    license: 'Pixabay',
    pageUrl: String(hit.pageURL ?? 'https://pixabay.com'),
  }));

  return {
    results,
    hasMore: Number(data.totalHits ?? 0) > page * 24,
    total: Number(data.totalHits ?? results.length),
  };
}

const PROVIDERS: Record<StockSource, (query: string, page: number) => Promise<ProviderResult>> = {
  openverse,
  wikimedia,
  pexels,
  unsplash,
  pixabay,
};

/* -------------------------------------------------------------------- search */

type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const TTL = 10 * 60 * 1000;

/** Round-robin so one provider cannot push the others off the first screen. */
function interleave(lists: StockPhoto[][], max = 60) {
  const output: StockPhoto[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let index = 0; index < longest && output.length < max; index += 1) {
    for (const list of lists) {
      const item = list[index];
      if (!item) continue;
      const key = item.url.split('?')[0];
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(item);
    }
  }
  return output;
}

export type ImageSearchResult = {
  results: StockPhoto[];
  page: number;
  hasMore: boolean;
  total: number;
  providers: StockProviderInfo[];
  /** providers that failed for this query (key missing, rate limit, …) */
  failed: { provider: string; error: string }[];
};

export async function searchImages(
  query: string,
  page: number,
  source: StockSource | 'all'
): Promise<ImageSearchResult> {
  const providers = imageProviders();
  const available = providers.filter((entry) => entry.available);
  const wanted =
    source === 'all'
      ? available
      : available.filter((entry) => entry.key === source);

  if (!wanted.length) {
    return { results: [], page, hasMore: false, total: 0, providers, failed: [] };
  }

  const key = `${source}|${query.toLowerCase()}|${page}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.payload as ImageSearchResult;

  const settled = await Promise.allSettled(
    wanted.map(async (entry) => ({ entry, result: await PROVIDERS[entry.key](query, page) }))
  );

  const failed: { provider: string; error: string }[] = [];
  const lists: StockPhoto[][] = [];
  let hasMore = false;
  let total = 0;

  for (const [index, outcome] of settled.entries()) {
    if (outcome.status === 'fulfilled') {
      lists.push(outcome.value.result.results);
      hasMore = hasMore || outcome.value.result.hasMore;
      total += outcome.value.result.total;
    } else {
      failed.push({
        provider: wanted[index].label,
        error: String((outcome.reason as Error)?.message ?? 'failed'),
      });
    }
  }

  const payload: ImageSearchResult = {
    results: interleave(lists),
    page,
    hasMore,
    total,
    providers,
    failed,
  };

  cache.set(key, { at: Date.now(), payload });
  if (cache.size > 60) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  return payload;
}

export const STOCK_SOURCES: StockSource[] = ['openverse', 'wikimedia', 'pexels', 'unsplash', 'pixabay'];
