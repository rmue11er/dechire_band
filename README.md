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

> **The workspace has a login mask at `/login`.** It contains the Instagram token and everything else in
> `data/`. On a server, set `HQ_PASSWORD` (see [deployment](docs/DEPLOY.md)) — then every internal page
> redirects to the mask and only `/site` stays public. Locally it is off, because the variable is empty.

---

## A look inside

| A note from us | The media corner |
| --- | --- |
| ![Letter](docs/screenshots/site-letter.jpg) | ![Photos](docs/screenshots/site-photos.jpg) |

![Website module](docs/screenshots/hq-website.jpg)

---

## Interface

**Black paper, one accent, print marks.** The workspace runs on `#050508` plus the accent chosen in Settings –
no second hue in the chrome, no drop shadows. Contrast comes from hairlines, type and space.
`styles/shell.css` is loaded last and restates the shell plus every shared component, so page styles never fight it.

- **Display voice**: page titles in Anton, uppercase and tight; micro labels in monospace with wide tracking and a
  `///` accent tick. Dashboard figures use the poster face too, so numbers read like a gig flyer, not a BI tool.
- **Shell**: a 246 px sidebar with numbered entries (`01 … 11`), grouped by `/// STUDIO` / `/// SETUP`, a quick-jump
  field that forwards `⌘K` to the command palette, and a slim sticky **context bar** on every page
  (`DECHIRE /// MEDIA` · date · `⌘K`). Content is capped at 1560 px and centred; a 2 px accent strip sits at the
  very top of the app.
- **Components**: buttons, inputs, panels, badges, tables, empty states, modals and toasts share one language –
  2–3 px radii, 1 px hairlines, accent focus ring, a crop-mark corner on panels, mono uppercase labels.
- Below 1080 px the sidebar becomes a horizontal icon bar with the accent underline on the active entry, and the
  sticky panels get their height maths corrected for the context bar (`--ctx-h`).

---

## The tools

### 1. Post planner (`/planner`)
- **Real-time Instagram mockup**: profile grid and a single-post view. **Click a tile → that post opens in the
  single post view** (and in the editor), **drag a tile → it moves in the grid** (the drop target is highlighted),
  prev/next, carousel, likes, caption folding like the real app, plus a **1:1 grid-crop toggle**
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
- **Drafts first**: a draft needs neither media nor a date and is never published — “Save as draft” writes it as a
  draft even if the post was scheduled before, and a date on a draft is just a note until you switch the status
  to *Scheduled* yourself.
- **Snippets**: saved hashtag sets, captions and hooks drop into caption or first comment with one click.
- **Performance per post**: publish to Instagram, sync insights or type the numbers in by hand.
- **Duplicate** a post as a new draft, **reorder the feed by drag & drop** (in the grid or in the *Feed order*
  list on the right — both call the same endpoint), sort by date, `⌘S` saves.
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
  Templates are drawn in the band's CI and are **re-coloured to the live accent** on the way in
  (`recolourDesign()` in `lib/studio.ts`) – change the accent in Settings and every new design, every preview
  and every existing design (via *Directions → Brand accent*) follows.
- **5 more templates for the genre**: *Close* (full-bleed portrait, Cormorant whisper over a dark veil),
  *Diary* (tape strips, typewriter date, handwritten note), *Elegy* (almost empty black, Instrument Serif
  italic), *Bleed* (type bleeding off the story edges, halftone), *Tour Dates* (condensed date rows).
- **17 fonts, all self-hosted** – beside the poster faces (Anton, Bebas, Archivo Black, Oswald) the post-hardcore
  voice: **Cormorant Garamond**, **Bodoni Moda**, **EB Garamond**, **Instrument Serif**, **Spectral**,
  **Special Elite** (typewriter), **Caveat** (handwriting), **Archivo Narrow**. New text presets *Whisper,
  Elegy, Typewriter, Diary, Tight caps*.
- **Free photos in the studio** (`Stock` tab): search **Openverse** (WordPress/Automattic) filtered to
  **CC0 / public domain only** – usable commercially, **no credit and no payment**. Clicking a result downloads
  the file server-side (`/api/stock/import`), stores it in the media library with `stock`, licence and provider
  tags and drops it onto the canvas. Local copies matter: the canvas export needs same-origin images, and the
  design keeps working when the provider is offline.
- **Directions**: six one-click takes on the current canvas – *Paper* (light flyer stock, ink type),
  *Deep* (blacker, hotter glow), *Mono* (no colour, all texture), *Tilt* (everything a few degrees off the
  grid), *Outline* (hollow display type) and *Brand accent* (pulls every old lavender onto your current CI).
  Each direction is a full design, so applying one is a single undoable step; the grid shows live previews.
