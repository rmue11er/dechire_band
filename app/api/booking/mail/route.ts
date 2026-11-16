import { fail, ok, readJson } from '@/lib/api';
import { SMTP_PRESETS, mailConfigured, mailSettings, verifyMailbox } from '@/lib/mail';
import { getMailConnection, saveMailConnection, saveMailTest } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function GET() {
  return ok({ mail: publicMailbox(), presets: SMTP_PRESETS });
}

/**
 * Saves the mailbox or tests it. An empty password field keeps the stored one, so
 * a password never has to be typed again just to change the sender name.
 */
export async function POST(request: Request) {
  const body = await readJson<Record<string, any>>(request);

  if (body.action === 'test') {
    const result = await verifyMailbox();
    return ok({ ...result, mail: publicMailbox() });
  }

  if (body.action === 'save') {
    saveMailConnection({
      host: body.host,
      port: body.port,
      secure: body.secure,
      username: body.username,
      password: body.password,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo,
      dailyLimit: body.dailyLimit,
    });
    return ok({ mail: publicMailbox() });
  }

  if (body.action === 'reset') {
    saveMailTest(false, '');
    return ok({ mail: publicMailbox() });
  }

  return fail('Unknown action');
}
