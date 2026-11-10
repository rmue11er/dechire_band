import type {
  DesignBackground,
  DesignElement,
  ImageElement,
  ShapeElement,
  ShapeKind,
  StickerElement,
  StickerKind,
  TextElement,
  TextureElement,
  TextureKind,
} from './types';

/* ------------------------------------------------------------- Formats */

export interface FormatPreset {
  id: string;
  label: string;
  hint: string;
  width: number;
  height: number;
}

/** Short “10 NOV” label for a date relative to today (templates stay in sync with the demo posts). */
const dayLabel = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })
    .format(d)
    .replace(/\s+/g, ' ')
    .toUpperCase();
};

export const FORMATS: FormatPreset[] = [
  { id: 'square', label: 'Feed 1:1', hint: '1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Feed 4:5', hint: '1080 × 1350', width: 1080, height: 1350 },
  { id: 'story', label: 'Story 9:16', hint: '1080 × 1920', width: 1080, height: 1920 },
];

export const DEFAULT_BACKGROUND: DesignBackground = {
  type: 'gradient',
  color: '#0a0910',
  from: '#141020',
  to: '#050409',
  angle: 160,
};

/* ----------------------------------------------------------- Farbwelten */

/* -------------------------------------------------------------- Fonts */

export interface FontOption {
  id: string;
  label: string;
  stack: string;
  weights: number[];
  mood: string;
}

export const FONTS: FontOption[] = [
  {
    id: 'instrument',
    label: 'Instrument Serif',
    stack: "'Instrument Serif', 'Times New Roman', serif",
    weights: [400],
    mood: 'Voice',
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: "'Inter', system-ui, sans-serif",
    weights: [400, 600, 800],
    mood: 'Body',
  },
  {
    id: 'space',
    label: 'Space Mono',
    stack: "'Space Mono', ui-monospace, monospace",
    weights: [400, 700],
    mood: 'Meta',
  },
];

/**
 * Self-hosted Google Fonts are registered at runtime (see the studio), so the
 * canvas and the inspector can resolve them like the built-in ones.
 */
let runtimeFonts: FontOption[] = [];
let merged: FontOption[] = FONTS;
const fontListeners = new Set<() => void>();

export function registerFonts(list: FontOption[]) {
  runtimeFonts = Array.isArray(list) ? list : [];
  merged = runtimeFonts.length ? [...FONTS, ...runtimeFonts] : FONTS;
  fontListeners.forEach((listener) => listener());
}

export function subscribeFonts(listener: () => void) {
  fontListeners.add(listener);
  return () => {
    fontListeners.delete(listener);
  };
}

/** Stable reference – safe as a `useSyncExternalStore` snapshot. */
export const allFonts = () => merged;

const fontStack = (id: string) => merged.find((font) => font.id === id) ?? FONTS[0];

export const fontById = (id: string) => fontStack(id);

export const TEXT_SHADOWS: Record<TextElement['shadow'], string> = {
  none: 'none',
  soft: '0 10px 34px rgba(0, 0, 0, 0.6)',
  glow: '0 0 46px rgba(184, 122, 99, 0.55)',
  hard: '7px 7px 0 rgba(0, 0, 0, 0.9)',
  echo: '5px 5px 0 #6e3b2c',
};

/* ------------------------------------------------------------- Text-Sets */

