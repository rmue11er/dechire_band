import path from 'node:path';
import type { MediaItem, Note, Post } from './types';

export const escapeHtml = (value: string) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pad = (value: number) => String(value).padStart(2, '0');

export function mediaFilename(media: MediaItem) {
  return path.basename(media.url);
}

export function mediaExportName(media: MediaItem, index: number) {
  const base = `${media.title}-${media.variantLabel || 'original'}`
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${pad(index + 1)}-${base}${path.extname(mediaFilename(media))}`;
}

export function postDate(post: Post) {
  const source = post.scheduledAt || post.publishedAt || post.updatedAt || post.createdAt;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return 'undatiert';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function postFolderName(post: Post, index?: number) {
  const prefix = index === undefined ? '' : `${pad(index + 1)}_`;
  return `${prefix}${postDate(post)}_${post.status}_${post.type}`;
}

export function captionText(post: Post) {
  const parts: string[] = [];
  parts.push(post.caption?.trim() || '(no caption)');
  if (post.firstComment?.trim()) {
    parts.push('', '─── FIRST COMMENT ───', post.firstComment.trim());
  }
  return parts.join('\n');
}

export function postMetadata(post: Post) {
  return {
    id: post.id,
    status: post.status,
    type: post.type,
    scheduledAt: post.scheduledAt,
    publishedAt: post.publishedAt,
    location: post.location,
    song: { title: post.songTitle, artist: post.songArtist },
    caption: post.caption,
    firstComment: post.firstComment,
    altText: post.altText,
    media: post.media.map((m) => ({
      title: m.title,
      variant: m.variantLabel,
      file: mediaFilename(m),
      width: m.width,
      height: m.height,
      mime: m.mime,
    })),
  };
}

export function postReadme(post: Post) {
  const song = post.songTitle ? `${post.songTitle}${post.songArtist ? ` – ${post.songArtist}` : ''}` : '—';
  return `déchire · Band HQ
====================

POST #${post.id}
Status:      ${post.status}
Type:        ${post.type}
Date:        ${postDate(post)}${post.scheduledAt ? ` · ${new Date(post.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
Location:    ${post.location || '—'}
Song:        ${song}

HOW TO POST
-----------
1. Open Instagram → "New post"
2. Select the images in this order: 01, 02, 03 ...
3. Copy the caption from "caption.txt"
4. Post the first comment separately below (if present)
5. Add music → search for "${post.songTitle || '—'}"
6. Use the alt text from "post.json" (Advanced → Write alt text)

danke fürs zuhören. /// déchire
`;
}

export function noteHtml(note: Note) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(note.title)}</title>
<style>
  :root { color-scheme: dark; }
  body { background:#0a0910; color:#EDE7F8; font: 16px/1.7 "Helvetica Neue", Arial, sans-serif; max-width: 780px; margin: 48px auto; padding: 0 24px 64px; }
  h1 { font-size: 34px; letter-spacing: -.02em; margin-bottom: 4px; }
  .meta { color:#9C93B4; font-size: 12px; letter-spacing:.16em; text-transform: uppercase; margin-bottom: 32px; }
  h2, h3 { color:#C9B8F0; margin-top: 32px; }
  blockquote { border-left: 3px solid #B9A5E8; margin: 24px 0; padding: 4px 20px; color:#C9C2DA; }
  mark { background: #B9A5E8; color:#0a0910; padding: 0 4px; }
  code { background:#1a1724; padding: 2px 6px; border-radius: 4px; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  footer { margin-top: 56px; color:#6f6885; font-size: 12px; letter-spacing:.2em; text-transform: uppercase; }
</style>
</head>
<body>
  <h1>${escapeHtml(note.title || 'Untitled')}</h1>
  <div class="meta">${escapeHtml(note.folder)} · last edited ${new Date(note.updatedAt).toLocaleDateString('en-GB')}</div>
  ${note.content}
  <footer>DECHIRE · Band HQ</footer>
</body>
</html>`;
}
