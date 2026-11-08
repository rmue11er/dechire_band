'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  TEXT_SHADOWS,
  fontById,
  shapeClipPath,
  shapeFill,
  textureBackground,
  textureBackgroundSize,
} from '@/lib/design';
import type { DesignElement, ShapeElement, StickerKind, TextElement, TextureElement } from '@/lib/types';

/* ------------------------------------------------------------- Sticker */

const STICKER_PATHS: Record<StickerKind, React.ReactNode> = {
  asterisk: (
    <>
      <path d="M50 10v80M14 30l72 40M86 30 14 70" stroke="currentColor" strokeWidth="12" strokeLinecap="round" fill="none" />
    </>
  ),
  spark: <path d="M50 4l8 38 38 8-38 8-8 38-8-38-38-8 38-8z" fill="currentColor" />,
  bolt: <path d="M58 3 20 56h22l-8 41 40-56H52z" fill="currentColor" />,
  arrow: (
    <>
      <path d="M16 84 82 18" stroke="currentColor" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M82 18H46M82 18v36" stroke="currentColor" strokeWidth="11" strokeLinecap="round" fill="none" />
    </>
  ),
  x: (
    <>
      <path d="M20 20l60 60M80 20 20 80" stroke="currentColor" strokeWidth="12" strokeLinecap="round" fill="none" />
    </>
  ),
  circle: <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="9" fill="none" />,
  brackets: (
    <>
      <path d="M38 16H20v68h18M62 16h18v68H62" stroke="currentColor" strokeWidth="10" fill="none" strokeLinejoin="round" />
    </>
  ),
  dots: (
    <>
      {[20, 50, 80].map((y) =>
        [20, 50, 80].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill="currentColor" />)
      )}
    </>
  ),
  wave: (
    <path
      d="M4 62c12-26 24-26 36 0s24 26 36 0"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      fill="none"
    />
  ),
  heart: (
    <path
      d="M50 86S12 63 12 38a20 20 0 0 1 38-9 20 20 0 0 1 38 9c0 25-38 48-38 48z"
      fill="currentColor"
    />
  ),
};

export function StickerGlyph({ glyph, color }: { glyph: StickerKind; color: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      style={{ color, display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      {STICKER_PATHS[glyph] ?? STICKER_PATHS.asterisk}
    </svg>
  );
}

/* --------------------------------------------------------------- Text */

function textStyle(el: TextElement): CSSProperties {
  return {
    fontFamily: fontById(el.fontFamily).stack,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.italic ? 'italic' : 'normal',
    color: el.color,
    textAlign: el.align,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    textTransform: el.uppercase ? 'uppercase' : 'none',
    textShadow: TEXT_SHADOWS[el.shadow],
    WebkitTextStroke: el.outlineWidth ? `${el.outlineWidth}px ${el.outlineColor}` : undefined,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  };
}

function EditableText({
  value,
  onChange,
  onEnd,
  style,
  el,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnd: () => void;
  style: CSSProperties;
  el: TextElement;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerText = value;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onPointerDown={(event) => event.stopPropagation()}
      onInput={(event) => onChange((event.target as HTMLElement).innerText)}
      onBlur={onEnd}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') (event.target as HTMLElement).blur();
      }}
      style={{
        ...style,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        outline: el.outlineWidth ? 'none' : '1px dashed rgba(185,165,232,.55)',
        cursor: 'text',
        background: el.bgColor !== 'transparent' ? el.bgColor : undefined,
        borderRadius: el.bgColor !== 'transparent' ? el.bgRadius : undefined,
      }}
    />
  );
}

function TextView({
  el,
  editing,
  onTextChange,
  onTextEnd,
}: {
  el: TextElement;
  editing: boolean;
  onTextChange?: (text: string) => void;
  onTextEnd?: () => void;
}) {
  const style = textStyle(el);
  const inner = editing ? (
    <EditableText
      el={el}
      value={el.text}
      style={style}
      onChange={(text) => onTextChange?.(text)}
      onEnd={() => onTextEnd?.()}
    />
  ) : (
    <div
      style={{
        ...style,
        background: el.bgColor !== 'transparent' ? el.bgColor : undefined,
        padding: el.bgColor !== 'transparent' ? el.bgPadding : undefined,
        borderRadius: el.bgColor !== 'transparent' ? el.bgRadius : undefined,
      }}
    >
      {el.text}
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {inner}
    </div>
  );
}

/* -------------------------------------------------------------- Shape */

function ShapeView({ el }: { el: ShapeElement }) {
  const clip = shapeClipPath(el.shape);
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    background: shapeFill(el),
    clipPath: clip,
    borderRadius: el.shape === 'ellipse' ? '50%' : el.shape === 'line' ? 99 : el.radius || undefined,
    boxShadow:
      el.strokeWidth > 0 && el.shape !== 'frame' && el.fillType !== 'none'
        ? `inset 0 0 0 ${el.strokeWidth}px ${el.strokeColor}`
        : el.strokeWidth > 0 && el.shape !== 'frame'
        ? `inset 0 0 0 ${el.strokeWidth}px ${el.strokeColor}`
        : undefined,
    border: el.shape === 'frame' ? `${el.strokeWidth}px solid ${el.strokeColor}` : undefined,
    backgroundImage:
      el.shape === 'tape'
        ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 9px)'
        : undefined,
    overflow: 'hidden',
  };

  if (el.shape === 'frame') {
    return <div style={{ ...style, background: 'transparent' }} />;
  }

  return <div style={style} />;
}

/* ------------------------------------------------------------ Texture */

function TextureView({ el }: { el: TextureElement }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundImage: textureBackground(el.texture, el.color, el.scale),
        backgroundSize: textureBackgroundSize(el.texture, el.scale),
        backgroundRepeat: el.texture === 'grain' ? 'repeat' : el.texture === 'vignette' ? 'no-repeat' : 'repeat',
        backgroundPosition: 'center',
      }}
    />
  );
}

/* -------------------------------------------------------------- Image */

function ImageView({ el }: { el: DesignElement & { type: 'image' } }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        src={el.url}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: el.fit,
          borderRadius: el.radius,
          display: 'block',
          filter: `grayscale(${el.grayscale}%) contrast(${el.contrast}%) brightness(${el.brightness}%) saturate(${el.saturation}%)`,
          pointerEvents: 'none',
        }}
      />
      {el.tintOpacity > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: el.radius,
            background: el.tintColor,
            opacity: el.tintOpacity,
            mixBlendMode: 'color',
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ Content */

export default function ElementContent({
  element,
  editing,
  onTextChange,
  onTextEnd,
}: {
  element: DesignElement;
  editing?: boolean;
  onTextChange?: (text: string) => void;
  onTextEnd?: () => void;
}) {
  if (element.type === 'text') {
    return <TextView el={element} editing={Boolean(editing)} onTextChange={onTextChange} onTextEnd={onTextEnd} />;
  }
  if (element.type === 'shape') return <ShapeView el={element} />;
  if (element.type === 'image') return <ImageView el={element} />;
  if (element.type === 'sticker') return <StickerGlyph glyph={element.glyph} color={element.color} />;
  if (element.type === 'texture') return <TextureView el={element} />;
  return null;
}
