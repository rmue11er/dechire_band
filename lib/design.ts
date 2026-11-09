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
    id: 'anton',
    label: 'Anton',
    stack: "'Anton', 'Arial Narrow', Impact, sans-serif",
    weights: [400],
    mood: 'Poster',
  },
  {
    id: 'bebas',
    label: 'Bebas Neue',
    stack: "'Bebas Neue', 'Arial Narrow', sans-serif",
    weights: [400],
    mood: 'Condensed',
  },
  {
    id: 'archivo',
    label: 'Archivo Black',
    stack: "'Archivo Black', 'Helvetica Neue', Arial, sans-serif",
    weights: [400],
    mood: 'Heavy',
  },
  {
    id: 'oswald',
    label: 'Oswald',
    stack: "'Oswald', 'Arial Narrow', sans-serif",
    weights: [300, 500, 700],
    mood: 'Spaced',
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: "'Inter', system-ui, sans-serif",
    weights: [400, 600, 800],
    mood: 'Neutral',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    stack: "'Playfair Display', Georgia, serif",
    weights: [400, 700, 900],
    mood: 'Editorial',
  },
  {
    id: 'space',
    label: 'Space Mono',
    stack: "'Space Mono', ui-monospace, monospace",
    weights: [400, 700],
    mood: 'Mono',
  },
  {
    id: 'system',
    label: 'System Sans',
    stack: "system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
    weights: [400, 600, 800],
    mood: 'Clean',
  },
  {
    id: 'serif',
    label: 'System Serif',
    stack: "Georgia, 'Times New Roman', serif",
    weights: [400, 700],
    mood: 'Classic',
  },
  /* --- post-hardcore voice: fragile, literary, worn ---------------------- */
  {
    id: 'cormorant',
    label: 'Cormorant Garamond',
    stack: "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
    weights: [300, 400, 600],
    mood: 'Fragile',
  },
  {
    id: 'bodoni',
    label: 'Bodoni Moda',
    stack: "'Bodoni Moda', Didot, 'Times New Roman', serif",
    weights: [400, 700],
    mood: 'Editorial',
  },
  {
    id: 'garamond',
    label: 'EB Garamond',
    stack: "'EB Garamond', Garamond, Georgia, serif",
    weights: [400, 600],
    mood: 'Literary',
  },
  {
    id: 'instrument',
    label: 'Instrument Serif',
    stack: "'Instrument Serif', 'Times New Roman', serif",
    weights: [400],
    mood: 'Poetic',
  },
  {
    id: 'spectral',
    label: 'Spectral',
    stack: "'Spectral', Georgia, serif",
    weights: [300, 400, 600],
    mood: 'Sombre',
  },
  {
    id: 'typewriter',
    label: 'Special Elite',
    stack: "'Special Elite', 'Courier New', monospace",
    weights: [400],
    mood: 'Typewriter',
  },
  {
    id: 'caveat',
    label: 'Caveat',
    stack: "'Caveat', 'Bradley Hand', cursive",
    weights: [400, 600],
    mood: 'Handwriting',
  },
  {
    id: 'narrow',
    label: 'Archivo Narrow',
    stack: "'Archivo Narrow', 'Arial Narrow', sans-serif",
    weights: [400, 700],
    mood: 'Tight',
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
  glow: '0 0 46px rgba(185, 165, 232, 0.8)',
  hard: '7px 7px 0 rgba(0, 0, 0, 0.9)',
  echo: '5px 5px 0 #6b54a6',
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
      fontFamily: 'anton',
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
    sample: 'New single',
    patch: {
      fontFamily: 'bebas',
      fontSize: 140,
      fontWeight: 400,
      uppercase: true,
      letterSpacing: 6,
      lineHeight: 0.95,
      color: '#efe7da',
    },
  },
  {
    id: 'subhead',
    label: 'Subline',
    sample: 'TOUR 2026',
    patch: {
      fontFamily: 'oswald',
      fontSize: 64,
      fontWeight: 500,
      uppercase: true,
      letterSpacing: 12,
      lineHeight: 1.2,
      color: '#b9a5e8',
    },
  },
  {
    id: 'quote',
    label: 'Quote',
    sample: '“Until the noise takes over.”',
    patch: {
      fontFamily: 'playfair',
      fontSize: 76,
      fontWeight: 700,
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
    sample: 'Text that tells the story.',
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
    sample: 'DECHIRE /// DE',
    patch: {
      fontFamily: 'space',
      fontSize: 28,
      fontWeight: 400,
      uppercase: true,
      letterSpacing: 10,
      lineHeight: 1.3,
      color: '#b9a5e8',
    },
  },
  {
    id: 'whisper',
    label: 'Whisper',
    sample: 'I still hear it',
    patch: {
      fontFamily: 'cormorant',
      fontSize: 96,
      fontWeight: 300,
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
    sample: 'nothing left to save',
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
    label: 'Typewriter',
    sample: 'demo — take 03',
    patch: {
      fontFamily: 'typewriter',
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
      fontFamily: 'caveat',
      fontSize: 72,
      fontWeight: 400,
      uppercase: false,
      letterSpacing: 0,
      lineHeight: 1.1,
      color: '#efe7da',
    },
  },
  {
    id: 'capsnarrow',
    label: 'Tight caps',
    sample: 'DON’T LOOK BACK',
    patch: {
      fontFamily: 'narrow',
      fontSize: 62,
      fontWeight: 700,
      uppercase: true,
      letterSpacing: 2,
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
    fontFamily: 'anton',
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
    name: 'Release Banger',
    tag: 'Single / Album',
    width: 1080,
    height: 1350,
    build: () => {
      return {
        background: { type: 'gradient', color: '#0a0910', from: '#0c0a14', to: '#241b36', angle: 165 },
        elements: [
          createTexture({ width: 1080, height: 1350 }, 'grain', { opacity: 0.28 }),
          baseElement({
            type: 'shape',
            shape: 'ellipse',
            name: 'Glow',
            x: -180,
            y: -140,
            w: 900,
            h: 900,
            fillType: 'gradient',
            fill: '#b9a5e8',
            gradientFrom: 'rgba(185,165,232,0.55)',
            gradientTo: 'rgba(185,165,232,0)',
            gradientAngle: 135,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
            blendMode: 'screen',
            opacity: 0.9,
          }) as ShapeElement,
          createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
            text: `NEW SINGLE /// ${dayLabel(5)}`,
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
          createText({ width: 1080, height: 1350 }, TEXT_PRESETS[0], {
            text: 'FRAC\nTURE',
            x: 56,
            y: 742,
            w: 980,
            h: 440,
            fontSize: 300,
            lineHeight: 0.82,
            letterSpacing: -6,
            color: '#efe7da',
          }),
          createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
            text: 'DECHIRE · POST-HARDCORE',
            x: 72,
            y: 1238,
            w: 700,
            h: 40,
            fontSize: 24,
            letterSpacing: 8,
            color: 'rgba(239,231,218,0.62)',
          }),
          {
            ...createSticker({ width: 1080, height: 1350 }, 'asterisk', '#b9a5e8'),
            x: 866,
            y: 84,
            w: 124,
            h: 124,
            rotation: 12,
          } as DesignElement,
        ],
      };
    },
  },
  {
    id: 'show',
    name: 'Show Poster',
    tag: 'Tour / Live',
    width: 1080,
    height: 1350,
    build: () => ({
      background: { type: 'solid', color: '#07060b', from: '#141020', to: '#050409', angle: 160 },
      elements: [
        createTexture({ width: 1080, height: 1350 }, 'grain', { opacity: 0.2 }),
        baseElement({
          type: 'shape',
          shape: 'slash',
          name: 'Slash',
          x: 140,
          y: 260,
          w: 800,
          h: 860,
          fillType: 'gradient',
          fill: '#b9a5e8',
          gradientFrom: 'rgba(185,165,232,0.22)',
          gradientTo: 'rgba(185,165,232,0.02)',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
          opacity: 1,
        }) as ShapeElement,
        baseElement({
          type: 'shape',
          shape: 'frame',
          name: 'Rahmen',
          x: 44,
          y: 44,
          w: 992,
          h: 1262,
          fillType: 'none',
          fill: 'transparent',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: 'rgba(185,165,232,0.55)',
          strokeWidth: 3,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'LIVE /// TOUR 2026',
          x: 80,
          y: 100,
          w: 920,
          h: 44,
          align: 'center',
          fontSize: 25,
          letterSpacing: 12,
          color: '#cfc2ea',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[0], {
          text: dayLabel(2),
          x: 60,
          y: 400,
          w: 960,
          h: 320,
          align: 'center',
          fontSize: 300,
          lineHeight: 0.9,
          letterSpacing: -4,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[0], {
          text: 'HALLE',
          x: 60,
          y: 742,
          w: 960,
          h: 240,
          align: 'center',
          fontSize: 210,
          lineHeight: 0.95,
          letterSpacing: 14,
          color: '#b9a5e8',
        }),
        baseElement({
          type: 'shape',
          shape: 'line',
          name: 'Trennlinie',
          x: 340,
          y: 1032,
          w: 400,
          h: 3,
          fillType: 'solid',
          fill: 'rgba(185,165,232,0.6)',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'TICKETS: DECHIRE.BAND',
          x: 60,
          y: 1084,
          w: 960,
          h: 44,
          align: 'center',
          fontSize: 26,
          letterSpacing: 7,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'DOORS 19:00 · SHOW 20:00',
          x: 60,
          y: 1146,
          w: 960,
          h: 36,
          align: 'center',
          fontSize: 20,
          letterSpacing: 6,
          color: 'rgba(239,231,218,0.45)',
        }),
      ],
    }),
  },
  {
    id: 'lyrics',
    name: 'Lyrics',
    tag: 'Quote / Text',
    width: 1080,
    height: 1080,
    build: () => ({
      background: { type: 'solid', color: '#08070d', from: '#141020', to: '#050409', angle: 160 },
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
          text: 'FRACTURE /// DECHIRE',
          x: 80,
          y: 852,
          w: 920,
          h: 40,
          align: 'center',
          fontSize: 23,
          letterSpacing: 9,
          color: 'rgba(239,231,218,0.6)',
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
    name: 'Merch Drop',
    tag: 'Shop / Drop',
    width: 1080,
    height: 1080,
    build: () => ({
      background: { type: 'solid', color: '#b9a5e8', from: '#b9a5e8', to: '#6b54a6', angle: 135 },
      elements: [
        createTexture({ width: 1080, height: 1080 }, 'grain', {
          opacity: 0.3,
          blendMode: 'multiply',
          color: '#000000',
        }),
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[5], {
          text: 'LIMITED /// 50 PIECES',
          x: 72,
          y: 84,
          w: 700,
          h: 40,
          fontSize: 24,
          letterSpacing: 10,
          color: '#2a2138',
        }),
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[0], {
          text: 'MERCH\nDROP',
          x: 64,
          y: 330,
          w: 960,
          h: 470,
          fontSize: 270,
          lineHeight: 0.84,
          letterSpacing: -6,
          color: '#0a0812',
        }),
        baseElement({
          type: 'shape',
          shape: 'tape',
          name: 'Tape',
          x: -80,
          y: 604,
          w: 720,
          h: 76,
          fillType: 'solid',
          fill: 'rgba(6,6,10,0.16)',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#06060a',
          strokeWidth: 0,
          radius: 0,
          rotation: -5,
        }) as ShapeElement,
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[5], {
          text: 'DECHIRE.BAND/SHOP',
          x: 72,
          y: 918,
          w: 620,
          h: 40,
          fontSize: 24,
          letterSpacing: 8,
          color: '#2a2138',
        }),
        baseElement({
          type: 'shape',
          shape: 'ellipse',
          name: 'Badge',
          x: 774,
          y: 742,
          w: 232,
          h: 232,
          fillType: 'none',
          fill: 'transparent',
          gradientFrom: '#b9a5e8',
          gradientTo: '#6b54a6',
          gradientAngle: 90,
          strokeColor: '#0a0812',
          strokeWidth: 3,
          radius: 0,
          rotation: -8,
        }) as ShapeElement,
        createText({ width: 1080, height: 1080 }, TEXT_PRESETS[5], {
          text: '50\nPCS',
          x: 774,
          y: 806,
          w: 232,
          h: 120,
          align: 'center',
          fontSize: 44,
          lineHeight: 1.15,
          letterSpacing: 4,
          fontWeight: 700,
          color: '#0a0812',
          rotation: -8,
        }),
      ],
    }),
  },
  {
    id: 'story',
    name: 'Story Announcement',
    tag: 'Story / Reel',
    width: 1080,
    height: 1920,
    build: () => ({
      background: { type: 'gradient', color: '#0a0910', from: '#100c1a', to: '#2a2040', angle: 200 },
      elements: [
        createTexture({ width: 1080, height: 1920 }, 'grain', { opacity: 0.26 }),
        baseElement({
          type: 'shape',
          shape: 'ellipse',
          name: 'Glow',
          x: 40,
          y: 380,
          w: 1000,
          h: 1000,
          fillType: 'gradient',
          fill: '#b9a5e8',
          gradientFrom: 'rgba(185,165,232,0.4)',
          gradientTo: 'rgba(185,165,232,0)',
          gradientAngle: 135,
          strokeColor: '#b9a5e8',
          strokeWidth: 0,
          radius: 0,
          blendMode: 'screen',
        }) as ShapeElement,
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[5], {
          text: `${dayLabel(5)} /// 00:01`,
          x: 80,
          y: 300,
          w: 920,
          h: 44,
          align: 'center',
          fontSize: 26,
          letterSpacing: 12,
          color: '#cfc2ea',
        }),
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[0], {
          text: 'OUT\nNOW',
          x: 60,
          y: 670,
          w: 960,
          h: 620,
          align: 'center',
          fontSize: 330,
          lineHeight: 0.82,
          letterSpacing: -6,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[2], {
          text: 'FRACTURE',
          x: 60,
          y: 1400,
          w: 960,
          h: 90,
          align: 'center',
          fontSize: 68,
          letterSpacing: 18,
          color: '#b9a5e8',
        }),
        createText({ width: 1080, height: 1920 }, TEXT_PRESETS[5], {
          text: 'STREAMING EVERYWHERE',
          x: 60,
          y: 1620,
          w: 960,
          h: 40,
          align: 'center',
          fontSize: 22,
          letterSpacing: 8,
          color: 'rgba(239,231,218,0.55)',
        }),
        {
          ...createSticker({ width: 1080, height: 1920 }, 'spark', '#b9a5e8'),
          x: 866,
          y: 222,
          w: 120,
          h: 120,
          rotation: -8,
        } as DesignElement,
      ],
    }),
  },
  {
    id: 'statement',
    name: 'Statement',
    tag: 'Tour / Type',
    width: 1080,
    height: 1350,
    build: () => ({
      background: { type: 'solid', color: '#efe7da', from: '#efe7da', to: '#dcd2c4', angle: 160 },
      elements: [
        createTexture({ width: 1080, height: 1350 }, 'halftone', {
          color: 'rgba(107,84,166,0.5)',
          scale: 16,
          opacity: 0.5,
          blendMode: 'multiply',
          x: 560,
          y: 700,
          w: 600,
          h: 720,
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'TOUR 2026 /// DECHIRE',
          x: 80,
          y: 120,
          w: 920,
          h: 40,
          fontSize: 24,
          letterSpacing: 10,
          color: '#3a3350',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[0], {
          text: 'NO\nLIGHT',
          x: 72,
          y: 420,
          w: 960,
          h: 520,
          fontFamily: 'archivo',
          fontSize: 230,
          lineHeight: 0.88,
          letterSpacing: -8,
          color: '#0a0812',
        }),
        baseElement({
          type: 'shape',
          shape: 'rect',
          name: 'Akzent',
          x: 80,
          y: 352,
          w: 260,
          h: 18,
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
          text: `HALLE · ${dayLabel(2)} · COLOGNE · ${dayLabel(9)}`,
          x: 80,
          y: 1180,
          w: 920,
          h: 40,
          fontSize: 24,
          letterSpacing: 6,
          color: '#3a3350',
        }),
      ],
    }),
  },
  {
    id: 'photo',
    name: 'Band Photo',
    tag: 'Photo + Type',
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
            grayscale: 15,
            contrast: 112,
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
          gradientTo: 'rgba(6,6,10,0.94)',
          gradientAngle: 180,
          strokeColor: '#06060a',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[0], {
          text: 'DECHIRE',
          x: 64,
          y: 1040,
          w: 960,
          h: 210,
          fontSize: 210,
          lineHeight: 0.9,
          letterSpacing: 2,
          color: '#efe7da',
        }),
        createText({ width: 1080, height: 1350 }, TEXT_PRESETS[5], {
          text: 'POST-HARDCORE /// RUHR',
          x: 72,
          y: 1240,
          w: 920,
          h: 36,
          fontSize: 22,
          letterSpacing: 9,
          color: 'rgba(239,231,218,0.65)',
        })
      );
      return {
        background: { type: 'solid', color: '#06060a', from: '#141020', to: '#050409', angle: 160 },
        elements,
      };
    },
  },
  {
    id: 'close',
    name: 'Close',
    tag: 'Photo / Whisper',
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
            gradientFrom: '#2a2038',
            gradientTo: '#08070d',
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
          gradientFrom: 'rgba(6,5,10,0)',
          gradientTo: 'rgba(4,3,8,0.96)',
          gradientAngle: 180,
          strokeColor: '#06050a',
          strokeWidth: 0,
          radius: 0,
        }) as ShapeElement,
        createTexture(box, 'grain', { opacity: 0.22 }),
        createText(box, TEXT_PRESETS[8], {
          text: 'DECHIRE /// FRACTURE',
          x: 64,
          y: 104,
          w: 720,
          h: 40,
          fontSize: 23,
          letterSpacing: 5,
          color: 'rgba(239,231,218,0.62)',
        }),
        createText(box, TEXT_PRESETS[6], {
          text: 'come\ncloser',
          x: 56,
          y: 812,
          w: 940,
          h: 340,
          fontSize: 168,
          lineHeight: 0.94,
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
          text: `OUT ${dayLabel(5)} /// 00:01`,
          x: 64,
          y: 1232,
          w: 720,
          h: 36,
          fontSize: 21,
          letterSpacing: 8,
          color: '#b9a5e8',
        })
      );
      return {
        background: { type: 'solid', color: '#060509', from: '#0c0a12', to: '#040308', angle: 160 },
        elements,
      };
    },
  },
  {
    id: 'diary',
    name: 'Diary',
    tag: 'Handwritten / Note',
    width: 1080,
    height: 1080,
    build: () => {
      const box = { width: 1080, height: 1080 };
      return {
        background: { type: 'gradient', color: '#0b0910', from: '#100d16', to: '#050408', angle: 150 },
        elements: [
          createTexture(box, 'grain', { opacity: 0.3 }),
          baseElement({
            type: 'shape',
            shape: 'tape',
            name: 'Tape oben',
            x: 120,
            y: -26,
            w: 300,
            h: 64,
            fillType: 'solid',
            fill: 'rgba(185,165,232,0.22)',
            gradientFrom: '#b9a5e8',
            gradientTo: '#6b54a6',
            gradientAngle: 90,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
            rotation: -7,
          }) as ShapeElement,
          baseElement({
            type: 'shape',
            shape: 'tape',
            name: 'Tape unten',
            x: 690,
            y: 1046,
            w: 260,
            h: 58,
            fillType: 'solid',
            fill: 'rgba(185,165,232,0.18)',
            gradientFrom: '#b9a5e8',
            gradientTo: '#6b54a6',
            gradientAngle: 90,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
            rotation: 6,
          }) as ShapeElement,
          createText(box, TEXT_PRESETS[8], {
            text: 'NOTE 004 — 03:41 AM',
            x: 96,
            y: 128,
            w: 700,
            h: 40,
            fontSize: 23,
            letterSpacing: 4,
            color: 'rgba(239,231,218,0.5)',
          }),
          createText(box, TEXT_PRESETS[9], {
            text: 'i keep the light off\nso nobody sees\nhow much this hurts',
            x: 92,
            y: 300,
            w: 900,
            h: 460,
            fontSize: 78,
            lineHeight: 1.3,
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
            text: 'DECHIRE /// FRACTURE',
            x: 96,
            y: 852,
            w: 760,
            h: 60,
            fontSize: 30,
            letterSpacing: 3,
            color: 'rgba(239,231,218,0.62)',
          }),
        ],
      };
    },
  },
  {
    id: 'elegy',
    name: 'Elegy',
    tag: 'Lyric / Quiet',
    width: 1080,
    height: 1350,
    build: () => {
      const box = { width: 1080, height: 1350 };
      return {
        background: { type: 'gradient', color: '#050409', from: '#0a0810', to: '#020204', angle: 180 },
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
            fontSize: 260,
            lineHeight: 0.92,
            letterSpacing: -6,
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
            text: 'DECHIRE /// 2026',
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
    name: 'Bleed',
    tag: 'Story / Loud',
    width: 1080,
    height: 1920,
    build: () => {
      const box = { width: 1080, height: 1920 };
      return {
        background: { type: 'gradient', color: '#06050a', from: '#0d0a14', to: '#030205', angle: 200 },
        elements: [
          createTexture(box, 'halftone', {
            color: 'rgba(185,165,232,0.4)',
            scale: 14,
            opacity: 0.35,
            x: 540,
            y: 1040,
            w: 640,
            h: 780,
          }),
          baseElement({
            type: 'shape',
            shape: 'slash',
            name: 'Slash',
            x: -120,
            y: 380,
            w: 1320,
            h: 1180,
            fillType: 'gradient',
            fill: '#b9a5e8',
            gradientFrom: 'rgba(185,165,232,0.16)',
            gradientTo: 'rgba(185,165,232,0)',
            gradientAngle: 120,
            strokeColor: '#b9a5e8',
            strokeWidth: 0,
            radius: 0,
          }) as ShapeElement,
          createText(box, TEXT_PRESETS[0], {
            text: 'NO\nISE',
            x: -84,
            y: 620,
            w: 1300,
            h: 900,
            fontSize: 470,
            lineHeight: 0.8,
            letterSpacing: -14,
            color: '#efe7da',
          }),
          createText(box, TEXT_PRESETS[10], {
            text: 'DECHIRE · POST-HARDCORE',
            x: 90,
            y: 250,
            w: 900,
            h: 60,
            fontSize: 34,
            letterSpacing: 8,
            color: 'rgba(239,231,218,0.55)',
          }),
          createText(box, TEXT_PRESETS[8], {
            text: 'FRACTURE — OUT NOW',
            x: 90,
            y: 1580,
            w: 900,
            h: 50,
            fontSize: 26,
            letterSpacing: 6,
            color: '#b9a5e8',
          }),
          {
            ...createSticker(box, 'asterisk', '#b9a5e8'),
            x: 820,
            y: 1680,
            w: 150,
            h: 150,
            rotation: 14,
          } as DesignElement,
        ],
      };
    },
  },
  {
    id: 'dates',
    name: 'Tour Dates',
    tag: 'Tour / List',
    width: 1080,
    height: 1350,
    build: () => {
      const box = { width: 1080, height: 1350 };
      const rows = [
        { date: '11 NOV', city: 'HALLE', venue: 'Objekthalle' },
        { date: '18 NOV', city: 'COLOGNE', venue: 'Gebäude 9' },
        { date: '24 NOV', city: 'HAMBURG', venue: 'Hafenklang' },
        { date: '02 DEC', city: 'BERLIN', venue: 'Kantine' },
        { date: '09 DEC', city: 'LEIPZIG', venue: 'UT Connewitz' },
      ];
      const elements: DesignElement[] = [
        createTexture(box, 'grain', { opacity: 0.24 }),
        createText(box, TEXT_PRESETS[5], {
          text: 'TOUR 2026',
          x: 80,
          y: 110,
          w: 600,
          h: 40,
          fontSize: 22,
          letterSpacing: 10,
          color: '#b9a5e8',
        }),
        createText(box, TEXT_PRESETS[10], {
          text: 'DECHIRE',
          x: 76,
          y: 156,
          w: 940,
          h: 150,
          fontSize: 132,
          lineHeight: 0.95,
          letterSpacing: 4,
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
          text: 'TICKETS: DECHIRE.BAND',
          x: 80,
          y: 1212,
          w: 920,
          h: 36,
          fontSize: 21,
          letterSpacing: 8,
          color: 'rgba(239,231,218,0.6)',
        })
      );
      return {
        background: { type: 'solid', color: '#07060b', from: '#100d16', to: '#040308', angle: 160 },
        elements,
      };
    },
  },
];