- **Formats**: feed 1:1, feed 4:5, story 9:16 – including “fit elements to format” and a **“3 sizes” export**
  that renders 1080×1080, 1080×1350 and 1080×1920 and packages all three PNGs into one ZIP
  (small store-only ZIP writer in `lib/zipStore.ts`, no extra dependency).
- **Google Fonts, self-hosted**: search all ~1,900 families in the inspector; a font is downloaded **once** onto
  your server (`data/fonts/`, latin + latin-ext, up to three weights) and served from your own origin. No
  requests to Google while working, exports keep the typeface, and the families show up in the font picker
  next to the nine built-in ones.
- **Export**: PNG at 2× resolution, save “to library” or drop it into the planner as a
  **draft post** with one click (PNG → media → draft). Plus *3 sizes* as a ZIP for feed and story in one go.

### 3. Media library (`/media`)
- **Folders** (`media_folders`, nestable): a rail on the left holds *All files*, *Unfiled* and the folder tree with
  rolled-up counts. Create, rename and delete folders; deleting one moves its files and subfolders one level up.
  A folder cannot be moved into itself.
- **Drag & drop** an asset onto a folder (rail row or folder card) to move it; dropping onto *All files* files it
  back to *Unfiled*. Uploads land in the folder you have open. Any file can also be re-filed from its detail dialog
  (`Folder` select, indented tree).
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
- **CI layout**: every document is rendered as a branded sheet – not a business letter. Dark masthead with
  logo, wordmark in the display face, tagline, a rotated FINAL/DRAFT **stamp** in the accent colour and a mono
  meta row (`type · No. · date · handle`); below it bone paper with `///` kicker, uppercase display title,
  two-tone accent rule, uppercase section headings with accent ticks, tables with night headers, and a footer
  line. Everything is driven by `--accent` / `--accent-2`, so the sheet follows the accent you pick.
- **Sheet image** (Settings → Document sheet): pick any photo from the media library – it sits in the dark
  masthead behind the wordmark. Strength is adjustable (0–60 %, default 30 %) and saved with the profile,
  so screen, print and HTML export stay identical. Without an image the masthead stays plain black.
- **Emoji picker** in the toolbar: band, mood, orga, road and faces – plus your last ten picks (stored
  locally). Inserts at the cursor position.
- **Images**: the picture button opens the media library (or uploads straight into it) and drops the chosen
  picture into the text. Click an image and a small Image bar appears: size 20–100 % and placement
  `left / center / right / full`. Left and right float, so text wraps around the picture – exactly the way a
  rider or a stage plot reads best. Size and placement live in `data-width` / `data-align`, which means they
  survive autosave, the HTML export and the PDF print.
- **Icons**: 124 hand-picked **Font Awesome Free (Solid)** icons – band, mood, on the road, orga, promo,
  marks – searchable, with recents. They are inserted as **inline SVG** (not a webfont), take the accent
  colour and stay self-contained in the exported HTML. Licence: icons CC BY 4.0, fonts OFL 1.1, code MIT.
- Autosave (900 ms), draft/final status, tags, search and type filter.
- Export as **print-ready PDF** (print stylesheet, only the sheet on paper) or as a standalone HTML
  file with the same layout – logo, sheet image **and every picture in the text** are inlined as data URLs,
  the accent is copied as a CSS variable, so the exported file works offline and in the band's current colours.

### 7. Colour lab (`/palette`)
The band's palette is not guessed any more – it is searched. Everything runs in **OKLCH**, so “pastel”,
“muted” or “a sibling of our lavender” are numbers instead of vibes (`lib/colorlab.ts`).

- **Guided search**: type what you mean – `pastel purple`, `muted moss`, `warm rust`,
  `complement of lavender` – and the query is parsed into hue family + mood + harmony. Chips for
  mood (pastel, muted, dark, bright, neon, earthy, vintage) and harmony (analogous, complementary,
  split, triad, tetrad, mono), plus lightness/chroma sliders when you want to drive it yourself.
- **Scoring**: every candidate is ranked against the palette you already have – hue relationship to the
  nearest colour, lightness separation and contrast to the darkest tone. Each card shows the score bar
  and a note (*sibling of Lavender*, *counterpoint to Moss*, *exact name match*).
- **Tints & shades**: one click turns the seed into a paper→pastel→soft→base→deep→night ladder.
- **Generate a set**: builds night, ink, dusk, primary, accent, bone and signal from the seed.
- **Working palette** with role dropdowns, live preview (headline, button, chip, contrast readout) and a
  “set as UI accent” action on every swatch. Nothing is stored until you save – the module writes to the
  same `palette` table and `profile.accent_hex` as the settings page.

