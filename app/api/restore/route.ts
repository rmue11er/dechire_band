import { fail, ok } from '@/lib/api';
import { restoreFromZip } from '@/lib/backup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE = 512 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Could not read the upload');
  }

  const file = form.get('file');
  if (!file || typeof (file as any).arrayBuffer !== 'function') return fail('No backup file received');

  const blob = file as File;
  if (blob.size > MAX_SIZE) return fail('The backup is larger than 512 MB');

  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = restoreFromZip(buffer);
    return ok({
      restored: true,
      counts: result.counts,
      uploads: result.uploads,
      manifest: result.manifest,
    });
  } catch (error: any) {
    console.error('[restore]', error);
    return fail(error?.message ?? 'Restore failed', 400);
  }
}
