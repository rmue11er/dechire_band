import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { cookies } from 'next/headers';
import { authEnabled, SESSION_COOKIE, verifySession } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { restoreFromZip, restoreFromZipFile } from '@/lib/backup';
import { DATABASE_DIR } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_SIZE = 512 * 1024 * 1024;

/** /api/restore is outside the proxy so the ZIP body can stream; check the session here. */
async function authorized() {
  if (!authEnabled()) return true;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** A failed restore says which step broke – the message alone is rarely enough. */
function restoreFailed(error: any) {
  console.error('[restore]', error);
  return ok(
    { error: error?.message ?? 'Restore failed', step: typeof error?.step === 'string' ? error.step : null },
    400
  );
}

/** Streamed upload: large backups never have to fit into a multipart FormData buffer. */
async function restoreRaw(request: Request) {
  if (!request.body) return fail('No backup file received');

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_SIZE + 1024 * 1024) return fail('The backup is larger than 512 MB', 413);

  const tempZip = path.join(
    DATABASE_DIR,
    `.restore-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.zip`
  );
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_SIZE) callback(new Error('BACKUP_TOO_LARGE'));
      else callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(request.body as any),
      limiter,
      fs.createWriteStream(tempZip)
    );
    const result = restoreFromZipFile(tempZip);
    return ok({
      restored: true,
      counts: result.counts,
      uploads: result.uploads,
      fonts: result.fonts,
      manifest: result.manifest,
    });
  } catch (error: any) {
    if (error?.message === 'BACKUP_TOO_LARGE') return fail('The backup is larger than 512 MB', 413);
    return restoreFailed(error);
  } finally {
    fs.rmSync(tempZip, { force: true });
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return fail('Not signed in', 401);

  const contentType = request.headers.get('content-type') ?? '';

  // New path: the browser sends the ZIP as a raw request body.
  if (contentType.includes('application/zip') || contentType.includes('application/octet-stream')) {
    return restoreRaw(request);
  }

  // Compatibility with older clients that still post multipart form data.
  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error('[restore] could not parse multipart upload', error);
    return fail('Could not read the upload – try the backup file again or upload it as a raw ZIP', 400);
  }

  const file = form.get('file');
  if (!file || typeof (file as any).arrayBuffer !== 'function') return fail('No backup file received');

  const blob = file as File;
  if (blob.size > MAX_SIZE) return fail('The backup is larger than 512 MB', 413);

  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = restoreFromZip(buffer);
    return ok({
      restored: true,
      counts: result.counts,
      uploads: result.uploads,
      fonts: result.fonts,
      manifest: result.manifest,
    });
  } catch (error: any) {
    return restoreFailed(error);
  }
}
