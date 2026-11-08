# DECHIRE · Band HQ

**Two things in one repo:** an internal workspace for everything a band needs around social media and
paperwork — and a small public one-pager that is configured from inside it.

| | |
|---|---|
| **Band HQ** (internal) | Post planner with a real Instagram mockup, Canva-style design studio, media library with asset versions, notes, milestone calendar, documents (rider, contracts, orga), exportable brand sheet, palette/CI editor |
| **Public site** (`/site`) | A cinematic one-pager that reads like a letter: hero, "a note from us", a media corner, the feed, contact links. Every block can be switched off in `/website` |

![Public site – hero](docs/screenshots/site-hero.jpg)

Everything is local: **SQLite via the built-in `node:sqlite`** (no database server, no native dependencies),
uploads on disk, no cloud, no external services. Black, ash, pastel lavender. Post-hardcore.

---

## Quick start

Requires **Node.js 24+** (`node:sqlite` is used without a flag; on Node 22 start with
`NODE_OPTIONS=--experimental-sqlite`).

```bash
npm install
npm run dev          # → http://localhost:3000
```

On first start the app creates `data/band.db` and fills it with demo content: 13 assets in 6 groups, 9 posts,
4 notes, 7 milestones, 4 documents, a band profile and a pre-filled public site.

```bash
npm run build        # production build
npm start            # serve the build (PORT is respected)
npm run typecheck    # tsc --noEmit
```

> **There is no login of its own.** The workspace contains the Instagram token and everything else in `data/`.
> For a server, set `HQ_PASSWORD` (see [deployment](docs/DEPLOY.md)) — that switches on the Basic Auth gate in
> `proxy.ts` and leaves only `/site` public. Locally it stays off, because the variable is empty.

---

## A look inside

| A note from us | The media corner |
| --- | --- |
| ![Letter](docs/screenshots/site-letter.jpg) | ![Photos](docs/screenshots/site-photos.jpg) |

![Website module](docs/screenshots/hq-website.jpg)

---

## The tools

### 1. Post planner (`/planner`)
- **Real-time Instagram mockup**: profile grid (click any tile to inspect that post) and a single-post view
  with prev/next, carousel, likes, caption folding like the real app, plus a **1:1 grid-crop toggle**
  that shows how the tile will be cropped.
- **Editor split into three tabs** – Content, Publish, Insights – with a **readiness row** on top:
  media, caption, hook, alt text, hashtags and date, each a click away, and a clear
  “Ready to schedule” state.
- **Caption craft**: live character meter with the 125-character fold marker, **Unicode text styles**
  (bold, script, outline, small caps, wide, circled, spaced, upside down …) that work on the selection
  or the whole caption and can be turned back into plain text, structural helpers (rules, bullets),
  hashtag counter for the first comment and “use asset alt text”.
- **Create posts**: media (single or carousel with order), caption with a 2,200-character counter,
  first comment, song + artist, location, alt text, date (**quick presets**), format, status.
- **Snippets**: saved hashtag sets, captions and hooks drop into caption or first comment with one click.
- **Performance per post**: publish to Instagram, sync insights or type the numbers in by hand.
- **Duplicate** a post as a new draft, **reorder the feed by drag & drop**, sort by date, `⌘S` saves.
- **Export**:
  - `Feed as PNG` – snapshot of the mockup (2× resolution) for band chat decisions.
  - `Plan as ZIP` – the whole plan (see below).
  - One ZIP per post with images in upload order, `caption.txt`, `post.json` and `README.txt` with step-by-step instructions.

### 2. Design studio / post builder (`/studio`)
- **Canva feel without the cloud**: canvas with selection frame, 8 resize handles, rotation handle,
  smart snapping to edges, centre and other elements (with guide lines).
