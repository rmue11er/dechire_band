import type { Release, ReleasePhaseId, ReleaseTask, ReleaseType, TaskModule } from './types';

/**
 * The release wave.
 *
 * Not a magic button: a playbook. Every task is a step that bands of our size
 * actually do before a release – with the offset it should happen at, the module
 * it belongs to and the reason why it matters. The dates are relative to the
 * release day, so moving the release re-times the whole wave.
 *
 * The rules below are craft knowledge from independent release campaigns
 * (labels, playlists, press): treat them as defaults to argue with, not laws.
 */

export const PHASES: {
  id: ReleasePhaseId;
  label: string;
  from: number;
  to: number;
  blurb: string;
}[] = [
  {
    id: 'tease',
    label: 'Tease',
    from: -28,
    to: -15,
    blurb: 'Andeuten, ohne zu verraten. Wer hier schon alles zeigt, hat später nichts mehr.',
  },
  {
    id: 'announce',
    label: 'Ankündigung',
    from: -14,
    to: -8,
    blurb: 'Datum, Titel, Pre-Save. Ab jetzt ist es offiziell – und der Pitch muss raus.',
  },
  {
    id: 'countdown',
    label: 'Countdown',
    from: -7,
    to: -1,
    blurb: 'Nähe statt Reklame: Ausschnitte, Credits, Handwerk, Countdown-Sticker.',
  },
  {
    id: 'release',
    label: 'Release-Tag',
    from: 0,
    to: 0,
    blurb: 'Einmal laut, dann danke. Der Tag gehört dem Post, nicht der Korrektur.',
  },
  {
    id: 'sustain',
    label: 'Nachbrenner',
    from: 1,
    to: 21,
    blurb: 'Die zweite Welle: Lyrics, Live, Community. Hier entscheidet sich, ob es bleibt.',
  },
];

export const phaseFor = (offset: number): ReleasePhaseId =>
  PHASES.find((phase) => offset >= phase.from && offset <= phase.to)?.id ?? 'sustain';

export const phaseMeta = (id: ReleasePhaseId) => PHASES.find((phase) => phase.id === id) ?? PHASES[0];

export interface TaskTemplate {
  key: string;
  phase: ReleasePhaseId;
  label: string;
  detail: string;
  module: TaskModule;
  offset: number;
  channel?: string;
  critical?: boolean;
  /** caption draft for planner tasks – {{title}}, {{band}}, {{date}}, {{presave}} */
  caption?: string;
  type?: 'photo' | 'story' | 'reel' | 'carousel';
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  /* ------------------------------------------------------------- tease */
  {
    key: 'assets-check',
    phase: 'tease',
    offset: -26,
    module: 'media',
    label: 'Cover & Pressefotos prüfen',
    detail:
      'Cover in 3000 × 3000 (Playlists brauchen das), Pressefoto in 1:1, 4:5 und 9:16. Was fehlt, jetzt shooten – nicht in der Release-Woche.',
  },
  {
    key: 'press-text',
    phase: 'tease',
    offset: -23,
    module: 'docs',
    label: 'Pressetext schreiben (kurz + lang)',
    detail:
      '50 Wörter für Portale, 200 für Blogs, 500 fürs Presse-Kit. Immer mit einem Satz, der den Song beschreibt, nicht die Band.',
  },
  {
    key: 'teaser-clip',
    phase: 'tease',
    offset: -20,
    module: 'studio',
    label: 'Teaser-Clip bauen (15 s mit Audio)',
    detail: 'Ein Ausschnitt, der hängen bleibt: Hook, keine Intro. 9:16, Untertitel, Bandname im ersten Frame.',
  },
  {
    key: 'tease-post',
    phase: 'tease',
    offset: -18,
    module: 'planner',
    channel: 'story',
    type: 'story',
    label: 'Erster Tease (Story)',
    detail: 'Nichts erklären. Ein Bild, ein Datum, ein Geräusch. Wer fragt, bekommt keine Antwort.',
    caption: 'Etwas kommt.\n\n{{date}}',
  },
  {
    key: 'pitch-list',
    phase: 'tease',
    offset: -16,
    module: 'orga',
    label: 'Playlist- und Presse-Liste aufbauen',
    detail: 'Redaktionen und Kuratoren sammeln, mit Ansprechpartner und letztem Kontakt. Ohne Liste wird der Pitch ein Rundruf.',
  },
  {
    key: 'tease-feed',
    phase: 'tease',
    offset: -15,
    module: 'planner',
    channel: 'feed',
    type: 'photo',
    label: 'Tease-Feed-Post (Detail statt Poster)',
    detail: 'Handwerk zeigen: Kabel, Textzeile im Notizbuch, Aufnahme-Screenshot. Das wirkt echter als jede Grafik.',
    caption: 'Wir haben lange an etwas gesessen.\n\n{{date}} ist es da.\n\n{{band}}',
  },

