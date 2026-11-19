export type PostType = 'photo' | 'carousel' | 'reel' | 'story';
export type PostStatus = 'draft' | 'scheduled' | 'published';
export type PostPlatform = 'instagram' | 'tiktok' | 'both';
export type MediaKind = 'logo' | 'photo' | 'artwork' | 'merch' | 'video' | 'other';

export type SongStatus = 'idea' | 'demo' | 'recording' | 'mix' | 'master' | 'released';

export interface Song {
  id: number;
  title: string;
  status: SongStatus;
  songKey: string;
  bpm: number | null;
  /** Length in seconds. */
  duration: number | null;
  notes: string;
  mediaCount: number;
  docCount: number;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus = 'idea' | 'preproduction' | 'shoot' | 'edit' | 'done';
export type ShotStatus = 'idea' | 'scouted' | 'ready' | 'shot' | 'edited';

export interface VideoProject {
  id: number;
  title: string;
  songId: number | null;
  songTitle: string | null;
  audioMediaId: number | null;
  audioTitle: string | null;
  audioUrl: string | null;
  treatmentDocId: number | null;
  treatmentTitle: string | null;
  status: VideoStatus;
  shootDate: string;
  location: string;
  director: string;
  notes: string;
  /** Plain-language pitch: what happens, what it feels like, how it ends. */
  concept: string;
  /** Mood words for the pitch deck ("kalt", "leer", "Gegenlicht" …). */
  lookWords: string[];
  /** What the shoot needs: people, gear, permits. */
  needs: string;
  coverMediaId: number | null;
  shotCount: number;
  plannedDuration: number;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoShot {
  id: number;
  videoId: number;
  position: number;
  start: number;
  duration: number;
  section: string;
  description: string;
  location: string;
  shotType: string;
  movement: string;
  lighting: string;
  status: ShotStatus;
  mediaId: number | null;
  media: MediaItem | null;
  /** Small data-URL PNG drawn in the storyboard sketch pad. */
  sketch: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: number;
  groupId: number | null;
  folderId: number | null;
  songId: number | null;
  songTitle: string | null;
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
  platform: PostPlatform;
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
  ttPublishId: string | null;
  ttStatus: string | null;
  ttPermalink: string | null;
  ttPublishedAt: string | null;
  ttError: string | null;
  ttLastAttempt: string | null;
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
  /** Modules switched off in Settings – ids from `lib/modules.ts`. */
  hiddenModules: string[];
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

/** TikTok Content Posting API connection (OAuth tokens + display profile). */
export interface TikTokConnection {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  accessToken: string;
  refreshToken: string;
  openId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  scope: string;
  accessExpiresAt: string | null;
  refreshExpiresAt: string | null;
  privacyLevel: 'SELF_ONLY' | 'PUBLIC_TO_EVERYONE';
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

/** A public comment left on a shared document. */
export interface DocumentComment {
  id: number;
  documentId: number;
  author: string;
  body: string;
  createdAt: string;
}

export interface DocFolder {
  id: number;
  name: string;
  createdAt: string;
}

export interface BandDocument {
  id: number;
  title: string;
  kind: DocumentKind;
  folderId: number | null;
  folderName: string | null;
  songId: number | null;
  songTitle: string | null;
  /** `null` = private. A token means the document has a public link. */
  shareToken: string | null;
  content: string;
  plainText: string;
  tags: string[];
  audio: DocumentAudio[];
  commentCount: number;
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

/* --------------------------------------------------------------- booking */

export type BookingKind =
  | 'festival'
  | 'venue'
  | 'youth'
  | 'contest'
  | 'promoter'
  | 'label'
  | 'agency'
  | 'radio'
  | 'press'
  | 'other';

export type BookingStatus =
  | 'new'
  | 'researched'
  | 'ready'
  | 'sent'
  | 'followup'
  | 'replied'
  | 'booked'
  | 'declined';

export type BookingOutreachStatus = 'queued' | 'sent' | 'failed';

export interface BookingContact {
  id: number;
  name: string;
  kind: BookingKind;
  city: string;
  region: string;
  country: string;
  email: string;
  contactName: string;
  website: string;
  instagram: string;
  sourceUrl: string;
  fitNote: string;
  tags: string[];
  status: BookingStatus;
  /** 1 = top target, 2 = normal, 3 = later / too big */
  priority: number;
  capacity: number | null;
  /** Application window or booking lead time, free text. */
  deadline: string;
  /** Rough distance from home, used for sorting. */
  distanceKm: number | null;
  lastContactAt: string | null;
  nextFollowUp: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** filled by listBookingContacts() */
  sentCount?: number;
}

export interface BookingOutreach {
  id: number;
  contactId: number;
  contactName?: string;
  language: string;
  subject: string;
  body: string;
  status: BookingOutreachStatus;
  error: string;
  sentAt: string | null;
  createdAt: string;
}

export interface BookingStep {
  key: string;
  done: boolean;
  doneAt: string | null;
}

export interface BookingTemplate {
  id: number;
  key: string;
  name: string;
  language: string;
  kind: string;
  subject: string;
  body: string;
  updatedAt: string;
}

/** Everything the templates need that is not part of a single contact. */
export interface BookingProfile {
  homebase: string;
  genre: string;
  listenUrl: string;
  liveUrl: string;
  pressUrl: string;
  sender: string;
}

export interface MailConnection {  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: number;
  lastTestAt: string | null;
  lastTestOk: boolean;
  lastTestError: string;
  updatedAt: string;
  /** the password never leaves the server – only whether one is stored */
  hasPassword: boolean;
  /** true when the SMTP settings come from environment variables */
  fromEnv?: boolean;
}
