import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from './db';
import { DOC_TEMPLATES } from './docTemplates';

const LAV = '#B87A63';
const LAV_DEEP = '#6E3B2C';
const INK = '#0A0807';

const esc = (value: string) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rng(seed: number) {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function defs(id: string) {
  return `
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#171311"/>
      <stop offset=".5" stop-color="#0d0a09"/>
      <stop offset="1" stop-color="#060504"/>
    </linearGradient>
    <radialGradient id="glow${id}" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${LAV}" stop-opacity=".85"/>
      <stop offset=".55" stop-color="${LAV_DEEP}" stop-opacity=".28"/>
      <stop offset="1" stop-color="${LAV_DEEP}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig${id}" cx=".5" cy=".5" r=".75">
      <stop offset=".45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".75"/>
    </radialGradient>
    <pattern id="scan${id}" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#000" opacity=".32"/>
    </pattern>
    <filter id="grain${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <filter id="soft${id}"><feGaussianBlur stdDeviation="38"/></filter>
  </defs>`;
}

function scene(seed: number, w: number, h: number) {
  const id = String(seed);
  const r = rng(seed + 7);
  const blobs = Array.from({ length: 4 }, () => {
    const cx = Math.round(w * (0.12 + r() * 0.76));
    const cy = Math.round(h * (0.12 + r() * 0.74));
    const rx = Math.round(w * (0.2 + r() * 0.36));
    const ry = Math.round(h * (0.14 + r() * 0.3));
    const op = (0.16 + r() * 0.4).toFixed(2);
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#glow${id})" opacity="${op}"/>`;
  }).join('');
  const streaks = Array.from({ length: 8 }, (_, i) => {
    const x = Math.round(r() * w);
    const tilt = 60 + Math.round(r() * 160);
    const stroke = i % 3 === 0 ? '#ffffff' : LAV;
    return `<path d="M${x} ${h + 40} L${x + tilt} -40" stroke="${stroke}" stroke-opacity="${(
      0.03 + r() * 0.08
    ).toFixed(3)}" stroke-width="${Math.round(2 + r() * 30)}" fill="none"/>`;
  }).join('');
  return `
  ${defs(id)}
  <rect width="${w}" height="${h}" fill="url(#bg${id})"/>
  <g filter="url(#soft${id})">${blobs}</g>
  ${streaks}
  <rect width="${w}" height="${h}" fill="url(#vig${id})"/>
  <rect width="${w}" height="${h}" fill="url(#scan${id})" opacity=".45"/>
  <rect width="${w}" height="${h}" filter="url(#grain${id})" opacity=".16" style="mix-blend-mode:overlay"/>`;
}

function photoSvg(seed: number, w = 1080, h = 1350, caption = 'déchire /// live') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${scene(seed, w, h)}
  <g font-family="Helvetica Neue, Arial, sans-serif" fill="#EDE4D6">
    <text x="56" y="${h - 64}" font-size="26" letter-spacing="7" opacity=".65" font-weight="700">${esc(caption)}</text>
    <text x="56" y="96" font-size="22" letter-spacing="9" opacity=".4" font-weight="700">35 MM / 1.4</text>
  </g>
</svg>`;
}

const titleSize = (text: string) => {
  const len = text.length;
  if (len <= 4) return 210;
  if (len <= 6) return 180;
  if (len <= 8) return 150;
  if (len <= 11) return 120;
  return 98;
};

function posterSvg(opts: {
  seed: number;
  title: string;
  kicker: string;
  footer: string;
  w?: number;
  h?: number;
  tone?: 'dark' | 'lavender';
}) {
  const { seed, title, kicker, footer, w = 1080, h = 1350, tone = 'dark' } = opts;
  const id = String(seed);
  const words = title.toUpperCase().split(' ');
  const lines: string[] = [];
  words.forEach((word) => lines.push(word));
  const baseY = h - 260;
  const lineHeight = titleSize(title) * 0.9;
  const textColor = tone === 'lavender' ? INK : '#EDE4D6';
  const bg = tone === 'lavender' ? LAV : null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${bg ? defs(id) : scene(seed, w, h)}
  ${bg ? `<rect width="${w}" height="${h}" fill="${LAV}"/>` : ''}
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="${Math.round(
    w / 2.6
  )}" font-weight="900" fill="${tone === 'lavender' ? '#000' : LAV}" opacity=".07" transform="rotate(-90 ${w / 2} ${h / 2})" letter-spacing="-8">déchire</text>
  <g font-family="Helvetica Neue, Arial, sans-serif" fill="${textColor}">
    <text x="60" y="120" font-size="27" letter-spacing="8" font-weight="700" opacity=".8">${esc(kicker)}</text>
    <rect x="60" y="152" width="86" height="6" fill="${textColor}" opacity=".9"/>
    ${lines
      .map(
        (line, i) =>
          `<text x="56" y="${baseY + i * lineHeight}" font-size="${titleSize(line)}" font-weight="900" letter-spacing="-6">${esc(
            line
          )}</text>`
      )
      .join('\n    ')}
    <text x="60" y="${h - 120}" font-size="30" letter-spacing="6" font-weight="600" opacity=".8">${esc(footer)}</text>
    <text x="60" y="${h - 72}" font-size="24" letter-spacing="10" opacity=".5">POST-HARDCORE /// AUGSBURG</text>
  </g>
  ${tone === 'lavender' ? '' : `<rect width="${w}" height="${h}" fill="url(#scan${id})" opacity=".3"/>`}
</svg>`;
}

