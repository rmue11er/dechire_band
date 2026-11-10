import { hexToOklch, oklchToHex } from './colorlab';
import { clamp, type FontOption } from './design';
import type { Design, DesignElement } from './types';

/**
 * Studio helpers that turn one design into more output: brand-accurate colours,
 * format adaptations and ready-made variations of the current composition.
 */

/** The lavender/violet the older templates were drawn with. */
export const CI_LIGHT = '#b9a5e8';
export const CI_DEEP = '#6b54a6';
export const PAPER = '#efe7da';
export const INK = '#141019';

/* ---------------------------------------------------------------- Colors */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_FN = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/i;

export type Rgba = { r: number; g: number; b: number; a: number };

export function parseColor(value: string): Rgba | null {
  const text = String(value ?? '').trim();
  const hex = text.match(HEX);
  if (hex) {
    const raw = hex[1];
    const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const fn = text.match(RGB_FN);
  if (fn) {
    return {
      r: Number(fn[1]),
      g: Number(fn[2]),
      b: Number(fn[3]),
      a: fn[4] === undefined ? 1 : Number(fn[4]),
    };
  }
  return null;
}

const toHex = (value: number) =>
  Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0');

export const rgbToHex = (color: Rgba) => `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;

export const withAlpha = (value: string, alpha: number) => {
  const color = parseColor(value);
  if (!color) return value;
  const a = Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
  return a >= 1 ? rgbToHex(color) : `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
};

/** `"185, 165, 232"` – for building `rgba()` / `rgb(var(--x) / y)` strings. */
export const accentRgb = (hex: string) => {
  const color = parseColor(hex) ?? { r: 185, g: 165, b: 232, a: 1 };
  return `${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}`;
};

