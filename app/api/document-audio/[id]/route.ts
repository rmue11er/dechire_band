import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteDocumentAudio, updateDocumentAudio } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson<Record<string, any>>(request);
  const audio = updateDocumentAudio(toInt(id), {
    label: typeof body.label === 'string' ? body.label : undefined,
  });
  if (!audio) return fail('Audio attachment not found', 404);
  return ok({ audio });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteDocumentAudio(toInt(id));
  return ok({ ok: true });
}
