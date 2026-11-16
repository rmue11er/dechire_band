import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import AdmZip from 'adm-zip';
import { db, DATABASE_DIR as DATA_DIR, UPLOAD_DIR } from './db';
import { FONT_DIR } from './fonts';
import { createZip, zipResponse } from './zip';

export const BACKUP_VERSION = 1;

/**
 * Everything that belongs to the content of an installation. A restore defers the
 * foreign key checks, so this order is documentation rather than a dependency graph –
 * a folder may point at a parent that is inserted later.
 */
const TABLES = [
  'media_groups',
  'media_folders',
  'doc_folders',
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
  'tiktok_connection',
  'site',
  'trash',
  'fonts',
  'scheduler_log',
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

  /* Self-hosted Google fonts: the rows live in the database, the woff2 files live here. */
  let fontCount = 0;
  try {
    for (const entry of fs.readdirSync(FONT_DIR)) {
      if (!entry.endsWith('.woff2')) continue; // metadata.json is just a cache
      archive.file(path.join(FONT_DIR, entry), { name: `fonts/${entry}` });
      fontCount += 1;
    }
  } catch {
    /* no self-hosted fonts */
  }

  const manifest = {
    app: 'dechire-band-hq',
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    uploads: uploadCount,
    fonts: fontCount,
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
      folders: countRows('doc_folders'),
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
  fonts: number;
};

/**
 * A restore can fail in many places (archive, database, one single file, one table).
 * The step is what the UI shows – “FOREIGN KEY constraint failed” alone is useless.
 */
export class RestoreError extends Error {
  step: string;

  constructor(step: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'RestoreError';
    this.step = step;
  }
}

function step<T>(label: string, run: () => T): T {
  try {
    return run();
  } catch (error) {
    throw error instanceof RestoreError ? error : new RestoreError(label, error);
  }
}

/** True when the archive carries such a section at all – older backups might not. */
const hasSection = (entries: AdmZip.IZipEntry[], prefix: string) =>
  entries.some((entry) => !entry.isDirectory && entry.entryName.startsWith(prefix));

/** Unpacks one `uploads/`- or `fonts/`-style section into a staging folder. */
function unpackSection(entries: AdmZip.IZipEntry[], prefix: string, target: string) {
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.entryName.startsWith(prefix)) continue;
    const name = path.basename(entry.entryName);
    if (!name || name.startsWith('.')) continue;
    step(`unpacking ${entry.entryName}`, () => fs.writeFileSync(path.join(target, name), entry.getData()));
    count += 1;
  }
  return count;
}

/**
 * Swaps a staging folder into place: every restored file is moved over, everything the
 * backup does not contain is removed (`keep` survives – e.g. the font metadata cache).
 */
function replaceFolder(stage: string, target: string, keep: string[] = []) {
  fs.mkdirSync(target, { recursive: true });
  const incoming = new Set(fs.readdirSync(stage));
  for (const name of incoming) {
    const to = path.join(target, name);
    fs.rmSync(to, { force: true, recursive: true });
    fs.renameSync(path.join(stage, name), to);
  }
  for (const name of fs.readdirSync(target)) {
    if (keep.includes(name) || incoming.has(name)) continue;
    fs.rmSync(path.join(target, name), { force: true, recursive: true });
  }
}

/** `BEGIN IMMEDIATE` while the scheduler heartbeat may be writing – retry instead of failing. */
function beginImmediate() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      db.exec('BEGIN IMMEDIATE');
      return;
    } catch (error) {
      const busy = /busy|locked/i.test(error instanceof Error ? error.message : String(error));
      if (!busy || attempt >= 3) throw error;
    }
  }
}

/**
 * Restores a backup by importing rows into the live database instead of swapping
 * files – that keeps the open connection valid and works without a restart.
 */
export function restoreFromZip(buffer: Buffer): ImportResult {
  const tempZip = path.join(DATA_DIR, `.restore-buffer-${Date.now()}.zip`);
  fs.writeFileSync(tempZip, buffer);
  try {
    return restoreFromZipFile(tempZip);
  } finally {
    fs.rmSync(tempZip, { force: true });
  }
}

/**
 * Restores from a ZIP already on disk – lets the API stream large uploads.
 *
 * The import is staged: files are unpacked into a temp folder and the rows go in through
 * a single transaction. Only when both succeeded are the live files swapped, so an
 * aborted restore never leaves half of a backup behind.
 */
