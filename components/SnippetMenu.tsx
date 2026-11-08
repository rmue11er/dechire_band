'use client';

import { useEffect, useRef, useState } from 'react';
import { IconHash, IconPlus, IconTrash, IconX } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { Snippet, SnippetKind } from '@/lib/types';

const TABS: { value: SnippetKind; label: string }[] = [
  { value: 'caption', label: 'Captions' },
  { value: 'hashtags', label: 'Hashtags' },
  { value: 'hook', label: 'Hooks' },
];

export default function SnippetMenu({
  kinds = ['caption', 'hashtags', 'hook'],
  currentText,
  onInsert,
}: {
  kinds?: SnippetKind[];
  currentText?: string;
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [tab, setTab] = useState<SnippetKind>(kinds[0]);
  const [label, setLabel] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/snippets')
      .then((response) => response.json())
      .then((data) => setSnippets(data.snippets ?? []))
      .catch(() => toast('Could not load the snippets', 'error'));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const visible = snippets.filter((snippet) => snippet.kind === tab && kinds.includes(snippet.kind));

  const saveCurrent = async () => {
    const body = (currentText ?? '').trim();
    if (!body) {
      toast('There is nothing to save yet', 'error');
      return;
    }
    try {
      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: tab, label: label.trim() || body.slice(0, 40), body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the snippet');
      setSnippets((current) => [...current, data.snippet]);
      setLabel('');
      toast('Snippet saved');
    } catch (error: any) {
      toast(error.message ?? 'Could not save the snippet', 'error');
    }
  };

  const remove = async (id: number) => {
    const response = await fetch(`/api/snippets/${id}`, { method: 'DELETE' });
    if (response.ok) setSnippets((current) => current.filter((snippet) => snippet.id !== id));
  };

  return (
    <div className="snippet-menu" ref={boxRef}>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen((value) => !value)}>
        <IconHash size={13} />
        Snippets
      </button>

      {open ? (
        <div className="snippet-pop">
          <div className="snippet-tabs">
            {TABS.filter((entry) => kinds.includes(entry.value)).map((entry) => (
              <button
                key={entry.value}
                type="button"
                className={`snippet-tab ${tab === entry.value ? 'on' : ''}`}
                onClick={() => setTab(entry.value)}
              >
                {entry.label}
              </button>
            ))}
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
              <IconX size={13} />
            </button>
          </div>

          <div className="snippet-list">
            {visible.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>
                Nothing saved yet – write it once and keep it here.
              </p>
            ) : (
              visible.map((snippet) => (
                <div className="snippet-row" key={snippet.id}>
                  <button
                    type="button"
                    className="snippet-pick"
                    onClick={() => {
                      onInsert(snippet.body);
                      setOpen(false);
                    }}
                    title={snippet.body}
                  >
                    <strong>{snippet.label}</strong>
                    <span className="snippet-preview">{snippet.body}</span>
                  </button>
                  <button type="button" className="icon-btn danger" title="Delete" onClick={() => remove(snippet.id)}>
                    <IconTrash size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="snippet-add">
            <input
              className="input"
              placeholder="Name for the current text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <button type="button" className="btn btn-sm btn-primary" onClick={saveCurrent}>
              <IconPlus size={13} /> Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
