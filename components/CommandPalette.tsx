'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch, IconX } from '@/components/icons';

type Hit = {
  kind: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
};

const QUICK: Hit[] = [
  { kind: 'action', id: -1, title: 'New post', subtitle: 'Planner · ⌘K', href: '/planner' },
  { kind: 'action', id: -2, title: 'Add milestone', subtitle: 'Calendar', href: '/calendar' },
  { kind: 'action', id: -3, title: 'New document', subtitle: 'Documents', href: '/docs' },
  { kind: 'action', id: -4, title: 'New design', subtitle: 'Design studio', href: '/studio' },
  { kind: 'action', id: -5, title: 'Upload media', subtitle: 'Library', href: '/media' },
  { kind: 'action', id: -6, title: 'Brand sheet', subtitle: 'CI guide & export', href: '/brand' },
  { kind: 'action', id: -7, title: 'Settings', subtitle: 'Profile, accent, palette', href: '/settings' },
];

const KIND_LABEL: Record<string, string> = {
  post: 'Post',
  media: 'Asset',
  note: 'Note',
  document: 'Doc',
  milestone: 'Date',
  design: 'Design',
  snippet: 'Snippet',
  action: 'Go',
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`)
        .then((response) => response.json())
        .then((data) => {
          setHits(data.hits ?? []);
          setActive(0);
        })
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [query, open]);

  const results = query.trim().length < 2 ? QUICK : hits;

  const go = useCallback(
    (hit: Hit) => {
      setOpen(false);
      router.push(hit.href);
    },
    [router]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, results.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    }
    if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      go(results[active]);
    }
  };

  if (!open) return null;

  return (
    <div className="cmdk-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div className="cmdk" role="dialog" aria-modal="true">
        <div className="cmdk-input">
          <IconSearch size={16} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search posts, assets, notes, documents, dates …"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
            <IconX size={14} />
          </button>
        </div>

        <div className="cmdk-list">
          {results.length === 0 ? (
            <p className="small muted cmdk-empty">Nothing found for “{query}”.</p>
          ) : (
            results.map((hit, index) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                type="button"
                className={`cmdk-item ${index === active ? 'on' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit)}
              >
                <span className="cmdk-kind">{KIND_LABEL[hit.kind] ?? hit.kind}</span>
                <span className="cmdk-main">
                  <strong className="truncate">{hit.title}</strong>
                  <span className="mono small muted truncate">{hit.subtitle}</span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="cmdk-foot">
          <span className="mono">↑↓ navigate</span>
          <span className="mono">↵ open</span>
          <span className="mono">esc close</span>
        </div>
      </div>
    </div>
  );
}
