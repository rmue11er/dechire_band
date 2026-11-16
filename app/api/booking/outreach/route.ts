import { fail, ok, readJson } from '@/lib/api';
import { renderTemplate, templateVars } from '@/lib/booking';
import { runOutreachQueue, outreachRunning } from '@/lib/bookingMailer';
import {
  bookingSentToday,
  getBookingContact,
  getBookingProfile,
  getProfile,
  listBookingOutreach,
  listBookingTemplates,
  queueBookingOutreach,
  queuedOutreachCount,
} from '@/lib/repo';
import { mailConfigured, mailSettings } from '@/lib/mail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BATCH = 40;

export async function GET() {
  const settings = mailSettings();
  return ok({
    outreach: listBookingOutreach(80),
    queue: {
      queued: queuedOutreachCount(),
      running: outreachRunning(),
      sentToday: bookingSentToday(),
      limit: settings.dailyLimit,
      configured: mailConfigured(settings),
    },
  });
}

/**
 * Queues one personalised mail per selected contact. The actual sending happens in
 * the background queue – a long request would run into proxy timeouts again.
 */
export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const contactIds = Array.isArray(body.contactIds)
    ? body.contactIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  if (!contactIds.length) return fail('No contacts selected');
  if (contactIds.length > MAX_BATCH) return fail(`Maximal ${MAX_BATCH} Kontakte pro Welle`, 400);

  const settings = mailSettings();
  if (!mailConfigured(settings)) return fail('Es ist noch kein Postfach eingerichtet (Tab „E-Mail“).', 400);

  const template = listBookingTemplates().find((entry) => entry.id === Number(body.templateId));
  if (!template) return fail('Template not found', 404);

  const profile = getBookingProfile();
  const band = getProfile();
  const subjectSource = String(body.subject ?? template.subject);
  const bodySource = String(body.body ?? template.body);
  const language = String(body.language ?? template.language) === 'en' ? 'en' : 'de';

  const rows: { contactId: number; language: string; subject: string; body: string }[] = [];
  const skipped: string[] = [];
  for (const id of contactIds) {
    const contact = getBookingContact(id);
    if (!contact) continue;
    if (!contact.email) {
      skipped.push(contact.name);
      continue;
    }
    const vars = templateVars({
      contactName: contact.name,
      contactPerson: contact.contactName,
      city: contact.city,
      band: band.bandName,
      homebase: profile.homebase,
      sender: profile.sender || settings.fromName || band.bandName,
      listen: profile.listenUrl,
      live: profile.liveUrl,
      press: profile.pressUrl,
      genre: profile.genre,
    });
    rows.push({
      contactId: contact.id,
      language,
      subject: renderTemplate(subjectSource, vars).slice(0, 300),
      body: renderTemplate(bodySource, vars).slice(0, 20000),
    });
  }

  if (!rows.length) {
    return fail(
      skipped.length
        ? 'Keiner der Kontakte hat eine E-Mail-Adresse – bitte zuerst recherchieren.'
        : 'Nichts zu senden',
      400
    );
  }

  const queued = queueBookingOutreach(rows);
  /* fire and forget – the queue reports its own progress via GET */
  void runOutreachQueue();
  return ok({ queued, skipped }, 202);
}
