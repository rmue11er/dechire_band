'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import MediaPicker from '@/components/MediaPicker';
import { MediaThumb } from '@/components/MediaThumb';
import { ReelOverlay } from '@/components/reels/ReelOverlay';
import { ReelStage, type StageClip } from '@/components/reels/ReelStage';
import { ReelWaveform } from '@/components/reels/ReelWaveform';
import { EmptyState, Field, Modal, PageHead, Spinner } from '@/components/ui';
import {
  IconArrowDown,
  IconArrowUp,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconExpand,
  IconFilm,
  IconMusic,
  IconPause,
  IconPlay,
  IconPlus,
  IconRotate,
  IconSparkles,
  IconTrash,
  IconX,
  IconZap,
} from '@/components/icons';
import { analyseAudioBuffer, audioPeaks, type BeatAnalysis } from '@/lib/beats';
import {
  FRAME_LABEL,
  GRADE_HINT,
  GRADE_LABEL,
  lyricIndexAt,
  lyricWindow,
  lyricsFromText,
  normaliseLyrics,
  planClipLengths,
  REEL_DURATIONS,
  REEL_PRESETS,
  type ReelFrame,
  type ReelGrade,
  type ReelLook,
  type ReelMotion,
  type ReelPlan,
  type ReelPreset,
  type ReelText,
  type ReelTextStyle,
} from '@/lib/reels';
import { formatBytes } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { BandDocument, MediaItem } from '@/lib/types';

interface ClipState {
  key: string;
  media: MediaItem;
  /** trim offset inside a video */
  start: number;
  motion: ReelMotion;
  /** source length – Infinity for photos */
  natural: number;
}

interface Profile {
  bandName?: string;
  handle?: string;
  website?: string;
}

interface ReelJobView {
  id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  duration: number;
  mediaId?: number;
  coverId?: number | null;
  filename?: string;
  bytes?: number;
  error?: string;
}

type Step = 'clips' | 'sound' | 'lyrics' | 'look';

