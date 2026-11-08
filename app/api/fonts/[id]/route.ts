import { fail, ok, toInt } from '@/lib/api';
import { customFontOptions, customFontsCss, listCustomFonts, removeCustomFont } from '@/lib/fonts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fontId = toInt(id);
  if (!fontId) return fail('Unknown font', 404);
  if (!removeCustomFont(fontId)) return fail('Unknown font', 404);

  return ok({ fonts: customFontOptions(), records: listCustomFonts(), css: customFontsCss() });
}
