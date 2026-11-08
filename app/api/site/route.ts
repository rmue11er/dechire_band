import { fail, ok, readJson } from '@/lib/api';
import { getSiteSettings, saveSiteSettings, siteShotCandidates } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED = [
  'published',
  'bandName',
  'tagline',
  'manifesto',
  'introTitle',
  'introSignature',
  'crew',
  'heroMediaId',
  'heroVideo',
  'heroOverlay',
  'grain',
  'mediaTitle',
  'mediaNote',
  'mediaIds',
  'showHero',
  'showIntro',
  'showMedia',
  'showFeed',
  'showConnect',
  'showFooter',
  'feedTitle',
  'teaserUrl',
  'showTeaser',
  'links',
  'pressQuote',
  'pressSource',
  'footerNote',
  'seoDescription',
  'accentHex',
];

export async function GET() {
  return ok({ settings: getSiteSettings(), suggestions: siteShotCandidates(24) });
}

export async function PUT(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (patch.heroOverlay !== undefined) {
    patch.heroOverlay = Math.max(0, Math.min(90, Number(patch.heroOverlay) || 0));
  }
  if (patch.mediaIds !== undefined && !Array.isArray(patch.mediaIds)) {
    return fail('mediaIds must be a list');
  }
  if (!Object.keys(patch).length) return fail('Nothing to update');

  return ok({ settings: saveSiteSettings(patch) });
}
