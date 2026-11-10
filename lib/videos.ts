import { LYRIC_PARTS } from './kinds';
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
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

export function durationLabel(seconds: number) {
  const safe = Math.max(0, Number(seconds) || 0);
  if (safe < 60) return `${safe.toFixed(1)} s`;
  return `${Math.floor(safe / 60)}:${String(Math.round(safe % 60)).padStart(2, '0')}`;
}

/** Plain text lines from a treatment document – one block per shot idea. */
export function linesFromDocument(document: BandDocument) {
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

  const fromText = String(document.plainText ?? '')
    .split(/\r?\n+/)
    .map(clean)
    .filter((line) => line.length > 2);
  if (fromText.length) return fromText;
  return [...String(document.content ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => clean(match[1]))
    .filter((line) => line.length > 2);
}
