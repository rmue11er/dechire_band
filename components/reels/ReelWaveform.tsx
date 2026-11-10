'use client';

import { useEffect, useRef } from 'react';

/** Waveform strip with selection, beat ticks and a playhead – canvas, no library. */
export function ReelWaveform({
  peaks,
  duration,
  start,
  length,
  beats,
  playhead,
  onPick,
}: {
  peaks: number[];
  duration: number;
  /** selection start in seconds of the track */
  start: number;
  /** selection length in seconds */
  length: number;
  beats: number[];
  /** reel-relative playhead in seconds (null when stopped) */
  playhead: number | null;
  onPick: (start: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e2e29c';

      // selection band
      const from = duration > 0 ? (start / duration) * width : 0;
      const to = duration > 0 ? (Math.min(duration, start + length) / duration) * width : 0;
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.11)';
      ctx.fillRect(from, 0, Math.max(1, to - from), height);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(from + 0.5, 0.5, Math.max(1, to - from - 1), height - 1);

      // waveform
      const count = peaks.length;
      if (count) {
        const mid = height / 2;
        for (let x = 0; x < width; x++) {
          const peak = peaks[Math.min(count - 1, Math.floor((x / width) * count))];
          const amplitude = Math.max(0.6, peak * (height / 2 - 3));
          const inSelection = x >= from && x <= to;
          ctx.fillStyle = inSelection ? accent : 'rgba(236,231,247,0.22)';
          ctx.fillRect(x, mid - amplitude, 1, amplitude * 2);
        }
      }

      // beats
      if (beats.length && duration > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        for (const beat of beats) {
          if (beat < start || beat > start + length) continue;
          const x = (beat / duration) * width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      // playhead (reel-relative → track position)
      if (playhead != null && duration > 0) {
        const x = ((start + Math.max(0, Math.min(length, playhead))) / duration) * width;
        ctx.fillStyle = accent;
        ctx.fillRect(x - 1, 0, 2, height);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [peaks, duration, start, length, beats, playhead]);

  const pick = (clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap || duration <= 0) return;
    const rect = wrap.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const wanted = fraction * duration;
    onPick(Math.max(0, Math.min(duration - length, wanted - length / 2)));
  };

  return (
    <div
      className="reel-wave"
      ref={wrapRef}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        pick(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) pick(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
