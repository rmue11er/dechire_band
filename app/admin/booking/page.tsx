'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconMail, IconUsers, IconZap } from '@/components/icons';
import { PageHead, Spinner } from '@/components/ui';
import { toast } from '@/lib/toast';
import type { BookingProfile, BookingStep, BookingTemplate } from '@/lib/types';
import ContactsPanel from '@/components/booking/ContactsPanel';
import MailPanel from '@/components/booking/MailPanel';
import PlaybookPanel from '@/components/booking/PlaybookPanel';
import TemplatesPanel from '@/components/booking/TemplatesPanel';
import type { BookingData, BookingTab, MailboxState } from '@/components/booking/types';

const TABS: { value: BookingTab; label: string; hint: string }[] = [
  { value: 'guide', label: 'Leitfaden', hint: 'Der Weg zum Gig, Schritt für Schritt' },
  { value: 'contacts', label: 'Kontakte', hint: 'Recherchiert, gefiltert, anschreibbar' },
  { value: 'templates', label: 'Vorlagen', hint: 'Was du schreibst, wenn du schreibst' },
  { value: 'mail', label: 'E-Mail', hint: 'Postfach und Versandverlauf' },
];

/** Links from the guide and the search palette use the German names. */
const TAB_ALIASES: Record<string, BookingTab> = {
  leitfaden: 'guide',
  guide: 'guide',
  kontakte: 'contacts',
  contacts: 'contacts',
  vorlagen: 'templates',
  templates: 'templates',
  mail: 'mail',
  'e-mail': 'mail',
};

