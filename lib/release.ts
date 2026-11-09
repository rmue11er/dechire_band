import type { AssetKind, Release, ReleasePhaseId, ReleaseTask, ReleaseType, TaskModule } from './types';

/**
 * Sources behind the playbook. Every step that quotes a number or a platform
 * rule points at one of these – so the defaults can be checked, not believed.
 */
export interface ReleaseSource {
  id: string;
  label: string;
  url: string;
  note: string;
}

export const RELEASE_SOURCES: ReleaseSource[] = [
  {
    id: 'spotify-pitch',
    label: 'Spotify for Artists – Playlist-Pitch',
    url: 'https://support.spotify.com/us/artists/article/pitching-music-to-playlists/',
    note: 'Pitch mindestens 7 Tage vor Release (Release Radar), ein Song pro Pitch, ein Video-Pitch separat, Platzierung nicht garantiert.',
  },
  {
    id: 'spotify-cover',
    label: 'Spotify – Cover-Art-Anforderungen',
    url: 'https://support.spotify.com/us/artists/article/cover-art-requirements/',
    note: 'TIFF/PNG/JPG verlustfrei, 640–10.000 px, 1:1, sRGB/24 Bit, nicht hochskalieren, keine eingebetteten Profile.',
  },
  {
    id: 'spotify-audio',
    label: 'Spotify – Audioformate',
    url: 'https://support.spotify.com/us/artists/article/audio-file-formats/',
    note: 'FLAC bevorzugt, WAV erlaubt; 44,1 kHz+, 24 Bit nativ (16 Bit nur wenn kein höherer Master), Stereo, kein Downsampling.',
  },
  {
    id: 'spotify-metadata',
    label: 'Spotify – Metadaten-Richtlinien',
    url: 'https://support.spotify.com/us/artists/article/metadata-formatting-guidelines/',
    note: 'Rollen auf Track- und Release-Ebene, Live-Datum mindestens 7 Tage vorher, kein Künstlername im Titel, Explicit-Flag statt „E“ im Titel.',
  },
  {
    id: 'spotify-lyrics',
    label: 'Spotify – Lyrics über Musixmatch',
    url: 'https://support.spotify.com/us/artists/article/managing-your-lyrics-on-spotify/',
    note: 'Kostenloses Musixmatch-Pro, Abschnitte mit #VERSE/#CHORUS taggen, kein „x2“, Zeilen synchronisieren – Änderungen brauchen einige Tage.',
  },
  {
    id: 'spotify-canvas',
    label: 'Spotify – Canvas-Guidelines',
    url: 'https://support.spotify.com/us/artists/article/canvas-guidelines/',
    note: '3–8 Sekunden, 9:16, 720–1080 px hoch, MP4 oder JPG, kein Gesang/Sprechen, keine hektischen Schnitte.',
  },
  {
    id: 'release-day',
    label: 'Global Release Day (IFPI)',
    url: 'https://en.wikipedia.org/wiki/Global_Release_Day',
    note: 'Seit 2015 ist Freitag der weltweite Releasetag; Stores stellen um 00:01 Ortszeit frei.',
  },
  {
    id: 'youtube-resolution',
    label: 'YouTube – Auflösung & Seitenverhältnisse',
    url: 'https://support.google.com/youtube/answer/6375112',
    note: '16:9 → 1920×1080 (oder höher); 9:16 wird unterstützt. Keine schwarzen Balken ins Bild brennen.',
  },
  {
    id: 'youtube-encoding',
    label: 'YouTube – Upload-Encoding',
    url: 'https://support.google.com/youtube/answer/1722171',
    note: 'Empfohlen: MP4-Container, H.264, AAC-LC.',
  },
  {
    id: 'youtube-content-id',
    label: 'YouTube – Content ID',
    url: 'https://support.google.com/youtube/answer/2797370',
    note: 'Automatische Erkennung geschützter Inhalte; Zugang nur für Rechteinhaber mit den entsprechenden Voraussetzungen.',
  },
  {
    id: 'reels',
    label: 'Instagram – Reels-Größen',
    url: 'https://help.instagram.com/1038071743007909',
    note: 'Seitenverhältnis 1,91:1 bis 9:16, mindestens 720 px, mindestens 30 fps.',
  },
  {
    id: 'gema',
    label: 'GEMA – Mitgliedschaft & Werke',
    url: 'https://www.gema.de/en/music-creators/become-a-member',
    note: 'Werke anmelden und Aufführungen/Streams vergüten lassen. Das Urheberrecht entsteht automatisch, die Anmeldung sichert die Vergütung.',
  },
  {
    id: 'isrc',
    label: 'IFPI – ISRC',
    url: 'https://www.ifpi.org/isrc/',
    note: 'International Standard Recording Code pro Aufnahme; wird in der Regel vom Distributor vergeben.',
  },
];

