'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconImage, IconPencil, IconTrash, IconX } from '@/components/icons';
import MediaPicker from '@/components/MediaPicker';
import { MediaThumb } from '@/components/MediaThumb';
import ShotSketchPad from '@/components/videos/ShotSketchPad';
import { Field, Modal } from '@/components/ui';
import { toast } from '@/lib/toast';
import {
  CAMERA_MOVES,
  LIGHTING_OPTIONS,
  SHOT_MOODS,
  SHOT_SECTIONS,
  SHOT_STATUS,
  SHOT_TYPES,
  guessShotMood,
  sectionLabel,
  timecode,
} from '@/lib/videos';
import type { MediaItem, VideoProject, VideoShot } from '@/lib/types';

/**
 * Deliberately small: one text field, one "Wirkung", one song section, one image.
 * Everything a videographer would ask for lives behind "Zeit & Profi-Details" and
 * only shows up when someone opens it.
 */
export default function VideoShotModal({
  open,
  shot,
  project,
  shots,
  media,
  playhead,
  defaultSection,
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
  defaultSection?: string;
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
  const [sketch, setSketch] = useState<string | null>(null);
  const [mood, setMood] = useState('');
  const [sketchOpen, setSketchOpen] = useState(false);
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
    setSketchOpen(false);
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
      setSketch(shot.sketch);
      setMood(guessShotMood(shot));
      return;
    }
    const next = [...shots]
      .filter((entry) => entry.start > playhead + 0.05)
      .sort((a, b) => a.start - b.start)[0];
    const previous = [...shots]
      .filter((entry) => entry.start <= playhead)
      .sort((a, b) => b.start - a.start)[0];
    setDescription('');
    setSection(defaultSection ?? previous?.section ?? 'verse');
    setStatus('idea');
    setStart(playhead.toFixed(1));
    setDuration(String(Math.max(0.5, Math.min(3, next ? next.start - playhead : 3)).toFixed(1)));
    setLocation(previous?.location ?? project.location);
    setShotType('');
    setMovement('');
    setLighting('');
    setNotes('');
    setMediaId('');
    setSketch(null);
    setMood('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shot, playhead, defaultSection]);

  const nextShot = useMemo(() => {
    const startValue = Number(start) || 0;
    return [...shots]
      .filter((entry) => entry.id !== shot?.id && entry.start > startValue + 0.05)
      .sort((a, b) => a.start - b.start)[0];
  }, [shots, shot, start]);

  const pickMood = (value: string) => {
    const entry = SHOT_MOODS.find((item) => item.value === value);
    setMood(mood === value ? '' : value);
    if (!entry) return;
    setShotType(entry.shotType);
    setMovement(entry.movement);
    setLighting(entry.lighting);
  };

  const save = async () => {
    if (!description.trim()) {
      toast('Schreib in einem Satz, was im Bild passiert.', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(shot ? `/api/video-shots/${shot.id}` : `/api/videos/${project.id}/shots`, {
        method: shot ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          section,
          status,
          start: Math.max(0, Number(start) || 0),
          duration: Math.max(0.2, Number(duration) || 0.2),
          location,
          shotType,
          movement,
          lighting,
          notes,
          mediaId: mediaId ? Number(mediaId) : null,
          sketch,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Konnte den Shot nicht speichern');
      onSaved(data.shot);
      toast(shot ? 'Shot aktualisiert' : 'Shot hinzugefügt');
    } catch (error: any) {
      toast(error.message ?? 'Konnte den Shot nicht speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!shot) return;
    if (!window.confirm(`Shot „${shot.description}“ löschen?`)) return;
    try {
      const response = await fetch(`/api/video-shots/${shot.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Konnte den Shot nicht löschen');
      onDeleted(shot.id);
      toast('Shot gelöscht');
    } catch (error: any) {
      toast(error.message ?? 'Konnte den Shot nicht löschen', 'error');
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={shot ? `Shot ${shotNumber}` : 'Neuer Shot'}
        subtitle={`${sectionLabel(section)} · ab ${timecode(Number(start) || 0)} · ${Number(duration || 0).toFixed(1)} s`}
        footer={
          <>
            {shot ? (
              <button type="button" className="btn btn-danger" onClick={remove}>
                <IconTrash size={14} /> Löschen
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconX size={14} /> Abbrechen
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Speichert …' : shot ? 'Speichern' : 'Hinzufügen'}
            </button>
          </>
        }
      >
        <div className="shot-form shot-form-simple">
          <Field
            label="Was passiert im Bild?"
            hint={<span className="count">Ein Satz reicht – das ist dein Storyboard.</span>}
          >
            <textarea
              className="textarea shot-description-input"
              rows={3}
              value={description}
              autoFocus
              placeholder="Totale: leerer Raum, eine Lampe flackert, niemand da."
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <Field label="Wirkung" hint={<span className="count">Bestimmt Bild, Kamera und Licht automatisch.</span>}>
            <div className="shot-moods">
              {SHOT_MOODS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className={`shot-mood ${mood === entry.value ? 'on' : ''}`}
                  aria-pressed={mood === entry.value}
                  title={entry.hint}
                  onClick={() => pickMood(entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Field label="Bild">
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${sketch || selectedMedia ? 'btn-ghost' : ''}`}
                  onClick={() => setSketchOpen((value) => !value)}
                >
                  <IconPencil size={13} /> Skizze
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMediaPicker(true)}>
                  <IconImage size={13} /> {selectedMedia ? 'Ändern' : 'Referenz'}
                </button>
                {sketch && !sketchOpen ? (
                  <img src={sketch} alt="" className="shot-inline-thumb" onClick={() => setSketchOpen(true)} />
                ) : selectedMedia ? (
                  <MediaThumb media={selectedMedia} className="shot-inline-thumb" />
                ) : null}
              </div>
            </Field>
          </div>

          {sketchOpen ? (
            <Field label="Frame-Skizze" hint={<span className="count">Grob reicht – es geht um die Idee.</span>}>
              <ShotSketchPad key={shot?.id ?? 'new'} value={sketch} onChange={setSketch} />
            </Field>
          ) : null}

          <details className="shot-advanced">
            <summary>Zeit &amp; Profi-Details</summary>
            <div className="video-form-row">
              <Field label="Im Song">
                <select className="select" value={section} onChange={(event) => setSection(event.target.value)}>
                  {SHOT_SECTIONS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start (Sekunden)">
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
              <Field label="Länge (Sekunden)">
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
                      nextShot && setDuration(String(Math.max(0.2, nextShot.start - (Number(start) || 0)).toFixed(1)))
                    }
                  >
                    Bis zum nächsten
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
              <Field label="Ort">
                <input
                  className="input"
                  value={location}
                  placeholder="z. B. Treppenhaus, Hinterhof, Van"
                  onChange={(event) => setLocation(event.target.value)}
                />
              </Field>
              <Field label="Einstellung">
                <input
                  className="input"
                  list="video-shot-types"
                  value={shotType}
                  placeholder="Wide, Close-up …"
                  onChange={(event) => setShotType(event.target.value)}
                />
                <datalist id="video-shot-types">
                  {SHOT_TYPES.map((entry) => (
                    <option key={entry} value={entry} />
                  ))}
                </datalist>
              </Field>
              <Field label="Kamera">
                <input
                  className="input"
                  list="video-camera-moves"
                  value={movement}
                  placeholder="Static, Handheld …"
                  onChange={(event) => setMovement(event.target.value)}
                />
                <datalist id="video-camera-moves">
                  {CAMERA_MOVES.map((entry) => (
                    <option key={entry} value={entry} />
                  ))}
                </datalist>
              </Field>
              <Field label="Licht">
                <input
                  className="input"
                  list="video-lighting"
                  value={lighting}
                  placeholder="Low key, Backlit …"
                  onChange={(event) => setLighting(event.target.value)}
                />
                <datalist id="video-lighting">
                  {LIGHTING_OPTIONS.map((entry) => (
                    <option key={entry} value={entry} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field label="Notizen">
              <textarea
                className="textarea"
                rows={2}
                value={notes}
                placeholder="Requisiten, wer im Bild ist, was du noch brauchst …"
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </details>
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
