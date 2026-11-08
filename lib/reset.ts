import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR, db, execute } from './db';
import { DEFAULT_PALETTE } from './palette';
import { replacePalette } from './repo';
import { seed } from './seed';

/** Empties a folder (uploads, font files) without deleting the folder itself. */
function emptyFolder(folder: string, keep: string[] = []) {
  try {
    for (const entry of fs.readdirSync(folder)) {
      if (keep.includes(entry)) continue;
      fs.rmSync(path.join(folder, entry), { recursive: true, force: true });
    }
  } catch {
    /* folder is missing or empty */
  }
}

/** Counts before the wipe – nice for a toast that says what actually went. */
function count(table: string) {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c?: number } | undefined;
  return Number(row?.c ?? 0);
}

/**
 * Back to a pristine demo installation: everything is deleted and the seed runs
 * again. This is the “I broke it, give me my sandbox back” button.
 */
export function resetToDemo() {
  db.exec(`
    DELETE FROM post_media;
    DELETE FROM posts;
    DELETE FROM media;
    DELETE FROM media_groups;
    DELETE FROM notes;
    DELETE FROM designs;
    DELETE FROM milestones;
    DELETE FROM documents;
    DELETE FROM snippets;
    DELETE FROM post_metrics;
    DELETE FROM trash;
    DELETE FROM scheduler_log;
    DELETE FROM fonts;
    DELETE FROM profile;
  `);

  emptyFolder(UPLOAD_DIR);
  emptyFolder(path.join(path.dirname(UPLOAD_DIR), 'fonts'), ['metadata.json']);

  seed(db);
  replacePalette(DEFAULT_PALETTE);
}

/**
 * Removes the demo content for good – and does **not** seed anything back.
 *
 * The profile row is kept on purpose: the app seeds itself whenever `profile` is
 * empty, so deleting it would bring every demo post back on the next start.
 * Config that is not demo content survives: CI palette, accent colour, website
 * settings, self-hosted fonts, Instagram connection and the designs.
 */
export function removeDemoData() {
  const removed = {
    posts: count('posts'),
    media: count('media'),
    notes: count('notes'),
    milestones: count('milestones'),
    documents: count('documents'),
    snippets: count('snippets'),
  };
  const now = new Date().toISOString();

  db.exec(`
    DELETE FROM post_media;
    DELETE FROM posts;
    DELETE FROM media;
    DELETE FROM media_groups;
    DELETE FROM notes;
    DELETE FROM milestones;
    DELETE FROM documents;
    DELETE FROM snippets;
    DELETE FROM post_metrics;
    DELETE FROM trash;
    DELETE FROM scheduler_log;
  `);

  // The website pointed at media that no longer exists – drop the references.
  execute(`UPDATE site SET hero_media_id = NULL, media_ids = '[]', updated_at = ? WHERE id = 1`, [now]);
  // Empty band profile: name, handle and accent stay, the demo numbers go.
  execute(
    `UPDATE profile SET bio = '', website = '', followers = 0, following = 0,
       avatar_media_id = NULL, highlight_names = '[]', updated_at = ? WHERE id = 1`,
    [now]
  );

  emptyFolder(UPLOAD_DIR);

  return removed;
}