  /* ---------------------------------------------------------- announce */
  {
    key: 'announce-post',
    phase: 'announce',
    offset: -14,
    module: 'planner',
    channel: 'feed',
    type: 'carousel',
    critical: true,
    label: 'Ankündigung mit Pre-Save-Link',
    detail:
      'Drei Bilder: Cover, Datum, Pre-Save-Screen. Der Link gehört in die Bio – Instagram klickt keine Caption-Links.',
    caption: '{{title}} — {{date}}\n\nDas ist der eine, an dem wir am längsten gesessen haben.\nPre-Save in der Bio.\n\n{{band}}',
  },
  {
    key: 'presave-link',
    phase: 'announce',
    offset: -13,
    module: 'orga',
    critical: true,
    label: 'Pre-Save-Link anlegen & testen',
    detail: 'Ein Link für alle Plattformen (Distributor oder Link-Hub). Auf dem Handy testen, nicht am Laptop.',
  },
  {
    key: 'website-block',
    phase: 'announce',
    offset: -12,
    module: 'website',
    label: 'Website-Release-Block aktivieren',
    detail: 'Neuester Release oben, Pre-Save-Button, ein Satz dazu. Ein Datum auf der Seite ist ein Versprechen.',
  },
  {
    key: 'press-pitch',
    phase: 'announce',
    offset: -11,
    module: 'press',
    critical: true,
    label: 'Presse & Blogs anschreiben',
    detail:
      'Zehn bis vierzehn Tage Vorlauf sind Standard. Kurz halten: ein Satz zur Band, zwei zum Song, Stream-Link, Pressefoto, Kontakt.',
  },
  {
    key: 'playlist-pitch',
    phase: 'announce',
    offset: -9,
    module: 'orga',
    critical: true,
    label: 'Playlist-Pitches abschicken',
    detail: 'Redaktionen planen Wochen im Voraus. Wer am Releasetag pitchen will, ist zu spät.',
  },
  {
    key: 'cover-reveal',
    phase: 'announce',
    offset: -9,
    module: 'studio',
    label: 'Cover-Reveal-Grafik bauen',
    detail: 'Cover plus Typo plus Datum. Im Studio aus dem Template „Release" in fünf Minuten, dann als PNG in die Mediathek.',
  },
  {
    key: 'presave-story',
    phase: 'announce',
    offset: -8,
    module: 'planner',
    channel: 'story',
    type: 'story',
    label: 'Pre-Save-CTA als Story',
    detail: 'Link-Sticker, klare Handlungsaufforderung, ein Satz. Stories sind der einzige Ort mit klickbarem Link.',
    caption: '{{title}} — {{date}}\nJetzt vorspeichern, dann liegt es am Freitag in deiner Bibliothek.',
  },

  /* --------------------------------------------------------- countdown */
  {
    key: 'audio-teaser',
    phase: 'countdown',
    offset: -7,
    module: 'planner',
    channel: 'reel',
    type: 'reel',
    label: 'Audio-Ausschnitt (Hook, 15 s)',
    detail: 'Der Hook, nicht das Intro. Untertitel, weil fast alle ohne Ton schauen.',
    caption: '15 Sekunden, die alles erklären.\n\n{{title}} — {{date}}',
  },
  {
    key: 'behind-post',
    phase: 'countdown',
    offset: -5,
    module: 'planner',
    channel: 'feed',
    type: 'photo',
    label: 'Entstehungsgeschichte / Studio-Foto',
    detail: 'Ein Foto, das man nicht nachstellen kann. Dazu zwei Sätze darüber, was schiefging.',
    caption: 'Diese Aufnahme ist beim dritten Versuch entstanden, nachdem wir alles gelöscht haben.\n\n{{date}}.',
  },
  {
    key: 'tracklist-post',
    phase: 'countdown',
    offset: -3,
    module: 'planner',
    channel: 'feed',
    type: 'photo',
    label: 'Trackliste / Credits',
    detail: 'Wer hat was gemacht. Menschen teilen Beiträge, in denen sie vorkommen.',
    caption: '{{title}}, komplett.\n\nAufgenommen, gemischt und gestritten von uns.\n\n{{date}}.',
  },
  {
    key: 'links-check',
    phase: 'countdown',
    offset: -1,
    module: 'orga',
    label: 'Alle Links prüfen',
    detail: 'Spotify, Bandcamp, Shop, Bio-Link. Ein toter Link am Releasetag kostet mehr als jede Grafik bringt.',
  },
  {
    key: 'tomorrow-story',
    phase: 'countdown',
    offset: -1,
    module: 'planner',
    channel: 'story',
    type: 'story',
    label: '„Morgen um 0 Uhr" + Countdown',
    detail: 'Countdown-Sticker, Uhrzeit, ein Satz. Kein Link nötig – morgen.',
    caption: 'Morgen. 0 Uhr.',
  },

