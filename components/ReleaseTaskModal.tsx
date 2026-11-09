'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
import { MODULE_LABEL, PHASES } from '@/lib/release';
import { toast } from '@/lib/toast';
import type { AssetKind, ReleasePhaseId, ReleaseTask, TaskModule } from '@/lib/types';

const MODULES: TaskModule[] = ['planner', 'studio', 'media', 'docs', 'press', 'website', 'orga'];

const offsetLabel = (releaseDate: string, dueDate: string) => {
  const diff = Math.round(
    (new Date(`${dueDate}T12:00:00Z`).getTime() - new Date(`${releaseDate}T12:00:00Z`).getTime()) /
      86_400_000
  );
  if (diff === 0) return 'am Release-Tag';
  return diff > 0 ? `T+${diff}` : `T${diff}`;
};

/**
 * Create or edit one step. The researched text is the default; anything can be
 * overwritten for this release without touching the playbook.
 */
export default function ReleaseTaskModal({
  open,
  releaseId,
  releaseDate,
  task,
  defaultPhase,
  onClose,
  onSaved,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  releaseId: number;
  releaseDate: string;
  task: ReleaseTask | null;
  defaultPhase?: ReleasePhaseId;
  onClose: () => void;
  /** new task list after creating one */
  onSaved: (tasks: ReleaseTask[]) => void;
  /** a single edited task */
  onUpdated: (task: ReleaseTask) => void;
  onDeleted: (id: number) => void;
}) {
  const [label, setLabel] = useState('');
  const [detail, setDetail] = useState('');
  const [phase, setPhase] = useState<ReleasePhaseId>('tease');
  const [module, setModule] = useState<TaskModule>('orga');
  const [dueDate, setDueDate] = useState(releaseDate);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [mediaKind, setMediaKind] = useState<AssetKind | ''>('');
  const [critical, setCritical] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(task?.label ?? '');
    setDetail(task?.detail ?? '');
    setPhase(task?.phase ?? defaultPhase ?? 'tease');
    setModule(task?.module ?? 'orga');
    setDueDate(task?.dueDate ?? releaseDate);
    setNotes(task?.notes ?? '');
    setReference(task?.reference ?? '');
    setMediaKind(task?.mediaKind ?? '');
    setCritical(Boolean(task?.critical));
    setSaving(false);
  }, [open, task, defaultPhase, releaseDate]);

  const save = async () => {
    if (!label.trim()) {
      toast('Give the step a title', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { label, detail, phase, module, dueDate, notes, reference, mediaKind, critical };
      const response = await fetch(
        task ? `/api/release-tasks/${task.id}` : `/api/releases/${releaseId}/tasks`,
        {
          method: task ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the step');
      if (Array.isArray(data.tasks)) onSaved(data.tasks);
      else if (task) onUpdated({ ...task, ...data.task });
      toast(task ? 'Step updated' : 'Step added');
      onClose();
    } catch (error: any) {
      toast(error.message ?? 'Could not save the step', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!task) return;
    if (!window.confirm('Delete this step? It will not come back with "Add missing steps".')) return;
    const response = await fetch(`/api/release-tasks/${task.id}`, { method: 'DELETE' });
    if (response.ok) {
      onDeleted(task.id);
      toast('Step deleted');
      onClose();
    } else {
      toast('Could not delete the step', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit step' : 'Add your own step'}
      subtitle={
        task
          ? task.key
            ? 'Playbook step – edit the wording, date or notes for this release.'
            : 'Your own step.'
          : 'A date, a phase, a note. Everything else stays optional.'
      }
      footer={
        <>
          {task ? (
            <button type="button" className="btn btn-ghost task-delete" onClick={remove}>
              Delete
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving …' : task ? 'Save step' : 'Add step'}
          </button>
        </>
      }
    >
      <div className="task-form">
        <label className="wave-field">
          <span className="label">Title</span>
          <input
            className="input"
            value={label}
            placeholder="e.g. Call the venue about the stage"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>

        <div className="task-form-row">
          <label className="wave-field">
            <span className="label">Phase</span>
            <select className="select" value={phase} onChange={(event) => setPhase(event.target.value as ReleasePhaseId)}>
              {PHASES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="wave-field">
            <span className="label">Link to module</span>
            <select className="select" value={module} onChange={(event) => setModule(event.target.value as TaskModule)}>
              {MODULES.map((entry) => (
                <option key={entry} value={entry}>
                  {MODULE_LABEL[entry]}
                </option>
              ))}
            </select>
          </label>
          <label className="wave-field">
            <span className="label">Due</span>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <span className="wave-hint mono">{offsetLabel(releaseDate, dueDate)}</span>
          </label>
          <label className="wave-field">
            <span className="label">Attachment</span>
            <select
              className="select"
              value={mediaKind}
              onChange={(event) => setMediaKind(event.target.value as AssetKind | '')}
            >
              <option value="">No media slot</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </label>
        </div>

        <label className="wave-field">
          <span className="label">What needs to happen</span>
          <textarea
            className="textarea"
            rows={4}
            value={detail}
            placeholder="One or two sentences – concrete enough that past-you cannot argue."
            onChange={(event) => setDetail(event.target.value)}
          />
        </label>

        <label className="wave-field">
          <span className="label">Your note</span>
          <textarea
            className="textarea"
            rows={2}
            value={notes}
            placeholder="Names, phone numbers, what happened last time …"
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        <label className="wave-field">
          <span className="label">Source</span>
          <input
            className="input"
            value={reference}
            placeholder="https://support.spotify.com/…"
            onChange={(event) => setReference(event.target.value)}
          />
          <span className="wave-hint">A link that backs the instruction – shown on the step.</span>
        </label>

        <label className="task-critical">
          <input type="checkbox" checked={critical} onChange={(event) => setCritical(event.target.checked)} />
          <span>Critical – gets its own count in the header</span>
        </label>
      </div>
    </Modal>
  );
}
