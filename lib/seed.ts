import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from './db';
import { DOC_TEMPLATES } from './docTemplates';

const LAV = '#B9A5E8';
const LAV_DEEP = '#7E63B8';
const INK = '#07060B';

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
      <stop offset="0" stop-color="#111019"/>
      <stop offset=".5" stop-color="#0a0911"/>
      <stop offset="1" stop-color="#040408"/>
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

function photoSvg(seed: number, w = 1080, h = 1350, caption = 'DECHIRE /// LIVE') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${scene(seed, w, h)}
  <g font-family="Helvetica Neue, Arial, sans-serif" fill="#EDE7F8">
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
  const textColor = tone === 'lavender' ? INK : '#F1ECFA';
  const bg = tone === 'lavender' ? LAV : null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${bg ? defs(id) : scene(seed, w, h)}
  ${bg ? `<rect width="${w}" height="${h}" fill="${LAV}"/>` : ''}
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="${Math.round(
    w / 2.6
  )}" font-weight="900" fill="${tone === 'lavender' ? '#000' : LAV}" opacity=".07" transform="rotate(-90 ${w / 2} ${h / 2})" letter-spacing="-8">DECHIRE</text>
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
    <text x="60" y="${h - 72}" font-size="24" letter-spacing="10" opacity=".5">POST-HARDCORE /// DE</text>
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
  const word = 'DECHIRE';
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
      title: 'DECHIRE Wordmark',
      variant: 'White / transparent',
      group: 'DECHIRE Wordmark',
      kind: 'logo',
      tags: ['logo', 'wordmark', 'transparent'],
      alt: 'DECHIRE wordmark in white on a transparent background',
      svg: logoSvg({ color: '#F4F0FA', bg: null, sub: 'POST-HARDCORE' }),
    },
    {
      title: 'DECHIRE Wordmark',
      variant: 'Lavender / transparent',
      group: 'DECHIRE Wordmark',
      kind: 'logo',
      tags: ['logo', 'wordmark', 'lavender', 'transparent'],
      alt: 'DECHIRE wordmark in lavender on a transparent background',
      svg: logoSvg({ color: LAV, bg: null, sub: 'POST-HARDCORE' }),
    },
    {
      title: 'DECHIRE Sticker',
      variant: 'Black on lavender (1080×1080)',
      group: 'DECHIRE Wordmark',
      kind: 'logo',
      tags: ['logo', 'sticker', 'social'],
      alt: 'DECHIRE sticker, black lettering on a lavender square',
      svg: logoSvg({ color: INK, bg: LAV, sub: 'STICKER /// 1080', variant: 'sticker' }),
    },
    {
      title: 'DECHIRE Social Avatar',
      variant: 'White on black (profile)',
      group: 'DECHIRE Wordmark',
      kind: 'logo',
      tags: ['logo', 'avatar', 'profile'],
      alt: 'DECHIRE avatar, white wordmark on a black background',
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
        kicker: 'NEW SINGLE /// NOV 14',
        footer: 'DECHIRE · 03:42',
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
        kicker: 'OUT NOW /// EVERYWHERE',
        footer: 'DECHIRE · 03:42',
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
      title: 'Tour Poster Halle',
      variant: '4:5 Feed',
      group: 'Tour 2026',
      kind: 'artwork',
      tags: ['tour', 'show', 'poster', 'halle'],
      alt: `Tour poster for the show in Halle on ${dayLabel(2)}`,
      svg: posterSvg({
        seed: 41,
        title: `${dayLabel(2).toUpperCase()} HALLE`,
        kicker: 'LIVE /// TOUR 2026',
        footer: 'TICKETS: DECHIRE.BAND',
      }),
    },
    {
      title: 'Tour Poster Cologne',
      variant: '4:5 Feed',
      group: 'Tour 2026',
      kind: 'artwork',
      tags: ['tour', 'show', 'poster', 'cologne'],
      alt: `Tour poster for the show in Cologne on ${dayLabel(9)}`,
      svg: posterSvg({
        seed: 57,
        title: `${dayLabel(9).toUpperCase()} COLOGNE`,
        kicker: 'LIVE /// TOUR 2026',
        footer: 'TICKETS: DECHIRE.BAND',
      }),
    },
    {
      title: 'Live – Smoke & Light',
      variant: '4:5',
      group: 'Live 2025',
      kind: 'photo',
      tags: ['live', 'stage', 'smoke'],
      alt: 'Live shot with smoke and backlight',
      svg: photoSvg(73, 1080, 1350, 'DECHIRE /// LIVE'),
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
      alt: 'Studio shot during a recording session',
      svg: photoSvg(101, 1080, 1350, 'STUDIO /// SESSION 04'),
    },
    {
      title: 'Merch – Tee Front',
      variant: 'Mockup 4:5',
      group: 'Merch',
      kind: 'merch',
      tags: ['merch', 'shirt', 'mockup'],
      alt: 'Mockup of a black t-shirt with a lavender print',
      svg: posterSvg({
        seed: 131,
        title: 'Merch Drop',
        kicker: 'LIMITED /// 50 PIECES',
        footer: 'DECHIRE.BAND/SHOP',
        tone: 'lavender',
      }),
    },
  ];
}

