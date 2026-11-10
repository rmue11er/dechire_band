import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteDocFolder, listDocFolders, updateDocFolder } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson<Record<string, any>>(request);
  const name = String(body.name ?? '').trim();
  if (!name) return fail('Folder needs a name');
  const folder = updateDocFolder(toInt(id), name);
  if (!folder) return fail('Folder not found', 404);
  return ok({ folder, folders: listDocFolders() });
}

/** Documents inside are kept – they simply move back to “no folder”. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteDocFolder(toInt(id));
  return ok({ folders: listDocFolders() });
}