- **Tools**:
  - **Text** in 6 presets (Display, Headline, Subline, Quote, Body, Mono) with 9 fonts,
    weight, size, tracking, line height, alignment, uppercase, italic, outline,
    shadow effects (Glow, Hard Shadow, Colour Echo) and text background.
  - **Shapes**: rectangle, circle, triangle, diamond, star, burst, cross, slash, line, frame, tape –
    with solid fill, gradient (adjustable angle), stroke and corner radius.
  - **Media**: images from the library or direct upload, with fill/fit,
    grayscale, contrast, brightness, saturation, tint and corner radius.
  - **Extras**: 10 stickers (asterisk, spark, bolt, arrow, X, brackets, dots, wave, heart, circle)
    and 6 textures (grain, halftone, scanlines, stripes, grid, vignette) with blend modes.
  - **Layers**: list with visibility, lock, order and delete.
- **7 templates**: release slammer, show poster, lyrics, merch drop, story announcement, statement, band photo.
- **Formats**: feed 1:1, feed 4:5, story 9:16 – including “fit elements to format”.
- **Export**: PNG at 2× resolution, save “to library” or drop it into the planner as a
  **draft post** with one click (PNG → media → draft).

### 3. Media library (`/media`)
- Upload via button or **drag & drop** onto the window, images and videos.
- **Asset groups = versions**: a logo exists as “White/transparent”, “Lavender”, “Sticker 1080×1080”,
  “Social avatar” and so on. Every version downloads on its own (`?download=1`) or via “download version” in the group dialog.
- Search across title, version, tags and filename; filter by images / logos / video.
- Detail dialog: title, version label, group, tags, alt text, dimensions, size, **where the asset is used**
  (click to open the post) and **replace file** – swap the file, every post keeps the reference.
- Keeps track of how many posts an asset appears in (usage tracking).

### 4. Notes (`/notes`)
- Rich-text editor (TipTap): H1–H3, bold/italic/underline/strike, highlight, lists,
  **checklists**, quotes, code, links, alignment, undo/redo.
- Folders + tags, pinning, search, autosave (800 ms) with a status indicator, `⌘/Ctrl + S` saves immediately.
- Exported as clean HTML files in the full ZIP.

### 5. Calendar (`/calendar`)
- Month grid with **feed posts and milestones on one timeline**: scheduled and published posts, releases, shows,
  print deadlines, meetings, content slots. Posts and milestones can be toggled separately.
- Click a day to select it, double-click (or “Add milestone”) to create an entry, click an entry to edit it,
  click a post to jump straight to it in the planner.
- Milestones have a title, date, type, note, a “done” flag and a **checklist** (with a ready-made release checklist).
- `.ics` export for Apple/Google Calendar and an optional browser reminder (30 minutes before a post,
  on the day of a milestone).

### 6. Documents (`/docs`)
- Word-style editor for the paperwork: **technical rider, booking confirmations, itineraries,
  press texts, stage plot notes** – with headings, lists, checklists, quotes, tables and links.
- Templates for every document type, drawn up in the band’s own wording (line-up, channel list,
  monitoring, backline, hospitality).
- Tables are real tables: insert, add/remove rows and columns, delete.
- **CI layout**: every document is rendered as a branded sheet – logo, band name, document type,
  date, handle in the header, accent rule in the CI colour, footer with website and “Post-hardcore /// …”.
  The HTML export and the print/PDF output use the same design.
- Autosave (900 ms), draft/final status, tags, search and type filter.
- Export as **print-ready PDF** (print stylesheet, only the sheet on paper) or as a standalone HTML file.

### 7. Brand sheet (`/brand`)
- One page CI guide generated from the live profile and palette: logo on night and bone,
  all colours with hex and role, the four typefaces with specimens, do/don’t rules.
- Export as **PNG (2×)**, as **SVG** (self-contained, fonts embedded) or print it as PDF.
- Change a colour in the settings and the sheet follows – no separate design file to maintain.

### 8. Instagram & performance (`/planner`, Settings)
- Publishing and insights through the **Meta Graph API** (single image and carousel), insights sync
  writes reach/likes/comments/saves/shares per post, the dashboard shows totals, average reach and
  the best weekday from your own numbers.
- Needs an Instagram business account, a Meta app with `instagram_content_publish` and
  `instagram_manage_insights` (app review) and **publicly reachable media URLs** – Instagram downloads the
  image itself, so localhost cannot work; set a tunnel/domain as “public base URL”.
- Without credentials everything runs in **sandbox mode**: same buttons, simulated ids and numbers,
  clearly labelled. Stories cannot be published through the API – use the ZIP export there.
