'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconStar, IconX } from '@/components/icons';
import { DOC_ICON_GROUPS, type DocIconDef } from '@/lib/docIcons';

const RECENT_KEY = 'doc-icon-recent';

function Glyph({ icon, size = 15 }: { icon: DocIconDef; size?: number }) {
  return (
    <svg viewBox={icon.viewBox} width={size} height={size} aria-hidden="true" focusable="false">
      {icon.paths.map((d, index) => (
        <path key={index} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

export default function IconPicker({ onPick }: { onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
      if (Array.isArray(stored)) {
        setRecent(stored.filter((item) => typeof item === 'string').slice(0, 12));
      }
    } catch {
      setRecent([]);
    }
  }, [open]);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const all = DOC_ICON_GROUPS.map((group) => ({
      name: group.name,
      items: term
        ? group.items.filter((icon) => `${icon.name} ${icon.label}`.includes(term))
        : group.items,
    })).filter((group) => group.items.length > 0);
    if (!term && recent.length) {
      const recents = recent
        .map((name) => DOC_ICON_GROUPS.flatMap((group) => group.items).find((icon) => icon.name === name))
        .filter((icon): icon is DocIconDef => Boolean(icon));
      if (recents.length) return [{ name: 'Recent', items: recents }, ...all];
    }
    return all;
  }, [query, recent]);

  const pick = (name: string) => {
    onPick(name);
    const next = [name, ...recent.filter((item) => item !== name)].slice(0, 12);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked – recents are a nice-to-have */
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="emoji-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`tool-btn ${open ? 'on' : ''}`}
        title="Insert icon"
        aria-label="Insert icon"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <IconStar size={15} />
      </button>

      {open ? (
        <div className="emoji-pop icon-pop" role="dialog" aria-label="Icon picker">
          <div className="emoji-pop-head">
            <span className="mono small muted">Icons</span>
            <button type="button" className="emoji-close" onClick={() => setOpen(false)} aria-label="Close">
              <IconX size={12} />
            </button>
          </div>
          <div className="icon-search">
            <input
              className="input input-sm"
              value={query}
              placeholder="guitar, van, money …"
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="emoji-pop-body">
            {groups.length === 0 ? (
              <span className="mono small muted" style={{ padding: '6px 2px' }}>
                nothing found
              </span>
            ) : null}
            {groups.map((group) => (
              <div key={group.name} className="emoji-group">
                <span className="emoji-group-name">{group.name}</span>
                <div className="icon-grid">
                  {group.items.map((icon) => (
                    <button
                      key={`${group.name}-${icon.name}`}
                      type="button"
                      className="icon-btn"
                      onClick={() => pick(icon.name)}
                      title={icon.label}
                      aria-label={icon.label}
                    >
                      <Glyph icon={icon} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
