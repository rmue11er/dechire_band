import { fail, ok, readJson } from '@/lib/api';
import { isHex } from '@/lib/palette';
import { listPalette, replacePalette } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ colors: listPalette() });
}

export async function PUT(request: Request) {
  const body = await readJson<{ colors?: any[] }>(request);
  if (!Array.isArray(body.colors)) return fail('colors missing');

  const colors = body.colors
    .slice(0, 24)
    .map((entry: any) => {
      const hex = String(entry?.hex ?? '').trim();
      if (!isHex(hex)) return null;
      return {
        name: String(entry?.name ?? '').trim().slice(0, 40) || 'Color',
        hex: hex.toLowerCase(),
        role: String(entry?.role ?? 'custom').trim().slice(0, 20) || 'custom',
      };
    })
    .filter(Boolean) as { name: string; hex: string; role: string }[];

  if (!colors.length) return fail('At least one valid hex color is required (#rrggbb)');
  return ok({ colors: replacePalette(colors) });
}
