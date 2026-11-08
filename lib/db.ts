import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PALETTE } from './palette';
import { seed } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const DATABASE_DIR = DATA_DIR;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS media_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'artwork',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER,
  variant_label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  filename TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES media_groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'photo',
  status TEXT NOT NULL DEFAULT 'draft',
  caption TEXT NOT NULL DEFAULT '',
  first_comment TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  song_title TEXT NOT NULL DEFAULT '',
  song_artist TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT,
  published_at TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  media_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  plain_text TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'General',
  tags TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS palette (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'custom',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS designs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  background TEXT NOT NULL DEFAULT '{}',
  elements TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  band_name TEXT NOT NULL,
  handle TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  followers INTEGER NOT NULL DEFAULT 0,
  following INTEGER NOT NULL DEFAULT 0,
  avatar_media_id INTEGER,
  highlight_names TEXT NOT NULL DEFAULT '[]',
  accent_hex TEXT NOT NULL DEFAULT '#b9a5e8',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  note TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'draft',
  content TEXT NOT NULL DEFAULT '',
  plain_text TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL DEFAULT 'caption',
  label TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  reach INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'instagram',
  account_id TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL DEFAULT '',
  token_expires_at TEXT,
  public_base TEXT NOT NULL DEFAULT '',
  sandbox INTEGER NOT NULL DEFAULT 1,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  last_run_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduler_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS trash (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fonts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '',
  weights TEXT NOT NULL DEFAULT '[]',
  files TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  published INTEGER NOT NULL DEFAULT 0,
  band_name TEXT NOT NULL DEFAULT 'DECHIRE',
  tagline TEXT NOT NULL DEFAULT '',
  manifesto TEXT NOT NULL DEFAULT '[]',
  intro_title TEXT NOT NULL DEFAULT '',
  intro_signature TEXT NOT NULL DEFAULT '',
  crew TEXT NOT NULL DEFAULT '[]',
  hero_media_id INTEGER,
  hero_video TEXT NOT NULL DEFAULT '',
  hero_overlay INTEGER NOT NULL DEFAULT 40,
  grain INTEGER NOT NULL DEFAULT 1,
  media_title TEXT NOT NULL DEFAULT '',
  media_note TEXT NOT NULL DEFAULT '',
  media_ids TEXT NOT NULL DEFAULT '[]',
  show_hero INTEGER NOT NULL DEFAULT 1,
  show_intro INTEGER NOT NULL DEFAULT 1,
  show_media INTEGER NOT NULL DEFAULT 1,
  show_feed INTEGER NOT NULL DEFAULT 1,
  show_connect INTEGER NOT NULL DEFAULT 1,
  show_footer INTEGER NOT NULL DEFAULT 1,
  feed_title TEXT NOT NULL DEFAULT '',
  teaser_url TEXT NOT NULL DEFAULT '',
  show_teaser INTEGER NOT NULL DEFAULT 1,
  links TEXT NOT NULL DEFAULT '[]',
  press_quote TEXT NOT NULL DEFAULT '',
  press_source TEXT NOT NULL DEFAULT '',
  footer_note TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  accent_hex TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_group ON media(group_id);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_position ON posts(position);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind);
CREATE INDEX IF NOT EXISTS idx_post_metrics_post ON post_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_snippets_kind ON snippets(kind);
`;

/** Adds a column to an existing table when an older database is missing it. */
function ensureColumn(conn: DatabaseSync, table: string, column: string, definition: string) {
  const columns = conn.prepare(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[];
  if (columns.some((entry) => entry.name === column)) return;
  conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/** CI palette exists independently of the demo seed – also for older databases. */
function ensurePalette(db: DatabaseSync) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM palette').get() as { c: number } | undefined;
  if (row && Number(row.c) > 0) return;
  const insert = db.prepare('INSERT INTO palette (name, hex, role, position) VALUES (?, ?, ?, ?)');
  DEFAULT_PALETTE.forEach((color, index) => {
    insert.run(color.name, color.hex, color.role, index);
  });
}

const SITE_LETTER = [
  "We're four people from the Ruhr who never learned how to do this properly.",
  "DECHIRE started as an excuse to keep meeting: one room, one amp that hums, songs that mostly complain about the weather and about each other.",
  "We don't tour. We don't have a label. We record what we have and put it out, hoping it lands somewhere near you.",
  "Thank you for listening. Honestly, that's the whole reason any of this exists.",
];

const SITE_CREW = [
  { name: 'Marla', role: 'voice' },
  { name: 'Bene', role: 'guitar' },
  { name: 'Jonte', role: 'bass' },
  { name: 'Tobi', role: 'drums' },
];

/** Default content for the public one-pager – also applied to older databases. */
function ensureSite(db: DatabaseSync) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM site').get() as { c: number } | undefined;
  if (row && Number(row.c) > 0) return;

  const hero = db
    .prepare(
      `SELECT m.id FROM media m LEFT JOIN media_groups g ON g.id = m.group_id
       WHERE m.mime LIKE 'image/%'
       ORDER BY (g.kind = 'photo') DESC, (m.title LIKE '%Light%') DESC, m.id ASC LIMIT 1`
    )
    .get() as { id?: number } | undefined;

  const shots = db
    .prepare(
      `SELECT m.id FROM media m LEFT JOIN media_groups g ON g.id = m.group_id
       WHERE m.mime LIKE 'image/%' AND g.kind = 'photo' ORDER BY m.id DESC LIMIT 4`
    )
    .all() as { id: number }[];

  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO site (id, published, band_name, tagline, manifesto, intro_title, intro_signature,
       crew, hero_media_id, hero_video, hero_overlay, grain, media_title, media_note, media_ids,
       show_hero, show_intro, show_media, show_feed, show_connect, show_footer, feed_title,
       teaser_url, show_teaser, links, press_quote, press_source, footer_note, seo_description,
       accent_hex, updated_at)
     VALUES (1, 1, 'DECHIRE', ?, ?, 'hello.', '— Marla, Bene, Jonte & Tobi', ?, ?, '', 40, 1,
       'photos', 'shot on phones, mostly in the dark', ?,
       1, 1, 1, 1, 1, 1, 'FROM THE FEED', '', 1, ?, '', '',
       '© 2026 DECHIRE · written in the Ruhr, recorded in the dark',
       'DECHIRE — post-hardcore from the Ruhr. Four people, a few songs, no plan.', '', ?)`
  ).run(
    'Post-hardcore from the Ruhr. Loud, honest, unpolished.',
    JSON.stringify(SITE_LETTER),
    JSON.stringify(SITE_CREW),
    hero?.id ?? null,
    JSON.stringify(shots.map((shot) => shot.id)),
    JSON.stringify([
      { label: 'Instagram', url: 'https://instagram.com/dechire.band', kind: 'instagram' },
      { label: 'Bandcamp', url: 'https://dechire.bandcamp.com', kind: 'bandcamp' },
      { label: 'Booking', url: 'mailto:booking@dechire.band', kind: 'mail' },
    ]),
    now
  );
}

