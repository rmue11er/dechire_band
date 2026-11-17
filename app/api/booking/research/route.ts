import { fail, ok, readJson } from '@/lib/api';
import { applyResearchResult, researchContact, researchState, runResearch } from '@/lib/bookingResearch';
import { getBookingContact, listBookingContacts } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ research: researchState() });
}

/**
 * Starts the address lookup for one contact (waits and answers directly) or for
 * a whole batch (runs in the background, progress via GET).
 */
export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const overwrite = Boolean(body.overwrite);

  if (body.wait && ids.length === 1) {
    const contact = getBookingContact(ids[0]);
    if (!contact) return fail('Contact not found', 404);
    const typed = typeof body.website === 'string' ? body.website.trim() : '';
    const result = await researchContact(typed || contact.website);
    const updated = applyResearchResult(contact, result);
    return ok({ contact: updated, result });
  }

  if (researchState().running) return fail('Die Recherche läuft bereits.', 409);

  const targets = ids.length
    ? ids
    : listBookingContacts()
        .filter((contact) => overwrite || !contact.email)
        .map((contact) => contact.id);

  if (!targets.length) return ok({ started: 0, research: researchState() });

  /* fire and forget – the page polls GET for progress */
  void runResearch(targets, overwrite);
  return ok({ started: targets.length, research: researchState() }, 202);
}
