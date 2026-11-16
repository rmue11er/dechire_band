'use client';

import { useEffect, useState } from 'react';
import { Field } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { BookingOutreach } from '@/lib/types';
import type { MailboxState, QueueState } from './types';

const PRESETS = [
  { label: 'IONOS', host: 'smtp.ionos.de', port: 465, secure: true },
  { label: 'IONOS (STARTTLS)', host: 'smtp.ionos.de', port: 587, secure: false },
  { label: 'Gmail / Workspace', host: 'smtp.gmail.com', port: 465, secure: true },
  { label: 'Mailbox.org', host: 'smtp.mailbox.org', port: 465, secure: true },
  { label: 'Posteo', host: 'posteo.de', port: 465, secure: true },
  { label: 'All-Inkl', host: 'w01f1d8a.kasserver.com', port: 465, secure: true },
  { label: 'Eigener Server', host: '', port: 465, secure: true },
];

type Draft = {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: string;
};

const toDraft = (mail: MailboxState): Draft => ({
  host: mail.host,
  port: String(mail.port),
  secure: mail.secure,
  username: mail.username,
  password: '',
  fromName: mail.fromName,
  fromEmail: mail.fromEmail,
  replyTo: mail.replyTo,
  dailyLimit: String(mail.dailyLimit),
});

export default function MailPanel({
  mail,
  queue,
  outreach,
  onMailChanged,
  onRefresh,
}: {
  mail: MailboxState;
  queue: QueueState;
  outreach: BookingOutreach[];
  onMailChanged: (mail: MailboxState) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(toDraft(mail));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setDraft(toDraft(mail)), [mail]);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const call = async (action: 'save' | 'test') => {
    setBusy(action);
    try {
      const response = await fetch('/api/booking/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          host: draft.host.trim(),
          port: Number(draft.port) || 465,
          secure: draft.secure,
          username: draft.username.trim(),
          password: draft.password,
          fromName: draft.fromName.trim(),
          fromEmail: draft.fromEmail.trim(),
          replyTo: draft.replyTo.trim(),
          dailyLimit: Number(draft.dailyLimit) || 40,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Fehlgeschlagen');
      if (data.mail) onMailChanged(data.mail as MailboxState);
      if (action === 'test') {
        if (data.ok) toast(`Verbindung steht (${mail.host || draft.host})`);
        else toast(data.error ?? 'Verbindung fehlgeschlagen', 'error');
      } else {
        toast('Postfach gespeichert');
        set({ password: '' });
      }
    } catch (error: any) {
      toast(error.message ?? 'Fehlgeschlagen', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="booking-mailpanel">
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">E-Mail-Postfach</div>
          <span className={`booking-badge ${mail.configured ? 'is-ok' : 'is-warn'}`}>
            {mail.fromEnv ? 'aus Umgebungsvariablen' : mail.configured ? 'eingerichtet' : 'nicht eingerichtet'}
          </span>
        </div>
        <div className="panel-body form-grid">
          <p className="booking-intro">
            Die Mails gehen über deinen eigenen Mailserver raus – kein Newsletter-Dienst, keine fremde Domain. Für
            IONOS: <code>smtp.ionos.de</code>, Port <code>465</code>, SSL an, Benutzer = volle Mailadresse.
          </p>

          <Field label="Anbieter-Vorlage">
            <select
              className="input"
              value={PRESETS.findIndex((preset) => preset.host === draft.host) ?? 0}
              onChange={(event) => {
                const preset = PRESETS[Number(event.target.value)];
                if (preset) set({ host: preset.host, port: String(preset.port), secure: preset.secure });
              }}
            >
              {PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="form-row">
            <Field label="SMTP-Host">
              <input className="input" value={draft.host} onChange={(event) => set({ host: event.target.value })} />
            </Field>
            <Field label="Port">
              <input className="input" value={draft.port} onChange={(event) => set({ port: event.target.value })} />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Benutzer">
              <input
                className="input"
                placeholder="booking@dechire.band"
                value={draft.username}
                onChange={(event) => set({ username: event.target.value })}
              />
            </Field>
            <Field
              label="Passwort"
              hint={<span className="mono small muted">{mail.hasPassword ? 'gespeichert' : 'fehlt'}</span>}
            >
              <input
                className="input"
                type="password"
                placeholder={mail.hasPassword ? '•••••••• (leer lassen = behalten)' : ''}
                value={draft.password}
                onChange={(event) => set({ password: event.target.value })}
              />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Absendername">
              <input
                className="input"
                placeholder="déchire"
                value={draft.fromName}
                onChange={(event) => set({ fromName: event.target.value })}
              />
            </Field>
            <Field label="Absenderadresse">
              <input
                className="input"
                placeholder="booking@dechire.band"
                value={draft.fromEmail}
                onChange={(event) => set({ fromEmail: event.target.value })}
              />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Antwort-an">
              <input
                className="input"
                placeholder="(leer = Absenderadresse)"
                value={draft.replyTo}
                onChange={(event) => set({ replyTo: event.target.value })}
              />
            </Field>
            <Field label="Mails pro Tag" hint={<span className="mono small muted">Bremse gegen Spam-Filter</span>}>
              <input
                className="input"
                type="number"
                min={1}
                max={200}
                value={draft.dailyLimit}
                onChange={(event) => set({ dailyLimit: event.target.value })}
              />
            </Field>
          </div>

          <label className="booking-toggle">
            <input
              type="checkbox"
              checked={draft.secure}
              onChange={(event) => set({ secure: event.target.checked })}
            />
            <span>SSL/TLS direkt (Port 465). Aus = STARTTLS (meist Port 587)</span>
          </label>

          <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
            <span className="mono small muted">
              {mail.lastTestAt
                ? `Letzter Test ${timeAgo(mail.lastTestAt)}${mail.lastTestOk ? ' · ok' : ` · ${mail.lastTestError}`}`
                : 'Noch nicht getestet'}
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => call('test')} disabled={!!busy}>
                {busy === 'test' ? 'Testet …' : 'Verbindung testen'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => call('save')} disabled={!!busy}>
                {busy === 'save' ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Versand</div>
          <div className="row" style={{ gap: 10 }}>
            <span className="mono small muted">
              {queue.sentToday}/{queue.limit} heute
              {queue.queued ? ` · ${queue.queued} in der Warteschlange` : ''}
            </span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onRefresh}>
              Aktualisieren
            </button>
          </div>
        </div>
        <div className="panel-body">
          {outreach.length ? (
            <div className="booking-outreach">
              {outreach.map((entry) => (
                <div key={entry.id} className="booking-outreach-row">
                  <span className={`booking-dot is-${entry.status}`} aria-hidden="true" />
                  <div className="booking-outreach-main">
                    <strong>{entry.contactName ?? `Kontakt #${entry.contactId}`}</strong>
                    <span className="booking-outreach-subject">{entry.subject}</span>
                    {entry.error ? <span className="booking-outreach-error">{entry.error}</span> : null}
                  </div>
                  <span className="mono small muted">
                    {entry.status === 'queued' ? 'in der Warteschlange' : entry.sentAt ? timeAgo(entry.sentAt) : '–'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="booking-hint">Noch keine Mails verschickt. Der Verlauf erscheint hier.</p>
          )}
        </div>
      </section>
    </div>
  );
}
