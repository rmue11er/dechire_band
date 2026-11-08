import { execute, queryAll, queryOne } from './db';
import { getMedia, getProfile, listPosts } from './repo';
import type { MediaItem, Post, SiteCrewMember, SiteData, SiteLink, SiteSettings } from './types';

/**
 * Public one-pager: everything a visitor sees comes from the `site` row plus the
 * media library and the published posts. No release feed, no countdown – the page
 * should feel like a note from four people, not a press kit.
 */

const parseList = <T>(value: any, map: (entry: any) => T, fallback: T[] = []): T[] => {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.map(map) : fallback;
  } catch {
    return fallback;
  }
};

const asLink = (entry: any): SiteLink => ({
  label: String(entry?.label ?? ''),
  url: String(entry?.url ?? ''),
  kind: String(entry?.kind ?? 'link'),
});

const asCrew = (entry: any): SiteCrewMember => ({
  name: String(entry?.name ?? ''),
  role: String(entry?.role ?? ''),
});

const DEFAULT_SETTINGS: SiteSettings = {
  published: true,
  bandName: 'DECHIRE',
  tagline: '',
  manifesto: [],
  introTitle: '',
  introSignature: '',
  crew: [],
  heroMediaId: null,
  heroUrl: null,
  heroVideo: '',
  heroOverlay: 40,
  grain: true,
  mediaTitle: '',
  mediaNote: '',
  mediaIds: [],
  showHero: true,
  showIntro: true,
  showMedia: true,
  showFeed: true,
  showConnect: true,
  showFooter: true,
  feedTitle: 'FROM THE FEED',
  teaserUrl: '',
  showTeaser: true,
  links: [],
  pressQuote: '',
  pressSource: '',
  footerNote: '',
  seoDescription: '',
  accentHex: '',
  updatedAt: new Date().toISOString(),
};

export function getSiteSettings(): SiteSettings {
  const row = queryOne<any>('SELECT * FROM site WHERE id = 1');
  const profile = getProfile();
  if (!row) return { ...DEFAULT_SETTINGS, bandName: profile.bandName, accentHex: profile.accentHex };

  const hero = row.hero_media_id ? getMedia(Number(row.hero_media_id)) : null;
  return {
    published: Boolean(row.published),
    bandName: row.band_name || profile.bandName,
    tagline: row.tagline ?? '',
    manifesto: parseList<string>(row.manifesto, String),
    introTitle: row.intro_title ?? '',
    introSignature: row.intro_signature ?? '',
    crew: parseList<SiteCrewMember>(row.crew, asCrew),
    heroMediaId: row.hero_media_id == null ? null : Number(row.hero_media_id),
    heroUrl: hero?.url ?? null,
    heroVideo: row.hero_video ?? '',
    heroOverlay: Number(row.hero_overlay ?? 40),
    grain: Boolean(row.grain),
    mediaTitle: row.media_title ?? '',
    mediaNote: row.media_note ?? '',
    mediaIds: parseList<number>(row.media_ids, Number),
    showHero: Boolean(row.show_hero),
    showIntro: Boolean(row.show_intro),
    showMedia: Boolean(row.show_media),
    showFeed: Boolean(row.show_feed),
    showConnect: Boolean(row.show_connect),
    showFooter: Boolean(row.show_footer),
    feedTitle: row.feed_title ?? '',
    teaserUrl: row.teaser_url ?? '',
    showTeaser: Boolean(row.show_teaser),
    links: parseList<SiteLink>(row.links, asLink),
    pressQuote: row.press_quote ?? '',
    pressSource: row.press_source ?? '',
    footerNote: row.footer_note ?? '',
    seoDescription: row.seo_description ?? '',
    accentHex: row.accent_hex || profile.accentHex,
    updatedAt: row.updated_at,
  };
}

const COLUMNS: Record<string, string> = {
  published: 'published',
  bandName: 'band_name',
  tagline: 'tagline',
  manifesto: 'manifesto',
  introTitle: 'intro_title',
  introSignature: 'intro_signature',
  crew: 'crew',
  heroMediaId: 'hero_media_id',
  heroVideo: 'hero_video',
  heroOverlay: 'hero_overlay',
  grain: 'grain',
  mediaTitle: 'media_title',
  mediaNote: 'media_note',
  mediaIds: 'media_ids',
  showHero: 'show_hero',
  showIntro: 'show_intro',
  showMedia: 'show_media',
  showFeed: 'show_feed',
  showConnect: 'show_connect',
  showFooter: 'show_footer',
  feedTitle: 'feed_title',
  teaserUrl: 'teaser_url',
  showTeaser: 'show_teaser',
  links: 'links',
  pressQuote: 'press_quote',
  pressSource: 'press_source',
  footerNote: 'footer_note',
  seoDescription: 'seo_description',
  accentHex: 'accent_hex',
};

const JSON_FIELDS = new Set(['manifesto', 'crew', 'mediaIds', 'links']);
const BOOL_FIELDS = new Set([
  'published',
  'grain',
  'showHero',
  'showIntro',
  'showMedia',
  'showFeed',
  'showConnect',
  'showFooter',
  'showTeaser',
]);

export function saveSiteSettings(patch: Record<string, any>): SiteSettings {
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (patch[key] === undefined) continue;
    sets.push(`${column} = ?`);
    if (JSON_FIELDS.has(key)) params.push(JSON.stringify(patch[key] ?? []));
    else if (BOOL_FIELDS.has(key)) params.push(patch[key] ? 1 : 0);
    else params.push(patch[key] ?? null);
  }
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  execute(`UPDATE site SET ${sets.join(', ')} WHERE id = 1`, params);
  return getSiteSettings();
}

/* ------------------------------------------------------------- page data */

/** Published posts with at least one image, newest first. */
function feedPosts(limit = 6): Post[] {
  return listPosts()
    .filter((post) => post.status === 'published' && post.media.length > 0 && post.type !== 'story')
    .sort((a, b) => {
      const at = new Date(a.publishedAt ?? a.scheduledAt ?? a.createdAt).getTime();
      const bt = new Date(b.publishedAt ?? b.scheduledAt ?? b.createdAt).getTime();
      return bt - at;
    })
    .slice(0, limit);
}

export function getSiteData(): SiteData {
  const settings = getSiteSettings();
  const profile = getProfile();
  const shots = settings.mediaIds
    .map((id) => getMedia(id))
    .filter((item): item is MediaItem => Boolean(item));

  return {
    settings,
    shots,
    feed: settings.showFeed
      ? feedPosts(6).map((post) => ({
          id: post.id,
          url: post.media[0].url,
          permalink: post.igPermalink,
          caption: post.caption.split('\n')[0].slice(0, 120),
        }))
      : [],
    accentHex: settings.accentHex || profile.accentHex,
    bandName: settings.bandName || profile.bandName,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl,
  };
}

/** Latest photos/videos – handy as the default state of the media picker. */
export function siteShotCandidates(limit = 24): MediaItem[] {
  return queryAll<any>(
    `SELECT m.id FROM media m LEFT JOIN media_groups g ON g.id = m.group_id
     WHERE m.mime LIKE 'image/%' OR m.mime LIKE 'video/%'
     ORDER BY (g.kind = 'photo') DESC, m.id DESC LIMIT ?`,
    [limit]
  )
    .map((row) => getMedia(Number(row.id)))
    .filter((item): item is MediaItem => Boolean(item));
}
