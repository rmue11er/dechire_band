import { backupResponse } from '@/lib/backup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return backupResponse();
}