export interface TextPreset {
  id: string;
  label: string;
  sample: string;
  patch: Partial<TextElement>;
}

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: 'display',
    label: 'Display',
    sample: 'FRACTURE',
    patch: {
      fontFamily: 'instrument',
      fontSize: 190,
      fontWeight: 400,
      uppercase: true,
      letterSpacing: -4,
      lineHeight: 0.86,
      color: '#efe7da',
    },
  },
  {
    id: 'headline',
    label: 'Headline',
    sample: 'new single',
    patch: {
      fontFamily: 'inter',
      fontSize: 140,
      fontWeight: 600,
      uppercase: true,
      letterSpacing: 2,
      lineHeight: 0.95,
      color: '#efe7da',
    },
  },
  {
    id: 'subhead',
    label: 'Subline',
    sample: 'AUGSBURG',
    patch: {
      fontFamily: 'space',
      fontSize: 64,
      fontWeight: 400,
      uppercase: false,
      letterSpacing: 6,
      lineHeight: 1.2,
      color: '#b9a5e8',
    },
  },
  {
    id: 'quote',
    label: 'Quote',
    sample: '“dark, but not lost.”',
    patch: {
      fontFamily: 'instrument',
      fontSize: 76,
      fontWeight: 400,
      italic: true,
      uppercase: false,
      letterSpacing: 0,
      lineHeight: 1.22,
      color: '#efe7da',
      align: 'center',
    },
  },
  {
    id: 'body',
    label: 'Body',
    sample: 'a line that stays.',
    patch: {
      fontFamily: 'inter',
      fontSize: 36,
      fontWeight: 400,
      uppercase: false,
      letterSpacing: 0,
      lineHeight: 1.45,
      color: '#efe7da',
    },
  },
  {
    id: 'mono',
    label: 'Mono / Label',
    sample: 'déchire /// AUGSBURG',
    patch: {
      fontFamily: 'space',
      fontSize: 28,
      fontWeight: 400,
      uppercase: false,
      letterSpacing: 10,
      lineHeight: 1.3,
      color: '#b9a5e8',
    },
  },
  {
    id: 'whisper',
    label: 'Whisper',
    sample: 'i still hear it',
    patch: {
      fontFamily: 'instrument',
      fontSize: 96,
      fontWeight: 400,
      italic: true,
      uppercase: false,
      letterSpacing: -1,
      lineHeight: 1.05,
      color: '#efe7da',
    },
  },
  {
    id: 'elegy',
    label: 'Elegy',
    sample: 'not lost',
    patch: {
      fontFamily: 'instrument',
      fontSize: 104,
      fontWeight: 400,
      uppercase: false,
      letterSpacing: -2,
      lineHeight: 0.98,
      color: '#efe7da',
    },
  },
  {
    id: 'machine',
    label: 'Type',
    sample: 'demo — take 03',
    patch: {
      fontFamily: 'space',
      fontSize: 34,
      fontWeight: 400,
      uppercase: false,
      letterSpacing: 1,
      lineHeight: 1.5,
      color: '#efe7da',
    },
  },
  {
    id: 'diary',
    label: 'Diary',
    sample: 'this one hurt',
    patch: {
      fontFamily: 'instrument',
      fontSize: 72,
      fontWeight: 400,
      italic: true,
      uppercase: false,
      letterSpacing: 0,
      lineHeight: 1.1,
      color: '#efe7da',
    },
  },
  {
    id: 'capsnarrow',
    label: 'Tight caps',
    sample: 'DON’T LOOK AWAY',
    patch: {
      fontFamily: 'inter',
      fontSize: 62,
      fontWeight: 700,
      uppercase: true,
      letterSpacing: 1,
      lineHeight: 1.0,
      color: '#efe7da',
    },
  },
];

/* --------------------------------------------------------------- Shapes */

export const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'ellipse', label: 'Circle' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'star', label: 'Star' },
  { id: 'burst', label: 'Burst' },
  { id: 'cross', label: 'Cross' },
  { id: 'slash', label: 'Slash' },
  { id: 'line', label: 'Line' },
  { id: 'frame', label: 'Frame' },
  { id: 'tape', label: 'Tape' },
];

function polygon(points: [number, number][]) {
  return `polygon(${points.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ')})`;
}

function starPoints(spikes = 5, inner = 0.42): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? 50 : 50 * inner;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    points.push([50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)]);
  }
  return points;
}

function burstPoints(spikes = 18): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const wobble = 0.56 + ((i * 37) % 13) / 42;
    const radius = i % 2 === 0 ? 50 : 50 * wobble;
    const angle = (Math.PI / spikes) * i;
    points.push([50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)]);
  }
  return points;
}

export function shapeClipPath(shape: ShapeKind): string | undefined {
  switch (shape) {
    case 'triangle':
      return polygon([
        [50, 0],
        [100, 100],
        [0, 100],
      ]);
    case 'diamond':
      return polygon([
        [50, 0],
        [100, 50],
        [50, 100],
        [0, 50],
      ]);
    case 'star':
      return polygon(starPoints(5, 0.42));
    case 'burst':
      return polygon(burstPoints(18));
    case 'cross':
      return polygon([
        [30, 0],
        [50, 20],
        [70, 0],
        [100, 30],
        [80, 50],
        [100, 70],
        [70, 100],
        [50, 80],
        [30, 100],
        [0, 70],
        [20, 50],
        [0, 30],
      ]);
    case 'slash':
      return polygon([
        [0, 100],
        [100, 0],
        [100, 16],
        [16, 100],
      ]);
    default:
      return undefined;
  }
}

/* ------------------------------------------------------------ Stickers */

export const STICKERS: { id: StickerKind; label: string }[] = [
  { id: 'asterisk', label: 'Asterisk' },
  { id: 'spark', label: 'Spark' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'x', label: 'X' },
  { id: 'circle', label: 'Circle' },
  { id: 'brackets', label: 'Brackets' },
  { id: 'dots', label: 'Dots' },
  { id: 'wave', label: 'Wave' },
  { id: 'heart', label: 'Heart' },
];

/* ----------------------------------------------------------- Texturen */

export const TEXTURES: { id: TextureKind; label: string }[] = [
  { id: 'grain', label: 'Grain' },
  { id: 'halftone', label: 'Halftone' },
  { id: 'scanlines', label: 'Scanlines' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'grid', label: 'Grid' },
  { id: 'vignette', label: 'Vignette' },
];

