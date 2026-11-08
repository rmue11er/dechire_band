import { execute, queryAll, queryOne } from './db';
import type {
  BandDocument,
  ChecklistItem,
  Design,
  InstagramConnection,
  MediaGroup,
  MediaItem,
  Milestone,
  Note,
  PaletteColor,
  Post,
  PostMetrics,
  Profile,
  SchedulerRun,
  Snippet,
  Stats,
  TrashEntry,
} from './types';

const parseList = (value: any, fallback: string[] = []): string[] => {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : fallback;
  } catch {
    return fallback;
  }
};

const MEDIA_SELECT = `
  SELECT m.*, g.name AS group_name, g.kind AS group_kind,
    (SELECT COUNT(*) FROM post_media pm WHERE pm.media_id = m.id) AS used_in
  FROM media m
  LEFT JOIN media_groups g ON g.id = m.group_id`;

export function mapMedia(row: any): MediaItem {
  return {
    id: Number(row.id),
    groupId: row.group_id == null ? null : Number(row.group_id),
    groupName: row.group_name ?? null,
    groupKind: row.group_kind ?? null,
    variantLabel: row.variant_label ?? '',
    title: row.title,
    originalName: row.original_name,
    mime: row.mime,
    size: Number(row.size ?? 0),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    alt: row.alt ?? '',
    tags: parseList(row.tags),
    url: `/api/files/${row.filename}`,
    createdAt: row.created_at,
    usedIn: Number(row.used_in ?? 0),
  };
}

/* ------------------------------------------------------------------ media */

export function listMedia(): MediaItem[] {
  return queryAll(`${MEDIA_SELECT} ORDER BY m.id DESC`).map(mapMedia);
}

export function getMedia(id: number): MediaItem | null {
  const row = queryOne(`${MEDIA_SELECT} WHERE m.id = ?`, [id]);
  return row ? mapMedia(row) : null;
}

