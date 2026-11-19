/**
 * Every module of the workspace in one list. The sidebar, the ⌘K palette and
 * the settings page read from here, so switching a module off happens once and
 * it disappears everywhere. Nothing is deleted – the page itself keeps working
 * when it is opened directly.
 */

export type ModuleDef = {
  id: string;
  href: string;
  label: string;
  /** one line for the switch row in Settings */
  note: string;
  /** cannot be switched off – otherwise there is no way back to Settings */
  locked?: boolean;
};

export type ModuleGroup = { id: string; label: string; items: ModuleDef[] };

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: 'plan',
    label: 'Plan',
    items: [
      { id: 'planner', href: '/admin/planner', label: 'Post Planner', note: 'Caption, mockup, schedule' },
      { id: 'calendar', href: '/admin/calendar', label: 'Calendar', note: 'Dates, milestones, reminder' },
      { id: 'releases', href: '/admin/releases', label: 'Release Wave', note: 'Playbook around one release' },
      { id: 'booking', href: '/admin/booking', label: 'Booking', note: 'Venues, mails, contacts' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    items: [
      { id: 'songs', href: '/admin/songs', label: 'Songs', note: 'Catalogue with media, docs, videos' },
      { id: 'reels', href: '/admin/reels', label: 'Reel Lab', note: 'Vertical clips with lyrics' },
      { id: 'videos', href: '/admin/videos', label: 'Video Lab', note: 'Idea, shots, shoot day, pitch' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    items: [
      { id: 'studio', href: '/admin/studio', label: 'Design Studio', note: 'Artwork and templates' },
      { id: 'palette', href: '/admin/palette', label: 'Colour Lab', note: 'Build and test CI colours' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    items: [
      { id: 'media', href: '/admin/media', label: 'Media', note: 'Files and folders' },
      { id: 'notes', href: '/admin/notes', label: 'Notes', note: 'Short thoughts' },
      { id: 'docs', href: '/admin/docs', label: 'Documents', note: 'Rider, lyrics, press text' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    items: [
      { id: 'website', href: '/admin/website', label: 'Website', note: 'The public one-pager' },
      { id: 'brand', href: '/admin/brand', label: 'Brand Sheet', note: 'CI sheet and press kit' },
      {
        id: 'settings',
        href: '/admin/settings',
        label: 'Settings',
        note: 'Profile, CI, modules',
        locked: true,
      },
    ],
  },
];

export const ALL_MODULES: ModuleDef[] = MODULE_GROUPS.flatMap((group) => group.items);
export const MODULE_IDS: string[] = ALL_MODULES.map((module) => module.id);

export const HIDDEN_MODULES_EVENT = 'modules:updated';
export const HIDDEN_MODULES_KEY = 'hq-hidden-modules';

export const moduleById = (id: string) => ALL_MODULES.find((module) => module.id === id) ?? null;

/** Keeps only known ids and never the locked ones – whatever the client sends. */
export function normaliseHiddenModules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const wanted = new Set(value.filter((entry): entry is string => typeof entry === 'string'));
  return MODULE_IDS.filter((id) => wanted.has(id) && !moduleById(id)?.locked);
}

/** Does this href belong to a switched-off module? (`/admin/planner?post=3` too) */
export function isHrefHidden(hidden: string[], href: string): boolean {
  const match = ALL_MODULES.find(
    (module) =>
      href === module.href || href.startsWith(`${module.href}/`) || href.startsWith(`${module.href}?`)
  );
  return match ? hidden.includes(match.id) : false;
}