- **Auto-publish**: scheduled posts go out on their own when their time has come. A heartbeat checks every
  minute while Band HQ is open in a tab; an external cron can call `POST /api/scheduler` instead. Needs live
  mode (sandbox only runs when you press “Run now”), logs every run in the settings and stores the last error
  per post. Stories are skipped with a hint towards the ZIP export.
- Manual numbers can be entered per post as well (reach, likes, comments, saves, shares).

### 9. Public website (`/site`) + configuration (`/website`)
- **A one-pager that sounds like a person, not a press kit.** Full-screen hero with the band name rising
  letter by letter, a slow photo drift, film grain and scanlines, an outlined ghost of the name behind it, and
  the four names in the corner.
- **Blocks**, each one switchable in the backend:
  1. **Hero** – photo (or video loop), tagline, crew names, veil strength.
  2. **A note from us** – a serif letter in first person with a signature line, followed by who plays what.
  3. **Media corner** – a small mosaic of photos/clips from the library, optional teaser embed above it and
     one italic caption underneath.
  4. **Feed** – the latest published posts as small tiles linking to their Instagram permalink.
  5. **Say hi** – one big line (or your own quote) plus the link list, Instagram first.
  6. **Footer** – the band name as a giant outline with the small print.
- **Pre-launch mode**: switch the site off and visitors only see the gate — name, tagline, crew and
  Instagram. The page is `noindex` until it is switched on. There is no countdown by design.
- **Configured in the backend** (`/website`) with a **live preview** next to the form (desktop/mobile):
  publish on/off, block switches, hero media, letter and crew (`name — role`, one per line), media corner
  picker, teaser link, tagline, labels, link list, footer note, meta description and a **separate accent
  colour** for the site.
- It reuses the rest of the app: hero and photos come from the **media library**, the feed strip is made of
  **published posts**, and the site accent runs through the same token system as the UI.

### Dashboard (`/`)
Key numbers, upcoming releases with a countdown, feed excerpt, latest assets, notes.

### Settings (`/settings`)
Band profile (name, handle, bio, website, followers, highlights, avatar from the library) –
feeding straight into the Instagram preview. Plus the **interface accent colour**, the
**Instagram connection**, **backup & restore**, the **bin**, the **CI palette editor** and “reset everything”.

### Backup, bin & search
- **Backup** downloads a ZIP with a consistent database copy, every upload and a manifest; **restore** imports
  it again (rows are imported instead of swapping files, so no restart is needed).
- Deleted posts, documents, milestones and notes land in the **bin** first and can be restored.
- **⌘K / Ctrl+K** opens a command palette that searches posts, assets, notes, documents, milestones,
  designs and snippets and jumps straight there.

### CI palette “Bruised Bloom”
The band colours live in the database (`palette`) and are managed through `/api/palette`.
In settings you can change name, hex value, role and order, add new colours
and restore the defaults. Every colour picker in the design studio shows the CI as its own
row “Band CI” above the neutral tones – with names as tooltips.

| Name | Hex | Role |
| --- | --- | --- |
| Night | `#08070b` | Base |
| Ash | `#16121e` | Base |
| Dusk | `#2b2238` | Deep |
| Lavender | `#b9a5e8` | Primary |
| Violet | `#6b54a6` | Accent |
| Bone | `#efe7da` | Paper |
| Rust | `#c86a4a` | Warm |
| Wound | `#c0455a` | Signal |
| Moss | `#7e9c94` | Calm |
| Fog | `#8792a6` | Neutral |

### Interface accent colour

The UI accent (buttons, active navigation, focus rings, chips) is stored as `profile.accent_hex`
and derived into every token the design system needs (`--accent`, `--accent-2`, `--accent-deep`,
`--accent-soft`, `--accent-glow`, `--line`, `--line-strong`, `--shadow-accent`).
The layout renders it server-side so there is no flash, and the settings page applies it instantly
while picking (`accent:updated` event). Pick a CI colour, any hex, or jump back to the CI primary.

---

## Export format

`GET /api/export/plan` returns:

