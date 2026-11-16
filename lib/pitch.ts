import { durationLabel, sectionLabel, timecode, videoStatusLabel } from './videos';
import type { Profile, VideoProject, VideoShot } from './types';

/* --------------------------------------------------------------- the deck */

export type PitchShot = {
  index: number;
  description: string;
  section: string;
  time: string;
  length: string;
  image: string | null;
};

export type PitchSlide = {
  id: string;
  kind: 'cover' | 'idea' | 'look' | 'board' | 'shoot' | 'outro';
  eyebrow: string;
  title: string;
  body: string[];
  words?: string[];
  shots?: PitchShot[];
  facts?: { label: string; value: string }[];
  images?: { url: string; caption?: string }[];
};

const paragraphs = (text: string) =>
  String(text ?? '')
    .split(/\n\s*\n|\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 1);

const firstLine = (text: string) => paragraphs(text)[0] ?? '';

/** Six frames per board slide – more than that and nobody reads it. */
const BOARD_PAGE = 6;

/**
 * Turns what the band typed into a pitch: no new data, only another arrangement.
 * Cover → idea → look → storyboard → shoot → contact.
 */
export function buildPitchDeck(
  project: VideoProject,
  shots: VideoShot[],
  profile: Profile,
  fallbackConcept = ''
): PitchSlide[] {
  const ordered = [...shots].sort((a, b) => a.start - b.start || a.position - b.position);
  const concept = project.concept?.trim() || fallbackConcept.trim();
  const cover = project.coverUrl ?? ordered.find((shot) => shot.media?.url)?.media?.url ?? null;
  const band = profile.bandName || 'déchire';
  const total = ordered.reduce((max, shot) => Math.max(max, shot.start + shot.duration), 0);

  const slides: PitchSlide[] = [];

  slides.push({
    id: 'cover',
    kind: 'cover',
    eyebrow: 'Musikvideo',
    title: project.title,
    body: [
      project.songTitle ? `Song: ${project.songTitle}` : '',
      firstLine(concept),
    ].filter(Boolean),
    facts: [
      { label: 'Band', value: band },
      { label: 'Status', value: videoStatusLabel(project.status) },
      { label: 'Dreh', value: project.shootDate || 'offen' },
      { label: 'Länge', value: total ? durationLabel(total) : 'offen' },
    ],
    images: cover ? [{ url: cover }] : [],
  });

  slides.push({
    id: 'idea',
    kind: 'idea',
    eyebrow: 'Die Idee',
    title: 'Worum es geht',
    body: concept
      ? paragraphs(concept)
      : [
          'Für dieses Video gibt es noch keinen Text – öffne das Projekt und schreib in drei Sätzen, worum es geht.',
        ],
    facts: project.director ? [{ label: 'Regie', value: project.director }] : [],
  });

  const lookImages = ordered
    .map((shot) => shot.sketch || shot.media?.url || null)
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);
  const words = project.lookWords ?? [];
  if (words.length || lookImages.length) {
    slides.push({
      id: 'look',
      kind: 'look',
      eyebrow: 'Bildsprache',
      title: words.length ? words.join(' · ') : 'Wie es aussieht',
      body: [
        'Kein Effektfeuerwerk: Licht, Nähe und Raum tragen das Video. Alles, was du hier siehst, ist aus den geplanten Shots.',
      ],
      words,
      images: lookImages.map((url, index) => ({ url, caption: `Frame ${index + 1}` })),
    });
  }

  for (let start = 0; start < ordered.length; start += BOARD_PAGE) {
    const group = ordered.slice(start, start + BOARD_PAGE);
    slides.push({
      id: `board-${start / BOARD_PAGE + 1}`,
      kind: 'board',
      eyebrow: `Ablauf ${String(Math.floor(start / BOARD_PAGE) + 1).padStart(2, '0')}`,
      title:
        start === 0
          ? `${ordered.length} Shots, ${total ? durationLabel(total) : 'Länge offen'}`
          : `Shots ${start + 1}–${start + group.length}`,
      body: [],
      shots: group.map((shot, offset) => ({
        index: start + offset + 1,
        description: shot.description,
        section: sectionLabel(shot.section),
        time: timecode(shot.start),
        length: `${shot.duration.toFixed(1)} s`,
        image: shot.sketch || shot.media?.url || null,
      })),
    });
  }

  if (ordered.length === 0) {
    slides.push({
      id: 'board-empty',
      kind: 'board',
      eyebrow: 'Ablauf',
      title: 'Noch keine Shots',
      body: ['Sobald im Projekt Shots stehen, entsteht hier automatisch das Storyboard.'],
    });
  }

  const locations = [...new Set(ordered.map((shot) => shot.location).filter(Boolean))];
  slides.push({
    id: 'shoot',
    kind: 'shoot',
    eyebrow: 'Dreh',
    title: locations.length ? locations.slice(0, 2).join(' · ') : project.location || 'Drehort offen',
    body: paragraphs(project.needs).length
      ? paragraphs(project.needs)
      : ['Ein Tag, ein Ort, kleines Team. Alles Weitere klären wir direkt.'],
    facts: [
      { label: 'Datum', value: project.shootDate || 'wird abgestimmt' },
      { label: 'Orte', value: locations.length ? locations.join(', ') : project.location || 'offen' },
      { label: 'Regie', value: project.director || band },
      { label: 'Shots', value: String(ordered.length) },
    ],
  });

  slides.push({
    id: 'outro',
    kind: 'outro',
    eyebrow: 'Kontakt',
    title: band,
    body: [
      'Wenn das passt: kurze Antwort, dann schicken wir Song, Termine und alles Weitere.',
      profile.website ? profile.website : '',
      profile.handle ? `@${profile.handle.replace(/^@/, '')}` : '',
    ].filter(Boolean),
    facts: project.songTitle ? [{ label: 'Song', value: project.songTitle }] : [],
  });

  return slides;
}

