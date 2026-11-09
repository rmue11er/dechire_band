import type { DocumentKind, MilestoneKind } from './types';

export const MILESTONE_KINDS: { value: MilestoneKind; label: string }[] = [
  { value: 'release', label: 'Release' },
  { value: 'show', label: 'Show' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'content', label: 'Content' },
  { value: 'other', label: 'Other' },
];

export const milestoneKindLabel = (kind: string) =>
  MILESTONE_KINDS.find((item) => item.value === kind)?.label ?? 'Other';

export const DOC_KINDS: { value: DocumentKind; label: string }[] = [
  { value: 'rider', label: 'Technical rider' },
  { value: 'contract', label: 'Contract / booking' },
  { value: 'press', label: 'Press & bio' },
  { value: 'lyrics', label: 'Lyrics' },
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'orga', label: 'Orga / stage' },
  { value: 'other', label: 'Other' },
];

/** Song parts for lyric sheets – each one becomes a real section block. */
export const LYRIC_PARTS = [
  { value: 'intro', label: 'Intro', numbered: false },
  { value: 'verse', label: 'Verse', numbered: true },
  { value: 'prechorus', label: 'Pre-Chorus', numbered: true },
  { value: 'chorus', label: 'Chorus', numbered: true },
  { value: 'bridge', label: 'Bridge', numbered: false },
  { value: 'breakdown', label: 'Breakdown', numbered: false },
  { value: 'solo', label: 'Solo', numbered: false },
  { value: 'outro', label: 'Outro', numbered: false },
] as const;

export type PartKind = (typeof LYRIC_PARTS)[number]['value'];

export const partLabel = (kind: string) =>
  LYRIC_PARTS.find((part) => part.value === kind)?.label ?? 'Part';

export const isNumberedPart = (kind: string) =>
  LYRIC_PARTS.find((part) => part.value === kind)?.numbered ?? true;

/** Turns any heading text back into a part kind – used when converting old sheets. */
export function guessPartKind(text: string): PartKind {
  const value = text.toLowerCase();
  if (value.includes('pre') && value.includes('chorus')) return 'prechorus';
  if (value.includes('chorus') || value.includes('hook')) return 'chorus';
  if (value.includes('verse') || value.includes('strophe')) return 'verse';
  if (value.includes('bridge')) return 'bridge';
  if (value.includes('break') || value.includes('drop')) return 'breakdown';
  if (value.includes('solo') || value.includes('interlude')) return 'solo';
  if (value.includes('outro') || value.includes('ending')) return 'outro';
  if (value.includes('intro')) return 'intro';
  return 'verse';
}

export const docKindLabel = (kind: string) =>
  DOC_KINDS.find((item) => item.value === kind)?.label ?? 'Other';
