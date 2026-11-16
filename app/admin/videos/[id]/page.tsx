'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
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
  IconSparkles,
  IconTrash,
  IconVideo,
  IconX,
} from '@/components/icons';
import MediaPicker from '@/components/MediaPicker';
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

const LOOK_SUGGESTIONS = ['kalt', 'nass', 'leer', 'still', 'nah', 'Gegenlicht', 'Handkamera', 'Staub', 'Nacht', 'Grau'];

const STEPS = [
  { key: 'song', label: 'Song', question: 'Welcher Song?' },
  { key: 'idee', label: 'Idee', question: 'Worum geht es?' },
  { key: 'ablauf', label: 'Ablauf', question: 'Was sieht man?' },
  { key: 'dreh', label: 'Drehtag', question: 'Wann und wo?' },
  { key: 'pitch', label: 'Pitch', question: 'Zeigen.' },
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

  const [step, setStep] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<BeatAnalysis | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [analysing, setAnalysing] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const [shotModal, setShotModal] = useState<{ shot: VideoShot | null; section?: string } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [audioPicker, setAudioPicker] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [concept, setConcept] = useState('');
  const [needs, setNeeds] = useState('');
  const [lookWords, setLookWords] = useState<string[]>([]);
  const [wordDraft, setWordDraft] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
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

  /* the step lives in the URL so a reload keeps the place */
  useEffect(() => {
    const wanted = Number(new URLSearchParams(window.location.search).get('step') ?? '0');
    if (Number.isInteger(wanted) && wanted >= 0 && wanted < STEPS.length) setStep(wanted);
  }, []);

  const goTo = (next: number) => {
    const value = Math.max(0, Math.min(STEPS.length - 1, next));
    setStep(value);
    const url = new URL(window.location.href);
    url.searchParams.set('step', String(value));
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const orderedShots = useMemo(
    () => [...shots].sort((a, b) => a.start - b.start || a.position - b.position),
    [shots]
  );

  const currentSection =
    [...shots].filter((shot) => shot.start <= time).sort((a, b) => b.start - a.start)[0]?.section ?? 'verse';

  /** Only the song parts that actually have shots – no empty form to fill in. */
  const shotGroups = useMemo(
    () =>
      SHOT_SECTIONS.map((section) => ({
        section,
        shots: orderedShots.filter((shot) => shot.section === section.value),
      })).filter((group) => group.shots.length),
    [orderedShots]
  );

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!project?.audioUrl || !audio) return;
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

  const updateShotTiming = useCallback(async (id: number, start: number, durationValue: number) => {
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
  }, []);

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
    seekTo(saved.start);
    setShotModal(null);
  };

  const deleteShot = (id: number) => {
    setShots((current) => current.filter((shot) => shot.id !== id));
    setShotModal(null);
  };

  const addIdea = async (idea: (typeof SHOT_IDEAS)[number]) => {
    const mood = SHOT_MOODS.find((entry) => entry.value === idea.mood);
    setBusy(idea.id);
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
      setShowIdeas(true);
      toast(`„${idea.label}“ ist drin – Text kannst du noch ändern`);
    } catch (error: any) {
      toast(error.message ?? 'Konnte den Shot nicht anlegen', 'error');
    } finally {
      setBusy(null);
    }
  };

  const distribute = async () => {
    if (!shots.length) return;
    setBusy('distribute');
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
      setBusy(null);
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

  if (loading) return <Spinner label="Projekt wird geladen" />;
  if (!project) return null;

  const notesDocument = documents.find((entry) => entry.id === project.treatmentDocId) ?? null;
  const done = [
    Boolean(project.audioMediaId),
    Boolean(concept.trim()),
    shots.length > 0,
    Boolean(project.shootDate || project.location),
    false,
  ];
  const audioTitle = media.find((item) => item.id === project.audioMediaId)?.title ?? project.audioTitle;

  return (
    <div className="vwizard">
      <PageHead
        eyebrow="Musikvideo"
        title={project.title}
        sub={[project.songTitle, project.status ? videoStatusLabel(project.status) : ''].filter(Boolean).join(' · ')}
        actions={
          <>
            <Link className="btn btn-ghost" href="/admin/videos">
              <IconChevronLeft size={14} /> Alle Videos
            </Link>
            <Link className="btn btn-ghost" href={`/admin/videos/${project.id}/pitch`}>
              <IconSparkles size={14} /> Pitch
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setProjectModal(true)}>
              <IconPencil size={14} /> Projekt
            </button>
          </>
        }
      />

      {/* ---------------------------------------------------------- rail */}
      <nav className="vwizard-rail" aria-label="Schritte">
        {STEPS.map((entry, index) => (
          <button
            key={entry.key}
            type="button"
            className={`vwizard-step ${index === step ? 'is-active' : ''} ${done[index] ? 'is-done' : ''}`}
            aria-current={index === step ? 'step' : undefined}
            onClick={() => goTo(index)}
          >
            <span className="vwizard-step-no mono">{done[index] ? <IconCheck size={11} /> : String(index + 1).padStart(2, '0')}</span>
            <span className="vwizard-step-label">{entry.label}</span>
          </button>
        ))}
      </nav>

      <section className="panel vwizard-card">
        <div className="vwizard-head">
          <span className="mono small muted">
            Schritt {step + 1} von {STEPS.length}
          </span>
          <h2>{STEPS[step].question}</h2>
        </div>

        {/* ----------------------------------------------------- 01 song */}
        {step === 0 ? (
          <div className="vwizard-body">
            <div className="vwizard-choice">
              <Field label="Song" hint={<span className="count">Der Song bestimmt Länge und Takt.</span>}>
                <select
                  className="input"
                  value={project.songId ?? ''}
                  onChange={(event) => patchProject({ songId: event.target.value ? Number(event.target.value) : null })}
                >
                  <option value="">– noch keiner –</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                      {song.songKey ? ` · ${song.songKey}` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Audiodatei" hint={<span className="count">Damit du hören kannst, wo welches Bild sitzt.</span>}>
                <div className="vwizard-audio">
                  <span className="truncate">{audioTitle || 'keine Datei'}</span>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAudioPicker(true)}>
                    <IconMusic size={13} /> {audioTitle ? 'Ändern' : 'Wählen'}
                  </button>
                </div>
              </Field>
            </div>

            {project.audioUrl ? (
              <div className="vwizard-player">
                <button type="button" className="btn btn-primary" onClick={togglePlay}>
                  {playing ? <IconPause size={15} /> : <IconPlay size={15} />}
                  {playing ? 'Pause' : 'Anhören'}
                </button>
                <span className="mono">
                  {timecode(time)} <em className="muted">/ {timecode(duration)}</em>
                </span>
                <span className="mono small muted">
                  {analysis ? `${analysis.bpm} BPM` : analysing ? 'Analysiere …' : audioError ? 'kein Waveform' : ''}
                </span>
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
              <p className="vwizard-hint">
                Ohne Audio kannst du trotzdem planen – die Länge wird dann auf 60 Sekunden geschätzt.
              </p>
            )}

            <p className="vwizard-hint">
              Der Song hat Teile: Intro, Strophe, Refrain, Bridge, Outro. Im nächsten Schritt beschreibst du, was
              man sieht – pro Teil ein paar Bilder reichen.
            </p>
          </div>
        ) : null}

        {/* ----------------------------------------------------- 02 idea */}
        {step === 1 ? (
          <div className="vwizard-body">
            <Field
              label="Worum geht es?"
              hint={<span className="count">Drei Sätze genügen: Anfang, Mitte, Ende.</span>}
            >
              <textarea
                className="textarea vwizard-concept"
                rows={7}
                value={concept}
                autoFocus
                placeholder={
                  'Ein Raum, eine Person, ein Song.\n\nEs fängt still an – Staub im Licht, eine Lampe, niemand da. Mit dem ersten Schlag kommt die Band ins Bild, aber nie ganz.\n\nAm Ende steht der Raum wieder leer.'
                }
                onChange={(event) => {
                  setConcept(event.target.value);
                  queueSave({ concept: event.target.value });
                }}
              />
            </Field>

            <Field label="Wie fühlt es sich an?" hint={<span className="count">Drei bis fünf Worte reichen.</span>}>
              <div className="vwizard-words">
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
              <div className="vwizard-doc">
                <IconDocument size={14} />
                <span>{notesDocument.title}</span>
                <Link className="btn btn-sm btn-ghost" href={`/admin/docs?doc=${notesDocument.id}`}>
                  Öffnen
                </Link>
              </div>
            ) : (
              <p className="vwizard-hint">
                Du hast längere Notizen? Verknüpfe sie über <button type="button" className="linkish" onClick={() => setProjectModal(true)}>Projekt</button>.
              </p>
            )}
            {savedAt ? <span className="mono small muted">gespeichert</span> : null}
          </div>
        ) : null}

        {/* --------------------------------------------------- 03 shots */}
        {step === 2 ? (
          <div className="vwizard-body">
            <div className="vwizard-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShotModal({ shot: null, section: currentSection })}>
                <IconPlus size={14} /> Bild hinzufügen
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowIdeas((value) => !value)}>
                <IconSparkles size={13} /> Ideen vorschlagen
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={distribute}
                disabled={!shots.length || busy === 'distribute'}
                title="Verteilt die Bilder gleichmäßig über den Song"
              >
                <IconGrid size={13} /> {busy === 'distribute' ? 'Verteilt …' : 'Über den Song verteilen'}
              </button>
            </div>

            {showIdeas || orderedShots.length < 3 ? (
              <div className="vwizard-ideas">
                {SHOT_IDEAS.map((idea) => (
                  <button
                    key={idea.id}
                    type="button"
                    className="vwizard-idea"
                    onClick={() => addIdea(idea)}
                    disabled={busy === idea.id}
                    title={idea.description}
                  >
                    <strong>{idea.label}</strong>
                    <span>{idea.description}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {orderedShots.length === 0 ? (
              <div className="video-empty">
                <IconVideo size={24} />
                <h3>Noch kein Bild</h3>
                <p>Klick oben auf eine Idee – sie landet genau an der Stelle, an der du gerade hörst.</p>
              </div>
            ) : (
              <div className="vwizard-storyboard">
                {shotGroups.map((group) => (
                  <div key={group.section.value} className="vwizard-group">
                    <div className="vwizard-group-head">
                      <span className="mono">{sectionLabel(group.section.value)}</span>
                      <span className="mono small muted">{group.shots.length}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setShotModal({ shot: null, section: group.section.value })}
                      >
                        <IconPlus size={12} /> Bild
                      </button>
                    </div>
                    {group.shots.map((shot) => (
                      <button
                        key={shot.id}
                        type="button"
                        className={`vwizard-shot ${selectedId === shot.id ? 'is-selected' : ''}`}
                        onClick={() => setShotModal({ shot })}
                      >
                        <span className="vwizard-shot-thumb">
                          {shot.sketch ? (
                            <img src={shot.sketch} alt="" />
                          ) : shot.media ? (
                            <MediaThumb media={shot.media} className="vwizard-shot-img" />
                          ) : (
                            <IconImage size={16} />
                          )}
                        </span>
                        <span className="vwizard-shot-text">{shot.description || 'Ohne Beschreibung'}</span>
                        <span className="vwizard-shot-time mono">{timecode(shot.start)}</span>
                        <span className={`shot-status status-${shot.status}`}>{shotStatusLabel(shot.status)}</span>
                        <IconPencil size={13} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="vwizard-footlinks">
              <button type="button" className="linkish" onClick={() => setShowTimeline((value) => !value)}>
                {showTimeline ? 'Timeline ausblenden' : 'Timeline (Profi): Bilder schieben und kürzen'}
              </button>
              <span className="mono small muted">
                {shots.length} Bilder · {durationLabel(duration)} · {Math.round(coverageInfo.ratio * 100)} % abgedeckt
              </span>
            </div>

            {showTimeline ? (
              <div className="vwizard-timeline">
                <VideoTimeline
                  peaks={peaks}
                  duration={duration}
                  beats={analysis?.beats ?? []}
                  time={time}
                  shots={shots}
                  selectedId={selectedId}
                  zoom={2}
                  snap
                  onSeek={seekTo}
                  /* dragging or clicking only selects – Enter/double-click opens the editor */
                  onSelect={(shot) => setSelectedId(shot.id)}
                  onTimingChange={updateShotTiming}
                  onOpenShot={(shot) => {
                    setSelectedId(shot.id);
                    setShotModal({ shot });
                  }}
                  onAddShot={(seconds) => {
                    seekTo(seconds);
                    setShotModal({ shot: null, section: currentSection });
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ---------------------------------------------------- 04 shoot */}
        {step === 3 ? (
          <div className="vwizard-body">
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
            </div>
            <Field
              label="Was brauchen wir?"
              hint={<span className="count">Leute, Technik, Genehmigung – steht später so im Pitch.</span>}
            >
              <textarea
                className="textarea"
                rows={4}
                value={needs}
                placeholder={'Zwei Lampen, ein Stativ, drei Leute, die mitspielen.\nDreh von 16 bis 20 Uhr.'}
                onChange={(event) => {
                  setNeeds(event.target.value);
                  queueSave({ needs: event.target.value });
                }}
              />
            </Field>
            <p className="vwizard-hint">
              Regie und Status änderst du bei Bedarf über <button type="button" className="linkish" onClick={() => setProjectModal(true)}>Projekt</button>.
            </p>
          </div>
        ) : null}

        {/* ---------------------------------------------------- 05 pitch */}
        {step === 4 ? (
          <div className="vwizard-body">
            <div className="vwizard-summary">
              <div className="vwizard-summary-item">
                <span className="mono small muted">Song</span>
                <strong>{project.songTitle ?? 'noch keiner'}</strong>
              </div>
              <div className="vwizard-summary-item">
                <span className="mono small muted">Idee</span>
                <strong>{concept.trim() ? 'steht' : 'fehlt'}</strong>
              </div>
              <div className="vwizard-summary-item">
                <span className="mono small muted">Bilder</span>
                <strong>{shots.length}</strong>
              </div>
              <div className="vwizard-summary-item">
                <span className="mono small muted">Dreh</span>
                <strong>{project.shootDate ? formatDate(project.shootDate) : project.location || 'offen'}</strong>
              </div>
            </div>

            <p className="vwizard-hint">
              Die Präsentation wird bei jedem Öffnen aus deinen Angaben gebaut: Cover, Idee, Bildsprache,
              Storyboard, Drehtag, Kontakt. „Als HTML“ exportiert eine einzelne Datei mit allen Bildern – die
              kannst du direkt verschicken.
            </p>

            <div className="vwizard-actions">
              <Link className="btn btn-primary" href={`/admin/videos/${project.id}/pitch`}>
                <IconSparkles size={14} /> Pitch öffnen
              </Link>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                <IconFilm size={14} /> Storyboard drucken
              </button>
              <button type="button" className="btn btn-danger btn-ghost" onClick={removeProject}>
                <IconTrash size={14} /> Video löschen
              </button>
            </div>

            {shots.length ? (
              <div className="vwizard-mini-board">
                {orderedShots.slice(0, 8).map((shot, index) => (
                  <div key={shot.id} className="vwizard-mini-frame">
                    {shot.sketch ? <img src={shot.sketch} alt="" /> : shot.media ? <MediaThumb media={shot.media} /> : null}
                    <span className="mono">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ------------------------------------------------------ footer */}
        <div className="vwizard-footer">
          <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)} disabled={step === 0}>
            <IconChevronLeft size={14} /> Zurück
          </button>
          <span className="mono small muted">
            {STEPS[step].key === 'song' && !project.audioMediaId
              ? 'Tipp: erst den Song wählen – dann hört man beim Planen, wo man ist.'
              : STEPS[step].key === 'ablauf' && !shots.length
                ? 'Tipp: eine der Ideen antippen reicht für den Anfang.'
                : STEPS[step].key === 'pitch'
                  ? 'Fertig – jetzt zeigen.'
                  : ''}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => goTo(step + 1)}
            disabled={step === STEPS.length - 1}
            style={step === STEPS.length - 1 ? { visibility: 'hidden' } : undefined}
          >
            {step === STEPS.length - 2 ? 'Zum Pitch' : 'Weiter'} <IconChevronRight size={14} />
          </button>
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
        defaultSection={shotModal?.section}
        onClose={() => setShotModal(null)}
        onSaved={saveShot}
        onDeleted={deleteShot}
      />

      <MediaPicker
        open={audioPicker}
        onClose={() => setAudioPicker(false)}
        media={media}
        selectedIds={project.audioMediaId ? [project.audioMediaId] : []}
        audioOnly
        onConfirm={(ids) => {
          void patchProject({ audioMediaId: ids[0] ?? null });
          setAudioPicker(false);
        }}
      />
    </div>
  );
}
