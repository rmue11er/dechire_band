import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/db';
import { mediaFilename } from '@/lib/exporters';
import { getProfile, listDocuments, listMedia } from '@/lib/repo';
import { createZip, zipResponse } from '@/lib/zip';
import type { BandDocument } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * One-click press kit: everything a promoter, blog or playlist editor asks for
 * in a single ZIP – bio in two lengths, photos, logos, the paperwork as
 * printable HTML and an index page that works without a web server.
 */

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'dokument';

const esc = (value: string) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const DOC_CSS = `
  :root { --ink: #14101a; --muted: #6a6478; --line: rgba(20,16,26,.14); }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px 32px 64px; background: #f4f1ea; color: var(--ink);
    font: 15px/1.7 "Helvetica Neue", Arial, sans-serif; }
  .sheet { max-width: 780px; margin: 0 auto; background: #fff; padding: 44px 48px 56px;
    box-shadow: 0 30px 70px -50px rgba(0,0,0,.6); }
  .mast { display: flex; align-items: baseline; justify-content: space-between; gap: 18px;
    padding-bottom: 12px; border-bottom: 2px solid var(--ink); margin-bottom: 26px; }
  .mast strong { font-family: Georgia, serif; font-size: 22px; letter-spacing: .02em; }
  .mast span { font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); }
  h1 { font-family: Georgia, serif; font-weight: 400; font-size: 38px; line-height: 1.1; margin: 0 0 6px; }
  h2 { margin: 28px 0 8px; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; }
  h2::before { content: '/// '; color: var(--accent, #e2e29c); }
  h3 { margin: 20px 0 6px; font-size: 15px; }
  p { margin: 0 0 12px; }
  .lede { color: var(--muted); font-size: 11px; letter-spacing: .18em; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #141312; color: #f4f1ea; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
  blockquote { margin: 16px 0; padding: 12px 16px; border-left: 3px solid var(--accent, #e2e29c); background: rgba(0,0,0,.03); }
  ul, ol { padding-left: 20px; }
  mark { background: rgba(226,226,156,.4); }
  footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid var(--line);
    font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
  @media print { body { padding: 0; background: #fff; } .sheet { box-shadow: none; max-width: none; } }
`;

function documentHtml(doc: BandDocument, bandName: string, accent: string, website: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(doc.title)} · ${esc(bandName)}</title>
<style>${DOC_CSS}</style></head>
<body><div class="sheet" style="--accent:${esc(accent)}">
  <div class="mast"><strong>${esc(bandName)}</strong><span>${esc(doc.kind)}</span></div>
  <p class="lede">${esc(doc.kind)}</p>
  <h1>${esc(doc.title)}</h1>
  ${doc.content || '<p></p>'}
  <footer>${esc(bandName)}${website ? ` · ${esc(website)}` : ''}</footer>
</div></body></html>`;
}

function indexHtml(input: {
  bandName: string;
  tagline: string;
  website: string;
  handle: string;
  accent: string;
  photos: string[];
  logos: string[];
  documents: { name: string; title: string }[];
}) {
  const links = [
    input.website ? `<li><a href="${esc(input.website)}">${esc(input.website)}</a></li>` : '',
    input.handle
      ? `<li><a href="https://instagram.com/${esc(input.handle)}">Instagram @${esc(input.handle)}</a></li>`
      : '',
  ].join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Press kit · ${esc(input.bandName)}</title>
<style>${DOC_CSS}
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin: 14px 0 0; }
  .grid a { display: block; border: 1px solid var(--line); padding: 6px; }
  .grid img { width: 100%; height: 120px; object-fit: cover; display: block; }
  .grid span { display: block; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-top: 5px; }
  .doclist { list-style: none; padding: 0; margin: 12px 0 0; }
  .doclist li { padding: 8px 0; border-bottom: 1px solid var(--line); }
  .doclist a { color: var(--ink); text-decoration: none; font-weight: 600; }
  .doclist span { color: var(--muted); font-size: 12px; margin-left: 8px; }
</style></head>
<body><div class="sheet" style="--accent:${esc(input.accent)}">
  <div class="mast"><strong>${esc(input.bandName)}</strong><span>Press kit</span></div>
  <p class="lede">${esc(input.tagline)}</p>
  <h1>${esc(input.bandName)}</h1>
  <p>Alles, was du für einen Beitrag brauchst: Bio in zwei Längen, Pressefotos, Logo-Varianten und
  die Unterlagen fürs Booking. Fotos sind zur redaktionellen Nutzung freigegeben.</p>
  <h2>Links</h2><ul>${links}</ul>
  ${input.documents.length ? `<h2>Unterlagen</h2><ul class="doclist">${input.documents
    .map((entry) => `<li><a href="${esc(entry.name)}">${esc(entry.title)}</a><span>HTML · druckbar</span></li>`)
    .join('')}</ul>` : ''}
  ${input.photos.length ? `<h2>Pressefotos</h2><div class="grid">${input.photos
    .map((name) => `<a href="${esc(name)}"><img src="${esc(name)}" alt=""><span>${esc(name.split('/').pop() ?? '')}</span></a>`)
    .join('')}</div>` : ''}
  ${input.logos.length ? `<h2>Logo</h2><div class="grid">${input.logos
    .map((name) => `<a href="${esc(name)}"><img src="${esc(name)}" alt="" style="object-fit:contain;background:#fff"><span>${esc(name.split('/').pop() ?? '')}</span></a>`)
    .join('')}</div>` : ''}
  <footer>${esc(input.bandName)} · generated ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}</footer>
</div></body></html>`;
}

