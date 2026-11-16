import { LYRIC_PARTS, guessPartKind } from './kinds';
import type { BandDocument, ShotStatus, VideoShot, VideoStatus } from './types';

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

/**
 * "Wirkung" instead of cinematography. One choice in the simple editor sets the
 * three technical fields, so a non-videographer never has to think in shot lists.
 */
export const SHOT_MOODS: {
  value: string;
  label: string;
  hint: string;
  shotType: string;
  movement: string;
  lighting: string;
}[] = [
  { value: 'still', label: 'Still und weit', hint: 'Totale, ruhige Kamera – Raum atmen lassen.', shotType: 'Wide', movement: 'Static', lighting: 'Natural' },
  { value: 'nah', label: 'Ganz nah', hint: 'Close-up, nichts bewegt sich – Gesicht, Hände, Mund.', shotType: 'Close-up', movement: 'Static', lighting: 'Low key' },
  { value: 'hand', label: 'Handkamera', hint: 'Nah dran und unruhig, als wärst du dabei.', shotType: 'Medium', movement: 'Handheld', lighting: 'Practical' },
  { value: 'dunkel', label: 'Dunkel / Silhouette', hint: 'Gegenlicht, Körper als Schatten.', shotType: 'Medium', movement: 'Static', lighting: 'Silhouette' },
  { value: 'licht', label: 'Hartes Licht', hint: 'Kanten, Staub, Kontrast – Blitz oder Scheinwerfer.', shotType: 'Close-up', movement: 'Push in', lighting: 'Backlit' },
  { value: 'bewegung', label: 'Bewegung', hint: 'Dolly, Fahrt, Drohne – der Song trägt den Bildfluss.', shotType: 'Wide', movement: 'Dolly', lighting: 'Natural' },
  { value: 'detail', label: 'Detail', hint: 'Kabel, Hände, Schweiß, Boden – das Kleine groß.', shotType: 'Detail', movement: 'Static', lighting: 'Low key' },
  { value: 'publikum', label: 'Publikum', hint: 'Von hinten über die Köpfe, Hände, Lärm.', shotType: 'Crowd', movement: 'Handheld', lighting: 'Strobe' },
];

export const shotMoodLabel = (value: string) =>
  SHOT_MOODS.find((entry) => entry.value === value)?.label ?? '';

/** Derives the mood back from the technical fields – for shots from older projects. */
export function guessShotMood(shot: { shotType: string; movement: string; lighting: string }) {
  const match = SHOT_MOODS.find(
    (mood) =>
      mood.shotType === shot.shotType && mood.movement === shot.movement && mood.lighting === shot.lighting
  );
  return match?.value ?? '';
}

/**
 * Ready-made shots so the storyboard can be built by clicking instead of writing.
 * `position` is a nudge, the song section is chosen by the user.
 */
export const SHOT_IDEAS: { id: string; label: string; description: string; mood: string }[] = [
  { id: 'empty-room', label: 'Leerer Raum', description: 'Weite: der leere Raum, eine Lampe, Staub in der Luft. Niemand da.', mood: 'still' },
  { id: 'face-still', label: 'Gesicht, still', description: 'Close-up: das Gesicht, still, Blick knapp an der Kamera vorbei.', mood: 'nah' },
  { id: 'hands', label: 'Hände / Instrument', description: 'Detail: Hände am Instrument, Saiten, Atem, kleine Bewegung.', mood: 'detail' },
  { id: 'silhouette', label: 'Silhouette', description: 'Gegenlicht: die Band als Silhouette, Rauch, harte Kante.', mood: 'dunkel' },
  { id: 'walking', label: 'Gehen', description: 'Handkamera hinterher: jemand geht durch einen Gang, Licht flackert.', mood: 'hand' },
  { id: 'band', label: 'Band spielt', description: 'Halbtotale: die Band spielt, Kamera langsam rein, alles laut.', mood: 'bewegung' },
  { id: 'crowd', label: 'Publikum', description: 'Von hinten über die Köpfe: Hände, Schultern, Bewegung.', mood: 'publikum' },
  { id: 'outside', label: 'Draußen', description: 'Weite: draußen, Wind, Himmel, eine Person klein im Bild.', mood: 'still' },
  { id: 'object', label: 'Gegenstand', description: 'Detail: ein Gegenstand, der alles erzählt – ohne Worte.', mood: 'detail' },
  { id: 'light', label: 'Licht / Schatten', description: 'Hartes Licht: Schatten wandert über Wand, Gesicht, Hände.', mood: 'licht' },
];

/** Order of sections as the song actually runs – used to sort the storyboard. */
export const sectionOrder = (value: string) =>
  Math.max(0, SHOT_SECTIONS.findIndex((entry) => entry.value === value));

/**
 * Spreads shots evenly over the song (or over their section order), so a rough
 * plan exists without typing a single timecode. Shortest shot: 0.8 s.
 */
export function distributeShots(
  shots: { id: number; start: number; duration: number; section: string; position: number }[],
  total: number
) {
  if (!shots.length) return [];
  const ordered = [...shots].sort(
    (a, b) => sectionOrder(a.section) - sectionOrder(b.section) || a.position - b.position || a.id - b.id
  );
  const length = Math.max(4, total || 60);
  const each = Math.max(0.8, length / ordered.length);
  return ordered.map((shot, index) => ({
    id: shot.id,
    start: Math.round(index * each * 10) / 10,
    duration: Math.round(Math.min(each, length - index * each) * 10) / 10,
  }));
}


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

/**
 * How much of the song is covered by shots, plus the holes between them.
 * Overlaps are merged, shots beyond the song are clipped.
 */
export function shotCoverage(shots: VideoShot[], duration: number) {
  const spans = shots
    .map((shot) => [
      Math.max(0, shot.start),
      Math.min(duration, shot.start + shot.duration),
    ] as [number, number])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  const gaps: { start: number; end: number }[] = [];
  let covered = 0;
  let cursor = 0;
  for (const [start, end] of spans) {
    if (start > cursor + 0.05) gaps.push({ start: cursor, end: start });
    const from = Math.max(start, cursor);
    if (end > from) covered += end - from;
    cursor = Math.max(cursor, end);
  }
  if (cursor < duration - 0.05) gaps.push({ start: cursor, end: duration });

  return { covered, gaps, ratio: duration > 0 ? Math.min(1, covered / duration) : 0 };
}
