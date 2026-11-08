import type { PaletteColor } from './types';

/**
 * CI “Bruised Bloom” – emotional post-hardcore.
 *
 * Idea: black stage, lavender haze, warm bone paper from flyers,
 * rust on the amp, a wound that never quite closes – and in between
 * cold moss/fog grey-green as a calm counterweight.
 */
export const DEFAULT_PALETTE: PaletteColor[] = [
  { name: 'Night', hex: '#08070b', role: 'base' },
  { name: 'Ash', hex: '#16121e', role: 'base' },
  { name: 'Dusk', hex: '#2b2238', role: 'deep' },
  { name: 'Lavender', hex: '#b9a5e8', role: 'primary' },
  { name: 'Violet', hex: '#6b54a6', role: 'accent' },
  { name: 'Bone', hex: '#efe7da', role: 'paper' },
  { name: 'Rust', hex: '#c86a4a', role: 'warm' },
  { name: 'Wound', hex: '#c0455a', role: 'signal' },
  { name: 'Moss', hex: '#7e9c94', role: 'calm' },
  { name: 'Fog', hex: '#8792a6', role: 'neutral' },
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
export const UTILITY_COLORS = ['#000000', '#ffffff', '#9a91b2', '#3a3350'];

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
  const value = isHex(hex) ? hex.trim() : '#b9a5e8';
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

export const DEFAULT_ACCENT = '#b9a5e8';

/** Second CI colour. `null` = derived automatically from the primary accent. */
export type SecondaryAccent = string | null;

/**
 * Everything the design system needs from one accent hex – the whole UI follows
 * the colour picked in Settings. A second colour is optional: without it the
 * secondary accent is simply a darker shade of the first one.
 */
export function accentTokens(hex: string, hex2?: SecondaryAccent): Record<string, string> {
  const base = isHex(hex) ? hex.trim().toLowerCase() : DEFAULT_ACCENT;
  const second = hex2 && isHex(hex2) ? hex2.trim().toLowerCase() : shade(base, 0.14);
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
