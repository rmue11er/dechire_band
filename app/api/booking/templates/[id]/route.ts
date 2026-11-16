import { fail, ok, readJson, toInt } from '@/lib/api';
import { listBookingTemplates, updateBookingTemplate } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const templateId = toInt(id);
  if (!listBookingTemplates().some((template) => template.id === templateId)) {
    return fail('Template not found', 404);
  }
  const body = await readJson<Record<string, any>>(request);
  const patch: { subject?: string; body?: string; name?: string } = {};
  if (body.subject !== undefined) patch.subject = String(body.subject ?? '');
  if (body.body !== undefined) patch.body = String(body.body ?? '');
  if (body.name !== undefined) patch.name = String(body.name ?? '');
  if (!Object.keys(patch).length) return fail('Nothing to change');
  updateBookingTemplate(templateId, patch);
  return ok({ template: listBookingTemplates().find((template) => template.id === templateId) });
}