const NOTES = [
  {
    title: 'Show Halle – Running order & Setlist',
    folder: 'Shows',
    pinned: 1,
    tags: ['show', 'halle', 'setlist'],
    content: `<h2>Timeline</h2><ul><li><strong>16:30</strong> Load-in (backyard, gate 3)</li><li><strong>18:00</strong> Soundcheck – 45 min.</li><li><strong>20:15</strong> Doors</li><li><strong>21:00</strong> Show (60 min.)</li></ul><h2>Setlist</h2><ol><li>Fracture</li><li>Ashes in the Wind</li><li>Cold Room</li><li>Night Piece <em>(new, maybe cut)</em></li><li>No Light</li></ol><blockquote>Merch table needs two people – <mark>waiting to hear from Lina</mark>.</blockquote><ul data-type="taskList"><li data-checked="true">Send backline list to venue</li><li data-checked="false">Print setlist</li><li data-checked="false">Confirm fee</li></ul>`,
  },
  {
    title: 'Content Plan – Week 45',
    folder: 'Social',
    pinned: 1,
    tags: ['instagram', 'planning'],
    content: `<p>Goal for the week: <strong>release teaser + tour poster</strong>.</p><h3>Monday</h3><p>Teaser clip (9:16) with a <code>Fracture</code> snippet, caption asking the community a question.</p><h3>Wednesday</h3><p>Carousel: cover + lyrics snippet + tour poster. First comment with the ticket link.</p><h3>Friday</h3><p>Live photo from the archive, story repost in the evening.</p><hr><p><em>Keep hashtags out of the caption – put them in the first comment.</em></p>`,
  },
  {
    title: 'Lyrics – Fracture',
    folder: 'Songs',
    pinned: 0,
    tags: ['lyrics', 'fracture'],
    content: `<p>Verse 1</p><p>I sharpened all the edges,<br>until the rest could not be saved.<br>You say I lost myself somewhere –<br>maybe that was the plan.</p><p>Chorus</p><p><strong>Fracture, hold me down,</strong><br><strong>until the noise takes over.</strong></p><p><em>© DECHIRE 2026</em></p>`,
  },
  {
    title: 'Merch ideas / print files',
    folder: 'Merch',
    pinned: 0,
    tags: ['merch', 'print'],
    content: `<h3>Open items</h3><ul><li>Tee: two-colour screen print, lavender on black</li><li>Sticker set: logo version <em>Sticker</em> from the media library</li><li>Poster 50×70 – matte, 3 motifs</li></ul><p>Printer: <strong>Rauwerk</strong>, request a quote by Nov 20.</p>`,
  },
];

const MILESTONES = [
  {
    title: 'Print deadline: tour posters',
    day: -3,
    kind: 'deadline',
    note: 'Rauwerk needs the final PDF for the 50×70 posters.',
    done: 1,
  },
  { title: 'Merch restock call', day: 1, kind: 'meeting', note: 'With Lina, 18:00, 20 minutes.', done: 0 },
  { title: 'Show Halle', day: 2, kind: 'show', note: 'Load-in 16:30 · doors 20:15 · show 21:00', done: 0 },
  { title: 'Content plan next week', day: 4, kind: 'content', note: 'Three feed posts + two stories.', done: 0 },
  { title: 'Fracture release', day: 5, kind: 'release', note: 'Upload at 00:01 – cover, teaser and story are ready.', done: 0 },
  { title: 'Show Cologne', day: 9, kind: 'show', note: 'Second night of the tour, backline shared with Halle.', done: 0 },
  { title: 'Photo shoot (promo)', day: 13, kind: 'other', note: 'Studio, Bochum. Bring two outfits and the banner.', done: 0 },
];

