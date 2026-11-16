import { mailConfigured, mailSettings, sendMail } from './mail';
import {
  bookingSentToday,
  markOutreachFailed,
  markOutreachSent,
  nextQueuedOutreach,
  queuedOutreachCount,
} from './repo';

/** Slow on purpose: booking mail is one-to-one, not a newsletter blast. */
const DELAY_MS = 6000;

let running = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const outreachRunning = () => running;

/**
 * Works the queue off in the background. The request that queues the mails returns
 * immediately, so neither a proxy timeout nor a closed tab can interrupt it – the
 * page polls `/api/booking/outreach` for progress.
 */
export async function runOutreachQueue() {
  if (running) return;
  running = true;
  try {
    const settings = mailSettings();
    if (!mailConfigured(settings)) return;

    while (queuedOutreachCount() > 0) {
      if (bookingSentToday() >= settings.dailyLimit) break;
      const item = nextQueuedOutreach();
      if (!item) break;
      if (!item.email) {
        markOutreachFailed(item.id, 'Für diesen Kontakt ist keine E-Mail-Adresse hinterlegt.');
        continue;
      }
      try {
        await sendMail({ to: item.email, subject: item.subject, text: item.body });
        markOutreachSent(item.id);
      } catch (error: any) {
        markOutreachFailed(item.id, error?.message ?? 'Versand fehlgeschlagen');
      }
      await sleep(DELAY_MS);
    }
  } catch (error) {
    console.error('[booking] outreach queue', error);
  } finally {
    running = false;
  }
}
