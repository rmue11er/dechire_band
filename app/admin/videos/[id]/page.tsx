'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconChevronDown,
  IconChevronLeft,
  IconClock,
  IconDocument,
  IconFilm,
  IconGrid,
  IconImage,
  IconMapPin,
  IconMusic,
  IconPause,
  IconPencil,
  IconPlay,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconVideo,
  IconX,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import { Field, PageHead, Spinner } from '@/components/ui';
import VideoProjectModal from '@/components/videos/VideoProjectModal';
import VideoShotModal from '@/components/videos/VideoShotModal';
import VideoTimeline from '@/components/videos/VideoTimeline';
import { analyseAudioBuffer, audioPeaks, type BeatAnalysis } from '@/lib/beats';
import { formatDate } from '@/lib/format';
import { toast } from '@/lib/toast';
import {
  SHOT_IDEAS,
  SHOT_MOODS,
  SHOT_SECTIONS,
  durationLabel,
  sectionLabel,
  shotCoverage,
  shotStatusLabel,
  timecode,
  videoStatusLabel,
} from '@/lib/videos';
import type { BandDocument, MediaItem, Song, VideoProject, VideoShot } from '@/lib/types';

const LOOK_SUGGESTIONS = [
  'kalt',
  'nass',
  'leer',
  'still',
  'nah',
  'Gegenlicht',
  'Handkamera',
  'Staub',
  'Nacht',
  'Grau',
];

const CHAPTERS = [
  { id: 'song', label: 'Song & Ton' },
  { id: 'idee', label: 'Die Idee' },
  { id: 'ablauf', label: 'Ablauf' },
  { id: 'dreh', label: 'Drehtag' },
  { id: 'pitch', label: 'Pitch' },
];

