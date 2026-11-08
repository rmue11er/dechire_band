/**
 * Colour lab – the maths behind the palette search.
 *
 * Everything happens in OKLCH: it is the only space where "pastel", "muted"
 * or "a sibling of our lavender" can be expressed as numbers without lying.
 * The module is pure (no React, no DOM) so the page stays a thin layer on top.
 */

export type Mood = 'any' | 'pastel' | 'muted' | 'dark' | 'bright' | 'neon' | 'earthy' | 'vintage';
export type Scheme = 'any' | 'analogous' | 'complementary' | 'split' | 'triad' | 'tetrad' | 'mono';

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export interface Swatch extends Oklch {
  hex: string;
  name: string;
  /** 0–100, how well the colour sits next to the current palette. */
  fit: number;
  note: string;
}

export const MOODS: { value: Mood; label: string; hint: string }[] = [
  { value: 'any', label: 'Any', hint: 'no filter' },
  { value: 'pastel', label: 'Pastel', hint: 'light, low chroma' },
  { value: 'muted', label: 'Muted', hint: 'dusty, in between' },
  { value: 'dark', label: 'Dark', hint: 'night shapes' },
  { value: 'bright', label: 'Bright', hint: 'clear and saturated' },
  { value: 'neon', label: 'Neon', hint: 'loud, high chroma' },
  { value: 'earthy', label: 'Earthy', hint: 'rust, moss, clay' },
  { value: 'vintage', label: 'Vintage', hint: 'faded print' },
];

export const SCHEMES: { value: Scheme; label: string; hint: string }[] = [
  { value: 'any', label: 'Any', hint: 'free search' },
  { value: 'analogous', label: 'Analogous', hint: '±30° around the seed' },
  { value: 'complementary', label: 'Complementary', hint: '+180°' },
  { value: 'split', label: 'Split', hint: '+150° / +210°' },
  { value: 'triad', label: 'Triad', hint: '+120° / +240°' },
  { value: 'tetrad', label: 'Tetrad', hint: 'four corners' },
  { value: 'mono', label: 'Mono', hint: 'one hue, many lightness steps' },
];

/** Mood → OKLCH corridor. Values are deliberately generous, the UI narrows them. */
const MOOD_RANGES: Record<Exclude<Mood, 'any'>, { l: [number, number]; c: [number, number]; hue?: [number, number] }> = {
  pastel: { l: [0.8, 0.94], c: [0.035, 0.1] },
  muted: { l: [0.52, 0.74], c: [0.025, 0.075] },
  dark: { l: [0.16, 0.36], c: [0.015, 0.08] },
  bright: { l: [0.62, 0.8], c: [0.11, 0.19] },
  neon: { l: [0.68, 0.88], c: [0.18, 0.31] },
  earthy: { l: [0.42, 0.72], c: [0.03, 0.1], hue: [15, 125] },
  vintage: { l: [0.68, 0.87], c: [0.04, 0.095], hue: [10, 95] },
};

/* ------------------------------------------------------------------ maths */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());

export function hexToRgb(hex: string) {
  const value = isHex(hex) ? hex.trim().slice(1) : '000000';
  return {
    r: Number.parseInt(value.slice(0, 2), 16) / 255,
    g: Number.parseInt(value.slice(2, 4), 16) / 255,
    b: Number.parseInt(value.slice(4, 6), 16) / 255,
  };
}