### 8. Brand sheet (`/brand`)
- One page CI guide generated from the live profile and palette: logo on night and bone,
  all colours with hex and role, the four typefaces with specimens, do/don’t rules.
- Export as **PNG (2×)**, as **SVG** (self-contained, fonts embedded) or print it as PDF.
- Change a colour in the settings and the sheet follows – no separate design file to maintain.

### 9. Instagram & performance (`/planner`, Settings)
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

### 10. Public website (`/site`) + configuration (`/website`)
**Warm black, one accent colour, photos taped to the wall.** No template furniture and nothing that reads
as a screen: no paper sheet, no stamps, no badges, no scanlines, no mono labels, no cursor effects.

- **Hero** – the band name in the display face, letter by letter out of the dark, with a soft second print
  underneath it (wet ink, not neon). Beside it **one photo as a taped print**, the tagline in serif italic,
  `@handle` and a quiet `read the note ↓`. Nothing else.
- **A note from us** – the letter itself: `Playfair` body on black, 54 ch, 1.7 leading, `*word*` marked with
  the accent, italic signature. Right beside it the band's photos as taped prints (paper, tape strip, own
  angle, grayscale that develops into colour on hover). No crew list, no roles, no names.
- **From the feed** – the same taped-print language as a wall of flyers, made from published posts.
- **Say hi** – one large press line in serif italic, next to the links set in the display face (Instagram,
  Bandcamp, Booking) – no numbering, no receipt.
- **Footer** – the band name as a very dark, solid field of type.
- **One accent only**: `--site-accent` is the single highlight colour; everything else is black, bone and
  photo paper. Labels are serif italic, not monospaced.
- **Blocks**, each switchable in the backend: hero, note, photos, feed, connect, footer.
- **Pre-launch mode**: switch the site off and visitors only see the gate — name, tagline, `nothing to see
  yet.`, Instagram. `noindex` until it is switched on. No countdown by design.
- **Configured in the backend** (`/website`) with a **live preview** next to the form (desktop/mobile):
  publish on/off, block switches, hero media, the letter, the signature line, photo picker, teaser link,
  tagline, labels, link list, footer note, meta description and the site's own accent colour.
- It reuses the rest of the app: the photos come from the **media library**, the flyers are made of
  **published posts**, and the accent runs through the same token system as the UI.
- **Reduced motion** is respected: the letter rise, the scroll arrow and the grain stop.

### Dashboard (`/`)
Deliberately small – only what moves the band forward:

- **Coming up** – one chronological timeline of scheduled posts *and* dated milestones (with thumbnail,
  status, relative day and open-checklist count). Answers “what is next”, not “what exists”.
- **Needs you** – rule-based to-dos from the live data: drafts without a visual or caption, posts that go
  live within three days without media, milestones with open tasks in the next three weeks. Sorted by urgency.
- **Performance** – reach total, average reach, best weekday and the last published post (your own numbers).
- **Shortcuts** – documents, studio, notes, website – plus the band’s base figures in the panel header.

No feed preview, no media/notes counters, no wall of tiles.

### Settings (`/settings`)
Band profile (name, handle, bio, website, followers, highlights, avatar from the library) –
feeding straight into the Instagram preview. Plus the **interface accent colour** (primary + optional
secondary), the **document sheet image**, the **Instagram connection**, **backup & restore**, the **bin**,
the **CI palette editor** and two ways to start over: **remove all demo data** (empties posts, media files,
notes, milestones, documents, snippets, numbers and the bin, leaves designs/website/palette/fonts alone and
does not come back) or **reset** (wipe + demo data again).

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
and derived into every token the design system needs (`--accent`, `--accent-rgb`, `--accent-2`,
`--accent-2-rgb`, `--accent-2-deep`, `--accent-deep`, `--accent-soft`, `--accent-glow`, `--line`,
`--line-strong`, `--shadow-accent`).
The layout renders it server-side so there is no flash, and the settings page applies it instantly
while picking (`accent:updated` event). Pick a CI colour, any hex, or jump back to the CI primary.

**Second colour (optional):** `profile.accent_2_hex` sets `--accent-2` – a working colour, not a gradient
partner. It carries the *information* layer of the UI while the primary carries interaction:

| Primary accent (`--accent`) | Secondary accent (`--accent-2`) |
| --- | --- |
| buttons, active navigation, focus rings, slider tracks, primary markers | page kickers (`.eyebrow`), panel-title icons, `scheduled` badges, meta labels, the document kicker, milestone dates in the timeline, text selection, ghost-button hover, `.chip.secondary` |