export default function VideoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const videoId = Number(params?.id);

  const [project, setProject] = useState<VideoProject | null>(null);
  const [shots, setShots] = useState<VideoShot[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [documents, setDocuments] = useState<BandDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<BeatAnalysis | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [analysing, setAnalysing] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [shotModal, setShotModal] = useState<{ shot: VideoShot | null } | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [uploadingShot, setUploadingShot] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);

  /* the pitch fields are edited in place and saved quietly */
  const [concept, setConcept] = useState('');
  const [needs, setNeeds] = useState('');
  const [lookWords, setLookWords] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [wordDraft, setWordDraft] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const shotInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [videoResponse, songResponse, mediaResponse, docsResponse] = await Promise.all([
        fetch(`/api/videos/${videoId}`),
        fetch('/api/songs'),
        fetch('/api/media'),
        fetch('/api/documents'),
      ]);
      if (!videoResponse.ok) throw new Error('not-found');
      const [videoData, songData, mediaData, docsData] = await Promise.all([
        videoResponse.json(),
        songResponse.json(),
        mediaResponse.json(),
        docsResponse.json(),
      ]);
      setProject(videoData.video);
      setShots(videoData.shots ?? []);
      setSongs(songData.songs ?? []);
      setMedia(mediaData.media ?? []);
      setDocuments(docsData.documents ?? []);
    } catch {
      toast('Konnte das Video nicht laden', 'error');
      router.push('/admin/videos');
    } finally {
      setLoading(false);
    }
  }, [videoId, router]);

  useEffect(() => {
    load();
  }, [load]);

  /* fill the editable pitch fields once per project */
  useEffect(() => {
    if (!project) return;
    setConcept(project.concept);
    setNeeds(project.needs);
    setLookWords(project.lookWords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const patchProject = useCallback(
    async (patch: Record<string, any>) => {
      try {
        const response = await fetch(`/api/videos/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
        setProject((current) => (current ? { ...current, ...data.video } : data.video));
        setSavedAt(new Date().toISOString());
      } catch (error: any) {
        toast(error.message ?? 'Speichern fehlgeschlagen', 'error');
      }
    },
    [videoId]
  );

  const queueSave = useCallback(
    (patch: Record<string, any>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => patchProject(patch), 700);
    },
    [patchProject]
  );

  /* ------------------------------------------------------------- audio */

  useEffect(() => {
    const url = project?.audioUrl;
    if (!url) {
      setPeaks([]);
      setAnalysis(null);
      setAudioDuration(0);
      setAnalysing(false);
      setAudioError(false);
      setPlaying(false);
      return;
    }
    let active = true;
    setPeaks([]);
    setAnalysis(null);
    setAudioDuration(0);
    setAnalysing(true);
    setAudioError(false);
    setPlaying(false);
    (async () => {
      let context: AudioContext | null = null;
      try {
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes);
        const result = analyseAudioBuffer(buffer);
        if (!active) return;
        setAnalysis(result);
        setPeaks(audioPeaks(buffer, 1400));
        setAudioDuration(buffer.duration);
      } catch {
        if (active) {
          setAudioError(true);
          const probe = document.createElement('audio');
          probe.preload = 'metadata';
          probe.onloadedmetadata = () => {
            if (active && Number.isFinite(probe.duration)) setAudioDuration(probe.duration);
          };
          probe.src = url;
        }
      } finally {
        if (context) await context.close().catch(() => undefined);
        if (active) setAnalysing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [project?.audioUrl]);

  const duration = useMemo(() => {
    const planned = shots.reduce((max, shot) => Math.max(max, shot.start + shot.duration), 0);
    if (audioDuration > 0) return Math.max(audioDuration, planned);
    return Math.max(60, Math.ceil(planned));
  }, [audioDuration, shots]);

  const coverageInfo = useMemo(() => shotCoverage(shots, duration), [shots, duration]);

  const currentSection =
    [...shots].filter((shot) => shot.start <= time).sort((a, b) => b.start - a.start)[0]?.section ?? 'verse';

  const orderedShots = useMemo(
    () => [...shots].sort((a, b) => a.start - b.start || a.position - b.position),
    [shots]
  );

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const shot of shots) counts[shot.section] = (counts[shot.section] ?? 0) + 1;
    return counts;
  }, [shots]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!project?.audioUrl || !audio) {
      toast('Verknüpfe zuerst den Song im Projekt.', 'error');
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.currentTime = time >= duration - 0.05 ? 0 : time;
    if (time >= duration - 0.05) setTime(0);
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      toast('Der Browser konnte den Song nicht abspielen', 'error');
    }
  };

  const seekTo = (value: number) => {
    const next = Math.max(0, Math.min(Math.max(0, duration - 0.05), value));
    setTime(next);
    if (audioRef.current) audioRef.current.currentTime = next;
  };

  /* -------------------------------------------------------------- shots */

  const updateShotTiming = useCallback(
    async (id: number, start: number, durationValue: number) => {
      setShots((current) =>
        [...current.map((shot) => (shot.id === id ? { ...shot, start, duration: durationValue } : shot))].sort(
          (a, b) => a.start - b.start || a.position - b.position
        )
      );
      try {
        const response = await fetch(`/api/video-shots/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start, duration: durationValue }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Konnte den Shot nicht verschieben');
        setShots((current) =>
          [...current.map((shot) => (shot.id === id ? data.shot : shot))].sort(
            (a, b) => a.start - b.start || a.position - b.position
          )
        );
      } catch (error: any) {
        toast(error.message ?? 'Konnte den Shot nicht verschieben', 'error');
      }
    },
    []
  );

  const saveShot = (saved: VideoShot) => {
    if (saved.media) {
      setMedia((current) =>
        current.some((item) => item.id === saved.media?.id) ? current : [saved.media as MediaItem, ...current]
      );
    }
    setShots((current) => {
      const exists = current.some((shot) => shot.id === saved.id);
      return [...(exists ? current.map((shot) => (shot.id === saved.id ? saved : shot)) : [...current, saved])].sort(
        (a, b) => a.start - b.start || a.position - b.position
      );
    });
    setSelectedId(saved.id);
    seekTo(saved.start);
    setShotModal(null);
  };

  const deleteShot = (id: number) => {
    setShots((current) => current.filter((shot) => shot.id !== id));
    if (selectedId === id) setSelectedId(null);
    setShotModal(null);
  };

  const addIdea = async (idea: (typeof SHOT_IDEAS)[number]) => {
    const mood = SHOT_MOODS.find((entry) => entry.value === idea.mood);
    setBusyAction(idea.id);
    try {
      const response = await fetch(`/api/videos/${videoId}/shots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: idea.description,
          section: currentSection,
          start: Number(time.toFixed(1)),
          duration: 3,
          location: project?.location ?? '',
          status: 'idea',
          shotType: mood?.shotType ?? '',
          movement: mood?.movement ?? '',
          lighting: mood?.lighting ?? '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Konnte den Shot nicht anlegen');
      saveShot(data.shot);
      toast(`„${idea.label}“ hinzugefügt – Text gern anpassen`);
    } catch (error: any) {
      toast(error.message ?? 'Konnte den Shot nicht anlegen', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const distribute = async () => {
    if (!shots.length) return;
    setBusyAction('distribute');
    try {
      const response = await fetch(`/api/videos/${videoId}/shots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'distribute', duration }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Konnte nicht verteilen');
      setShots(data.shots ?? []);
      toast('Shots gleichmäßig über den Song verteilt');
    } catch (error: any) {
      toast(error.message ?? 'Konnte nicht verteilen', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const addShotFromMedia = async (item: MediaItem) => {
    setUploadingShot(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/shots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: item.title,
          start: Number(time.toFixed(1)),
          duration: 3,
          section: currentSection,
          mediaId: item.id,
          location: project?.location ?? '',
          status: 'idea',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Konnte den Shot nicht anlegen');
      saveShot(data.shot);
      toast('Shot aus der Mediathek angelegt');
    } catch (error: any) {
      toast(error.message ?? 'Konnte den Shot nicht anlegen', 'error');
    } finally {
      setUploadingShot(false);
    }
  };

  const removeProject = async () => {
    if (!project) return;
    if (!window.confirm(`„${project.title}“ und alle ${shots.length} Shots löschen?`)) return;
    const response = await fetch(`/api/videos/${project.id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Video gelöscht');
      router.push('/admin/videos');
    } else {
      toast('Konnte das Video nicht löschen', 'error');
    }
  };

  const library = useMemo(
    () =>
      media
        .filter((item) => item.mime.startsWith('image/') || item.mime.startsWith('video/'))
        .filter((item) => item.mime !== 'image/svg+xml')
        .filter((item) => (libraryQuery.trim() ? item.title.toLowerCase().includes(libraryQuery.toLowerCase()) : true))
        .slice(0, 40),
    [media, libraryQuery]
  );

  if (loading) return <Spinner label="Projekt wird geladen" />;
  if (!project) return null;

  const notesDocument = documents.find((entry) => entry.id === project.treatmentDocId) ?? null;
  const addWord = (word: string) => {
    const value = word.trim().slice(0, 24);
    if (!value || lookWords.includes(value)) return;
    const next = [...lookWords, value].slice(0, 12);
    setLookWords(next);
    void patchProject({ lookWords: next });
    setWordDraft('');
  };
  const removeWord = (word: string) => {
    const next = lookWords.filter((entry) => entry !== word);
    setLookWords(next);
    void patchProject({ lookWords: next });
  };

  return (
    <div className="video-detail video-guided">
      <PageHead
        eyebrow="Musikvideo"
        title={project.title}
        sub={
          [project.songTitle, project.director ? `Regie ${project.director}` : '', project.location]
            .filter(Boolean)
            .join(' · ') || 'Song, Idee, Ablauf – in dieser Reihenfolge.'
        }
        actions={
          <>
            <Link className="btn btn-ghost" href="/admin/videos">
              <IconChevronLeft size={14} /> Alle Videos
            </Link>
            <Link className="btn btn-primary" href={`/admin/videos/${project.id}/pitch`}>
              <IconSparkles size={14} /> Pitch öffnen
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setProjectModal(true)}>
              <IconPencil size={14} /> Projekt
            </button>
            <button type="button" className="btn btn-danger" onClick={removeProject} title="Video löschen">
              <IconTrash size={14} />
            </button>
          </>
        }
      />

      <nav className="video-chapters">
        {CHAPTERS.map((chapter, index) => (
          <a key={chapter.id} href={`#${chapter.id}`} className="video-chapter">
            <span className="mono">{String(index + 1).padStart(2, '0')}</span>
            {chapter.label}
          </a>
        ))}
        <span className="video-chapter-meta mono small muted">
          {shots.length} Shots · {durationLabel(duration)} · {Math.round(coverageInfo.ratio * 100)} % Ablauf
        </span>
      </nav>

      {/* ---------------------------------------------------- 01 song */}
      <section className="panel video-section" id="song">
        <div className="video-section-head">
          <div>
            <span className="video-section-no mono">01</span>
            <h2>Song &amp; Ton</h2>
            <p>Der Song ist der Takt. Ohne ihn kann niemand einen Ablauf planen.</p>
          </div>
          <span className={`video-status ${project.status}`}>{videoStatusLabel(project.status)}</span>
        </div>
        <div className="video-section-body">
          {project.audioUrl ? (
            <div className="video-song-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={togglePlay}>
                {playing ? <IconPause size={14} /> : <IconPlay size={14} />}
                {playing ? 'Pause' : 'Anhören'}
              </button>
              <span className="mono video-time">
                {timecode(time)} <em>/ {timecode(duration)}</em>
              </span>
              <span className="mono small muted">
                {analysis ? `${analysis.bpm} BPM` : analysing ? 'Analysiere …' : audioError ? 'Kein Waveform' : ''}
              </span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShotModal({ shot: null })}>
                <IconPlus size={13} /> Shot bei {timecode(time)}
              </button>
              <audio
                ref={audioRef}
                src={project.audioUrl}
                onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                  setPlaying(false);
                  setTime(duration);
                }}
              />
            </div>
          ) : (
            <p className="video-hint">
              Noch kein Audio verknüpft. <button type="button" className="linkish" onClick={() => setProjectModal(true)}>Song hinzufügen</button>
            </p>
          )}

          <div className="video-sections">
            {SHOT_SECTIONS.filter((section) => section.value !== 'other').map((section) => (
              <span key={section.value} className={`video-section-chip ${sectionCounts[section.value] ? 'has-shots' : ''}`}>
                {section.label}
                {sectionCounts[section.value] ? <em>{sectionCounts[section.value]}</em> : null}
              </span>
            ))}
          </div>
          <p className="video-hint">
            {project.songTitle ? `Song: ${project.songTitle}` : 'Kein Song verknüpft'} · Shots bekommen automatisch den
            Abschnitt, in dem der Playhead gerade steht.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- 02 idea */}
      <section className="panel video-section" id="idee">
        <div className="video-section-head">
          <div>
            <span className="video-section-no mono">02</span>
            <h2>Die Idee</h2>
            <p>Drei Antworten reichen – daraus entsteht später die Pitch-Präsentation.</p>
          </div>
          {savedAt ? <span className="mono small muted">gespeichert</span> : null}
        </div>
        <div className="video-section-body">
          <Field
            label="Worum geht es?"
            hint={<span className="count">Was passiert, wie fühlt es sich an, wie endet es?</span>}
          >
            <textarea
              className="textarea video-concept"
              rows={5}
              value={concept}
              placeholder={
                'Ein Raum, eine Person, ein Song.\n\nEs fängt still an, wird lauter, und am Ende steht niemand mehr im Bild.'
              }
              onChange={(event) => {
                setConcept(event.target.value);
                queueSave({ concept: event.target.value });
              }}
            />
          </Field>

          <Field label="Wie sieht es aus?" hint={<span className="count">Stichworte – sie werden zur Bildsprache im Pitch.</span>}>
            <div className="video-words">
              {lookWords.map((word) => (
                <button key={word} type="button" className="video-word on" onClick={() => removeWord(word)}>
                  {word} <IconX size={11} />
                </button>
              ))}
              {LOOK_SUGGESTIONS.filter((word) => !lookWords.includes(word)).map((word) => (
                <button key={word} type="button" className="video-word" onClick={() => addWord(word)}>
                  {word}
                </button>
              ))}
              <input
                className="video-word-input"
                placeholder="eigenes Wort …"
                value={wordDraft}
                onChange={(event) => setWordDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addWord(wordDraft);
                  }
                }}
              />
            </div>
          </Field>

          {notesDocument ? (
            <details className="video-fold" open>
              <summary>
                <IconDocument size={13} /> {notesDocument.title}
                <Link className="btn btn-sm btn-ghost" href={`/admin/docs?doc=${notesDocument.id}`}>
                  Öffnen
                </Link>
              </summary>
              <div
                className="prose video-notes-body"
                dangerouslySetInnerHTML={{ __html: notesDocument.content || '<p>Keine Notizen hinterlegt.</p>' }}
              />
            </details>
          ) : (
            <p className="video-hint">
              Notizen als Dokument?{' '}
              <button type="button" className="linkish" onClick={() => setProjectModal(true)}>
                Dokument verknüpfen
              </button>
            </p>
          )}
        </div>
      </section>

      {/* --------------------------------------------------- 03 shots */}
      <section className="panel video-section" id="ablauf">
        <div className="video-section-head">
          <div>
            <span className="video-section-no mono">03</span>
            <h2>Ablauf</h2>
            <p>Ein Satz pro Bild. Klick dich durch die Ideen – niemand verlangt eine Shotliste.</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={distribute}
              disabled={!shots.length || busyAction === 'distribute'}
              title="Verteilt alle Shots gleichmäßig über den Song"
            >
              <IconGrid size={13} /> {busyAction === 'distribute' ? 'Verteilt …' : 'Gleichmäßig verteilen'}
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setShotModal({ shot: null })}>
              <IconPlus size={13} /> Shot
            </button>
          </div>
        </div>

        <div className="video-section-body">
          <div className="video-ideas">
            {SHOT_IDEAS.map((idea) => (
              <button
                key={idea.id}
                type="button"
                className="video-idea"
                onClick={() => addIdea(idea)}
                disabled={busyAction === idea.id}
                title={idea.description}
              >
                <span>{idea.label}</span>
                <em>{idea.description.split(':')[0]}</em>
              </button>
            ))}
          </div>

          {orderedShots.length === 0 ? (
            <div className="video-empty">
              <IconVideo size={24} />
              <h3>Noch kein Bild</h3>
              <p>Wähle oben eine Idee – sie landet genau an der Stelle, an der du gerade hörst.</p>
            </div>
          ) : (
            <div className="shot-list">
              {orderedShots.map((shot, index) => (
                <article
                  key={shot.id}
                  className={`shot-row ${selectedId === shot.id ? 'on' : ''}`}
                  onClick={() => {
                    setSelectedId(shot.id);
                    seekTo(shot.start);
                  }}
                >
                  <span className="shot-number mono">{String(index + 1).padStart(2, '0')}</span>
                  <button
                    type="button"
                    className="shot-thumb"
                    title="Bearbeiten"
                    aria-label="Shot bearbeiten"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(shot.id);
                      setShotModal({ shot });
                    }}
                  >
                    {shot.sketch ? (
                      <img src={shot.sketch} alt="" className="shot-thumb-img shot-thumb-sketch" />
                    ) : shot.media ? (
                      <MediaThumb media={shot.media} className="shot-thumb-img" />
                    ) : (
                      <IconImage size={18} />
                    )}
                  </button>
                  <div className="shot-main">
                    <div className="shot-top">
                      <span className="shot-time mono">
                        {timecode(shot.start)} <em>· {shot.duration.toFixed(1)} s</em>
                      </span>
                      <span className="chip">{sectionLabel(shot.section)}</span>
                      <span className={`shot-status status-${shot.status}`}>{shotStatusLabel(shot.status)}</span>
                    </div>
                    <p className="shot-description">{shot.description || 'Ohne Beschreibung'}</p>
                    <div className="shot-meta mono">
                      {shot.location ? (
                        <span>
                          <IconMapPin size={10} /> {shot.location}
                        </span>
                      ) : null}
                      {shot.shotType ? <span>{shot.shotType}</span> : null}
                      {shot.movement ? <span>{shot.movement}</span> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-icon shot-edit"
                    title="Bearbeiten"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(shot.id);
                      setShotModal({ shot });
                    }}
                  >
                    <IconPencil size={13} />
                  </button>
                </article>
              ))}
            </div>
          )}

          <details className="video-fold">
            <summary>
              <IconClock size={13} /> Timeline – Shots schieben und kürzen
              <span className="mono small muted">
                {Math.round(coverageInfo.ratio * 100)} % abgedeckt
                {coverageInfo.gaps.length ? ` · ${coverageInfo.gaps.length} Lücken` : ''}
              </span>
            </summary>
            <div className="video-timeline-tools">
              <div className="video-timeline-actions">
                <button
                  type="button"
                  className={`video-toggle ${snap ? 'on' : ''}`}
                  aria-pressed={snap}
                  onClick={() => setSnap((value) => !value)}
                  title="Rastet auf Takte und Shotkanten – ⇧ beim Ziehen hebt das Raster auf"
                >
                  <IconGrid size={12} /> Raster
                </button>
                <div className="video-zoom" role="group" aria-label="Zoom">
                  {[1, 2, 4].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={zoom === level ? 'on' : ''}
                      aria-pressed={zoom === level}
                      onClick={() => setZoom(level)}
                    >
                      {level}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <VideoTimeline
              peaks={peaks}
              duration={duration}
              beats={analysis?.beats ?? []}
              time={time}
              shots={shots}
              selectedId={selectedId}
              zoom={zoom}
              snap={snap}
              onSeek={seekTo}
              onSelect={(shot) => setSelectedId(shot.id)}
              onTimingChange={updateShotTiming}
              onOpenShot={(shot) => {
                setSelectedId(shot.id);
                setShotModal({ shot });
              }}
              onAddShot={(seconds) => {
                seekTo(seconds);
                setShotModal({ shot: null });
              }}
            />
            <p className="video-hint">
              Ziehen: verschieben · an den Rändern: kürzen · Doppelklick in die Spur: neuer Shot · ⇧ hält das
              Raster an.
            </p>
          </details>

          <details className="video-fold">
            <summary>
              <IconImage size={13} /> Material aus der Mediathek
              <span className="mono small muted">{library.length} Bilder & Videos</span>
            </summary>
            <div className="video-library-search">
              <IconSearch size={14} />
              <input
                className="input"
                value={libraryQuery}
                placeholder="Suchen …"
                onChange={(event) => setLibraryQuery(event.target.value)}
              />
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => shotInput.current?.click()}>
                <IconUpload size={13} /> Hochladen
              </button>
              <input
                ref={shotInput}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('files', file);
                  if (project.songId) form.append('songId', String(project.songId));
                  const response = await fetch('/api/media', { method: 'POST', body: form });
                  const data = await response.json();
                  if (response.ok && data.media?.[0]) {
                    setMedia((current) => [...data.media, ...current]);
                    toast('Datei liegt in der Mediathek');
                  } else {
                    toast(data.error ?? 'Upload fehlgeschlagen', 'error');
                  }
                  if (shotInput.current) shotInput.current.value = '';
                }}
              />
            </div>
            <div className="video-library-list">
              {library.map((item) => (
                <div key={item.id} className="video-library-item">
                  <MediaThumb media={item} className="video-library-thumb" />
                  <div className="grow">
                    <div className="truncate">{item.title}</div>
                    <span className="mono small muted">{item.mime}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={uploadingShot}
                    onClick={() => addShotFromMedia(item)}
                  >
                    <IconPlus size={12} /> Shot
                  </button>
                </div>
              ))}
              {library.length === 0 ? <p className="small muted">Nichts gefunden.</p> : null}
            </div>
          </details>
        </div>
      </section>

      {/* ---------------------------------------------------- 04 shoot */}
      <section className="panel video-section" id="dreh">
        <div className="video-section-head">
          <div>
            <span className="video-section-no mono">04</span>
            <h2>Drehtag</h2>
            <p>Ein Tag, ein Ort, ein kleines Team. Mehr braucht es für den Anfang nicht.</p>
          </div>
        </div>
        <div className="video-section-body">
          <div className="form-row">
            <Field label="Datum">
              <input
                className="input"
                type="date"
                value={project.shootDate}
                onChange={(event) => setProject({ ...project, shootDate: event.target.value })}
                onBlur={(event) => patchProject({ shootDate: event.target.value })}
              />
            </Field>
            <Field label="Ort">
              <input
                className="input"
                value={project.location}
                placeholder="z. B. alte Turnhalle, Augsburg"
                onChange={(event) => setProject({ ...project, location: event.target.value })}
                onBlur={(event) => patchProject({ location: event.target.value })}
              />
            </Field>
            <Field label="Regie">
              <input
                className="input"
                value={project.director}
                placeholder="Du selbst reicht"
                onChange={(event) => setProject({ ...project, director: event.target.value })}
                onBlur={(event) => patchProject({ director: event.target.value })}
              />
            </Field>
          </div>
          <Field
            label="Was brauchen wir?"
            hint={<span className="count">Leute, Technik, Genehmigung – erscheint im Pitch unter „Dreh“.</span>}
          >
            <textarea
              className="textarea"
              rows={3}
              value={needs}
              placeholder={'Zwei Lampen, ein Stativ, drei Leute, die mitspielen.\nDreh von 16 bis 20 Uhr.'}
              onChange={(event) => {
                setNeeds(event.target.value);
                queueSave({ needs: event.target.value });
              }}
            />
          </Field>
          {orderedShots.filter((shot) => shot.location).length ? (
            <p className="video-hint">
              <IconMapPin size={12} /> Drehorte in den Shots: {[...new Set(orderedShots.map((shot) => shot.location).filter(Boolean))].join(', ')}
            </p>
          ) : null}
        </div>
      </section>

      {/* ---------------------------------------------------- 05 pitch */}
      <section className="panel video-section video-pitch-teaser" id="pitch">
        <div className="video-section-head">
          <div>
            <span className="video-section-no mono">05</span>
            <h2>Pitch</h2>
            <p>
              Aus Song, Idee, Bildsprache, Storyboard und Drehtag wird automatisch eine kleine Präsentation –
              zum Zeigen, Verschicken, Begeistern.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn btn-sm btn-primary" href={`/admin/videos/${project.id}/pitch`}>
              <IconSparkles size={13} /> Präsentation öffnen
            </Link>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>
              <IconFilm size={13} /> Storyboard drucken
            </button>
          </div>
        </div>
        <div className="video-section-body">
          <div className="video-pitch-facts">
            <span>
              <IconMusic size={12} /> {project.songTitle ?? 'kein Song'}
            </span>
            <span>
              <IconVideo size={12} /> {orderedShots.length} Shots
            </span>
            <span>
              <IconClock size={12} /> {durationLabel(duration)}
            </span>
            <span>
              <IconMapPin size={12} /> {project.location || 'Ort offen'}
            </span>
            <span>{lookWords.length ? lookWords.join(' · ') : 'noch keine Bildworte'}</span>
          </div>
          <p className="video-hint">
            Die Präsentation entsteht bei jedem Öffnen neu aus deinen Daten. „Als HTML“ exportiert eine einzelne
            Datei mit allen Bildern – die kannst du per Mail verschicken, sie läuft in jedem Browser.
          </p>
        </div>
      </section>

      <VideoProjectModal
        open={projectModal}
        project={project}
        songs={songs}
        media={media}
        documents={documents}
        onClose={() => setProjectModal(false)}
        onSaved={(video) => {
          setProject(video);
          setProjectModal(false);
          fetch('/api/media')
            .then((response) => response.json())
            .then((data) => setMedia(data.media ?? []))
            .catch(() => undefined);
        }}
      />

      <VideoShotModal
        open={!!shotModal}
        shot={shotModal?.shot ?? null}
        project={project}
        shots={shots}
        media={media}
        playhead={time}
        onClose={() => setShotModal(null)}
        onSaved={saveShot}
        onDeleted={deleteShot}
      />
    </div>
  );
}