/**
 * Only writes when the database is actually empty. Connecting must not touch the
 * file on disk – otherwise the dev watcher would rebuild on every request.
 */
function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM profile').get() as { c: number } | undefined;
  if (row && Number(row.c) > 0) return;
  // Seed atomar, damit parallele Worker nicht doppelt initialisieren.
  try {
    db.exec('BEGIN IMMEDIATE;');
    seed(db);
    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      /* no open transaction */
    }
    console.error('[db] Seed failed:', error);
  }
}

function createConnection(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, 'band.db'));
  const mode = db.prepare('PRAGMA journal_mode').get() as { journal_mode?: string } | undefined;
  if (String(mode?.journal_mode ?? '').toLowerCase() !== 'wal') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  ensureColumn(db, 'profile', 'accent_hex', "TEXT NOT NULL DEFAULT '#b9a5e8'");
  ensureColumn(db, 'profile', 'doc_media_id', 'INTEGER');
  ensureColumn(db, 'profile', 'doc_mark_strength', 'INTEGER NOT NULL DEFAULT 14');
  ensureColumn(db, 'posts', 'ig_media_id', 'TEXT');
  ensureColumn(db, 'posts', 'ig_permalink', 'TEXT');
  ensureColumn(db, 'posts', 'ig_published_at', 'TEXT');
  ensureColumn(db, 'posts', 'ig_error', 'TEXT');
  ensureColumn(db, 'posts', 'ig_last_attempt', 'TEXT');
  ensureColumn(db, 'connections', 'auto_publish', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'connections', 'last_run_at', 'TEXT');
  ensureColumn(db, 'milestones', "checklist", "TEXT NOT NULL DEFAULT '[]'");
  for (const [column, definition] of [
    ['intro_title', "TEXT NOT NULL DEFAULT ''"],
    ['intro_signature', "TEXT NOT NULL DEFAULT ''"],
    ['crew', "TEXT NOT NULL DEFAULT '[]'"],
    ['media_title', "TEXT NOT NULL DEFAULT ''"],
    ['media_note', "TEXT NOT NULL DEFAULT ''"],
    ['media_ids', "TEXT NOT NULL DEFAULT '[]'"],
    ['show_hero', 'INTEGER NOT NULL DEFAULT 1'],
    ['show_intro', 'INTEGER NOT NULL DEFAULT 1'],
    ['show_media', 'INTEGER NOT NULL DEFAULT 1'],
    ['show_connect', 'INTEGER NOT NULL DEFAULT 1'],
    ['show_footer', 'INTEGER NOT NULL DEFAULT 1'],
  ] as const) {
    ensureColumn(db, 'site', column, definition);
  }
  ensurePalette(db);
  seedIfEmpty(db);
  // After the seed: the website defaults pick photos from the media library.
  ensureSite(db);
  return db;
}

const globalStore = globalThis as unknown as { __dechireDb?: DatabaseSync };

export const db: DatabaseSync = globalStore.__dechireDb ?? (globalStore.__dechireDb = createConnection());

/** Kleine Helfer, damit die Repo-Schicht lesbar bleibt. */
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const row = db.prepare(sql).get(...params) as unknown as T | undefined;
  return row ?? null;
}

export function execute(sql: string, params: any[] = []) {
  return db.prepare(sql).run(...params) as unknown as { changes: number; lastInsertRowid: number | bigint };
}
