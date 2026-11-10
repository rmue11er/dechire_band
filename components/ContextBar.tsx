'use client';

import { usePathname } from 'next/navigation';
import { IconSearch } from '@/components/icons';

const LABELS: { href: string; label: string }[] = [
  { href: '/planner', label: 'Post Planner' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/releases', label: 'Release Wave' },
  { href: '/reels', label: 'Reel Lab' },
  { href: '/studio', label: 'Design Studio' },
  { href: '/palette', label: 'Colour Lab' },
  { href: '/media', label: 'Media' },
  { href: '/notes', label: 'Notes' },
  { href: '/docs', label: 'Documents' },
  { href: '/website', label: 'Website' },
  { href: '/brand', label: 'Brand Sheet' },
  { href: '/settings', label: 'Settings' },
];

/**
 * Slim sticky bar above every HQ page: where you are, what day it is and the
 * one shortcut worth learning (⌘K). Keeps the sidebar free of meta chrome.
 */
export default function ContextBar() {
  const pathname = usePathname();
  const current = LABELS.find((item) => pathname.startsWith(item.href));
  const label = pathname === '/' ? 'Overview' : current?.label ?? 'Workspace';

  const today = new Date()
    .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/,/g, '')
    .toUpperCase();

  const openPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <div className="ctx-bar">
      <span className="ctx-crumb">
        <b>DECHIRE</b>
        <i>///</i>
        <span>{label}</span>
      </span>
      <div className="ctx-right">
        <span className="ctx-date">{today}</span>
        <button type="button" className="ctx-jump" onClick={openPalette} title="Command palette">
          <IconSearch size={12} />
          <span>Jump</span>
          <kbd>⌘K</kbd>
        </button>
      </div>
    </div>
  );
}
