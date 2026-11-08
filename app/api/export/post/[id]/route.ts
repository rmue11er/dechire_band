import fs from 'node:fs';
import path from 'node:path';
import { fail } from '@/lib/api';
import { UPLOAD_DIR } from '@/lib/db';
import {
  captionText,
  mediaExportName,
  mediaFilename,
  postFolderName,
  postMetadata,
  postReadme,
} from '@/lib/exporters';
import { getPost } from '@/lib/repo';
import { createZip, zipResponse } from '@/lib/zip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const post = getPost(Number(id));
  if (!post) return fail('Post not found', 404);

  const folder = postFolderName(post);
  const archive = createZip();

  post.media.forEach((media, index) => {
    const file = path.join(UPLOAD_DIR, mediaFilename(media));
    if (fs.existsSync(file)) {
      archive.file(file, { name: `${folder}/${mediaExportName(media, index)}` });
    }
  });

  archive.append(captionText(post), { name: `${folder}/caption.txt` });
  archive.append(JSON.stringify(postMetadata(post), null, 2), { name: `${folder}/post.json` });
  archive.append(postReadme(post), { name: `${folder}/README.txt` });
  archive.finalize();

  return zipResponse(archive, `${folder}.zip`, (error) => console.error('[export:post]', error));
}
