'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';

/**
 * Keeps the scheduler alive while the app is open. Every minute (and whenever the
 * tab becomes visible again) it asks the server to publish due posts. A cheap
 * server-side throttle makes multiple tabs harmless.
 */
export default function SchedulerHeartbeat() {
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (busy.current || cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      busy.current = true;
      try {
        const response = await fetch('/api/scheduler', { method: 'POST' });
        if (!response.ok) return;
        const data = await response.json();
        const summary = data.summary;
        if (!summary) return;
        if (summary.published > 0) {
          toast(`${summary.published} scheduled post${summary.published === 1 ? '' : 's'} published automatically`);
          window.dispatchEvent(new CustomEvent('posts:updated'));
        }
        if (summary.failed > 0) {
          toast(`${summary.failed} post${summary.failed === 1 ? '' : 's'} could not be published – check the planner`, 'error');
        }
      } catch {
        /* offline – next tick will try again */
      } finally {
        busy.current = false;
      }
    };

    const timer = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };

    // first check shortly after load, then every minute
    const initial = window.setTimeout(tick, 4000);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(initial);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
