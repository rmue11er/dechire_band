import nodemailer from 'nodemailer';
import { getMailConnection, saveMailTest } from './repo';

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: number;
  fromEnv: boolean;
};

/**
 * The mailbox of the band. Settings live in the database (Settings → Booking),
 * environment variables work as a fallback so a deploy can configure it once.
 */
export function mailSettings(): SmtpSettings {
  const stored = getMailConnection();
  const host = stored?.host || process.env.MAIL_HOST || '';
  return {
    host,
    port: (stored?.host ? stored.port : Number(process.env.MAIL_PORT ?? 465)) || 465,
    secure: stored?.host ? stored.secure : String(process.env.MAIL_SECURE ?? 'true') !== 'false',
    username: stored?.username || process.env.MAIL_USER || '',
    password: stored?.password || process.env.MAIL_PASSWORD || '',
    fromName: stored?.fromName || process.env.MAIL_FROM_NAME || '',
    fromEmail: stored?.fromEmail || process.env.MAIL_FROM || '',
    replyTo: stored?.replyTo || process.env.MAIL_REPLY_TO || '',
    dailyLimit: stored?.dailyLimit || Number(process.env.MAIL_DAILY_LIMIT ?? 40) || 40,
    fromEnv: !stored?.host,
  };
}

export function mailConfigured(settings = mailSettings()) {
  return Boolean(settings.host && settings.username && settings.password && (settings.fromEmail || settings.username));
}

/** Common provider presets – saves the user from looking up ports. */
export const SMTP_PRESETS: { label: string; host: string; port: number; secure: boolean }[] = [
  { label: 'IONOS', host: 'smtp.ionos.de', port: 465, secure: true },
  { label: 'IONOS (STARTTLS)', host: 'smtp.ionos.de', port: 587, secure: false },
  { label: 'Gmail / Workspace', host: 'smtp.gmail.com', port: 465, secure: true },
  { label: 'Mailbox.org', host: 'smtp.mailbox.org', port: 465, secure: true },
  { label: 'Posteo', host: 'posteo.de', port: 465, secure: true },
  { label: 'All-Inkl', host: 'w01f1d8a.kasserver.com', port: 465, secure: true },
  { label: 'Eigener Server', host: '', port: 465, secure: true },
];

function transport(settings: SmtpSettings) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
    /* a stuck mailbox should fail the send instead of hanging the queue forever */
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

/** Checks host, login and TLS without sending anything. */
export async function verifyMailbox() {
  const settings = mailSettings();
  if (!mailConfigured(settings)) {
    const error = 'Host, Benutzer und Passwort fehlen noch.';
    saveMailTest(false, error);
    return { ok: false, error };
  }
  try {
    await transport(settings).verify();
    saveMailTest(true, '');
    return { ok: true, host: settings.host, port: settings.port };
  } catch (error: any) {
    const message = error?.message ?? 'Verbindung fehlgeschlagen';
    saveMailTest(false, message);
    return { ok: false, error: message };
  }
}

export type OutgoingMail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  /* booking mails are personal mail, not a newsletter */
  headers?: Record<string, string>;
};

export async function sendMail(mail: OutgoingMail) {
  const settings = mailSettings();
  if (!mailConfigured(settings)) throw new Error('No mailbox configured – Settings → Booking → E-Mail');
  const from = settings.fromName
    ? `"${settings.fromName.replace(/"/g, '')}" <${settings.fromEmail || settings.username}>`
    : settings.fromEmail || settings.username;
  const info = await transport(settings).sendMail({
    from,
    to: mail.to,
    replyTo: mail.replyTo || settings.replyTo || settings.fromEmail || settings.username,
    subject: mail.subject,
    text: mail.text,
    headers: { 'X-Mailer': 'dechire-band-hq', ...(mail.headers ?? {}) },
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}
