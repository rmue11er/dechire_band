import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { fontFilePath } from '@/lib/fonts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Serves a stored woff2 from `data/fonts/` — same origin, so exports work. */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = fontFilePath(decodeURIComponent(name));
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = fs.readFileSync(file);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': 'font/woff2',
      'Content-Length': String(data.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
