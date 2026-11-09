import { fail, ok, readJson } from '@/lib/api';
import { createFolder, listFolders } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ folders: listFolders() });
}

export async function POST(request: Request) {
  const body = await readJson<{ name?: string; parentId?: number | null }>(request);
  const name = String(body.name ?? '').trim();
  if (!name) return fail('Folder name is required');
  if (name.length > 60) return fail('Folder name is too long');

  const parentId = body.parentId == null ? null : Number(body.parentId);
  const id = createFolder(name, Number.isFinite(parentId as number) ? parentId : null);
  return ok({ folder: listFolders().find((folder) => folder.id === id) ?? null, folders: listFolders() }, 201);
}