export function restoreFromZipFile(zipPath: string): ImportResult {
  const zip = step('opening the archive', () => new AdmZip(zipPath));
  const entries = zip.getEntries();
  const fileNames = new Set(entries.map((entry) => entry.entryName));

  if (!fileNames.has('band.db')) {
    throw new RestoreError('opening the archive', 'no band.db inside – is this a Band HQ backup?');
  }

  const workDir = path.join(DATA_DIR, `.restore-${Date.now()}`);
  const uploadStage = path.join(workDir, 'uploads');
  const fontStage = path.join(workDir, 'fonts');
  fs.mkdirSync(uploadStage, { recursive: true });
  fs.mkdirSync(fontStage, { recursive: true });
  const tempDbPath = path.join(workDir, 'band.db');
  let source: DatabaseSync | null = null;

  try {
    step('unpacking band.db', () => {
      const data = zip.readFile('band.db');
      if (!data?.length) throw new Error('band.db is empty');
      fs.writeFileSync(tempDbPath, data);
    });

    let manifest: any = {};
    if (fileNames.has('manifest.json')) {
      manifest = step('reading manifest.json', () => {
        try {
          return JSON.parse(zip.readAsText('manifest.json'));
        } catch {
          return {};
        }
      });
      if (manifest.app && manifest.app !== 'dechire-band-hq') {
        throw new RestoreError('reading manifest.json', 'this backup comes from another app');
      }
    }

    // Import into a throwaway connection so the live handle never sees a half-restored file.
    source = step('opening the database from the archive', () => new DatabaseSync(tempDbPath, { readOnly: true }));

    /*
     * Guard before anything is deleted: a corrupt or foreign band.db used to dump
     * zero rows everywhere and wipe the installation instead of failing.
     */
    step('checking the database from the archive', () => {
      const rows = source!.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as unknown as {
        name: string;
      }[];
      const tables = new Set(rows.map((row) => row.name));
      const missing = ['profile', 'posts', 'media', 'documents'].filter((name) => !tables.has(name));
      if (missing.length) throw new Error(`the archive database has no ${missing.join(', ')} table`);
    });

    const dump = (table: string) => {
      try {
        return source!.prepare(`SELECT * FROM ${table}`).all() as unknown as Record<string, any>[];
      } catch {
        return [];
      }
    };

    const data: Record<string, Record<string, any>[]> = {};
    for (const table of TABLES) data[table] = step(`reading "${table}" from the backup`, () => dump(table));
    source.close();
    source = null;

    /* 1. Files first: they land in a staging folder, the live library stays untouched. */
    const hasUploads = hasSection(entries, 'uploads/');
    const hasFonts = hasSection(entries, 'fonts/');
    const uploads = hasUploads ? unpackSection(entries, 'uploads/', uploadStage) : 0;
    const fonts = hasFonts ? unpackSection(entries, 'fonts/', fontStage) : 0;

    /* 2. Rows – one transaction, all or nothing. */
    const counts: Record<string, number> = {};
    step('starting the restore transaction', () => beginImmediate());
    try {
      /*
       * Deferring the foreign keys lets a folder be inserted before its parent and makes
       * the table order irrelevant. Without it a nested media folder (a child with a
       * higher id than its parent) aborted the whole import mid-way.
       */
      db.exec('PRAGMA defer_foreign_keys = ON;');

      step('clearing the current data', () =>
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
          DELETE FROM doc_folders;
          DELETE FROM songs;
          DELETE FROM snippets;
          DELETE FROM connections;
          DELETE FROM tiktok_connection;
          DELETE FROM palette;
          DELETE FROM profile;
          DELETE FROM site;
          DELETE FROM trash;
          DELETE FROM fonts;
          DELETE FROM scheduler_log;
        `)
      );

      for (const table of TABLES) {
        const rows = data[table];
        counts[table] = rows?.length ?? 0;
        if (!rows?.length) continue;
        step(`restoring "${table}"`, () => {
          const columns = Object.keys(rows[0]);
          const statement = db.prepare(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
          );
          for (const row of rows) statement.run(...columns.map((column) => row[column] ?? null));
        });
      }

      step('committing the restore', () => db.exec('COMMIT'));
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* nothing to roll back */
      }
      throw error;
    }

    /* 3. Only now touch the live files. */
    if (hasUploads) {
      step('moving the restored files into the media library', () => replaceFolder(uploadStage, UPLOAD_DIR));
    }
    if (hasFonts) {
      step('moving the restored font files into place', () => replaceFolder(fontStage, FONT_DIR, ['metadata.json']));
    }

    return { manifest, counts, uploads, fonts };
  } finally {
    try {
      source?.close();
    } catch {
      /* already closed */
    }
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
