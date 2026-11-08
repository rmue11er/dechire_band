import fs from 'node:fs';
import path from 'node:path';
import { ok } from '@/lib/api';
import { UPLOAD_DIR, db } from '@/lib/db';
import { FONT_DIR } from '@/lib/fonts';
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
    DELETE FROM fonts;
    DELETE FROM profile;
  `);

  for (const folder of [UPLOAD_DIR, FONT_DIR]) {
    try {
      for (const entry of fs.readdirSync(folder)) {
        // keep the cached catalogue, it is only a download cache
        if (entry === 'metadata.json') continue;
        fs.rmSync(path.join(folder, entry), { recursive: true, force: true });
      }
    } catch {
      /* folder was empty or missing */
    }
  }

  seed(db);
  replacePalette(DEFAULT_PALETTE);
  return ok({ ok: true });
}
