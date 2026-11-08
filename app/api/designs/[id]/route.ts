import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteDesign, getDesign, updateDesign } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const design = getDesign(toInt(id));
  if (!design) return fail('Design not found', 404);
  return ok({ design });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const designId = toInt(id);
  if (!getDesign(designId)) return fail('Design not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (typeof body.title === 'string') patch.title = body.title.slice(0, 120) || 'Untitled';
  if (body.width !== undefined) patch.width = Math.min(4000, Math.max(200, Math.round(Number(body.width))));
  if (body.height !== undefined) patch.height = Math.min(4000, Math.max(200, Math.round(Number(body.height))));
  if (body.background && typeof body.background === 'object') patch.background = body.background;
  if (Array.isArray(body.elements)) patch.elements = body.elements;

  const design = updateDesign(designId, patch);
  return ok({ design });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteDesign(toInt(id));
  return ok({ ok: true });
}
