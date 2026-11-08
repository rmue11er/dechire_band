import fs from 'node:fs';
import path from 'node:path';
import { DATABASE_DIR, execute, queryAll, queryOne } from './db';
import type { FontOption } from './design';

/**
 * Google Fonts, self-hosted.
 *
 * Searching happens against Google's public metadata list, but nothing is
 * fetched from Google at runtime: a family is downloaded **once**, stored in
 * `data/fonts/` and served from our own origin. That keeps the page offline
 * capable, avoids the usual DSGVO discussion and — most importantly for the
 * studio — lets `html-to-image` embed the font on export.
 */

export const FONT_DIR = path.join(DATABASE_DIR, 'fonts');
const META_FILE = path.join(FONT_DIR, 'metadata.json');
const META_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
/** 400 / 700 plus one light or black weight keeps the download small. */
const WANTED_WEIGHTS = [400, 700, 300, 900, 500, 600, 800, 100, 200];
const MAX_FILES = 6;
const KEEP_SUBSETS = new Set(['latin', 'latin-ext']);

export interface FontFile {
  weight: number;
  subset: string;
  filename: string;
  unicodeRange: string;
  size: number;
}

export interface CustomFont {
  id: number;
  family: string;
  slug: string;
  category: string;
  weights: number[];
  files: FontFile[];
  createdAt: string;
}

