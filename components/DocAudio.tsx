'use client';

import { useEffect, useRef, useState } from 'react';
import { IconMusic, IconPause, IconPlay, IconPlus, IconX } from '@/components/icons';
import { formatBytes } from '@/lib/format';
import type { DocumentAudio } from '@/lib/types';

const clock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Demo player for a document. The track list sits in the editor chrome, the
 * actual player is docked to the viewport so it keeps running while you scroll
 * through the lyrics.
 */
export default function DocAudio({
  tracks,
  onAttach,
  onRemove,
  onRename,
}: {
  tracks: DocumentAudio[];
  onAttach: () => void;
  onRemove: (id: number) => void;
  onRename: (id: number, label: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const active = tracks.find((track) => track.id === activeId) ?? null;

  // A detached or deleted track must not keep the dock alive.
  useEffect(() => {
    if (activeId !== null && !tracks.some((track) => track.id === activeId)) {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.removeAttribute('src');
      }
      setActiveId(null);
      setPlaying(false);
    }
  }, [activeId, tracks]);

  useEffect(() => {
    const el = audioRef.current;
    return () => el?.pause();
  }, []);

  const start = (track: DocumentAudio) => {
    const el = audioRef.current;
    if (!el) return;
    const source = new URL(track.media.url, window.location.href).href;
    if (el.src !== source) {
      el.src = track.media.url;
      el.load();
      setCurrent(0);
      setDuration(0);
    }
    setActiveId(track.id);
    void el.play().catch(() => setPlaying(false));
  };

  const toggle = (track: DocumentAudio) => {
    const el = audioRef.current;
    if (!el) return;
    if (activeId !== track.id) {
      start(track);
      return;
    }
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const toggleDock = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const close = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
    }
    setActiveId(null);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = value;
    setCurrent(value);
  };

  const next = () => {
    if (!active) return;
    const index = tracks.findIndex((track) => track.id === active.id);
    const following = tracks[index + 1];
    if (following) start(following);
    else close();
  };

  return (
    <>
      <div className="doc-audio">
        <div className="doc-audio-head">
          <IconMusic size={14} />
          <span className="doc-audio-title">Demos</span>
          {tracks.length ? (
            <span className="doc-audio-count">{tracks.length}</span>
          ) : (
            <span className="doc-audio-hint">Attach an MP3 – it plays while you read the lyrics.</span>
          )}
          <button type="button" className="btn btn-sm btn-ghost doc-audio-attach" onClick={onAttach}>
            <IconPlus size={13} /> Attach audio
          </button>
        </div>

        {tracks.length ? (
          <div className="doc-audio-tracks">
            {tracks.map((track) => {
              const isActive = track.id === activeId;
              return (
                <div key={track.id} className={`doc-audio-track ${isActive ? 'on' : ''}`}>
                  <button
                    type="button"
                    className="doc-audio-play"
                    onClick={() => toggle(track)}
                    aria-label={isActive && playing ? `Pause ${track.label}` : `Play ${track.label}`}
                    title={isActive && playing ? 'Pause' : 'Play'}
                  >
                    {isActive && playing ? <IconPause size={12} /> : <IconPlay size={12} />}
                  </button>
                  <input
                    key={`${track.id}-${track.label}`}
                    className="doc-audio-label"
                    defaultValue={track.label}
                    placeholder="Demo name"
                    aria-label="Demo name"
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value && value !== track.label) onRename(track.id, value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                    }}
                  />
                  <span className="doc-audio-size mono">{formatBytes(track.media.size)}</span>
                  <button
                    type="button"
                    className="doc-audio-remove"
                    onClick={() => onRemove(track.id)}
                    aria-label={`Detach ${track.label}`}
                    title="Detach"
                  >
                    <IconX size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={next}
      />

      {active ? (
        <div className="doc-audio-dock" role="region" aria-label="Demo player">
          <button
            type="button"
            className="doc-audio-dock-play"
            onClick={toggleDock}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
          <div className="doc-audio-dock-main">
            <div className="doc-audio-dock-top">
              <span className="doc-audio-dock-title truncate">{active.label}</span>
              <span className="doc-audio-dock-time mono">
                {clock(current)} / {clock(duration)}
              </span>
            </div>
            <input
              className="doc-audio-seek"
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={Math.min(current, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Seek"
            />
          </div>
          <button type="button" className="doc-audio-dock-close" onClick={close} aria-label="Close player">
            <IconX size={13} />
          </button>
        </div>
      ) : null}
    </>
  );
}