  /* ----------------------------------------------------------- release */
  {
    key: 'out-now',
    phase: 'release',
    offset: 0,
    module: 'planner',
    channel: 'feed',
    type: 'photo',
    critical: true,
    label: 'Out-Now-Post (vormittags)',
    detail:
      'Nicht um 0 Uhr posten – da schläft das Publikum. Zehn Uhr Ortszeit, wenn die erste Welle der Playlists schon läuft.',
    caption: '{{title}} ist da.\n\nÜberall, wo es Musik gibt. Link in der Bio.\n\nDanke an alle, die bis hierhin zugehört haben.\n\n{{band}}',
  },
  {
    key: 'release-story',
    phase: 'release',
    offset: 0,
    module: 'planner',
    channel: 'story',
    type: 'story',
    label: 'Story-Serie: Cover, Link, Danke',
    detail: 'Drei bis fünf Frames: Cover, Link-Sticker, ein Gesicht, ein Danke. Mehr nicht.',
    caption: 'Jetzt draußen. Link hier.',
  },
  {
    key: 'thanks-text',
    phase: 'release',
    offset: 0,
    module: 'docs',
    label: 'Danke- und Credits-Text für die Website',
    detail: 'Kurz, konkret, mit Namen. Auch in einem Jahr noch lesbar.',
  },

  /* ----------------------------------------------------------- sustain */
  {
    key: 'lyric-post',
    phase: 'sustain',
    offset: 2,
    module: 'planner',
    channel: 'feed',
    type: 'photo',
    label: 'Lyric-Snippet',
    detail: 'Ein Satz, groß, ohne Erklärung. Der Satz, den die Leute zitieren würden.',
    caption: '„…"\n\n{{title}}, jetzt überall.',
  },
  {
    key: 'reactions-story',
    phase: 'sustain',
    offset: 4,
    module: 'planner',
    channel: 'story',
    type: 'story',
    label: 'Erste Reaktionen teilen',
    detail: 'Screenshots von Nachrichten und Playlist-Screens – mit Erlaubnis. Soziale Beweise schlagen Werbung.',
  },
  {
    key: 'live-version',
    phase: 'sustain',
    offset: 7,
    module: 'planner',
    channel: 'reel',
    type: 'reel',
    label: 'Live- oder Proberaum-Version',
    detail: 'Der zweite Anlauf für alle, die beim ersten Post nicht dabei waren. Anderer Ausschnitt, gleicher Song.',
  },
  {
    key: 'press-followup',
    phase: 'sustain',
    offset: 10,
    module: 'press',
    label: 'Presse-Follow-up',
    detail: 'Einmal freundlich nachfassen. Nicht zweimal. Wer geantwortet hat, bekommt den nächsten Song zuerst.',
  },
  {
    key: 'community-post',
    phase: 'sustain',
    offset: 14,
    module: 'planner',
    channel: 'feed',
    type: 'photo',
    label: 'Community-Post (Frage stellen)',
    detail: 'Eine echte Frage, keine rhetorische. Kommentare sind der einzige Reichweitenhebel, den du selbst hast.',
    caption: 'Welche Zeile bleibt bei dir hängen?',
  },
  {
    key: 'next-teaser',
    phase: 'sustain',
    offset: 21,
    module: 'planner',
    channel: 'feed',
    type: 'photo',
    label: 'Ausblick auf das Nächste',
    detail: 'Die Welle endet nicht mit einem Post, sondern mit einer Ankündigung. Ein Bild, ein Halbsatz.',
  },
];

export interface WaveRule {
  tag: 'Timing' | 'Format' | 'Inhalt';
  title: string;
  body: string;
}

