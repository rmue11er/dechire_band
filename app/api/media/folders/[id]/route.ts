import { fail, ok, readJson, toInt } from '@/lib/api';
import { deleteFolder, listFolders, updateFolder } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const folderId = toInt(id);
  if (!folderId) return fail('Folder not found', 404);

  const body = await readJson<{ name?: string; parentId?: number | null }>(request);
  const patch: { name?: string; parentId?: number | null } = {};
  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name) return fail('Folder name is required');
    patch.name = name.slice(0, 60);
  }
  if (body.parentId !== undefined) {
    patch.parentId = body.parentId == null ? null : Number(body.parentId);
  }

  const accepted = updateFolder(folderId, patch);
  if (!accepted) return fail('A folder cannot be moved into itself', 409);
  return ok({ folders: listFolders() });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const folderId = toInt(id);
  if (!folderId) return fail('Folder not found', 404);
  deleteFolder(folderId);
  return ok({ folders: listFolders() });
}
