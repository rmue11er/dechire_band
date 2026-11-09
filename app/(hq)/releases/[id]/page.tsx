'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconCalendar,
  IconChevronLeft,
  IconCheck,
  IconExternal,
  IconPlus,
  IconTrash,
  IconZap,
} from '@/components/icons';
import { PageHead, Spinner } from '@/components/ui';
import {
  MODULE_LABEL,
  PHASES,
  TYPE_LABEL,
  WAVE_RULES,
  daysUntil,
  draftCaption,
  draftTimestamp,
  waveStats,
} from '@/lib/release';
import { toast } from '@/lib/toast';
import type { Release, ReleaseStatus, ReleaseTask } from '@/lib/types';
import type { Profile } from '@/lib/types';

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  planning: 'In Planung',
  active: 'Läuft',
  released: 'Released',
  archived: 'Archiviert',
};

const MODULE_LINK: Record<string, string> = {
  studio: '/studio',
  media: '/media',
  docs: '/docs',
  website: '/website',
  press: '/docs',
  orga: '/calendar',
};

const relative = (iso: string) => {
  const days = daysUntil(iso);
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'gestern';
  return days > 0 ? `in ${days} T` : `vor ${Math.abs(days)} T`;
};

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

export default function ReleaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const releaseId = Number(params?.id);

  const [release, setRelease] = useState<Release | null>(null);
  const [tasks, setTasks] = useState<ReleaseTask[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [releaseResponse, profileResponse] = await Promise.all([
        fetch(`/api/releases/${releaseId}`),
        fetch('/api/profile'),
      ]);
      if (!releaseResponse.ok) throw new Error('not-found');
      const data = await releaseResponse.json();
      const profileData = await profileResponse.json();
      setRelease(data.release);
      setTasks(data.tasks ?? []);
      setProfile(profileData.profile ?? null);
    } catch {
      toast('Release nicht gefunden', 'error');
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => waveStats(tasks), [tasks]);
  const days = release ? daysUntil(release.releaseDate) : 0;
  const bandName = profile?.bandName ?? 'DECHIRE';

  const patchRelease = async (patch: Record<string, any>) => {
    const response = await fetch(`/api/releases/${releaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) {
      toast(data.error ?? 'Konnte nicht speichern', 'error');
      return;
    }
    setRelease(data.release);
    setTasks(data.tasks ?? []);
  };

  const toggleTask = async (task: ReleaseTask) => {
    setTasks((current) =>
      current.map((entry) => (entry.id === task.id ? { ...entry, done: !entry.done } : entry))
    );
    const response = await fetch(`/api/release-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done }),
    });
    if (!response.ok) {
      toast('Konnte nicht speichern', 'error');
      load();
    }
  };

  const createDraft = async (task: ReleaseTask) => {
    if (!release) return;
    setBusy(`draft-${task.id}`);
    try {
      const type =
        task.channel === 'story' ? 'story' : task.channel === 'reel' ? 'reel' : task.channel === 'feed' && task.key === 'announce-post' ? 'carousel' : 'photo';
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          status: 'draft',
          caption: draftCaption(task.key, release, bandName),
          scheduledAt: draftTimestamp(task.dueDate),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Konnte keinen Draft anlegen');
      await fetch(`/api/release-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: data.post.id }),
      });
      setTasks((current) =>
        current.map((entry) => (entry.id === task.id ? { ...entry, postId: data.post.id } : entry))
      );
      toast('Draft im Planner angelegt');
    } catch (error: any) {
      toast(error.message ?? 'Konnte keinen Draft anlegen', 'error');
    } finally {
      setBusy(null);
    }
  };

  const pushToCalendar = async () => {
    setBusy('calendar');
    try {
      const response = await fetch(`/api/releases/${releaseId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Konnte keine Termine anlegen');
      toast(
        data.created.length
          ? `${data.created.length} Termine im Kalender angelegt`
          : 'Alle Termine stehen schon im Kalender'
      );
    } catch (error: any) {
      toast(error.message ?? 'Konnte keine Termine anlegen', 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!window.confirm('Diese Welle löschen? Die Aufgaben verschwinden, Termine im Kalender bleiben.')) return;
    const response = await fetch(`/api/releases/${releaseId}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Welle gelöscht');
      router.push('/releases');
    }
  };

  if (loading) return <Spinner label="Welle wird geladen" />;
  if (!release) {
    return (
      <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20 }}>Release nicht gefunden</h2>
        <Link href="/releases" className="btn btn-primary" style={{ marginTop: 18 }}>
          Zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="release-topline">
        <Link href="/releases" className="btn btn-ghost btn-sm">
          <IconChevronLeft size={14} /> Alle Releases
        </Link>
        <span className="release-topline-meta">
          <span className="release-type">{TYPE_LABEL[release.type]}</span>
          <span className="mono">
            {new Date(`${release.releaseDate}T12:00:00Z`).toLocaleDateString('en-GB', { dateStyle: 'long' })}
          </span>
        </span>
      </div>

      <PageHead
        eyebrow={`Release wave /// ${days >= 0 ? `noch ${days} Tage` : `seit ${Math.abs(days)} Tagen draußen`}`}
        title={release.title}
        sub={PHASES[PhasesIndex(days)].blurb}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={pushToCalendar} disabled={busy === 'calendar'}>
              <IconCalendar size={15} /> {busy === 'calendar' ? 'Lege an …' : 'Termine in den Kalender'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={remove}>
              <IconTrash size={15} />
            </button>
          </>
        }
      />

      <div className="release-score">
        <span className="release-score-value">{stats.percent}%</span>
        <span className="release-score-bar">
          <span style={{ width: `${stats.percent}%` }} />
        </span>
        <span className="release-score-meta mono">
          {stats.done}/{stats.total} Schritte
          {stats.criticalOpen ? ` · ${stats.criticalOpen} kritisch offen` : ' · nichts Kritisches offen'}
        </span>
      </div>

      <div className="wave-layout">
        <div className="wave-main">
          {PHASES.map((phase, index) => {            const phaseTasks = tasks.filter((task) => task.phase === phase.id);
            const done = phaseTasks.filter((task) => task.done).length;
            return (
              <section key={phase.id} className={`wave-phase ${index === PhasesIndex(days) ? 'current' : ''}`}>
                <header className="wave-phase-head">
                  <span className="wave-phase-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>
                      {phase.label}
                      <span className="wave-phase-range mono">
                        {phase.from <= 0 ? `T${phase.from}` : `T+${phase.from}`}
                        {phase.to !== phase.from ? ` … ${phase.to <= 0 ? `T${phase.to}` : `T+${phase.to}`}` : ''}
                      </span>
                    </h2>
                    <p>{phase.blurb}</p>
                  </div>
                  <span className="wave-phase-count">
                    {done}/{phaseTasks.length}
                  </span>
                </header>

                <ul className="wave-tasks">
                  {phaseTasks.map((task) => (
                    <li key={task.id} className={`wave-task ${task.done ? 'done' : ''}`}>
                      <button
                        type="button"
                        className="wave-check"
                        onClick={() => toggleTask(task)}
                        aria-label={task.done ? 'Als offen markieren' : 'Abhaken'}
                      >
                        {task.done ? <IconCheck size={12} /> : null}
                      </button>

                      <div className="wave-task-main">
                        <span className="wave-task-label">
                          {task.label}
                          {task.critical ? <em className="wave-critical">kritisch</em> : null}
                        </span>
                        <span className="wave-task-detail">{task.detail}</span>
                      </div>

                      <span className={`wave-task-due ${task.dueDate < new Date().toISOString().slice(0, 10) && !task.done ? 'late' : ''}`}>
                        <b className="mono">{shortDate(task.dueDate)}</b>
                        <em className="mono">{relative(task.dueDate)}</em>
                      </span>

                      <div className="wave-task-actions">
                        {task.module === 'planner' ? (
                          task.postId ? (
                            <Link href={`/planner?post=${task.postId}`} className="wave-act">
                              <IconExternal size={11} /> Post
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="wave-act"
                              onClick={() => createDraft(task)}
                              disabled={busy === `draft-${task.id}`}
                            >
                              <IconPlus size={11} />
                              {busy === `draft-${task.id}` ? '…' : 'Draft'}
                            </button>
                          )
                        ) : MODULE_LINK[task.module] ? (
                          <Link href={MODULE_LINK[task.module]} className="wave-act">
                            {MODULE_LABEL[task.module]}
                          </Link>
                        ) : (
                          <span className="wave-act static">{MODULE_LABEL[task.module]}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="wave-side">
          <div className="panel wave-panel">
            <div className="panel-head">
              <span className="panel-title">Einstellungen</span>
            </div>
            <div className="panel-body wave-settings">
              <label className="wave-field">
                <span className="label">Release-Datum</span>
                <input
                  className="input"
                  type="date"
                  value={release.releaseDate}
                  onChange={(event) => patchRelease({ releaseDate: event.target.value })}
                />
                <span className="wave-hint mono">verschiebt die ganze Welle</span>
              </label>
              <label className="wave-field">
                <span className="label">Status</span>
                <select
                  className="select"
                  value={release.status}
                  onChange={(event) => patchRelease({ status: event.target.value })}
                >
                  {(Object.keys(STATUS_LABEL) as ReleaseStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wave-field">
                <span className="label">Pre-Save</span>
                <input
                  className="input"
                  placeholder="https://…"
                  defaultValue={release.presaveUrl}
                  onBlur={(event) => patchRelease({ presaveUrl: event.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="panel wave-panel">
            <div className="panel-head">
              <span className="panel-title">Phasen</span>
            </div>
            <div className="panel-body wave-phases">
              {PHASES.map((phase) => {
                const phaseTasks = tasks.filter((task) => task.phase === phase.id);
                const done = phaseTasks.filter((task) => task.done).length;
                const percent = phaseTasks.length ? Math.round((done / phaseTasks.length) * 100) : 0;
                return (
                  <div key={phase.id} className="wave-phase-stat">
                    <span>{phase.label}</span>
                    <span className="wave-phase-bar">
                      <span style={{ width: `${percent}%` }} />
                    </span>
                    <span className="mono">
                      {done}/{phaseTasks.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel wave-panel">
            <div className="panel-head">
              <span className="panel-title">Spielregeln</span>
            </div>
            <div className="panel-body wave-rules">
              {WAVE_RULES.map((rule) => (
                <div key={rule.title} className="wave-rule">
                  <span className={`wave-rule-tag ${rule.tag.toLowerCase()}`}>{rule.tag}</span>
                  <strong>{rule.title}</strong>
                  <p>{rule.body}</p>
                </div>
              ))}
              <p className="wave-rule-note">
                Erfahrungswerte aus Release-Kampagnen – keine Gesetze. Wenn deine Leute anders ticken, schlag sie.
              </p>
            </div>
          </div>

          <div className="panel wave-panel">
            <div className="panel-head">
              <span className="panel-title">Nächste Schritte</span>
            </div>
            <div className="panel-body wave-next">
              {stats.next.length === 0 ? (
                <p className="small muted">Alles Offene liegt in der Vergangenheit – oder du bist durch.</p>
              ) : (
                stats.next.map((task) => (
                  <div key={task.id} className="wave-next-row">
                    <span className="mono">{shortDate(task.dueDate)}</span>
                    <span className="truncate">{task.label}</span>
                  </div>
                ))
              )}
              <button type="button" className="btn btn-sm btn-ghost" onClick={pushToCalendar}>
                <IconZap size={13} /> Termine in den Kalender
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/** which phase the release is in right now */
function PhasesIndex(days: number) {
  if (days > 15) return 0;
  if (days > 7) return 1;
  if (days > 0) return 2;
  if (days === 0) return 3;
  return 4;
}
