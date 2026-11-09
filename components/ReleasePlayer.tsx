'use client';

import { useEffect, useRef, useState } from 'react';
import { IconPause, IconPlay } from '@/components/icons';

const clock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** The finished master, playable right at the top of the release. */
export default function ReleasePlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    return () => el?.pause();
  }, []);

  useEffect(() => {
    setCurrent(0);
    setDuration(0);
    setPlaying(false);
  }, [src]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = value;
    setCurrent(value);
  };

  return (
    <div className="release-player">
      <button
        type="button"
        className="release-player-btn"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <IconPause size={15} /> : <IconPlay size={15} />}
      </button>
      <div className="release-player-main">
        <div className="release-player-top">
          <span className="release-player-title truncate">{title}</span>
          <span className="release-player-time mono">
            {clock(current)} / {clock(duration)}
          </span>
        </div>
        <input
          className="release-player-seek"
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(current, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Seek"
        />
      </div>
      <span className="release-player-badge mono">Master</span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />
    </div>
  );
}