export const sourceById = (id: string) => RELEASE_SOURCES.find((source) => source.id === id) ?? null;
export const sourceByUrl = (url: string) => RELEASE_SOURCES.find((source) => source.url === url) ?? null;

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
    id: 'production',
    label: 'Produktion',
    from: -56,
    to: -29,
    blurb: 'Master, Cover, Metadaten, Rechte, Videodreh. Was hier fehlt, lässt sich später nicht mehr nachholen.',
  },
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

export const phaseFor = (offset: number): ReleasePhaseId => {
  const first = PHASES[0];
  const last = PHASES[PHASES.length - 1];
  if (offset <= first.from) return first.id;
  if (offset >= last.to) return last.id;
  return PHASES.find((phase) => offset >= phase.from && offset <= phase.to)?.id ?? last.id;
};

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
  /** media slot for this step – drives the picker filter */
  mediaKind?: AssetKind;
  /** source that backs the instruction (see RELEASE_SOURCES) */
  reference?: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  /* --------------------------------------------------------- production */
  {
    key: 'master-final',
    phase: 'production',
    offset: -49,
    module: 'media',
    mediaKind: 'audio',
    critical: true,
    reference: 'spotify-audio',
    label: 'Finalen Master liefern',
    detail:
      'FLAC bevorzugt, WAV erlaubt: 44,1 kHz oder höher, 24 Bit (16 Bit nur, wenn es keinen höheren Master gibt), Stereo – nicht selbst downsamplen. Datei hier anhängen: Sie wird automatisch zum abspielbaren Master oben.',
  },
  {
    key: 'cover-art',
    phase: 'production',
    offset: -45,
    module: 'media',
    mediaKind: 'image',
    critical: true,
    reference: 'spotify-cover',
    label: 'Cover in 3000 × 3000 anlegen',
    detail:
      '1:1, sRGB, 24 Bit, verlustfreies PNG/TIFF/JPG; erlaubt sind 640–10.000 px, empfohlen 3000 × 3000. Nicht hochskalieren, keine eingebetteten Farbprofile. Hier anhängen – wird automatisch das Release-Cover.',
  },
  {
    key: 'metadata-sheet',
    phase: 'production',
    offset: -42,
    module: 'docs',
    reference: 'spotify-metadata',
    label: 'Metadaten & Splits festhalten',
    detail:
      'Titel-Schreibweise, alle Rollen auf Track- und Release-Ebene (Performer, Komponist, Lyriker, Produzent), Explicit-Flag, ISRC/UPC vom Distributor und schriftliche Splits. Künstlernamen gehören nicht in den Titel. Als Dokument anhängen.',
  },
  {
    key: 'rights-gema',
    phase: 'production',
    offset: -40,
    module: 'docs',
    reference: 'gema',
    label: 'Werk anmelden (GEMA) & Rechte klären',
    detail:
      'GEMA-Mitgliedschaft und Werkanmeldung für Musik und Text, Splits mit allen Beteiligten schriftlich. Das Urheberrecht entsteht automatisch – die Anmeldung sichert die Vergütung.',
  },
  {
    key: 'distributor-delivery',
    phase: 'production',
    offset: -35,
    module: 'orga',
    critical: true,
    reference: 'spotify-metadata',
    label: 'Release beim Distributor einreichen',
    detail:
      'Titel, ISRC/UPC, Freitags-Live-Datum, Länder, Explicit. Spotify empfiehlt ein Live-Datum mindestens 7 Tage in der Zukunft; die Zustellung über den Distributor dauert ein paar Tage – plane 3–4 Wochen.',
  },
  {
    key: 'video-treatment',
    phase: 'production',
    offset: -38,
    module: 'docs',
    reference: 'youtube-resolution',
    label: 'Musikvideo: Treatment schreiben',
    detail:
      'Eine Seite: Konzept, Bildsprache passend zum Cover, Location, Cast, Referenzen. 16:9 als Master denken und 9:16-Cutdowns von Anfang an mitplanen. Treatment hier als Dokument anhängen.',
  },
  {
    key: 'video-storyboard',
    phase: 'production',
    offset: -34,
    module: 'studio',
    reference: 'youtube-resolution',
    label: 'Musikvideo: Storyboard & Shotlist',
    detail:
      'Einstellungen, Brennweiten, Locations, Tagesplan. Master in 16:9 (1920 × 1080), zusätzliche vertikale Takes für Reels/Shorts einplanen. Board als Bild oder Studio-Design anhängen.',
  },
  {
    key: 'video-shoot',
    phase: 'production',
    offset: -31,
    module: 'media',
    mediaKind: 'video',
    label: 'Musikvideo: Drehtag',
    detail:
      'Shotlist abarbeiten, 16:9 sauber ohne eingebrannte Balken, zusätzlich 9:16-Versionen drehen. Karten doppelt sichern, Freigaben für Cast und Locations einsammeln.',
  },
  {
    key: 'video-clearance',
    phase: 'production',
    offset: -30,
    module: 'docs',
    reference: 'youtube-content-id',
    label: 'Musikvideo: Rechte & Credits',
    detail:
      'Musikrechte, Location- und Archivfreigaben, Credits für Regie, Kamera und Schnitt. Content ID läuft über den Distributor – YouTube vergibt es nur an Rechteinhaber mit den nötigen Voraussetzungen.',
  },
  {
    key: 'video-edit',
    phase: 'production',
    offset: -29,
    module: 'media',
    mediaKind: 'video',
    critical: true,
    reference: 'youtube-encoding',
    label: 'Musikvideo: Schnitt & Export',
    detail:
      'Schnitt, Grading, Ton. Export als MP4/H.264 mit AAC-LC: 16:9-Master plus 9:16-Cutdowns. Finale Datei hier anhängen – sie wird automatisch das Release-Video oben.',
  },

  /* ------------------------------------------------------------- tease */
  {
    key: 'assets-check',
    phase: 'tease',
    offset: -26,
    module: 'studio',
    reference: 'spotify-cover',
    label: 'Promo-Formate aus dem Cover bauen',
    detail:
      '1:1 fürs Profilraster, 4:5 für den Feed, 9:16 für Stories – vom 3000-px-Master ableiten, nie hochskalieren. Im Studio als „3 sizes“ exportieren und als Design anhängen.',
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
    reference: 'spotify-pitch',
    label: 'Playlist- und Presse-Liste aufbauen',
    detail:
      'Redaktionen und Kuratoren sammeln, mit Ansprechpartner und letztem Kontakt. Ohne Liste wird der Pitch ein Rundruf. Denk daran: Ein Pitch ist eine Bitte, keine Platzgarantie.',
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
    key: 'musixmatch-verify',
    phase: 'announce',
    offset: -12,
    module: 'orga',
    reference: 'spotify-lyrics',
    label: 'Musixmatch-Künstlerprofil verifizieren',
    detail:
      'Musixmatch Pro (kostenlos) mit Spotify verbinden und das Künstlerprofil verifizieren – die Prüfung dauert ein paar Werktage. Danach kannst du Lyrics eintragen und synchronisieren.',
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
    offset: -10,
    module: 'orga',
    critical: true,
    reference: 'spotify-pitch',
    label: 'Spotify-Pitch abschicken (≥ 7 Tage vorher)',
    detail:
      'Über Spotify for Artists unter Music → Upcoming pitchen. Mindestens 7 Tage vor Release, damit du im Release Radar deiner Follower landest; nur ein Song pro Pitch, ein Video pitchst du separat. Früher ist besser – Redaktionen planen Wochen im Voraus.',
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
    reference: 'reels',
    label: 'Audio-Ausschnitt (Hook, 15 s)',
    detail:
      'Der Hook, nicht das Intro. 9:16, mindestens 720 px und 30 fps, Untertitel – fast alle schauen ohne Ton.',
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
    key: 'canvas',
    phase: 'countdown',
    offset: -4,
    module: 'media',
    mediaKind: 'video',
    reference: 'spotify-canvas',
    label: 'Spotify Canvas bauen (3–8 s)',
    detail:
      '9:16, 720–1080 px hoch, MP4 oder JPG, 3–8 Sekunden. Kein Gesang/Sprechen, keine hektischen Schnitte – der Loop läuft stumm hinter dem Player. In Spotify for Artists auswählen.',
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
    reference: 'release-day',
    label: 'Out-Now-Post (vormittags)',
    detail:
      'Die Stores stellen freitags um 00:01 Ortszeit frei (Global Release Day). Den Post trotzdem erst am Vormittag setzen – um 0 Uhr schläft das Publikum.',
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
    key: 'lyrics-publish',
    phase: 'release',
    offset: 0,
    module: 'docs',
    reference: 'spotify-lyrics',
    label: 'Lyrics bei Musixmatch veröffentlichen',
    detail:
      'Lyrics in Musixmatch Pro eintragen: Abschnitte mit #VERSE/#CHORUS taggen, „×2“ ausschreiben (nicht als Multiplikator), Zeilen synchronisieren. Änderungen brauchen ein paar Tage bis zu Spotify. Lyrics-Dokument hier anhängen.',
  },
  {
    key: 'video-premiere',
    phase: 'release',
    offset: 0,
    module: 'media',
    mediaKind: 'video',
    reference: 'youtube-resolution',
    label: 'Musikvideo veröffentlichen / Premiere',
    detail:
      '16:9, 1920 × 1080 oder höher, keine eingebrannten Balken; Premiere in YouTube Studio planen. Das Video danach separat in Spotify for Artists pitchen – nur innerhalb von 7 Tagen nach Release möglich.',
  },
  {
    key: 'content-id',
    phase: 'release',
    offset: 0,
    module: 'orga',
    reference: 'youtube-content-id',
    label: 'Content ID über den Distributor aktivieren',
    detail:
      'Prüfen, ob der Distributor YouTube Content ID anbietet und die Rechte exklusiv bei euch liegen. YouTube vergibt Content ID nur an Rechteinhaber mit den nötigen Voraussetzungen.',
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
    key: 'video-shorts',
    phase: 'sustain',
    offset: 3,
    module: 'planner',
    channel: 'reel',
    type: 'reel',
    reference: 'reels',
    label: 'Video-Cutdowns für Reels & Shorts',
    detail:
      'Zwei bis drei 9:16-Ausschnitte aus dem Musikvideo: mindestens 720 px, 30 fps, Hook in den ersten zwei Sekunden. Credits als Text im Bild.',
    caption: 'Ausschnitt aus „{{title}}“. Der ganze Clip ist draußen.',
  },
  {
    key: 'reporting',
    phase: 'sustain',
    offset: 14,
    module: 'orga',
    reference: 'spotify-pitch',
    label: 'Auswertung: was hat getragen?',
    detail:
      'Spotify for Artists → Playlists und Stats prüfen, Instagram-Insights notieren, Saves und Streams vergleichen. Drei Sätze für den nächsten Release schreiben – nicht nur Zahlen.',
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
  /** optional source id from RELEASE_SOURCES */
  source?: string;
}

