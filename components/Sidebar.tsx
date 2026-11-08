'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  IconCalendar,
  IconDocument,
  IconGlobe,
  IconImage,
  IconInstagram,
  IconLayout,
  IconNote,
  IconSettings,
  IconSparkles,
  IconSwatch,
} from '@/components/icons';

const NAV = [
  { href: '/', label: 'Dashboard', icon: IconLayout },
  { href: '/planner', label: 'Post Planner', icon: IconInstagram },
  { href: '/calendar', label: 'Calendar', icon: IconCalendar },
  { href: '/studio', label: 'Design Studio', icon: IconSparkles },
  { href: '/palette', label: 'Colour Lab', icon: IconSwatch },
  { href: '/media', label: 'Media', icon: IconImage },
  { href: '/notes', label: 'Notes', icon: IconNote },
  { href: '/docs', label: 'Documents', icon: IconDocument },
];

const SETUP = [
  { href: '/website', label: 'Website', icon: IconGlobe },
  { href: '/brand', label: 'Brand Sheet', icon: IconSwatch },
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

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brand-mark">D</div>
        <div className="brand-text">
          <span className="brand-name">DECHIRE</span>
          <span className="brand-sub">Band HQ</span>
        </div>
      </Link>

      <nav className="nav">
        <span className="nav-label">Studio</span>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <span className="nav-label">Setup</span>
        {SETUP.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <span className="mono">POST-HARDCORE /// 2026</span>
        <strong>Loud. Honest. Unpolished.</strong>
        <a className="mono" href="/site" target="_blank" rel="noreferrer">
          Public site ↗
        </a>
        {locked ? (
          <button type="button" className="sidebar-lock mono" onClick={signOut}>
            Lock workspace
          </button>
        ) : null}
      </div>
    </aside>
  );
}
