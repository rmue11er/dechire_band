import { fail, ok, readJson } from '@/lib/api';
import { createDocFolder, listDocFolders } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ folders: listDocFolders() });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const name = String(body.name ?? '').trim();
  if (!name) return fail('Folder needs a name');
  const folder = createDocFolder(name);
  return ok({ folder, folders: listDocFolders() }, 201);
}
