import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import AdmZip from 'adm-zip';
import { db, DATABASE_DIR as DATA_DIR, UPLOAD_DIR } from './db';
import { createZip, zipResponse } from './zip';

export const BACKUP_VERSION = 1;

const TABLES = [
  'media_groups',
  'media_folders',
  'songs',
  'video_projects',
  'video_shots',
  'media',
  'posts',
  'post_media',
  'notes',
  'designs',
  'releases',
  'release_tasks',
  'milestones',
  'documents',
  'document_audio',
  'document_comments',
  'snippets',
  'post_metrics',
  'palette',
  'profile',
  'connections',
  'site',
  'trash',
] as const;

const countRows = (table: string) => {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number } | undefined;
  return Number(row?.c ?? 0);
};

/**
 * Streams a ZIP with a consistent database copy, every upload and a manifest.
 * `wal_checkpoint(TRUNCATE)` makes sure the copy on disk is complete.
 */
export function backupResponse() {
  const archive = createZip();
  const stamp = new Date().toISOString().slice(0, 10);

  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    /* checkpoint is best effort – the copy still works */
  }

  const dbPath = path.join(DATA_DIR, 'band.db');
  if (fs.existsSync(dbPath)) archive.file(dbPath, { name: 'band.db' });

  let uploadCount = 0;
  try {
    for (const entry of fs.readdirSync(UPLOAD_DIR)) {
      const full = path.join(UPLOAD_DIR, entry);
      if (!fs.statSync(full).isFile()) continue;
      archive.file(full, { name: `uploads/${entry}` });
      uploadCount += 1;
    }
  } catch {
    /* no uploads yet */
  }

  const manifest = {
    app: 'dechire-band-hq',
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    uploads: uploadCount,
    counts: {
      posts: countRows('posts'),
      media: countRows('media'),
      songs: countRows('songs'),
      videos: countRows('video_projects'),
      shots: countRows('video_shots'),
      notes: countRows('notes'),
      designs: countRows('designs'),
      milestones: countRows('milestones'),
      documents: countRows('documents'),
      comments: countRows('document_comments'),
    },
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  archive.finalize();

  return zipResponse(archive, `dechire-backup-${stamp}.zip`, (error) => console.error('[backup]', error));
}

type ImportResult = {
  manifest: any;
  counts: Record<string, number>;
  uploads: number;
  skipped: string[];
};

/**
 * Restores a backup by importing rows into the live database instead of swapping
 * files – that keeps the open connection valid and works without a restart.
 */
export function restoreFromZip(buffer: Buffer): ImportResult {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const fileNames = new Set(entries.map((entry) => entry.entryName));

  if (!fileNames.has('band.db')) throw new Error('The archive has no band.db – is this a Band HQ backup?');

  const workDir = path.join(DATA_DIR, `.restore-${Date.now()}`);
  fs.mkdirSync(workDir, { recursive: true });
  const tempDbPath = path.join(workDir, 'band.db');
  fs.writeFileSync(tempDbPath, zip.readFile('band.db') as Buffer);

  let manifest: any = {};
  if (fileNames.has('manifest.json')) {
    try {
      manifest = JSON.parse(zip.readAsText('manifest.json'));
    } catch {
      manifest = {};
    }
  }
  if (manifest.app && manifest.app !== 'dechire-band-hq') throw new Error('This backup comes from another app');

  // Import into a throwaway connection so the live handle never sees a half-restored file.
  const source = new DatabaseSync(tempDbPath, { readOnly: true });

  const dump = (table: string) => {
    try {
      return source.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[];
    } catch {
      return [];
    }
  };

  const data: Record<string, Record<string, any>[]> = {};
  for (const table of TABLES) data[table] = dump(table);

  source.close();
  fs.rmSync(workDir, { recursive: true, force: true });

  const insertAll = (table: string, rows: Record<string, any>[] | undefined) => {
    if (!rows || !rows.length) return;
    const columns = Object.keys(rows[0]);
    const statement = db.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
    );
    for (const row of rows) statement.run(...columns.map((column) => row[column] ?? null));
  };

  const counts: Record<string, number> = {};
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      DELETE FROM post_media;
      DELETE FROM post_metrics;
      DELETE FROM posts;
      DELETE FROM media;
      DELETE FROM media_folders;
      DELETE FROM media_groups;
      DELETE FROM notes;
      DELETE FROM designs;
      DELETE FROM release_tasks;
      DELETE FROM releases;
      DELETE FROM milestones;
      DELETE FROM video_shots;
      DELETE FROM video_projects;
      DELETE FROM document_audio;
      DELETE FROM document_comments;
      DELETE FROM documents;
      DELETE FROM songs;
      DELETE FROM snippets;
      DELETE FROM connections;
      DELETE FROM palette;
      DELETE FROM profile;
      DELETE FROM site;
      DELETE FROM trash;
    `);

    // parents before children, children before their parents for post_media
    insertAll('media_groups', data.media_groups);
    insertAll('media_folders', data.media_folders);
    insertAll('songs', data.songs);
    insertAll('video_projects', data.video_projects);
    insertAll('media', data.media);
    insertAll('video_shots', data.video_shots);
    insertAll('posts', data.posts);
    insertAll('post_media', data.post_media);
    insertAll('notes', data.notes);
    insertAll('designs', data.designs);
    insertAll('releases', data.releases);
    insertAll('release_tasks', data.release_tasks);
    insertAll('milestones', data.milestones);
    insertAll('documents', data.documents);
    insertAll('document_audio', data.document_audio);
    insertAll('document_comments', data.document_comments);
    insertAll('snippets', data.snippets);
    insertAll('post_metrics', data.post_metrics);
    insertAll('palette', data.palette);
    insertAll('profile', data.profile);
    insertAll('connections', data.connections);
    insertAll('site', data.site);
    insertAll('trash', data.trash);

    for (const table of TABLES) counts[table] = data[table]?.length ?? 0;
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* nothing to roll back */
    }
    throw error;
  }

  let uploads = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.entryName.startsWith('uploads/')) continue;
    const name = path.basename(entry.entryName);
    if (!name) continue;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), entry.getData());
    uploads += 1;
  }

  return { manifest, counts, uploads, skipped: [] as string[] };
}