export function createMedia(input: {
  title: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string;
  tags?: string[];
  groupId?: number | null;
  variantLabel?: string;
}) {
  const result = execute(
    `INSERT INTO media (group_id, variant_label, title, filename, original_name, mime, size, width, height, alt, tags, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.groupId ?? null,
      input.variantLabel ?? '',
      input.title,
      input.filename,
      input.originalName,
      input.mime,
      input.size,
      input.width ?? null,
      input.height ?? null,
      input.alt ?? '',
      JSON.stringify(input.tags ?? []),
      new Date().toISOString(),
    ]
  );
  return Number(result.lastInsertRowid);
}

export function updateMedia(
  id: number,
  patch: {
    title?: string;
    variantLabel?: string;
    alt?: string;
    tags?: string[];
    groupId?: number | null;
  }
) {
  const sets: string[] = [];
  const params: any[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    params.push(patch.title);
  }
  if (patch.variantLabel !== undefined) {
    sets.push('variant_label = ?');
    params.push(patch.variantLabel);
  }
  if (patch.alt !== undefined) {
    sets.push('alt = ?');
    params.push(patch.alt);
  }
  if (patch.tags !== undefined) {
    sets.push('tags = ?');
    params.push(JSON.stringify(patch.tags));
  }
  if (patch.groupId !== undefined) {
    sets.push('group_id = ?');
    params.push(patch.groupId ?? null);
  }
  if (!sets.length) return;
  params.push(id);
  execute(`UPDATE media SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function getMediaFileRow(id: number) {
  return queryOne<{ filename: string; original_name: string; mime: string }>(
    'SELECT filename, original_name, mime FROM media WHERE id = ?',
    [id]
  );
}

export function deleteMedia(id: number) {
  const row = getMediaFileRow(id);
  execute('DELETE FROM media WHERE id = ?', [id]);
  return row;
}

/** Which posts use this asset – shown in the media detail dialog. */
export function mediaUsage(mediaId: number) {
  return queryAll<any>(
    `SELECT p.id, p.status, p.caption, p.scheduled_at, p.published_at
     FROM post_media pm JOIN posts p ON p.id = pm.post_id
     WHERE pm.media_id = ?
     ORDER BY COALESCE(p.published_at, p.scheduled_at, p.created_at) DESC`,
    [mediaId]
  ).map((row) => ({
    id: Number(row.id),
    status: row.status,
    caption: row.caption ?? '',
    scheduledAt: row.scheduled_at ?? null,
    publishedAt: row.published_at ?? null,
  }));
}

/** Swaps the file behind an existing asset – posts keep pointing at the same id. */
export function replaceMediaFile(
  id: number,
  patch: { filename: string; originalName: string; mime: string; size: number; width?: number | null; height?: number | null }
) {
  execute(
    `UPDATE media SET filename = ?, original_name = ?, mime = ?, size = ?, width = ?, height = ? WHERE id = ?`,
    [patch.filename, patch.originalName, patch.mime, patch.size, patch.width ?? null, patch.height ?? null, id]
  );
  return getMedia(id);
}

export function listGroups(): MediaGroup[] {
  const groups = queryAll<any>(
    `SELECT g.*, (SELECT COUNT(*) FROM media m WHERE m.group_id = g.id) AS count
     FROM media_groups g ORDER BY g.name COLLATE NOCASE ASC`
  );
  const media = listMedia();
  return groups.map((g) => {
    const items = media.filter((m) => m.groupId === Number(g.id));
    return {
      id: Number(g.id),
      name: g.name,
      kind: g.kind,
      description: g.description ?? '',
      createdAt: g.created_at,
      count: items.length,
      previewUrl: items[0]?.url ?? null,
      previews: items.slice(0, 3).map((m) => m.url),
    };
  });
}

export function createGroup(name: string, kind = 'artwork', description = '') {
  const result = execute(
    'INSERT INTO media_groups (name, kind, description, created_at) VALUES (?, ?, ?, ?)',
    [name, kind, description, new Date().toISOString()]
  );
  return Number(result.lastInsertRowid);
}

export function updateGroup(id: number, patch: { name?: string; kind?: string; description?: string }) {
  const sets: string[] = [];
  const params: any[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(patch.name);
  }
  if (patch.kind !== undefined) {
    sets.push('kind = ?');
    params.push(patch.kind);
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    params.push(patch.description);
  }
  if (!sets.length) return;
  params.push(id);
  execute(`UPDATE media_groups SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function deleteGroup(id: number) {
  execute('DELETE FROM media_groups WHERE id = ?', [id]);
}

/* ------------------------------------------------------------------ posts */

const POST_FIELDS: Record<string, string> = {
  type: 'type',
  status: 'status',
  caption: 'caption',
  firstComment: 'first_comment',
  altText: 'alt_text',
  location: 'location',
  songTitle: 'song_title',
  songArtist: 'song_artist',
  scheduledAt: 'scheduled_at',
  publishedAt: 'published_at',
  position: 'position',
  igMediaId: 'ig_media_id',
  igPermalink: 'ig_permalink',
  igPublishedAt: 'ig_published_at',
  igError: 'ig_error',
  igLastAttempt: 'ig_last_attempt',
};

function mapMetrics(row: any): PostMetrics {
  return {
    postId: Number(row.post_id),
    source: row.source === 'instagram' ? 'instagram' : 'manual',
    reach: Number(row.reach ?? 0),
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    saves: Number(row.saves ?? 0),
    shares: Number(row.shares ?? 0),
    capturedAt: row.captured_at,
  };
}

/** Latest metric row per post. */
function metricsByPost(): Map<number, PostMetrics> {
  const rows = queryAll<any>('SELECT * FROM post_metrics ORDER BY captured_at DESC, id DESC');
  const map = new Map<number, PostMetrics>();
  for (const row of rows) {
    const postId = Number(row.post_id);
    if (!map.has(postId)) map.set(postId, mapMetrics(row));
  }
  return map;
}

function mapPost(row: any, media: MediaItem[], metrics: PostMetrics | null = null): Post {
  return {
    id: Number(row.id),
    type: row.type,
    status: row.status,
    caption: row.caption ?? '',
    firstComment: row.first_comment ?? '',
    altText: row.alt_text ?? '',
    location: row.location ?? '',
    songTitle: row.song_title ?? '',
    songArtist: row.song_artist ?? '',
    scheduledAt: row.scheduled_at ?? null,
    publishedAt: row.published_at ?? null,
    position: Number(row.position ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    igMediaId: row.ig_media_id ?? null,
    igPermalink: row.ig_permalink ?? null,
    igPublishedAt: row.ig_published_at ?? null,
    igError: row.ig_error ?? null,
    igLastAttempt: row.ig_last_attempt ?? null,
    metrics,
    media,
  };
}

export function listPosts(): Post[] {
  const rows = queryAll<any>('SELECT * FROM posts ORDER BY position ASC, id ASC');
  const links = queryAll<any>('SELECT * FROM post_media ORDER BY post_id ASC, position ASC');
  const mediaById = new Map(listMedia().map((m) => [m.id, m]));
  const metrics = metricsByPost();
  const byPost = new Map<number, MediaItem[]>();
  for (const link of links) {
    const media = mediaById.get(Number(link.media_id));
    if (!media) continue;
    const postId = Number(link.post_id);
    if (!byPost.has(postId)) byPost.set(postId, []);
    byPost.get(postId)!.push(media);
  }
  return rows.map((row) => mapPost(row, byPost.get(Number(row.id)) ?? [], metrics.get(Number(row.id)) ?? null));
}

export function getPost(id: number): Post | null {
  const row = queryOne<any>('SELECT * FROM posts WHERE id = ?', [id]);
  if (!row) return null;
  const media = queryAll<any>(
    `${MEDIA_SELECT} JOIN post_media pm ON pm.media_id = m.id WHERE pm.post_id = ? ORDER BY pm.position ASC`,
    [id]
  ).map(mapMedia);
  const metricRow = queryOne<any>(
    'SELECT * FROM post_metrics WHERE post_id = ? ORDER BY captured_at DESC, id DESC',
    [id]
  );
  return mapPost(row, media, metricRow ? mapMetrics(metricRow) : null);
}

function nextPosition() {
  const row = queryOne<{ p: number }>('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM posts');
  return Number(row?.p ?? 0);
}

export function createPost(input: Record<string, any>) {
  const now = new Date().toISOString();
  const position = input.position ?? nextPosition();
  const result = execute(
    `INSERT INTO posts (type, status, caption, first_comment, alt_text, location, song_title, song_artist, scheduled_at, published_at, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.type ?? 'photo',
      input.status ?? 'draft',
      input.caption ?? '',
      input.firstComment ?? '',
      input.altText ?? '',
      input.location ?? '',
      input.songTitle ?? '',
      input.songArtist ?? '',
      input.scheduledAt ?? null,
      input.publishedAt ?? null,
      position,
      now,
      now,
    ]
  );
  const id = Number(result.lastInsertRowid);
  if (Array.isArray(input.mediaIds)) replacePostMedia(id, input.mediaIds);
  return id;
}

export function updatePost(id: number, patch: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, column] of Object.entries(POST_FIELDS)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(patch[key] ?? null);
    }
  }
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  execute(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`, params);
  if (Array.isArray(patch.mediaIds)) replacePostMedia(id, patch.mediaIds);
}

export function replacePostMedia(postId: number, mediaIds: number[]) {
  execute('DELETE FROM post_media WHERE post_id = ?', [postId]);
  mediaIds.forEach((mediaId, index) => {
    execute('INSERT INTO post_media (post_id, media_id, position) VALUES (?, ?, ?)', [
      postId,
      Number(mediaId),
      index,
    ]);
  });
}

export function deletePost(id: number) {
  const post = getPost(id);
  if (post) {
    pushTrash('post', post.caption.split('\n')[0].slice(0, 90) || `Post #${id}`, {
      type: post.type,
      status: post.status,
      caption: post.caption,
      firstComment: post.firstComment,
      altText: post.altText,
      location: post.location,
      songTitle: post.songTitle,
      songArtist: post.songArtist,
      scheduledAt: post.scheduledAt,
      publishedAt: post.publishedAt,
      mediaIds: post.media.map((item) => item.id),
    });
  }
  execute('DELETE FROM posts WHERE id = ?', [id]);
}

