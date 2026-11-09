export type PostType = 'photo' | 'carousel' | 'reel' | 'story';
export type PostStatus = 'draft' | 'scheduled' | 'published';
export type MediaKind = 'logo' | 'photo' | 'artwork' | 'merch' | 'video' | 'other';

export interface MediaItem {
  id: number;
  groupId: number | null;
  folderId: number | null;
  folderName: string | null;
  groupName: string | null;
  groupKind: string | null;
  variantLabel: string;
  title: string;
  originalName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  tags: string[];
  url: string;
  createdAt: string;
  usedIn: number;
}

export interface MediaGroup {
  id: number;
  name: string;
  kind: string;
  description: string;
  createdAt: string;
  count: number;
  previewUrl: string | null;
  previews: string[];
}

/** A real folder in the media library – folders can nest. */
export interface MediaFolder {
  id: number;
  parentId: number | null;
  name: string;
  createdAt: string;
  /** files directly inside */
  count: number;
  /** files in this folder and everything below it */
  total: number;
  depth: number;
}

export interface Post {
  id: number;
  type: PostType;
  status: PostStatus;
  caption: string;
  firstComment: string;
  altText: string;
  location: string;
  songTitle: string;
  songArtist: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  igMediaId: string | null;
  igPermalink: string | null;
  igPublishedAt: string | null;
  igError: string | null;
  igLastAttempt: string | null;
  metrics: PostMetrics | null;
  media: MediaItem[];
}

export interface PostMetrics {
  postId: number;
  source: 'manual' | 'instagram';
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  capturedAt: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  plainText: string;
  folder: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  bandName: string;
  handle: string;
  bio: string;
  website: string;
  followers: number;
  following: number;
  avatarMediaId: number | null;
  avatarUrl: string | null;
  highlightNames: string[];
  accentHex: string;
  /** Optional second CI colour – `null` derives it from the accent. */
  accent2Hex: string | null;
  /** Watermark used on document sheets – subtle by design. */
  docMediaId: number | null;
  docImageUrl: string | null;
  docMarkStrength: number;
  updatedAt: string;
}

