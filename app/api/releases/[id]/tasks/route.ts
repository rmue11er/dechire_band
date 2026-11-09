import { fail, ok, readJson, toInt } from '@/lib/api';
import { createReleaseTask, getRelease, listReleaseTasks } from '@/lib/repo';
import type { ReleasePhaseId, TaskModule } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

const PHASES: ReleasePhaseId[] = ['production', 'tease', 'announce', 'countdown', 'release', 'sustain'];
const MODULES: TaskModule[] = ['planner', 'studio', 'media', 'docs', 'press', 'website', 'orga'];
const MEDIA_KINDS = ['image', 'video', 'audio', ''];

const dayDiff = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000
  );

/** A task of your own – same shape as a playbook step, no template key. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const releaseId = toInt(id);
  const release = getRelease(releaseId);
  if (!release) return fail('Release not found', 404);

  const body = await readJson<Record<string, any>>(request);
  const label = String(body.label ?? '').trim();
  if (!label) return fail('A task needs a title');

  const dueDate =
    typeof body.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
      ? body.dueDate
      : release.releaseDate;

  const task = createReleaseTask(releaseId, {
    label,
    detail: typeof body.detail === 'string' ? body.detail.slice(0, 2000) : '',
    phase: PHASES.includes(body.phase) ? body.phase : 'tease',
    module: MODULES.includes(body.module) ? body.module : 'orga',
    dueDate,
    offsetDays: dayDiff(release.releaseDate, dueDate),
    channel: typeof body.channel === 'string' ? body.channel : '',
    critical: Boolean(body.critical),
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : '',
    reference: typeof body.reference === 'string' ? body.reference.slice(0, 500) : '',
    mediaKind: MEDIA_KINDS.includes(body.mediaKind) ? body.mediaKind : '',
  });

  return ok({ task, tasks: listReleaseTasks(releaseId) }, 201);
}
