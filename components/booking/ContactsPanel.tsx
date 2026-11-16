'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconExternal, IconMail, IconPencil, IconPlus, IconSearch, IconUsers } from '@/components/icons';
import { EmptyState } from '@/components/ui';
import { BOOKING_KINDS, BOOKING_REGIONS, BOOKING_STATUS, bookingKindLabel, bookingStatusLabel } from '@/lib/booking';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { BookingContact, BookingProfile, BookingTemplate } from '@/lib/types';
import ComposeModal from './ComposeModal';
import ContactModal from './ContactModal';

const PRIORITY_LABEL: Record<number, string> = { 1: 'Top-Ziel', 2: 'normal', 3: 'später' };

export default function ContactsPanel({
  contacts,
  templates,
  profile,
  bandName,
  onRefresh,
  seedsAvailable,
  onRestoreSeed,
  focusContactId,
}: {
  contacts: BookingContact[];
  templates: BookingTemplate[];
  profile: BookingProfile;
  bandName: string;
  onRefresh: () => void;
  seedsAvailable: number;
  onRestoreSeed: () => void;
  focusContactId?: number | null;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');
  const [priority, setPriority] = useState('');
  const [mailOnly, setMailOnly] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<BookingContact | null>(null);
  const [creating, setCreating] = useState(false);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);

  /* a hit from the global search opens that contact straight away */
  useEffect(() => {
    if (!focusContactId) return;
    const wanted = contacts.find((contact) => contact.id === focusContactId);
    if (wanted) setEditing(wanted);
  }, [focusContactId, contacts]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const contact of contacts) counts[contact.status] = (counts[contact.status] ?? 0) + 1;
    return counts;
  }, [contacts]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (kind && contact.kind !== kind) return false;
      if (status && contact.status !== status) return false;
      if (region && contact.region !== region) return false;
      if (priority && String(contact.priority) !== priority) return false;
      if (mailOnly && !contact.email) return false;
      if (!term) return true;
      return [contact.name, contact.city, contact.region, contact.contactName, contact.email, contact.fitNote, contact.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [contacts, query, kind, status, region, priority, mailOnly]);

  const visibleIds = filtered.map((contact) => contact.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectedContacts = contacts.filter((contact) => selected.has(contact.id));
  const selectedWithMail = selectedContacts.filter((contact) => contact.email);

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(() => (allSelected ? new Set<number>() : new Set(visibleIds)));

  const bulk = async (patch: Record<string, any>) => {
    if (!selected.size) return;
    setBusy(true);
    try {
      const response = await fetch('/api/booking/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], ...patch }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Änderung fehlgeschlagen');
      toast(`${data.updated} Kontakte aktualisiert`);
      onRefresh();
    } catch (error: any) {
      toast(error.message ?? 'Änderung fehlgeschlagen', 'error');
    } finally {
      setBusy(false);
    }
  };

  const followUpInOneWeek = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    bulk({ nextFollowUp: date.toISOString().slice(0, 10) });
  };

  return (
    <div className="booking-contacts">
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconUsers size={16} /> Kontakte
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="mono small muted">
              {filtered.length} von {contacts.length}
            </span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onRestoreSeed} disabled={busy}>
              Recherche ({seedsAvailable})
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={14} /> Kontakt
            </button>
          </div>
        </div>

        <div className="panel-body booking-toolbar">
          <div className="booking-search">
            <IconSearch size={15} />
            <input
              className="input"
              placeholder="Name, Stadt, Tag, Notiz …"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select className="input" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="">Alle Typen</option>
            {BOOKING_KINDS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
          <select className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="">Alle Regionen</option>
            {BOOKING_REGIONS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">Alle Prioritäten</option>
            <option value="1">1 – Top-Ziel</option>
            <option value="2">2 – normal</option>
            <option value="3">3 – später</option>
          </select>
          <label className="booking-toggle">
            <input type="checkbox" checked={mailOnly} onChange={(event) => setMailOnly(event.target.checked)} />
            <span>nur mit E-Mail</span>
          </label>
        </div>

        <div className="panel-body booking-statuses">
          <button
            type="button"
            className={`booking-chip ${status === '' ? 'is-active' : ''}`}
            onClick={() => setStatus('')}
          >
            Alle <span>{contacts.length}</span>
          </button>
          {BOOKING_STATUS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className={`booking-chip ${status === entry.value ? 'is-active' : ''}`}
              onClick={() => setStatus(status === entry.value ? '' : entry.value)}
              title={entry.hint}
            >
              {entry.label} <span>{statusCounts[entry.value] ?? 0}</span>
            </button>
          ))}
        </div>

        {selected.size ? (
          <div className="booking-bulk">
            <span className="mono small muted">{selected.size} ausgewählt · {selectedWithMail.length} mit E-Mail</span>
            <div className="row" style={{ gap: 8 }}>
              <select
                className="input input-sm"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) bulk({ status: event.target.value });
                  event.target.value = '';
                }}
              >
                <option value="">Status setzen …</option>
                {BOOKING_STATUS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <select
                className="input input-sm"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) bulk({ priority: Number(event.target.value) });
                  event.target.value = '';
                }}
              >
                <option value="">Priorität …</option>
                <option value="1">1 – Top-Ziel</option>
                <option value="2">2 – normal</option>
                <option value="3">3 – später</option>
              </select>
              <button type="button" className="btn btn-sm btn-ghost" onClick={followUpInOneWeek} disabled={busy}>
                Wiedervorlage +7 Tage
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setComposing(true)}
                disabled={!selectedWithMail.length}
              >
                <IconMail size={14} /> Anschreiben ({selectedWithMail.length})
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
                Aufheben
              </button>
            </div>
          </div>
        ) : null}

        {filtered.length ? (
          <div className="booking-table-wrap">
            <table className="booking-table">
              <thead>
                <tr>
                  <th className="booking-check-cell">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Alle auswählen" />
                  </th>
                  <th>Kontakt</th>
                  <th>Ort</th>
                  <th>Warum</th>
                  <th>E-Mail</th>
                  <th>Status</th>
                  <th>Letzter Kontakt</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr key={contact.id} className={selected.has(contact.id) ? 'is-selected' : ''}>
                    <td className="booking-check-cell">
                      <input
                        type="checkbox"
                        checked={selected.has(contact.id)}
                        onChange={() => toggle(contact.id)}
                        aria-label={`${contact.name} auswählen`}
                      />
                    </td>
                    <td>
                      <button type="button" className="booking-name" onClick={() => setEditing(contact)}>
                        {contact.name}
                      </button>
                      <div className="booking-meta">
                        <span className="booking-kind">{bookingKindLabel(contact.kind)}</span>
                        {contact.priority === 1 ? <span className="booking-kind is-top">Top</span> : null}
                        {contact.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="booking-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div>{contact.city || '–'}</div>
                      <div className="booking-meta">
                        {contact.distanceKm != null ? `${contact.distanceKm} km` : contact.region || ''}
                      </div>
                    </td>
                    <td className="booking-fit">
                      {contact.fitNote || <span className="muted">–</span>}
                      {contact.deadline ? <div className="booking-meta">{contact.deadline}</div> : null}
                    </td>
                    <td>
                      {contact.email ? (
                        <a className="booking-mail" href={`mailto:${contact.email}`}>
                          {contact.email}
                        </a>
                      ) : (
                        <span className="booking-missing">fehlt</span>
                      )}
                      {contact.sentCount ? <div className="booking-meta">{contact.sentCount}× angeschrieben</div> : null}
                    </td>
                    <td>
                      <span className={`booking-status is-${contact.status}`}>{bookingStatusLabel(contact.status)}</span>
                      <div className="booking-meta">{PRIORITY_LABEL[contact.priority] ?? ''}</div>
                    </td>
                    <td>
                      <div>{contact.lastContactAt ? timeAgo(contact.lastContactAt) : '–'}</div>
                      {contact.nextFollowUp ? (
                        <div className="booking-meta">Wieder: {contact.nextFollowUp.slice(0, 10)}</div>
                      ) : null}
                    </td>
                    <td className="booking-actions">
                      {contact.sourceUrl || contact.website ? (
                        <a
                          className="icon-btn"
                          href={contact.sourceUrl || contact.website}
                          target="_blank"
                          rel="noreferrer"
                          title="Quelle öffnen"
                        >
                          <IconExternal size={14} />
                        </a>
                      ) : null}
                      <button type="button" className="icon-btn" onClick={() => setEditing(contact)} title="Bearbeiten">
                        <IconPencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-body">
            <EmptyState
              icon={<IconUsers size={20} />}
              title="Kein Kontakt passt zu diesem Filter"
              hint="Filter zurücksetzen oder eigene Kontakte anlegen."
              action={
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => {
                  setQuery('');
                  setKind('');
                  setStatus('');
                  setRegion('');
                  setPriority('');
                  setMailOnly(false);
                }}>
                  Filter zurücksetzen
                </button>
              }
            />
          </div>
        )}
      </section>

      <ContactModal
        open={creating || Boolean(editing)}
        contact={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          onRefresh();
          setSelected(new Set());
        }}
      />

      <ComposeModal
        open={composing}
        contacts={selectedContacts}
        templates={templates}
        profile={profile}
        bandName={bandName}
        onClose={() => setComposing(false)}
        onQueued={(queued, skipped) => {
          toast(
            `${queued} Mail${queued === 1 ? '' : 's'} eingereiht${skipped.length ? ` · ${skipped.length} ohne Adresse übersprungen` : ''}`
          );
          setSelected(new Set());
          onRefresh();
        }}
      />
    </div>
  );
}
