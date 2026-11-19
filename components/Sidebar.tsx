'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useHiddenModules } from '@/components/useHiddenModules';
import { MODULE_GROUPS } from '@/lib/modules';
import {
  IconBookmark,
  IconCalendar,
  IconChevronDown,
  IconDocument,
  IconFilm,
  IconGlobe,
  IconImage,
  IconInstagram,
  IconLayout,
  IconMail,
  IconMusic,
  IconNote,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconSwatch,
  IconVideo,
  IconZap,
} from '@/components/icons';

type NavItem = { id: string; href: string; label: string; icon: typeof IconLayout };

const DASHBOARD: NavItem = { id: 'dashboard', href: '/admin', label: 'Dashboard', icon: IconLayout };

/** Icons belong to the look, not to the module list – mapped by href. */
const ICONS: Record<string, typeof IconLayout> = {
  '/admin/planner': IconInstagram,
  '/admin/calendar': IconCalendar,
  '/admin/releases': IconZap,
  '/admin/booking': IconMail,
  '/admin/songs': IconMusic,
  '/admin/reels': IconFilm,
  '/admin/videos': IconVideo,
  '/admin/studio': IconSparkles,
  '/admin/palette': IconSwatch,
  '/admin/media': IconImage,
  '/admin/notes': IconNote,
  '/admin/docs': IconDocument,
  '/admin/website': IconGlobe,
  '/admin/brand': IconBookmark,
  '/admin/settings': IconSettings,
};

const GROUPS: { id: string; label: string; items: NavItem[] }[] = MODULE_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  items: group.items.map((item) => ({ ...item, icon: ICONS[item.href] ?? IconLayout })),
}));

const ALL_ITEMS = GROUPS.flatMap((group) => group.items);
const INDEX_BY_HREF = new Map(ALL_ITEMS.map((item, index) => [item.href, String(index + 1).padStart(2, '0')]));
const NAV_STATE_KEY = 'hq-nav-groups';

export default function Sidebar() {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [navReady, setNavReady] = useState(false);
  const hiddenModules = useHiddenModules();
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  const activeGroup = GROUPS.find((group) => group.items.some((item) => isActive(item.href)))?.id;

  /* remember which groups are open – but always reveal the current page */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NAV_STATE_KEY);
      if (raw) setOpenGroups(JSON.parse(raw));
    } catch {
      /* ignore broken storage */
    }
    setNavReady(true);
  }, []);

  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups((current) => (current[activeGroup] ? current : { ...current, [activeGroup]: true }));
  }, [activeGroup]);

  useEffect(() => {
    if (!navReady) return;
    window.localStorage.setItem(NAV_STATE_KEY, JSON.stringify(openGroups));
  }, [openGroups, navReady]);

  const toggleGroup = (id: string) =>
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));

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
      <Link href="/admin" className="brand">
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

      <nav className="nav" aria-label="Band HQ">
        <Link
          href={DASHBOARD.href}
          className={`nav-item nav-dashboard ${isActive(DASHBOARD.href) ? 'active' : ''}`}
          aria-current={isActive(DASHBOARD.href) ? 'page' : undefined}
        >
          <span className="nav-index">00</span>
          <IconLayout size={17} />
          <span>{DASHBOARD.label}</span>
        </Link>

        {GROUPS.map((group) => {
          const items = group.items.filter((item) => !hiddenModules.includes(item.id));
          if (!items.length) return null;
          const open = Boolean(openGroups[group.id]);
          return (
            <div key={group.id} className={`nav-group ${open ? 'open' : 'collapsed'}`}>
              <button
                type="button"
                className={`nav-group-head ${open ? 'open' : ''}`}
                aria-expanded={open}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="nav-group-label">
                  <i>///</i>
                  {group.label}
                </span>
                <span className="nav-group-count">{items.length}</span>
                <IconChevronDown size={12} className="nav-group-caret" />
              </button>
              <div className="nav-group-items">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item ${active ? 'active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span className="nav-index">{INDEX_BY_HREF.get(item.href) ?? '—'}</span>
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <strong>Dark. Honest. Close.</strong>
        <span className="mono">POST-HARDCORE /// AUGSBURG</span>
        <div className="sidebar-links">
          <a className="mono" href="/" target="_blank" rel="noreferrer">
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
