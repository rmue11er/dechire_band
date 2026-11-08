import { fail, ok, readJson } from '@/lib/api';
import { createDesign, listDesigns } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const clampSize = (value: any, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(4000, Math.max(200, Math.round(parsed)));
};

export async function GET() {
  return ok({ designs: listDesigns() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const design = createDesign({
    title: String(body.title ?? 'New design').slice(0, 120) || 'New design',
    width: clampSize(body.width, 1080),
    height: clampSize(body.height, 1080),
    background: body.background,
    elements: Array.isArray(body.elements) ? body.elements : [],
  });
  if (!design) return fail('Could not create the design', 500);
  return ok({ design }, 201);
}