export default function BookingPage() {
  const [data, setData] = useState<BookingData | null>(null);
  const [tab, setTab] = useState<BookingTab>('guide');
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [focusContact, setFocusContact] = useState<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch('/api/booking');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Booking konnte nicht geladen werden');
      setData({
        contacts: payload.contacts ?? [],
        templates: payload.templates ?? [],
        steps: payload.steps ?? [],
        outreach: payload.outreach ?? [],
        profile: payload.profile,
        mail: payload.mail,
        queue: payload.queue,
        seedsAvailable: Number(payload.seedsAvailable ?? 0),
        bandName: payload.bandName ?? 'déchire',
      });
      if (payload.seeded) toast(`${payload.seeded} recherchierte Kontakte eingespielt`);
    } catch (error: any) {
      if (!quiet) toast(error.message ?? 'Booking konnte nicht geladen werden', 'error');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = TAB_ALIASES[(params.get('tab') ?? '').toLowerCase()];
    if (wanted) setTab(wanted);
    const contact = Number(params.get('contact') ?? '');
    if (Number.isInteger(contact) && contact > 0) {
      setTab('contacts');
      setFocusContact(contact);
    }
    load();
  }, [load]);

  /* the queue runs server-side – poll while something is still waiting */
  useEffect(() => {
    if (!data?.queue.queued) return;
    pollTimer.current = setTimeout(async () => {
      const response = await fetch('/api/booking/outreach');
      if (!response.ok) return;
      const payload = await response.json();
      setData((current) =>
        current ? { ...current, outreach: payload.outreach ?? current.outreach, queue: payload.queue ?? current.queue } : current
      );
    }, 2500);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [data?.queue.queued, data?.outreach.length]);

  const toggleStep = async (key: string, done: boolean) => {
    setData((current) =>
      current
        ? {
            ...current,
            steps: upsertStep(current.steps, key, done),
          }
        : current
    );
    await fetch('/api/booking/steps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, done }),
    });
  };

  const togglePhase = async (keys: string[], done: boolean) => {
    setData((current) =>
      current
        ? {
            ...current,
            steps: keys.reduce((steps, key) => upsertStep(steps, key, done), current.steps),
          }
        : current
    );
    await fetch('/api/booking/steps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys, done }),
    });
  };

  const restoreSeed = async () => {
    setRestoring(true);
    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore-seed' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Konnte nicht einspielen');
      setData((current) => (current ? { ...current, contacts: payload.contacts ?? current.contacts } : current));
      toast(payload.added ? `${payload.added} Kontakte ergänzt` : 'Alles schon vorhanden');
    } catch (error: any) {
      toast(error.message ?? 'Konnte nicht einspielen', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const stats = useMemo(() => {
    const contacts = data?.contacts ?? [];
    return {
      total: contacts.length,
      withMail: contacts.filter((contact) => contact.email).length,
      sent: contacts.filter((contact) => ['sent', 'followup'].includes(contact.status)).length,
      booked: contacts.filter((contact) => contact.status === 'booked').length,
    };
  }, [data?.contacts]);

  if (loading || !data) {
    return (
      <div className="booking">
        <PageHead eyebrow="Plan" title="Booking" sub="Kontakte, Leitfaden und Postfach an einem Ort." />
        <div className="booking-loading">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="booking">
      <PageHead
        eyebrow="Plan"
        title="Booking"
        sub={`${stats.total} Kontakte · ${stats.withMail} mit Adresse · ${stats.sent} angeschrieben · ${stats.booked} gebucht`}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setTab('contacts')}>
              <IconUsers size={15} /> Kontakte
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setTab('contacts')}>
              <IconMail size={15} /> Anschreiben
            </button>
          </div>
        }
      />

      <div className="booking-tabs" role="tablist">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={tab === entry.value}
            className={`booking-tab ${tab === entry.value ? 'is-active' : ''}`}
            onClick={() => setTab(entry.value)}
          >
            <span>{entry.label}</span>
            <span className="mono small muted">{entry.hint}</span>
          </button>
        ))}
        <div className="booking-queue-indicator">
          {data.queue.queued ? (
            <span className="mono small muted">
              <IconZap size={12} /> {data.queue.queued} in der Warteschlange
            </span>
          ) : (
            <span className="mono small muted">
              {data.queue.sentToday}/{data.queue.limit} heute versendet
            </span>
          )}
        </div>
      </div>

      {tab === 'guide' ? (
        <PlaybookPanel
          steps={data.steps}
          contactCount={stats.total}
          seedsAvailable={data.seedsAvailable}
          onToggle={toggleStep}
          onTogglePhase={togglePhase}
          onRestoreSeed={restoreSeed}
          restoring={restoring}
        />
      ) : null}

      {tab === 'contacts' ? (
        <ContactsPanel
          contacts={data.contacts}
          templates={data.templates}
          profile={data.profile}
          bandName={data.bandName}
          onRefresh={() => load(true)}
          seedsAvailable={data.seedsAvailable}
          onRestoreSeed={restoreSeed}
          focusContactId={focusContact}
        />
      ) : null}

      {tab === 'templates' ? (
        <TemplatesPanel
          templates={data.templates}
          profile={data.profile}
          onTemplateSaved={(template: BookingTemplate) =>
            setData((current) =>
              current
                ? { ...current, templates: current.templates.map((entry) => (entry.id === template.id ? template : entry)) }
                : current
            )
          }
          onProfileSaved={(profile: BookingProfile) =>
            setData((current) => (current ? { ...current, profile } : current))
          }
        />
      ) : null}

      {tab === 'mail' ? (
        <MailPanel
          mail={data.mail}
          queue={data.queue}
          outreach={data.outreach}
          onMailChanged={(mail: MailboxState) => {
            setData((current) => (current ? { ...current, mail } : current));
            load(true);
          }}
          onRefresh={() => load(true)}
        />
      ) : null}
    </div>
  );
}

function upsertStep(steps: BookingStep[], key: string, done: boolean): BookingStep[] {
  const existing = steps.find((step) => step.key === key);
  if (existing) return steps.map((step) => (step.key === key ? { ...step, done } : step));
  return [...steps, { key, done, doneAt: done ? new Date().toISOString() : null }];
}
