import { fail, ok, readJson } from '@/lib/api';
import { BOOKING_KINDS, BOOKING_STATUS } from '@/lib/booking';
import { createBookingContact, getBookingContact, listBookingContacts, updateBookingContact } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KINDS = new Set<string>(BOOKING_KINDS.map((entry) => entry.value));
const STATUSES = new Set<string>(BOOKING_STATUS.map((entry) => entry.value));

export async function GET() {
  return ok({ contacts: listBookingContacts() });
}

/** Bulk edit from the table (status, priority) – one request instead of forty. */
export async function PATCH(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0) : [];
  if (!ids.length) return fail('No contacts selected');

  const patch: Record<string, any> = {};
  if (typeof body.status === 'string' && STATUSES.has(body.status)) patch.status = body.status;
  if (body.priority !== undefined) patch.priority = Number(body.priority) || 2;
  if (body.nextFollowUp !== undefined) patch.nextFollowUp = body.nextFollowUp || null;
  if (!Object.keys(patch).length) return fail('Nothing to change');

  for (const id of ids) if (getBookingContact(id)) updateBookingContact(id, patch);
  return ok({ updated: ids.length });
}

export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const name = String(body.name ?? '').trim();
  if (!name) return fail('Name is required');

  const contact = createBookingContact({
    ...body,
    name: name.slice(0, 160),
    kind: KINDS.has(String(body.kind)) ? String(body.kind) : 'venue',
    status: STATUSES.has(String(body.status)) ? String(body.status) : 'new',
  });
  return ok({ contact }, 201);
}
