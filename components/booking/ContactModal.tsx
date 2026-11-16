'use client';

import { useEffect, useState } from 'react';
import { Field, Modal } from '@/components/ui';
import { BOOKING_KINDS, BOOKING_REGIONS, BOOKING_STATUS } from '@/lib/booking';
import { toast } from '@/lib/toast';
import type { BookingContact } from '@/lib/types';

type Draft = {
  name: string;
  kind: string;
  city: string;
  region: string;
  email: string;
  contactName: string;
  website: string;
  instagram: string;
  fitNote: string;
  deadline: string;
  status: string;
  priority: number;
  distanceKm: string;
  nextFollowUp: string;
  tags: string;
  notes: string;
};

const EMPTY: Draft = {
  name: '',
  kind: 'venue',
  city: '',
  region: 'Bayern',
  email: '',
  contactName: '',
  website: '',
  instagram: '',
  fitNote: '',
  deadline: '',
  status: 'new',
  priority: 2,
  distanceKm: '',
  nextFollowUp: '',
  tags: '',
  notes: '',
};

const toDraft = (contact: BookingContact): Draft => ({
  name: contact.name,
  kind: contact.kind,
  city: contact.city,
  region: contact.region,
  email: contact.email,
  contactName: contact.contactName,
  website: contact.website,
  instagram: contact.instagram,
  fitNote: contact.fitNote,
  deadline: contact.deadline,
  status: contact.status,
  priority: contact.priority,
  distanceKm: contact.distanceKm == null ? '' : String(contact.distanceKm),
  nextFollowUp: contact.nextFollowUp ? contact.nextFollowUp.slice(0, 10) : '',
  tags: contact.tags.join(', '),
  notes: contact.notes,
});

export default function ContactModal({
  open,
  contact,
  onClose,
  onSaved,
}: {
  open: boolean;
  contact: BookingContact | null;
  onClose: () => void;
  onSaved: (contact: BookingContact, created: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(contact ? toDraft(contact) : EMPTY);
  }, [open, contact]);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const save = async () => {
    if (!draft.name.trim()) {
      toast('Name fehlt', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        distanceKm: draft.distanceKm === '' ? null : Number(draft.distanceKm),
        tags: draft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        nextFollowUp: draft.nextFollowUp || null,
      };
      const response = await fetch(contact ? `/api/booking/contacts/${contact.id}` : '/api/booking/contacts', {
        method: contact ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
      toast(contact ? 'Kontakt aktualisiert' : 'Kontakt angelegt');
      onSaved(data.contact as BookingContact, !contact);
      onClose();
    } catch (error: any) {
      toast(error.message ?? 'Speichern fehlgeschlagen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!contact) return;
    if (!window.confirm(`„${contact.name}“ wirklich löschen? Auch die Versandhistorie geht mit.`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/booking/contacts/${contact.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      toast('Kontakt gelöscht');
      onSaved(contact, false);
      onClose();
    } catch (error: any) {
      toast(error.message ?? 'Löschen fehlgeschlagen', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contact ? contact.name : 'Neuer Kontakt'}
      subtitle={contact ? `${BOOKING_KINDS.find((entry) => entry.value === contact.kind)?.label} · ${contact.city || 'ohne Ort'}` : 'Venue, Festival, Label, Presse …'}
      footer={
        <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
          <div className="row" style={{ gap: 8 }}>
            {contact ? (
              <button type="button" className="btn btn-sm btn-danger" onClick={remove} disabled={deleting}>
                Löschen
              </button>
            ) : null}
            {contact?.website ? (
              <a className="btn btn-sm btn-ghost" href={contact.website} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : null}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Speichert …' : 'Speichern'}
            </button>
          </div>
        </div>
      }
    >
      <div className="form-grid booking-form">
        <Field label="Name">
          <input className="input" value={draft.name} onChange={(event) => set({ name: event.target.value })} />
        </Field>
        <div className="form-row">
          <Field label="Typ">
            <select className="input" value={draft.kind} onChange={(event) => set({ kind: event.target.value })}>
              {BOOKING_KINDS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={draft.status} onChange={(event) => set({ status: event.target.value })}>
              {BOOKING_STATUS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="E-Mail" hint={<span className="mono small muted">Pflicht zum Senden</span>}>
            <input
              className="input"
              type="email"
              placeholder="booking@…"
              value={draft.email}
              onChange={(event) => set({ email: event.target.value })}
            />
          </Field>
          <Field label="Ansprechpartner">
            <input
              className="input"
              placeholder="Vorname Nachname"
              value={draft.contactName}
              onChange={(event) => set({ contactName: event.target.value })}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Stadt">
            <input className="input" value={draft.city} onChange={(event) => set({ city: event.target.value })} />
          </Field>
          <Field label="Region">
            <select className="input" value={draft.region} onChange={(event) => set({ region: event.target.value })}>
              <option value="">–</option>
              {BOOKING_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Website">
            <input
              className="input"
              placeholder="https://"
              value={draft.website}
              onChange={(event) => set({ website: event.target.value })}
            />
          </Field>
          <Field label="Instagram">
            <input
              className="input"
              placeholder="@club"
              value={draft.instagram}
              onChange={(event) => set({ instagram: event.target.value })}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Priorität">
            <select
              className="input"
              value={draft.priority}
              onChange={(event) => set({ priority: Number(event.target.value) })}
            >
              <option value={1}>1 – Top-Ziel</option>
              <option value={2}>2 – normal</option>
              <option value={3}>3 – später</option>
            </select>
          </Field>
          <Field label="Entfernung (km)">
            <input
              className="input"
              type="number"
              min={0}
              value={draft.distanceKm}
              onChange={(event) => set({ distanceKm: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Warum passt das?" hint={<span className="mono small muted">Ein Satz für dich, nicht für die Mail</span>}>
          <textarea
            className="input"
            rows={2}
            value={draft.fitNote}
            onChange={(event) => set({ fitNote: event.target.value })}
          />
        </Field>
        <div className="form-row">
          <Field label="Bewerbungsfenster / Timing">
            <input
              className="input"
              placeholder="z. B. Nov–Feb"
              value={draft.deadline}
              onChange={(event) => set({ deadline: event.target.value })}
            />
          </Field>
          <Field label="Wiedervorlage">
            <input
              className="input"
              type="date"
              value={draft.nextFollowUp}
              onChange={(event) => set({ nextFollowUp: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Tags" hint={<span className="mono small muted">Komma-getrennt</span>}>
          <input
            className="input"
            placeholder="punk, hardcore, emo"
            value={draft.tags}
            onChange={(event) => set({ tags: event.target.value })}
          />
        </Field>
        <Field label="Notizen">
          <textarea
            className="input"
            rows={3}
            value={draft.notes}
            onChange={(event) => set({ notes: event.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}
