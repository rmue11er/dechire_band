import { ok, readJson } from '@/lib/api';
import { removeDemoData, resetToDemo } from '@/lib/reset';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `POST /api/reset`                 → wipe and restore the demo data
 * `POST /api/reset {"mode":"demo"}` → wipe the demo data and stay empty
 */
export async function POST(request: Request) {
  const body = await readJson<{ mode?: string }>(request);

  if (body.mode === 'demo') {
    return ok({ ok: true, mode: 'demo', removed: removeDemoData() });
  }

  resetToDemo();
  return ok({ ok: true, mode: 'reseed' });
}
