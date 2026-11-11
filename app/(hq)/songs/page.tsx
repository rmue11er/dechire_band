'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  IconChevronRight,
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
import {
  SONG_STATUS,
  formatSongDuration,
  formatSongTotal,
  songStageIndex,
  songStatusLabel,
} from '@/lib/songs';
import { toast } from '@/lib/toast';
import type { Song, SongStatus } from '@/lib/types';

type SortKey = 'updated' | 'title' | 'stage';
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const sheetRef = useRef<HTMLElement | null>(null);

  const load = async () => {
    const response = await fetch('/api/songs');
    const data = await response.json();
    const items: Song[] = data.songs ?? [];
    setSongs(items);
    // Deep link from media, docs, videos or the command palette: /songs?song=3
    const wanted = Number(new URLSearchParams(window.location.search).get('song') ?? '');
    setSelectedId(items.some((song) => song.id === wanted) ? wanted : items[0]?.id ?? null);
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
      runtime: songs.reduce((sum, song) => sum + (song.duration ?? 0), 0),
      media: songs.reduce((sum, song) => sum + song.mediaCount, 0),
      docs: songs.reduce((sum, song) => sum + song.docCount, 0),
      videos: songs.reduce((sum, song) => sum + song.videoCount, 0),
    }),
    [songs]
  );

  /** Catalogue number stays stable when the list is filtered. */
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
    if (sort === 'stage') {
      return [...items].sort(
        (a, b) => songStageIndex(b.status) - songStageIndex(a.status) || a.title.localeCompare(b.title)
      );
    }
    // Server order is already newest-first; keep it stable while a song is edited.
    return items;
  }, [songs, query, statusFilter, sort]);

  // Keep a valid selection when filters change.
  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) =>
      current != null && filtered.some((song) => song.id === current) ? current : filtered[0].id
    );
  }, [filtered]);

  // Keep the deep link in sync without a navigation.
  useEffect(() => {
    if (selectedId == null) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('song') === String(selectedId)) return;
    url.searchParams.set('song', String(selectedId));
    window.history.replaceState(null, '', url);
  }, [selectedId]);

  const activeSong = songs.find((song) => song.id === selectedId) ?? null;
  const activeStage = activeSong ? songStageIndex(activeSong.status) : 0;
  const nextStage = SONG_STATUS[activeStage + 1];
  const activeNumber = activeSong ? catalogs.get(activeSong.id) ?? 0 : 0;

  const selectSong = (id: number) => {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 980px)').matches) {
      window.requestAnimationFrame(() =>
        sheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    }
  };

  const changeStatus = async (song: Song, status: SongStatus) => {
    if (song.status === status || statusSaving) return;
    const snapshot = songs;
    setStatusSaving(true);
    setSongs((current) =>
      current.map((entry) => (entry.id === song.id ? { ...entry, status } : entry))
    );
    try {
      const response = await fetch(`/api/songs/${song.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not move the song');
      setSongs((current) =>
        current.map((entry) => (entry.id === data.song.id ? data.song : entry))
      );
      toast(`“${song.title}” is now ${songStatusLabel(status).toLowerCase()}`);
    } catch (error: any) {
      setSongs(snapshot);
      toast(error.message ?? 'Could not move the song', 'error');
    } finally {
      setStatusSaving(false);
    }
  };

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
        setSelectedId(data.song.id);
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
      const remaining = filtered.filter((entry) => entry.id !== song.id);
      setSongs((current) => current.filter((entry) => entry.id !== song.id));
      if (selectedId === song.id) setSelectedId(remaining[0]?.id ?? null);
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
        sub="One place per song. Link media, documents and music videos here, then open the song when you want to keep working on it."
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
          hint="Add the songs you are working on. Every media file, document and music video can then point to one song."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <IconPlus size={14} /> Add the first song
            </button>
          }
        />
      ) : (
        <div className="song-desk">
          <aside className="song-rail panel">
            <div className="song-rail-head">
              <span className="panel-title">Index</span>
              <em>
                {filtered.length} / {songs.length}
              </em>
            </div>

            <div className="song-filters">
              <label className="song-search">
                <IconSearch size={13} />
                <input
                  className="input"
                  value={query}
                  placeholder="Search title, key, notes"
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
            </div>

            <div className="song-list-bar">
              <span className="song-list-count">
                {filtered.length === songs.length ? 'All songs' : `${filtered.length} shown`}
              </span>
              <select
                className="song-sort"
                aria-label="Sort songs"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="updated">Recent</option>
                <option value="title">A–Z</option>
                <option value="stage">Stage</option>
              </select>
            </div>

            <div className="song-list">
              {filtered.map((song) => {
                const linked = song.mediaCount + song.docCount + song.videoCount;
                return (
                  <button
                    key={song.id}
                    type="button"
                    className={`song-row ${activeSong?.id === song.id ? 'active' : ''}`}
                    aria-current={activeSong?.id === song.id ? 'true' : undefined}
                    onClick={() => selectSong(song.id)}
                  >
                    <span className="song-row-index">
                      {String(catalogs.get(song.id) ?? 0).padStart(2, '0')}
                    </span>
                    <span className="song-row-body">
                      <span className="song-row-title">{song.title}</span>
                      <span className="song-row-meta">
                        {song.songKey ? <span>{song.songKey}</span> : null}
                        {song.bpm ? <span>{song.bpm} BPM</span> : null}
                        {song.duration ? <span>{formatSongDuration(song.duration)}</span> : null}
                        <span>{linked ? `${linked} linked` : 'nothing linked'}</span>
                      </span>
                    </span>
                    <span className={`song-row-state ${song.status}`}>
                      <span className="song-dot" />
                      {songStatusLabel(song.status)}
                    </span>
                  </button>
                );
              })}
              {!filtered.length ? (
                <p className="song-list-empty">
                  Nothing matches.
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </button>
                </p>
              ) : null}
            </div>

            <div className="song-rail-foot">
              <span>
                <em>{formatSongTotal(totals.runtime)}</em> runtime
              </span>
              <span>
                <em>{totals.media + totals.docs + totals.videos}</em> linked
              </span>
            </div>
          </aside>

          <section ref={sheetRef} className="song-sheet panel">
            {activeSong ? (
              <>
                <header className="song-sheet-head">
                  <div className="song-sheet-top">
                    <span className="song-sheet-no">
                      No. {String(activeNumber).padStart(2, '0')}
                    </span>
                    <div className="song-sheet-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => openEdit(activeSong)}
                      >
                        <IconPencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-icon"
                        title="Delete song"
                        aria-label={`Delete ${activeSong.title}`}
                        onClick={() => remove(activeSong)}
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </div>
                  <h2>{activeSong.title}</h2>
                  <p className="song-sheet-lede">{SONG_STATUS[activeStage]?.hint}</p>
                </header>

                <div className="song-stage" role="group" aria-label="Production stage">
                  {SONG_STATUS.map((entry, index) => (
                    <button
                      key={entry.value}
                      type="button"
                      className={`song-stage-step ${index < activeStage ? 'past' : ''} ${
                        index === activeStage ? 'now' : ''
                      }`}
                      aria-pressed={index === activeStage}
                      title={entry.hint}
                      disabled={statusSaving}
                      onClick={() => changeStatus(activeSong, entry.value)}
                    >
                      <span className="num">{String(index + 1).padStart(2, '0')}</span>
                      <span>{entry.label}</span>
                    </button>
                  ))}
                </div>

                <div className="song-facts">
                  <div className="song-fact">
                    <span>Key</span>
                    <b>{activeSong.songKey || '—'}</b>
                  </div>
                  <div className="song-fact">
                    <span>Tempo</span>
                    <b>{activeSong.bpm ? `${activeSong.bpm} BPM` : '—'}</b>
                  </div>
                  <div className="song-fact">
                    <span>Length</span>
                    <b>{formatSongDuration(activeSong.duration) || '—'}</b>
                  </div>
                  <div className="song-fact">
                    <span>Updated</span>
                    <b className="song-fact-time">{timeAgo(activeSong.updatedAt)}</b>
                  </div>
                </div>

                <div className="song-sheet-body">
                  <div className="song-notes">
                    <span className="song-label">Notes</span>
                    {activeSong.notes ? (
                      <p>{activeSong.notes}</p>
                    ) : (
                      <p className="song-notes-empty">
                        Nothing noted yet — arrangement, references, who still owes what.{' '}
                        <button type="button" onClick={() => openEdit(activeSong)}>
                          Add notes
                        </button>
                      </p>
                    )}
                  </div>

                  <div className="song-rooms">
                    <span className="song-label">Rooms</span>
                    <Link
                      href={`/media?song=${activeSong.id}`}
                      className={`song-room ${activeSong.mediaCount ? '' : 'zero'}`}
                    >
                      <span className="song-room-icon">
                        <IconImage size={14} />
                      </span>
                      <span className="song-room-text">
                        <b>Media</b>
                        <em>demos, artwork, photos</em>
                      </span>
                      <span className="song-room-count">{activeSong.mediaCount}</span>
                      <IconChevronRight size={14} className="song-room-go" />
                    </Link>
                    <Link
                      href={`/docs?song=${activeSong.id}`}
                      className={`song-room ${activeSong.docCount ? '' : 'zero'}`}
                    >
                      <span className="song-room-icon">
                        <IconDocument size={14} />
                      </span>
                      <span className="song-room-text">
                        <b>Documents</b>
                        <em>lyrics, notes, paperwork</em>
                      </span>
                      <span className="song-room-count">{activeSong.docCount}</span>
                      <IconChevronRight size={14} className="song-room-go" />
                    </Link>
                    <Link
                      href={`/videos?song=${activeSong.id}`}
                      className={`song-room ${activeSong.videoCount ? '' : 'zero'}`}
                    >
                      <span className="song-room-icon">
                        <IconFilm size={14} />
                      </span>
                      <span className="song-room-text">
                        <b>Video</b>
                        <em>music video projects</em>
                      </span>
                      <span className="song-room-count">{activeSong.videoCount}</span>
                      <IconChevronRight size={14} className="song-room-go" />
                    </Link>
                  </div>
                </div>

                <footer className="song-sheet-foot">
                  <div className="song-next">
                    <span className="song-label">Next step</span>
                    {nextStage ? (
                      <>
                        <b>{nextStage.label}</b>
                        <p>{nextStage.hint}</p>
                      </>
                    ) : (
                      <>
                        <b>Out in the world</b>
                        <p>Released — keep the thread alive with live shots, videos and press.</p>
                      </>
                    )}
                  </div>
                  {nextStage ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={statusSaving}
                      onClick={() => changeStatus(activeSong, nextStage.value)}
                    >
                      Move to {nextStage.label} <IconChevronRight size={12} />
                    </button>
                  ) : null}
                </footer>
              </>
            ) : (
              <div className="song-sheet-empty">
                <IconMusic size={22} />
                <h3>{songs.length ? 'No song matches' : 'No song selected'}</h3>
                <p>
                  {songs.length
                    ? 'Loosen the search or the status filter.'
                    : 'Pick a song from the index.'}
                </p>
                {songs.length ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            )}
          </section>
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
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as SongStatus })
                }
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