export const WAVE_RULES: WaveRule[] = [
  {
    tag: 'Timing',
    title: 'Freitag ist Release-Tag',
    body: 'Neue Musik erscheint weltweit freitags, weil dort die Playlists rotieren. Ein anderer Wochentag kostet Sichtbarkeit – außer du hast einen Grund.',
  },
  {
    tag: 'Timing',
    title: 'Ankündigung 3–4 Wochen vorher',
    body: 'Pre-Saves sammeln sich in Woche zwei und drei. Zu früh angekündigt verpufft, zu spät bleibt keine Zeit für die zweite Erinnerung.',
  },
  {
    tag: 'Timing',
    title: 'Pitches 7–14 Tage vorher',
    body: 'Redaktionen und Playlist-Kuratoren planen in Wochen. Am Releasetag zu pitchen heißt: für die nächste Ausgabe.',
  },
  {
    tag: 'Timing',
    title: 'Release-Post am Vormittag',
    body: 'Um 0 Uhr schläft das Publikum. Der Post um zehn Uhr trifft die Leute, die den Song schon in der Playlist gesehen haben.',
  },
  {
    tag: 'Format',
    title: 'Ein Motiv, drei Formate',
    body: '1:1 fürs Profilraster, 4:5 für den Feed, 9:16 für Stories. Im Studio einmal gebaut, per „3 sizes" als ZIP exportiert.',
  },
  {
    tag: 'Format',
    title: 'Cover in 3000 × 3000',
    body: 'Playlists und Stores ziehen das Artwork in groß. Ein 1080er-Cover wird überall unscharf hochskaliert.',
  },
  {
    tag: 'Inhalt',
    title: 'Handwerk schlägt Poster',
    body: 'Proberaum, Kabel, Notizbuch: Menschen folgen Menschen. Ein Poster informiert, ein Foto verbindet.',
  },
  {
    tag: 'Inhalt',
    title: 'Stories tragen Reichweite, Feed trägt Bindung',
    body: 'In der Release-Woche täglich Story, zwei bis drei Feed-Posts. Nicht umgekehrt.',
  },
  {
    tag: 'Inhalt',
    title: 'Nachbrenner an Tag 7 und 21',
    body: 'Die zweite Welle (Lyrics, Live-Version, Community) erreicht die, die beim ersten Mal nicht da waren – und die Algorithmen belohnen Aktivität nach dem Peak.',
  },
];

/* ------------------------------------------------------------- helpers */

const shift = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function daysUntil(dateIso: string) {
  const target = new Date(`${dateIso}T12:00:00Z`).getTime();
  const now = new Date(`${todayIso()}T12:00:00Z`).getTime();
  return Math.round((target - now) / 86_400_000);
}

export function buildTasks(releaseDate: string): Omit<ReleaseTask, 'id' | 'createdAt' | 'done' | 'postId' | 'documentId'>[] {
  return TASK_TEMPLATES.map((template) => ({
    releaseId: 0,
    phase: template.phase,
    key: template.key,
    label: template.label,
    detail: template.detail,
    module: template.module,
    offsetDays: template.offset,
    dueDate: shift(releaseDate, template.offset),
    channel: template.channel ?? '',
    critical: Boolean(template.critical),
  }));
}

export interface WaveStats {
  total: number;
  done: number;
  percent: number;
  criticalOpen: number;
  next: ReleaseTask[];
  byPhase: Record<ReleasePhaseId, { total: number; done: number }>;
}

export function waveStats(tasks: ReleaseTask[]): WaveStats {
  const byPhase = PHASES.reduce(
    (acc, phase) => ({ ...acc, [phase.id]: { total: 0, done: 0 } }),
    {} as WaveStats['byPhase']
  );
  let done = 0;
  tasks.forEach((task) => {
    byPhase[task.phase].total += 1;
    if (task.done) {
      byPhase[task.phase].done += 1;
      done += 1;
    }
  });
  const today = todayIso();
  const next = tasks
    .filter((task) => !task.done && task.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  return {
    total: tasks.length,
    done,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    criticalOpen: tasks.filter((task) => task.critical && !task.done).length,
    next,
    byPhase,
  };
}

export const TYPE_LABEL: Record<ReleaseType, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
  video: 'Video',
};

export const MODULE_LABEL: Record<TaskModule, string> = {
  planner: 'Planner',
  studio: 'Studio',
  media: 'Media',
  docs: 'Documents',
  press: 'Presse',
  website: 'Website',
  orga: 'Orga',
};

/** Caption draft for a planner task, filled with the release data. */
export function draftCaption(key: string, release: Release, bandName: string) {
  const template = TASK_TEMPLATES.find((entry) => entry.key === key);
  if (!template?.caption) return `${release.title} – ${release.releaseDate}`;
  const dateLabel = new Date(`${release.releaseDate}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
  return template.caption
    .replace(/\{\{title\}\}/g, release.title)
    .replace(/\{\{band\}\}/g, bandName)
    .replace(/\{\{date\}\}/g, dateLabel)
    .replace(/\{\{presave\}\}/g, release.presaveUrl ?? '');
}

/** ISO timestamp for a planner slot: 18:00 local on the due date. */
export function draftTimestamp(dueDate: string) {
  return new Date(`${dueDate}T18:00:00`).toISOString();
}
