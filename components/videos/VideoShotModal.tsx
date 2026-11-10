'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconImage, IconTrash, IconX } from '@/components/icons';
import MediaPicker from '@/components/MediaPicker';
import { MediaThumb } from '@/components/MediaThumb';
import { Field, Modal } from '@/components/ui';
import { toast } from '@/lib/toast';
import {
  CAMERA_MOVES,
  LIGHTING_OPTIONS,
  SHOT_SECTIONS,
  SHOT_STATUS,
  SHOT_TYPES,
  sectionLabel,
  timecode,
} from '@/lib/videos';
import type { MediaItem, VideoProject, VideoShot } from '@/lib/types';

export default function VideoShotModal({
  open,
  shot,
  project,
  shots,
  media,
  playhead,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  shot: VideoShot | null;
  project: VideoProject;
  shots: VideoShot[];
  media: MediaItem[];
  playhead: number;
  onClose: () => void;
  onSaved: (shot: VideoShot) => void;
  onDeleted: (id: number) => void;
}) {
  const [description, setDescription] = useState('');
  const [section, setSection] = useState('verse');
  const [status, setStatus] = useState('idea');
  const [start, setStart] = useState('0');
  const [duration, setDuration] = useState('3');
  const [location, setLocation] = useState('');
  const [shotType, setShotType] = useState('');
  const [movement, setMovement] = useState('');
  const [lighting, setLighting] = useState('');
  const [notes, setNotes] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [mediaPicker, setMediaPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const allMedia = useMemo(() => {
    const known = new Set(media.map((item) => item.id));
    if (shot?.media && !known.has(shot.media.id)) known.add(shot.media.id);
    return [
      ...media,
      ...(shot?.media && !media.some((item) => item.id === shot.media?.id) ? [shot.media] : []),
      ...uploadedMedia.filter((item) => !known.has(item.id)),
    ];
  }, [media, shot, uploadedMedia]);
  const selectedMedia = allMedia.find((item) => item.id === Number(mediaId)) ?? null;
  const shotNumber = shot ? Math.max(1, shots.findIndex((entry) => entry.id === shot.id) + 1) : 0;

  useEffect(() => {
    if (!open) return;
    setUploadedMedia([]);
    if (shot) {
      setDescription(shot.description);
      setSection(shot.section);
      setStatus(shot.status);
      setStart(shot.start.toFixed(1));
      setDuration(shot.duration.toFixed(1));
      setLocation(shot.location);
      setShotType(shot.shotType);
      setMovement(shot.movement);
      setLighting(shot.lighting);
      setNotes(shot.notes);
      setMediaId(shot.mediaId ? String(shot.mediaId) : '');
      return;
    }
    const next = [...shots]
      .filter((entry) => entry.start > playhead + 0.05)
      .sort((a, b) => a.start - b.start)[0];
    const previous = [...shots]
      .filter((entry) => entry.start <= playhead)
      .sort((a, b) => b.start - a.start)[0];
    setDescription('New shot');
    setSection(previous?.section ?? 'verse');
    setStatus('idea');
    setStart(playhead.toFixed(1));
    setDuration(String(Math.max(0.5, Math.min(3, next ? next.start - playhead : 3)).toFixed(1)));
    setLocation(previous?.location ?? project.location);
    setShotType('');
    setMovement('');
    setLighting('');
    setNotes('');
    setMediaId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shot, playhead]);

  const nextShot = useMemo(() => {
    const startValue = Number(start) || 0;
    return [...shots]
      .filter((entry) => entry.id !== shot?.id && entry.start > startValue + 0.05)
      .sort((a, b) => a.start - b.start)[0];
  }, [shots, shot, start]);

  const save = async () => {
    const startValue = Math.max(0, Number(start) || 0);
    const durationValue = Math.max(0.2, Number(duration) || 0.2);
    if (!description.trim()) {
      toast('Describe the shot in one line', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        shot ? `/api/video-shots/${shot.id}` : `/api/videos/${project.id}/shots`,
        {
          method: shot ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            section,
            status,
            start: startValue,
            duration: durationValue,
            location,
            shotType,
            movement,
            lighting,
            notes,
            mediaId: mediaId ? Number(mediaId) : null,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the shot');
      onSaved(data.shot);
      toast(shot ? 'Shot updated' : 'Shot added');
    } catch (error: any) {
      toast(error.message ?? 'Could not save the shot', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!shot) return;
    if (!window.confirm(`Delete shot “${shot.description}”?`)) return;
    try {
      const response = await fetch(`/api/video-shots/${shot.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete the shot');
      onDeleted(shot.id);
      toast('Shot deleted');
    } catch (error: any) {
      toast(error.message ?? 'Could not delete the shot', 'error');
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={shot ? `Shot ${shotNumber}` : 'New shot'}
        subtitle={
          shot
            ? `${timecode(shot.start)} · ${sectionLabel(shot.section)}`
            : `Starts at ${timecode(Number(start) || 0)} · ${sectionLabel(section)}`
        }
        footer={
          <>
            {shot ? (
              <button type="button" className="btn btn-danger" onClick={remove}>
                <IconTrash size={14} /> Delete
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconX size={14} /> Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving …' : shot ? 'Save shot' : 'Add shot'}
            </button>
          </>
        }
      >
        <div className="shot-form">
          <Field label="What happens?">
            <textarea
              className="textarea"
              rows={3}
              value={description}
              autoFocus
              placeholder="Wide: singer alone in the empty hall, lights flicker on the first hit."
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <div className="video-form-row">
            <Field label="Song section">
              <select className="select" value={section} onChange={(event) => setSection(event.target.value)}>
                {SHOT_SECTIONS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start (seconds)">
              <div className="shot-time-row">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.1}
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStart(playhead.toFixed(1))}>
                  Playhead
                </button>
              </div>
            </Field>
            <Field label="Duration (seconds)">
              <div className="shot-time-row">
                <input
                  className="input"
                  type="number"
                  min={0.2}
                  step={0.1}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={!nextShot}
                  onClick={() =>
                    nextShot &&
                    setDuration(
                      String(Math.max(0.2, nextShot.start - (Number(start) || 0)).toFixed(1))
                    )
                  }
                >
                  To next
                </button>
              </div>
            </Field>
            <Field label="Status">
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
                {SHOT_STATUS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="video-form-row">
            <Field label="Location">
              <input
                className="input"
                value={location}
                placeholder="e.g. staircase, backyard, van"
                onChange={(event) => setLocation(event.target.value)}
              />
            </Field>
            <Field label="Shot type">
              <input
                className="input"
                list="video-shot-types"
                value={shotType}
                placeholder="Wide, close-up …"
                onChange={(event) => setShotType(event.target.value)}
              />
              <datalist id="video-shot-types">
                {SHOT_TYPES.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </Field>
            <Field label="Camera">
              <input
                className="input"
                list="video-camera-moves"
                value={movement}
                placeholder="Static, handheld …"
                onChange={(event) => setMovement(event.target.value)}
              />
              <datalist id="video-camera-moves">
                {CAMERA_MOVES.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </Field>
            <Field label="Light">
              <input
                className="input"
                list="video-lighting"
                value={lighting}
                placeholder="Low key, practical …"
                onChange={(event) => setLighting(event.target.value)}
              />
              <datalist id="video-lighting">
                {LIGHTING_OPTIONS.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Reference / available shot" hint={<span className="count">From the media library</span>}>
            <div className="video-reference">
              {selectedMedia ? (
                <>
                  <MediaThumb media={selectedMedia} className="video-reference-thumb" />
                  <div className="grow">
                    <strong>{selectedMedia.title}</strong>
                    <span className="mono small muted">
                      {selectedMedia.width && selectedMedia.height
                        ? `${selectedMedia.width}×${selectedMedia.height}`
                        : selectedMedia.mime}
                    </span>
                  </div>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMediaPicker(true)}>
                    Change
                  </button>
                  <button type="button" className="btn btn-icon" onClick={() => setMediaId('')} title="Remove reference">
                    <IconX size={13} />
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMediaPicker(true)}>
                  <IconImage size={14} /> Attach media
                </button>
              )}
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              className="textarea"
              rows={3}
              value={notes}
              placeholder="Props, safety, who is in frame, what you still need …"
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <MediaPicker
        open={mediaPicker}
        onClose={() => setMediaPicker(false)}
        media={allMedia}
        selectedIds={mediaId ? [Number(mediaId)] : []}
        visualOnly
        onConfirm={(ids) => {
          setMediaId(ids[0] ? String(ids[0]) : '');
          setMediaPicker(false);
        }}
        onUploaded={(items) => {
          setUploadedMedia((current) => [...current, ...items]);
          if (items[0]) setMediaId(String(items[0].id));
        }}
      />
    </>
  );
}
