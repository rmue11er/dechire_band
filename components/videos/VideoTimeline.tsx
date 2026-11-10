'use client';

import { useEffect, useMemo, useRef } from 'react';
import { sectionLabel, timecode } from '@/lib/videos';
import type { VideoShot } from '@/lib/types';

export default function VideoTimeline({
  peaks,
  duration,
  beats,
  time,
  shots,
  selectedId,
  onSeek,
  onSelect,
}: {
  peaks: number[];
  duration: number;
  beats: number[];
  time: number;
  shots: VideoShot[];
  selectedId: number | null;
  onSeek: (seconds: number) => void;
  onSelect: (shot: VideoShot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const width = wrap.clientWidth;
      const height = 76;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const accent =
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e2e29c';
      const mid = height / 2;

      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(0, mid + 0.5);
      ctx.lineTo(width, mid + 0.5);
      ctx.stroke();

      if (peaks.length && duration > 0) {
        for (let x = 0; x < width; x++) {
          const peak = peaks[Math.min(peaks.length - 1, Math.floor((x / width) * peaks.length))];
          const amplitude = Math.max(0.6, peak * (height / 2 - 5));
          ctx.fillStyle = 'rgba(236,231,247,0.22)';
          ctx.fillRect(x, mid - amplitude, 1, amplitude * 2);
        }
      }

      if (beats.length && duration > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        for (const beat of beats) {
          if (beat < 0 || beat > duration) continue;
          const x = (beat / duration) * width;
          ctx.beginPath();
          ctx.moveTo(x, height - 17);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      if (duration > 0) {
        const x = (Math.min(duration, Math.max(0, time)) / duration) * width;
        ctx.fillStyle = accent;
        ctx.fillRect(x - 1, 0, 2, height);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [peaks, duration, beats, time]);

  const ticks = useMemo(() => {
    if (duration <= 0) return [];
    const step = duration <= 60 ? 5 : duration <= 180 ? 10 : duration <= 360 ? 20 : 30;
    const values: number[] = [];
    for (let second = 0; second <= duration; second += step) values.push(second);
    return values;
  }, [duration]);

  const seekFromEvent = (clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap || duration <= 0) return;
    const rect = wrap.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(fraction * duration);
  };

  return (
    <div
      className="video-timeline"
      ref={wrapRef}
      onPointerDown={(event) => seekFromEvent(event.clientX)}
    >
      <canvas ref={canvasRef} className="video-wave-canvas" />

      <div className="video-shot-lane">
        {shots.map((shot, index) => {
          const left = duration > 0 ? (shot.start / duration) * 100 : 0;
          const width = duration > 0 ? (shot.duration / duration) * 100 : 0;
          return (
            <button
              key={shot.id}
              type="button"
              className={`video-shot-block status-${shot.status}${selectedId === shot.id ? ' on' : ''}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(shot);
                onSeek(shot.start);
              }}
              title={`${timecode(shot.start)} · ${sectionLabel(shot.section)} · ${shot.description}`}
            >
              <span className="mono">{String(index + 1).padStart(2, '0')}</span>
              <span className="truncate">{shot.description || sectionLabel(shot.section)}</span>
            </button>
          );
        })}
      </div>

      <div className="video-time-axis" aria-hidden="true">
        {ticks.map((second) => (
          <span key={second} style={{ left: `${duration > 0 ? (second / duration) * 100 : 0}%` }}>
            {timecode(second)}
          </span>
        ))}
      </div>

      <span
        className="video-playhead"
        style={{ left: `${duration > 0 ? (Math.min(duration, Math.max(0, time)) / duration) * 100 : 0}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
