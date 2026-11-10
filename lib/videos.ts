import { LYRIC_PARTS, guessPartKind } from './kinds';
import type { BandDocument, ShotStatus, VideoStatus } from './types';

export const VIDEO_STATUS: { value: VideoStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'preproduction', label: 'Pre-production' },
  { value: 'shoot', label: 'Shoot' },
  { value: 'edit', label: 'Edit' },
  { value: 'done', label: 'Done' },
];

export const SHOT_STATUS: { value: ShotStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'scouted', label: 'Scouted' },
  { value: 'ready', label: 'Ready' },
  { value: 'shot', label: 'Shot' },
  { value: 'edited', label: 'Edited' },
];

export const SHOT_SECTIONS = [
  ...LYRIC_PARTS.map((part) => ({ value: part.value as string, label: part.label as string })),
  { value: 'other', label: 'Other' },
];

export const SHOT_TYPES = ['Wide', 'Medium', 'Close-up', 'Detail', 'Insert', 'POV', 'Drone', 'Crowd'];
export const CAMERA_MOVES = ['Static', 'Handheld', 'Push in', 'Pull out', 'Pan', 'Tilt', 'Tracking', 'Dolly', 'Crane'];
export const LIGHTING_OPTIONS = ['Natural', 'Low key', 'Backlit', 'Practical', 'Strobe', 'Silhouette', 'Dark'];

export const videoStatusLabel = (value: string) =>
  VIDEO_STATUS.find((entry) => entry.value === value)?.label ?? value;
export const shotStatusLabel = (value: string) =>
  SHOT_STATUS.find((entry) => entry.value === value)?.label ?? value;
export const sectionLabel = (value: string) =>
  SHOT_SECTIONS.find((entry) => entry.value === value)?.label ?? value;

/** `0:12.4` – music-video timing is in seconds, not frame-accurate timecode yet. */
export function timecode(seconds: number) {
  const safe = Math.round(Math.max(0, Number(seconds) || 0) * 10) / 10;
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

export function durationLabel(seconds: number) {
  const safe = Math.max(0, Number(seconds) || 0);
  if (safe < 60) return `${safe.toFixed(1)} s`;
  const whole = Math.round(safe);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const SECTION_HEADING =
  /^(intro|verse|pre[- ]?chorus|chorus|bridge|breakdown|solo|outro|refrain|hook)\b[\s\d:.\-–—]*$/i;

type DocLine = { text: string; section: string | null };

/** Plain text lines from a treatment document, with the section they sit under. */
export function blocksFromDocument(document: BandDocument): DocLine[] {
  const clean = (value: string) =>
    String(value ?? '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

  const raw = String(document.plainText ?? '')
    .split(/\r?\n+/)
    .map(clean)
    .filter((line) => line.length > 2);
  const lines = raw.length
    ? raw
    : [...String(document.content ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((match) => clean(match[1]))
        .filter((line) => line.length > 2);

  const blocks: DocLine[] = [];
  let section: string | null = null;
  for (const line of lines) {
    if (SECTION_HEADING.test(line)) {
      section = guessPartKind(line);
      continue;
    }
    blocks.push({ text: line, section });
  }
  return blocks;
}

/** Plain text lines from a treatment document – one block per shot idea. */
export function linesFromDocument(document: BandDocument) {
  return blocksFromDocument(document).map((line) => line.text);
}
