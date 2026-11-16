import { sectionLabel } from './videos';
import type { Profile, VideoProject, VideoShot } from './types';

/* --------------------------------------------------------------- the deck */

export type PitchShot = {
  index: number;
  description: string;
  section: string;
  time: string;
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

/* No Intl locale juggling: the pitch is a hand-made thing, so are the labels. */
const MONTHS = [
  'januar',
  'februar',
  'märz',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'dezember',
];

const shortDate = (iso: string) => {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getDate()}. ${MONTHS[date.getMonth()]}`;
};

const plainLength = (seconds: number) => {
  if (!seconds) return 'offen';
  if (seconds < 60) return `${Math.round(seconds)} sekunden`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')} minuten`;
};

const shortTime = (seconds: number) => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

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
    eyebrow: 'ein musikvideo',
    title: project.title,
    body: [project.songTitle ? `zu „${project.songTitle}“` : '', firstLine(concept)].filter(Boolean),
    facts: [
      { label: 'von', value: band },
      { label: 'dreh', value: project.shootDate ? shortDate(project.shootDate) : 'offen' },
      { label: 'länge', value: plainLength(total) },
    ],
    images: cover ? [{ url: cover }] : [],
  });

  slides.push({
    id: 'idea',
    kind: 'idea',
    eyebrow: 'die idee',
    title: 'worum es geht',
    body: concept
      ? paragraphs(concept)
      : ['Hier steht noch nichts – im Projekt drei Sätze zur Idee schreiben, dann trägt sich das von selbst.'],
    facts: [],
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
      eyebrow: 'wie es aussieht',
      title: words.length ? words.join(', ') : 'bildsprache',
      body: ['kein effektfeuerwerk. licht, nähe, raum – und viel dunkel.'],
      words,
      images: lookImages.map((url, index) => ({ url, caption: `frame ${index + 1}` })),
    });
  }

  for (let start = 0; start < ordered.length; start += BOARD_PAGE) {
    const group = ordered.slice(start, start + BOARD_PAGE);
    slides.push({
      id: `board-${start / BOARD_PAGE + 1}`,
      kind: 'board',
      eyebrow: start === 0 ? 'der ablauf' : 'der ablauf, weiter',
      title:
        start === 0
          ? `${ordered.length} ${ordered.length === 1 ? 'bild' : 'bilder'}${total ? ` · ${plainLength(total)}` : ''}`
          : `bilder ${start + 1}–${start + group.length}`,
      body: [],
      shots: group.map((shot, offset) => ({
        index: start + offset + 1,
        description: shot.description,
        section: sectionLabel(shot.section).toLowerCase(),
        time: shortTime(shot.start),
        image: shot.sketch || shot.media?.url || null,
      })),
    });
  }

  if (ordered.length === 0) {
    slides.push({
      id: 'board-empty',
      kind: 'board',
      eyebrow: 'der ablauf',
      title: 'noch keine bilder',
      body: ['Sobald im Projekt Bilder stehen, steht hier automatisch der Ablauf.'],
    });
  }

  const locations = [...new Set(ordered.map((shot) => shot.location).filter(Boolean))];
  slides.push({
    id: 'shoot',
    kind: 'shoot',
    eyebrow: 'der dreh',
    title: locations.length ? locations.slice(0, 2).join(', ') : project.location || 'ort noch offen',
    body: paragraphs(project.needs).length
      ? paragraphs(project.needs)
      : ['ein tag, ein ort, kleines team. den rest klären wir direkt.'],
    facts: [
      { label: 'wann', value: project.shootDate ? shortDate(project.shootDate) : 'stimmen wir ab' },
      { label: 'wo', value: locations.length ? locations.join(', ') : project.location || 'offen' },
      { label: 'regie', value: project.director || band },
    ],
  });

  slides.push({
    id: 'outro',
    kind: 'outro',
    eyebrow: 'und dann?',
    title: band,
    body: [
      'wenn das passt: kurz melden, dann schicken wir song, termine und alles weitere.',
      profile.website ? profile.website : '',
      profile.handle ? `@${profile.handle.replace(/^@/, '')}` : '',
    ].filter(Boolean),
    facts: [],
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
.eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;color:var(--accent);margin-bottom:18px}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(40px,6.4vw,82px);line-height:.98;margin:0 0 20px;letter-spacing:-.01em}
h2{font-family:var(--serif);font-weight:400;font-size:clamp(27px,3.4vw,46px);line-height:1.08;margin:0 0 16px}
p{font-size:clamp(14px,1.2vw,17px);line-height:1.7;color:var(--muted);margin:0 0 14px;max-width:58ch}
.facts{display:flex;flex-wrap:wrap;gap:28px;margin-top:30px}
.fact span{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;color:var(--muted2);margin-bottom:4px}
.fact strong{font-weight:500;font-size:13px}
.cover-image{position:absolute;inset:0;overflow:hidden;z-index:0}
.cover-image img{width:100%;height:100%;object-fit:cover;opacity:.28;filter:grayscale(1) contrast(1.1)}
.cover-image::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,8,8,.35),rgba(8,8,8,.95))}
.slide>*{position:relative;z-index:1}
.words{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 22px}
.words span{border:1px solid var(--line);padding:4px 10px;font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;color:var(--accent)}
.frames{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:8px}
.frame{border:1px solid var(--line);aspect-ratio:16/9;overflow:hidden;background:#0b0b0a}
.frame img{width:100%;height:100%;object-fit:cover;filter:grayscale(.6)}
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:10px}
.shot{border:1px solid var(--line);background:#0b0b0a;display:flex;flex-direction:column;min-height:150px}
.shot-image{aspect-ratio:16/9;background:#111;overflow:hidden}
.shot-image img{width:100%;height:100%;object-fit:cover;filter:grayscale(.7)}
.shot-image.empty{display:grid;place-items:center;color:var(--muted2);font-family:var(--mono);font-size:10px;letter-spacing:.14em}
.shot-body{padding:10px 12px 12px}
.shot-no{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;color:var(--accent);display:block;margin-bottom:5px}
.shot-body p{font-size:12px;line-height:1.45;margin:0;color:var(--text)}
.shot-meta{display:block;margin-top:7px;font-family:var(--mono);font-size:9px;letter-spacing:.08em;color:var(--muted2)}
.footer{margin-top:auto;padding-top:26px;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;color:var(--muted2)}
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
                  <span class="shot-meta">ab ${escapeHtml(shot.time)}</span>
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
