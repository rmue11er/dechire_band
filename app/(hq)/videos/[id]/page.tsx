'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconChevronLeft,
  IconClock,
  IconDocument,
  IconFilm,
  IconImage,
  IconMapPin,
  IconMusic,
  IconPause,
  IconPencil,
  IconPlay,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconVideo,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import { PageHead, Spinner } from '@/components/ui';
import VideoProjectModal from '@/components/videos/VideoProjectModal';
import VideoShotModal from '@/components/videos/VideoShotModal';
import VideoTimeline from '@/components/videos/VideoTimeline';
import { analyseAudioBuffer, audioPeaks, type BeatAnalysis } from '@/lib/beats';
import { formatDate } from '@/lib/format';
import { toast } from '@/lib/toast';
import {
  durationLabel,
  sectionLabel,
  shotStatusLabel,
  timecode,
  videoStatusLabel,
} from '@/lib/videos';
import type { BandDocument, MediaItem, Song, VideoProject, VideoShot } from '@/lib/types';

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
  const [librarySongOnly, setLibrarySongOnly] = useState(true);
  const [uploadingShot, setUploadingShot] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const shotInput = useRef<HTMLInputElement>(null);

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
      toast('Could not load the video project', 'error');
      router.push('/videos');
    } finally {
      setLoading(false);
    }
  }, [videoId, router]);

  useEffect(() => {
    load();
  }, [load]);

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

  useEffect(() => {
    if (time > duration) {
      setTime(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const currentSection =
    [...shots].filter((shot) => shot.start <= time).sort((a, b) => b.start - a.start)[0]?.section ?? 'verse';

  const library = useMemo(() => {
    return media
      .filter((item) => {
        if (!(item.mime.startsWith('image/') || item.mime.startsWith('video/'))) return false;
        if (item.mime === 'image/svg+xml') return false;
        if (librarySongOnly && project?.songId && item.songId !== project.songId) return false;
        if (!libraryQuery.trim()) return true;
        const haystack = [item.title, item.variantLabel, item.groupName, item.tags.join(' ')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(libraryQuery.toLowerCase());
      })
      .slice(0, 60);
  }, [media, project?.songId, librarySongOnly, libraryQuery]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!project?.audioUrl || !audio) {
      toast('Link the song audio in the project settings first', 'error');
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (time >= duration - 0.05) {
      audio.currentTime = 0;
      setTime(0);
    } else {
      audio.currentTime = time;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      toast('The browser could not play the song', 'error');
    }
  };

  const seekTo = (value: number) => {
    const next = Math.max(0, Math.min(Math.max(0, duration - 0.05), value));
    setTime(next);
    if (audioRef.current) audioRef.current.currentTime = next;
  };

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
      if (!response.ok) throw new Error(data.error ?? 'Could not add the shot');
      saveShot(data.shot);
      setShotModal({ shot: data.shot });
      toast('Shot added from the library');
    } catch (error: any) {
      toast(error.message ?? 'Could not add the shot', 'error');
    } finally {
      setUploadingShot(false);
    }
  };

  const removeProject = async () => {
    if (!project) return;
    if (!window.confirm(`Delete “${project.title}” and all ${shots.length} shots?`)) return;
    const response = await fetch(`/api/videos/${project.id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Video project deleted');
      router.push('/videos');
    } else {
      toast('Could not delete the project', 'error');
    }
  };

  if (loading) return <Spinner label="Building the timeline" />;
  if (!project) return null;

  const notesDocument = documents.find((entry) => entry.id === project.treatmentDocId) ?? null;

  return (
    <div className="video-detail">
      <PageHead
        eyebrow="Music video"
        title={project.title}
        sub={
          [
            project.songTitle,
            project.director ? `director ${project.director}` : '',
            project.shootDate ? formatDate(project.shootDate) : '',
            project.location,
          ]
            .filter(Boolean)
            .join(' · ') || 'Song, seconds, shots.'
        }
        actions={
          <>
            <Link className="btn btn-ghost" href="/videos">
              <IconChevronLeft size={14} /> All videos
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              <IconFilm size={14} /> Storyboard drucken
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setProjectModal(true)}>
              <IconPencil size={14} /> Projekt
            </button>
            <button type="button" className="btn btn-danger" onClick={removeProject} title="Delete project">
              <IconTrash size={14} />
            </button>
          </>
        }
      />

      <div className="video-print-head">
        <h1>{project.title}</h1>
        <p>
          {[project.songTitle, project.shootDate ? formatDate(project.shootDate) : '', project.location]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="video-detail-meta">
        <span className={`video-status ${project.status}`}>{videoStatusLabel(project.status)}</span>
        <span>
          <IconFilm size={12} /> {shots.length} shots
        </span>
        <span>
          <IconClock size={12} /> {durationLabel(duration)}
        </span>
        {project.audioTitle ? (
          <span>
            <IconMusic size={12} /> {project.audioTitle}
          </span>
        ) : (
          <span className="muted">No audio linked</span>
        )}
      </div>

      {project.notes ? <p className="video-project-notes">{project.notes}</p> : null}

      <div className="video-plan-grid">
        <aside className="video-library panel">
          <div className="video-library-head">
            <div>
              <span className="label">Shot library</span>
              <p className="small muted">Material you can cut to.</p>
            </div>
            <button
              type="button"
              className="btn btn-icon"
              title="Upload shot"
              onClick={() => shotInput.current?.click()}
            >
              <IconUpload size={14} />
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
                  toast('Shot uploaded to the library');
                } else {
                  toast(data.error ?? 'Upload failed', 'error');
                }
                if (shotInput.current) shotInput.current.value = '';
              }}
            />
          </div>

          <div className="video-library-search">
            <IconSearch size={14} />
            <input
              className="input"
              value={libraryQuery}
              placeholder="Search shots …"
              onChange={(event) => setLibraryQuery(event.target.value)}
            />
          </div>

          <label className="video-library-toggle">
            <input
              type="checkbox"
              checked={librarySongOnly && !!project.songId}
              disabled={!project.songId}
              onChange={(event) => setLibrarySongOnly(event.target.checked)}
            />
            Only this song’s media
          </label>

          <div className="video-library-list">
            {library.length === 0 ? (
              <p className="small muted">No media found. Upload a reference or link media to the song.</p>
            ) : (
              library.map((item) => (
                <div key={item.id} className="video-library-item">
                  <MediaThumb media={item} className="video-library-thumb" />
                  <div className="grow">
                    <div className="truncate">{item.title}</div>
                    <span className="mono small muted">{item.songTitle ?? item.groupName ?? item.mime}</span>
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
              ))
            )}
          </div>
        </aside>

        <div className="video-plan-main">
          <section className="panel video-player">
            <div className="video-controls">
              <button type="button" className="btn btn-primary btn-sm" onClick={togglePlay}>
                {playing ? <IconPause size={14} /> : <IconPlay size={14} />}
                {playing ? 'Pause' : 'Play'}
              </button>
              <span className="mono video-time">
                {timecode(time)} <em>/ {timecode(duration)}</em>
              </span>
              <span className="mono small muted">
                {analysis
                  ? `${analysis.bpm} BPM`
                  : analysing
                    ? 'Analysing audio …'
                    : audioError
                      ? 'Audio not analysable'
                      : 'No waveform'}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost video-add-shot"
                onClick={() => setShotModal({ shot: null })}
              >
                <IconPlus size={13} /> Shot at {timecode(time)}
              </button>
            </div>

            <VideoTimeline
              peaks={peaks}
              duration={duration}
              beats={analysis?.beats ?? []}
              time={time}
              shots={shots}
              selectedId={selectedId}
              onSeek={seekTo}
              onSelect={(shot) => setSelectedId(shot.id)}
            />

            {project.audioUrl ? (
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
            ) : null}

            <div className="video-wave-note small muted">
              Klick in die Timeline, um zu springen · Klick auf einen Shot, um ihn auszuwählen.
            </div>
          </section>

          <section className="video-storyboard">
            <div className="video-storyboard-head">
              <div>
                <span className="label">Storyboard</span>
                <p className="small muted">{shots.length} shots · {durationLabel(duration)}</p>
              </div>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setShotModal({ shot: null })}>
                <IconPlus size={13} /> Shot
              </button>
            </div>

            {shots.length === 0 ? (
              <div className="video-empty">
                <IconVideo size={24} />
                <h3>No shots yet</h3>
                <p>Start with a shot at the playhead, then sketch the frame while the idea is fresh.</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setShotModal({ shot: null })}>
                  <IconPlus size={13} /> First shot
                </button>
              </div>
            ) : (
              <div className="shot-list">
                {shots.map((shot, index) => (
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
                      title={shot.sketch ? 'Skizze bearbeiten' : 'Frame skizzieren'}
                      aria-label={shot.sketch ? 'Edit sketch' : 'Sketch frame'}
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
                      <p className="shot-description">{shot.description || 'Untitled shot'}</p>
                      <div className="shot-meta mono">
                        {shot.location ? <span><IconMapPin size={10} /> {shot.location}</span> : null}
                        {shot.shotType ? <span>{shot.shotType}</span> : null}
                        {shot.movement ? <span>{shot.movement}</span> : null}
                        {shot.lighting ? <span>{shot.lighting}</span> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-icon shot-edit"
                      title="Edit shot"
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
          </section>

          {notesDocument ? (
            <section className="panel video-notes">
              <div className="video-notes-head">
                <div>
                  <span className="label">Notizen</span>
                  <p className="small muted">{notesDocument.title}</p>
                </div>
                <Link className="btn btn-sm btn-ghost" href={`/docs?doc=${notesDocument.id}`}>
                  <IconDocument size={13} /> Dokument öffnen
                </Link>
              </div>
              <div
                className="prose video-notes-body"
                dangerouslySetInnerHTML={{ __html: notesDocument.content || '<p>Keine Notizen hinterlegt.</p>' }}
              />
            </section>
          ) : null}
        </div>
      </div>

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
