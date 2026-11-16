'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconNote, IconPin, IconPlus, IconSearch } from '@/components/icons';
import NoteEditor from '@/components/NoteEditor';
import { EmptyState, PageHead, Spinner } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { Note } from '@/lib/types';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState('All');

  const load = useCallback(async () => {
    const response = await fetch('/api/notes');
    const data = await response.json();
    const items: Note[] = data.notes ?? [];
    setNotes(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const folders = useMemo(() => {
    const set = new Set(notes.map((note) => note.folder).filter(Boolean));
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'en'))];
  }, [notes]);

  const filtered = useMemo(() => {
    const list = notes.filter((note) => {
      if (folder !== 'All' && note.folder !== folder) return false;
      if (!query.trim()) return true;
      const haystack = [note.title, note.plainText, note.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, folder, query]);

  const activeNote = notes.find((note) => note.id === selectedId) ?? null;

  const createNote = async () => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled',
          content: '<p></p>',
          folder: folder === 'All' ? 'General' : folder,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the note');
      setNotes((current) => [data.note, ...current]);
      setSelectedId(data.note.id);
      toast('New note created');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const handleSaved = (saved: Note) => {
    setNotes((current) => current.map((note) => (note.id === saved.id ? saved : note)));
  };

  const handleDeleted = (id: number) => {
    setNotes((current) => {
      const next = current.filter((note) => note.id !== id);
      setSelectedId((selected) => (selected === id ? next[0]?.id ?? null : selected));
      return next;
    });
  };

  if (loading) return <Spinner label="Loading notes" />;

  return (
    <>
      <PageHead
        eyebrow="Notes"
        title={
          <>
            Text<span className="slash">/</span>Workshop
          </>
        }
        sub="Setlists, lyrics, content ideas, arrangements. Format, pin, find again."
        actions={
          <button type="button" className="btn btn-primary" onClick={createNote}>
            <IconPlus size={15} />
            New note
          </button>
        }
      />

      <div className="notes-layout">
        <aside className="notes-sidebar">
          <div className="notes-search">
            <IconSearch size={15} />
            <input
              className="input"
              placeholder="Search notes …"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="folder-tabs">
            {folders.map((item) => (
              <button
                key={item}
                type="button"
                className={`folder-tab ${folder === item ? 'on' : ''}`}
                onClick={() => setFolder(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="note-list">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<IconNote size={22} />}
                title="No note found"
                hint="Change the search term or create a new note."
              />
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className={`note-item ${note.id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(note.id)}
                >
                  <div className="note-item-top">
                    <span className="note-item-title truncate">{note.title || 'Untitled'}</span>
                    {note.pinned ? <IconPin size={12} className="pin-icon" /> : null}
                  </div>
                  <p className="note-item-snippet two-line">
                    {note.plainText?.slice(0, 120) || 'Empty note'}
                  </p>
                  <div className="note-item-meta">
                    <span className="chip">{note.folder}</span>
                    <span className="mono">{timeAgo(note.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="notes-main">
          {activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              folders={folders.filter((item) => item !== 'All')}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="panel">
              <EmptyState
                icon={<IconNote size={24} />}
                title="No note selected"
                hint="Pick a note on the left or start with a blank page."
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={createNote}>
                    <IconPlus size={14} /> New note
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
