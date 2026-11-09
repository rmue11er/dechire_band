'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { IconChevronRight, IconPlus, IconZap } from '@/components/icons';
import { EmptyState, Field, Modal, PageHead, Spinner } from '@/components/ui';
import { daysUntil, TYPE_LABEL } from '@/lib/release';
import { toast } from '@/lib/toast';
import type { Release, ReleaseType } from '@/lib/types';

const TYPES: ReleaseType[] = ['single', 'ep', 'album', 'video'];

const inDays = (iso: string) => {
  const days = daysUntil(iso);
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days > 1) return `in ${days} Tagen`;
  if (days === -1) return 'gestern';
  return `vor ${Math.abs(days)} Tagen`;
};

export default function ReleasesPage() {
  const router = useRouter();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'single' as ReleaseType,
    releaseDate: '',
    presaveUrl: '',
  });

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/releases');
      const data = await response.json();
      setReleases(data.releases ?? []);
    } catch {
      toast('Could not load the releases', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.title.trim() || !form.releaseDate) {
      toast('Titel und Releasedatum fehlen', 'error');
      return;
    }
    setCreating(true);
    try {
      const response = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the release');
      toast('Welle angelegt');
      router.push(`/releases/${data.release.id}`);
    } catch (error: any) {
      toast(error.message ?? 'Could not create the release', 'error');
      setCreating(false);
    }
  };

  if (loading) return <Spinner label="Opening the release plan" />;

  return (
    <>
      <PageHead
        eyebrow="Release wave"
        title={
          <>
            Release<span className="slash">/</span>wave
          </>
        }
        sub="Eine Welle pro Release: Phasen, Aufgaben und Termine – 28 Tage vorher bis 21 Tage danach. Die Schritte sind Vorschläge, die du abhaken, verschieben oder löschen kannst."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <IconPlus size={15} /> Neues Release
          </button>
        }
      />

      {releases.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<IconZap size={24} />}
            title="Noch keine Welle geplant"
            hint="Lege ein Release mit Datum an – der Rest der Welle wird daraus berechnet."
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
                <IconPlus size={14} /> Release anlegen
              </button>
            }
          />
        </div>
      ) : (
        <div className="release-grid">
          {releases.map((release) => {
            const total = release.taskTotal ?? 0;
            const done = release.taskDone ?? 0;
            const percent = total ? Math.round((done / total) * 100) : 0;
            const days = daysUntil(release.releaseDate);
            return (
              <Link key={release.id} href={`/releases/${release.id}`} className="release-card">
                <span className="release-cover">
                  {release.coverUrl ? (
                    <img src={release.coverUrl} alt="" />
                  ) : (
                    <span className="release-cover-fallback">{release.title.slice(0, 1)}</span>
                  )}
                  <span className={`release-countdown ${days < 0 ? 'past' : days <= 7 ? 'near' : ''}`}>
                    {inDays(release.releaseDate)}
                  </span>
                </span>
                <span className="release-info">
                  <span className="release-type">{TYPE_LABEL[release.type]}</span>
                  <strong className="truncate">{release.title}</strong>
                  <span className="mono release-date">
                    {new Date(`${release.releaseDate}T12:00:00Z`).toLocaleDateString('en-GB', {
                      dateStyle: 'medium',
                    })}
                  </span>
                </span>
                <span className="release-progress">
                  <span className="release-progress-bar">
                    <span style={{ width: `${percent}%` }} />
                  </span>
                  <span className="mono">
                    {done}/{total} · {percent}%
                  </span>
                </span>
                <IconChevronRight size={16} className="release-go" />
              </Link>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neues Release"
        subtitle="Aus dem Datum wird die ganze Welle berechnet – verschiebbar, jederzeit."
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={create} disabled={creating}>
              {creating ? 'Anlegen …' : 'Welle planen'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Titel">
            <input
              className="input"
              placeholder="z. B. Fracture"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Format">
            <select
              className="select"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as ReleaseType })}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Releasedatum" hint={<span className="count">Freitag ist Standard</span>}>
            <input
              className="input"
              type="date"
              value={form.releaseDate}
              onChange={(event) => setForm({ ...form, releaseDate: event.target.value })}
            />
          </Field>
          <Field label="Pre-Save-Link" hint={<span className="count">optional</span>}>
            <input
              className="input"
              placeholder="https://…"
              value={form.presaveUrl}
              onChange={(event) => setForm({ ...form, presaveUrl: event.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
