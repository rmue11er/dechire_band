'use client';

import { useEffect, useRef, useState } from 'react';

const WIDTH = 480;
const HEIGHT = 270;
const PAPER = '#f4f1ea';
const INK = '#181614';

/**
 * Small paper-like sketch pad for one storyboard frame.
 * The exported PNG is stored on the shot, so it also survives reloads and print.
 */
export default function ShotSketchPad({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastValueRef = useRef<string | null | undefined>(undefined);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<string[]>([]);
  const baseValueRef = useRef<string | null>(null);
  const paintSeqRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);

  const paint = (data: string | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const paintSeq = ++paintSeqRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (!data) return;
    const image = new Image();
    image.onload = () => {
      if (paintSeq !== paintSeqRef.current) return;
      ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
    };
    image.src = data;
  };

  useEffect(() => {
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    baseValueRef.current = value;
    historyRef.current = [];
    setCanUndo(false);
    paint(value);
  }, [value]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const context = () => {
    const ctx = canvasRef.current?.getContext('2d') ?? null;
    if (!ctx) return null;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  const remember = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    historyRef.current.push(canvas.toDataURL('image/png'));
    if (historyRef.current.length > 20) historyRef.current.shift();
    setCanUndo(true);
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL('image/png');
    lastValueRef.current = data;
    onChange(data);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    paintSeqRef.current += 1;
    remember();
    drawingRef.current = true;
    const point = pointFromEvent(event);
    lastPointRef.current = point;
    const ctx = context();
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const previous = lastPointRef.current ?? point;
    const ctx = context();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    emit();
  };

  const undo = () => {
    const previous = historyRef.current.pop();
    if (previous === undefined) return;
    const next = historyRef.current.length ? previous : baseValueRef.current;
    paint(next);
    lastValueRef.current = next;
    onChange(next);
    setCanUndo(historyRef.current.length > 0);
  };

  const clear = () => {
    remember();
    paint(null);
    lastValueRef.current = null;
    onChange(null);
  };

  return (
    <div className="shot-sketch">
      <canvas
        ref={canvasRef}
        className="shot-sketch-canvas"
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Storyboard frame sketch"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />
      <div className="shot-sketch-actions">
        <span className="small muted">Draw the idea – it appears in the storyboard.</span>
        <div className="row">
          <button type="button" className="btn btn-sm btn-ghost" onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={clear}>
            Leeren
          </button>
        </div>
      </div>
    </div>
  );
}