Leave it on *Auto* and the second tone is a sibling of the primary (hue +26°, slightly lighter, a bit
less chroma) – recognisably its own colour, still in the family. Pick a CI colour and it takes over
everywhere at once (also possible from the colour lab with the `2nd` button on any swatch). Nothing in
the app hardcodes a lavender value any more – every translucent surface uses
`rgb(var(--accent-rgb) / x)` or `rgb(var(--accent-2-rgb) / x)`, so notes, studio, planner, media,
documents, dashboard and the brand sheet all follow the two colours you pick.

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
  (hq)/palette/page.tsx    Colour lab (guided palette search, harmonies, generator)
  (hq)/media/page.tsx      Media library
  (hq)/notes/page.tsx      Notes
  (hq)/docs/page.tsx       Documents (rider, contracts, orga)
  (hq)/website/page.tsx    Public site: blocks, letter, crew, media corner, live preview
  (hq)/brand/page.tsx      Brand sheet (CI guide, export)
  (hq)/settings/page.tsx   Profile, accent, Instagram, backup, bin, palette
  site/                    Public one-pager with its own layout (no sidebar)
  api/                     REST endpoints (posts, media, media-groups, notes, designs, palette,
                           milestones, documents, profile, stats, site, files, export/*, reset)
proxy.ts                   Login gate: /login + signed session cookie (active when HQ_PASSWORD is set)
server.js                  Startable Node server for Passenger / systemd
components/                InstagramMock, PostEditor, PostPerformance, SnippetMenu, MediaPicker,
                           NoteEditor, DocEditor, docNodes (image + icon nodes), EmojiPicker,
                           IconPicker, CommandPalette, UI primitives, icons
lib/docIcons.ts            Curated Font Awesome Free (Solid) set – inline SVG for documents
components/site/           Reveal, SiteAtmosphere (film layer of the public page)
components/studio/         Canvas renderer, editor, tool panel, inspector, gallery,
                           variants modal, font browser (Google Fonts) + useCustomFonts store
lib/studio.ts              Accent mapping, format adaptation, design directions
lib/zipStore.ts            Tiny browser ZIP writer (store only) for the multi-format export
app/api/stock/             Openverse search (CC0 only) + import into the media library
lib/
  db.ts                    SQLite connection, schema, migrations, atomic seed
  repo.ts                  Queries & mappers
  seed.ts                  Demo content + generated SVG artwork
  site.ts                  Public site settings, blocks, crew and media corner data
  siteEmbed.ts             Teaser links → YouTube/Vimeo/Instagram/video embeds
  fonts.ts                 Google Fonts search, one-time download, @font-face CSS
  colorlab.ts              OKLCH colour maths: search, scoring, harmonies, generator, naming
  design.ts                Design model, shapes, fonts, textures, templates
  docTemplates.ts          Rider, contract, itinerary, press & stage-plot templates
  instagram.ts             Meta Graph API client (publish, insights, token refresh, sandbox)
  backup.ts                Backup ZIP + restore by importing rows
  palette.ts               CI palette, accent tokens, colour helpers
  kinds.ts                 Document & milestone type labels
  exporters.ts             Caption/metadata/README/HTML export
  zip.ts, api.ts, format.ts, toast.ts, types.ts
styles/                    base, shell (UI system v2), dashboard, planner, media, notes,
                           settings, studio, palette, calendar, docs, brand, command,
                           website, site, login, fonts
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
| GET/POST/DELETE | `/api/fonts`, `/api/fonts/:id` | Self-hosted Google Fonts (search: `/api/fonts/search?q=`) |
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
permissions, the login mask, cron and troubleshooting: [`docs/DEPLOY.md`](docs/DEPLOY.md).**

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
- Added Google Fonts live in `data/fonts/` (font files + a cached catalogue list) and in the `fonts` table; both
  are part of the folder backup. Adding a font needs outbound HTTPS to `fonts.google.com` once — after that
  the studio works offline.
- “Settings → Reset” deletes posts, media, notes, designs, milestones and documents, reseeds the demo
  data and restores the default accent + palette.
- “Settings → Remove all demo data” does the same wipe **without** restoring anything, so the app stays empty
  for real content. The band profile is kept (emptied) – otherwise the app would reseed itself on the next
  start, because it seeds whenever the profile is missing.
- The demo images are generated SVG artwork in the band look; just upload real photos/logos.
- The public page lives at `/site` and is meant to be put behind a real domain later; the workspace keeps
  `/`. Saved posts can still be published by the scheduler — the ZIP export stays the manual fallback.
- The SQLite connection never writes on connect (only when seeding an empty database), so the dev
  server does not rebuild itself in a loop while serving requests.
