'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  IconBookmark,
  IconCalendar,
  IconDocument,
  IconFilm,
  IconGlobe,
  IconImage,
  IconInstagram,
  IconLayout,
  IconNote,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSwatch,
  IconZap,
} from '@/components/icons';

const NAV = [
  { href: '/', label: 'Dashboard', icon: IconLayout },
  { href: '/planner', label: 'Post Planner', icon: IconInstagram },
  { href: '/calendar', label: 'Calendar', icon: IconCalendar },
  { href: '/releases', label: 'Release Wave', icon: IconZap },
  { href: '/reels', label: 'Reel Lab', icon: IconFilm },
  { href: '/studio', label: 'Design Studio', icon: IconSparkles },
  { href: '/palette', label: 'Colour Lab', icon: IconSwatch },
  { href: '/media', label: 'Media', icon: IconImage },
  { href: '/notes', label: 'Notes', icon: IconNote },
  { href: '/docs', label: 'Documents', icon: IconDocument },
];

const SETUP = [
  { href: '/website', label: 'Website', icon: IconGlobe },
  { href: '/brand', label: 'Brand Sheet', icon: IconBookmark },
  { href: '/settings', label: 'Settings', icon: IconSettings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  /* only show the lock when the workspace actually asks for a password */
  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => response.json())
      .then((data) => setLocked(Boolean(data.required)))
      .catch(() => setLocked(false));
  }, []);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign('/login');
  };

  /* the palette owns the shortcut – the button just forwards it */
  const openPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brand-mark">D</div>
        <div className="brand-text">
          <span className="brand-name">
            d<span className="brand-e">é</span>chire
          </span>
          <span className="brand-sub">Band HQ</span>
        </div>
      </Link>

      <button type="button" className="sidebar-search" onClick={openPalette}>
        <IconSearch size={15} />
        <span>Jump to …</span>
        <kbd>⌘K</kbd>
      </button>

      <nav className="nav">
        <span className="nav-label">Studio</span>
        {NAV.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <span className="nav-label">Setup</span>
        {SETUP.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-index">{String(NAV.length + index + 1).padStart(2, '0')}</span>
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <strong>Dark. Honest. Close.</strong>
        <span className="mono">POST-HARDCORE /// AUGSBURG</span>
        <div className="sidebar-links">
          <a className="mono" href="/site" target="_blank" rel="noreferrer">
            Public site ↗
          </a>
          {locked ? (
            <button type="button" className="sidebar-lock mono" onClick={signOut}>
              Lock
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
