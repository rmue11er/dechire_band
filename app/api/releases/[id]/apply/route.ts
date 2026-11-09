import { fail, ok, readJson, toInt } from '@/lib/api';
import { createMilestone, getRelease, listMilestones } from '@/lib/repo';
import { daysUntil } from '@/lib/release';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

const shift = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * Writes the wave's key dates into the calendar so the release shows up in the
 * timeline, on the dashboard and in the .ics export.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const release = getRelease(toInt(id));
  if (!release) return fail('Release not found', 404);

  const body = await readJson<{ milestones?: boolean }>(request);
  if (body.milestones === false) return ok({ created: [] });

  const existing = new Set(listMilestones().map((entry) => `${entry.title}|${entry.date}`));
  const wanted = [
    {
      title: `${release.title} – Ankündigung & Pre-Save`,
      date: shift(release.releaseDate, -14),
      kind: 'content' as const,
      note: 'Ankündigungspost, Pre-Save-Link live, Presse-Pitch raus.',
    },
    {
      title: `${release.title} – Pitches raus`,
      date: shift(release.releaseDate, -9),
      kind: 'deadline' as const,
      note: 'Playlist- und Presse-Pitches abgeschickt (Redaktionen planen Wochen voraus).',
    },
    {
      title: `${release.title} – Release`,
      date: release.releaseDate,
      kind: 'release' as const,
      note: `Release-Tag. Noch ${daysUntil(release.releaseDate)} Tage.`,
    },
    {
      title: `${release.title} – Nachbrenner`,
      date: shift(release.releaseDate, 7),
      kind: 'content' as const,
      note: 'Zweite Welle: Live-Version, Lyrics, Community.',
    },
  ];

  const created = wanted
    .filter((entry) => !existing.has(`${entry.title}|${entry.date}`))
    .map((entry) => createMilestone(entry));

  return ok({ created, skipped: wanted.length - created.length });
}
