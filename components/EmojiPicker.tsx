'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSmile, IconX } from '@/components/icons';

type Group = { name: string; items: string[] };

const GROUPS: Group[] = [
  { name: 'Band', items: ['🎸', '🥁', '🎤', '🎧', '🎚️', '🎛️', '🔊', '🎹', '🎺', '🎻', '🪘', '📻'] },
  { name: 'Mood', items: ['🖤', '💀', '🥀', '🕯️', '🌑', '☠️', '🩸', '⚡', '🔥', '🌫️', '🕸️', '⛓️'] },
  { name: 'Orga', items: ['✅', '☑️', '❌', '⚠️', '📌', '📎', '📅', '⏰', '📝', '✍️', '📄', '📋', '🔖', '💡', '➡️', '⏳'] },
  { name: 'On the road', items: ['🚐', '🚌', '🚂', '✈️', '🏚️', '🏟️', '🎪', '🍺', '☕', '🍕', '🌭', '🥨'] },
  { name: 'Faces', items: ['🙂', '😐', '🙃', '😵‍💫', '🤘', '🤙', '👊', '🫡', '😤', '🥲', '😂', '🫠'] },
];

const RECENT_KEY = 'doc-emoji-recent';

export default function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
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
      if (Array.isArray(stored)) setRecent(stored.filter((item) => typeof item === 'string').slice(0, 10));
    } catch {
      setRecent([]);
    }
  }, [open]);

  const pick = (emoji: string) => {
    onPick(emoji);
    const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, 10);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked – recents are a nice-to-have */
    }
    setOpen(false);
  };

  const groups = useMemo(() => (recent.length ? [{ name: 'Recent', items: recent }, ...GROUPS] : GROUPS), [recent]);

  return (
    <div className="emoji-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`tool-btn ${open ? 'on' : ''}`}
        title="Insert emoji"
        aria-label="Insert emoji"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <IconSmile size={15} />
      </button>

      {open ? (
        <div className="emoji-pop" role="dialog" aria-label="Emoji picker">
          <div className="emoji-pop-head">
            <span className="mono small muted">Emoji</span>
            <button type="button" className="emoji-close" onClick={() => setOpen(false)} aria-label="Close">
              <IconX size={12} />
            </button>
          </div>
          <div className="emoji-pop-body">
            {groups.map((group) => (
              <div key={group.name} className="emoji-group">
                <span className="emoji-group-name">{group.name}</span>
                <div className="emoji-grid">
                  {group.items.map((emoji, index) => (
                    <button
                      key={`${group.name}-${emoji}-${index}`}
                      type="button"
                      className="emoji-btn"
                      onClick={() => pick(emoji)}
                      title={emoji}
                    >
                      {emoji}
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
