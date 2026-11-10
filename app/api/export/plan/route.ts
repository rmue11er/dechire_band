import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/db';
import {
  captionText,
  mediaExportName,
  mediaFilename,
  noteHtml,
  postFolderName,
  postReadme,
} from '@/lib/exporters';
import { listMedia, listNotes, listPosts } from '@/lib/repo';
import { createZip, csvEscape, zipResponse } from '@/lib/zip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'notiz';

export async function GET() {
  const posts = listPosts();
  const notes = listNotes();
  const media = listMedia();
  const archive = createZip();
  const stamp = new Date().toISOString().slice(0, 10);

  // 1) CSV overview
  const rows = [
    ['Position', 'Datum', 'Status', 'Typ', 'Song', 'Standort', 'Caption', 'Erster Kommentar', 'Medien'].map(csvEscape).join(';'),
    ...posts.map((post, index) =>
      [
        index + 1,
        post.scheduledAt ?? post.publishedAt ?? '',
        post.status,
        post.type,
        [post.songTitle, post.songArtist].filter(Boolean).join(' – '),
        post.location,
        post.caption,
        post.firstComment,
        post.media.map((m) => `${m.title} (${m.variantLabel})`).join(' | '),
      ]
        .map(csvEscape)
        .join(';')
    ),
  ];
  archive.append('\uFEFF' + rows.join('\r\n'), { name: `content-plan-${stamp}.csv` });

  // 2) Posts with media + caption
  posts.forEach((post, index) => {
    const folder = `posts/${postFolderName(post, index)}`;
    post.media.forEach((item, mediaIndex) => {
      const file = path.join(UPLOAD_DIR, mediaFilename(item));
      if (fs.existsSync(file)) {
        archive.file(file, { name: `${folder}/${mediaExportName(item, mediaIndex)}` });
      }
    });
    archive.append(captionText(post), { name: `${folder}/caption.txt` });
    archive.append(postReadme(post), { name: `${folder}/README.txt` });
  });

  // 3) Full media library
  media.forEach((item, index) => {
    const file = path.join(UPLOAD_DIR, mediaFilename(item));
    if (fs.existsSync(file)) {
      archive.file(file, { name: `media/${mediaExportName(item, index)}` });
    }
  });

  // 4) Notes as HTML
  notes.forEach((note, index) => {
    archive.append(noteHtml(note), {
      name: `notes/${String(index + 1).padStart(2, '0')}-${slug(note.title)}.html`,
    });
  });

  archive.append(
    `déchire · Band HQ – Full export
Date: ${new Date().toLocaleString('en-GB')}

Contents
--------
content-plan-${stamp}.csv   Overview of all posts (Excel / Numbers / Sheets)
posts/                      One folder per post: media, caption, upload guide
media/                      Complete media library (all versions)
notes/                      All notes as HTML (readable in the browser)

Emotional Post-Hardcore aus Augsburg. /// déchire
`,
    { name: 'README.txt' }
  );

  archive.finalize();
  return zipResponse(archive, `dechire-content-plan-${stamp}.zip`, (error) => console.error('[export:plan]', error));
}