export const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'hard-light',
  'difference',
  'lighten',
  'darken',
] as const;

/* ------------------------------------------------------------ Helpers */

const counters = new Map<string, number>();
export function uid(prefix = 'el') {
  const next = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, next);
  return `${prefix}-${Date.now().toString(36)}-${next}`;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function backgroundCss(background: DesignBackground): string {
  if (background.type === 'gradient') {
    return `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`;
  }
  return background.color;
}

export function shapeFill(el: ShapeElement): string {
  if (el.fillType === 'none') return 'transparent';
  if (el.fillType === 'gradient') {
    return `linear-gradient(${el.gradientAngle}deg, ${el.gradientFrom}, ${el.gradientTo})`;
  }
  return el.fill;
}

export function textureBackground(texture: TextureKind, color: string, scale: number): string {
  switch (texture) {
    case 'grain':
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E\")";
    case 'halftone':
      return `radial-gradient(${color} 1.4px, transparent 1.5px)`;
    case 'scanlines':
      return `repeating-linear-gradient(0deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${Math.max(3, scale)}px)`;
    case 'stripes':
      return `repeating-linear-gradient(45deg, ${color} 0px, ${color} ${Math.max(2, scale / 2)}px, transparent ${
        Math.max(2, scale / 2)
      }px, transparent ${Math.max(6, scale)}px)`;
    case 'grid':
      return `repeating-linear-gradient(0deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${Math.max(
        6,
        scale
      )}px), repeating-linear-gradient(90deg, ${color} 0px, ${color} 1px, transparent 1px, transparent ${Math.max(
        6,
        scale
      )}px)`;
    case 'vignette':
      return `radial-gradient(ellipse at center, transparent 40%, ${color} 100%)`;
    default:
      return 'none';
  }
}

export function textureBackgroundSize(texture: TextureKind, scale: number): string {
  if (texture === 'halftone') return `${Math.max(6, scale)}px ${Math.max(6, scale)}px`;
  if (texture === 'grain') return '220px 220px';
  return 'auto';
}

/* ----------------------------------------------------------- Factories */

interface Box {
  width: number;
  height: number;
}

const baseElement = (overrides: Partial<DesignElement> & { type: DesignElement['type'] }) =>
  ({
    id: uid(overrides.type),
    name: 'Element',
    x: 0,
    y: 0,
    w: 300,
    h: 300,
    rotation: 0,
    opacity: 1,
    blendMode: 'normal',
    locked: false,
    hidden: false,
    ...overrides,
  }) as DesignElement;

export function createText(box: Box, preset: TextPreset, overrides: Partial<TextElement> = {}): TextElement {
  const scale = box.width / 1080;
  const fontSize = Math.round((preset.patch.fontSize ?? 64) * scale);
  const width = Math.round(box.width * (preset.id === 'quote' ? 0.78 : 0.84));
  const lineHeight = preset.patch.lineHeight ?? 1.2;
  const lines = preset.id === 'display' ? 1 : 2;
  const height = Math.round(fontSize * lineHeight * lines + 24);
  return baseElement({
    type: 'text',
    name: preset.label,
    x: Math.round((box.width - width) / 2),
    y: Math.round((box.height - height) / 2),
    w: width,
    h: height,
    text: preset.sample,
    fontFamily: 'instrument',
    fontSize,
    fontWeight: 400,
    italic: false,
    uppercase: false,
    color: '#efe7da',
    align: 'left',
    lineHeight,
    letterSpacing: 0,
    outlineWidth: 0,
    outlineColor: '#06060a',
    shadow: 'none',
    bgColor: 'transparent',
    bgPadding: 24,
    bgRadius: 8,
    ...preset.patch,
    ...overrides,
  }) as TextElement;
}

export function createShape(box: Box, shape: ShapeKind): ShapeElement {
  const unit = Math.min(box.width, box.height);
  const isLine = shape === 'line';
  const size = Math.round(unit * (shape === 'frame' ? 0.82 : 0.32));
  const w = isLine ? Math.round(box.width * 0.5) : size;
  const h = isLine ? Math.round(unit * 0.008) : shape === 'tape' ? Math.round(unit * 0.11) : size;
  return baseElement({
    type: 'shape',
    name: SHAPES.find((item) => item.id === shape)?.label ?? 'Form',
    x: Math.round((box.width - w) / 2),
    y: Math.round((box.height - h) / 2),
    w,
    h,
    shape,
    fillType: shape === 'frame' ? 'none' : 'solid',
    fill: '#b9a5e8',
    gradientFrom: '#b9a5e8',
    gradientTo: '#6b54a6',
    gradientAngle: 135,
    strokeColor: '#b9a5e8',
    strokeWidth: shape === 'frame' ? 3 : 0,
    radius: shape === 'rect' ? 24 : 0,
    rotation: shape === 'tape' ? -4 : 0,
    opacity: shape === 'tape' ? 0.9 : 1,
  }) as ShapeElement;
}

