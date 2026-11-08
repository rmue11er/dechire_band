import { ok } from '@/lib/api';
import { clearTrash, listTrash } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ trash: listTrash() });
}

export async function DELETE() {
  clearTrash();
  return ok({ ok: true });
}
