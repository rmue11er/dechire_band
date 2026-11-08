import fs from 'node:fs';
import path from 'node:path';
import { ok } from '@/lib/api';
import { UPLOAD_DIR, db } from '@/lib/db';
import { DEFAULT_PALETTE } from '@/lib/palette';
import { replacePalette } from '@/lib/repo';
import { seed } from '@/lib/seed';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Wipes the demo data completely. Careful: deletes all uploads as well. */
export async function POST() {
  db.exec(`
    DELETE FROM post_media;
    DELETE FROM posts;
    DELETE FROM media;
    DELETE FROM media_groups;
    DELETE FROM notes;
    DELETE FROM designs;
    DELETE FROM milestones;
    DELETE FROM documents;
    DELETE FROM profile;
  `);

  try {
    for (const entry of fs.readdirSync(UPLOAD_DIR)) {
      fs.rmSync(path.join(UPLOAD_DIR, entry), { recursive: true, force: true });
    }
  } catch {
    /* upload folder was empty */
  }

  seed(db);
  replacePalette(DEFAULT_PALETTE);
  return ok({ ok: true });
}