export function createImage(
  box: Box,
  media: { url: string; id: number; width: number | null; height: number | null },
  overrides: Partial<ImageElement> = {}
): ImageElement {
  const ratio = media.width && media.height ? media.width / media.height : 1;
  let w = Math.round(box.width * 0.8);
  let h = Math.round(w / ratio);
  if (h > box.height * 0.8) {
    h = Math.round(box.height * 0.8);
    w = Math.round(h * ratio);
  }
  return baseElement({
    type: 'image',
    name: 'Bild',
    x: Math.round((box.width - w) / 2),
    y: Math.round((box.height - h) / 2),
    w,
    h,
    url: media.url,
    mediaId: media.id,
    fit: 'cover',
    radius: 0,
    grayscale: 0,
    contrast: 100,
    brightness: 100,
    saturation: 100,
    tintColor: '#b9a5e8',
    tintOpacity: 0,
    ...overrides,
  }) as ImageElement;
}

export function createSticker(box: Box, glyph: StickerKind, color = '#b9a5e8'): StickerElement {
  const size = Math.round(Math.min(box.width, box.height) * 0.18);
  return baseElement({
    type: 'sticker',
    name: STICKERS.find((item) => item.id === glyph)?.label ?? 'Sticker',
    x: Math.round((box.width - size) / 2),
    y: Math.round((box.height - size) / 2),
    w: size,
    h: size,
    glyph,
    color,
  }) as StickerElement;
}

export function createTexture(box: Box, texture: TextureKind, overrides: Partial<TextureElement> = {}): TextureElement {
  return baseElement({
    type: 'texture',
    name: TEXTURES.find((item) => item.id === texture)?.label ?? 'Textur',
    x: 0,
    y: 0,
    w: box.width,
    h: box.height,
    texture,
    color: texture === 'grain' ? '#ffffff' : '#b9a5e8',
    scale: 14,
    opacity: texture === 'grain' ? 0.22 : 0.3,
    blendMode: texture === 'grain' ? 'overlay' : 'normal',
    ...overrides,
  }) as TextureElement;
}

/* ------------------------------------------------------------ Vorlagen */

