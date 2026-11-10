'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconDocument,
  IconFilm,
  IconImage,
  IconMusic,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@/components/icons';
import { EmptyState, Field, Modal, PageHead, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { SONG_STATUS, formatSongDuration, songStatusLabel } from '@/lib/songs';
import { toast } from '@/lib/toast';
import type { Song } from '@/lib/types';

const EMPTY = {
  title: '',
  status: 'idea',
  songKey: '',
  bpm: '',
  duration: '',
  notes: '',
};

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Song | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await fetch('/api/songs');
    const data = await response.json();
    setSongs(data.songs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => {
      toast('Could not load the songs', 'error');
      setLoading(false);
    });
  }, []);

  const totals = useMemo(
    () => ({
      songs: songs.length,
      media: songs.reduce((sum, song) => sum + song.mediaCount, 0),
      docs: songs.reduce((sum, song) => sum + song.docCount, 0),
      videos: songs.reduce((sum, song) => sum + song.videoCount, 0),
    }),
    [songs]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setCreating(true);
  };

  const openEdit = (song: Song) => {
    setEditing(song);
    setForm({
      title: song.title,
      status: song.status,
      songKey: song.songKey,
      bpm: song.bpm == null ? '' : String(song.bpm),
      duration: song.duration == null ? '' : String(song.duration),
      notes: song.notes,
    });
    setCreating(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast('Give the song a title', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/songs/${editing.id}` : '/api/songs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          status: form.status,
          songKey: form.songKey,
          bpm: form.bpm === '' ? null : Number(form.bpm),
          duration: form.duration === '' ? null : Number(form.duration),
          notes: form.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the song');
      setSongs((current) =>
        editing
          ? current.map((song) => (song.id === data.song.id ? data.song : song))
          : [data.song, ...current]
      );
      setCreating(false);
      setEditing(null);
      toast(editing ? 'Song updated' : 'Song added');
    } catch (error: any) {
      toast(error.message ?? 'Could not save the song', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (song: Song) => {
    if (
      !window.confirm(
        `Delete “${song.title}”? Its ${song.mediaCount} media file(s) and ${song.docCount} document(s) stay – only the link is removed.`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/songs/${song.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete the song');
      setSongs((current) => current.filter((entry) => entry.id !== song.id));
      toast('Song deleted');
    } catch (error: any) {
      toast(error.message ?? 'Could not delete the song', 'error');
    }
  };

  if (loading) return <Spinner label="Tuning the song index" />;

  return (
    <div className="songs-page">
      <PageHead
        eyebrow="Song desk"
        title={
          <>
            Songs<span className="slash">/</span>Index
          </>
        }
        sub="One place per song. Link media and documents here, then open the song when you want to keep working on it."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <IconPlus size={15} /> New song
          </button>
        }
      />

      <div className="song-summary">
        <span>
          <em>{totals.songs}</em> songs
        </span>
        <span>
          <em>{totals.media}</em> linked media
        </span>
        <span>
          <em>{totals.docs}</em> linked documents
        </span>
        <span>
          <em>{totals.videos}</em> music videos
        </span>
      </div>

      {songs.length === 0 ? (
        <EmptyState
          icon={<IconMusic size={24} />}
          title="No songs yet"
          hint="Add the songs you are working on. Every media file and document can then point to one song."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <IconPlus size={14} /> Add the first song
            </button>
          }
        />
      ) : (
        <div className="song-grid">
          {songs.map((song) => (
            <article key={song.id} className="song-card">
              <div className="song-card-top">
                <span className={`song-status ${song.status}`}>{songStatusLabel(song.status)}</span>
                <div className="song-card-actions">
                  <button
                    type="button"
                    className="btn btn-icon"
                    title="Edit song"
                    aria-label={`Edit ${song.title}`}
                    onClick={() => openEdit(song)}
                  >
                    <IconPencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    title="Delete song"
                    aria-label={`Delete ${song.title}`}
                    onClick={() => remove(song)}
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>

              <h3>{song.title}</h3>
              <div className="song-meta mono">
                {song.songKey ? <span>{song.songKey}</span> : null}
                {song.bpm ? <span>{song.bpm} BPM</span> : null}
                {song.duration ? <span>{formatSongDuration(song.duration)}</span> : null}
                <span>since {formatDate(song.createdAt)}</span>
              </div>
              {song.notes ? <p className="song-note">{song.notes}</p> : null}

              <div className="song-links">
                <Link href={`/media?song=${song.id}`}>
                  <IconImage size={13} />
                  <span>Media</span>
                  <em>{song.mediaCount}</em>
                </Link>
                <Link href={`/docs?song=${song.id}`}>
                  <IconDocument size={13} />
                  <span>Documents</span>
                  <em>{song.docCount}</em>
                </Link>
                <Link href={`/videos?song=${song.id}`}>
                  <IconFilm size={13} />
                  <span>Video</span>
                  <em>{song.videoCount}</em>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit song' : 'New song'}
        subtitle="The song is the thread: media, lyrics and paperwork can all point here."
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              <IconX size={14} /> Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving …' : editing ? 'Save song' : 'Add song'}
            </button>
          </>
        }
      >
        <div className="song-form">
          <Field label="Title">
            <input
              className="input"
              value={form.title}
              autoFocus
              placeholder="e.g. Fracture"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') save();
              }}
            />
          </Field>
          <div className="song-form-row">
            <Field label="Status">
              <select
                className="select"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {SONG_STATUS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Key">
              <input
                className="input"
                value={form.songKey}
                placeholder="e.g. D minor"
                onChange={(event) => setForm({ ...form, songKey: event.target.value })}
              />
            </Field>
            <Field label="BPM">
              <input
                className="input"
                type="number"
                min={0}
                max={400}
                value={form.bpm}
                placeholder="e.g. 132"
                onChange={(event) => setForm({ ...form, bpm: event.target.value })}
              />
            </Field>
            <Field label="Length (seconds)">
              <input
                className="input"
                type="number"
                min={0}
                max={3600}
                value={form.duration}
                placeholder="215"
                onChange={(event) => setForm({ ...form, duration: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes" hint={<span className="count">What is still missing?</span>}>
            <textarea
              className="textarea"
              rows={4}
              value={form.notes}
              placeholder="Arrangement, references, who still has to send what …"
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </Field>
          <p className="song-form-hint">
            {formatSongDuration(form.duration === '' ? null : Number(form.duration))
              ? `Length: ${formatSongDuration(Number(form.duration))}`
              : 'Length is optional – seconds are enough, 3:35 = 215.'}
          </p>
        </div>
      </Modal>
    </div>
  );
}
