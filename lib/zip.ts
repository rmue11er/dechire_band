// @ts-ignore – archiver v8 exports the ZipArchive class (no types for v8)
import { ZipArchive } from 'archiver';
import { Readable } from 'node:stream';

export function createZip(): any {
  return new ZipArchive({ zlib: { level: 9 } });
}

export function zipResponse(archive: any, filename: string, onError?: (error: any) => void) {
  if (onError) archive.on('error', onError);
  const stream = Readable.toWeb(archive as unknown as Readable) as unknown as ReadableStream;
  const asciiName = filename.replace(/[^\x20-\x7E]/g, '_');
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}

export function csvEscape(value: any) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
