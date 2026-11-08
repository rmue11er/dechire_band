import { ok } from '@/lib/api';
import { getStats } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok(getStats());
}
