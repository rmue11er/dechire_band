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
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'orga', label: 'Orga / stage' },
  { value: 'other', label: 'Other' },
];

export const docKindLabel = (kind: string) =>
  DOC_KINDS.find((item) => item.value === kind)?.label ?? 'Other';
