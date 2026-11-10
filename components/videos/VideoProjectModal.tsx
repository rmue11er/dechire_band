'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconMusic, IconX } from '@/components/icons';
import MediaPicker from '@/components/MediaPicker';
import { MediaThumb } from '@/components/MediaThumb';
import { Field, Modal } from '@/components/ui';
import { toast } from '@/lib/toast';
import { VIDEO_STATUS } from '@/lib/videos';
import type { BandDocument, MediaItem, Song, VideoProject } from '@/lib/types';

export default function VideoProjectModal({
  open,
  project,
  songs,
  media,
  documents,
  onClose,
  onSaved,
}: {
  open: boolean;
  project: VideoProject | null;
  songs: Song[];
  media: MediaItem[];
  documents: BandDocument[];
  onClose: () => void;
  onSaved: (video: VideoProject) => void;
}) {
  const [title, setTitle] = useState('');
  const [songId, setSongId] = useState('');
  const [audioId, setAudioId] = useState('');
  const [treatmentDocId, setTreatmentDocId] = useState('');
  const [status, setStatus] = useState('idea');
  const [shootDate, setShootDate] = useState('');
  const [location, setLocation] = useState('');
  const [director, setDirector] = useState('');
  const [notes, setNotes] = useState('');
  const [audioPicker, setAudioPicker] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);

  const allMedia = useMemo(() => {
    const known = new Set(media.map((item) => item.id));
    return [...media, ...uploadedMedia.filter((item) => !known.has(item.id))];
  }, [media, uploadedMedia]);

  const audio = useMemo(() => allMedia.find((item) => item.id === Number(audioId)) ?? null, [allMedia, audioId]);

  useEffect(() => {
    if (!open) return;
    setUploadedMedia([]);
    setTitle(project?.title ?? '');
    setSongId(project?.songId ? String(project.songId) : '');
    setAudioId(project?.audioMediaId ? String(project.audioMediaId) : '');
    setTreatmentDocId(project?.treatmentDocId ? String(project.treatmentDocId) : '');
    setStatus(project?.status ?? 'idea');
    setShootDate(project?.shootDate ?? '');
    setLocation(project?.location ?? '');
    setDirector(project?.director ?? '');
    setNotes(project?.notes ?? '');
  }, [open, project]);

  const save = async () => {
    if (!title.trim()) {
      toast('Give the video a title', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(project ? `/api/videos/${project.id}` : '/api/videos', {
        method: project ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          songId: songId ? Number(songId) : null,
          audioMediaId: audioId ? Number(audioId) : null,
          treatmentDocId: treatmentDocId ? Number(treatmentDocId) : null,
          status,
          shootDate,
          location,
          director,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the video');
      onSaved(data.video);
      toast(project ? 'Video updated' : 'Video project created');
    } catch (error: any) {
      toast(error.message ?? 'Could not save the video', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={project ? 'Edit video' : 'New music video'}
        subtitle="Song, audio, treatment and the shoot window – the plan lives on the next screen."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconX size={14} /> Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving …' : project ? 'Save changes' : 'Create video'}
            </button>
          </>
        }
      >
        <div className="video-form">
          <Field label="Title">
            <input
              className="input"
              value={title}
              autoFocus
              placeholder="e.g. Fracture – official video"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') save();
              }}
            />
          </Field>

          <div className="video-form-row">
            <Field label="Song">
              <select className="select" value={songId} onChange={(event) => setSongId(event.target.value)}>
                <option value="">No song</option>
                {songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
                {VIDEO_STATUS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Shoot date">
              <input
                className="input"
                type="date"
                value={shootDate}
                onChange={(event) => setShootDate(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Song audio" hint={<span className="count">Used for the timeline and waveform</span>}>
            <div className="video-audio-pick">
              {audio ? (
                <>
                  <MediaThumb media={audio} className="video-audio-thumb" />
                  <div className="grow">
                    <strong>{audio.title}</strong>
                    <span className="mono small muted">{audio.mime}</span>
                  </div>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAudioPicker(true)}>
                    Change
                  </button>
                  <button type="button" className="btn btn-icon" onClick={() => setAudioId('')} title="Remove audio">
                    <IconX size={13} />
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAudioPicker(true)}>
                  <IconMusic size={14} /> Choose song audio
                </button>
              )}
            </div>
          </Field>

          <div className="video-form-row">
            <Field label="Treatment document">
              <select
                className="select"
                value={treatmentDocId}
                onChange={(event) => setTreatmentDocId(event.target.value)}
              >
                <option value="">No document</option>
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={location}
                placeholder="e.g. old factory, Augsburg"
                onChange={(event) => setLocation(event.target.value)}
              />
            </Field>
            <Field label="Director">
              <input
                className="input"
                value={director}
                placeholder="Who is running the shoot?"
                onChange={(event) => setDirector(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              className="textarea"
              rows={4}
              value={notes}
              placeholder="Visual references, crew, gear, rules …"
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <MediaPicker
        open={audioPicker}
        onClose={() => setAudioPicker(false)}
        media={allMedia}
        selectedIds={audioId ? [Number(audioId)] : []}
        audioOnly
        onConfirm={(ids) => {
          setAudioId(ids[0] ? String(ids[0]) : '');
          setAudioPicker(false);
        }}
        onUploaded={(items) => {
          setUploadedMedia((current) => [...current, ...items]);
          if (items[0]) setAudioId(String(items[0].id));
        }}
      />
    </>
  );
}
