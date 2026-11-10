import type { RenderResult } from './reelRender';

export type ReelJobStatus = 'queued' | 'rendering' | 'done' | 'error';

export interface ReelJob {
  id: string;
  status: ReelJobStatus;
  progress: number;
  createdAt: number;
  title: string;
  duration: number;
  clipCount: number;
  mediaId?: number;
  coverId?: number | null;
  filename?: string;
  error?: string;
}

/** In-memory job list – the app runs as a single Node process. */
const jobs: Map<string, ReelJob> = ((globalThis as any).__dechireReelJobs ??= new Map());

export function createReelJob(input: { title: string; duration: number; clipCount: number }): ReelJob {
  const job: ReelJob = {
    id: crypto.randomUUID(),
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
    ...input,
  };
  jobs.set(job.id, job);

  // keep the map small without a scheduler
  const stale = [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt).slice(24);
  for (const old of stale) jobs.delete(old.id);

  return job;
}

export function updateReelJob(id: string, patch: Partial<ReelJob>) {
  const job = jobs.get(id);
  if (!job) return null;
  Object.assign(job, patch);
  return job;
}

export function finishReelJob(id: string, result: RenderResult) {
  return updateReelJob(id, {
    status: 'done',
    progress: 1,
    mediaId: result.mediaId,
    coverId: result.coverId,
    filename: result.filename,
  });
}

export function failReelJob(id: string, message: string) {
  return updateReelJob(id, { status: 'error', error: message });
}

export function getReelJob(id: string) {
  return jobs.get(id) ?? null;
}

export function listReelJobs() {
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
}
