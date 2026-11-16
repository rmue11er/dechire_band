'use client';

import { useEffect, useState } from 'react';
import { Field } from '@/components/ui';
import { TEMPLATE_VARS } from '@/lib/booking';
import { toast } from '@/lib/toast';
import type { BookingProfile, BookingTemplate } from '@/lib/types';

export default function TemplatesPanel({
  templates,
  profile,
  onTemplateSaved,
  onProfileSaved,
}: {
  templates: BookingTemplate[];
  profile: BookingProfile;
  onTemplateSaved: (template: BookingTemplate) => void;
  onProfileSaved: (profile: BookingProfile) => void;
}) {
  const [activeId, setActiveId] = useState<number | null>(templates[0]?.id ?? null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);
  const [savingProfile, setSavingProfile] = useState(false);

  const active = templates.find((template) => template.id === activeId) ?? templates[0] ?? null;

  useEffect(() => {
    if (!active) return;
    setActiveId(active.id);
    setSubject(active.subject);
    setBody(active.body);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [active?.id]);

  useEffect(() => setDraftProfile(profile), [profile]);

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/booking/templates/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
      onTemplateSaved(data.template as BookingTemplate);
      toast('Vorlage gespeichert');
    } catch (error: any) {
      toast(error.message ?? 'Speichern fehlgeschlagen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-profile', profile: draftProfile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
      onProfileSaved(data.profile as BookingProfile);
      toast('Absender und Links gespeichert');
    } catch (error: any) {
      toast(error.message ?? 'Speichern fehlgeschlagen', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="booking-templates">
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Absender &amp; Links</div>
          <span className="mono small muted">füllt die Platzhalter</span>
        </div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <Field label="Heimatstadt">
              <input
                className="input"
                value={draftProfile.homebase}
                onChange={(event) => setDraftProfile({ ...draftProfile, homebase: event.target.value })}
              />
            </Field>
            <Field label="Ein Satz Genre">
              <input
                className="input"
                value={draftProfile.genre}
                onChange={(event) => setDraftProfile({ ...draftProfile, genre: event.target.value })}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Dein Name (Absender)">
              <input
                className="input"
                value={draftProfile.sender}
                onChange={(event) => setDraftProfile({ ...draftProfile, sender: event.target.value })}
              />
            </Field>
            <Field label="Links zum Anhören">
              <input
                className="input"
                placeholder="https://bandcamp.com/…"
                value={draftProfile.listenUrl}
                onChange={(event) => setDraftProfile({ ...draftProfile, listenUrl: event.target.value })}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Live-Video">
              <input
                className="input"
                placeholder="https://youtube.com/…"
                value={draftProfile.liveUrl}
                onChange={(event) => setDraftProfile({ ...draftProfile, liveUrl: event.target.value })}
              />
            </Field>
            <Field label="Presskit / Website">
              <input
                className="input"
                placeholder="https://dechire.band"
                value={draftProfile.pressUrl}
                onChange={(event) => setDraftProfile({ ...draftProfile, pressUrl: event.target.value })}
              />
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Speichert …' : 'Absender speichern'}
            </button>
          </div>
        </div>
      </section>

      <div className="booking-template-grid">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Vorlagen</div>
            <span className="mono small muted">{templates.length}</span>
          </div>
          <div className="panel-body booking-template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`booking-template-row ${template.id === active?.id ? 'is-active' : ''}`}
                onClick={() => setActiveId(template.id)}
              >
                <span>{template.name}</span>
                <span className="mono small muted">{template.language.toUpperCase()}</span>
              </button>
            ))}
            <div className="booking-vars">
              <div className="label">
                <span>Platzhalter</span>
                <span className="mono small muted">werden beim Senden ersetzt</span>
              </div>
              {TEMPLATE_VARS.map((variable) => (
                <div key={variable.key} className="booking-var">
                  <code>{variable.label}</code>
                  <span className="small muted">{variable.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">{active?.name ?? 'Vorlage'}</div>
            <div className="row" style={{ gap: 10 }}>
              <span className="mono small muted">{active?.language?.toUpperCase() ?? ''}</span>
              <button type="button" className="btn btn-sm btn-primary" onClick={save} disabled={saving || !active}>
                {saving ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </div>
          <div className="panel-body form-grid">
            <Field label="Betreff">
              <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} />
            </Field>
            <Field label="Text">
              <textarea
                className="input booking-compose"
                rows={18}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </Field>
            <p className="booking-hint">
              Kurz schlägt lang: fünf Zeilen mit einem konkreten Ziel werden beantwortet, zehn Absätze nicht.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