export interface Template {
  id: string;
  name: string;
  tag: string;
  width: number;
  height: number;
  build: (media?: { url: string; id: number; width: number | null; height: number | null } | null) => {
    background: DesignBackground;
    elements: DesignElement[];
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 'release',
    name: 'Release',
    tag: 'Single / Album',
    width: 1080,
    height: 1350,
    build: () => {
      return {
        background: { type: 'gradient', color: '#080808', from: '#121111', to: '#1a1817', angle: 165 },
        elements: [
          createTexture({ width: 1080, height: 1350 }, 'grain', { opacity: 0.34 }),
          createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
            text: `new single /// ${dayLabel(5)}`,
            x: 72,
            y: 92,
            w: 760,
            h: 54,
            fontSize: 26,
            letterSpacing: 9,
            color: '#b9a5e8',
          }),
          baseElement({
            type: 'shape',
            shape: 'rect',
            name: 'Akzentlinie',
            x: 72,
            y: 168,
            w: 130,
            h: 6,
            fillType: 'solid',
            fill: '#b9a5e8',
            gradientFrom: '#b9a5e8',
            gradientTo: '#6b54a6',
            gradientAngle: 90,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
          }) as ShapeElement,
          createText({ width: 1080, height: 1350 }, TEXT_PRESETS[6], {
            text: 'fracture',
            x: 76,
            y: 700,
            w: 930,
            h: 420,
            fontSize: 250,
            lineHeight: 0.92,
            letterSpacing: -6,
            color: '#efe7da',
          }),
          createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
            text: 'déchire · post-hardcore · augsburg',
            x: 72,
            y: 1238,
            w: 860,
            h: 40,
            fontSize: 22,
            letterSpacing: 5,
            color: 'rgba(239,231,218,0.55)',
          }),
        ],
      };
    },
  },
  {
    id: 'show',
    name: 'Show',
    tag: 'Live',
    width: 1080,
    height: 1350,
    build: () => ({
      background: { type: 'solid', color: '#080808', from: '#141312', to: '#050505', angle: 160 },
      elements: [
        createTexture({ width: 1080, height: 1350 }, 'grain', { opacity: 0.3 }),
        baseElement({
          type: 'shape',
          shape: 'frame',
          name: 'Frame',
          x: 44,
          y: 44,
          w: 992,
          h: 1262,
          fillType: 'none',
          fill: 'transparent',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: 'rgba(185,165,232,0.3)',
          strokeWidth: 1,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'live /// kantine augsburg',
          x: 80,
          y: 100,
          w: 920,
          h: 44,
          align: 'center',
          fontSize: 22,
          letterSpacing: 5,
          color: '#cfc2ea',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[0], {
          text: dayLabel(2),
          x: 60,
          y: 400,
          w: 960,
          h: 320,
          align: 'center',
          fontSize: 250,
          lineHeight: 0.9,
          letterSpacing: -3,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[0], {
          text: 'AUGSBURG',
          x: 60,
          y: 742,
          w: 960,
          h: 240,
          align: 'center',
          fontSize: 132,
          lineHeight: 0.95,
          letterSpacing: 6,
          color: '#b9a5e8',
        }),
        baseElement({
          type: 'shape',
          shape: 'line',
          name: 'Rule',
          x: 340,
          y: 1032,
          w: 400,
          h: 1,
          fillType: 'solid',
          fill: 'rgba(239,231,218,0.25)',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'tickets: déchire.band',
          x: 60,
          y: 1084,
          w: 960,
          h: 44,
          align: 'center',
          fontSize: 22,
          letterSpacing: 4,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'doors 20:15 · show 21:00',
          x: 60,
          y: 1146,
          w: 960,
          h: 36,
          align: 'center',
          fontSize: 18,
          letterSpacing: 3,
          color: 'rgba(239,231,218,0.4)',
        }),
      ],
    }),
  },
  {
    id: 'lyrics',
    name: 'Quote',
    tag: 'Lyric',
    width: 1080,
    height: 1080,
    build: () => ({
      background: { type: 'solid', color: '#080808', from: '#141312', to: '#050505', angle: 160 },
      elements: [
        createTexture({ width: 1080, height: 1080 }, 'grain', { opacity: 0.24 }),
        baseElement({
          type: 'shape',
          shape: 'line',
          name: 'Linie oben',
          x: 380,
          y: 236,
          w: 320,
          h: 2,
          fillType: 'solid',
          fill: '#b9a5e8',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[3], {
          text: '“I sharpened the edges\nuntil nothing could be saved.\nMaybe that was the plan.”',
          x: 130,
          y: 300,
          w: 820,
          h: 460,
          fontSize: 70,
          lineHeight: 1.26,
        }),
        baseElement({
          type: 'shape',
          shape: 'line',
          name: 'Linie unten',
          x: 380,
          y: 792,
          w: 320,
          h: 2,
          fillType: 'solid',
          fill: '#b9a5e8',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[5], {
          text: 'fracture /// déchire',
          x: 80,
          y: 852,
          w: 920,
          h: 40,
          align: 'center',
          fontSize: 22,
          letterSpacing: 7,
          color: 'rgba(239,231,218,0.55)',
        }),
        createTexture({ width: 1080, height: 1080 }, 'vignette', {
          color: 'rgba(6,6,10,0.85)',
          opacity: 0.7,
          blendMode: 'multiply',
        }),
      ],
    }),
  },
  {
    id: 'merch',
    name: 'Merch',
    tag: 'Merch',
    width: 1080,
    height: 1080,
    build: () => ({
      background: { type: 'solid', color: '#080808', from: '#141312', to: '#050505', angle: 135 },
      elements: [
        createTexture({ width: 1080, height: 1080 }, 'grain', {
          opacity: 0.34,
          blendMode: 'multiply',
          color: '#000000',
        }),
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[5], {
          text: '50 pieces · no repress',
          x: 72,
          y: 84,
          w: 900,
          h: 40,
          fontSize: 20,
          letterSpacing: 4,
          color: 'rgba(239,231,218,0.6)',
        }),
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[0], {
          text: 'merch',
          x: 64,
          y: 380,
          w: 960,
          h: 320,
          fontSize: 300,
          lineHeight: 0.9,
          letterSpacing: -4,
          uppercase: false,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[5], {
          text: 'déchire.band/shop',
          x: 72,
          y: 918,
          w: 700,
          h: 40,
          fontSize: 22,
          letterSpacing: 3,
          color: '#b9a5e8',
        }),
      ],
    }),
  },
  {
    id: 'story',
    name: 'Story',
    tag: '9:16',
    width: 1080,
    height: 1920,
    build: () => ({
      background: { type: 'gradient', color: '#080808', from: '#121111', to: '#1a1817', angle: 200 },
      elements: [
        createTexture({ width: 1080, height: 1920 }, 'grain', { opacity: 0.3 }),
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[5], {
          text: `${dayLabel(5)} /// 00:01`,
          x: 80,
          y: 300,
          w: 920,
          h: 44,
          align: 'center',
          fontSize: 24,
          letterSpacing: 10,
          color: '#cfc2ea',
        }),
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[0], {
          text: 'out\nnow',
          x: 60,
          y: 700,
          w: 960,
          h: 560,
          align: 'center',
          fontSize: 220,
          lineHeight: 0.9,
          letterSpacing: -3,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[6], {
          text: 'fracture',
          x: 60,
          y: 1400,
          w: 960,
          h: 130,
          align: 'center',
          fontSize: 96,
          letterSpacing: 1,
          color: '#b9a5e8',
        }),
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[5], {
          text: 'everywhere you listen',
          x: 60,
          y: 1620,
          w: 960,
          h: 40,
          align: 'center',
          fontSize: 20,
          letterSpacing: 3,
          color: 'rgba(239,231,218,0.45)',
        }),
      ],
    }),
  },
  {
    id: 'statement',
    name: 'Statement',
    tag: 'Type',
    width: 1080,
    height: 1350,
    build: () => ({
      background: { type: 'solid', color: '#080808', from: '#141312', to: '#050505', angle: 160 },
      elements: [
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'tour 2026 /// déchire',
          x: 80,
          y: 120,
          w: 920,
          h: 40,
          fontSize: 20,
          letterSpacing: 4,
          color: 'rgba(239,231,218,0.45)',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[7], {
          text: 'no\nlight',
          x: 72,
          y: 380,
          w: 960,
          h: 560,
          fontSize: 220,
          lineHeight: 0.9,
          letterSpacing: -4,
          color: '#efe7da',
        }),
        baseElement({
          type: 'shape',
          shape: 'rect',
          name: 'Akzent',
          x: 80,
          y: 332,
          w: 260,
          h: 12,
          fillType: 'solid',
          fill: '#b9a5e8',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: `augsburg · ${dayLabel(2)} · munich · ${dayLabel(9)}`,
          x: 80,
          y: 1180,
          w: 920,
          h: 40,
          fontSize: 19,
          letterSpacing: 2,
          color: 'rgba(239,231,218,0.4)',
        }),
      ],
    }),
  },
  {
    id: 'photo',
    name: 'Portrait',
    tag: 'Photo + type',
    width: 1080,
    height: 1350,
    build: (media) => {
      const elements: DesignElement[] = [];
      if (media) {
        elements.push(
          createImage({ width: 1080, height: 1350 }, media, {
            x: 0,
            y: 0,
            w: 1080,
            h: 1350,
            grayscale: 22,
            contrast: 106,
            brightness: 90,
            saturation: 72,
            radius: 0,
          })
        );
      } else {
        elements.push(
          baseElement({
            type: 'shape',
            shape: 'frame',
            name: 'Bildrahmen',
            x: 60,
            y: 60,
            w: 960,
            h: 1230,
            fillType: 'none',
            fill: 'transparent',
            gradientFrom: '#b9a5e8',
            gradientTo: '#6b54a6',
            gradientAngle: 90,
            strokeColor: 'rgba(185,165,232,0.4)',
            strokeWidth: 2,
            radius: 0,
          }) as ShapeElement
        );
      }
      elements.push(
        baseElement({
          type: 'shape',
          shape: 'rect',
          name: 'Verlauf',
          x: 0,
          y: 520,
          w: 1080,
          h: 830,
          fillType: 'gradient',
          fill: 'transparent',
          gradientFrom: 'rgba(6,6,10,0)',
          gradientTo: 'rgba(5,4,3,0.96)',
          gradientAngle: 180,
          strokeColor: '#06060a',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[6], {
          text: 'déchire',
          x: 64,
          y: 1000,
          w: 960,
          h: 240,
          fontSize: 210,
          lineHeight: 0.92,
          letterSpacing: 0,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'post-hardcore /// augsburg',
          x: 72,
          y: 1240,
          w: 920,
          h: 36,
          fontSize: 20,
          letterSpacing: 7,
          color: 'rgba(239,231,218,0.55)',
        })
      );
      return {
        background: { type: 'solid', color: '#080808', from: '#141312', to: '#050505', angle: 160 },
        elements,
      };
    },
  },
  {
    id: 'close',
    name: 'Close',
    tag: 'Photo / quiet',
    width: 1080,
    height: 1350,
    build: (media) => {
      const box = { width: 1080, height: 1350 };
      const elements: DesignElement[] = [];
      if (media) {
        elements.push(
          createImage(box, media, {
            x: 0,
            y: 0,
            w: 1080,
            h: 1350,
            fit: 'cover',
            grayscale: 42,
            contrast: 112,
            brightness: 88,
            saturation: 78,
          })
        );
      } else {
        elements.push(
          baseElement({
            type: 'shape',
            shape: 'rect',
            name: 'Fläche',
            x: 0,
            y: 0,
            w: 1080,
            h: 1350,
            fillType: 'gradient',
            fill: '#b9a5e8',
            gradientFrom: '#2a201b',
            gradientTo: '#080605',
            gradientAngle: 160,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
          }) as ShapeElement
        );
      }
      elements.push(
        baseElement({
          type: 'shape',
          shape: 'rect',
          name: 'Verlauf',
          x: 0,
          y: 560,
          w: 1080,
          h: 790,
          fillType: 'gradient',
          fill: 'transparent',
          gradientFrom: 'rgba(4,3,2,0)',
          gradientTo: 'rgba(4,3,2,0.96)',
          gradientAngle: 180,
          strokeColor: '#06050a',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createTexture(box, 'grain', { opacity: 0.24 }),
        createText(box, TEXT_PRESETS[8], {
          text: 'déchire /// fracture',
          x: 64,
          y: 104,
          w: 720,
          h: 40,
          fontSize: 22,
          letterSpacing: 4,
          color: 'rgba(239,231,218,0.55)',
        }),
        createText(box, TEXT_PRESETS[6], {
          text: 'hold\non',
          x: 56,
          y: 812,
          w: 940,
          h: 340,
          fontSize: 180,
          lineHeight: 0.98,
          letterSpacing: -3,
          color: '#efe7da',
        }),
        baseElement({
          type: 'shape',
          shape: 'line',
          name: 'Linie',
          x: 64,
          y: 1196,
          w: 92,
          h: 3,
          fillType: 'solid',
          fill: '#b9a5e8',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText(box, TEXT_PRESETS[5], {
          text: `fracture · ${dayLabel(5)}`,
          x: 64,
          y: 1232,
          w: 720,
          h: 36,
          fontSize: 20,
          letterSpacing: 4,
          color: '#b9a5e8',
        })
      );
      return {
        background: { type: 'solid', color: '#080808', from: '#141312', to: '#050505', angle: 160 },
        elements,
      };
    },
  },
  {
    id: 'diary',
    name: 'Note',
    tag: 'Late',
    width: 1080,
    height: 1080,
    build: () => {
      const box = { width: 1080, height: 1080 };
      return {
        background: { type: 'gradient', color: '#080808', from: '#121111', to: '#050505', angle: 150 },
        elements: [
          createTexture(box, 'grain', { opacity: 0.32 }),
          createText(box, TEXT_PRESETS[8], {
            text: 'note 004 — 03:41',
            x: 96,
            y: 128,
            w: 700,
            h: 40,
            fontSize: 20,
            letterSpacing: 3,
            color: 'rgba(239,231,218,0.4)',
          }),
          createText(box, TEXT_PRESETS[9], {
            text: 'the room is quiet.\ni leave the light off.\nit helps.',
            x: 92,
            y: 300,
            w: 900,
            h: 460,
            fontSize: 76,
            lineHeight: 1.24,
            color: '#efe7da',
          }),
          baseElement({
            type: 'shape',
            shape: 'line',
            name: 'Linie',
            x: 96,
            y: 812,
            w: 68,
            h: 3,
            fillType: 'solid',
            fill: '#b9a5e8',
            gradientFrom: '#b9a5e8',
            gradientTo: '#6b54a6',
            gradientAngle: 90,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
          }) as ShapeElement,
          createText(box, TEXT_PRESETS[10], {
            text: 'déchire /// fracture',
            x: 96,
            y: 852,
            w: 760,
            h: 60,
            fontSize: 28,
            letterSpacing: 2,
            uppercase: false,
            color: 'rgba(239,231,218,0.55)',
          }),
        ],
      };
    },
  },
  {
    id: 'elegy',
    name: 'Elegy',
    tag: 'Lyric / quiet',
    width: 1080,
    height: 1350,
    build: () => {
      const box = { width: 1080, height: 1350 };
      return {
        background: { type: 'gradient', color: '#050505', from: '#080808', to: '#030303', angle: 180 },
        elements: [
          createTexture(box, 'grain', { opacity: 0.26 }),
          createTexture(box, 'vignette', { color: 'rgba(2,2,4,0.9)', opacity: 0.8 }),
          baseElement({
            type: 'shape',
            shape: 'line',
            name: 'Linie oben',
            x: 490,
            y: 210,
            w: 100,
            h: 2,
            fillType: 'solid',
            fill: '#b9a5e8',
            gradientFrom: '#b9a5e8',
            gradientTo: '#6b54a6',
            gradientAngle: 90,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
          }) as ShapeElement,
          createText(box, TEXT_PRESETS[7], {
            text: 'still\nhere',
            x: 70,
            y: 420,
            w: 940,
            h: 520,
            align: 'center',
            fontSize: 250,
            lineHeight: 0.95,
            letterSpacing: -4,
            color: '#efe7da',
          }),
          createText(box, TEXT_PRESETS[6], {
            text: 'after everything',
            x: 90,
            y: 890,
            w: 900,
            h: 120,
            align: 'center',
            fontSize: 72,
            italic: true,
            color: 'rgba(239,231,218,0.55)',
          }),
          baseElement({
            type: 'shape',
            shape: 'line',
            name: 'Linie unten',
            x: 490,
            y: 1080,
            w: 100,
            h: 2,
            fillType: 'solid',
            fill: '#b9a5e8',
            gradientFrom: '#b9a5e8',
            gradientTo: '#6b54a6',
            gradientAngle: 90,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
          }) as ShapeElement,
          createText(box, TEXT_PRESETS[5], {
            text: 'déchire /// 2026',
            x: 90,
            y: 1220,
            w: 900,
            h: 36,
            align: 'center',
            fontSize: 20,
            letterSpacing: 10,
            color: 'rgba(239,231,218,0.4)',
          }),
        ],
      };
    },
  },
  {
    id: 'bleed',
    name: 'Noise',
    tag: 'Story / loud',
    width: 1080,
    height: 1920,
    build: () => {
      const box = { width: 1080, height: 1920 };
      return {
        background: { type: 'gradient', color: '#070707', from: '#121111', to: '#030303', angle: 200 },
        elements: [
          createText(box, TEXT_PRESETS[0], {
            text: 'noise',
            x: -40,
            y: 680,
            w: 1160,
            h: 560,
            fontSize: 420,
            lineHeight: 0.86,
            letterSpacing: -10,
            uppercase: false,
            color: '#efe7da',
          }),
          createText(box, TEXT_PRESETS[10], {
            text: 'déchire · post-hardcore',
            x: 90,
            y: 250,
            w: 900,
            h: 60,
            fontSize: 32,
            letterSpacing: 6,
            uppercase: false,
            color: 'rgba(239,231,218,0.5)',
          }),
          createText(box, TEXT_PRESETS[8], {
            text: 'fracture — out now',
            x: 90,
            y: 1580,
            w: 900,
            h: 50,
            fontSize: 22,
            letterSpacing: 3,
            color: '#b9a5e8',
          }),
        ],
      };
    },
  },
  {
    id: 'dates',
    name: 'Dates',
    tag: 'Tour',
    width: 1080,
    height: 1350,
    build: () => {
      const box = { width: 1080, height: 1350 };
      const rows = [
        { date: '11 NOV', city: 'AUGSBURG', venue: 'Kantine' },
        { date: '18 NOV', city: 'MÜNCHEN', venue: 'Backstage' },
        { date: '24 NOV', city: 'STUTTGART', venue: 'Club Zentral' },
        { date: '02 DEC', city: 'NÜRNBERG', venue: 'MuZ' },
        { date: '09 DEC', city: 'WIEN', venue: 'Chelsea' },
      ];
      const elements: DesignElement[] = [
        createTexture(box, 'grain', { opacity: 0.28 }),
        createText(box, TEXT_PRESETS[5], {
          text: 'tour 2026',
          x: 80,
          y: 110,
          w: 600,
          h: 40,
          fontSize: 19,
          letterSpacing: 4,
          color: '#b9a5e8',
        }),
        createText(box, TEXT_PRESETS[10], {
          text: 'déchire',
          x: 76,
          y: 150,
          w: 940,
          h: 150,
          fontSize: 120,
          lineHeight: 0.95,
          letterSpacing: 2,
          uppercase: false,
          color: '#efe7da',
        }),
        baseElement({
          type: 'shape',
          shape: 'line',
          name: 'Kopf Linie',
          x: 80,
          y: 336,
          w: 920,
          h: 2,
          fillType: 'solid',
          fill: 'rgba(185,165,232,0.5)',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
      ];
      rows.forEach((row, index) => {
        const y = 396 + index * 146;
        elements.push(
          createText(box, TEXT_PRESETS[10], {
            text: row.date,
            x: 80,
            y,
            w: 190,
            h: 60,
            fontSize: 46,
            letterSpacing: 1,
            color: '#b9a5e8',
          }),
          createText(box, TEXT_PRESETS[10], {
            text: row.city,
            x: 286,
            y,
            w: 400,
            h: 60,
            fontSize: 46,
            letterSpacing: 1,
            color: '#efe7da',
          }),
          createText(box, TEXT_PRESETS[8], {
            text: row.venue,
            x: 286,
            y: y + 62,
            w: 500,
            h: 34,
            fontSize: 22,
            letterSpacing: 2,
            color: 'rgba(239,231,218,0.45)',
          })
        );
        if (index < rows.length - 1) {
          elements.push(
            baseElement({
              type: 'shape',
              shape: 'line',
              name: 'Trennlinie',
              x: 80,
              y: y + 118,
              w: 920,
              h: 1,
              fillType: 'solid',
              fill: 'rgba(239,231,218,0.16)',
              gradientFrom: '#b9a5e8',
              gradientTo: '#6b54a6',
              gradientAngle: 90,
              strokeColor: '#b9a5e8',
              strokeWidth: 0,
              radius: 0,
            }) as ShapeElement
          );
        }
      });
      elements.push(
        createText(box, TEXT_PRESETS[5], {
          text: 'tickets: déchire.band',
          x: 80,
          y: 1212,
          w: 920,
          h: 36,
          fontSize: 19,
          letterSpacing: 3,
          color: 'rgba(239,231,218,0.5)',
        })
      );
      return {
        background: { type: 'solid', color: '#080808', from: '#12100e', to: '#040303', angle: 160 },
        elements,
      };
    },
  },
];