/* ---------------------------------------------------- standalone HTML export */

const escapeHtml = (value: string) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const PITCH_CSS = `
:root{--ink:#080808;--panel:#0f0f0e;--line:rgba(200,193,184,.16);--text:#e7e0d6;--muted:#9c948b;--muted2:#6f6a64;--accent:#e2e29c;--serif:'Redaction',Georgia,'Times New Roman',serif;--sans:'Instrument Sans','Inter',Helvetica,Arial,sans-serif;--mono:'DM Mono',ui-monospace,Menlo,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased}
.deck{max-width:1180px;margin:0 auto;padding:32px 24px 80px}
.slide{position:relative;border:1px solid var(--line);background:var(--panel);padding:clamp(28px,4vw,56px);min-height:min(78vh,680px);display:flex;flex-direction:column;justify-content:center;margin-bottom:20px;break-inside:avoid;page-break-after:always}
.eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:18px}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(38px,6vw,76px);line-height:.98;margin:0 0 18px;letter-spacing:-.01em}
h2{font-family:var(--serif);font-weight:400;font-size:clamp(26px,3.4vw,44px);line-height:1.05;margin:0 0 14px}
p{font-size:clamp(14px,1.2vw,17px);line-height:1.65;color:var(--muted);margin:0 0 12px;max-width:60ch}
.facts{display:flex;flex-wrap:wrap;gap:26px;margin-top:26px;border-top:1px solid var(--line);padding-top:18px}
.fact span{display:block;font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted2);margin-bottom:4px}
.fact strong{font-weight:500;font-size:13px}
.cover-image{position:absolute;inset:0;overflow:hidden;z-index:0}
.cover-image img{width:100%;height:100%;object-fit:cover;opacity:.28;filter:grayscale(1) contrast(1.1)}
.cover-image::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,8,8,.35),rgba(8,8,8,.95))}
.slide>*{position:relative;z-index:1}
.words{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 22px}
.words span{border:1px solid var(--line);padding:4px 10px;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.frames{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:8px}
.frame{border:1px solid var(--line);aspect-ratio:16/9;overflow:hidden;background:#0b0b0a}
.frame img{width:100%;height:100%;object-fit:cover;filter:grayscale(.6)}
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:10px}
.shot{border:1px solid var(--line);background:#0b0b0a;display:flex;flex-direction:column;min-height:150px}
.shot-image{aspect-ratio:16/9;background:#111;overflow:hidden}
.shot-image img{width:100%;height:100%;object-fit:cover;filter:grayscale(.7)}
.shot-image.empty{display:grid;place-items:center;color:var(--muted2);font-family:var(--mono);font-size:10px;letter-spacing:.14em}
.shot-body{padding:10px 12px 12px}
.shot-no{font-family:var(--mono);font-size:9px;letter-spacing:.16em;color:var(--accent);display:block;margin-bottom:5px}
.shot-body p{font-size:12px;line-height:1.45;margin:0;color:var(--text)}
.shot-meta{display:block;margin-top:7px;font-family:var(--mono);font-size:9px;letter-spacing:.08em;color:var(--muted2)}
.footer{margin-top:auto;padding-top:26px;font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted2)}
@media print{
  :root{--ink:#ffffff;--panel:#ffffff;--text:#111;--muted:#333;--muted2:#666;--line:rgba(0,0,0,.18);--accent:#5c5c42}
  body{background:#fff;color:#111}
  .deck{padding:0;max-width:none}
  .slide{min-height:auto;height:calc(100vh - 2cm);border:0;padding:1.4cm;margin:0}
  .cover-image{display:none}
  .shot-image img,.frame img{filter:grayscale(1)}
}
`;