/** Rough perceived lightness 0–1 – decides “is this type dark or light?”. */
export function luminance(value: string): number {
  const color = parseColor(value);
  if (!color) return 0;
  return (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
}

export const isLight = (value: string) => luminance(value) > 0.55;

/** Darker / lighter CI step, keeping hue and chroma. */
export function shade(hex: string, amount: number): string {
  const base = hexToOklch(hex);
  return oklchToHex({ l: clamp(base.l * (1 - amount), 0.02, 0.99), c: base.c, h: base.h });
}

export function tint(hex: string, amount: number): string {
  const base = hexToOklch(hex);
  const l = base.l + (1 - base.l) * clamp(amount, 0, 1);
  return oklchToHex({ l, c: base.c * (1 - amount * 0.4), h: base.h });
}

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/**
 * Maps a colour that belongs to the old lavender CI onto the current accent –
 * lighter tints stay lighter, deep shades stay deep, alpha is preserved.
 * Neutrals (greys, white, black, bone) are returned untouched.
 */
export function mapBrandColor(value: string, accent: string): string {
  const color = parseColor(value);
  if (!color) return value;
  const source = hexToOklch(rgbToHex(color));
  const ci = hexToOklch(CI_LIGHT);
  if (source.c < 0.025 || hueDistance(source.h, ci.h) > 16) return value;

  const target = hexToOklch(accent);
  const ratio = source.l / Math.max(ci.l, 0.01);
  const next = oklchToHex({
    l: clamp(target.l * ratio, 0.02, 0.99),
    c: clamp(source.c * (target.c / Math.max(ci.c, 0.005)), 0, 0.37),
    h: target.h,
  });
  return withAlpha(next, color.a);
}

/* ------------------------------------------------------------- Recolour */

const elementColors = (element: DesignElement): string[] => {
  switch (element.type) {
    case 'text':
      return ['color', 'outlineColor', 'bgColor'];
    case 'shape':
      return ['fill', 'gradientFrom', 'gradientTo', 'strokeColor'];
    case 'sticker':
      return ['color'];
    case 'texture':
      return ['color'];
    default:
      return [];
  }
};

/** Replaces every lavender CI colour with the given accent – one click, whole design. */
/** One element with its CI placeholder colours moved onto the live accent. */
export function recolourElement<T extends DesignElement>(element: T, accent: string): T {
  const next: any = { ...element };
  elementColors(element).forEach((key) => {
    const value = (element as any)[key];
    if (typeof value === 'string') next[key] = mapBrandColor(value, accent);
  });
  return next as T;
}

export function recolourDesign(design: Design, accent: string): Design {
  const background = design.background;
  return {
    ...design,
    background: {
      ...background,
      color: mapBrandColor(background.color, accent),
      from: mapBrandColor(background.from, accent),
      to: mapBrandColor(background.to, accent),
    },
    elements: design.elements.map((element) => recolourElement(element, accent)),
  };
}

/** True when the design still uses the old lavender CI somewhere. */
export function usesLegacyAccent(design: Design): boolean {
  const probe = (value: string) => mapBrandColor(value, '#000000') !== value;
  const background = design.background;
  if ([background.color, background.from, background.to].some(probe)) return true;
  return design.elements.some((element) =>
    elementColors(element).some((key) => {
      const value = (element as any)[key];
      return typeof value === 'string' && probe(value);
    })
  );
}

/* -------------------------------------------------------------- Formats */

/** Same design, different canvas – everything scales proportionally. */
export function adaptDesign(design: Design, width: number, height: number): Design {
  const sx = width / design.width;
  const sy = height / design.height;
  const factor = Math.min(sx, sy);
  return {
    ...design,
    width,
    height,
    elements: design.elements.map((element) => {
      const next: any = {
        ...element,
        x: Math.round(element.x * sx),
        y: Math.round(element.y * sy),
        w: Math.round(element.w * sx),
        h: Math.round(element.h * sy),
      };
      if (element.type === 'text') {
        next.fontSize = Math.max(6, Math.round(element.fontSize * factor));
        next.letterSpacing = Math.round(element.letterSpacing * factor);
        next.bgPadding = Math.round(element.bgPadding * factor);
      }
      if (element.type === 'shape') {
        next.strokeWidth = Math.round(element.strokeWidth * factor);
        next.radius = Math.round(element.radius * factor);
      }
      if (element.type === 'image') next.radius = Math.round(element.radius * factor);
      return next as DesignElement;
    }),
  };
}

/* ------------------------------------------------------------- Variants */

export interface DesignVariant {
  id: string;
  label: string;
  hint: string;
  design: Design;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isAccentish = (value: string) => mapBrandColor(value, '#000000') !== value;

/** Light paper take: light type becomes ink, dark veils become paper. */
function paperise(design: Design): Design {
  const next = clone(design);
  next.background = {
    ...next.background,
    type: 'gradient',
    color: '#f4eee3',
    from: '#f6f1e7',
    to: '#ded4c3',
  };
  next.elements = next.elements.map((element) => {
    if (element.type === 'text') {
      const light = isLight(element.color);
      return {
        ...element,
        color: light ? INK : element.color,
        bgColor: element.bgColor && isLight(element.bgColor) ? 'rgba(20,16,25,0.08)' : element.bgColor,
        shadow: element.shadow === 'glow' ? 'soft' : element.shadow,
      };
    }
    if (element.type === 'shape') {
      const veil = !isAccentish(element.fill) && luminance(element.fill) < 0.2 && element.fill !== 'transparent';
      return {
        ...element,
        blendMode: element.blendMode === 'screen' ? 'multiply' : element.blendMode,
        fill: veil ? withAlpha(PAPER, parseColor(element.fill)?.a ?? 1) : element.fill,
        gradientFrom: !isAccentish(element.gradientFrom)
          ? withAlpha(PAPER, parseColor(element.gradientFrom)?.a ?? 1)
          : element.gradientFrom,
        gradientTo: !isAccentish(element.gradientTo)
          ? withAlpha(PAPER, parseColor(element.gradientTo)?.a ?? 1)
          : element.gradientTo,
      };
    }
    if (element.type === 'sticker' && isLight(element.color)) {
      return { ...element, color: INK };
    }
    if (element.type === 'texture' && element.texture === 'vignette') {
      return { ...element, color: 'rgba(239,231,218,0.9)', blendMode: 'normal', opacity: 0.5 };
    }
    return element;
  });
  return next;
}

/** More pressure: near-black stage, hotter accent glows. */
function deepen(design: Design): Design {
  const next = clone(design);
  next.background = {
    ...next.background,
    type: 'gradient',
    color: '#050408',
    from: '#0b0a12',
    to: '#000000',
  };
  next.elements = next.elements.map((element) => {
    if (element.type === 'text') {
      return { ...element, color: isLight(element.color) ? '#f7f2e6' : element.color };
    }
    if (element.type === 'shape' && isAccentish(element.fill)) {
      return { ...element, opacity: Math.min(1, Math.round((element.opacity + 0.15) * 100) / 100) };
    }
    if (element.type === 'texture' && element.texture === 'vignette') {
      return { ...element, opacity: Math.min(1, Math.round((element.opacity + 0.2) * 100) / 100) };
    }
    return element;
  });
  return next;
}

/** Everything in the accent hue is turned into paper/greys – photographic, quiet. */
function monochrome(design: Design): Design {
  const next = clone(design);
  const backgroundProbe =
    next.background.type === 'solid' ? next.background.color : next.background.from;
  const onPaper = isLight(backgroundProbe);
  const target = onPaper ? '#241f2e' : '#e9e4f2';
  next.elements = next.elements.map((element) => {
    const copy: any = { ...element };
    elementColors(element).forEach((key) => {
      const value = copy[key];
      if (typeof value === 'string') copy[key] = mapBrandColor(value, target);
    });
    return copy as DesignElement;
  });
  return next;
}

/** Punk flyer: everything sits a couple of degrees off the grid. */
function tilt(design: Design): Design {
  const next = clone(design);
  let index = 0;
  next.elements = next.elements.map((element) => {
    if (element.type === 'text') {
      index += 1;
      return { ...element, rotation: Math.round((index % 2 === 0 ? 2.4 : -1.8) * 10) / 10 };
    }
    if (element.type === 'shape' && element.shape !== 'line') {
      return { ...element, rotation: Math.round(element.rotation + (index % 2 === 0 ? 3 : -3)) };
    }
    return element;
  });
  return next;
}

/** Outline-only display type – the loudest poster trick there is. */
function outlineType(design: Design): Design {
  const next = clone(design);
  const probe = next.background.type === 'solid' ? next.background.color : next.background.from;
  const stroke = isLight(probe) ? INK : PAPER;
  const texts = next.elements
    .filter((element): element is Extract<DesignElement, { type: 'text' }> => element.type === 'text')
    .sort((a, b) => b.fontSize - a.fontSize)
    .slice(0, 2);
  const ids = new Set(texts.map((element) => element.id));
  next.elements = next.elements.map((element) => {
    if (element.type === 'text' && ids.has(element.id)) {
      return {
        ...element,
        color: 'transparent',
        outlineWidth: Math.max(2, Math.round(element.fontSize * 0.012)),
        outlineColor: stroke,
        shadow: 'none',
      };
    }
    return element;
  });
  return next;
}

/**
 * Six one-click directions for the current design. Every variant is a full
 * design, so applying one is a single undoable step.
 */
export function designVariants(design: Design, accent: string): DesignVariant[] {
  return [
    { id: 'paper', label: 'Paper', hint: 'Light flyer stock, ink type', design: paperise(design) },
    { id: 'deep', label: 'Deep', hint: 'Blacker, hotter glow', design: deepen(design) },
    { id: 'mono', label: 'Mono', hint: 'No colour, all texture', design: monochrome(design) },
    { id: 'tilt', label: 'Tilt', hint: 'Off the grid, punk', design: tilt(design) },
    { id: 'outline', label: 'Outline', hint: 'Hollow display type', design: outlineType(design) },
    { id: 'brand', label: 'Brand accent', hint: 'Your CI colour everywhere', design: recolourDesign(design, accent) },
  ];
}

/** Handy for the gallery: a font stack without asking the runtime registry. */
export const fontStackOf = (fonts: FontOption[], id: string) =>
  fonts.find((font) => font.id === id)?.stack ?? 'sans-serif';
