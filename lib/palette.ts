import type { PaletteColor } from './types';
import { hexToOklch, oklchToHex } from './colorlab';

/**
 * CI “Ash / Sulfur” – emotional post-hardcore from Augsburg.
 *
 * Warm black, soot, ash and bone – almost no colour. One pale sulfur signal
 * (a washed-out acid yellow, not the pastel pink everyone uses) carries
 * interaction and kickers; rust and wound stay in the print layer.
 */
export const DEFAULT_PALETTE: PaletteColor[] = [
  { name: 'Night', hex: '#080808', role: 'base' },
  { name: 'Soot', hex: '#111010', role: 'base' },
  { name: 'Ash', hex: '#1a1918', role: 'deep' },
  { name: 'Umbra', hex: '#262422', role: 'deep' },
  { name: 'Sulfur', hex: '#e2e29c', role: 'primary' },
  { name: 'Smoke', hex: '#a49c92', role: 'neutral' },
  { name: 'Steel', hex: '#6f6a64', role: 'neutral' },
  { name: 'Bone', hex: '#e7e0d6', role: 'paper' },
  { name: 'Rust', hex: '#553b34', role: 'warm' },
  { name: 'Wound', hex: '#43282b', role: 'signal' },
  { name: 'Moss', hex: '#474b44', role: 'calm' },
];

export const PALETTE_ROLES = [
  { value: 'base', label: 'Base (dark)' },
  { value: 'deep', label: 'Depth' },
  { value: 'primary', label: 'Primary' },
  { value: 'accent', label: 'Accent' },
  { value: 'paper', label: 'Paper / light' },
  { value: 'warm', label: 'Warm' },
  { value: 'signal', label: 'Signal' },
  { value: 'calm', label: 'Calm' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'custom', label: 'Custom' },
];

export const roleLabel = (role: string) =>
  PALETTE_ROLES.find((item) => item.value === role)?.label ?? role;

/** Neutral utilities that should always be available. */
export const UTILITY_COLORS = ['#000000', '#ffffff', '#a49c92', '#6f6a64'];

export const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());

export const isLightHex = (value: string) => {
  if (!isHex(value)) return false;
  const hex = value.trim();
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};

/* ------------------------------------------------- app accent (UI colour) */

const toRgb = (hex: string) => {
  const value = isHex(hex) ? hex.trim() : '#e2e29c';
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
};

const shade = (hex: string, amount: number) => {
  const { r, g, b } = toRgb(hex);
  const mix = (channel: number) => Math.round(channel * (1 - amount));
  return `#${[mix(r), mix(g), mix(b)].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

const alpha = (hex: string, value: number) => {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${value})`;
};

const rgbTriple = (hex: string) => {
  const { r, g, b } = toRgb(hex);
  return `${r} ${g} ${b}`;
};

export const DEFAULT_ACCENT = '#e2e29c';

/**
 * Second CI colour. `null` = derived from the primary accent: a *visible*
 * sibling (hue +26°, a touch lighter, a bit less chroma) so the second colour
 * is recognisable as its own tone and not a second helping of the first one.
 */
export type SecondaryAccent = string | null;

function siblingAccent(hex: string) {
  const { l, c, h } = hexToOklch(hex);
  return oklchToHex({
    l: Math.min(0.94, l * 1.04 + 0.03),
    c: Math.max(0.006, c * 0.82),
    h: (h + 26) % 360,
  });
}

/**
 * Everything the design system needs from one accent hex – the whole UI follows
 * the colour picked in Settings. A second colour is optional: without it the
 * secondary accent is simply a darker shade of the first one.
 */
export function accentTokens(hex: string, hex2?: SecondaryAccent): Record<string, string> {
  const base = isHex(hex) ? hex.trim().toLowerCase() : DEFAULT_ACCENT;
  const second = hex2 && isHex(hex2) ? hex2.trim().toLowerCase() : siblingAccent(base);
  return {
    '--accent': base,
    '--accent-rgb': rgbTriple(base),
    '--accent-2': second,
    '--accent-2-rgb': rgbTriple(second),
    '--accent-2-deep': shade(second, 0.32),
    '--accent-2-soft': alpha(second, 0.14),
    '--accent-deep': shade(base, 0.4),
    '--accent-soft': alpha(base, 0.12),
    '--accent-glow': alpha(base, 0.32),
    '--shadow-accent': `0 24px 60px -28px ${alpha(base, 0.55)}`,
    '--line': alpha(base, 0.1),
    '--line-strong': alpha(base, 0.26),
  };
}

/** Renders the accent tokens as a stylesheet for the server-rendered layout. */
export function accentCss(hex: string, hex2?: SecondaryAccent) {
  const entries = Object.entries(accentTokens(hex, hex2)).map(([key, value]) => `${key}:${value}`);
  return `:root{${entries.join(';')}}`;
}

/** Applies the accent live in the browser (no reload needed). */
export function applyAccent(hex: string, hex2?: SecondaryAccent) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(accentTokens(hex, hex2))) {
    root.style.setProperty(key, value);
  }
}
