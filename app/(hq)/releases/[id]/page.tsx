'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import MediaPicker from '@/components/MediaPicker';
import ReleasePlayer from '@/components/ReleasePlayer';
import ReleaseTaskModal from '@/components/ReleaseTaskModal';
import {
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconDocument,
  IconExternal,
  IconFilm,
  IconImage,
  IconLayers,
  IconMusic,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
  IconZap,
} from '@/components/icons';
import { PageHead, Spinner } from '@/components/ui';
import {
  MODULE_LABEL,
  PHASES,
  RELEASE_SOURCES,
  TYPE_LABEL,
  WAVE_RULES,
  daysUntil,
  draftCaption,
  draftTimestamp,
  phaseFor,
  sourceById,
  sourceByUrl,
  waveStats,
} from '@/lib/release';
import { toast } from '@/lib/toast';
import type {
  BandDocument,
  Design,
  MediaItem,
  Profile,
  Release,
  ReleasePhaseId,
  ReleaseStatus,
  ReleaseTask,
} from '@/lib/types';

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

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { dateStyle: 'long' });

type PickerTarget =
  | { target: 'release'; asset: 'cover' | 'audio' | 'video' }
  | { target: 'task'; task: ReleaseTask };

const pickerKind = (target: PickerTarget): 'image' | 'video' | 'audio' => {
  if (target.target === 'task') return target.task.mediaKind || 'image';
  return target.asset === 'cover' ? 'image' : target.asset === 'audio' ? 'audio' : 'video';
};