const toHex = (value: number) =>
  Math.round(clamp(value, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0');

const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

const gamma = (channel: number) => (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055);

/** sRGB → OKLCH (L 0–1, C 0–0.4ish, H 0–360). */
export function hexToOklch(hex: string): Oklch {
  const { r, g, b } = hexToRgb(hex);
  const lr = linear(r);
  const lg = linear(g);
  const lb = linear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.sqrt(A * A + B * B);
  let hue = (Math.atan2(B, A) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  return { l: L, c: chroma, h: hue };
}

/** OKLCH → hex, with a chroma walk-back so we never return an out-of-gamut colour. */
export function oklchToHex(value: Oklch): string {
  let chroma = value.c;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const rad = (value.h * Math.PI) / 180;
    const A = Math.cos(rad) * chroma;
    const B = Math.sin(rad) * chroma;
    const solid = toHexFromOklab(value.l, A, B);
    if (solid) return solid;
    chroma *= 0.94;
  }
  const rad = (value.h * Math.PI) / 180;
  return toHexFromOklab(value.l, Math.cos(rad) * 0.01, Math.sin(rad) * 0.01) ?? '#000000';
}

function toHexFromOklab(L: number, A: number, B: number): string | null {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  const r = gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const b = gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

  if (![r, g, b].every((channel) => Number.isFinite(channel) && channel >= -0.001 && channel <= 1.001)) return null;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** WCAG contrast ratio (1–21). */
export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const { r, g, b: blue } = hexToRgb(hex);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(blue);
  };
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

const hueDistance = (a: number, b: number) => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};

const oklabDistance = (a: Oklch, b: Oklch) => {
  const ah = (a.h * Math.PI) / 180;
  const bh = (b.h * Math.PI) / 180;
  const x = Math.cos(ah) * a.c - Math.cos(bh) * b.c;
  const y = Math.sin(ah) * a.c - Math.sin(bh) * b.c;
  const z = a.l - b.l;
  return Math.sqrt(x * x + y * y + z * z);
};

/* ------------------------------------------------------------------ naming */

const HUE_NAMES: { max: number; name: string }[] = [
  { max: 14, name: 'Red' },
  { max: 32, name: 'Rust' },
  { max: 45, name: 'Amber' },
  { max: 62, name: 'Ochre' },
  { max: 80, name: 'Lime' },
  { max: 105, name: 'Green' },
  { max: 135, name: 'Sage' },
  { max: 165, name: 'Moss' },
  { max: 195, name: 'Teal' },
  { max: 215, name: 'Cyan' },
  { max: 245, name: 'Blue' },
  { max: 265, name: 'Indigo' },
  { max: 288, name: 'Violet' },
  { max: 315, name: 'Purple' },
  { max: 335, name: 'Magenta' },
  { max: 355, name: 'Rose' },
  { max: 361, name: 'Red' },
];

export function nameFor(value: Oklch) {
  const base = HUE_NAMES.find((entry) => value.h < entry.max)?.name ?? 'Grey';
  if (value.c < 0.02) {
    if (value.l > 0.92) return 'Paper';
    if (value.l > 0.72) return 'Bone';
    if (value.l > 0.45) return 'Fog';
    if (value.l > 0.22) return 'Ash';
    return 'Night';
  }
  const prefix =
    value.l >= 0.88 ? 'Pale' : value.l >= 0.78 ? 'Pastel' : value.l >= 0.66 ? 'Soft' : value.l <= 0.28 ? 'Deep' : value.c >= 0.18 ? 'Vivid' : '';
  return prefix ? `${prefix} ${base}` : base;
}

/* ------------------------------------------------------------------ fitting */

export interface PaletteEntry {
  name: string;
  hex: string;
  role: string;
}

export function paletteFit(hex: string, palette: PaletteEntry[]) {
  const colour = hexToOklch(hex);
  if (!palette.length) return { score: 88, note: 'starts the palette' };

  let nearest = palette[0];
  let nearestHue = 180;
  let darkest = palette[0];
  for (const entry of palette) {
    const other = hexToOklch(entry.hex);
    const distance = hueDistance(colour.h, other.h);
    if (distance < nearestHue) {
      nearestHue = distance;
      nearest = entry;
    }
    if (other.l < hexToOklch(darkest.hex).l) darkest = entry;
  }

  let hueScore: number;
  let note: string;
  if (nearestHue < 8) {
    hueScore = 0.3;
    note = `almost the same hue as ${nearest.name}`;
  } else if (nearestHue <= 45) {
    hueScore = 1;
    note = `sibling of ${nearest.name}`;
  } else if (nearestHue <= 95) {
    hueScore = 0.55;
    note = `loose neighbour of ${nearest.name}`;
  } else if (nearestHue >= 140) {
    hueScore = 0.92;
    note = `counterpoint to ${nearest.name}`;
  } else {
    hueScore = 0.7;
    note = `works beside ${nearest.name}`;
  }

  const lightnessGap = Math.abs(colour.l - hexToOklch(nearest.hex).l);
  const lightScore = clamp(lightnessGap * 2.4, 0, 1);
  const ratio = contrastRatio(hex, darkest.hex);
  const contrastScore = clamp((ratio - 1.5) / 2.6, 0, 1);

  const score = Math.round(100 * (0.44 * hueScore + 0.24 * lightScore + 0.32 * contrastScore));
  return { score: clamp(score, 5, 99), note };
}

/* ------------------------------------------------------------------ search */

const NAMED: { name: string; hex: string; keywords?: string }[] = [
  { name: 'Midnight', hex: '#08070b' },
  { name: 'Ink', hex: '#11101a' },
  { name: 'Charcoal', hex: '#26232e' },
  { name: 'Slate', hex: '#4a4757' },
  { name: 'Fog', hex: '#8792a6' },
  { name: 'Silver', hex: '#c9c6d1' },
  { name: 'Bone', hex: '#efe7da' },
  { name: 'Ivory', hex: '#f6f1e7' },
  { name: 'Lavender', hex: '#b9a5e8' },
  { name: 'Lilac', hex: '#cbbcf2' },
  { name: 'Violet', hex: '#6b54a6' },
  { name: 'Plum', hex: '#5a3f6b' },
  { name: 'Mauve', hex: '#a4809e' },
  { name: 'Orchid', hex: '#c98bd1' },
  { name: 'Grape', hex: '#4b2e63' },
  { name: 'Rust', hex: '#c86a4a', keywords: 'warm earthy' },
  { name: 'Clay', hex: '#b16e56', keywords: 'earthy' },
  { name: 'Terracotta', hex: '#c46a4f', keywords: 'earthy warm' },
  { name: 'Wound', hex: '#c0455a' },
  { name: 'Brick', hex: '#9d3f38' },
  { name: 'Ember', hex: '#e06a3b' },
  { name: 'Amber', hex: '#e0a03c' },
  { name: 'Honey', hex: '#d9a95c', keywords: 'earthy warm' },
  { name: 'Mustard', hex: '#c9a227', keywords: 'vintage' },
  { name: 'Ochre', hex: '#b8873f', keywords: 'earthy vintage' },
  { name: 'Sand', hex: '#e2d3b6', keywords: 'pastel earthy' },
  { name: 'Moss', hex: '#7e9c94', keywords: 'calm earthy' },
  { name: 'Sage', hex: '#a8b79f', keywords: 'pastel calm earthy' },
  { name: 'Olive', hex: '#7c7a45', keywords: 'earthy vintage' },
  { name: 'Forest', hex: '#2f4a3a' },
  { name: 'Pine', hex: '#22362f' },
  { name: 'Jade', hex: '#3f9b7a' },
  { name: 'Mint', hex: '#bfe6d2', keywords: 'pastel' },
  { name: 'Teal', hex: '#2b6f74' },
  { name: 'Petrol', hex: '#25566b' },
  { name: 'Cyan', hex: '#39b7d6', keywords: 'bright' },
  { name: 'Denim', hex: '#46638f', keywords: 'vintage' },
  { name: 'Indigo', hex: '#3c3f7a' },
  { name: 'Navy', hex: '#1b2036' },
  { name: 'Cobalt', hex: '#2a55c4', keywords: 'bright' },
  { name: 'Steel', hex: '#6f7f95' },
  { name: 'Dust', hex: '#b7a9a0', keywords: 'muted vintage' },
  { name: 'Blush', hex: '#e8c3c6', keywords: 'pastel' },
  { name: 'Rose', hex: '#c96b74' },
  { name: 'Cherry', hex: '#a3253c' },
  { name: 'Wine', hex: '#5c2333' },
  { name: 'Peach', hex: '#f0c4a8', keywords: 'pastel warm' },
  { name: 'Butter', hex: '#f2e2a6', keywords: 'pastel warm' },
  { name: 'Sky', hex: '#b7d3ea', keywords: 'pastel' },
  { name: 'Powder', hex: '#cfd8e8', keywords: 'pastel' },
  { name: 'Paper', hex: '#f4f1ea', keywords: 'pastel neutral' },
  { name: 'Night', hex: '#0b0a10' },
  { name: 'Dusk', hex: '#2b2238' },
];

const HUE_FAMILIES: { keywords: string[]; hue: number }[] = [
  { keywords: ['red', 'rot', 'scarlet'], hue: 8 },
  { keywords: ['rust', 'terracotta', 'clay', 'orange', 'ember'], hue: 32 },
  { keywords: ['amber', 'honey', 'gold', 'marigold'], hue: 70 },
  { keywords: ['yellow', 'mustard', 'butter', 'lemon'], hue: 95 },
  { keywords: ['lime', 'chartreuse'], hue: 120 },
  { keywords: ['green', 'grass', 'forest'], hue: 145 },
  { keywords: ['sage', 'moss', 'olive', 'pine'], hue: 160 },
  { keywords: ['teal', 'petrol', 'turquoise'], hue: 190 },
  { keywords: ['cyan', 'aqua', 'ice'], hue: 210 },
  { keywords: ['blue', 'denim', 'steel', 'sky'], hue: 245 },
  { keywords: ['indigo', 'navy', 'cobalt'], hue: 265 },
  { keywords: ['violet', 'lavender', 'lilac', 'purple', 'orchid'], hue: 300 },
  { keywords: ['magenta', 'fuchsia', 'grape'], hue: 325 },
  { keywords: ['rose', 'pink', 'blush', 'wound', 'cherry', 'wine'], hue: 350 },
  { keywords: ['brown', 'wood', 'chocolate', 'coffee'], hue: 50 },
];

const MOOD_KEYWORDS: { mood: Mood; keywords: string[] }[] = [
  { mood: 'pastel', keywords: ['pastel', 'pale', 'soft', 'light', 'zart', 'hell'] },
  { mood: 'muted', keywords: ['muted', 'dusty', 'dull', 'gedämpft', 'grau', 'subtle', 'quiet'] },
  { mood: 'dark', keywords: ['dark', 'deep', 'dunkel', 'night', 'tief', 'shadow'] },
  { mood: 'bright', keywords: ['bright', 'klar', 'clear', 'saturated', 'lebendig'] },
  { mood: 'neon', keywords: ['neon', 'loud', 'acid', 'grell', 'vivid', 'fluorescent'] },
  { mood: 'earthy', keywords: ['earthy', 'earth', 'erdig', 'natural', 'natural', 'clay', 'organic'] },
  { mood: 'vintage', keywords: ['vintage', 'retro', 'faded', 'print', 'sepia', 'washed'] },
];

export interface SearchInput {
  query: string;
  mood: Mood;
  scheme: Scheme;
  seedHex: string;
  lightness: [number, number];
  chroma: [number, number];
  palette: PaletteEntry[];
  limit?: number;
}

export interface SearchResult {
  swatches: Swatch[];
  /** Human readable summary of what the search understood. */
  readback: string;
}

/** The heart of the module: parse, generate, filter, rank. */
export function search(input: SearchInput): SearchResult {
  const tokens = input.query
    .toLowerCase()
    .split(/[\s,+/]+/)
    .filter(Boolean);

  let mood: Mood = input.mood;
  let scheme: Scheme = input.scheme;
  let hueHint: number | null = null;
  const nameHits = new Set<string>();

  for (const token of tokens) {
    const moodHit = MOOD_KEYWORDS.find((entry) => entry.keywords.some((keyword) => token.startsWith(keyword)));
    if (moodHit) mood = moodHit.mood;

    const family = HUE_FAMILIES.find((entry) => entry.keywords.some((keyword) => token.startsWith(keyword)));
    if (family) hueHint = family.hue;

    const named = NAMED.find((entry) => entry.name.toLowerCase().startsWith(token));
    if (named) nameHits.add(named.hex);
    if (token === 'complement' || token === 'komplementär' || token === 'gegenfarbe') scheme = 'complementary';
    if (token === 'analog' || token === 'nachbar' || token === 'similar') scheme = 'analogous';
    if (token === 'triad' || token === 'triade') scheme = 'triad';
    if (token === 'mono' || token === 'monochrom') scheme = 'mono';
    if (token === 'split') scheme = 'split';
  }

  const seed = hexToOklch(isHex(input.seedHex) ? input.seedHex : '#b9a5e8');
  const baseHue = hueHint ?? seed.h;

  /**
   * If the query names a hue family or a harmony, the candidate hues are
   * *restricted* to a band around it – otherwise "muted moss" would happily
   * return muted roses just because they score well.
   */
  const wanted = new Set<number>();
  if (hueHint !== null) {
    harmonyHues(hueHint, scheme === 'any' ? 'mono' : scheme, seed).forEach((hue) => wanted.add(Math.round(hue)));
  } else if (scheme !== 'any') {
    harmonyHues(seed.h, scheme, seed).forEach((hue) => wanted.add(Math.round(hue)));
  }

  const tolerance = scheme === 'mono' ? 10 : 16;
  const allowedHue = (hue: number) =>
    wanted.size === 0 || [...wanted].some((entry) => hueDistance(hue, entry) <= tolerance);

  /* candidate hues: the wanted band (if any) + palette relatives + free grid */
  const hues = new Set<number>();
  if (wanted.size) {
    for (const entry of wanted) {
      for (let step = -tolerance; step <= tolerance; step += 5) hues.add((entry + step + 360) % 360);
    }
  } else {
    for (let hue = 0; hue < 360; hue += 12) hues.add(hue);
    for (const entry of input.palette) {
      const value = hexToOklch(entry.hex);
      hues.add(value.h);
      hues.add((value.h + 180) % 360);
    }
  }

  const ranges = mood === 'any' ? null : MOOD_RANGES[mood];
  /* naming a hue family without a mood ("sage", "rust") implies a usable tone,
     not the extreme corner of that hue – so we run it through a natural corridor */
  const natural = mood === 'any' && hueHint !== null;
  const lightness = ranges ? ranges.l : natural ? [0.42, 0.86] : input.lightness;
  const chroma = ranges ? ranges.c : natural ? [0.03, 0.13] : input.chroma;
  const hueWindow = ranges?.hue;

  const candidates: Swatch[] = [];

  const push = (value: Oklch) => {
    if (!allowedHue(value.h)) return;
    if (value.l < lightness[0] || value.l > lightness[1]) return;
    if (value.c < chroma[0] || value.c > chroma[1]) return;
    if (hueWindow) {
      const low = hueWindow[0];
      const high = hueWindow[1];
      if (high >= low ? value.h < low || value.h > high : value.h < low && value.h > high) return;
    }
    const hex = oklchToHex(value);
    const solid = hexToOklch(hex);
    if (oklabDistance(solid, value) > 0.045) return; // gamut clamp went too far
    if (candidates.some((entry) => entry.hex === hex)) return;
    const { score, note } = paletteFit(hex, input.palette);
    /* a mild taste prior: nobody asked for acid green when they typed "sage" */
    const comfort =
      mood === 'neon' || mood === 'bright'
        ? 1
        : 1 - Math.max(0, solid.c - 0.15) * 2.4 - Math.max(0, solid.l - 0.94) * 3;
    candidates.push({ hex, name: nameFor(solid), fit: Math.round(score * clamp(comfort, 0.45, 1)), note, ...solid });
  };

  for (const hex of nameHits) {
    const value = hexToOklch(hex);
    const { score, note } = paletteFit(hex, input.palette);
    const named = NAMED.find((entry) => entry.hex === hex)!;
    candidates.push({ hex, name: named.name, fit: 100, note: 'exact name match', ...value });
  }

  for (const hue of hues) {
    for (let l = lightness[0]; l <= lightness[1] + 0.001; l += 0.05) {
      for (let c = chroma[0]; c <= chroma[1] + 0.001; c += 0.018) {
        push({ l: Math.min(1, l), c, h: hue });
      }
    }
  }

  const limit = input.limit ?? 40;
  const seen = new Set<string>();
  const ranked = candidates
    .filter((entry) => {
      if (seen.has(entry.hex)) return false;
      seen.add(entry.hex);
      return true;
    })
    .sort((a, b) => b.fit - a.fit || b.c - a.c);

  /** Round-robin over the wanted hues so a two-colour harmony actually shows both. */
  const swatches: Swatch[] = [];
  if (wanted.size > 1) {
    const buckets = new Map<number, Swatch[]>();
    for (const hue of wanted) buckets.set(hue, []);
    for (const entry of ranked) {
      let nearest = [...wanted][0];
      let distance = 999;
      for (const hue of wanted) {
        const current = hueDistance(entry.h, hue);
        if (current < distance) {
          distance = current;
          nearest = hue;
        }
      }
      buckets.get(nearest)!.push(entry);
    }
    let progressed = true;
    while (swatches.length < limit && progressed) {
      progressed = false;
      for (const list of buckets.values()) {
        const next = list.shift();
        if (next) {
          swatches.push(next);
          progressed = true;
          if (swatches.length >= limit) break;
        }
      }
    }
  } else {
    swatches.push(...ranked.slice(0, limit));
  }

  const moodLabel = MOODS.find((entry) => entry.value === mood)?.label ?? 'Any';
  const schemeLabel = SCHEMES.find((entry) => entry.value === scheme)?.label ?? 'Any';
  const hueLabel = hueHint !== null ? nameFor({ l: 0.6, c: 0.1, h: hueHint }) : null;
  const bandWidth = tolerance;

  const readback = [
    hueLabel ? `${hueLabel.toLowerCase()} ±${bandWidth}°` : null,
    mood !== 'any' ? moodLabel.toLowerCase() : natural ? 'natural tone' : null,
    scheme !== 'any' ? `${schemeLabel.toLowerCase()} harmony` : null,
    `L ${Math.round(lightness[0] * 100)}–${Math.round(lightness[1] * 100)}`,
    `C ${chroma[0].toFixed(2)}–${chroma[1].toFixed(2)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return { swatches, readback };
}

export function harmonyHues(seedHue: number, scheme: Scheme, seed?: Oklch): number[] {
  switch (scheme) {
    case 'analogous':
      return [(seedHue + 330) % 360, seedHue, (seedHue + 30) % 360, (seedHue + 60) % 360];
    case 'complementary':
      return [seedHue, (seedHue + 180) % 360];
    case 'split':
      return [seedHue, (seedHue + 150) % 360, (seedHue + 210) % 360];
    case 'triad':
      return [seedHue, (seedHue + 120) % 360, (seedHue + 240) % 360];
    case 'tetrad':
      return [seedHue, (seedHue + 90) % 360, (seedHue + 180) % 360, (seedHue + 270) % 360];
    case 'mono':
      return [seedHue];
    default:
      return [seedHue];
  }
}

/* -------------------------------------------------------------- palette gen */

export interface GeneratedPalette {
  colors: PaletteEntry[];
  mood: Mood;
  scheme: Scheme;
}

/** Where the primary should land per mood – a dark mood must not make the button dark. */
const SET_TUNING: Record<Mood, { l: number; c: number }> = {
  any: { l: 0.72, c: 0.11 },
  pastel: { l: 0.87, c: 0.07 },
  muted: { l: 0.72, c: 0.05 },
  dark: { l: 0.62, c: 0.09 },
  bright: { l: 0.7, c: 0.17 },
  neon: { l: 0.81, c: 0.24 },
  earthy: { l: 0.6, c: 0.08 },
  vintage: { l: 0.79, c: 0.07 },
};

/**
 * Builds a full, usable palette from one seed: night, ink, dusk, primary, accent,
 * bone and signal. The seed hue stays the primary – the harmony only decides the
 * accent and the signal colour.
 */
export function generatePalette(seedHex: string, mood: Mood, scheme: Scheme): GeneratedPalette {
  const seed = hexToOklch(isHex(seedHex) ? seedHex : '#b9a5e8');
  const activeScheme: Scheme = scheme === 'any' ? 'analogous' : scheme;
  const harmony = harmonyHues(seed.h, activeScheme, seed);
  const neighbours = harmony.filter((hue) => hueDistance(hue, seed.h) > 4);
  const accentHue = neighbours[0] ?? (seed.h + 180) % 360;
  const signalHue = neighbours[1] ?? (seed.h + 120) % 360;
  const tuning = SET_TUNING[mood];

  const primary: Oklch = { h: seed.h, l: tuning.l, c: tuning.c };
  const accent: Oklch = { h: accentHue, l: Math.max(0.32, tuning.l - 0.08), c: tuning.c * 0.92 };
  const signal: Oklch = { h: signalHue, l: 0.6, c: Math.max(0.14, tuning.c * 1.25) };

  const colors: PaletteEntry[] = [
    { name: 'Night', hex: oklchToHex({ h: seed.h, l: 0.08, c: 0.014 }), role: 'base' },
    { name: 'Ink', hex: oklchToHex({ h: seed.h, l: 0.17, c: 0.03 }), role: 'base' },
    { name: 'Dusk', hex: oklchToHex({ h: accentHue, l: 0.3, c: 0.05 }), role: 'deep' },
    { name: nameFor(primary), hex: oklchToHex(primary), role: 'primary' },
    { name: nameFor(accent), hex: oklchToHex(accent), role: 'accent' },
    { name: 'Bone', hex: oklchToHex({ h: (seed.h + 32) % 360, l: 0.93, c: 0.019 }), role: 'paper' },
    { name: nameFor(signal), hex: oklchToHex(signal), role: 'signal' },
  ];

  return { colors, mood, scheme: activeScheme };
}

/** Pastel / muted / dark ladder of one colour – the "give me versions of this" button. */
export function ladder(hex: string): Swatch[] {
  const base = hexToOklch(hex);
  const steps: { l: number; c: number; label: string }[] = [
    { l: 0.94, c: base.c * 0.3, label: 'paper' },
    { l: 0.86, c: base.c * 0.45, label: 'pastel' },
    { l: 0.74, c: base.c * 0.7, label: 'soft' },
    { l: base.l, c: base.c, label: 'base' },
    { l: Math.max(0.18, base.l * 0.72), c: base.c * 0.95, label: 'deep' },
    { l: Math.max(0.1, base.l * 0.45), c: base.c * 0.8, label: 'night' },
  ];
  return steps.map((step) => {
    const value = { l: step.l, c: step.c, h: base.h };
    const solid = hexToOklch(oklchToHex(value));
    return { hex: oklchToHex(value), name: nameFor(solid), fit: 80, note: step.label, ...solid };
  });
}

export const hexLabel = (hex: string) => hex.toUpperCase();