const clock = (value: number) => {
  const seconds = Math.max(0, value);
  const whole = Math.floor(seconds);
  const tenths = Math.floor((seconds - whole) * 10);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}.${tenths}`;
};

const sourceDuration = (url: string) =>
  new Promise<number>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video.duration || 0);
    video.onerror = () => resolve(0);
    video.src = url;
  });

const DEFAULT_LOOK: ReelLook = {
  grade: 'warm',
  frame: 'full',
  grain: 18,
  vignette: 0.55,
  fadeOut: true,
  beatCut: true,
};

const DEFAULT_TEXT: ReelText = {
  kicker: '',
  hook: '',
  sub: '',
  style: 'serif',
  align: 'left',
  place: 'low',
  showHandle: true,
  showMark: true,
  lyrics: [],
  lyricFade: true,
};

const cleanLyricLine = (value: string) =>
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

/** Lyrics docs are paragraphs – `plainText` is already the clean line text. */
function lyricLinesFromDocument(doc: BandDocument) {
  const fromText = String(doc.plainText ?? '')
    .split(/\r?\n+/)
    .map(cleanLyricLine)
    .filter(Boolean);
  if (fromText.length) return fromText;
  return [...String(doc.content ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => cleanLyricLine(match[1]))
    .filter(Boolean);
}

export default function ReelsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ffmpeg, setFfmpeg] = useState<{ ok: boolean; version?: string; error?: string } | null>(null);

  const [clips, setClips] = useState<ClipState[]>([]);
  const [audioId, setAudioId] = useState<number | null>(null);
  const [audioStart, setAudioStart] = useState(0);
  const [target, setTarget] = useState(15);
  const [analysis, setAnalysis] = useState<BeatAnalysis | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [trackDuration, setTrackDuration] = useState(0);
  const [analysing, setAnalysing] = useState(false);

  const [look, setLook] = useState<ReelLook>(DEFAULT_LOOK);
  const [text, setText] = useState<ReelText>(DEFAULT_TEXT);
  const [step, setStep] = useState<Step>('clips');
  const [guides, setGuides] = useState(true);
  const [coverAt, setCoverAt] = useState(0.6);
  const [theater, setTheater] = useState(false);
  const [theaterGuides, setTheaterGuides] = useState(false);
  const [lyricsDraft, setLyricsDraft] = useState('');
  const [lyricsDocs, setLyricsDocs] = useState<BandDocument[]>([]);
  const [lyricsDocId, setLyricsDocId] = useState<number | null>(null);
  const [tapMode, setTapMode] = useState(false);
  const [tapIndex, setTapIndex] = useState(0);

  const [clipPicker, setClipPicker] = useState(false);
  const [audioPicker, setAudioPicker] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const [exportOpen, setExportOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<ReelJobView | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [creatingPost, setCreatingPost] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const frameExportRef = useRef<HTMLDivElement>(null);
  const lyricExportRef = useRef<HTMLDivElement>(null);
  const tapIndexRef = useRef(0);
  const pollRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/api/media').then((response) => response.json()),
      fetch('/api/profile').then((response) => response.json()),
      fetch('/api/reels').then((response) => response.json()),
      fetch('/api/documents?kind=lyrics').then((response) => response.json()),
    ])
      .then(([mediaData, profileData, reelData, documentData]) => {
        if (!mounted) return;
        setMedia(mediaData.media ?? []);
        setProfile(profileData.profile ?? null);
        setFfmpeg(reelData.ffmpeg ?? null);
        const docs: BandDocument[] = documentData.documents ?? [];
        setLyricsDocs(docs);
        setLyricsDocId((current) => current ?? docs[0]?.id ?? null);
      })
      .catch(() => toast('Reel lab could not be loaded', 'error'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const audioMedia = useMemo(() => media.find((item) => item.id === audioId) ?? null, [media, audioId]);

  const lyricsDoc = useMemo(
    () => lyricsDocs.find((doc) => doc.id === lyricsDocId) ?? null,
    [lyricsDocs, lyricsDocId]
  );
  const lyricsDocLines = useMemo(() => (lyricsDoc ? lyricLinesFromDocument(lyricsDoc) : []), [lyricsDoc]);

  const trackBeats = useMemo(() => {
    if (!analysis) return [];
    return analysis.beats
      .filter((beat) => beat >= audioStart && beat <= audioStart + target)
      .map((beat) => Number((beat - audioStart).toFixed(3)));
  }, [analysis, audioStart, target]);

  /** Assigned clip lengths (beat grid or equal), clamped to what the source can give. */
  const timeline = useMemo(() => {
    const wanted = planClipLengths(clips.length, target, trackBeats, look.beatCut);
    return clips.map((clip, index) => {
      const length = wanted[index] ?? 0;
      if (!clip.media.mime.startsWith('video/')) return { start: 0, duration: length };
      const maxStart = Math.max(0, clip.natural - Math.min(length, clip.natural));
      const start = Math.max(0, Math.min(clip.start, maxStart));
      const duration = Math.max(0.5, Math.min(length, clip.natural - start));
      return { start, duration };
    });
  }, [clips, target, trackBeats, look.beatCut]);

  const totalDuration = useMemo(
    () => Number(timeline.reduce((sum, entry) => sum + entry.duration, 0).toFixed(3)),
    [timeline]
  );

  const stageClips: StageClip[] = useMemo(() => {
    let cursor = 0;
    return clips.map((clip, index) => {
      const entry = timeline[index] ?? { start: 0, duration: 0 };
      const stage: StageClip = {
        key: clip.key,
        media: clip.media,
        start: entry.start,
        duration: entry.duration,
        motion: clip.motion,
        timelineStart: cursor,
      };
      cursor += entry.duration;
      return stage;
    });
  }, [clips, timeline]);

  const beats = useMemo(
    () => trackBeats.filter((beat) => beat < totalDuration - 0.2),
    [trackBeats, totalDuration]
  );

  useEffect(() => {
    if (time > totalDuration) setTime(0);
  }, [totalDuration, time]);

  /* ------------------------------------------------------------- playback */

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const next = audio.currentTime - audioStart;
      if (next >= totalDuration - 0.02) {
        audio.pause();
        setPlaying(false);
        setTime(Math.max(0, totalDuration - 0.02));
        return;
      }
      setTime(Math.max(0, next));
    }, 60);
    return () => window.clearInterval(timer);
  }, [playing, audioStart, totalDuration]);

  const togglePlay = async () => {
    if (!audioMedia) {
      toast('Pick a song first', 'error');
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (time >= totalDuration - 0.05) setTime(0);
    const startAt = audioStart + (time >= totalDuration - 0.05 ? 0 : time);
    try {
      audio.currentTime = startAt;
      await audio.play();
      setPlaying(true);
    } catch {
      toast('The browser refused to play the track', 'error');
    }
  };

  const seekStart = (value: number) => {
    setAudioStart(value);
    if (playing && audioRef.current) audioRef.current.currentTime = value + time;
  };

  const seekTo = (value: number) => {
    const next = Math.max(0, Math.min(totalDuration - 0.02, value));
    setTime(next);
    if (audioRef.current) audioRef.current.currentTime = audioStart + next;
  };

  const pickAudio = async (id: number) => {
    const item = media.find((entry) => entry.id === id);
    if (!item) return;
    setAudioId(id);
    setAnalysis(null);
    setPeaks([]);
    setTrackDuration(0);
    setAudioStart(0);
    setPlaying(false);
    setTime(0);
    setAnalysing(true);
    try {
      const response = await fetch(item.url);
      const bytes = await response.arrayBuffer();
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(bytes);
      const result = analyseAudioBuffer(buffer);
      setAnalysis(result);
      setPeaks(audioPeaks(buffer, 1200));
      setTrackDuration(buffer.duration);
      const wanted = Math.min(target, buffer.duration);
      const dropStart =
        result.drop > 2.5 && result.drop + wanted < buffer.duration
          ? result.drop - 0.35
          : result.drop > 2.5
            ? Math.max(0, buffer.duration - wanted)
            : 0;
      setAudioStart(Math.max(0, Math.min(buffer.duration - wanted, dropStart)));
      await context.close();
    } catch {
      toast('Could not analyse this file – MP3, WAV or M4A work best', 'error');
    } finally {
      setAnalysing(false);
    }
  };

  const addClips = async (ids: number[]) => {
    const room = Math.max(0, 12 - clips.length);
    const chosen = ids
      .map((id) => media.find((item) => item.id === id))
      .filter((item): item is MediaItem => Boolean(item))
      .filter((item) => item.mime !== 'image/svg+xml')
      .slice(0, room);
    if (!chosen.length) return;
    const next: ClipState[] = [];
    for (const item of chosen) {
      const natural = item.mime.startsWith('video/') ? await sourceDuration(item.url) : Infinity;
      next.push({
        key: `${item.id}-${Math.random().toString(36).slice(2, 7)}`,
        media: item,
        start: 0,
        motion: 'in',
        natural: natural > 0 ? natural : 3,
      });
    }
    setClips((current) => [...current, ...next]);
    setStep('clips');
  };

  const moveClip = (index: number, direction: -1 | 1) => {
    setClips((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const applyPreset = (preset: ReelPreset) => {
    setTarget(preset.duration);
    setLook((current) => ({
      ...current,
      grade: preset.grade,
      grain: preset.grain,
      vignette: preset.vignette,
      fadeOut: preset.fadeOut,
    }));
    setClips((current) => current.map((clip) => ({ ...clip, motion: preset.motion })));
    if (trackDuration) setAudioStart((current) => Math.max(0, Math.min(current, trackDuration - preset.duration)));
  };

  const setDuration = (value: number) => {
    setTarget(value);
    if (trackDuration) setAudioStart((current) => Math.max(0, Math.min(current, trackDuration - value)));
  };

  /* ---------------------------------------------------------------- lyrics */

  const setLineStart = useCallback(
    (index: number, value: number, sequential = false) => {
      setText((current) => {
        const lines = current.lyrics ?? [];
        if (!lines[index]) return current;
        const min = index > 0 ? lines[index - 1].start + 0.05 : 0;
        const max = sequential
          ? Math.max(min + 0.05, totalDuration - 0.1)
          : index < lines.length - 1
            ? Math.max(min + 0.05, lines[index + 1].start - 0.05)
            : Math.max(min + 0.05, totalDuration - 0.1);
        const start = Number(Math.max(min, Math.min(max, Math.max(0, value))).toFixed(2));
        const lyrics = lines.map((line, i) => (i === index ? { ...line, start } : line));
        return { ...current, lyrics };
      });
    },
    [totalDuration]
  );

  const applyLyrics = () => {
    const next = lyricsFromText(lyricsDraft, totalDuration || target);
    if (!next.length) {
      toast('Füge zuerst ein paar Zeilen ein', 'error');
      return;
    }
    setText((current) => ({ ...current, lyrics: next }));
    setTapMode(false);
    setTapIndex(0);
    tapIndexRef.current = 0;
  };

  const appendLyricLine = (value: string) => {
    const clean = cleanLyricLine(value);
    if (!clean) return;
    setText((current) => {
      const lines = current.lyrics ?? [];
      const previous = lines[lines.length - 1]?.start ?? -0.5;
      const span = Math.max(1, totalDuration || target);
      const start = Number(Math.min(Math.max(0.1, span - 0.1), Math.max(0.1, previous + 1)).toFixed(2));
      return { ...current, lyrics: [...lines, { text: clean, start }] };
    });
  };

  const appendLyricsDocument = () => {
    if (!lyricsDoc || !lyricsDocLines.length) return;
    setText((current) => {
      const existing = current.lyrics ?? [];
      const span = Math.max(1, totalDuration || target);
      const previous = existing[existing.length - 1]?.start ?? -0.5;
      const base = existing.length ? Math.max(0.1, previous) : 0.1;
      const slots = lyricsDocLines.length + (existing.length ? 1 : 0);
      const step = (span - base) / Math.max(1, slots);
      const added = lyricsDocLines.map((line, index) => ({
        text: line,
        start: Number(
          Math.min(
            span - 0.1,
            Math.max(0.1, base + (existing.length ? index + 1 : index) * step)
          ).toFixed(2)
        ),
      }));
      return { ...current, lyrics: [...existing, ...added] };
    });
    setTapMode(false);
  };

  const addLyricLine = () => {
    appendLyricLine('neue zeile');
  };

  const distributeLyrics = () => {
    const span = Math.max(1, totalDuration || target);
    const step = span / Math.max(1, text.lyrics.length);
    setText((current) => ({
      ...current,
      lyrics: current.lyrics.map((line, index) => ({
        ...line,
        start: Number(Math.min(span - 0.15, index * step).toFixed(2)),
      })),
    }));
  };

  const startTapSession = async () => {
    if (!audioMedia) {
      toast('Wähle zuerst einen Song', 'error');
      return;
    }
    if (!text.lyrics.length) return;
    tapIndexRef.current = 0;
    setTapIndex(0);
    setTapMode(true);
    setTime(0);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = audioStart;
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        toast('Der Browser konnte den Song nicht starten', 'error');
      }
    }
  };

  const stampNextLyric = useCallback(() => {
    const index = tapIndexRef.current;
    const lines = text.lyrics ?? [];
    if (index >= lines.length) return;
    const audio = audioRef.current;
    const at = audio ? Math.max(0, audio.currentTime - audioStart) : time;
    setLineStart(index, at, true);
    const next = index + 1;
    tapIndexRef.current = next;
    setTapIndex(next);
    if (next >= lines.length) {
      setTapMode(false);
      toast('Lyrics-Timing sitzt');
    }
  }, [audioStart, setLineStart, text.lyrics, time]);

  useEffect(() => {
    if (!tapMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        stampNextLyric();
      }
      if (event.key === 'Escape') setTapMode(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tapMode, stampNextLyric]);

  /* --------------------------------------------------------------- export */

  const buildPlan = (): ReelPlan => {
    const planLyrics = normaliseLyrics(text.lyrics, totalDuration);
    return {
      title:
        text.hook.split('\n')[0]?.trim() || planLyrics[0]?.text || audioMedia?.title || 'Reel',
      clips: clips.map((clip, index) => ({
        mediaId: clip.media.id,
        start: timeline[index]?.start ?? 0,
        duration: timeline[index]?.duration ?? 1,
        motion: clip.motion,
      })),
      audio: { mediaId: audioId ?? 0, start: audioStart, duration: totalDuration },
      look,
      text: { ...text, lyrics: planLyrics },
      beats,
      coverAt: Math.min(Math.max(0.1, totalDuration - 0.1), Math.max(0, coverAt)),
    };
  };

  const renderOverlay = async () => {
    if (text.lyrics.length) return null;
    if (
      !text.hook.trim() &&
      !text.kicker.trim() &&
      !text.sub.trim() &&
      !text.showMark &&
      !text.showHandle
    ) {
      return null;
    }
    if (!exportRef.current) return null;
    const { toPng } = await import('html-to-image');
    return toPng(exportRef.current, {
      width: 1080,
      height: 1920,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: 'transparent',
    });
  };

  const renderFrameOverlay = async () => {
    if (!text.showMark && !text.showHandle) return null;
    if (!frameExportRef.current) return null;
    const { toPng } = await import('html-to-image');
    return toPng(frameExportRef.current, {
      width: 1080,
      height: 1920,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: 'transparent',
    });
  };

  const renderLyricOverlays = async () => {
    if (!text.lyrics.length || !lyricExportRef.current) return [];
    const { toPng } = await import('html-to-image');
    const lines = normaliseLyrics(text.lyrics, totalDuration);
    const nodes = [...lyricExportRef.current.querySelectorAll<HTMLElement>('[data-lyric-frame]')];
    const overlays: { start: number; end: number; png: string }[] = [];
    for (let index = 0; index < lines.length; index++) {
      const node = nodes[index];
      if (!node) continue;
      const window = lyricWindow(lines, index, totalDuration);
      const png = await toPng(node, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: 'transparent',
      });
      overlays.push({ ...window, png });
    }
    return overlays;
  };

  const startExport = async () => {
    if (!ffmpeg?.ok) {
      toast('ffmpeg is not installed on this server', 'error');
      return;
    }
    if (!clips.length) {
      toast('Add at least one clip', 'error');
      return;
    }
    if (!audioMedia) {
      toast('Pick a song first', 'error');
      return;
    }
    setStarting(true);
    setExportError(null);
    setJob(null);
    try {
      const overlays = await renderLyricOverlays();
      const overlay = text.lyrics.length ? await renderFrameOverlay() : await renderOverlay();
      const response = await fetch('/api/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: buildPlan(), overlay, overlays }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'The render could not be started');
      setJob(data.job);
      pollRef.current = true;
      void pollJob(data.job.id);
    } catch (error: any) {
      setExportError(error.message ?? 'The render failed');
    } finally {
      setStarting(false);
    }
  };

  const pollJob = async (id: string) => {
    while (pollRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (!pollRef.current) return;
      try {
        const response = await fetch(`/api/reels/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Render lost');
        setJob(data.job);
        if (data.job.status === 'done' || data.job.status === 'error') return;
      } catch (error: any) {
        setExportError(error.message ?? 'Render lost');
        return;
      }
    }
  };

  useEffect(() => {
    if (!exportOpen) pollRef.current = false;
  }, [exportOpen]);

  useEffect(() => {
    if (!theater) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTheater(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [theater]);

  useEffect(() => {
    return () => {
      pollRef.current = false;
    };
  }, []);

  const closeExport = () => {
    pollRef.current = false;
    setExportOpen(false);
  };

  const createReelPost = async () => {
    if (!job?.mediaId) return;
    setCreatingPost(true);
    try {
      const caption = [
        text.hook.trim(),
        text.sub.trim(),
        text.lyrics.length ? text.lyrics.map((line) => line.text).slice(0, 4).join('\n') : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reel',
          status: 'draft',
          caption,
          altText: `${profile?.bandName ?? 'déchire'} – ${text.hook.trim() || 'Reel'}`,
          songTitle: audioMedia?.title ?? '',
          songArtist: profile?.bandName ?? '',
          mediaIds: [job.mediaId],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the post');
      closeExport();
      router.push(`/planner?post=${data.post.id}`);
    } catch (error: any) {
      toast(error.message ?? 'Could not create the post', 'error');
    } finally {
      setCreatingPost(false);
    }
  };

  if (loading) return <Spinner label="Warming up the reel machine" />;

  const visualClips = clips.length;
  const chosenTrack = audioMedia?.title ?? '';
  const canExport = Boolean(ffmpeg?.ok && visualClips && audioMedia);
  const resultUrl = job?.filename ? `/api/files/${job.filename}` : '';

  return (
    <>
      <PageHead
        eyebrow="Reel machine"
        title={
          <>
            Reel<span className="slash">/</span>Lab
          </>
        }
        sub="Clips wählen, Song nehmen, Lyrics setzen, auf den Beat schneiden: 9:16, 1080×1920, sichere Zonen, Ton normalisiert. Vier Schritte, ein Export."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setGuides((value) => !value)}>
              {guides ? <IconEyeOff size={14} /> : <IconEye size={14} />}
              Safe zones
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canExport}
              onClick={() => {
                setExportOpen(true);
                void startExport();
              }}
            >
              <IconZap size={15} /> Export
            </button>
          </div>
        }
      />

      {ffmpeg && !ffmpeg.ok ? (
        <div className="reel-warn">
          <IconFilm size={16} />
          <div>
            <strong>ffmpeg fehlt auf diesem Server.</strong> Damit gerendert werden kann, muss es installiert
            sein (<code>brew install ffmpeg</code> bzw. <code>apt install ffmpeg</code>) oder über
            <code> FFMPEG_PATH</code> gesetzt werden.
          </div>
        </div>
      ) : null}

      <div className="reel-lab">
        <section className="panel reel-stage-panel">
          <div className="reel-stage-tools">
            <span className="mono">9:16 · Vorschau</span>
            {clips.length ? (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTheater(true)}>
                <IconExpand size={13} /> Groß
              </button>
            ) : null}
          </div>
          {clips.length ? (
            <ReelStage
              clips={stageClips}
              time={time}
              playing={playing}
              look={look}
              text={text}
              handle={profile?.handle}
              beats={beats}
              guides={guides}
            />
          ) : (
            <div className="reel-stage-empty">
              <EmptyState
                icon={<IconFilm size={24} />}
                title="Noch keine Clips"
                hint="Videos oder Fotos aus der Bibliothek – oder direkt hochladen."
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setClipPicker(true)}>
                    <IconPlus size={14} /> Clips wählen
                  </button>
                }
              />
            </div>
          )}

          <div className="reel-transport">
            <button
              type="button"
              className="btn btn-icon reel-play"
              onClick={togglePlay}
              disabled={!audioMedia || !clips.length}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <IconPause size={15} /> : <IconPlay size={15} />}
            </button>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => {
                setPlaying(false);
                audioRef.current?.pause();
                setTime(0);
                if (audioRef.current) audioRef.current.currentTime = audioStart;
              }}
              aria-label="Restart"
            >
              <IconRotate size={14} />
            </button>
            <span className="mono reel-clock">
              {clock(time)} <i>/</i> {clock(totalDuration)}
            </span>
            <span className="reel-transport-meta">
              {visualClips} {visualClips === 1 ? 'Clip' : 'Clips'}
              {analysis ? ` · ${analysis.bpm} BPM` : ''}
            </span>
          </div>
        </section>

        <section className="panel reel-controls">
          <div className="reel-presets">
            {REEL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`reel-preset ${target === preset.duration ? 'on' : ''}`}
                onClick={() => applyPreset(preset)}
                title={preset.hint}
              >
                <strong>{preset.label}</strong>
                <span>{preset.duration} s</span>
              </button>
            ))}
          </div>

          <div className="reel-tabs" role="tablist">
            {(
              [
                ['clips', '01 Clips'],
                ['sound', '02 Sound'],
                ['lyrics', '03 Lyrics'],
                ['look', '04 Look'],
              ] as [Step, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={step === value}
                className={step === value ? 'on' : ''}
                onClick={() => setStep(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {step === 'clips' ? (
            <div className="reel-panel">
              <div className="row between wrap" style={{ gap: 10 }}>
                <div>
                  <div className="label">Schnitt</div>
                  <p className="small muted">
                    {look.beatCut ? 'Auf den Beat geschnitten.' : 'Gleichmäßig verteilt.'}{' '}
                    {target !== totalDuration && clips.length ? `Reel wird ${totalDuration.toFixed(1)} s.` : ''}
                  </p>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${look.beatCut ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setLook((current) => ({ ...current, beatCut: !current.beatCut }))}
                  >
                    <IconZap size={13} /> Beat-Cut
                  </button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setClipPicker(true)}>
                    <IconPlus size={14} /> Clips
                  </button>
                </div>
              </div>

              {clips.length === 0 ? (
                <div className="empty" style={{ padding: '26px 12px' }}>
                  <h3>Erst Clips, dann Magie</h3>
                  <p>Videos werden auf 9:16 beschnitten, Fotos bekommen einen langsamen Push.</p>
                </div>
              ) : (
                <ul className="reel-cliplist">
                  {clips.map((clip, index) => {
                    const entry = timeline[index] ?? { start: 0, duration: 0 };
                    const isVideo = clip.media.mime.startsWith('video/');
                    const maxStart = isVideo ? Math.max(0, clip.natural - Math.max(0.6, entry.duration)) : 0;
                    return (
                      <li key={clip.key} className="reel-clip">
                        <MediaThumb media={clip.media} className="reel-clip-thumb" />
                        <div className="reel-clip-main">
                          <div className="reel-clip-head">
                            <span className="truncate">{clip.media.title}</span>
                            <em className="mono">{entry.duration.toFixed(1)} s</em>
                          </div>
                          <div className="reel-clip-row">
                            <div className="reel-motion">
                              {(
                                [
                                  ['none', 'Still'],
                                  ['in', 'Push'],
                                  ['out', 'Pull'],
                                ] as [ReelMotion, string][]
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={clip.motion === value ? 'on' : ''}
                                  onClick={() =>
                                    setClips((current) =>
                                      current.map((item) =>
                                        item.key === clip.key ? { ...item, motion: value } : item
                                      )
                                    )
                                  }
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="reel-clip-actions">
                              <button
                                type="button"
                                onClick={() => moveClip(index, -1)}
                                disabled={index === 0}
                                aria-label="Move up"
                              >
                                <IconArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveClip(index, 1)}
                                disabled={index === clips.length - 1}
                                aria-label="Move down"
                              >
                                <IconArrowDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setClips((current) => current.filter((item) => item.key !== clip.key))}
                                aria-label="Remove clip"
                              >
                                <IconTrash size={13} />
                              </button>
                            </div>
                          </div>
                          {isVideo && maxStart > 0.05 ? (
                            <label className="reel-trim">
                              <span>Start</span>
                              <input
                                type="range"
                                min={0}
                                max={maxStart}
                                step={0.05}
                                value={Math.min(clip.start, maxStart)}
                                onChange={(event) =>
                                  setClips((current) =>
                                    current.map((item) =>
                                      item.key === clip.key
                                        ? { ...item, start: Number(event.target.value) }
                                        : item
                                    )
                                  )
                                }
                              />
                              <em className="mono">{Math.min(clip.start, maxStart).toFixed(1)} s</em>
                            </label>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {step === 'sound' ? (
            <div className="reel-panel">
              <div className="row between wrap" style={{ gap: 10 }}>
                <div>
                  <div className="label">Song</div>
                  <p className="small muted">
                    {chosenTrack || 'Eigene Masters, Demos, alles aus der Mediathek.'}
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setAudioPicker(true)}>
                  <IconMusic size={14} /> {chosenTrack ? 'Wechseln' : 'Song wählen'}
                </button>
              </div>

              {analysing ? (
                <div className="reel-analysing">
                  <span className="spinner" /> Beat-Erkennung läuft …
                </div>
              ) : null}

              {peaks.length ? (
                <>
                  <ReelWaveform
                    peaks={peaks}
                    duration={trackDuration}
                    start={audioStart}
                    length={totalDuration}
                    beats={analysis?.beats ?? []}
                    playhead={playing ? time : null}
                    onPick={seekStart}
                  />
                  <div className="reel-sound-meta">
                    <span className="mono">
                      {analysis ? `${analysis.bpm} BPM` : 'kein Takt'} · {chosenTrack}
                    </span>
                    <span className="row" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setAudioStart(0)}
                      >
                        Anfang
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() =>
                          setAudioStart(Math.max(0, Math.min(trackDuration - target, (analysis?.drop ?? 0) - 0.35)))
                        }
                        disabled={!analysis?.drop}
                      >
                        <IconZap size={13} /> Drop
                      </button>
                    </span>
                  </div>
                  <label className="reel-range">
                    <span>Start im Song</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, trackDuration - 1)}
                      step={0.1}
                      value={audioStart}
                      onChange={(event) => seekStart(Number(event.target.value))}
                    />
                    <em className="mono">{clock(audioStart)}</em>
                  </label>
                </>
              ) : null}

              <Field label="Länge">
                <div className="reel-chips">
                  {REEL_DURATIONS.filter((value) => value <= 60).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={target === value ? 'on' : ''}
                      onClick={() => setDuration(value)}
                    >
                      {value} s
                    </button>
                  ))}
                </div>
              </Field>

              <div className="reel-hint">
                <IconMusic size={14} />
                <span>
                  Der Ton wird auf −14 LUFS normalisiert und am Ende ausgeblendet – Instagram nimmt ihn so
                  unverändert an. Nur eigene oder lizenzierte Musik verwenden.
                </span>
              </div>
            </div>
          ) : null}

          {step === 'lyrics' ? (
            <div className="reel-panel">
              <div className="row between wrap" style={{ gap: 10 }}>
                <div>
                  <div className="label">Lyrics im Takt</div>
                  <p className="small muted">
                    Eine Zeile = ein Cue. Text einfügen, dann beim Hören jede Zeile antippen – oder Zeiten
                    von Hand setzen.
                  </p>
                </div>
                {text.lyrics.length ? (
                  <span className="mono small muted">{text.lyrics.length} cues</span>
                ) : null}
                {text.lyrics.length ? (
                  <button
                    type="button"
                    className={tapMode ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
                    onClick={tapMode ? () => setTapMode(false) : startTapSession}
                    disabled={!audioMedia}
                  >
                    {tapMode ? <IconPause size={13} /> : <IconPlay size={13} />}
                    {tapMode ? 'Tap-Session stoppen' : 'Tap-Session'}
                  </button>
                ) : null}
                <label className="reel-toggle">
                  <input
                    type="checkbox"
                    checked={text.lyricFade}
                    onChange={(event) => setText((current) => ({ ...current, lyricFade: event.target.checked }))}
                  />
                  <span>Weich einblenden</span>
                </label>
              </div>

              <textarea
                className="input reel-lyrics-input"
                rows={4}
                value={lyricsDraft}
                placeholder={'eine zeile pro cue\nkein leerer raum dazwischen\n...'}
                onChange={(event) => setLyricsDraft(event.target.value)}
              />

              <div className="row wrap" style={{ gap: 8 }}>
                <button type="button" className="btn btn-sm btn-primary" onClick={applyLyrics}>
                  <IconPlus size={13} /> Zeilen übernehmen
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={addLyricLine}>
                  <IconPlus size={13} /> Zeile
                </button>
                {text.lyrics.length ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setLyricsDraft(text.lyrics.map((line) => line.text).join('\n'))}
                  >
                    Text bearbeiten
                  </button>
                ) : null}
                {text.lyrics.length ? (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={distributeLyrics}>
                    Gleichmäßig verteilen
                  </button>
                ) : null}
                {text.lyrics.length ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setText((current) => ({ ...current, lyrics: [] }));
                      setTapMode(false);
                    }}
                  >
                    <IconTrash size={13} /> Leeren
                  </button>
                ) : null}
              </div>

              <div className="reel-lyric-source">
                <div className="reel-lyric-source-head">
                  <div>
                    <span className="label">Aus Lyrics-Dokument</span>
                    <p className="small muted">
                      Eine Zeile anklicken – sie wird direkt als Cue angelegt. Die Zeiten danach mit der
                      Tap-Session setzen.
                    </p>
                  </div>
                  {lyricsDocs.length ? (
                    <select
                      className="select"
                      value={lyricsDocId ?? ''}
                      onChange={(event) => setLyricsDocId(event.target.value ? Number(event.target.value) : null)}
                      aria-label="Lyrics-Dokument wählen"
                    >
                      {lyricsDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.title}
                          {doc.songTitle ? ` · ${doc.songTitle}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                {lyricsDocs.length === 0 ? (
                  <p className="small muted reel-lyric-source-empty">
                    Noch kein Lyrics-Dokument gefunden. Lege eins unter{' '}
                    <Link href="/docs">Documents</Link> an – es erscheint dann hier Zeile für Zeile.
                  </p>
                ) : lyricsDoc && lyricsDocLines.length ? (
                  <>
                    <div className="reel-lyric-source-list">
                      {lyricsDocLines.map((line, index) => (
                        <button
                          key={`${lyricsDoc.id}-${index}-${line}`}
                          type="button"
                          onClick={() => appendLyricLine(line)}
                          title="Als Cue hinzufügen"
                        >
                          <span className="mono">{String(index + 1).padStart(2, '0')}</span>
                          <span className="truncate">{line}</span>
                          <IconPlus size={12} />
                        </button>
                      ))}
                    </div>
                    <div className="reel-lyric-source-foot">
                      <span className="mono small muted">{lyricsDocLines.length} Zeilen</span>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={appendLyricsDocument}>
                        <IconPlus size={13} /> Alle Zeilen übernehmen
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="small muted reel-lyric-source-empty">
                    Dieses Dokument enthält noch keine Textzeilen.
                  </p>
                )}
              </div>

              {tapMode ? (
                <div className="reel-tap">
                  <div className="label">Nächste Zeile</div>
                  <strong>{text.lyrics[tapIndex]?.text ?? 'Alle Zeilen gesetzt'}</strong>
                  <button type="button" className="btn btn-primary" onClick={stampNextLyric}>
                    Zeile setzen <span className="mono">Space</span>
                  </button>
                  <p className="small muted">
                    Der Song läuft. Drück die Leertaste genau dann, wenn die Zeile beginnt. Escape beendet die
                    Session.
                  </p>
                </div>
              ) : null}

              {text.lyrics.length ? (
                <div className="reel-lyric-bar" aria-label="Lyric-Timeline">
                  {text.lyrics.map((line, index) => {
                    const cue = lyricWindow(text.lyrics, index, totalDuration || target);
                    const span = Math.max(0.1, cue.end - cue.start);
                    const width = Math.max(2, (span / Math.max(0.1, totalDuration || target)) * 100);
                    return (
                      <button
                        key={`${index}-${line.start}`}
                        type="button"
                        className={lyricIndexAt(text.lyrics, time) === index ? 'on' : ''}
                        style={{ width: `${width}%` }}
                        onClick={() => seekTo(line.start)}
                        title={`${clock(line.start)} · ${line.text}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {text.lyrics.length ? (
                <ul className="reel-lyrics-list">
                  {text.lyrics.map((line, index) => {
                    const active = lyricIndexAt(text.lyrics, time) === index;
                    const cue = lyricWindow(text.lyrics, index, totalDuration || target);
                    return (
                      <li key={`${index}-${line.start}`} className={active ? 'on' : ''}>
                        <button
                          type="button"
                          className="reel-lyric-time mono"
                          onClick={() => {
                            setPlaying(false);
                            audioRef.current?.pause();
                            setTime(line.start);
                            if (audioRef.current) audioRef.current.currentTime = audioStart + line.start;
                          }}
                          title="An diese Stelle springen"
                        >
                          {clock(line.start)}
                        </button>
                        <input
                          className="input"
                          value={line.text}
                          onChange={(event) =>
                            setText((current) => ({
                              ...current,
                              lyrics: current.lyrics.map((entry, i) =>
                                i === index ? { ...entry, text: event.target.value.slice(0, 120) } : entry
                              ),
                            }))
                          }
                        />
                        <span className="reel-lyric-length mono">{(cue.end - cue.start).toFixed(1)} s</span>
                        <div className="reel-lyric-actions">
                          <button
                            type="button"
                            onClick={() => setLineStart(index, time)}
                            title="Start auf den aktuellen Playhead setzen"
                          >
                            Playhead
                          </button>
                          <button type="button" onClick={() => setLineStart(index, line.start - 0.1)} title="0,1 s früher">
                            −0,1
                          </button>
                          <button type="button" onClick={() => setLineStart(index, line.start + 0.1)} title="0,1 s später">
                            +0,1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setText((current) => ({
                                ...current,
                                lyrics: current.lyrics.filter((_, i) => i !== index),
                              }))
                            }
                            aria-label="Zeile löschen"
                          >
                            <IconTrash size={12} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="reel-hint">
                  <IconSparkles size={14} />
                  <span>
                    Jede nicht-leere Zeile wird ein eigener Cue. Du kannst beliebig viele anlegen – entweder
                    den ganzen Text einfügen und übernehmen, oder einzelne Zeilen mit <strong>+ Zeile</strong>{' '}
                    ergänzen.
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {step === 'look' ? (
            <div className="reel-panel">
              <div className="reel-text-grid">
                <Field label="Kicker">
                  <input
                    className="input"
                    value={text.kicker}
                    placeholder="new single"
                    onChange={(event) => setText((current) => ({ ...current, kicker: event.target.value }))}
                  />
                </Field>
                <Field label="Zeile klein">
                  <input
                    className="input"
                    value={text.sub}
                    placeholder="out everywhere"
                    onChange={(event) => setText((current) => ({ ...current, sub: event.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Hook" hint={<span className="mono">{text.hook.length}/48</span>}>
                <textarea
                  className="input reel-hook-input"
                  rows={2}
                  maxLength={48}
                  value={text.hook}
                  placeholder="fracture"
                  onChange={(event) => setText((current) => ({ ...current, hook: event.target.value }))}
                />
              </Field>

              <div className="reel-look-row">
                <Field label="Schrift">
                  <div className="reel-chips">
                    {(
                      [
                        ['serif', 'Serif'],
                        ['sans', 'Sans'],
                        ['mono', 'Mono'],
                      ] as [ReelTextStyle, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={text.style === value ? 'on' : ''}
                        onClick={() => setText((current) => ({ ...current, style: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Ausrichtung">
                  <div className="reel-chips">
                    {(
                      [
                        ['left', 'Links'],
                        ['center', 'Mitte'],
                      ] as ['left' | 'center', string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={text.align === value ? 'on' : ''}
                        onClick={() => setText((current) => ({ ...current, align: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Position">
                  <div className="reel-chips">
                    {(
                      [
                        ['top', 'Oben'],
                        ['middle', 'Mitte'],
                        ['low', 'Unten'],
                      ] as ['top' | 'middle' | 'low', string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={text.place === value ? 'on' : ''}
                        onClick={() => setText((current) => ({ ...current, place: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="reel-look-row">
                <Field label="Look">
                  <div className="reel-chips">
                    {(['none', 'warm', 'mono', 'bleach'] as ReelGrade[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={look.grade === value ? 'on' : ''}
                        onClick={() => setLook((current) => ({ ...current, grade: value }))}
                      >
                        {GRADE_LABEL[value]}
                      </button>
                    ))}
                  </div>
                  <p className="reel-look-hint">{GRADE_HINT[look.grade]}</p>
                </Field>
                <label className="reel-toggle">
                  <input
                    type="checkbox"
                    checked={text.showHandle}
                    onChange={(event) => setText((current) => ({ ...current, showHandle: event.target.checked }))}
                  />
                  <span>Handle zeigen</span>
                </label>
                <label className="reel-toggle">
                  <input
                    type="checkbox"
                    checked={look.fadeOut}
                    onChange={(event) => setLook((current) => ({ ...current, fadeOut: event.target.checked }))}
                  />
                  <span>Ausblenden</span>
                </label>
              </div>

              <div className="reel-look-row">
                <Field label="Rahmen">
                  <div className="reel-chips">
                    {(['full', '4:3', '16:9'] as ReelFrame[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={look.frame === value ? 'on' : ''}
                        onClick={() => setLook((current) => ({ ...current, frame: value }))}
                      >
                        {FRAME_LABEL[value]}
                      </button>
                    ))}
                  </div>
                  <p className="reel-look-hint">
                    {look.frame === 'full'
                      ? 'Vollbild auf 9:16 – maximales Bild, kein Filmfenster.'
                      : `Schwarze Balken oben und unten – das Bild wird zum ${look.frame}-Filmfenster.`}
                  </p>
                </Field>
                <label className="reel-toggle">
                  <input
                    type="checkbox"
                    checked={text.showMark}
                    onChange={(event) => setText((current) => ({ ...current, showMark: event.target.checked }))}
                  />
                  <span>Wortmarke</span>
                </label>
              </div>

              <label className="reel-range">
                <span>Korn</span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={look.grain}
                  onChange={(event) => setLook((current) => ({ ...current, grain: Number(event.target.value) }))}
                />
                <em className="mono">{look.grain}</em>
              </label>
              <label className="reel-range">
                <span>Vignette</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={look.vignette}
                  onChange={(event) =>
                    setLook((current) => ({ ...current, vignette: Number(event.target.value) }))
                  }
                />
                <em className="mono">{Math.round(look.vignette * 100)} %</em>
              </label>
              <p className="reel-look-hint">
                Korn 0–10 bleibt clean, ab 18 wird es Filmkorn. Vignette dunkelt die Ränder ab und hält
                den Blick in der Mitte.
              </p>

              <div className="reel-cover-row">
                <div>
                  <div className="label">Cover</div>
                  <p className="small muted">Das Bild, das im Feed stehen bleibt.</p>
                </div>
                <span className="mono">{clock(coverAt)}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setCoverAt(Math.min(Math.max(0.1, totalDuration - 0.1), time))}
                  disabled={!totalDuration}
                >
                  Aus Playhead
                </button>
              </div>

              <div className="reel-hint">
                <IconSparkles size={14} />
                <span>
                  Text sitzt automatisch in den Safe Zones: oben 14 %, unten 35 % bleiben frei, damit
                  Instagram-UI nichts verdeckt.
                </span>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <MediaPicker
        open={clipPicker}
        onClose={() => setClipPicker(false)}
        media={media}
        selectedIds={[]}
        onConfirm={(ids) => {
          void addClips(ids);
          setClipPicker(false);
        }}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
        multiple
        visualOnly
      />

      <MediaPicker
        open={audioPicker}
        onClose={() => setAudioPicker(false)}
        media={media}
        selectedIds={audioId ? [audioId] : []}
        onConfirm={(ids) => {
          if (ids[0]) void pickAudio(ids[0]);
          setAudioPicker(false);
        }}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
        kind="audio"
      />

      <audio ref={audioRef} src={audioMedia?.url} preload="auto" onEnded={() => setPlaying(false)} />

      {theater && clips.length && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="reel-theater"
              role="dialog"
              aria-modal="true"
              aria-label="Großvorschau"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setTheater(false);
              }}
            >
              <button
                type="button"
                className="reel-theater-close"
                onClick={() => setTheater(false)}
                aria-label="Vorschau schließen"
              >
                <IconX size={18} />
              </button>
              <div className="reel-theater-stage">
                <ReelStage
                  clips={stageClips}
                  time={time}
                  playing={playing}
                  look={look}
                  text={text}
                  handle={profile?.handle}
                  beats={beats}
                  guides={theaterGuides}
                />
              </div>
              <div className="reel-theater-bar">
                <button
                  type="button"
                  className="btn btn-icon reel-play"
                  onClick={togglePlay}
                  disabled={!audioMedia}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <IconPause size={15} /> : <IconPlay size={15} />}
                </button>
                <input
                  className="reel-theater-scrub"
                  type="range"
                  min={0}
                  max={Math.max(0.1, totalDuration)}
                  step={0.02}
                  value={Math.min(time, totalDuration)}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  aria-label="Zeitleiste"
                />
                <span className="mono reel-theater-clock">
                  {clock(time)} <i>/</i> {clock(totalDuration)}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => seekTo(time - 1 / 30)}
                  title="Ein Frame zurück"
                >
                  −1f
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => seekTo(time + 1 / 30)}
                  title="Ein Frame vor"
                >
                  +1f
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${theaterGuides ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTheaterGuides((value) => !value)}
                >
                  Safe zones
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setCoverAt(Math.min(Math.max(0.1, totalDuration - 0.1), time));
                    toast('Cover auf diesen Frame gesetzt');
                  }}
                >
                  Als Cover
                </button>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* transparent text layer – rasterised for the ffmpeg overlay */}
      <div className="reel-export-holder" aria-hidden="true">
        {text.lyrics.length ? (
          <>
            <div
              className="reel-frame reel-overlay-frame"
              ref={frameExportRef}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <ReelOverlay
                text={{ ...text, kicker: '', sub: '', hook: '' }}
                handle={profile?.handle}
              />
            </div>
            <div ref={lyricExportRef}>
              {normaliseLyrics(text.lyrics, totalDuration).map((line, index) => (
                <div
                  key={`${line.start}-${index}`}
                  data-lyric-frame
                  className="reel-frame reel-overlay-frame"
                  style={{ position: 'absolute', top: index * 1920, left: 0 }}
                >
                  <ReelOverlay
                    text={{
                      ...text,
                      kicker: '',
                      sub: '',
                      hook: line.text,
                      showMark: false,
                      showHandle: false,
                    }}
                    handle={profile?.handle}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="reel-frame reel-overlay-frame" ref={exportRef}>
            <ReelOverlay text={text} handle={profile?.handle} />
          </div>
        )}
      </div>

      <Modal
        open={exportOpen}
        onClose={closeExport}
        title="Reel rendern"
        subtitle="Instagram-Reel · 1080 × 1920 · 30 fps · H.264/AAC · 12 Mbps VBR"
        footer={
          job?.status === 'done' ? (
            <>
              <a className="btn btn-ghost" href={resultUrl} download>
                <IconDownload size={14} /> MP4
              </a>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createReelPost}
                disabled={creatingPost}
              >
                {creatingPost ? 'Anlegen …' : 'In den Planner'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={closeExport}>
                Schließen
              </button>
              {job?.status === 'error' || exportError ? (
                <button type="button" className="btn btn-primary" onClick={startExport} disabled={starting}>
                  Nochmal
                </button>
              ) : null}
            </>
          )
        }
      >
        <div className="reel-export">
          {job?.status === 'done' && resultUrl ? (
            <div className="reel-result">
              <video className="reel-result-video" src={resultUrl} controls playsInline />
              <div>
                <div className="label">Fertig</div>
                <h3>Reel in der Bibliothek</h3>
                <p className="small muted">
                  {job.duration.toFixed(1)} s · Cover {job.coverId ? 'erzeugt' : 'nicht erzeugt'} · Video liegt
                  unter Media → Videos.
                </p>
                {job.bytes ? (
                  <p className="small muted">
                    {formatBytes(job.bytes)} · 1080 × 1920 · 30 fps · H.264/AAC · Instagram-tauglich
                  </p>
                ) : null}
                <p className="small muted">
                  {text.lyrics.length
                    ? `${text.lyrics.length} Lyrics-Zeilen`
                    : `${text.hook.trim() || 'Ohne Hook'} ${text.sub.trim() ? `· ${text.sub.trim()}` : ''}`}
                </p>
              </div>
            </div>
          ) : exportError || job?.status === 'error' ? (
            <div className="reel-error">
              <strong>Der Render ist gescheitert.</strong>
              <p className="small muted">{exportError ?? job?.error ?? 'Unbekannter Fehler'}</p>
              <p className="small muted">
                Meistens fehlt eine Datei oder ffmpeg kennt einen Codec nicht – die Meldung oben hilft beim
                Einordnen.
              </p>
            </div>
          ) : (
            <div className="reel-progress">
              <div className="reel-progress-head">
                <span className="label">Rendert</span>
                <span className="mono">{Math.round((job?.progress ?? 0) * 100)} %</span>
              </div>
              <div className="reel-progress-bar">
                <span style={{ width: `${Math.max(3, Math.round((job?.progress ?? 0) * 100))}%` }} />
              </div>
              <p className="small muted">
                {starting || !job
                  ? 'Text wird gerastert, dann schneidet ffmpeg Bild und Ton zusammen …'
                  : 'Bild wird geschnitten, Ton normalisiert, Cover gezogen …'}
              </p>
              {!starting && !job && !exportError ? (
                <button type="button" className="btn btn-primary" onClick={startExport}>
                  <IconZap size={14} /> Export starten
                </button>
              ) : null}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