/** One self-contained file: slides, CSS, base64 images. Send it, open it, present it. */
export function pitchHtml(deck: PitchSlide[], meta: { title: string; band: string; exportedAt: string }) {
  const slideHtml = deck
    .map((slide) => {
      const cover = slide.kind === 'cover' && slide.images?.length
        ? `<div class="cover-image"><img src="${escapeHtml(slide.images[0].url)}" alt=""></div>`
        : '';
      const words = slide.words?.length
        ? `<div class="words">${slide.words.map((word) => `<span>${escapeHtml(word)}</span>`).join('')}</div>`
        : '';
      const facts = slide.facts?.length
        ? `<div class="facts">${slide.facts
            .map((fact) => `<div class="fact"><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></div>`)
            .join('')}</div>`
        : '';
      const frames =
        slide.kind === 'look' && slide.images?.length
          ? `<div class="frames">${slide.images
              .map((image) => `<div class="frame"><img src="${escapeHtml(image.url)}" alt=""></div>`)
              .join('')}</div>`
          : '';
      const board = slide.shots?.length
        ? `<div class="board">${slide.shots
            .map(
              (shot) => `<article class="shot">
                <div class="shot-image ${shot.image ? '' : 'empty'}">${
                  shot.image ? `<img src="${escapeHtml(shot.image)}" alt="">` : 'ohne Bild'
                }</div>
                <div class="shot-body">
                  <span class="shot-no">${String(shot.index).padStart(2, '0')} · ${escapeHtml(shot.section)}</span>
                  <p>${escapeHtml(shot.description)}</p>
                  <span class="shot-meta">${escapeHtml(shot.time)} → ${escapeHtml(shot.length)}</span>
                </div>
              </article>`
            )
            .join('')}</div>`
        : '';
      const body = slide.body.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
      return `<section class="slide">
        ${cover}
        <div class="eyebrow">${escapeHtml(slide.eyebrow)}</div>
        ${slide.kind === 'cover' ? `<h1>${escapeHtml(slide.title)}</h1>` : `<h2>${escapeHtml(slide.title)}</h2>`}
        ${words}${body}${frames}${board}${facts}
        <div class="footer">${escapeHtml(meta.band)} · ${escapeHtml(meta.title)}</div>
      </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title)} – Pitch</title>
<style>${PITCH_CSS}</style>
</head>
<body>
<main class="deck">
${slideHtml}
</main>
</body>
</html>`;
}
