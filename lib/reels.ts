/**
 * Shared vocabulary of the Reel Machine.
 *
 * Everything here is deliberately platform-aware: 1080×1920, 30 fps and the
 * safe zones Meta publishes for Reels/Stories (top 14 %, bottom 35 %, 6 % per
 * side). The renderer turns exactly these numbers into ffmpeg filters, the
 * preview into CSS – so what you see is what the export looks like.
 */

export const REEL_W = 1080;
export const REEL_H = 1920;
export const REEL_FPS = 30;

/** Meta's guidance for vertical placements, in pixels of a 1080×1920 frame. */
export const REEL_SAFE = {
  top: Math.round(REEL_H * 0.14),
  bottom: Math.round(REEL_H * 0.35),
  side: Math.round(REEL_W * 0.06),
};

export const REEL_MAX_SECONDS = 60;

export type ReelMotion = 'none' | 'in' | 'out';
export type ReelGrade = 'none' | 'film' | 'mono' | 'bleed';
export type ReelTextStyle = 'block' | 'serif' | 'mono';
export type ReelTextPlace = 'top' | 'middle' | 'low';

export interface ReelClip {
  mediaId: number;
  /** Trim offset inside the source clip (seconds). */
  start: number;
  /** Length on the reel timeline (seconds). */
  duration: number;
  motion: ReelMotion;
}

export interface ReelLook {
  grade: ReelGrade;
  /** 0–30, maps to ffmpeg `noise=alls`. */
  grain: number;
  /** 0–1, maps to ffmpeg `vignette`. */
  vignette: number;
  fadeOut: boolean;
  /** Accent flash on every detected beat. */
  flash: boolean;
  /** Cut the clips on the beat grid instead of equal shares. */
  beatCut: boolean;
  /** Accent used for flashes – read from the CI at build time. */
  accent: string;
}

export interface ReelText {
  kicker: string;
  hook: string;
  sub: string;
  style: ReelTextStyle;
  align: 'left' | 'center';
  place: ReelTextPlace;
  showHandle: boolean;
}

export interface ReelPlan {
  title: string;
  clips: ReelClip[];
  audio: { mediaId: number; start: number; duration: number };
  look: ReelLook;
  text: ReelText;
  /** Beat positions in reel-relative seconds (0 = first frame). */
  beats: number[];
  /** Where the cover frame is grabbed (seconds). */
  coverAt: number;
}

export interface ReelPreset {
  id: string;
  label: string;
  hint: string;
  /** Target length in seconds. */
  duration: number;
  grade: ReelGrade;
  grain: number;
  vignette: number;
  motion: ReelMotion;
  flash: boolean;
  fadeOut: boolean;
}

export const REEL_PRESETS: ReelPreset[] = [
  {
    id: 'loop',
    label: 'Loop',
    hint: '8 s, ein Clip, weiches Ausblenden',
    duration: 8,
    grade: 'none',
    grain: 6,
    vignette: 0.25,
    motion: 'in',
    flash: false,
    fadeOut: true,
  },
  {
    id: 'teaser',
    label: 'Drop Teaser',
    hint: '15 s, Schnitt auf Beats, Akzent-Blitz',
    duration: 15,
    grade: 'film',
    grain: 10,
    vignette: 0.45,
    motion: 'in',
    flash: true,
    fadeOut: true,
  },
  {
    id: 'live',
    label: 'Live Cut',
    hint: '20 s, hartes Mono, mehr Korn',
    duration: 20,
    grade: 'mono',
    grain: 18,
    vignette: 0.6,
    motion: 'out',
    flash: true,
    fadeOut: true,
  },
  {
    id: 'trailer',
    label: 'Single Trailer',
    hint: '30 s, Film-Look, volle Hook',
    duration: 30,
    grade: 'film',
    grain: 12,
    vignette: 0.5,
    motion: 'in',
    flash: true,
    fadeOut: true,
  },
];

export const REEL_DURATIONS = [8, 15, 20, 30, 45, 60];

export const GRADE_LABEL: Record<ReelGrade, string> = {
  none: 'Raw',
  film: 'Film',
  mono: 'Mono',
  bleed: 'Bleed',
};

/**
 * Splits a target duration into clip lengths. When beats are available the
 * boundaries snap to the grid (with a minimum shot length), otherwise the
 * clips share the time equally. Returns lengths – the plan builder turns them
 * into `ReelClip.duration`.
 */
export function planClipLengths(
  clipCount: number,
  target: number,
  beats: number[],
  useBeats: boolean
): number[] {
  if (clipCount <= 0) return [];
  const even = () => {
    const base = target / clipCount;
    return Array.from({ length: clipCount }, (_, index) =>
      index === clipCount - 1 ? target - base * (clipCount - 1) : base
    );
  };
  if (!useBeats || beats.length < 4 || clipCount === 1) return even();

  const min = Math.min(1.1, target / clipCount);
  const usable = beats.filter((beat) => beat > 0.25 && beat < target - 0.25);
  if (usable.length < clipCount - 1) return even();

  const lengths: number[] = [];
  let cursor = 0;
  for (let index = 1; index < clipCount; index++) {
    const wanted = (target / clipCount) * index;
    let best = usable[0];
    for (const beat of usable) {
      if (Math.abs(beat - wanted) < Math.abs(best - wanted)) best = beat;
    }
    const snapped = Math.max(cursor + min, Math.min(best, target - min * (clipCount - index)));
    lengths.push(snapped - cursor);
    cursor = snapped;
  }
  lengths.push(target - cursor);
  return lengths;
}

/** Nearest beat to a point in time (or the point itself when there is none). */
export function snapToBeat(value: number, beats: number[], tolerance = 0.35) {
  let best = value;
  let distance = tolerance;
  for (const beat of beats) {
    const diff = Math.abs(beat - value);
    if (diff < distance) {
      distance = diff;
      best = beat;
    }
  }
  return best;
}