export type MilestoneKind = 'release' | 'show' | 'deadline' | 'meeting' | 'content' | 'other';

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Milestone {
  id: number;
  title: string;
  date: string;
  kind: MilestoneKind;
  note: string;
  done: boolean;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export type SnippetKind = 'caption' | 'hashtags' | 'hook';

export interface Snippet {
  id: number;
  kind: SnippetKind;
  label: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramConnection {
  provider: string;
  accountId: string;
  username: string;
  token: string;
  tokenExpiresAt: string | null;
  publicBase: string;
  sandbox: boolean;
  autoPublish: boolean;
  lastRunAt: string | null;
  updatedAt: string;
}

export interface SchedulerRun {
  id: number;
  ranAt: string;
  published: number;
  failed: number;
  message: string;
}

export interface TrashEntry {
  id: number;
  kind: string;
  label: string;
  payload: any;
  deletedAt: string;
}

export type DocumentKind = 'rider' | 'contract' | 'press' | 'lyrics' | 'itinerary' | 'orga' | 'other';

/** An audio file (demo, voice memo, rough mix) attached to a document. */
export interface DocumentAudio {
  id: number;
  mediaId: number;
  label: string;
  position: number;
  createdAt: string;
  media: MediaItem;
}

export interface BandDocument {
  id: number;
  title: string;
  kind: DocumentKind;
  status: 'draft' | 'final';
  content: string;
  plainText: string;
  tags: string[];
  audio: DocumentAudio[];
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  posts: { total: number; planned: number; drafts: number; published: number };
  media: { total: number; groups: number; storage: number };
  notes: { total: number };
  nextPosts: Post[];
}

/* ------------------------------------------------------- Design studio */

export type ElementType = 'text' | 'shape' | 'image' | 'sticker' | 'texture';
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'lighten'
  | 'darken';

export type ShapeKind =
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'burst'
  | 'cross'
  | 'slash'
  | 'frame'
  | 'tape'
  | 'line';

export type StickerKind = 'asterisk' | 'spark' | 'arrow' | 'circle' | 'x' | 'brackets' | 'dots' | 'wave' | 'bolt' | 'heart';

export type TextureKind = 'grain' | 'scanlines' | 'halftone' | 'vignette' | 'grid' | 'stripes';

export interface DesignBackground {
  type: 'solid' | 'gradient';
  color: string;
  from: string;
  to: string;
  angle: number;
}

export interface ElementBase {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
  hidden: boolean;
}

export interface TextElement extends ElementBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  uppercase: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  outlineWidth: number;
  outlineColor: string;
  shadow: 'none' | 'soft' | 'glow' | 'hard' | 'echo';
  bgColor: string;
  bgPadding: number;
  bgRadius: number;
}

export interface ShapeElement extends ElementBase {
  type: 'shape';
  shape: ShapeKind;
  fillType: 'solid' | 'gradient' | 'none';
  fill: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  strokeColor: string;
  strokeWidth: number;
  radius: number;
}

export interface ImageElement extends ElementBase {
  type: 'image';
  url: string;
  mediaId: number | null;
  fit: 'cover' | 'contain';
  radius: number;
  grayscale: number;
  contrast: number;
  brightness: number;
  saturation: number;
  tintColor: string;
  tintOpacity: number;
}

export interface StickerElement extends ElementBase {
  type: 'sticker';
  glyph: StickerKind;
  color: string;
}

export interface TextureElement extends ElementBase {
  type: 'texture';
  texture: TextureKind;
  color: string;
  scale: number;
}

export type DesignElement = TextElement | ShapeElement | ImageElement | StickerElement | TextureElement;

export interface Design {
  id?: number;
  title: string;
  width: number;
  height: number;
  background: DesignBackground;
  elements: DesignElement[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaletteColor {
  id?: number;
  name: string;
  hex: string;
  role: string;
  position?: number;
}

/* --------------------------------------------------------- Public website */

export interface SiteLink {
  label: string;
  url: string;
  kind: string;
}

export interface SiteCrewMember {
  name: string;
  role: string;
}

export interface SiteSettings {
  published: boolean;
  bandName: string;
  tagline: string;
  /** The letter, one paragraph per entry. */
  manifesto: string[];
  introTitle: string;
  introSignature: string;
  crew: SiteCrewMember[];
  heroMediaId: number | null;
  heroUrl: string | null;
  heroVideo: string;
  heroOverlay: number;
  grain: boolean;
  mediaTitle: string;
  mediaNote: string;
  mediaIds: number[];
  showHero: boolean;
  showIntro: boolean;
  showMedia: boolean;
  showFeed: boolean;
  showConnect: boolean;
  showFooter: boolean;
  feedTitle: string;
  teaserUrl: string;
  showTeaser: boolean;
  links: SiteLink[];
  pressQuote: string;
  pressSource: string;
  footerNote: string;
  seoDescription: string;
  accentHex: string;
  updatedAt: string;
}

/** The release the public page should mention, if there is one. */
export interface SiteRelease {
  title: string;
  date: string;
  type: ReleaseType;
  coverUrl: string | null;
  presaveUrl: string;
}

/** Everything the public one-pager renders – one round trip, no client fetching. */
export interface SiteData {
  settings: SiteSettings;
  shots: MediaItem[];
  feed: { id: number; url: string; permalink: string | null; caption: string }[];
  accentHex: string;
  bandName: string;
  handle: string;
  avatarUrl: string | null;
  release: SiteRelease | null;
}

/* ------------------------------------------------------- release wave */

export type ReleaseType = 'single' | 'ep' | 'album' | 'video';
export type ReleaseStatus = 'planning' | 'active' | 'released' | 'archived';
export type ReleasePhaseId = 'production' | 'tease' | 'announce' | 'countdown' | 'release' | 'sustain';

export type TaskModule = 'planner' | 'studio' | 'media' | 'docs' | 'press' | 'website' | 'orga';
export type AssetKind = 'image' | 'video' | 'audio';

export interface ReleaseTask {
  id: number;
  releaseId: number;
  phase: ReleasePhaseId;
  key: string;
  label: string;
  detail: string;
  module: TaskModule;
  offsetDays: number;
  dueDate: string;
  channel: string;
  critical: boolean;
  done: boolean;
  postId: number | null;
  documentId: number | null;
  /** Media attached to this step (cover, video, canvas loop, master …). */
  mediaId: number | null;
  /** Which kind of media the step expects – drives the picker filter. */
  mediaKind: AssetKind | '';
  designId: number | null;
  /** Internal note, not part of the researched detail text. */
  notes: string;
  /** Source URL backing the instruction (Spotify for Artists, YouTube Help …). */
  reference: string;
  media?: MediaItem | null;
  createdAt: string;
}

export interface Release {
  id: number;
  title: string;
  type: ReleaseType;
  status: ReleaseStatus;
  releaseDate: string;
  announceDate: string | null;
  presaveUrl: string;
  coverMediaId: number | null;
  coverUrl: string | null;
  /** The finished master – makes the release playable at the top of the page. */
  audioMediaId: number | null;
  audioUrl: string | null;
  videoMediaId: number | null;
  videoUrl: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  tasks?: ReleaseTask[];
  /** summary for the gallery, computed in listReleases() */
  taskTotal?: number;
  taskDone?: number;
}
