import { fail, ok } from '@/lib/api';
import { searchGoogleFonts } from '@/lib/fonts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';
  const limit = Math.min(60, Math.max(6, Number(url.searchParams.get('limit') ?? 24) || 24));

  try {
    const results = await searchGoogleFonts(query, limit);
    return ok({ results, query });
  } catch (error: any) {
    return fail(
      error?.message ?? 'Could not reach Google Fonts — check the server connection',
      502
    );
  }
}
