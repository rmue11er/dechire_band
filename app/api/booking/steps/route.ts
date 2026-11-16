import { fail, ok, readJson } from '@/lib/api';
import { PLAYBOOK } from '@/lib/booking';
import { listBookingSteps, setBookingStep } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KEYS = new Set(PLAYBOOK.map((step) => step.key));

/** Ticking a guide step – one key or a whole phase at once. */
export async function PATCH(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const done = Boolean(body.done);
  const keys = Array.isArray(body.keys) ? body.keys.map(String) : body.key ? [String(body.key)] : [];
  const valid = keys.filter((key: string) => KEYS.has(key));
  if (!valid.length) return fail('Unknown step');
  for (const key of valid) setBookingStep(key, done);
  return ok({ steps: listBookingSteps() });
}