export default function ReleaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const releaseId = Number(params?.id);

  const [release, setRelease] = useState<Release | null>(null);
  const [tasks, setTasks] = useState<ReleaseTask[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [documents, setDocuments] = useState<BandDocument[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [taskModal, setTaskModal] = useState<{ task: ReleaseTask | null; phase: ReleasePhaseId } | null>(null);

  const load = useCallback(async () => {
    try {
      const [releaseResponse, profileResponse, mediaResponse, docsResponse, designsResponse] =
        await Promise.all([
          fetch(`/api/releases/${releaseId}`),
          fetch('/api/profile'),
          fetch('/api/media'),
          fetch('/api/documents'),
          fetch('/api/designs'),
        ]);
      if (!releaseResponse.ok) throw new Error('not-found');
      const [data, profileData, mediaData, docsData, designsData] = await Promise.all([
        releaseResponse.json(),
        profileResponse.json(),
        mediaResponse.json(),
        docsResponse.json(),
        designsResponse.json(),
      ]);
      setRelease(data.release);
      setTasks(data.tasks ?? []);
      setProfile(profileData.profile ?? null);
      setMedia(mediaData.media ?? []);
      setDocuments(docsData.documents ?? []);
      setDesigns(designsData.designs ?? []);
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
  const bandName = profile?.bandName ?? 'déchire';
  const currentPhase = phaseFor(-days);
  const documentById = useMemo(
    () => new Map(documents.map((entry) => [entry.id, entry])),
    [documents]
  );
  const designById = useMemo(() => new Map(designs.map((entry) => [entry.id, entry])), [designs]);

  const assetIcon = (kind: string) =>
    kind === 'audio' ? <IconMusic size={11} /> : kind === 'video' ? <IconFilm size={11} /> : <IconImage size={11} />;

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

  const updateTask = async (task: ReleaseTask, patch: Record<string, any>, reload = false) => {
    const response = await fetch(`/api/release-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) {
      toast(data.error ?? 'Konnte nicht speichern', 'error');
      load();
      return;
    }
    if (reload) {
      await load();
      return;
    }
    if (data.task) {
      setTasks((current) => current.map((entry) => (entry.id === task.id ? { ...entry, ...data.task } : entry)));
    }
  };

  const deleteTask = async (task: ReleaseTask) => {
    if (!window.confirm(`„${task.label}“ löschen?`)) return;
    const response = await fetch(`/api/release-tasks/${task.id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast('Konnte den Schritt nicht löschen', 'error');
      return;
    }
    setTasks((current) => current.filter((entry) => entry.id !== task.id));
    toast('Schritt gelöscht');
  };

  const restoreSteps = async () => {
    setBusy('playbook');
    try {
      const response = await fetch(`/api/releases/${releaseId}/playbook`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Konnte das Playbook nicht ergänzen');
      setTasks(data.tasks ?? []);
      toast(
        data.added
          ? `${data.added} fehlende Schritte ergänzt`
          : 'Alle Playbook-Schritte sind schon da'
      );
    } catch (error: any) {
      toast(error.message ?? 'Konnte das Playbook nicht ergänzen', 'error');
    } finally {
      setBusy(null);
    }
  };

  const applyPicker = async (ids: number[]) => {
    const target = picker;
    setPicker(null);
    const mediaId = ids[0];
    if (!target || !mediaId) return;
    if (target.target === 'release') {
      const field =
        target.asset === 'cover' ? 'coverMediaId' : target.asset === 'audio' ? 'audioMediaId' : 'videoMediaId';
      await patchRelease({ [field]: mediaId });
      toast(
        target.asset === 'cover'
          ? 'Cover gesetzt'
          : target.asset === 'audio'
            ? 'Master angehängt – oben abspielbar'
            : 'Musikvideo angehängt'
      );
      return;
    }
    await updateTask(target.task, { mediaId }, true);
    toast('Medium an den Schritt gehängt');
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
        sub={PHASES.find((phase) => phase.id === currentPhase)?.blurb ?? ''}
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setTaskModal({ task: null, phase: currentPhase })}
            >
              <IconPlus size={15} /> Aufgabe
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={restoreSteps}
              disabled={busy === 'playbook'}
            >
              <IconZap size={15} /> {busy === 'playbook' ? 'Ergänze …' : 'Playbook ergänzen'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={pushToCalendar} disabled={busy === 'calendar'}>
              <IconCalendar size={15} /> {busy === 'calendar' ? 'Lege an …' : 'Kalender'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={remove}>
              <IconTrash size={15} />
            </button>
          </>
        }
      />

      {days >= 0 && days < 56 ? (
        <p className="release-warning">
          <strong>{56 - days} Tage fehlen</strong> bis zum empfohlenen Vorlauf von 8 Wochen – die
          Produktionsschritte liegen dadurch schon in der Vergangenheit. Lege den Release später oder
          hake ab, was längst erledigt ist.
        </p>
      ) : null}

      <section className="release-hero panel">
        <div className="release-hero-cover">
          {release.coverUrl ? (
            <img src={release.coverUrl} alt={`${release.title} cover`} />
          ) : (
            <div className="release-hero-cover-empty">
              <IconImage size={24} />
              <span>Cover fehlt</span>
            </div>
          )}
          <button
            type="button"
            className="release-cover-edit"
            onClick={() => setPicker({ target: 'release', asset: 'cover' })}
          >
            {release.coverUrl ? 'Cover ändern' : 'Cover wählen'}
          </button>
        </div>

        <div className="release-hero-main">
          <span className="release-hero-kicker">
            {TYPE_LABEL[release.type]} · {longDate(release.releaseDate)} ·{' '}
            {days >= 0 ? `T-${days}` : `T+${Math.abs(days)}`}
          </span>
          <h2 className="release-hero-title">{release.title}</h2>
          <p className="release-hero-band">{bandName}</p>

          {release.audioUrl ? (
            <ReleasePlayer src={release.audioUrl} title={`${release.title} — ${bandName}`} />
          ) : (
            <button
              type="button"
              className="release-hero-missing"
              onClick={() => setPicker({ target: 'release', asset: 'audio' })}
            >
              <IconMusic size={16} />
              <span>Master fehlt – MP3/WAV aus der Mediathek wählen</span>
              <IconPlus size={13} />
            </button>
          )}

          <div className="release-hero-assets">
            <button
              type="button"
              className={`release-asset ${release.coverUrl ? 'on' : ''}`}
              onClick={() => setPicker({ target: 'release', asset: 'cover' })}
            >
              <IconImage size={12} /> Cover {release.coverUrl ? '✓' : '—'}
            </button>
            <button
              type="button"
              className={`release-asset ${release.audioUrl ? 'on' : ''}`}
              onClick={() => setPicker({ target: 'release', asset: 'audio' })}
            >
              <IconMusic size={12} /> Master {release.audioUrl ? '✓' : '—'}
            </button>
            {release.videoUrl ? (
              <a className="release-asset on" href={release.videoUrl} target="_blank" rel="noreferrer">
                <IconFilm size={12} /> Musikvideo <IconExternal size={10} />
              </a>
            ) : (
              <button
                type="button"
                className="release-asset"
                onClick={() => setPicker({ target: 'release', asset: 'video' })}
              >
                <IconFilm size={12} /> Musikvideo —
              </button>
            )}
            <span className={`release-asset static ${release.presaveUrl ? 'on' : ''}`}>
              Pre-Save {release.presaveUrl ? '✓' : '—'}
            </span>
            <span className={`release-asset static ${release.coverUrl && release.audioUrl ? 'on' : ''}`}>
              {release.coverUrl && release.audioUrl ? 'Spielbar' : 'Unvollständig'}
            </span>
          </div>

          <div className="release-hero-progress">
            <span className="release-hero-percent">{stats.percent}%</span>
            <span className="release-hero-bar">
              <span style={{ width: `${stats.percent}%` }} />
            </span>
            <span className="release-hero-meta mono">
              {stats.done}/{stats.total} Schritte
              {stats.criticalOpen ? ` · ${stats.criticalOpen} kritisch offen` : ' · nichts Kritisches offen'}
            </span>
          </div>
        </div>
      </section>

      <div className="wave-layout">
        <div className="wave-main">
          {PHASES.map((phase, index) => {
            const phaseTasks = tasks.filter((task) => task.phase === phase.id);
            const done = phaseTasks.filter((task) => task.done).length;
            return (
              <section key={phase.id} className={`wave-phase ${phase.id === currentPhase ? 'current' : ''}`}>
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
                  <button
                    type="button"
                    className="wave-phase-add"
                    onClick={() => setTaskModal({ task: null, phase: phase.id })}
                    title={`Aufgabe in ${phase.label} anlegen`}
                    aria-label={`Aufgabe in ${phase.label} anlegen`}
                  >
                    <IconPlus size={12} />
                  </button>
                </header>

                {phaseTasks.length === 0 ? (
                  <p className="wave-phase-empty">
                    Keine Schritte in dieser Phase –{' '}
                    <button type="button" onClick={() => setTaskModal({ task: null, phase: phase.id })}>
                      eine anlegen
                    </button>{' '}
                    oder das Playbook ergänzen.
                  </p>
                ) : (
                  <ul className="wave-tasks">
                    {phaseTasks.map((task) => {
                      const document = task.documentId ? documentById.get(task.documentId) : null;
                      const design = task.designId ? designById.get(task.designId) : null;
                      const source = task.reference ? sourceByUrl(task.reference) : null;
                      return (
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
                              {task.key === '' ? <em className="wave-custom">eigene</em> : null}
                            </span>
                            <span className="wave-task-detail">{task.detail}</span>
                            {task.reference ? (
                              <a
                                className="wave-task-source"
                                href={task.reference}
                                target="_blank"
                                rel="noreferrer"
                                title={source?.note ?? 'Quelle öffnen'}
                              >
                                <IconExternal size={10} /> {source?.label ?? 'Quelle'}
                              </a>
                            ) : null}
                            {task.notes ? <span className="wave-task-note">{task.notes}</span> : null}

                            <div className="wave-task-assets">
                              {task.mediaId && task.media ? (
                                <span className="wave-task-asset on">
                                  {assetIcon(task.media.mime.startsWith('audio/') ? 'audio' : task.media.mime.startsWith('video/') ? 'video' : 'image')}
                                  <a href={task.media.url} target="_blank" rel="noreferrer" className="truncate">
                                    {task.media.title}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => updateTask(task, { mediaId: null }, true)}
                                    aria-label="Medium entfernen"
                                  >
                                    <IconX size={10} />
                                  </button>
                                </span>
                              ) : task.mediaKind ? (
                                <button
                                  type="button"
                                  className="wave-task-asset add"
                                  onClick={() => setPicker({ target: 'task', task })}
                                >
                                  {assetIcon(task.mediaKind)} Medium
                                </button>
                              ) : null}

                              {task.documentId && document ? (
                                <span className="wave-task-asset on">
                                  <IconDocument size={11} />
                                  <Link href={`/docs?doc=${document.id}`} className="truncate">
                                    {document.title}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => updateTask(task, { documentId: null })}
                                    aria-label="Dokument entfernen"
                                  >
                                    <IconX size={10} />
                                  </button>
                                </span>
                              ) : task.module === 'docs' || task.module === 'press' ? (
                                <select
                                  className="wave-task-select"
                                  value=""
                                  onChange={(event) =>
                                    event.target.value &&
                                    updateTask(task, { documentId: Number(event.target.value) })
                                  }
                                  aria-label="Dokument verknüpfen"
                                >
                                  <option value="">+ Dokument</option>
                                  {documents.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.title}
                                    </option>
                                  ))}
                                </select>
                              ) : null}

                              {task.designId && design ? (
                                <span className="wave-task-asset on">
                                  <IconLayers size={11} />
                                  <Link href={`/studio/${design.id}`} className="truncate">
                                    {design.title}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => updateTask(task, { designId: null })}
                                    aria-label="Design entfernen"
                                  >
                                    <IconX size={10} />
                                  </button>
                                </span>
                              ) : task.module === 'studio' ? (
                                <select
                                  className="wave-task-select"
                                  value=""
                                  onChange={(event) =>
                                    event.target.value &&
                                    updateTask(task, { designId: Number(event.target.value) })
                                  }
                                  aria-label="Design verknüpfen"
                                >
                                  <option value="">+ Design</option>
                                  {designs.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.title}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                            </div>
                          </div>

                          <span
                            className={`wave-task-due ${
                              task.dueDate < new Date().toISOString().slice(0, 10) && !task.done ? 'late' : ''
                            }`}
                          >
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
                            <button
                              type="button"
                              className="wave-act icon"
                              onClick={() => setTaskModal({ task, phase: task.phase })}
                              title="Schritt bearbeiten"
                              aria-label="Schritt bearbeiten"
                            >
                              <IconPencil size={11} />
                            </button>
                            <button
                              type="button"
                              className="wave-act icon danger"
                              onClick={() => deleteTask(task)}
                              title="Schritt löschen"
                              aria-label="Schritt löschen"
                            >
                              <IconTrash size={11} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
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
              {WAVE_RULES.map((rule) => {
                const source = rule.source ? sourceById(rule.source) : null;
                return (
                  <div key={rule.title} className="wave-rule">
                    <span className={`wave-rule-tag ${rule.tag.toLowerCase()}`}>{rule.tag}</span>
                    <strong>{rule.title}</strong>
                    <p>{rule.body}</p>
                    {source ? (
                      <a
                        className="wave-rule-source"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        title={source.note}
                      >
                        <IconExternal size={10} /> {source.label}
                      </a>
                    ) : null}
                  </div>
                );
              })}
              <p className="wave-rule-note">
                Jede Plattform-Regel verlinkt ihre Quelle. Regeln ohne Link sind Erfahrungswerte – keine Gesetze.
              </p>
            </div>
          </div>

          <div className="panel wave-panel">
            <div className="panel-head">
              <span className="panel-title">Belege</span>
              <span className="wave-panel-count mono">{RELEASE_SOURCES.length}</span>
            </div>
            <div className="panel-body wave-sources">
              {RELEASE_SOURCES.map((source) => (
                <a
                  key={source.id}
                  className="wave-source"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{source.label}</strong>
                  <span>{source.note}</span>
                </a>
              ))}
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

      <MediaPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        media={media}
        selectedIds={[]}
        kind={picker ? pickerKind(picker) : 'image'}
        onConfirm={applyPicker}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
      />

      <ReleaseTaskModal
        open={!!taskModal}
        releaseId={releaseId}
        releaseDate={release.releaseDate}
        task={taskModal?.task ?? null}
        defaultPhase={taskModal?.phase}
        onClose={() => setTaskModal(null)}
        onSaved={(next) => setTasks(next)}
        onUpdated={(updated) =>
          setTasks((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
        }
        onDeleted={(id) => setTasks((current) => current.filter((entry) => entry.id !== id))}
      />
    </>
  );
}
