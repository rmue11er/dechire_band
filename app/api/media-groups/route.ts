import { fail, ok, readJson, toInt } from '@/lib/api';
import { createGroup, deleteGroup, listGroups, updateGroup } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ groups: listGroups() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const name = String(body.name ?? '').trim();
  if (!name) return fail('Name is required');
  const id = createGroup(name, String(body.kind ?? 'artwork'), String(body.description ?? ''));
  return ok({ groups: listGroups(), id }, 201);
}

export async function PATCH(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const id = toInt(body.id);
  if (!id) return fail('id missing');
  updateGroup(id, {
    name: body.name,
    kind: body.kind,
    description: body.description,
  });
  return ok({ groups: listGroups() });
}

export async function DELETE(request: Request) {
  const id = toInt(new URL(request.url).searchParams.get('id'));
  if (!id) return fail('id missing');
  deleteGroup(id);
  return ok({ groups: listGroups() });
}
