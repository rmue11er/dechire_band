import { fail, ok, readJson, toInt } from '@/lib/api';
import { BOOKING_KINDS, BOOKING_STATUS } from '@/lib/booking';
import { deleteBookingContact, getBookingContact, updateBookingContact } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KINDS = new Set<string>(BOOKING_KINDS.map((entry) => entry.value));
const STATUSES = new Set<string>(BOOKING_STATUS.map((entry) => entry.value));

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const contactId = toInt(id);
  if (!getBookingContact(contactId)) return fail('Contact not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name) return fail('Name is required');
    patch.name = name.slice(0, 160);
  }
  if (typeof body.kind === 'string' && KINDS.has(body.kind)) patch.kind = body.kind;
  if (typeof body.status === 'string' && STATUSES.has(body.status)) patch.status = body.status;
  for (const key of ['city', 'region', 'country', 'email', 'contactName', 'website', 'instagram', 'sourceUrl', 'fitNote', 'deadline', 'notes'] as const) {
    if (body[key] !== undefined) patch[key] = String(body[key] ?? '');
  }
  if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
  if (body.priority !== undefined) patch.priority = Number(body.priority) || 2;
  if (body.capacity !== undefined) patch.capacity = body.capacity;
  if (body.distanceKm !== undefined) patch.distanceKm = body.distanceKm;
  if (body.nextFollowUp !== undefined) patch.nextFollowUp = body.nextFollowUp;

  const contact = updateBookingContact(contactId, patch);
  return ok({ contact });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const contactId = toInt(id);
  if (!getBookingContact(contactId)) return fail('Contact not found', 404);
  deleteBookingContact(contactId);
  return ok({ ok: true });
}