export function reorderPosts(ids: number[]) {
  ids.forEach((id, index) => {
    execute('UPDATE posts SET position = ? WHERE id = ?', [index, Number(id)]);
  });
}

export function sortPostsByDate() {
  const posts = listPosts();
  const sorted = [...posts].sort((a, b) => {
    const dateA = a.publishedAt ?? a.scheduledAt ?? a.createdAt;
    const dateB = b.publishedAt ?? b.scheduledAt ?? b.createdAt;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  reorderPosts(sorted.map((p) => p.id));
}

/* ------------------------------------------------------------------ notes */

function mapNote(row: any): Note {
  return {
    id: Number(row.id),
    title: row.title ?? '',
    content: row.content ?? '',
    plainText: row.plain_text ?? '',
    folder: row.folder ?? 'General',
    tags: parseList(row.tags),
    pinned: Boolean(row.pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listNotes(): Note[] {
  return queryAll<any>(
    'SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC'
  ).map(mapNote);
}

export function getNote(id: number): Note | null {
  const row = queryOne<any>('SELECT * FROM notes WHERE id = ?', [id]);
  return row ? mapNote(row) : null;
}

export function createNote(input: Record<string, any> = {}) {
  const now = new Date().toISOString();
  const result = execute(
    `INSERT INTO notes (title, content, plain_text, folder, tags, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title ?? 'Untitled',
      input.content ?? '<p></p>',
      input.plainText ?? '',
      input.folder ?? 'General',
      JSON.stringify(input.tags ?? []),
      input.pinned ? 1 : 0,
      now,
      now,
    ]
  );
  return getNote(Number(result.lastInsertRowid));
}

export function updateNote(id: number, patch: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    params.push(patch.title);
  }
  if (patch.content !== undefined) {
    sets.push('content = ?');
    params.push(patch.content);
  }
  if (patch.plainText !== undefined) {
    sets.push('plain_text = ?');
    params.push(patch.plainText);
  }
  if (patch.folder !== undefined) {
    sets.push('folder = ?');
    params.push(patch.folder);
  }
  if (patch.tags !== undefined) {
    sets.push('tags = ?');
    params.push(JSON.stringify(patch.tags));
  }
  if (patch.pinned !== undefined) {
    sets.push('pinned = ?');
    params.push(patch.pinned ? 1 : 0);
  }
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  execute(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params);
  return getNote(id);
}

export function deleteNote(id: number) {
  const note = getNote(id);
  if (note) {
    pushTrash('note', note.title || 'Untitled note', {
      title: note.title,
      content: note.content,
      plainText: note.plainText,
      folder: note.folder,
      tags: note.tags,
      pinned: note.pinned,
    });
  }
  execute('DELETE FROM notes WHERE id = ?', [id]);
}

/* ---------------------------------------------------------------- profile */

export function getProfile(): Profile {
  const row = queryOne<any>('SELECT * FROM profile WHERE id = 1');
  if (!row) {
    return {
      bandName: 'DECHIRE',
      handle: 'dechire.band',
      bio: '',
      website: '',
      followers: 0,
      following: 0,
      avatarMediaId: null,
      avatarUrl: null,
      highlightNames: [],
      accentHex: '#b9a5e8',
      docMediaId: null,
      docImageUrl: null,
      docMarkStrength: 14,
      updatedAt: new Date().toISOString(),
    };
  }
  const avatar = row.avatar_media_id ? getMedia(Number(row.avatar_media_id)) : null;
  const docImage = row.doc_media_id ? getMedia(Number(row.doc_media_id)) : null;
  return {
    bandName: row.band_name,
    handle: row.handle,
    bio: row.bio ?? '',
    website: row.website ?? '',
    followers: Number(row.followers ?? 0),
    following: Number(row.following ?? 0),
    avatarMediaId: row.avatar_media_id == null ? null : Number(row.avatar_media_id),
    avatarUrl: avatar?.url ?? null,
    highlightNames: parseList(row.highlight_names),
    accentHex: row.accent_hex || '#b9a5e8',
    docMediaId: row.doc_media_id == null ? null : Number(row.doc_media_id),
    docImageUrl: docImage?.url ?? null,
    docMarkStrength: Number(row.doc_mark_strength ?? 14),
    updatedAt: row.updated_at,
  };
}

export function updateProfile(patch: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  const map: Record<string, string> = {
    bandName: 'band_name',
    handle: 'handle',
    bio: 'bio',
    website: 'website',
    followers: 'followers',
    following: 'following',
    avatarMediaId: 'avatar_media_id',
    highlightNames: 'highlight_names',
    accentHex: 'accent_hex',
    docMediaId: 'doc_media_id',
    docMarkStrength: 'doc_mark_strength',
  };
  for (const [key, column] of Object.entries(map)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      const value = key === 'highlightNames' ? JSON.stringify(patch[key] ?? []) : patch[key] ?? null;
      params.push(value);
    }
  }
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  execute(`UPDATE profile SET ${sets.join(', ')} WHERE id = 1`, params);
  return getProfile();
}

/* ---------------------------------------------------------------- palette */

export function listPalette(): PaletteColor[] {
  return queryAll<any>('SELECT * FROM palette ORDER BY position ASC, id ASC').map((row) => ({
    id: Number(row.id),
    name: row.name,
    hex: row.hex,
    role: row.role,
    position: Number(row.position ?? 0),
  }));
}

export function replacePalette(colors: Omit<PaletteColor, 'id'>[]): PaletteColor[] {
  execute('DELETE FROM palette');
  colors.forEach((color, index) => {
    execute('INSERT INTO palette (name, hex, role, position) VALUES (?, ?, ?, ?)', [
      color.name,
      color.hex,
      color.role,
      index,
    ]);
  });
  return listPalette();
}

/* ---------------------------------------------------------------- designs */

function mapDesign(row: any): Design {
  let background = { type: 'solid', color: '#06060a', from: '#1a1426', to: '#06060a', angle: 135 } as any;
  let elements: any[] = [];
  try {
    background = { ...background, ...JSON.parse(row.background || '{}') };
  } catch {
    /* broken background */
  }
  try {
    const parsed = JSON.parse(row.elements || '[]');
    if (Array.isArray(parsed)) elements = parsed;
  } catch {
    /* broken elements */
  }
  return {
    id: Number(row.id),
    title: row.title,
    width: Number(row.width),
    height: Number(row.height),
    background,
    elements,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listDesigns(): Design[] {
  return queryAll<any>('SELECT * FROM designs ORDER BY updated_at DESC').map(mapDesign);
}

export function getDesign(id: number): Design | null {
  const row = queryOne<any>('SELECT * FROM designs WHERE id = ?', [id]);
  return row ? mapDesign(row) : null;
}

export function createDesign(input: Partial<Design>) {
  const now = new Date().toISOString();
  const result = execute(
    `INSERT INTO designs (title, width, height, background, elements, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title ?? 'New design',
      Number(input.width ?? 1080),
      Number(input.height ?? 1080),
      JSON.stringify(input.background ?? {}),
      JSON.stringify(input.elements ?? []),
      now,
      now,
    ]
  );
  return getDesign(Number(result.lastInsertRowid));
}

export function updateDesign(id: number, patch: Partial<Design>) {
  const sets: string[] = [];
  const params: any[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    params.push(patch.title);
  }
  if (patch.width !== undefined) {
    sets.push('width = ?');
    params.push(Number(patch.width));
  }
  if (patch.height !== undefined) {
    sets.push('height = ?');
    params.push(Number(patch.height));
  }
  if (patch.background !== undefined) {
    sets.push('background = ?');
    params.push(JSON.stringify(patch.background));
  }
  if (patch.elements !== undefined) {
    sets.push('elements = ?');
    params.push(JSON.stringify(patch.elements));
  }
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  execute(`UPDATE designs SET ${sets.join(', ')} WHERE id = ?`, params);
  return getDesign(id);
}

export function deleteDesign(id: number) {
  execute('DELETE FROM designs WHERE id = ?', [id]);
}

/* ------------------------------------------------------------- milestones */

function parseChecklist(value: any): ChecklistItem[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({ label: String(item?.label ?? '').trim(), done: Boolean(item?.done) }))
      .filter((item) => item.label.length > 0);
  } catch {
    return [];
  }
}

function mapMilestone(row: any): Milestone {
  return {
    id: Number(row.id),
    title: row.title ?? '',
    date: row.date,
    kind: (row.kind ?? 'other') as Milestone['kind'],
    note: row.note ?? '',
    done: Boolean(row.done),
    checklist: parseChecklist(row.checklist),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listMilestones(): Milestone[] {
  return queryAll<any>('SELECT * FROM milestones ORDER BY date ASC, id ASC').map(mapMilestone);
}

export function getMilestone(id: number): Milestone | null {
  const row = queryOne<any>('SELECT * FROM milestones WHERE id = ?', [id]);
  return row ? mapMilestone(row) : null;
}

export function createMilestone(input: Record<string, any> = {}) {
  const now = new Date().toISOString();
  const result = execute(
    `INSERT INTO milestones (title, date, kind, note, done, checklist, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title ?? 'Milestone',
      input.date ?? now,
      input.kind ?? 'other',
      input.note ?? '',
      input.done ? 1 : 0,
      JSON.stringify(parseChecklist(JSON.stringify(input.checklist ?? []))),
      now,
      now,
    ]
  );
  return getMilestone(Number(result.lastInsertRowid));
}

export function updateMilestone(id: number, patch: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  const map: Record<string, string> = {
    title: 'title',
    date: 'date',
    kind: 'kind',
    note: 'note',
  };
  for (const [key, column] of Object.entries(map)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(patch[key]);
    }
  }
  if (patch.done !== undefined) {
    sets.push('done = ?');
    params.push(patch.done ? 1 : 0);
  }
  if (patch.checklist !== undefined) {
    sets.push('checklist = ?');
    params.push(JSON.stringify(parseChecklist(JSON.stringify(patch.checklist))));
  }
  if (!sets.length) return getMilestone(id);
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  execute(`UPDATE milestones SET ${sets.join(', ')} WHERE id = ?`, params);
  return getMilestone(id);
}

export function deleteMilestone(id: number) {
  const milestone = getMilestone(id);
  if (milestone) {
    pushTrash('milestone', milestone.title || 'Milestone', {
      title: milestone.title,
      date: milestone.date,
      kind: milestone.kind,
      note: milestone.note,
      done: milestone.done,
      checklist: milestone.checklist,
    });
  }
  execute('DELETE FROM milestones WHERE id = ?', [id]);
}

/* -------------------------------------------------------------- documents */

function mapDocument(row: any): BandDocument {
  return {
    id: Number(row.id),
    title: row.title ?? '',
    kind: (row.kind ?? 'other') as BandDocument['kind'],
    status: (row.status ?? 'draft') as BandDocument['status'],
    content: row.content ?? '',
    plainText: row.plain_text ?? '',
    tags: parseList(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listDocuments(): BandDocument[] {
  return queryAll<any>('SELECT * FROM documents ORDER BY updated_at DESC, id DESC').map(mapDocument);
}

export function getDocument(id: number): BandDocument | null {
  const row = queryOne<any>('SELECT * FROM documents WHERE id = ?', [id]);
  return row ? mapDocument(row) : null;
}

export function createDocument(input: Record<string, any> = {}) {
  const now = new Date().toISOString();
  const result = execute(
    `INSERT INTO documents (title, kind, status, content, plain_text, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title ?? 'Untitled document',
      input.kind ?? 'other',
      input.status ?? 'draft',
      input.content ?? '<p></p>',
      input.plainText ?? '',
      JSON.stringify(input.tags ?? []),
      now,
      now,
    ]
  );
  return getDocument(Number(result.lastInsertRowid));
}

export function updateDocument(id: number, patch: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  const map: Record<string, string> = {
    title: 'title',
    kind: 'kind',
    status: 'status',
    content: 'content',
    plainText: 'plain_text',
  };
  for (const [key, column] of Object.entries(map)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(patch[key]);
    }
  }
  if (patch.tags !== undefined) {
    sets.push('tags = ?');
    params.push(JSON.stringify(patch.tags));
  }
  if (!sets.length) return getDocument(id);
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  execute(`UPDATE documents SET ${sets.join(', ')} WHERE id = ?`, params);
  return getDocument(id);
}

export function deleteDocument(id: number) {
  const document = getDocument(id);
  if (document) {
    pushTrash('document', document.title || 'Untitled document', {
      title: document.title,
      kind: document.kind,
      status: document.status,
      content: document.content,
      plainText: document.plainText,
      tags: document.tags,
    });
  }
  execute('DELETE FROM documents WHERE id = ?', [id]);
}

/* ----------------------------------------------------------------- metrics */

export function listMetrics(postId: number): PostMetrics[] {
  return queryAll<any>('SELECT * FROM post_metrics WHERE post_id = ? ORDER BY captured_at DESC', [postId]).map(
    mapMetrics
  );
}

export function saveMetrics(input: {
  postId: number;
  source?: 'manual' | 'instagram';
  reach?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
}) {
  const result = execute(
    `INSERT INTO post_metrics (post_id, source, reach, likes, comments, saves, shares, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.postId,
      input.source ?? 'manual',
      Math.max(0, Math.round(input.reach ?? 0)),
      Math.max(0, Math.round(input.likes ?? 0)),
      Math.max(0, Math.round(input.comments ?? 0)),
      Math.max(0, Math.round(input.saves ?? 0)),
      Math.max(0, Math.round(input.shares ?? 0)),
      new Date().toISOString(),
    ]
  );
  const row = queryOne<any>('SELECT * FROM post_metrics WHERE id = ?', [Number(result.lastInsertRowid)]);
  return row ? mapMetrics(row) : null;
}

/** Average reach per weekday – the honest version of a “best time” hint. */
export function bestTimeInsight() {
  const rows = queryAll<any>(
    `SELECT p.published_at, p.scheduled_at, m.reach, m.likes
     FROM post_metrics m JOIN posts p ON p.id = m.post_id
     WHERE m.reach > 0`
  );
  const buckets = new Map<number, { reach: number; count: number }>();
  for (const row of rows) {
    const stamp = row.published_at ?? row.scheduled_at;
    if (!stamp) continue;
    const weekday = new Date(stamp).getDay();
    const bucket = buckets.get(weekday) ?? { reach: 0, count: 0 };
    bucket.reach += Number(row.reach ?? 0);
    bucket.count += 1;
    buckets.set(weekday, bucket);
  }
  return [...buckets.entries()]
    .map(([weekday, bucket]) => ({ weekday, reach: Math.round(bucket.reach / bucket.count), samples: bucket.count }))
    .sort((a, b) => b.reach - a.reach);
}

/* ------------------------------------------------------------- duplicates */

export function duplicatePost(id: number) {
  const post = getPost(id);
  if (!post) return null;
  const newId = createPost({
    type: post.type,
    status: 'draft',
    caption: post.caption,
    firstComment: post.firstComment,
    altText: post.altText,
    location: post.location,
    songTitle: post.songTitle,
    songArtist: post.songArtist,
    mediaIds: post.media.map((item) => item.id),
  });
  return getPost(newId);
}

/* --------------------------------------------------------------- snippets */

function mapSnippet(row: any): Snippet {
  return {
    id: Number(row.id),
    kind: (row.kind ?? 'caption') as Snippet['kind'],
    label: row.label ?? '',
    body: row.body ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listSnippets(): Snippet[] {
  return queryAll<any>('SELECT * FROM snippets ORDER BY kind ASC, label ASC').map(mapSnippet);
}

export function getSnippet(id: number): Snippet | null {
  const row = queryOne<any>('SELECT * FROM snippets WHERE id = ?', [id]);
  return row ? mapSnippet(row) : null;
}

export function createSnippet(input: Record<string, any>) {
  const now = new Date().toISOString();
  const result = execute(
    `INSERT INTO snippets (kind, label, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [input.kind ?? 'caption', input.label ?? '', input.body ?? '', now, now]
  );
  return getSnippet(Number(result.lastInsertRowid));
}

export function updateSnippet(id: number, patch: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  for (const key of ['kind', 'label', 'body']) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(patch[key]);
    }
  }
  if (!sets.length) return getSnippet(id);
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  execute(`UPDATE snippets SET ${sets.join(', ')} WHERE id = ?`, params);
  return getSnippet(id);
}

export function deleteSnippet(id: number) {
  execute('DELETE FROM snippets WHERE id = ?', [id]);
}

/* ------------------------------------------------------------- connections */

export function getConnection(): InstagramConnection {
  const row = queryOne<any>('SELECT * FROM connections WHERE id = 1');
  if (!row) {
    return {
      provider: 'instagram',
      accountId: '',
      username: '',
      token: '',
      tokenExpiresAt: null,
      publicBase: '',
      sandbox: true,
      autoPublish: false,
      lastRunAt: null,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    provider: row.provider ?? 'instagram',
    accountId: row.account_id ?? '',
    username: row.username ?? '',
    token: row.token ?? '',
    tokenExpiresAt: row.token_expires_at ?? null,
    publicBase: row.public_base ?? '',
    sandbox: Boolean(row.sandbox),
    autoPublish: Boolean(row.auto_publish),
    lastRunAt: row.last_run_at ?? null,
    updatedAt: row.updated_at,
  };
}

export function saveConnection(patch: Partial<InstagramConnection>) {
  const current = getConnection();
  const next: InstagramConnection = { ...current, ...patch, provider: 'instagram', updatedAt: new Date().toISOString() };
  execute(
    `INSERT INTO connections (id, provider, account_id, username, token, token_expires_at, public_base, sandbox, auto_publish, last_run_at, updated_at)
     VALUES (1, 'instagram', ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       account_id = excluded.account_id,
       username = excluded.username,
       token = excluded.token,
       token_expires_at = excluded.token_expires_at,
       public_base = excluded.public_base,
       sandbox = excluded.sandbox,
       auto_publish = excluded.auto_publish,
       last_run_at = excluded.last_run_at,
       updated_at = excluded.updated_at`,
    [
      next.accountId ?? '',
      next.username ?? '',
      next.token ?? '',
      next.tokenExpiresAt ?? null,
      next.publicBase ?? '',
      next.sandbox ? 1 : 0,
      next.autoPublish ? 1 : 0,
      next.lastRunAt ?? null,
      next.updatedAt,
    ]
  );
  return getConnection();
}

/* ------------------------------------------------------------------- trash */

function mapTrash(row: any): TrashEntry {
  let payload: any = {};
  try {
    payload = JSON.parse(row.payload ?? '{}');
  } catch {
    payload = {};
  }
  return {
    id: Number(row.id),
    kind: row.kind,
    label: row.label ?? '',
    payload,
    deletedAt: row.deleted_at,
  };
}

export function pushTrash(kind: string, label: string, payload: any) {
  execute('INSERT INTO trash (kind, label, payload, deleted_at) VALUES (?, ?, ?, ?)', [
    kind,
    label,
    JSON.stringify(payload ?? {}),
    new Date().toISOString(),
  ]);
  // keep the bin small
  execute('DELETE FROM trash WHERE id NOT IN (SELECT id FROM trash ORDER BY deleted_at DESC LIMIT 60)');
}

export function listTrash(): TrashEntry[] {
  return queryAll<any>('SELECT * FROM trash ORDER BY deleted_at DESC').map(mapTrash);
}

export function getTrashEntry(id: number): TrashEntry | null {
  const row = queryOne<any>('SELECT * FROM trash WHERE id = ?', [id]);
  return row ? mapTrash(row) : null;
}

export function deleteTrashEntry(id: number) {
  execute('DELETE FROM trash WHERE id = ?', [id]);
}

export function clearTrash() {
  execute('DELETE FROM trash');
}

/* ------------------------------------------------------------- scheduler */

export function dueScheduledPosts(now = new Date()) {
  return listPosts()
    .filter((post) => post.status === 'scheduled' && post.scheduledAt)
    .filter((post) => new Date(post.scheduledAt!).getTime() <= now.getTime())
    .filter((post) => !post.igPublishedAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
}

export function nextScheduledPost(now = new Date()) {
  return listPosts()
    .filter((post) => post.status === 'scheduled' && post.scheduledAt)
    .filter((post) => new Date(post.scheduledAt!).getTime() > now.getTime())
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0] ?? null;
}

export function logSchedulerRun(entry: { published: number; failed: number; message: string }) {
  execute('INSERT INTO scheduler_log (ran_at, published, failed, message) VALUES (?, ?, ?, ?)', [
    new Date().toISOString(),
    entry.published,
    entry.failed,
    entry.message,
  ]);
  execute('DELETE FROM scheduler_log WHERE id NOT IN (SELECT id FROM scheduler_log ORDER BY ran_at DESC LIMIT 40)');
}

export function listSchedulerLog(limit = 8): SchedulerRun[] {
  return queryAll<any>('SELECT * FROM scheduler_log ORDER BY ran_at DESC LIMIT ?', [limit]).map((row) => ({
    id: Number(row.id),
    ranAt: row.ran_at,
    published: Number(row.published ?? 0),
    failed: Number(row.failed ?? 0),
    message: row.message ?? '',
  }));
}

/* ------------------------------------------------------------------ stats */

export function getStats(): Stats {
  const media = listMedia();
  const posts = listPosts();
  const notes = queryAll<any>('SELECT id FROM notes');
  return {
    posts: {
      total: posts.length,
      planned: posts.filter((p) => p.status === 'scheduled').length,
      drafts: posts.filter((p) => p.status === 'draft').length,
      published: posts.filter((p) => p.status === 'published').length,
    },
    media: {
      total: media.length,
      groups: Number(queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM media_groups')?.c ?? 0),
      storage: media.reduce((sum, m) => sum + m.size, 0),
    },
    notes: { total: notes.length },
    nextPosts: posts
      .filter((p) => p.status === 'scheduled' && p.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
      .slice(0, 3),
  };
}