export const WAVE_RULES: WaveRule[] = [
  {
    tag: 'Timing',
    title: 'Freitag, 00:01 Ortszeit',
    body: 'Seit 2015 ist Freitag der weltweite Releasetag (IFPI). Die Stores stellen die Musik um 00:01 Ortszeit frei; der Post dazu läuft am Vormittag.',
    source: 'release-day',
  },
  {
    tag: 'Timing',
    title: 'Ankündigung 3–4 Wochen vorher',
    body: 'Pre-Saves sammeln sich in Woche zwei und drei. Zu früh angekündigt verpufft, zu spät bleibt keine Zeit für die zweite Erinnerung.',
  },
  {
    tag: 'Timing',
    title: 'Pitch mindestens 7 Tage vorher',
    body: 'Spotify nimmt Pitches ab 7 Tagen vor Release an – nur dann landest du im Release Radar deiner Follower. Redaktionen planen früher, 3–4 Wochen sind besser. Pitching garantiert keinen Platz.',
    source: 'spotify-pitch',
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
    title: 'Cover 1:1, 3000 px, sRGB',
    body: 'Spotify verlangt verlustfreie TIFF/PNG/JPG, 640–10.000 px, 1:1, sRGB/24 Bit. 3000 × 3000 ist der sichere Master – nicht hochskalieren.',
    source: 'spotify-cover',
  },
  {
    tag: 'Format',
    title: 'Master unverändert liefern',
    body: 'FLAC bevorzugt, WAV erlaubt: 44,1 kHz+, 24 Bit nativ, Stereo. Nicht downsamplen – Spotify konvertiert selbst.',
    source: 'spotify-audio',
  },
  {
    tag: 'Format',
    title: 'Video 1080p, 16:9 – plus 9:16',
    body: 'YouTube empfiehlt 1920 × 1080 bei 16:9, MP4/H.264 mit AAC-LC. Vertikale Fassungen separat schneiden statt Balken ins Bild zu brennen.',
    source: 'youtube-resolution',
  },
  {
    tag: 'Format',
    title: 'Canvas: 3–8 Sekunden',
    body: 'Spotify-Canvas ist 9:16, 720–1080 px hoch, MP4/JPG – ohne Gesang, ohne hektische Schnitte.',
    source: 'spotify-canvas',
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
    title: 'Lyrics mit Abschnitts-Tags',
    body: 'Spotify-Lyrics laufen über Musixmatch: #VERSE/#CHORUS taggen, „×2“ ausschreiben, Zeilen synchronisieren. Änderungen brauchen ein paar Tage.',
    source: 'spotify-lyrics',
  },
  {
    tag: 'Inhalt',
    title: 'Reels: 720 px, 30 fps, 9:16',
    body: 'Instagram akzeptiert 1,91:1 bis 9:16, mindestens 720 px und 30 fps. Hochformat ist die Normalform, nicht der Sonderfall.',
    source: 'reels',
  },
  {
    tag: 'Inhalt',
    title: 'Video-Rechte klären',
    body: 'Content ID erkennt Musik automatisch, ist aber nur für Rechteinhaber mit den nötigen Voraussetzungen verfügbar. Für Bands läuft das über den Distributor.',
    source: 'youtube-content-id',
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

export function buildTasks(
  releaseDate: string
): Omit<
  ReleaseTask,
  'id' | 'createdAt' | 'done' | 'postId' | 'documentId' | 'designId' | 'mediaId'
>[] {
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
    mediaKind: template.mediaKind ?? '',
    notes: '',
    reference: template.reference ? sourceById(template.reference)?.url ?? template.reference : '',
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