```
content-plan-2026-11-08.csv     Overview for Excel/Numbers/Sheets
posts/2026-11-13_scheduled_photo/
    01-tour-poster-halle-4-5-feed.svg
    caption.txt
    README.txt                  Upload guide incl. song & alt text
media/                          complete library, all versions
notes/*.html                    notes readable in the browser
README.txt
```

`GET /api/export/post/:id` returns the same post folder as its own ZIP.
The PNG snapshot of the feed is generated client-side via `html-to-image`.

---

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, React 19, TypeScript) |
| Database | SQLite via the `node:sqlite` built into Node 22+ – **no native dependencies** |
| Files | `data/uploads/`, served through `/api/files/:filename` |
| Editor | TipTap 2 (StarterKit + Underline, Link, Highlight, TaskList, TextAlign, Placeholder) |
| ZIP export | `archiver` (v8) |
| Image dimensions | `image-size` |
| Design export | `html-to-image` (PNG snapshot of the canvas, 2× resolution) |
| Fonts | `@fontsource` (Anton, Bebas Neue, Archivo Black, Oswald, Inter, Playfair Display, Space Mono – bundled locally) |
| Styling | hand-written CSS design system in `styles/` (no Tailwind, no runtime) |

### Project structure

```
app/
  layout.tsx               Document shell (fonts, accent tokens)
  (hq)/layout.tsx          Workspace chrome: sidebar, command palette, toasts, scheduler
  (hq)/page.tsx            Dashboard
  (hq)/planner/page.tsx    Post planner
  (hq)/calendar/page.tsx   Milestone calendar
  (hq)/studio/page.tsx     Design studio (gallery + templates)
  (hq)/studio/[id]/page.tsx Design editor
  (hq)/media/page.tsx      Media library
  (hq)/notes/page.tsx      Notes
  (hq)/docs/page.tsx       Documents (rider, contracts, orga)
  (hq)/website/page.tsx    Public site: blocks, letter, crew, media corner, live preview
  (hq)/brand/page.tsx      Brand sheet (CI guide, export)
  (hq)/settings/page.tsx   Profile, accent, Instagram, backup, bin, palette
  site/                    Public one-pager with its own layout (no sidebar)
  api/                     REST endpoints (posts, media, media-groups, notes, designs, palette,
                           milestones, documents, profile, stats, site, files, export/*, reset)
proxy.ts                   Optional HTTP Basic Auth gate (active when HQ_PASSWORD is set)
server.js                  Startable Node server for Passenger / systemd
components/                InstagramMock, PostEditor, PostPerformance, SnippetMenu, MediaPicker,
                           NoteEditor, DocEditor, CommandPalette, UI primitives, icons
components/site/           Reveal, SiteAtmosphere (film layer of the public page)
components/studio/         Canvas renderer, editor, tool panel, inspector, gallery
lib/
  db.ts                    SQLite connection, schema, migrations, atomic seed
  repo.ts                  Queries & mappers
  seed.ts                  Demo content + generated SVG artwork
  site.ts                  Public site settings, blocks, crew and media corner data
  siteEmbed.ts             Teaser links → YouTube/Vimeo/Instagram/video embeds
  design.ts                Design model, shapes, fonts, textures, templates
  docTemplates.ts          Rider, contract, itinerary, press & stage-plot templates
  instagram.ts             Meta Graph API client (publish, insights, token refresh, sandbox)
  backup.ts                Backup ZIP + restore by importing rows
  palette.ts               CI palette, accent tokens, colour helpers
  kinds.ts                 Document & milestone type labels
  exporters.ts             Caption/metadata/README/HTML export
  zip.ts, api.ts, format.ts, toast.ts, types.ts
styles/                    base, dashboard, planner, media, notes, settings, studio, calendar, docs,
                           brand, command, website, site
data/                      band.db + uploads (git-ignored, created on first start)
docs/KONZEPT.md            Product and architecture plan
docs/DEPLOY.md             Server setup: Plesk Node.js extension, systemd + nginx, cron, backups
```

### API quick reference