export interface FontSearchHit {
  family: string;
  category: string;
  variants: number;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const parseJson = <T>(value: any, fallback: T): T => {
  try {
    const parsed = JSON.parse(String(value ?? ''));
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
};

/* ---------------------------------------------------------------- storage */

function mapFont(row: any): CustomFont {
  return {
    id: Number(row.id),
    family: row.family,
    slug: row.slug,
    category: row.category ?? '',
    weights: parseJson<number[]>(row.weights, [400]),
    files: parseJson<FontFile[]>(row.files, []),
    createdAt: row.created_at,
  };
}

export function listCustomFonts(): CustomFont[] {
  return queryAll('SELECT * FROM fonts ORDER BY family ASC').map(mapFont);
}

export function findCustomFont(family: string): CustomFont | null {
  const row = queryOne('SELECT * FROM fonts WHERE lower(family) = lower(?)', [family]);
  return row ? mapFont(row) : null;
}

/** The shape the studio needs, built from what we stored. */
export function customFontOptions(): FontOption[] {
  return listCustomFonts().map((font) => ({
    id: `gf-${font.slug}`,
    label: font.family,
    stack: `'${font.family}', 'Arial Narrow', sans-serif`,
    weights: font.weights.length ? font.weights : [400],
    mood: font.category || 'Google',
  }));
}

/** `@font-face` rules with our own file URLs — same origin, so exports work. */
export function customFontsCss(): string {
  return listCustomFonts()
    .flatMap((font) =>
      font.files.map(
        (file) =>
          `@font-face{font-family:'${font.family}';font-style:normal;font-weight:${file.weight};font-display:swap;` +
          `src:url('/api/fonts/file/${file.filename}') format('woff2');` +
          (file.unicodeRange ? `unicode-range:${file.unicodeRange};` : '') +
          '}'
      )
    )
    .join('\n');
}

export function removeCustomFont(id: number): boolean {
  const row = queryOne('SELECT * FROM fonts WHERE id = ?', [id]);
  if (!row) return false;
  const font = mapFont(row);
  for (const file of font.files) {
    try {
      fs.unlinkSync(path.join(FONT_DIR, file.filename));
    } catch {
      /* already gone */
    }
  }
  execute('DELETE FROM fonts WHERE id = ?', [id]);
  return true;
}

/* ------------------------------------------------------- google metadata */

interface MetaFamily {
  family: string;
  category: string;
  popularity?: number;
  variants: number[];
  subsets: string[];
}

let metaCache: { fetchedAt: number; families: MetaFamily[] } | null = null;
let metaLoading: Promise<MetaFamily[]> | null = null;

function readMetaFile(): MetaFamily[] | null {
  try {
    const raw = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    if (!Array.isArray(raw?.families) || !raw.families.length) return null;
    if (Date.now() - Number(raw.fetchedAt ?? 0) > META_MAX_AGE) return null;
    metaCache = { fetchedAt: Number(raw.fetchedAt ?? 0), families: raw.families };
    return raw.families;
  } catch {
    return null;
  }
}

async function fetchMeta(): Promise<MetaFamily[]> {
  const response = await fetch('https://fonts.google.com/metadata/fonts', {
    headers: { 'User-Agent': BROWSER_UA },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Google Fonts list answered ${response.status}`);

  // The endpoint prefixes a JSON-hijacking guard in some regions.
  const text = (await response.text()).replace(/^\)\]\}'\s*/, '');
  const data = JSON.parse(text) as { familyMetadataList?: any[] };
  const families: MetaFamily[] = (data.familyMetadataList ?? [])
    .map((entry) => {
      const variants = Object.keys(entry.fonts ?? {})
        .filter((variant) => !variant.endsWith('i'))
        .map((variant) => Number.parseInt(variant, 10))
        .filter((weight) => Number.isFinite(weight));
      return {
        family: String(entry.family ?? ''),
        category: String(entry.category ?? ''),
        popularity: Number(entry.popularity ?? 9999),
        variants: [...new Set(variants)].sort((a, b) => a - b),
        subsets: Array.isArray(entry.subsets) ? entry.subsets.map(String) : [],
      };
    })
    .filter((entry) => entry.family);

  fs.mkdirSync(FONT_DIR, { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify({ fetchedAt: Date.now(), families }), 'utf8');
  metaCache = { fetchedAt: Date.now(), families };
  return families;
}

async function allFamilies(): Promise<MetaFamily[]> {
  if (metaCache && Date.now() - metaCache.fetchedAt <= META_MAX_AGE) return metaCache.families;
  const fromDisk = readMetaFile();
  if (fromDisk) return fromDisk;
  if (!metaLoading) {
    metaLoading = fetchMeta().finally(() => {
      metaLoading = null;
    });
  }
  return metaLoading;
}

export async function searchGoogleFonts(query: string, limit = 24): Promise<FontSearchHit[]> {
  const families = await allFamilies();
  const needle = query.trim().toLowerCase();

  const hits = needle
    ? families.filter((family) => family.family.toLowerCase().includes(needle))
    : [...families];

  hits.sort((a, b) => {
    if (!needle) return (a.popularity ?? 9999) - (b.popularity ?? 9999);
    const aStarts = a.family.toLowerCase().startsWith(needle) ? 0 : 1;
    const bStarts = b.family.toLowerCase().startsWith(needle) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const lengthDiff = a.family.length - b.family.length;
    if (Math.abs(lengthDiff) > 3) return lengthDiff;
    return (a.popularity ?? 9999) - (b.popularity ?? 9999);
  });

  return hits.slice(0, limit).map((family) => ({
    family: family.family,
    category: family.category,
    variants: family.variants.length,
  }));
}

/* --------------------------------------------------------------- download */

function pickWeights(available: number[]) {
  const picked = WANTED_WEIGHTS.filter((weight) => available.includes(weight));
  return (picked.length ? picked : available).slice(0, 3);
}

/** Blocks of `/* subset *\/ @font-face { … }` that Google's CSS API returns. */
function parseCssBlocks(css: string) {
  const blocks: { subset: string; body: string }[] = [];
  const pattern = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css))) {
    blocks.push({ subset: match[1], body: match[2] });
  }
  return blocks;
}

export async function addGoogleFont(rawFamily: string): Promise<CustomFont> {
  const family = rawFamily.trim().replace(/[^\w\s-]/g, '').slice(0, 60);
  if (!family) throw new Error('Missing font name');

  const existing = findCustomFont(family);
  if (existing) return existing;

  const families = await allFamilies();
  const meta = families.find((entry) => entry.family.toLowerCase() === family.toLowerCase());
  if (!meta) throw new Error(`“${family}” is not a Google Font`);

  const weights = pickWeights(meta.variants.length ? meta.variants : [400]);
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(meta.family)}` +
    `:wght@${weights.join(';')}&display=swap`;

  const cssResponse = await fetch(cssUrl, {
    headers: { 'User-Agent': BROWSER_UA },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!cssResponse.ok) throw new Error(`Google Fonts answered ${cssResponse.status} for ${family}`);

  const blocks = parseCssBlocks(await cssResponse.text()).filter((block) =>
    KEEP_SUBSETS.has(block.subset)
  );
  if (!blocks.length) throw new Error(`No usable font files for ${family}`);

  fs.mkdirSync(FONT_DIR, { recursive: true });
  const slug = slugify(meta.family) || 'font';
  const files: FontFile[] = [];

  for (const block of blocks.slice(0, MAX_FILES)) {
    const weight = Number((block.body.match(/font-weight:\s*(\d+)/) ?? [])[1] ?? 400);
    const url = (block.body.match(/src:\s*url\(([^)]+)\)/) ?? [])[1]?.replace(/['"]/g, '');
    const unicodeRange = (block.body.match(/unicode-range:\s*([^;]+);/) ?? [])[1]?.trim() ?? '';
    if (!url) continue;

    const buffer = Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(20_000) })).arrayBuffer());
    if (!buffer.byteLength || buffer.byteLength > 400_000) continue;

    const filename = `${slug}-${weight}-${block.subset}.woff2`;
    fs.writeFileSync(path.join(FONT_DIR, filename), buffer);
    files.push({ weight, subset: block.subset, filename, unicodeRange, size: buffer.byteLength });
  }

  if (!files.length) throw new Error(`Could not download any file for ${family}`);

  execute(
    `INSERT INTO fonts (family, slug, category, weights, files, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      meta.family,
      slug,
      meta.category,
      JSON.stringify([...new Set(files.map((file) => file.weight))].sort((a, b) => a - b)),
      JSON.stringify(files),
      new Date().toISOString(),
    ]
  );

  const created = findCustomFont(meta.family);
  if (!created) throw new Error('Font could not be stored');
  return created;
}

/** Filenames we are willing to serve from `data/fonts/`. */
export function isFontFile(name: string) {
  return /^[a-z0-9][a-z0-9-]*\.woff2$/.test(name);
}

export function fontFilePath(name: string) {
  if (!isFontFile(name)) return null;
  const full = path.join(FONT_DIR, name);
  return fs.existsSync(full) ? full : null;
}
