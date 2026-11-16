'use client';

import { useEffect, useMemo, useState } from 'react';
import { Field, Modal } from '@/components/ui';
import { renderTemplate, templateVars } from '@/lib/booking';
import { toast } from '@/lib/toast';
import type { BookingContact, BookingProfile, BookingTemplate } from '@/lib/types';

const TEMPLATE_BY_KIND: Record<string, string> = {
  venue: 'de-venue',
  promoter: 'de-venue',
  festival: 'de-festival',
  label: 'en-label',
  press: 'en-press',
  radio: 'en-press',
  agency: 'de-venue',
};

export default function ComposeModal({
  open,
  contacts,
  templates,
  profile,
  bandName,
  onClose,
  onQueued,
}: {
  open: boolean;
  contacts: BookingContact[];
  templates: BookingTemplate[];
  profile: BookingProfile;
  bandName: string;
  onClose: () => void;
  onQueued: (queued: number, skipped: string[]) => void;
}) {
  const withMail = useMemo(() => contacts.filter((contact) => contact.email), [contacts]);
  const without = useMemo(() => contacts.filter((contact) => !contact.email), [contacts]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const defaultKey = TEMPLATE_BY_KIND[contacts[0]?.kind ?? ''] ?? 'de-venue';

  useEffect(() => {
    if (!open || !templates.length) return;
    const picked = templates.find((template) => template.key === defaultKey) ?? templates[0];
    setTemplateId(picked.id);
    setSubject(picked.subject);
    setBody(picked.body);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, templates.length, contacts[0]?.id]);

  const applyTemplate = (id: number) => {
    const picked = templates.find((template) => template.id === id);
    if (!picked) return;
    setTemplateId(id);
    setSubject(picked.subject);
    setBody(picked.body);
  };

  const preview = withMail[0];
  const previewVars = preview
    ? templateVars({
        contactName: preview.name,
        contactPerson: preview.contactName,
        city: preview.city,
        band: bandName,
        homebase: profile.homebase,
        sender: profile.sender || bandName,
        listen: profile.listenUrl,
        live: profile.liveUrl,
        press: profile.pressUrl,
        genre: profile.genre,
      })
    : {};

  const send = async () => {
    if (!templateId) return;
    setSending(true);
    try {
      const response = await fetch('/api/booking/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: withMail.map((contact) => contact.id), templateId, subject, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Versand fehlgeschlagen');
      onQueued(Number(data.queued ?? 0), Array.isArray(data.skipped) ? data.skipped : []);
      onClose();
    } catch (error: any) {
      toast(error.message ?? 'Versand fehlgeschlagen', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kontakt aufnehmen"
      subtitle={`${withMail.length} Empfänger${without.length ? ` · ${without.length} ohne E-Mail` : ''}`}
      footer={
        <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
          <span className="mono small muted">Versand läuft gedrosselt im Hintergrund</span>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={send}
              disabled={sending || !withMail.length}
            >
              {sending ? 'Wird eingereiht …' : `An ${withMail.length} senden`}
            </button>
          </div>
        </div>
      }
    >
      <div className="form-grid booking-form">
        <Field label="Vorlage">
          <select
            className="input"
            value={templateId ?? ''}
            onChange={(event) => applyTemplate(Number(event.target.value))}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.language.toUpperCase()})
              </option>
            ))}
          </select>
        </Field>

        {without.length ? (
          <p className="booking-warning">
            Ohne Adresse und deshalb nicht dabei: {without.map((contact) => contact.name).join(', ')}
          </p>
        ) : null}

        <Field label="Betreff">
          <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} />
        </Field>
        <Field label="Text">
          <textarea
            className="input booking-compose"
            rows={14}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>

        {preview ? (
          <div className="booking-preview">
            <div className="label">
              <span>Vorschau für {preview.name}</span>
              <span className="mono small muted">Platzhalter werden pro Kontakt ersetzt</span>
            </div>
            <div className="booking-preview-subject">{renderTemplate(subject, previewVars)}</div>
            <pre className="booking-preview-body">{renderTemplate(body, previewVars)}</pre>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