const DOCUMENTS = [
  {
    template: 'rider',
    title: 'Technical rider',
    tags: ['rider', 'tour'],
  },
  {
    template: 'contract',
    title: 'Booking confirmation – Halle',
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
    `INSERT INTO profile (id, band_name, handle, bio, website, followers, following, avatar_media_id, highlight_names, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'DECHIRE',
    'dechire.band',
    'Post-hardcore from the Ruhr.\nLoud, honest, unpolished.\nBooking: booking@dechire.band',
    'dechire.band/tickets',
    4218,
    312,
    avatarId,
    JSON.stringify(['TOUR 26', 'FRACTURE', 'LIVE', 'MERCH']),
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
        'FRACTURE is out.\n\nThree minutes that cost us two years. Everywhere you listen to music – link in bio.\n\nThank you to everyone who helped. See you on tour.',
      first: '#fracture #dechire #posthardcore #newrelease',
      song: ['Fracture', 'DECHIRE'],
      location: 'Essen, Germany',
      scheduled: iso(-4, 18),
      published: iso(-4, 18),
      media: [mediaIds[5], mediaIds[4], mediaIds[6]],
    },
    {
      type: 'photo',
      status: 'published',
      caption: `Last show burned. Thank you, Halle.\n\n${showDay} we are back – this time with a new setlist.`,
      first: 'Tickets: dechire.band/tickets',
      song: ['No Light', 'DECHIRE'],
      location: 'Halle (Saale)',
      scheduled: iso(-11, 20),
      published: iso(-11, 20),
      media: [mediaIds[9]],
    },
    {
      type: 'reel',
      status: 'published',
      caption: 'Session 04. The rest is coming soon. #studio #dechire',
      first: '',
      song: ['Night Piece (Demo)', 'DECHIRE'],
      location: 'Studio, Bochum',
      scheduled: iso(-17, 17),
      published: iso(-17, 17),
      media: [mediaIds[11]],
    },
    {
      type: 'photo',
      status: 'published',
      caption: 'Merch drop. 50 pieces, no repress.\n\nLink in bio.',
      first: 'Limited at dechire.band/shop',
      song: ['Ashes in the Wind', 'DECHIRE'],
      location: '',
      scheduled: iso(-24, 12),
      published: iso(-24, 12),
      media: [mediaIds[12]],
    },
    {
      type: 'carousel',
      status: 'published',
      caption: `TOUR 2026. Two cities, two nights, one promise.\n\n${showDay} Halle · ${secondShowDay} Cologne`,
      first: 'Tickets in link.',
      song: ['Fracture', 'DECHIRE'],
      location: 'Tour 2026',
      scheduled: iso(-31, 19),
      published: iso(-31, 19),
      media: [mediaIds[7], mediaIds[8]],
    },
    {
      type: 'photo',
      status: 'scheduled',
      caption: `${showDay}, Halle. We are playing almost the whole new record.\n\nTickets in link, come early – the room is small.`,
      first: '#dechire #live #tour2026',
      song: ['Fracture', 'DECHIRE'],
      location: 'Halle (Saale)',
      scheduled: iso(2, 18),
      published: null,
      media: [mediaIds[7]],
    },
    {
      type: 'carousel',
      status: 'scheduled',
      caption: `A song about what is left behind.\n\nFracture – ${releaseDay}.`,
      first: 'Pre-save in bio.',
      song: ['Fracture', 'DECHIRE'],
      location: '',
      scheduled: iso(5, 0),
      published: null,
      media: [mediaIds[5], mediaIds[6], mediaIds[4]],
    },
    {
      type: 'photo',
      status: 'draft',
      caption: 'Lyrics snippet – not final. Check the crop, maybe use a different frame.',
      first: '',
      song: ['Night Piece (Demo)', 'DECHIRE'],
      location: '',
      scheduled: null,
      published: null,
      media: [mediaIds[10]],
    },
    {
      type: 'story',
      status: 'scheduled',
      caption: 'Soundcheck story with a countdown sticker.',
      first: '',
      song: ['No Light', 'DECHIRE'],
      location: 'Halle (Saale)',
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
      label: 'Release set',
      body: '#dechire #posthardcore #newrelease #fracture #ruhr #bandfromgermany',
    },
    {
      kind: 'hashtags',
      label: 'Live set',
      body: '#dechire #livemusic #posthardcore #liveshow #tour2026 #ruhr',
    },
    {
      kind: 'caption',
      label: 'Release day',
      body: 'FRACTURE is out.\n\nThree minutes that cost us two years. Everywhere you listen to music – link in bio.',
    },
    {
      kind: 'caption',
      label: 'Show announcement',
      body: 'We are playing.\n\nDoors 20:15, show 21:00. Come early, the room is small. Tickets in link.',
    },
    {
      kind: 'hook',
      label: 'Question hook',
      body: 'What do you do when the room goes quiet?',
    },
    {
      kind: 'hook',
      label: 'Cold open',
      body: 'No intro. No count-in. Just this.',
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
