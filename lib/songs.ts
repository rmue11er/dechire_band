import type { SongStatus } from './types';

export const SONG_STATUS: { value: SongStatus; label: string; hint: string }[] = [
  { value: 'idea', label: 'Idea', hint: 'A riff, a line, a voice memo.' },
  { value: 'demo', label: 'Demo', hint: 'Playable, rough, worth keeping.' },
  { value: 'recording', label: 'Recording', hint: 'Tracking the final parts.' },
  { value: 'mix', label: 'Mix', hint: 'Levels, space, decisions.' },
  { value: 'master', label: 'Master', hint: 'Done, waiting for release.' },
  { value: 'released', label: 'Released', hint: 'Out in the world.' },
];

export const songStatusLabel = (status: string) =>
  SONG_STATUS.find((entry) => entry.value === status)?.label ?? status;

export function formatSongDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return '';
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
