'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { sectionLabel, shotCoverage, timecode } from '@/lib/videos';
import type { VideoShot } from '@/lib/types';

type Timing = { start: number; duration: number };
type DragMode = 'move' | 'start' | 'end';

type DragState = {
  shot: VideoShot;
  mode: DragMode;
  pointerId: number;
  startX: number;
  width: number;
  origin: Timing;
  moved: boolean;
};

const MIN_DURATION = 0.2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

export default function VideoTimeline({
  peaks,
  duration,
  beats,
  time,
  shots,
  selectedId,
  zoom = 1,
  snap = true,
  onSeek,
  onSelect,
  onTimingChange,
  onOpenShot,
  onAddShot,
}: {
  peaks: number[];
  duration: number;
  beats: number[];
  time: number;
  shots: VideoShot[];
  selectedId: number | null;
  zoom?: number;
  snap?: boolean;
  onSeek: (seconds: number) => void;
  onSelect: (shot: VideoShot) => void;
  onTimingChange: (id: number, start: number, duration: number) => void;
  onOpenShot: (shot: VideoShot) => void;
  onAddShot: (seconds: number) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const scrubRef = useRef<number | null>(null);
  const draftRef = useRef<Record<number, Timing>>({});
  const commitTimer = useRef<number | null>(null);

  const [draft, setDraft] = useState<Record<number, Timing>>({});
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [snapGuide, setSnapGuide] = useState<number | null>(null);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [dragLeft, setDragLeft] = useState(50);

  useEffect(() => {
    const canvas = canvasRef.current;
    const inner = innerRef.current;
    if (!canvas || !inner) return;

    const draw = () => {
      const width = inner.clientWidth;
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
    observer.observe(inner);
    return () => observer.disconnect();
  }, [peaks, duration, beats, time]);

  const ticks = useMemo(() => {
    if (duration <= 0) return [];
    const visible = duration / Math.max(1, zoom);
    const step =
      visible <= 30 ? 2 : visible <= 70 ? 5 : visible <= 180 ? 10 : visible <= 360 ? 20 : 30;
    const values: number[] = [];
    for (let second = 0; second <= duration; second += step) values.push(second);
    return values;
  }, [duration, zoom]);

  const gaps = useMemo(() => shotCoverage(shots, duration).gaps, [shots, duration]);

  /** Overlapping shots get their own row instead of hiding each other. */
  const laneLayout = useMemo(() => {
    const lanes = new Map<number, number>();
    const laneEnds: number[] = [];
    for (const shot of [...shots].sort((a, b) => a.start - b.start || a.position - b.position)) {
      let lane = laneEnds.findIndex((end) => shot.start >= end - 0.05);
      if (lane === -1) {
        if (laneEnds.length < 4) {
          lane = laneEnds.length;
          laneEnds.push(0);
        } else {
          lane = laneEnds.indexOf(Math.min(...laneEnds));
        }
      }
      laneEnds[lane] = shot.start + shot.duration;
      lanes.set(shot.id, lane);
    }
    return { lanes, count: Math.max(1, laneEnds.length) };
  }, [shots]);

  const snapCandidates = useMemo(() => {
    if (duration <= 0) return [] as { time: number; shotId: number | null }[];
    const values: { time: number; shotId: number | null }[] = [
      { time: 0, shotId: null },
      { time: duration, shotId: null },
    ];
    for (const shot of shots) {
      values.push({ time: shot.start, shotId: shot.id }, { time: shot.start + shot.duration, shotId: shot.id });
    }
    // Cuts should land on bars, not every beat – every fourth tracked beat.
    if (beats.length) {
      for (let index = 0; index < beats.length; index += 4) {
        if (beats[index] >= 0 && beats[index] <= duration) {
          values.push({ time: beats[index], shotId: null });
        }
      }
    } else {
      for (let second = 0; second <= duration; second += 1) {
        values.push({ time: second, shotId: null });
      }
    }
    return values;
  }, [shots, duration, beats]);

  const draftTiming = (shot: VideoShot): Timing =>
    draft[shot.id] ?? { start: shot.start, duration: shot.duration };

  const currentTiming = (shot: VideoShot): Timing =>
    draftRef.current[shot.id] ?? { start: shot.start, duration: shot.duration };

  const applyDraft = (id: number, timing: Timing) => {
    const next = { ...draftRef.current, [id]: timing };
    draftRef.current = next;
    setDraft(next);
  };

  const clearDraft = (id: number) => {
    if (!draftRef.current[id]) return;
    const next = { ...draftRef.current };
    delete next[id];
    draftRef.current = next;
    setDraft(next);
  };

  const secondsAt = (clientX: number) => {
    const inner = innerRef.current;
    if (!inner || duration <= 0) return 0;
    const rect = inner.getBoundingClientRect();
    return clamp(((clientX - rect.left) / Math.max(1, rect.width)) * duration, 0, duration);
  };

  const findSnap = (value: number, disabled: boolean, excludeShotId: number) => {
    if (!snap || disabled) return null;
    const inner = innerRef.current;
    if (!inner || duration <= 0) return null;
    const width = inner.clientWidth;
    if (width <= 0) return null;
    const threshold = 6 / (width / duration);
    let best: number | null = null;
    let bestDistance = threshold;
    for (const candidate of snapCandidates) {
      if (candidate.shotId === excludeShotId) continue;
      const distance = Math.abs(candidate.time - value);
      if (distance < bestDistance) {
        best = candidate.time;
        bestDistance = distance;
      }
    }
    return best;
  };

  const timingFromDrag = (event: ReactPointerEvent<HTMLElement>, drag: DragState) => {
    const delta = ((event.clientX - drag.startX) / Math.max(1, drag.width)) * duration;
    const relax = event.shiftKey;

    if (drag.mode === 'move') {
      const rawStart = drag.origin.start + delta;
      const rawEnd = rawStart + drag.origin.duration;
      const snappedStart = findSnap(rawStart, relax, drag.shot.id);
      const snappedEnd = findSnap(rawEnd, relax, drag.shot.id);
      const startDistance = snappedStart == null ? Infinity : Math.abs(snappedStart - rawStart);
      const endDistance = snappedEnd == null ? Infinity : Math.abs(snappedEnd - rawEnd);
      let start = rawStart;
      let guide: number | null = null;
      if (snappedStart != null && startDistance <= endDistance) {
        start = snappedStart;
        guide = snappedStart;
      } else if (snappedEnd != null) {
        start = snappedEnd - drag.origin.duration;
        guide = snappedEnd;
      }
      start = clamp(start, 0, Math.max(0, duration - drag.origin.duration));
      return {
        timing: { start: round(start), duration: round(drag.origin.duration) },
        guide,
      };
    }

    if (drag.mode === 'start') {
      const end = drag.origin.start + drag.origin.duration;
      const raw = drag.origin.start + delta;
      const snapped = findSnap(raw, relax, drag.shot.id);
      const start = clamp(snapped ?? raw, 0, end - MIN_DURATION);
      return { timing: { start: round(start), duration: round(end - start) }, guide: snapped };
    }

    const rawEnd = drag.origin.start + drag.origin.duration + delta;
    const snapped = findSnap(rawEnd, relax, drag.shot.id);
    const end = clamp(snapped ?? rawEnd, drag.origin.start + MIN_DURATION, duration);
    return {
      timing: { start: round(drag.origin.start), duration: round(end - drag.origin.start) },
      guide: snapped,
    };
  };

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    shot: VideoShot,
    mode: DragMode,
    block: HTMLElement | null
  ) => {
    if (event.button !== 0 || duration <= 0) return;
    event.stopPropagation();
    event.preventDefault();
    const inner = innerRef.current;
    if (!inner || !block) return;
    block.focus({ preventScroll: true });
    onSelect(shot);
    dragRef.current = {
      shot,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      width: inner.getBoundingClientRect().width,
      origin: currentTiming(shot),
      moved: false,
    };
    setDraggingId(shot.id);
    block.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < 3) return;
    drag.moved = true;
    const { timing, guide } = timingFromDrag(event, drag);
    applyDraft(drag.shot.id, timing);
    setSnapGuide(guide);
    setDragLeft(((timing.start + timing.duration / 2) / Math.max(0.001, duration)) * 100);
    setDragLabel(
      `${timecode(timing.start)} → ${timecode(timing.start + timing.duration)} · ${timing.duration.toFixed(1)} s`
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    const block = event.currentTarget as HTMLElement;
    if (block.hasPointerCapture?.(event.pointerId)) block.releasePointerCapture(event.pointerId);
    setDraggingId(null);
    setSnapGuide(null);
    setDragLabel(null);
    const timing = draftRef.current[drag.shot.id];
    if (drag.moved && timing) {
      onTimingChange(drag.shot.id, timing.start, timing.duration);
    } else {
      onSeek(drag.shot.start);
    }
    clearDraft(drag.shot.id);
  };

  const beginScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // On touch, a horizontal drag should scroll the zoomed timeline, not scrub.
    if (event.pointerType === 'touch') return;
    if ((event.target as HTMLElement).closest('.video-shot-block')) return;
    scrubRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    onSeek(secondsAt(event.clientX));
  };

  const moveScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrubRef.current !== event.pointerId) return;
    onSeek(secondsAt(event.clientX));
  };

  const endScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrubRef.current !== event.pointerId) return;
    scrubRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.video-shot-block')) return;
    onAddShot(round(secondsAt(event.clientX)));
  };

  const nudge = (event: ReactKeyboardEvent<HTMLButtonElement>, shot: VideoShot) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onOpenShot(shot);
      return;
    }
    const step = event.shiftKey ? 1 : 0.1;
    const current = currentTiming(shot);
    let next: Timing | null = null;
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const end = current.start + current.duration;
      const newEnd = clamp(
        end + (event.key === 'ArrowRight' ? step : -step),
        current.start + MIN_DURATION,
        duration
      );
      next = { start: round(current.start), duration: round(newEnd - current.start) };
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const start = clamp(
        current.start + (event.key === 'ArrowRight' ? step : -step),
        0,
        Math.max(0, duration - current.duration)
      );
      next = { start: round(start), duration: round(current.duration) };
    }
    if (!next) return;
    event.preventDefault();
    applyDraft(shot.id, next);
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    const scheduled = next;
    commitTimer.current = window.setTimeout(() => {
      const pending = draftRef.current[shot.id];
      // A drag started in the meantime – let the drag commit instead.
      if (!pending || pending.start !== scheduled.start || pending.duration !== scheduled.duration) {
        return;
      }
      onTimingChange(shot.id, pending.start, pending.duration);
      clearDraft(shot.id);
    }, 350);
  };

  useEffect(
    () => () => {
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
    },
    []
  );

  // Follow the playhead when it leaves the visible window.
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || duration <= 0) return;
    const x = (clamp(time, 0, duration) / duration) * inner.clientWidth;
    const visibleStart = outer.scrollLeft;
    const visibleEnd = visibleStart + outer.clientWidth;
    if (x < visibleStart + 40 || x > visibleEnd - 40) {
      outer.scrollLeft = Math.max(0, x - outer.clientWidth * 0.35);
    }
  }, [time, duration]);

  // Keep the playhead in the middle when the zoom level changes.
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || duration <= 0) return;
    const frame = window.requestAnimationFrame(() => {
      const x = (clamp(time, 0, duration) / duration) * inner.clientWidth;
      outer.scrollLeft = Math.max(0, x - outer.clientWidth / 2);
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  return (
    <div className="video-timeline" ref={outerRef} role="group" aria-label="Shot timeline">
      <div
        className="video-timeline-inner"
        ref={innerRef}
        style={{ width: `${Math.max(1, zoom) * 100}%` }}
        onPointerDown={beginScrub}
        onPointerMove={moveScrub}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onDoubleClick={handleDoubleClick}
      >
        <canvas ref={canvasRef} className="video-wave-canvas" />

        <div
          className="video-shot-lane"
          style={{ height: 52 + (laneLayout.count - 1) * 40 }}
        >
          {gaps.map((gap, index) => (
            <span
              key={`gap-${index}`}
              className="video-gap"
              style={{
                left: `${(gap.start / Math.max(0.001, duration)) * 100}%`,
                width: `${((gap.end - gap.start) / Math.max(0.001, duration)) * 100}%`,
              }}
              title={`Lücke · ${timecode(gap.start)} → ${timecode(gap.end)}`}
            />
          ))}

          {shots.map((shot, index) => {
            const timing = draftTiming(shot);
            const left = duration > 0 ? (timing.start / duration) * 100 : 0;
            const width = duration > 0 ? (timing.duration / duration) * 100 : 0;
            return (
              <button
                key={shot.id}
                type="button"
                className={`video-shot-block status-${shot.status}${
                  selectedId === shot.id ? ' on' : ''
                }${draggingId === shot.id ? ' dragging' : ''}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 7 + (laneLayout.lanes.get(shot.id) ?? 0) * 40,
                }}
                title={`${timecode(timing.start)} → ${timecode(timing.start + timing.duration)} · ${sectionLabel(
                  shot.section
                )} · ${shot.description}`}
                onPointerDown={(event) => beginDrag(event, shot, 'move', event.currentTarget)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  onOpenShot(shot);
                }}
                onKeyDown={(event) => nudge(event, shot)}
              >
                <span
                  className="video-shot-handle start"
                  aria-hidden="true"
                  onPointerDown={(event) =>
                    beginDrag(event, shot, 'start', event.currentTarget.parentElement as HTMLElement)
                  }
                />
                <span className="mono">{String(index + 1).padStart(2, '0')}</span>
                <span className="video-shot-title">
                  {shot.description || sectionLabel(shot.section)}
                </span>
                <span
                  className="video-shot-handle end"
                  aria-hidden="true"
                  onPointerDown={(event) =>
                    beginDrag(event, shot, 'end', event.currentTarget.parentElement as HTMLElement)
                  }
                />
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

        {snapGuide != null && duration > 0 ? (
          <span
            className="video-snap-guide"
            style={{ left: `${(clamp(snapGuide, 0, duration) / duration) * 100}%` }}
            aria-hidden="true"
          >
            <em>{timecode(snapGuide)}</em>
          </span>
        ) : null}

        {dragLabel ? (
          <span className="video-drag-label" style={{ left: `${dragLeft}%` }} aria-hidden="true">
            {dragLabel}
          </span>
        ) : null}

        <span
          className="video-playhead"
          style={{ left: `${duration > 0 ? (clamp(time, 0, duration) / duration) * 100 : 0}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