| Method | Route | Purpose |
| --- | --- | --- |
| GET/POST | `/api/posts` | List / create |
| GET/PATCH/DELETE | `/api/posts/:id` | Detail / update / delete |
| POST | `/api/posts/reorder` | `{ ids }` or `{ action: "sort-by-date" }` |
| GET/POST | `/api/media` | List / multipart upload (`files`) |
| GET/PATCH/DELETE | `/api/media/:id` | Detail / metadata / delete |
| GET/POST/PATCH/DELETE | `/api/media-groups` | Asset groups |
| GET/POST | `/api/notes`, `/api/notes/:id` | Notes |
| GET/POST | `/api/designs` | Design studio: list / create |
| GET/PATCH/DELETE | `/api/designs/:id` | Load / save / delete a design |
| GET/PUT | `/api/palette` | Read / fully replace the CI palette |
| GET/POST | `/api/milestones`, `/api/milestones/:id` | Calendar milestones (PATCH/DELETE on `:id`) |
| GET/POST | `/api/documents`, `/api/documents/:id` | Documents (PATCH/DELETE on `:id`) |
| GET/POST | `/api/snippets`, `/api/snippets/:id` | Caption, hashtag and hook snippets |
| POST | `/api/posts/:id/duplicate` | Copy a post as a new draft |
| GET/POST/DELETE | `/api/trash`, `/api/trash/:id` | Bin: list, restore (POST), delete for good |
| GET/POST | `/api/metrics` | Manual numbers, best-weekday insight |
| GET/POST | `/api/instagram` | Status, save, test, publish, sync |
| GET/POST | `/api/scheduler` | Auto-publish status / run it (also for cron) |
| GET/PUT | `/api/site` | Public site settings, blocks, crew, media corner |
| POST | `/api/media/:id/replace` | Swap the file of an asset |
| GET | `/api/backup`, `POST /api/restore` | Backup ZIP / restore it |
| GET | `/api/export/calendar` | `.ics` calendar feed |
| GET | `/api/search?q=` | Global search for ⌘K |
| GET/PATCH | `/api/profile` | Band profile incl. accent colour |
| GET | `/api/stats` | Dashboard numbers |
| GET | `/api/files/:filename` | File (with `?download=1` as download) |
| GET | `/api/export/post/:id`, `/api/export/plan` | ZIP exports |

---

## Running it on a server

**Full walkthrough for IONOS/Plesk — both the Plesk Node.js extension and a systemd + nginx setup, including
permissions, Basic Auth, cron and troubleshooting: [`docs/DEPLOY.md`](docs/DEPLOY.md).**

It is a normal Node.js app with a file database — no Docker, no external services:

```bash
git clone https://github.com/rmue11er/dechire_band.git bandhq && cd bandhq
npm ci
npm run build
PORT=3000 npm start          # or: node server.js
```

Then put a reverse proxy in front of it and point the domain at the proxy:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

Things that actually matter:

- **`data/` must persist and be writable** by the app user — database, uploads, WAL files. Exclude it from
  deploys; that is the whole backup.
- **Node 24+** (or 22 with `NODE_OPTIONS=--experimental-sqlite`); build and runtime should use the same major.
- **Protect the workspace**: `/site` is public, everything else is not. Set `HQ_USER` + `HQ_PASSWORD` and the
  gate in `proxy.ts` locks every path except `/site`, `/_next`, `/api/files` and the icon.
- **Scheduler without an open tab**: cron every 5 minutes →
  `curl -fsS -X POST https://your.domain/api/scheduler`
- **Instagram publishing on the server**: set the public base URL in Settings to the real domain, because
  the Graph API fetches `/api/files/...` itself.
- **Backups**: either the button in Settings (ZIP with database + uploads) or
  `tar czf backup-$(date +%F).tgz data/` from cron.

---

## Notes

- All data lives in `data/` – back up the folder and you have a backup.
- “Settings → Reset” deletes posts, media, notes, designs, milestones and documents, reseeds the demo
  data and restores the default accent + palette.
- The demo images are generated SVG artwork in the band look; just upload real photos/logos.
- The public page lives at `/site` and is meant to be put behind a real domain later; the workspace keeps
  `/`. Saved posts can still be published by the scheduler — the ZIP export stays the manual fallback.
- The SQLite connection never writes on connect (only when seeding an empty database), so the dev
  server does not rebuild itself in a loop while serving requests.
