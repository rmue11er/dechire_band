import { fail, ok, readJson } from '@/lib/api';
import { addGoogleFont, customFontOptions, customFontsCss, listCustomFonts } from '@/lib/fonts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Everything the studio needs: the fonts plus their `@font-face` rules. */
function bundle() {
  return {
    fonts: customFontOptions(),
    records: listCustomFonts(),
    css: customFontsCss(),
  };
}

export async function GET() {
  return ok(bundle());
}

export async function POST(request: Request) {
  const body = await readJson<{ family?: string }>(request);
  const family = String(body.family ?? '').trim();
  if (!family) return fail('Missing font name');

  try {
    const font = await addGoogleFont(family);
    return ok({ font, ...bundle() }, 201);
  } catch (error: any) {
    return fail(error?.message ?? 'Could not add the font', 502);
  }
}
