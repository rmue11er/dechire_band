import { fail, ok, readJson } from '@/lib/api';
import { CONTACT_SEEDS, TEMPLATE_SEEDS } from '@/lib/booking';
import { mailConfigured, mailSettings } from '@/lib/mail';
import {
  bookingSentToday,
  ensureBookingSeed,
  ensureBookingTemplates,
  getBookingProfile,
  getMailConnection,
  getProfile,
  listBookingContacts,
  listBookingOutreach,
  listBookingSteps,
  listBookingTemplates,
  queuedOutreachCount,
  saveBookingProfile,
} from '@/lib/repo';
import { outreachRunning } from '@/lib/bookingMailer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The password never reaches the browser – only the fact that one is stored. */
function publicMailbox() {
  const settings = mailSettings();
  const stored = getMailConnection();
  return {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    username: settings.username,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    replyTo: settings.replyTo,
    dailyLimit: settings.dailyLimit,
    hasPassword: Boolean(settings.password),
    fromEnv: settings.fromEnv,
    lastTestAt: stored?.lastTestAt ?? null,
    lastTestOk: stored?.lastTestOk ?? false,
    lastTestError: stored?.lastTestError ?? '',
    configured: mailConfigured(settings),
  };
}

function queueState() {
  const settings = mailSettings();
  return {
    queued: queuedOutreachCount(),
    running: outreachRunning(),
    sentToday: bookingSentToday(),
    limit: settings.dailyLimit,
    configured: mailConfigured(settings),
  };
}

export async function GET() {
  ensureBookingTemplates(TEMPLATE_SEEDS);
  let seeded = 0;
  /* Only a completely empty list is filled – deleting a venue must stick. */
  if (listBookingContacts().length === 0) seeded = ensureBookingSeed(CONTACT_SEEDS);

  return ok({
    contacts: listBookingContacts(),
    templates: listBookingTemplates(),
    steps: listBookingSteps(),
    outreach: listBookingOutreach(50),
    profile: getBookingProfile(),
    mail: publicMailbox(),
    queue: queueState(),
    seeded,
    seedsAvailable: CONTACT_SEEDS.length,
    bandName: getProfile().bandName,
  });
}

/** Actions that do not fit the per-contact routes. */
export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const action = String(body.action ?? '');

  if (action === 'restore-seed') {
    const added = ensureBookingSeed(CONTACT_SEEDS);
    ensureBookingTemplates(TEMPLATE_SEEDS);
    return ok({ added, contacts: listBookingContacts() });
  }

  if (action === 'save-profile') {
    const profile = saveBookingProfile({
      homebase: String(body.profile?.homebase ?? '').slice(0, 80),
      genre: String(body.profile?.genre ?? '').slice(0, 120),
      listenUrl: String(body.profile?.listenUrl ?? '').slice(0, 300),
      liveUrl: String(body.profile?.liveUrl ?? '').slice(0, 300),
      pressUrl: String(body.profile?.pressUrl ?? '').slice(0, 300),
      sender: String(body.profile?.sender ?? '').slice(0, 120),
    });
    return ok({ profile });
  }

  return fail('Unknown action');
}