export async function GET() {
  const profile = getProfile();
  const media = listMedia();
  const documents = listDocuments();

  const archive = createZip();
  const stamp = new Date().toISOString().slice(0, 10);
  const bandName = profile.bandName || 'déchire';
  const accent = profile.accentHex || '#e2e29c';
  const website = profile.website || '';

  const paragraphs = String(profile.bio ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bioLong = paragraphs.join('\n\n');
  const bioShort = (paragraphs[0] ?? `${bandName}.`).slice(0, 320);

  archive.append(
    `# ${bandName} — press kit\n\n` +
      `Website: ${website || '—'}\n` +
      `Instagram: @${profile.handle || '—'}\n\n` +
      `## Inhalt\n` +
      `bio-short.txt        Ein Absatz, für Portale und Konzertankündigungen\n` +
      `bio-long.txt         Der ganze Text, für Blogs und Presse\n` +
      `links.txt            Alle Kanäle\n` +
      `index.html           Übersicht mit Fotos und Unterlagen (im Browser öffnen)\n` +
      `press-photos/        Pressefotos, freigegeben zur redaktionellen Nutzung\n` +
      `logos/               Logo-Varianten\n` +
      `documents/           Rider, Stage Plot, Pressetext – als druckbare HTML-Seite\n\n` +
      `Stand: ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}\n`,
    { name: 'README.txt' }
  );

  archive.append(`${bioShort}\n`, { name: 'bio-short.txt' });
  archive.append(`${bioLong || bioShort}\n`, { name: 'bio-long.txt' });
  archive.append(
    [
      `Website: ${website || '—'}`,
      `Instagram: https://instagram.com/${profile.handle || ''}`,
      `Booking: siehe documents/ (Rider & Booking)`,
    ].join('\n') + '\n',
    { name: 'links.txt' }
  );

  const photoFiles: string[] = [];
  media
    .filter((item) => item.mime.startsWith('image/') && item.groupKind === 'photo')
    .slice(0, 8)
    .forEach((item, index) => {
      const file = path.join(UPLOAD_DIR, mediaFilename(item));
      if (!fs.existsSync(file)) return;
      const ext = path.extname(mediaFilename(item)) || '.jpg';
      const name = `press-photos/${String(index + 1).padStart(2, '0')}-${slug(item.title)}${ext}`;
      archive.file(file, { name });
      photoFiles.push(name);
    });

  const logoFiles: string[] = [];
  media
    .filter((item) => item.mime.startsWith('image/') && (item.groupKind === 'logo' || item.tags.includes('logo')))
    .slice(0, 6)
    .forEach((item, index) => {
      const file = path.join(UPLOAD_DIR, mediaFilename(item));
      if (!fs.existsSync(file)) return;
      const ext = path.extname(mediaFilename(item)) || '.png';
      const name = `logos/${String(index + 1).padStart(2, '0')}-${slug(item.title)}${ext}`;
      archive.file(file, { name });
      logoFiles.push(name);
    });

  const docIndex: { name: string; title: string }[] = [];
  documents
    .filter((doc) => ['rider', 'orga', 'press', 'contract'].includes(doc.kind))
    .forEach((doc) => {
      const name = `documents/${slug(doc.title)}.html`;
      archive.append(documentHtml(doc, bandName, accent, website), { name });
      docIndex.push({ name, title: doc.title });
    });

  archive.append(
    indexHtml({
      bandName,
      tagline: paragraphs[0] ?? 'Post-hardcore',
      website,
      handle: profile.handle,
      accent,
      photos: photoFiles,
      logos: logoFiles,
      documents: docIndex,
    }),
    { name: 'index.html' }
  );

  archive.finalize();
  return zipResponse(archive, `${slug(bandName)}-presskit-${stamp}.zip`, (error) =>
    console.error('[export:presskit]', error)
  );
}
