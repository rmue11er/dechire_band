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
  IconSearch,
  IconTrash,
  IconX,
} from '@/components/icons';
import { EmptyState, Field, Modal, PageHead, Spinner } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { SONG_STATUS, formatSongDuration, formatSongTotal, songStatusLabel } from '@/lib/songs';
import { toast } from '@/lib/toast';
import type { Song, SongStatus } from '@/lib/types';

type SortKey = 'updated' | 'title' | 'status';
type StatusFilter = 'all' | SongStatus;

const EMPTY = {
  title: '',
  status: 'idea' as SongStatus,
  songKey: '',
  bpm: '',
  duration: '',
  notes: '',
};

/** Common keys first, so typing "d" gets you somewhere. */
const KEY_SUGGESTIONS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
  'C minor',
  'C# minor',
  'D minor',
  'Eb minor',
  'E minor',
  'F minor',
  'F# minor',
  'G minor',
  'G# minor',
  'A minor',
  'Bb minor',
  'B minor',
];

const statusIndex = (status: SongStatus) =>
  Math.max(0, SONG_STATUS.findIndex((entry) => entry.value === status));

/** Accepts "3:35" as well as raw seconds – the hint explains nothing, this just works. */
function parseSongDuration(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (text.includes(':')) {
    const [minutes, seconds] = text.split(':');
    const m = Number(minutes);
    const s = Number(seconds);
    if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
    return Math.max(0, Math.min(3600, Math.round(m * 60 + s)));
  }
  const seconds = Number(text);
  return Number.isFinite(seconds) ? Math.max(0, Math.min(3600, Math.round(seconds))) : null;
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Song | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [highlightId, setHighlightId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/songs')
      .then((response) => response.json())
      .then((data) => {
        const items: Song[] = data.songs ?? [];
        setSongs(items);
        setLoading(false);
        const wanted = Number(new URLSearchParams(window.location.search).get('song') ?? '');
        if (items.some((song) => song.id === wanted)) setHighlightId(wanted);
      })
      .catch(() => {
        toast('Could not load the songs', 'error');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (highlightId == null || loading) return;
    const node = document.getElementById(`song-${highlightId}`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, loading]);

  const totals = useMemo(
    () => ({
      runtime: songs.reduce((sum, song) => sum + (song.duration ?? 0), 0),
      media: songs.reduce((sum, song) => sum + song.mediaCount, 0),
      docs: songs.reduce((sum, song) => sum + song.docCount, 0),
      videos: songs.reduce((sum, song) => sum + song.videoCount, 0),
    }),
    [songs]
  );

  const catalogs = useMemo(
    () => new Map(songs.map((song, index) => [song.id, index + 1])),
    [songs]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    songs.forEach((song) => {
      counts[song.status] = (counts[song.status] ?? 0) + 1;
    });
    return counts;
  }, [songs]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = songs.filter((song) => {
      if (statusFilter !== 'all' && song.status !== statusFilter) return false;
      if (!needle) return true;
      return [song.title, song.songKey, song.notes, songStatusLabel(song.status)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    if (sort === 'title') return [...items].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'status') {
      return [...items].sort(
        (a, b) => statusIndex(b.status) - statusIndex(a.status) || a.title.localeCompare(b.title)
      );
    }
    return items;
  }, [songs, query, statusFilter, sort]);

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
      duration: formatSongDuration(song.duration),
      notes: song.notes,
    });
    setCreating(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast('Give the song a title', 'error');
      return;
    }
    const duration = parseSongDuration(form.duration);
    if (form.duration.trim() && duration == null) {
      toast('Length must look like 3:35 or 215', 'error');
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
          duration,
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
      if (!editing) {
        setQuery('');
        setStatusFilter('all');
        setHighlightId(data.song.id);
      }
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

  if (loading) return <Spinner label="Reading the song archive" />;

  return (
    <div className="songs-page">
      <PageHead
        eyebrow="Song archive"
        title={
          <>
            Songs<span className="slash">/</span>Overview
          </>
        }
        sub="The collection at a glance: what exists, what state it is in, and where the files live. Open a song only when you need to change its details."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <IconPlus size={15} /> New song
          </button>
        }
      />

      {songs.length === 0 ? (
        <EmptyState
          icon={<IconMusic size={24} />}
          title="No songs yet"
          hint="Add your first song. Media, lyrics and music videos can then point to it."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <IconPlus size={14} /> Add the first song
            </button>
          }
        />
      ) : (
        <>
          <div className="song-stats">
            <div className="song-stat">
              <span>Songs</span>
              <b>{songs.length}</b>
            </div>
            <div className="song-stat">
              <span>Runtime</span>
              <b>{formatSongTotal(totals.runtime)}</b>
            </div>
            <div className="song-stat">
              <span>Media</span>
              <b>{totals.media}</b>
            </div>
            <div className="song-stat">
              <span>Documents</span>
              <b>{totals.docs}</b>
            </div>
            <div className="song-stat">
              <span>Video</span>
              <b>{totals.videos}</b>
            </div>
          </div>

          <div className="song-toolbar panel">
            <label className="song-search">
              <IconSearch size={13} />
              <input
                className="input"
                value={query}
                placeholder="Search title, key or notes"
                aria-label="Search songs"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="song-status-tabs" role="tablist" aria-label="Filter by status">
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'all'}
                className={`song-status-tab ${statusFilter === 'all' ? 'on' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All <em>{songs.length}</em>
              </button>
              {SONG_STATUS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === entry.value}
                  className={`song-status-tab ${statusFilter === entry.value ? 'on' : ''}`}
                  onClick={() => setStatusFilter(entry.value)}
                >
                  {entry.label} <em>{statusCounts[entry.value] ?? 0}</em>
                </button>
              ))}
            </div>
            <select
              className="song-sort"
              aria-label="Sort songs"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="updated">Recent</option>
              <option value="title">A–Z</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="song-overview panel">
            <div className="song-table-head">
              <span>No.</span>
              <span>Song</span>
              <span>Status</span>
              <span>Key / tempo / length</span>
              <span>Linked</span>
              <span>Updated</span>
              <span />
            </div>

            <div className="song-table">
              {filtered.map((song) => (
                <article
                  key={song.id}
                  id={`song-${song.id}`}
                  className={`song-table-row ${highlightId === song.id ? 'highlight' : ''}`}
                >
                  <span className="song-table-no">
                    {String(catalogs.get(song.id) ?? 0).padStart(2, '0')}
                  </span>

                  <div className="song-table-main">
                    <strong>{song.title}</strong>
                    <span className="song-table-notes">{song.notes.trim() || 'No notes yet'}</span>
                  </div>

                  <span className={`song-pill ${song.status}`}>
                    <i />
                    {songStatusLabel(song.status)}
                  </span>

                  <div className="song-table-facts">
                    <span>{song.songKey || '—'}</span>
                    <span>{song.bpm ? `${song.bpm} BPM` : '—'}</span>
                    <span>{song.duration ? formatSongDuration(song.duration) : '—'}</span>
                  </div>

                  <div className="song-table-links">
                    <Link href={`/admin/media?song=${song.id}`} title="Media for this song">
                      <IconImage size={12} />
                      <em>{song.mediaCount}</em>
                    </Link>
                    <Link href={`/admin/docs?song=${song.id}`} title="Documents for this song">
                      <IconDocument size={12} />
                      <em>{song.docCount}</em>
                    </Link>
                    <Link href={`/admin/videos?song=${song.id}`} title="Video projects for this song">
                      <IconFilm size={12} />
                      <em>{song.videoCount}</em>
                    </Link>
                  </div>

                  <span className="song-table-updated">{timeAgo(song.updatedAt)}</span>

                  <div className="song-table-actions">
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
                </article>
              ))}

              {!filtered.length ? (
                <div className="song-table-empty">
                  <p>No song matches this search.</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      <Modal
        open={creating}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit song' : 'New song'}
        subtitle="Only the basics – media, lyrics and paperwork stay in their own modules."
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
                onChange={(event) => setForm({ ...form, status: event.target.value as SongStatus })}
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
                list="song-key-suggestions"
                placeholder="e.g. D minor"
                onChange={(event) => setForm({ ...form, songKey: event.target.value })}
              />
              <datalist id="song-key-suggestions">
                {KEY_SUGGESTIONS.map((key) => (
                  <option key={key} value={key} />
                ))}
              </datalist>
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
            <Field label="Length">
              <input
                className="input"
                value={form.duration}
                placeholder="3:35"
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
            {(() => {
              const parsed = parseSongDuration(form.duration);
              if (parsed == null) return 'Length is optional – type 3:35 or 215.';
              return `Length: ${formatSongDuration(parsed)} (${parsed} s)`;
            })()}
          </p>
        </div>
      </Modal>
    </div>
  );
}