function logoSvg(opts: {
  color: string;
  bg: string | null;
  sub: string;
  variant?: 'wordmark' | 'sticker';
  w?: number;
  h?: number;
}) {
  const { color, bg, sub, variant = 'wordmark', w = 1080, h = 1080 } = opts;
  const word = 'déchire';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${bg ? `<rect width="${w}" height="${h}" rx="${variant === 'sticker' ? 90 : 0}" fill="${bg}"/>` : ''}
  ${
    variant === 'sticker'
      ? `<rect x="46" y="46" width="${w - 92}" height="${h - 92}" rx="60" fill="none" stroke="${color}" stroke-width="6" opacity=".35"/>`
      : ''
  }
  <g font-family="Helvetica Neue, Arial, sans-serif" fill="${color}" text-anchor="middle">
    <text x="${w / 2}" y="${h / 2 + 26}" font-size="172" font-weight="900" letter-spacing="14">${word}</text>
    <rect x="${w / 2 - 260}" y="${h / 2 + 62}" width="520" height="7" fill="${color}" opacity=".85"/>
    <text x="${w / 2}" y="${h / 2 + 128}" font-size="30" letter-spacing="18" font-weight="700" opacity=".75">${esc(
      sub
    )}</text>
  </g>
</svg>`;
}

const iso = (daysFromNow: number, hour = 18, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/** Short “10 Nov” label for the same relative offsets used by `iso`. */
const dayLabel = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
};

/** Plain `YYYY-MM-DD` key for calendar entries. */
const dayKey = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type SeedMedia = {
  title: string;
  variant: string;
  group: string;
  kind: string;
  tags: string[];
  alt: string;
  svg: string;
  ext?: string;
};

function buildMedia(): SeedMedia[] {
  const w = 1080;
  return [
    {
      title: 'déchire Wordmark',
      variant: 'White / transparent',
      group: 'déchire Wordmark',
      kind: 'logo',
      tags: ['logo', 'wordmark', 'transparent'],
      alt: 'déchire wordmark in warm white on a transparent background',
      svg: logoSvg({ color: '#F4F0FA', bg: null, sub: 'POST-HARDCORE' }),
    },
    {
      title: 'déchire Wordmark',
      variant: 'Ember / transparent',
      group: 'déchire Wordmark',
      kind: 'logo',
      tags: ['logo', 'wordmark', 'ember', 'transparent'],
      alt: 'déchire wordmark in ember on a transparent background',
      svg: logoSvg({ color: LAV, bg: null, sub: 'POST-HARDCORE' }),
    },
    {
      title: 'déchire Sticker',
      variant: 'Black on ember (1080×1080)',
      group: 'déchire Wordmark',
      kind: 'logo',
      tags: ['logo', 'sticker', 'social'],
      alt: 'déchire sticker, black lettering on an ember square',
      svg: logoSvg({ color: INK, bg: LAV, sub: 'STICKER /// 1080', variant: 'sticker' }),
    },
    {
      title: 'déchire Social Avatar',
      variant: 'White on black (profile)',
      group: 'déchire Wordmark',
      kind: 'logo',
      tags: ['logo', 'avatar', 'profile'],
      alt: 'déchire avatar, warm white wordmark on a black background',
      svg: logoSvg({ color: '#F4F0FA', bg: INK, sub: 'AVATAR /// 1:1' }),
    },
    {
      title: 'Fracture – Cover',
      variant: '4:5 Feed',
      group: 'Fracture (Single)',
      kind: 'artwork',
      tags: ['release', 'cover', 'fracture'],
      alt: 'Fracture single cover in 4:5 format',
      svg: posterSvg({
        seed: 11,
        title: 'Fracture',
        kicker: 'NEUE SINGLE /// 14. NOV',
        footer: 'déchire · 03:42',
      }),
    },
    {
      title: 'Fracture – Cover',
      variant: '9:16 Story',
      group: 'Fracture (Single)',
      kind: 'artwork',
      tags: ['release', 'cover', 'story'],
      alt: 'Fracture single cover in story format',
      svg: posterSvg({
        seed: 11,
        title: 'Fracture',
        kicker: 'JETZT DRAUSSEN /// ÜBERALL',
        footer: 'déchire · 03:42',
        w: 1080,
        h: 1920,
      }),
    },
    {
      title: 'Fracture – Teaser',
      variant: 'No text',
      group: 'Fracture (Single)',
      kind: 'artwork',
      tags: ['release', 'teaser', 'texture'],
      alt: 'Abstract texture teaser without text',
      svg: photoSvg(23, 1080, 1350, 'FRACTURE /// TEASER'),
    },
    {
      title: 'Tour Poster Augsburg',
      variant: '4:5 Feed',
      group: 'Tour 2026',
      kind: 'artwork',
      tags: ['tour', 'show', 'poster', 'augsburg'],
      alt: `Tour poster for the show in Augsburg on ${dayLabel(2)}`,
      svg: posterSvg({
        seed: 41,
        title: `${dayLabel(2).toUpperCase()} AUGSBURG`,
        kicker: 'LIVE /// KANTINE',
        footer: 'TICKETS: déchire.band',
      }),
    },
    {
      title: 'Tour Poster München',
      variant: '4:5 Feed',
      group: 'Tour 2026',
      kind: 'artwork',
      tags: ['tour', 'show', 'poster', 'muenchen'],
      alt: `Tour poster for the show in München on ${dayLabel(9)}`,
      svg: posterSvg({
        seed: 57,
        title: `${dayLabel(9).toUpperCase()} MÜNCHEN`,
        kicker: 'LIVE /// BACKSTAGE',
        footer: 'TICKETS: déchire.band',
      }),
    },
    {
      title: 'Live – Smoke & Light',
      variant: '4:5',
      group: 'Live 2025',
      kind: 'photo',
      tags: ['live', 'stage', 'smoke'],
      alt: 'Live shot with smoke and backlight',
      svg: photoSvg(73, 1080, 1350, 'déchire /// live'),
    },
    {
      title: 'Live – Crowd',
      variant: '4:5',
      group: 'Live 2025',
      kind: 'photo',
      tags: ['live', 'crowd', 'audience'],
      alt: 'Crowd in front of the stage at a concert',
      svg: photoSvg(89, 1080, 1350, 'FRONTROW /// 2025'),
    },
    {
      title: 'Studio – Session 04',
      variant: '4:5',
      group: 'Studio',
      kind: 'photo',
      tags: ['studio', 'recording', 'session'],
      alt: 'Proberaum shot during a late session',
      svg: photoSvg(101, 1080, 1350, 'PROBENRAUM /// 04'),
    },
    {
      title: 'Merch – Tee Front',
      variant: 'Mockup 4:5',
      group: 'Merch',
      kind: 'merch',
      tags: ['merch', 'shirt', 'mockup'],
      alt: 'Mockup of a black t-shirt with an ember print',
      svg: posterSvg({
        seed: 131,
        title: 'Merch',
        kicker: 'NUR 50 STÜCK',
        footer: 'déchire.band/shop',
        tone: 'dark',
      }),
    },
  ];
}

const NOTES = [
  {
    title: 'Augsburg – Ablauf & Setlist',
    folder: 'Shows',
    pinned: 1,
    tags: ['show', 'augsburg', 'setlist'],
    content: `<h2>Ablauf</h2><ul><li><strong>16:30</strong> Load-in (Hof, Tor 3)</li><li><strong>18:00</strong> Soundcheck – 45 Min.</li><li><strong>20:15</strong> Einlass</li><li><strong>21:00</strong> Show (60 Min.)</li></ul><h2>Setlist</h2><ol><li>Fracture</li><li>Ashes in the Wind</li><li>Cold Room</li><li>Night Piece <em>(neu, vielleicht raus)</em></li><li>No Light</li></ol><blockquote>Merch braucht zwei Leute – <mark>Rückmeldung von Lina steht aus</mark>.</blockquote><ul data-type="taskList"><li data-checked="true">Backline-Liste an den Laden</li><li data-checked="false">Setlist drucken</li><li data-checked="false">Gage bestätigen</li></ul>`,
  },
  {
    title: 'Wochenplan – ruhig bleiben',
    folder: 'Social',
    pinned: 1,
    tags: ['instagram', 'planung'],
    content: `<p>Diese Woche: <strong>Teaser + Tour-Poster</strong>, sonst nichts.</p><h3>Montag</h3><p>9:16-Clip mit einem Ausschnitt aus <code>Fracture</code>. Kein großes Setup, nur der Raum und der Song.</p><h3>Mittwoch</h3><p>Karussell: Cover, eine Zeile aus dem Text, Poster.</p><h3>Freitag</h3><p>Live-Foto aus dem Archiv. Abends in der Story.</p><hr><p><em>Keine Hashtags in die Caption – wenn überhaupt, in den ersten Kommentar.</em></p>`,
  },
  {
    title: 'Text – Fracture',
    folder: 'Songs',
    pinned: 0,
    tags: ['lyrics', 'fracture'],
    content: `<p>Verse 1</p><p>I sharpened all the edges,<br>until the rest could not be saved.<br>You say I lost myself somewhere –<br>maybe that was the plan.</p><p>Chorus</p><p><strong>Fracture, hold me down,</strong><br><strong>until the noise takes over.</strong></p><p><em>© déchire 2026</em></p>`,
  },
  {
    title: 'Merch – Druckdateien',
    folder: 'Merch',
    pinned: 0,
    tags: ['merch', 'druck'],
    content: `<h3>Offen</h3><ul><li>Tee: zwei Farben, Ember auf Schwarz</li><li>Sticker: Logo-Version <em>Sticker</em> aus der Mediathek</li><li>Poster 50×70 – matt, drei Motive</li></ul><p>Druck: <strong>Rauwerk</strong>, Angebot bis 20. Nov.</p>`,
  },
];

const MILESTONES = [
  {
    title: 'Poster-Druck: Tour',
    day: -3,
    kind: 'deadline',
    note: 'Rauwerk braucht die finale Datei für die 50×70-Poster.',
    done: 1,
  },
  { title: 'Merch nachbestellen', day: 1, kind: 'meeting', note: 'Mit Lina, 18:00, 20 Minuten.', done: 0 },
  { title: 'Show Augsburg', day: 2, kind: 'show', note: 'Load-in 16:30 · Einlass 20:15 · Show 21:00', done: 0 },
  { title: 'Wochenplan', day: 4, kind: 'content', note: 'Drei Feed-Posts, zwei Stories. Nicht mehr.', done: 0 },
  { title: 'Fracture Release', day: 5, kind: 'release', note: '00:01 hochladen – Cover, Teaser und Story liegen bereit.', done: 0 },
  { title: 'Show München', day: 9, kind: 'show', note: 'Zweiter Abend, Backline geteilt mit Augsburg.', done: 0 },
  { title: 'Fotoshooting', day: 13, kind: 'other', note: 'Proberaum, Augsburg. Zwei Sachen zum Wechseln, sonst nichts.', done: 0 },
];

const DOCUMENTS = [
  {
    template: 'rider',
    title: 'Technical rider',
    tags: ['rider', 'tour'],
  },
  {
    template: 'contract',
    title: 'Booking confirmation – Augsburg',
    tags: ['booking', 'contract'],
  },
  {
    template: 'orga',
    title: 'Stage plot & backline notes',
    tags: ['stage', 'backline'],
  },
  {
    template: 'press',
    title: 'Press text – Fracture',
    tags: ['press', 'bio'],
  },
];

export function seed(db: any) {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM profile').get() as { c: number };
  if (existing && Number(existing.c) > 0) return;  const now = new Date().toISOString();

  // --- Medien -------------------------------------------------------------
  const media = buildMedia();
  const groupIds = new Map<string, number>();
  const mediaIds: number[] = [];

  for (const item of media) {
    if (!groupIds.has(item.group)) {
      const result = db
        .prepare('INSERT INTO media_groups (name, kind, description, created_at) VALUES (?, ?, ?, ?)')
        .run(item.group, item.kind, '', now);
      groupIds.set(item.group, Number(result.lastInsertRowid));
    }
    const filename = `seed-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.variant
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.svg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), item.svg, 'utf8');
    const size = Buffer.byteLength(item.svg);
    const dimensions = item.svg.match(/width="(\d+)"\s+height="(\d+)"/);
    const width = dimensions ? Number(dimensions[1]) : null;
    const height = dimensions ? Number(dimensions[2]) : null;
    const result = db
      .prepare(
        `INSERT INTO media (group_id, variant_label, title, filename, original_name, mime, size, width, height, alt, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        groupIds.get(item.group),
        item.variant,
        item.title,
        filename,
        filename,
        'image/svg+xml',
        size,
        width,
        height,
        item.alt,
        JSON.stringify(item.tags),
        now
      );
    mediaIds.push(Number(result.lastInsertRowid));
  }

  const avatarId = mediaIds[1];

  db.prepare(
    `INSERT INTO profile (id, band_name, handle, bio, website, followers, following, avatar_media_id, highlight_names, accent_hex, accent_2_hex, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'déchire',
    'dechire.band',
    'Emotional Post-Hardcore aus Augsburg.\nKein großes Programm. Nur das, was wirklich da ist.\nBooking: booking@dechire.band',
    'dechire.band/tickets',
    4218,
    312,
    avatarId,
    JSON.stringify(['LIVE', 'FRACTURE', 'PROBERAUM', 'MERCH']),
    '#b87a63',
    null,
    now
  );

  // --- Posts --------------------------------------------------------------
  const showDay = dayLabel(2);
  const secondShowDay = dayLabel(9);
  const releaseDay = dayLabel(5);

  const posts = [
    {
      type: 'carousel',
      status: 'published',
      caption:
        'Fracture ist draußen.\n\nDrei Minuten, die zwei Jahre gekostet haben. Überall, wo du Musik hörst.\n\nDanke an alle, die mitgetragen haben.',
      first: '#fracture #déchire #posthardcore',
      song: ['Fracture', 'déchire'],
      location: 'Augsburg',
      scheduled: iso(-4, 18),
      published: iso(-4, 18),
      media: [mediaIds[5], mediaIds[4], mediaIds[6]],
    },
    {
      type: 'photo',
      status: 'published',
      caption: `Letzte Show war ein Loch. Danke, Augsburg.\n\n${showDay} spielen wir wieder – mit neuen Songs.`,
      first: 'Tickets: dechire.band/tickets',
      song: ['No Light', 'déchire'],
      location: 'Augsburg',
      scheduled: iso(-11, 20),
      published: iso(-11, 20),
      media: [mediaIds[9]],
    },
    {
      type: 'reel',
      status: 'published',
      caption: 'Proberaum, 04. Der Rest kommt, wenn er fertig ist.',
      first: '',
      song: ['Night Piece (Demo)', 'déchire'],
      location: 'Proberaum, Augsburg',
      scheduled: iso(-17, 17),
      published: iso(-17, 17),
      media: [mediaIds[11]],
    },
    {
      type: 'photo',
      status: 'published',
      caption: 'Merch. 50 Stück, kein Nachdruck.\n\nLink in bio.',
      first: 'Nur bei dechire.band/shop',
      song: ['Ashes in the Wind', 'déchire'],
      location: '',
      scheduled: iso(-24, 12),
      published: iso(-24, 12),
      media: [mediaIds[12]],
    },
    {
      type: 'carousel',
      status: 'published',
      caption: `Zwei Abende, zwei Räume.\n\n${showDay} Augsburg · ${secondShowDay} München`,
      first: 'Tickets in der Bio.',
      song: ['Fracture', 'déchire'],
      location: 'Tour 2026',
      scheduled: iso(-31, 19),
      published: iso(-31, 19),
      media: [mediaIds[7], mediaIds[8]],
    },
    {
      type: 'photo',
      status: 'scheduled',
      caption: `${showDay}, Augsburg. Wir spielen fast das ganze neue Album.\n\nKommt früh, der Raum ist klein.`,
      first: '#déchire #live #augsburg',
      song: ['Fracture', 'déchire'],
      location: 'Augsburg',
      scheduled: iso(2, 18),
      published: null,
      media: [mediaIds[7]],
    },
    {
      type: 'carousel',
      status: 'scheduled',
      caption: `Ein Song darüber, was übrig bleibt.\n\nFracture – ${releaseDay}.`,
      first: 'Pre-save in der Bio.',
      song: ['Fracture', 'déchire'],
      location: '',
      scheduled: iso(5, 0),
      published: null,
      media: [mediaIds[5], mediaIds[6], mediaIds[4]],
    },
    {
      type: 'photo',
      status: 'draft',
      caption: 'Textzeile – noch nicht final. Zuschnitt prüfen, vielleicht ein anderes Bild.',
      first: '',
      song: ['Night Piece (Demo)', 'déchire'],
      location: '',
      scheduled: null,
      published: null,
      media: [mediaIds[10]],
    },
    {
      type: 'story',
      status: 'scheduled',
      caption: 'Soundcheck. Kurz bevor es dunkel wird.',
      first: '',
      song: ['No Light', 'déchire'],
      location: 'Augsburg',
      scheduled: iso(9, 16),
      published: null,
      media: [mediaIds[9]],
    },
  ];

  const postIds: number[] = [];

  posts.forEach((post, index) => {
    const result = db
      .prepare(
        `INSERT INTO posts (type, status, caption, first_comment, alt_text, location, song_title, song_artist, scheduled_at, published_at, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        post.type,
        post.status,
        post.caption,
        post.first,
        '',
        post.location,
        post.song[0],
        post.song[1],
        post.scheduled,
        post.published,
        index,
        now,
        now
      );
    const postId = Number(result.lastInsertRowid);
    postIds.push(postId);
    post.media.forEach((mediaId, position) => {
      db.prepare('INSERT INTO post_media (post_id, media_id, position) VALUES (?, ?, ?)').run(
        postId,
        mediaId,
        position
      );
    });
  });

  // --- Notizen ------------------------------------------------------------
  NOTES.forEach((note, index) => {
    const stamp = new Date(Date.now() - (index + 1) * 3600_000 * 24).toISOString();
    db.prepare(
      `INSERT INTO notes (title, content, plain_text, folder, tags, pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      note.title,
      note.content,
      note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      note.folder,
      JSON.stringify(note.tags),
      note.pinned,
      stamp,
      stamp
    );
  });

  // --- Milestones ---------------------------------------------------------
  MILESTONES.forEach((milestone) => {
    db.prepare(
      `INSERT INTO milestones (title, date, kind, note, done, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(milestone.title, dayKey(milestone.day), milestone.kind, milestone.note, milestone.done, now, now);
  });

  // --- Documents ----------------------------------------------------------
  DOCUMENTS.forEach((entry, index) => {
    const template = DOC_TEMPLATES.find((item) => item.id === entry.template) ?? DOC_TEMPLATES[DOC_TEMPLATES.length - 1];
    const stamp = new Date(Date.now() - (index + 1) * 3600_000 * 9).toISOString();
    db.prepare(
      `INSERT INTO documents (title, kind, content, plain_text, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.title,
      template.kind,
      template.content,
      template.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      JSON.stringify(entry.tags),
      stamp,
      stamp
    );
  });

  // --- Snippets -----------------------------------------------------------
  const snippets = [
    {
      kind: 'hashtags',
      label: 'Release',
      body: '#déchire #posthardcore #augsburg #fracture',
    },
    {
      kind: 'hashtags',
      label: 'Live',
      body: '#déchire #livemusic #posthardcore #augsburg',
    },
    {
      kind: 'caption',
      label: 'Release-Tag',
      body: 'Fracture ist draußen.\n\nDrei Minuten, die zwei Jahre gekostet haben. Überall, wo du Musik hörst.',
    },
    {
      kind: 'caption',
      label: 'Show-Ansage',
      body: 'Wir spielen.\n\nEinlass 20:15, Show 21:00. Kommt früh, der Raum ist klein. Tickets im Link.',
    },
    {
      kind: 'hook',
      label: 'Frage-Hook',
      body: 'Was machst du, wenn es still wird?',
    },
    {
      kind: 'hook',
      label: 'Kalter Einstieg',
      body: 'Kein Intro. Kein Count-in. Nur das hier.',
    },
  ];
  snippets.forEach((snippet) => {
    db.prepare(
      `INSERT INTO snippets (kind, label, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(snippet.kind, snippet.label, snippet.body, now, now);
  });

  // --- Example performance numbers ---------------------------------------
  const metrics: { post: number; reach: number; likes: number; comments: number; saves: number; shares: number }[] = [
    { post: postIds[0], reach: 4120, likes: 486, comments: 41, saves: 88, shares: 63 },
    { post: postIds[1], reach: 2360, likes: 254, comments: 22, saves: 31, shares: 18 },
    { post: postIds[4], reach: 3180, likes: 372, comments: 35, saves: 54, shares: 40 },
  ];
  for (const entry of metrics) {
    if (!entry.post) continue;
    db.prepare(
      `INSERT INTO post_metrics (post_id, source, reach, likes, comments, saves, shares, captured_at)
       VALUES (?, 'manual', ?, ?, ?, ?, ?, ?)`
    ).run(entry.post, entry.reach, entry.likes, entry.comments, entry.saves, entry.shares, now);
  }
}
