import { fail, ok } from '@/lib/api';
import { STOCK_SOURCES, imageProviders, searchImages, type StockSource } from '@/lib/stockImages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Free stock photos from Openverse, Wikimedia Commons, Pexels, Unsplash and Pixabay.
 * `provider=all` (default) mixes whatever is configured; without a `q` the endpoint
 * only reports which providers are available, so the picker can label its chips.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const requested = url.searchParams.get('provider') ?? 'all';
  const provider: StockSource | 'all' =
    requested !== 'all' && STOCK_SOURCES.includes(requested as StockSource)
      ? (requested as StockSource)
      : 'all';

  if (query.length < 2) {
    return ok({
      results: [],
      page,
      hasMore: false,
      total: 0,
      providers: imageProviders(),
      failed: [],
    });
  }

  try {
    return ok(await searchImages(query, page, provider));
  } catch (error) {
    console.error('[stock]', error);
    return fail('Stock search is unreachable right now', 502);
  }
}
