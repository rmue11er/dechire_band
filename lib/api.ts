import { NextResponse } from 'next/server';

export function ok(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T = any>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function toInt(value: any, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Parses an optional relation id from a request body.
 * `null` means "no relation", `false` means "provided but not a valid id".
 */
export function toOptionalId(value: any): number | null | false {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : false;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
