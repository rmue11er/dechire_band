import type { BookingKind, BookingStatus } from './types';

/* ------------------------------------------------------------------ kinds */

export const BOOKING_KINDS: { value: BookingKind; label: string; hint: string }[] = [
  { value: 'festival', label: 'Festival', hint: 'Bewerbungsfenster, Band-Voting, Line-Up-Calls.' },
  { value: 'venue', label: 'Venue / Club', hint: 'Support-Slots für Tourneen und eigene Abende.' },
  { value: 'youth', label: 'Jugend- / Kulturzentrum', hint: 'Nachwuchsbühnen mit kleinen Gagen oder ohne – der schnellste Weg zu ersten Gigs.' },
  { value: 'contest', label: 'Wettbewerb / Newcomer-Bühne', hint: 'Bandcontests und Talentbühnen – Jury, Publikum, Sichtbarkeit.' },
  { value: 'promoter', label: 'Promoter', hint: 'Bucht Shows, oft mehrere Clubs gleichzeitig.' },
  { value: 'agency', label: 'Booking-Agentur', hint: 'Übernimmt Vertretung und Tourplanung.' },
  { value: 'label', label: 'Label', hint: 'Demo, Story und konkreter Plan – keine Massenmail.' },
  { value: 'radio', label: 'Radio', hint: 'Airplay, Sessions, Interviews.' },
  { value: 'press', label: 'Presse / Blog', hint: 'Reviews, Premieres, Features.' },
  { value: 'other', label: 'Sonstiges', hint: 'Vertrieb, Kooperation, lokale Szene.' },
];

export const bookingKindLabel = (kind: string) =>
  BOOKING_KINDS.find((entry) => entry.value === kind)?.label ?? 'Sonstiges';

export const BOOKING_STATUS: { value: BookingStatus; label: string; hint: string }[] = [
  { value: 'new', label: 'Neu', hint: 'Noch keine Adresse oder kein Ansprechpartner.' },
  { value: 'researched', label: 'Recherchiert', hint: 'Adresse und Ansprechpartner stehen.' },
  { value: 'ready', label: 'Bereit', hint: 'Mail ist vorbereitet und wartet auf den Versand.' },
  { value: 'sent', label: 'Angeschrieben', hint: 'Wartet auf Antwort – Follow-up im Blick behalten.' },
  { value: 'followup', label: 'Follow-up', hint: 'Nachgefasst, noch keine Antwort.' },
  { value: 'replied', label: 'Im Gespräch', hint: 'Antwort da, Termin oder Konditionen werden geklärt.' },
  { value: 'booked', label: 'Gebucht', hint: 'Zugesagt – Vertrag, Rider, Anreise.' },
  { value: 'declined', label: 'Absage', hint: 'Nicht dieses Mal. In 6 Monaten wieder melden.' },
];

export const bookingStatusLabel = (status: string) =>
  BOOKING_STATUS.find((entry) => entry.value === status)?.label ?? 'Neu';

/** Status after an email has gone out – a reply is only ever set by hand. */
export const OPEN_STATUSES: BookingStatus[] = ['new', 'researched', 'ready', 'sent', 'followup'];

export const BOOKING_REGIONS = [
  'Bayern',
  'Baden-Württemberg',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
  'Österreich',
  'Schweiz',
];

/* --------------------------------------------------------------- playbook */

export type PlaybookPhase = 'fundament' | 'recherche' | 'ansprache' | 'nachfassen' | 'label';

export const PLAYBOOK_PHASES: { value: PlaybookPhase; label: string; hint: string }[] = [
  { value: 'fundament', label: 'Fundament', hint: 'Ohne Material und Haltung bringt die schönste Mail nichts.' },
  { value: 'recherche', label: 'Recherche', hint: 'Wer bucht was, wer hört zu, wer passt wirklich.' },
  { value: 'ansprache', label: 'Ansprache', hint: 'Kurz, konkret, persönlich – eine Mail, ein Ziel.' },
  { value: 'nachfassen', label: 'Nachfassen', hint: 'Der Gig entsteht meistens im zweiten Kontakt.' },
  { value: 'label', label: 'Label & Presse', hint: 'Spezifisch statt breit. Zeigen, dass man zugehört hat.' },
];

export type PlaybookStep = {
  key: string;
  phase: PlaybookPhase;
  title: string;
  why: string;
  how: string[];
  minutes: number;
  link?: { href: string; label: string };
};

/** The guide this module is built around – every step is a real to-do, not a slogan. */
export const PLAYBOOK: PlaybookStep[] = [
  {
    key: 'kit',
    phase: 'fundament',
    title: 'Ein Paket bauen, das man in 30 Sekunden versteht',
    why: 'Ein Booker entscheidet in unter einer Minute. Wenn er drei Links klicken muss, ist die Mail weg.',
    how: [
      'Brand Sheet als PDF exportieren: Name, ein Satz, ein Bild, Kontakt.',
      'Zwei Songs als Stream-Link (Bandcamp oder Spotify, nicht beides).',
      'Ein Live-Video, roh und echt – Handy reicht, wenn der Sound stimmt.',
      'Alles auf eine Seite: der Presskit-Export in /admin/brand macht genau das.',
    ],
    minutes: 45,
    link: { href: '/admin/brand', label: 'Brand Sheet öffnen' },
  },
  {
    key: 'position',
    phase: 'fundament',
    title: 'In einem Satz sagen, was ihr seid',
    why: '„Emotional Post-Hardcore aus Augsburg, laut und nah“ reicht. Alles Weitere ist Verhandlung.',
    how: [
      'Keine Adjektive stapeln, keine Genres erfinden.',
      'Eine Referenz nennen, die den Booker sofort einordnet.',
      'Den Satz in Bio, Signatur und erste Zeile der Mail identisch halten.',
    ],
    minutes: 20,
  },
  {
    key: 'targets',
    phase: 'fundament',
    title: 'Ziele in drei Ebenen sortieren',
    why: 'Alles gleichzeitig anschreiben führt zu Absagen von oben und Frust unten.',
    how: [
      'Ebene 1: 30–80 km – hier spielt ihr wirklich, hier entstehen Fotos und erste Rezensionen.',
      'Ebene 2: 100–300 km – Support-Slots in Städten, in denen Freunde wohnen.',
      'Ebene 3: Festivals und Label – erst bewerben, wenn Ebene 1 und 2 Material liefern.',
    ],
    minutes: 30,
  },
  {
    key: 'research',
    phase: 'recherche',
    title: 'Kontakte prüfen statt sammeln',
    why: 'Eine Liste mit 200 Adressen ist wertlos. 40 geprüfte Kontakte füllen ein Jahr.',
    how: [
      'Im Modul unter Kontakte nach Region und Typ filtern.',
      'Pro Kontakt klären: Wer bucht? Steht der Name auf der Website oder im Impressum?',
      'Nur Kontakte mit E-Mail auf „Recherchiert“ stellen – der Rest bleibt „Neu“.',
      'Venues, die euer Genre nie buchen, direkt auf Priorität 3 oder löschen.',
    ],
    minutes: 90,
    link: { href: '/admin/booking?tab=kontakte', label: 'Zu den Kontakten' },
  },
  {
    key: 'timing',
    phase: 'recherche',
    title: 'Timing verstehen: 3–6 Monate Vorlauf',
    why: 'Clubs planen ein Quartal im Voraus, Festivals ein halbes Jahr bis Jahr.',
    how: [
      'Clubs: im Frühjahr für Herbst/Winter anfragen, im Herbst für Frühjahr.',
      'Festivals: Bewerbungsfenster meist November bis Februar, Line-Up steht ab März.',
      'Label: 2–3 Monate vor einem Release, nie „irgendwann“.',
      'Support-Slots für große Tourneen: sobald die Tour angekündigt ist, nicht später.',
    ],
    minutes: 15,
  },
  {
    key: 'firstmail',
    phase: 'ansprache',
    title: 'Die erste Mail: fünf Zeilen, ein Ziel',
    why: 'Kurz wird gelesen. Lang wird archiviert.',
    how: [
      'Zeile 1: warum genau dieser Ort/dieses Festival.',
      'Zeile 2: wer ihr seid und wie ihr klingt (ein Link).',
      'Zeile 3: was ihr anbietet – Support-Slot, eigener Abend, Vorband für X.',
      'Zeile 4: Wunschzeitraum, flexibel formuliert.',
      'Zeile 5: Signatur mit Kontakt. Keine Anhänge über 2 MB, keine Bilderflut.',
    ],
    minutes: 25,
    link: { href: '/admin/booking?tab=vorlagen', label: 'Vorlagen anpassen' },
  },
  {
    key: 'personal',
    phase: 'ansprache',
    title: 'Personalisieren, aber nicht schleimen',
    why: 'Ein Satz, der nur für diesen Kontakt funktioniert – der Rest ist Standard.',
    how: [
      'Letztes Line-Up, letzte Show im Club oder eine Band, die dort gespielt hat, erwähnen.',
      'Nie „ich habe gesehen, dass ihr…“, wenn es nicht stimmt.',
      'Ansprechpartner namentlich ansprechen, wenn der Name bekannt ist.',
    ],
    minutes: 10,
  },
  {
    key: 'send-batch',
    phase: 'ansprache',
    title: 'In Wellen senden, nicht alles auf einmal',
    why: 'Massenmails landen im Spam. Außerdem willst du aus den ersten Antworten lernen.',
    how: [
      'Erst 8–12 Kontakte anschreiben, dann zwei Tage warten und die Vorlage nachschärfen.',
      'Kontakte nach Typ filtern und pro Welle nur einen Typ anschreiben.',
      'Nach dem Versand Status auf „Angeschrieben“ – das Modul setzt ihn automatisch.',
    ],
    minutes: 30,
    link: { href: '/admin/booking?tab=kontakte', label: 'Welle senden' },
  },
  {
    key: 'followup',
    phase: 'nachfassen',
    title: 'Follow-up nach 7–10 Tagen',
    why: 'Die meisten Gigs entstehen im zweiten Kontakt. Ein Follow-up ist kein Drängeln.',
    how: [
      'Eine Zeile: „Ich wollte das kurz hochholen – passt der Zeitraum noch?“',
      'Nach dem Follow-up: Status „Follow-up“ und Wiedervorlage in 4 Wochen.',
      'Nach zwei erfolglosen Nachfassen: Absage akzeptieren, in 6 Monaten wiederkommen.',
    ],
    minutes: 20,
    link: { href: '/admin/booking?tab=kontakte', label: 'Follow-ups sehen' },
  },
  {
    key: 'confirm',
    phase: 'nachfassen',
    title: 'Vor der Zusage alles klären',
    why: 'Unklare Gagen, Technik oder Backline kosten mehr als jede Absage.',
    how: [
      'Gage, Anreise, Übernachtung, Verpflegung, Load-in-Zeit schriftlich.',
      'Rider als Dokument anlegen und mitschicken (/admin/docs).',
      'Merch-Verkauf und Abendkasse-Regelung ansprechen.',
      'Bestätigung immer schriftlich, auch wenn alles telefonisch geklärt wurde.',
    ],
    minutes: 40,
    link: { href: '/admin/docs', label: 'Dokumente' },
  },
  {
    key: 'after',
    phase: 'nachfassen',
    title: 'Nach dem Gig: der nächste entsteht hier',
    why: 'Ein Danke mit Fotos ist der beste Beweis, dass ihr wiederkommen solltet.',
    how: [
      '48 Stunden nach der Show eine kurze Mail mit zwei Fotos und Zuschauerzahl.',
      'Um einen Termin für das nächste Jahr bitten – konkret, nicht vage.',
      'Kontakt auf „Gebucht“ oder „Im Gespräch“ lassen und Wiedervorlage setzen.',
    ],
    minutes: 15,
  },
  {
    key: 'label-list',
    phase: 'label',
    title: 'Fünf Labels aussuchen, nicht fünfzig',
    why: 'Labels erkennen Massenmail sofort. Wer sich fünf Labels wirklich anhört, hat mehr Chancen.',
    how: [
      'Nur Labels, deren Katalog zu euch passt – und die gerade etwas veröffentlichen.',
      'Prüfen, ob sie Demos annehmen und in welcher Form (Formular, Mail, Link).',
      'Notieren, was euch an welcher Veröffentlichung gefällt – konkret.',
    ],
    minutes: 45,
  },
  {
    key: 'label-pitch',
    phase: 'label',
    title: 'Der Label-Pitch: Plan statt Bitte',
    why: 'Labels suchen keine Band, die „einen Deal will“, sondern eine, die schon arbeitet.',
    how: [
      'Drei Sätze zur Band, ein Satz zur Aufnahme, ein Satz zum Plan (Release, Shows, Reichweite).',
      'Zahlen nennen, die es gibt: Streams, verkaufte Shows, Follower – ehrlich, nicht geschätzt.',
      'Kein „wir sind die nächste große Sache“. Stattdessen: „Das ist da, das wollen wir damit machen.“',
      'Anhang: zwei Songs, ein Pressebild, ein Live-Clip. Fertig.',
    ],
    minutes: 60,
    link: { href: '/admin/booking?tab=vorlagen', label: 'Label-Vorlage' },
  },
  {
    key: 'press',
    phase: 'label',
    title: 'Presse mit einem Aufhänger anschreiben',
    why: 'Ein Review entsteht aus einem Anlass: Release, Video, Tour, Jubiläum.',
    how: [
      'Presseverteiler aus dem Modul nutzen (VISIONS, OX, morecore, ByteFM …).',
      'Immer mit Anlass, Stream-Link und Pressebild in der ersten Mail.',
      'Nach Veröffentlichung den Link zum Artikel sammeln – das ist euer Pressekit.',
    ],
    minutes: 30,
  },
  {
    key: 'limits',
    phase: 'label',
    title: 'Grenzen setzen: Volumen und Ton',
    why: 'Verbrennt keine Adressen. Ein Ruf in der Szene ist die halbe Karriere.',
    how: [
      'Maximal 20–30 personalisierte Mails pro Tag – das Modul bremst automatisch.',
      'Nie dieselbe Adresse zweimal pro Woche anschreiben.',
      'Absagen notieren und in sechs Monaten wiederkommen, nicht in zwei Wochen.',
    ],
    minutes: 10,
  },
];

/* -------------------------------------------------------------- placeholders */

export const TEMPLATE_VARS: { key: string; label: string; hint: string }[] = [
  { key: 'name', label: '{{name}}', hint: 'Name des Kontakts (Venue, Festival, Label)' },
  { key: 'contact', label: '{{contact}}', hint: 'Ansprechpartner, falls bekannt' },
  { key: 'city', label: '{{city}}', hint: 'Stadt des Kontakts' },
  { key: 'band', label: '{{band}}', hint: 'Bandname aus dem Profil' },
  { key: 'genre', label: '{{genre}}', hint: 'Ein Satz Genre / Positionierung' },
  { key: 'homebase', label: '{{homebase}}', hint: 'Heimatstadt aus dem Profil' },
  { key: 'listen', label: '{{listen}}', hint: 'Link zu Songs / Streaming' },
  { key: 'live', label: '{{live}}', hint: 'Link zu einem Live-Video' },
  { key: 'press', label: '{{press}}', hint: 'Link zum Presskit' },
  { key: 'sender', label: '{{sender}}', hint: 'Dein Name (Absender)' },
];

/** Replaces the placeholders – unknown ones stay visible so nothing silently disappears. */
export function renderTemplate(text: string, vars: Record<string, string>) {
  return String(text ?? '').replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

/** Everything the templates speak about – filled from the profile at send time. */
export function templateVars(input: {
  contactName: string;
  contactPerson?: string;
  city?: string;
  band: string;
  homebase: string;
  sender: string;
  listen?: string;
  live?: string;
  press?: string;
  genre?: string;
}) {
  return {
    name: input.contactName,
    contact: input.contactPerson || 'zusammen',
    city: input.city ?? '',
    band: input.band,
    homebase: input.homebase,
    sender: input.sender,
    genre: input.genre || 'emotional post-hardcore',
    listen: input.listen || '',
    live: input.live || '',
    press: input.press || '',
  };
}

/* ---------------------------------------------------------------- templates */

export type TemplateSeed = {
  key: string;
  name: string;
  language: 'de' | 'en';
  kind: BookingKind | '';
  subject: string;
  body: string;
};

/**
 * Deliberately short. Long templates get sent unchanged, short ones get personalised.
 * German for German venues and festivals, English for labels and international press.
 */
export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    key: 'de-venue',
    name: 'Venue / Promoter – Erstansprache',
    language: 'de',
    kind: 'venue',
    subject: '{{band}} – Support-Slot in {{city}}?',
    body: `Hallo {{contact}},

wir sind {{band}} aus {{homebase}} – {{genre}}. Kurz, laut, nah dran, ohne große Attitüde.

Wir würden gern bei euch spielen: als Support für eine passende Show oder als eigenen Abend mit zwei befreundeten Bands. Zeitraum wäre flexibel, am liebsten in den nächsten drei bis sechs Monaten.

Hier zwei Songs: {{listen}}
Live, roh und ohne Filter: {{live}}

Wenn es grundsätzlich passt, schickt mir gern, an wen ich mich für die Planung wenden soll.

Danke für die Zeit
{{sender}}

{{band}} · {{homebase}}`,
  },
  {
    key: 'de-festival',
    name: 'Festival – Bewerbung',
    language: 'de',
    kind: 'festival',
    subject: 'Bewerbung {{band}} für {{name}}',
    body: `Hallo {{contact}},

ich bewerbe {{band}} für {{name}}.

{{band}} aus {{homebase}}: {{genre}}, vier Leute, eigene Aufnahmen, kein Tour-Zirkus, aber ein Set, das Leute mitnimmt statt beschallt.

Zwei Songs: {{listen}}
Live-Mitschnitt: {{live}}
Pressekit: {{press}}

Wenn ihr für das kommende Line-Up noch Slots vergebt: wir würden uns freuen, in eurem Bewerbungsverfahren berücksichtigt zu werden. Sagt mir gern, wenn ihr zusätzliche Unterlagen braucht.

{{sender}}
{{band}} · {{homebase}}`,
  },
  {
    key: 'de-followup',
    name: 'Follow-up (7–10 Tage später)',
    language: 'de',
    kind: '',
    subject: 'Kurz nachgehakt: {{band}}',
    body: `Hallo {{contact}},

ich wollte das kurz hochholen – habt ihr meine Mail zu einem Gig in {{city}} gesehen?

Falls der Zeitraum gerade nicht passt: sagt einfach, wann es bei euch besser aussieht, dann melde ich mich danach nochmal.

{{sender}}
{{band}}`,
  },
  {
    key: 'en-label',
    name: 'Label-Pitch (English)',
    language: 'en',
    kind: 'label',
    subject: '{{band}} – new record, first demos',
    body: `Hi {{contact}},

{{band}} is a four-piece from {{homebase}}, {{genre}}. We record everything ourselves and we are not looking for someone to make us look bigger than we are – we are looking for someone who wants to put this out properly.

Two songs from the current session: {{listen}}
Live, one take: {{live}}

What we have: a finished session, a handful of shows in southern Germany, a small but real audience that buys merch.
What we want: a release plan for the next twelve months, not a promise.

If the timing is wrong, I would still be glad to know when it is not.

{{sender}}
{{band}} · {{homebase}}`,
  },
  {
    key: 'en-press',
    name: 'Presse / Blog – Ankündigung (English)',
    language: 'en',
    kind: 'press',
    subject: '{{band}} – new single and a record for fans of …',
    body: `Hi {{contact}},

short note about {{band}} from {{homebase}} – {{genre}}.

We are releasing new material and would be glad if it crossed your desk:
Stream: {{listen}}
Presskit with photos and text: {{press}}

If you want a track for a premiere or a different angle for a review, tell me what helps and I will send exactly that.

Thanks for reading
{{sender}}
{{band}}`,
  },
];

/* ------------------------------------------------------------------- research */

export type ContactSeed = {
  name: string;
  kind: BookingKind;
  city: string;
  region: string;
  website: string;
  tags: string[];
  fit: string;
  deadline?: string;
  km?: number;
  priority?: number;
  sourceUrl?: string;
};

/** Falls back to a search when there is no safe single domain to link. */
const find = (query: string) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

/**
 * Starting set: festivals, clubs, promoters, labels and press in Germany that
 * plausibly book emotional post-hardcore. Addresses deliberately left empty –
 * the mail must be researched per house, not scraped.
 */
export const CONTACT_SEEDS: ContactSeed[] = [
  /* festivals ------------------------------------------------------------ */
  { name: 'Vainstream Rockfest', kind: 'festival', city: 'Münster', region: 'Nordrhein-Westfalen', website: 'https://vainstream.com', sourceUrl: 'https://vainstream.com/bandvoting/', tags: ['punk', 'hardcore', 'metalcore'], fit: 'Punk-/Hardcore-Programm mit Emo- und Post-Hardcore-Rand. Bandvoting läuft über die Website – dort bewerben, nicht per Fan-Mail an das Booking.', deadline: 'Bandvoting meist Dezember–Februar', km: 600, priority: 1 },
  { name: 'Impericon Festival', kind: 'festival', city: 'Leipzig', region: 'Sachsen', website: 'https://www.impericon.com', tags: ['metalcore', 'hardcore'], fit: 'Metalcore-/Hardcore-Publikum, genau euer Lautstärkebereich. Bewerbung über das Impericon-Booking-Team, oft mit Vorband-Slots.', deadline: 'Line-Up-Planung im Herbst', km: 450, priority: 1 },
  { name: 'KNRD Fest', kind: 'festival', city: 'Nürnberg', region: 'Bayern', website: 'https://www.knrd.de', tags: ['punk', 'hardcore', 'emo'], fit: 'Nürnberger DIY-Kollektiv, kurze Anreise von Augsburg, offen für Emo und Post-Hardcore. Der direkteste Weg in eine Szene, die euch hört.', deadline: 'Line-Up meist im Frühjahr', km: 150, priority: 1 },
  { name: 'Summer Breeze', kind: 'festival', city: 'Dinkelsbühl', region: 'Bayern', website: 'https://www.summer-breeze.de', tags: ['metal', 'metalcore'], fit: 'Großes Metal-Open-Air mit Hardcore-Anteil, 160 km entfernt. Bewerbung früh im Jahr, Unterlagen vollständig.', deadline: 'Bewerbung Herbst/Winter', km: 160, priority: 2 },
  { name: 'Ruhrpott Rodeo', kind: 'festival', city: 'Hünxe', region: 'Nordrhein-Westfalen', website: 'https://www.ruhrpott-rodeo.de', tags: ['punk', 'hardcore'], fit: 'Punk-Festival mit Szene-Publikum. Realistischer Slot eher über eine Vorband-Empfehlung als über Kaltbewerbung.', deadline: 'Bewerbung Winter', km: 620, priority: 2 },
  { name: 'Bochum Total', kind: 'festival', city: 'Bochum', region: 'Nordrhein-Westfalen', website: 'https://www.bochum-total.de', tags: ['rock', 'alternative', 'pop'], fit: 'Kostenloses Stadtfestival mit Newcomer-Bühnen und offener Bewerbung – gutes erstes „wir haben auswärts gespielt“.', deadline: 'Bewerbung Frühjahr', km: 580, priority: 2 },
  { name: 'Umsonst & Draußen Würzburg', kind: 'festival', city: 'Würzburg', region: 'Bayern', website: find('Umsonst und Draußen Würzburg Festival Bewerbung'), tags: ['punk', 'alternative', 'indie'], fit: 'Selbstorganisiertes Wochenende, kurze Anreise, ehrliches Publikum. Bewerbung über das Orga-Team.', deadline: 'Bewerbung Frühjahr', km: 230, priority: 2 },
  { name: 'Open Flair', kind: 'festival', city: 'Eschwege', region: 'Hessen', website: 'https://www.open-flair.de', tags: ['punk', 'alternative'], fit: 'Alternative/Punk-Programm mit Nachwuchs-Slots. Weiter weg, aber ein Publikum, das euch versteht.', deadline: 'Bewerbung Winter', km: 480, priority: 3 },
  { name: 'Taubertal Festival', kind: 'festival', city: 'Rothenburg ob der Tauber', region: 'Bayern', website: 'https://www.taubertal-festival.de', tags: ['rock', 'alternative'], fit: 'Regionales Rock-/Alternative-Festival in Reichweite. Nachwuchsbühne und Talentwettbewerb als Einstieg prüfen.', deadline: 'Bewerbung Frühjahr', km: 180, priority: 3 },
  { name: 'Dong Open Air', kind: 'festival', city: 'Neukirchen-Vluyn', region: 'Nordrhein-Westfalen', website: 'https://www.dongopenair.de', tags: ['metal', 'post-rock'], fit: 'Kleines, gut kuratiertes Metal-Open-Air mit Hang zu Post-Rock und Atmosphäre.', deadline: 'Bewerbung Winter', km: 640, priority: 3 },
  { name: 'Rocco del Schlacko', kind: 'festival', city: 'Püttlingen', region: 'Saarland', website: 'https://www.rocco-del-schlacko.de', tags: ['rock', 'punk', 'alternative'], fit: 'Alternative-/Punk-Festival im Saarland. Für später, wenn ihr weiter fahrt.', deadline: 'Bewerbung Winter', km: 400, priority: 3 },
  { name: 'Deichbrand', kind: 'festival', city: 'Wurster Nordseeküste', region: 'Niedersachsen', website: 'https://www.deichbrand.de', tags: ['rock', 'alternative'], fit: 'Großes Festival. Kaltbewerbung selten erfolgreich – über eine Agentur oder nach einem Szene-Release erneut versuchen.', deadline: 'Bewerbung Herbst', km: 850, priority: 3 },

  /* Augsburg & Umgebung --------------------------------------------------- */
  { name: 'Kantine', kind: 'venue', city: 'Augsburg', region: 'Bayern', website: find('Kantine Augsburg Booking Kontakt'), tags: ['club', 'alternative'], fit: 'Direkt vor der Haustür. Club-Shows mit Support-Slots, hier entstehen die ersten Fotos.', km: 0, priority: 1 },
  { name: 'Spectrum', kind: 'venue', city: 'Augsburg', region: 'Bayern', website: find('Spectrum Augsburg Club Booking'), tags: ['club', 'rock', 'alternative'], fit: 'Augsburger Club mit Rock-/Alternative-Programm. Kurzer Weg, ehrliches Feedback.', km: 0, priority: 1 },
  { name: 'Roxy', kind: 'venue', city: 'Ulm', region: 'Baden-Württemberg', website: find('Roxy Ulm Booking Kontakt'), tags: ['club', 'rock'], fit: '90 km, etablierter Club mit Nachwuchs-Slots.', km: 90, priority: 2 },
  { name: 'Backstage', kind: 'venue', city: 'München', region: 'Bayern', website: 'https://www.backstage.eu', tags: ['club', 'rock', 'metal'], fit: 'Münchner Institution mit mehreren Hallen – Support-Slots für kleine Acts sind realistisch.', km: 70, priority: 1 },
  { name: 'Feierwerk', kind: 'venue', city: 'München', region: 'Bayern', website: 'https://www.feierwerk.de', tags: ['club', 'alternative', 'indie'], fit: 'Jugendkulturzentrum mit offenem Programm und Nachwuchsförderung. Guter erster München-Gig.', km: 70, priority: 1 },
  { name: 'Ampere', kind: 'venue', city: 'München', region: 'Bayern', website: 'https://www.ampere-muc.de', tags: ['indie', 'alternative'], fit: 'Kleine Bühne für Indie und Alternative, direkt im Muffatwerk.', km: 70, priority: 2 },
  { name: 'Z-Bau', kind: 'venue', city: 'Nürnberg', region: 'Bayern', website: 'https://z-bau.com', tags: ['alternative', 'indie', 'punk'], fit: 'Offenes Kulturzentrum, Szene-Publikum, kurze Anreise.', km: 150, priority: 1 },
  { name: 'Hirsch', kind: 'venue', city: 'Nürnberg', region: 'Bayern', website: 'https://www.hirsch-nuernberg.de', tags: ['rock', 'metal'], fit: 'Klassischer Rock-/Metal-Club – passt für harte Support-Slots.', km: 150, priority: 2 },
  { name: 'Alte Mälzerei', kind: 'venue', city: 'Regensburg', region: 'Bayern', website: find('Alte Mälzerei Regensburg Booking'), tags: ['club', 'alternative'], fit: 'Regensburger Kulturbühne, 180 km. Gute Unterstützung für neue Acts.', km: 180, priority: 2 },
  { name: 'Posthalle', kind: 'venue', city: 'Würzburg', region: 'Bayern', website: 'https://www.posthalle.de', tags: ['club', 'rock'], fit: 'Würzburger Halle mit Rock-Programm, Support-Slots vorhanden.', km: 230, priority: 2 },
  { name: 'B-Hof', kind: 'venue', city: 'Würzburg', region: 'Bayern', website: find('B-Hof Würzburg Booking Kontakt'), tags: ['punk', 'hardcore', 'alternative'], fit: 'Kleiner Szene-Club – genau die Größe, in der Post-Hardcore funktioniert.', km: 230, priority: 1 },

  /* Stuttgart & Baden-Württemberg ----------------------------------------- */
  { name: 'Universum', kind: 'venue', city: 'Stuttgart', region: 'Baden-Württemberg', website: find('Universum Stuttgart Club Booking'), tags: ['club', 'rock', 'alternative'], fit: 'Stuttgarter Club mit alternativem Programm, 160 km.', km: 160, priority: 2 },
  { name: 'Juha West', kind: 'venue', city: 'Stuttgart', region: 'Baden-Württemberg', website: find('Juha West Stuttgart Booking'), tags: ['punk', 'hardcore'], fit: 'Szene-Kneipe mit Bühne – perfekt für einen rauen Abend mit befreundeten Bands.', km: 160, priority: 1 },
  { name: 'Club Cann', kind: 'venue', city: 'Stuttgart', region: 'Baden-Württemberg', website: find('Club Cann Stuttgart Booking'), tags: ['club', 'punk', 'alternative'], fit: 'Stuttgarter Club für Punk und Alternative.', km: 160, priority: 2 },
  { name: 'Substage', kind: 'venue', city: 'Karlsruhe', region: 'Baden-Württemberg', website: 'https://www.substage.de', tags: ['club', 'rock', 'alternative'], fit: 'Etablierter Club, weiter Weg – sinnvoll zusammen mit einem zweiten Gig am Wochenende.', km: 250, priority: 3 },
  { name: 'MS Connexion', kind: 'venue', city: 'Mannheim', region: 'Baden-Württemberg', website: 'https://www.msconnexion.de', tags: ['club', 'rock', 'metal'], fit: 'Mehrere Floors, Nachwuchs-Slots im kleinen Saal.', km: 300, priority: 3 },
  { name: 'Crash', kind: 'venue', city: 'Freiburg', region: 'Baden-Württemberg', website: find('Crash Freiburg Konzert Booking'), tags: ['club', 'punk', 'alternative'], fit: 'Südwesten – nur mit einer kleinen Wochenend-Route sinnvoll.', km: 350, priority: 3 },

  /* Berlin ---------------------------------------------------------------- */
  { name: 'Cassiopeia', kind: 'venue', city: 'Berlin', region: 'Berlin', website: 'https://www.cassiopeia-berlin.de', tags: ['punk', 'hardcore', 'metal'], fit: 'Genau das richtige Programm für euch. Berlin nur mit Wochenend-Route (Freitag/Samstag).', km: 600, priority: 2 },
  { name: 'Bi Nuu', kind: 'venue', city: 'Berlin', region: 'Berlin', website: 'https://www.binuu.de', tags: ['alternative', 'indie', 'hardcore'], fit: 'Kreuzberger Club, offen für Post-Hardcore und Shoegaze.', km: 600, priority: 2 },
  { name: 'SO36', kind: 'venue', city: 'Berlin', region: 'Berlin', website: 'https://www.so36.de', tags: ['punk', 'alternative'], fit: 'Legendärer Punk-Club. Realistisch erst als Support oder über einen lokalen Promoter.', km: 600, priority: 2 },
  { name: 'Lido', kind: 'venue', city: 'Berlin', region: 'Berlin', website: 'https://www.lido-berlin.de', tags: ['indie', 'alternative'], fit: 'Indie/Alternative-Bühne in Kreuzberg.', km: 600, priority: 2 },
  { name: 'Astra Kulturhaus', kind: 'venue', city: 'Berlin', region: 'Berlin', website: 'https://www.astra-berlin.de', tags: ['alternative', 'rock'], fit: 'Große Bühne – nur als Support-Slot interessant.', km: 600, priority: 3 },

  /* Hamburg --------------------------------------------------------------- */
  { name: 'Hafenklang', kind: 'venue', city: 'Hamburg', region: 'Hamburg', website: 'https://www.hafenklang.de', tags: ['punk', 'hardcore'], fit: 'Hamburger Szene-Club, Goldstandard für Post-Hardcore-Abende.', km: 780, priority: 2 },
  { name: 'Logo', kind: 'venue', city: 'Hamburg', region: 'Hamburg', website: find('Logo Hamburg Konzerte Booking'), tags: ['indie', 'alternative'], fit: 'Kleiner Club mit Indie-/Alternative-Programm.', km: 780, priority: 2 },
  { name: 'Molotow', kind: 'venue', city: 'Hamburg', region: 'Hamburg', website: 'https://www.molotowclub.com', tags: ['punk', 'alternative', 'indie'], fit: 'Reeperbahn-Club mit Szene-Programm und Support-Slots.', km: 780, priority: 2 },
  { name: 'Headcrash', kind: 'venue', city: 'Hamburg', region: 'Hamburg', website: find('Headcrash Hamburg Booking'), tags: ['punk', 'hardcore', 'metal'], fit: 'Keller-Club, laut, direkt – passt.', km: 780, priority: 2 },

  /* NRW ------------------------------------------------------------------- */
  { name: 'MTC', kind: 'venue', city: 'Köln', region: 'Nordrhein-Westfalen', website: 'https://www.mtc-cologne.de', tags: ['alternative', 'hardcore', 'indie'], fit: 'Kölner Club mit offenem, jungen Programm.', km: 600, priority: 2 },
  { name: 'Gebäude 9', kind: 'venue', city: 'Köln', region: 'Nordrhein-Westfalen', website: 'https://www.gebaeude9.de', tags: ['alternative', 'indie'], fit: 'Kult-Club in Ehrenfeld.', km: 600, priority: 2 },
  { name: 'Blue Shell', kind: 'venue', city: 'Köln', region: 'Nordrhein-Westfalen', website: 'https://www.blue-shell.de', tags: ['punk', 'indie', 'alternative'], fit: 'Kleine Bühne, passend für 60–100 Leute.', km: 600, priority: 2 },
  { name: 'Zakk', kind: 'venue', city: 'Düsseldorf', region: 'Nordrhein-Westfalen', website: 'https://www.zakk.de', tags: ['alternative', 'punk', 'rock'], fit: 'Kulturzentrum mit Nachwuchsprogramm.', km: 620, priority: 2 },
  { name: 'FZW', kind: 'venue', city: 'Dortmund', region: 'Nordrhein-Westfalen', website: 'https://www.fzw.de', tags: ['alternative', 'indie', 'rock'], fit: 'Dortmunder Club mit Live-Programm und kleinen Sälen.', km: 600, priority: 2 },
  { name: 'Turock', kind: 'venue', city: 'Essen', region: 'Nordrhein-Westfalen', website: 'https://www.turock.de', tags: ['metal', 'hardcore', 'punk'], fit: 'Traditionsclub im Ruhrgebiet – Support-Slots für laute Bands.', km: 610, priority: 2 },
  { name: 'Matrix', kind: 'venue', city: 'Bochum', region: 'Nordrhein-Westfalen', website: find('Matrix Bochum Konzerte Booking'), tags: ['alternative', 'rock'], fit: 'Bochumer Club, gute Ergänzung zu einem Ruhrgebiets-Wochenende.', km: 590, priority: 3 },

  /* Leipzig, Dresden, Osten ----------------------------------------------- */
  { name: 'Conne Island', kind: 'venue', city: 'Leipzig', region: 'Sachsen', website: 'https://www.conne-island.de', tags: ['punk', 'hardcore', 'emo'], fit: 'Eine der wichtigsten DIY-Adressen für Hardcore und Emo in Deutschland.', km: 450, priority: 1 },
  { name: 'UT Connewitz', kind: 'venue', city: 'Leipzig', region: 'Sachsen', website: 'https://www.utconnewitz.de', tags: ['alternative', 'indie'], fit: 'Wunderschönes altes Kino, Programm zwischen Indie, Noise und Post-Rock.', km: 450, priority: 2 },
  { name: 'Beatpol', kind: 'venue', city: 'Dresden', region: 'Sachsen', website: 'https://www.beatpol.de', tags: ['rock', 'alternative'], fit: 'Dresdner Club mit Rock-/Alternative-Programm.', km: 470, priority: 2 },
  { name: 'Chemiefabrik', kind: 'venue', city: 'Dresden', region: 'Sachsen', website: find('Chemiefabrik Dresden Booking'), tags: ['punk', 'hardcore'], fit: 'DIY-Kulturzentrum, linke Szene, ehrliches Publikum.', km: 470, priority: 2 },
  { name: 'Museumskeller', kind: 'venue', city: 'Erfurt', region: 'Thüringen', website: find('Museumskeller Erfurt Konzert Booking'), tags: ['alternative', 'punk'], fit: 'Erfurter Livemusik-Keller, 400 km.', km: 400, priority: 3 },

  /* Nord ------------------------------------------------------------------ */
  { name: 'Chez Heinz', kind: 'venue', city: 'Hannover', region: 'Niedersachsen', website: find('Chez Heinz Hannover Booking'), tags: ['punk', 'hardcore', 'alternative'], fit: 'Hannoveraner Szene-Club, seit Jahren Anlaufstelle für laute Gitarren.', km: 640, priority: 2 },
  { name: 'Tower', kind: 'venue', city: 'Bremen', region: 'Bremen', website: find('Tower Bremen Konzerte Booking'), tags: ['punk', 'alternative'], fit: 'Bremer Club mit Punk-/Alternative-Programm.', km: 750, priority: 3 },
  { name: 'Lagerhalle', kind: 'venue', city: 'Osnabrück', region: 'Niedersachsen', website: 'https://www.lagerhalle-osnabrueck.de', tags: ['alternative', 'rock'], fit: 'Kulturzentrum mit kleiner Bühne.', km: 650, priority: 3 },
  { name: 'Gleis 22', kind: 'venue', city: 'Münster', region: 'Nordrhein-Westfalen', website: 'https://www.gleis22.de', tags: ['indie', 'alternative'], fit: 'Münsteraner Club – passt gut mit dem Vainstream-Kontext.', km: 600, priority: 3 },

  /* West/Südwest ---------------------------------------------------------- */
  { name: 'Das Bett', kind: 'venue', city: 'Frankfurt', region: 'Hessen', website: 'https://www.das-bett.de', tags: ['indie', 'alternative'], fit: 'Frankfurter Club für Indie und Alternative.', km: 400, priority: 3 },
  { name: 'Nachtleben', kind: 'venue', city: 'Frankfurt', region: 'Hessen', website: 'https://www.nachtleben-frankfurt.de', tags: ['alternative', 'rock'], fit: 'Zentral gelegener Club mit gemischtem Programm.', km: 400, priority: 3 },
  { name: 'Musikbunker', kind: 'venue', city: 'Aachen', region: 'Nordrhein-Westfalen', website: 'https://www.musikbunker.de', tags: ['alternative', 'punk'], fit: 'Aachener Szene-Adresse.', km: 590, priority: 3 },
  { name: 'Garage', kind: 'venue', city: 'Saarbrücken', region: 'Saarland', website: find('Garage Saarbrücken Booking Kontakt'), tags: ['rock', 'alternative'], fit: 'Saarbrücker Club, weite Anreise.', km: 420, priority: 3 },
  { name: 'Harmonie', kind: 'venue', city: 'Bonn', region: 'Nordrhein-Westfalen', website: 'https://www.harmonie-bonn.de', tags: ['alternative', 'indie'], fit: 'Bonn, gut mit Köln kombinierbar.', km: 580, priority: 3 },

  /* promoters & agencies -------------------------------------------------- */
  { name: 'Backstage Concerts', kind: 'promoter', city: 'München', region: 'Bayern', website: 'https://www.backstage.eu', tags: ['promoter', 'münchen'], fit: 'Bucht Club-Shows in München und Umgebung. Für Support-Slots der direkteste Kontakt – eine Mail, nicht drei.', km: 70, priority: 1 },
  { name: 'Kingstar Music', kind: 'promoter', city: 'Münster', region: 'Nordrhein-Westfalen', website: 'https://www.kingstar-music.com', tags: ['promoter', 'festival'], fit: 'Veranstalter hinter Vainstream – hier laufen Festival- und Konzertbuchungen zusammen.', km: 600, priority: 2 },
  { name: 'KNRD Booking', kind: 'promoter', city: 'Nürnberg', region: 'Bayern', website: 'https://www.knrd.de', tags: ['promoter', 'hardcore'], fit: 'Bucht Shows im fränkischen Raum und kennt die Szene, in die ihr passt.', km: 150, priority: 1 },
  { name: 'Four Artists', kind: 'agency', city: 'Berlin', region: 'Berlin', website: 'https://www.fourartists.com', tags: ['agency'], fit: 'Große Booking-Agentur. Erst bewerben, wenn eine eigene Tour-Erfahrung da ist.', km: 600, priority: 3 },

  /* labels ---------------------------------------------------------------- */
  { name: 'Big Scary Monsters', kind: 'label', city: 'Oxford', region: '', website: 'https://www.bsmrocks.com', tags: ['emo', 'post-hardcore', 'indie'], fit: 'UK-Label mit genau diesem Klangbild. Pitch auf Englisch, kurz, mit klarem Plan.', priority: 2 },
  { name: 'Rude Records', kind: 'label', city: 'München', region: 'Bayern', website: 'https://www.ruderecords.com', tags: ['punk', 'emo', 'alternative'], fit: 'Europäisches Label mit Punk-/Emo-Katalog und deutschem Büro – kurze Wege.', priority: 1 },
  { name: 'SharpTone Records', kind: 'label', city: 'Los Angeles', region: '', website: 'https://www.sharptonerecords.com', tags: ['metalcore', 'post-hardcore'], fit: 'International, große Acts – realistisch erst mit Release-Historie.', priority: 3 },
  { name: 'Pure Noise Records', kind: 'label', city: 'Nashville', region: '', website: 'https://www.purenoise.net', tags: ['pop-punk', 'emo', 'hardcore'], fit: 'Demo-Einsendung über das Formular; ohne Zahlen wenig Chance, aber der Weg ist offen.', priority: 3 },
  { name: 'Church Road Records', kind: 'label', city: 'Brighton', region: '', website: 'https://www.churchroadrecords.com', tags: ['post-hardcore', 'shoegaze', 'post-metal'], fit: 'Passt atmosphärisch sehr gut zu dunklem, lauten Gitarrensound.', priority: 2 },
  { name: 'Kapitän Platte', kind: 'label', city: 'Siegen', region: 'Nordrhein-Westfalen', website: find('Kapitän Platte Label Siegen Demo'), tags: ['indie', 'emo', 'punk'], fit: 'Deutsches Indie-/Punk-Label mit Gespür für kleine, ehrliche Releases.', priority: 2 },
  { name: 'This Charming Man Records', kind: 'label', city: 'Münster', region: 'Nordrhein-Westfalen', website: find('This Charming Man Records Münster Demo'), tags: ['indie', 'punk', 'emo'], fit: 'Münsteraner Label zwischen Indie und Punk.', priority: 2 },
  { name: 'Kidnap Music', kind: 'label', city: 'Berlin', region: 'Berlin', website: find('Kidnap Music Berlin Label Demo'), tags: ['indie', 'alternative'], fit: 'Berliner Label für alternative Gitarrenmusik.', priority: 3 },

  /* radio & press --------------------------------------------------------- */
  { name: 'PULS (Bayerischer Rundfunk)', kind: 'radio', city: 'München', region: 'Bayern', website: 'https://www.br.de/puls', tags: ['radio', 'nachwuchs'], fit: 'Junge BR-Redaktion für neue Musik aus Bayern. Lokaler Aufhänger hilft enorm.', priority: 1 },
  { name: 'ByteFM', kind: 'radio', city: 'Hamburg', region: 'Hamburg', website: 'https://www.bytefm.de', tags: ['radio', 'indie'], fit: 'Freies Musikradio, offen für laute Gitarrenmusik abseits des Mainstreams.', priority: 3 },
  { name: 'radioeins', kind: 'radio', city: 'Potsdam', region: 'Brandenburg', website: 'https://www.radioeins.de', tags: ['radio', 'alternative'], fit: 'Berliner Radio mit Alternative-Programm; Sendungen mit Nachwuchsstrecke im Blick behalten.', priority: 3 },
  { name: 'VISIONS', kind: 'press', city: 'Hamburg', region: 'Hamburg', website: 'https://www.visions.de', tags: ['magazin', 'alternative'], fit: 'Das Magazin für genau diese Musik. Anlass liefern, nicht nur einen Link.', priority: 1 },
  { name: 'OX-Fanzine', kind: 'press', city: 'Duisburg', region: 'Nordrhein-Westfalen', website: 'https://www.ox-fanzine.de', tags: ['punk', 'hardcore', 'zine'], fit: 'Punk-/Hardcore-Zine mit Szene-Zugang; Reviews und Demos werden wirklich gehört.', priority: 1 },
  { name: 'morecore.de', kind: 'press', city: 'Köln', region: 'Nordrhein-Westfalen', website: 'https://www.morecore.de', tags: ['metalcore', 'hardcore', 'news'], fit: 'News-/Review-Portal für Core-Musik. Premieres und Video-Premieren sind der schnellste Weg rein.', priority: 1 },
  { name: 'metal.de', kind: 'press', city: 'Lingen', region: 'Niedersachsen', website: 'https://www.metal.de', tags: ['metal', 'reviews'], fit: 'Großes Portal mit Hardcore-Rand. Review-Anfrage mit fertigem Pressepaket.', priority: 2 },
  { name: 'Diffus', kind: 'press', city: 'Berlin', region: 'Berlin', website: 'https://www.diffusmagazin.de', tags: ['magazin', 'indie'], fit: 'Berliner Musikmagazin, offen für neue Namen.', priority: 2 },
  { name: 'laut.de', kind: 'press', city: 'München', region: 'Bayern', website: 'https://www.laut.de', tags: ['portal', 'reviews'], fit: 'Reichweitenstark; Fokus auf Release-Reviews mit Pressepaket.', priority: 3 },

  /* ------------------------------------------------------------------ *
   * Nachwuchs & kleine Orte (2026-11)                                   *
   * Der Einstieg: Kulturzentren, Jugendzentren, Szene-Clubs und kleine  *
   * Festivals, die Newcomer wirklich buchen – nah zuerst, dann weiter.  *
   * ------------------------------------------------------------------ */

  /* Schwaben & Oberbayern – hier fängt es an --------------------------- */
  { name: 'Kulturhaus Abraxas', kind: 'youth', city: 'Augsburg', region: 'Bayern', website: 'https://www.kulturhaus-abraxas.de', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Städtisches Kulturhaus mit Konzertprogramm und Jugendarbeit – die naheliegendste Tür in der eigenen Stadt.', km: 0, priority: 1 },
  { name: 'Ballonfabrik', kind: 'youth', city: 'Augsburg', region: 'Bayern', website: 'https://www.ballonfabrik.de', tags: ['kulturzentrum', 'atelier'], fit: 'Offenes Kultur- und Atelierhaus, nicht nur Konzerte – gute Kooperation für einen eigenen Abend.', km: 0, priority: 2 },
  { name: 'Grandhotel Cosmopolis', kind: 'youth', city: 'Augsburg', region: 'Bayern', website: 'https://www.grandhotel-cosmopolis.org', tags: ['kulturzentrum', 'hof'], fit: 'Augsburger Kulturort mit Innenhof und Bühne – kleine Formate, offenes Publikum.', km: 0, priority: 2 },
  { name: 'Kafe Marat', kind: 'youth', city: 'München', region: 'Bayern', website: find('Kafe Marat München Konzerte Booking'), tags: ['diY', 'punk', 'linke szene'], fit: 'Münchner DIY-Adresse für Punk und Hardcore – hier zählt Musik, nicht Reichweite.', km: 70, priority: 1 },
  { name: 'Kafe Kult', kind: 'youth', city: 'München', region: 'Bayern', website: find('Kafe Kult München Booking Konzert'), tags: ['diY', 'punk', 'alternative'], fit: 'Kleiner selbstverwalteter Laden, Abende mit drei Bands sind normal.', km: 70, priority: 1 },
  { name: 'Import Export', kind: 'venue', city: 'München', region: 'Bayern', website: find('Import Export München Konzerte Booking'), tags: ['club', 'indie', 'alternative'], fit: 'Münchner Club mit offenem Programm – Support für kleinere Tourneen.', km: 70, priority: 2 },
  { name: 'Sunny Red', kind: 'venue', city: 'München', region: 'Bayern', website: find('Sunny Red München Booking'), tags: ['club', 'punk', 'alternative'], fit: 'Kellerclub in München, genau passend für die erste München-Show.', km: 70, priority: 2 },
  { name: 'Neue Welt', kind: 'youth', city: 'Ingolstadt', region: 'Bayern', website: find('Neue Welt Ingolstadt Kulturzentrum Booking'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Kulturzentrum in Ingolstadt, 100 km – offen für junge Bands aus der Region.', km: 100, priority: 2 },
  { name: 'Kulturfabrik Kempten', kind: 'youth', city: 'Kempten', region: 'Bayern', website: find('Kulturfabrik Kempten Booking'), tags: ['kulturzentrum', 'jugend'], fit: 'Allgäuer Kulturfabrik mit Nachwuchsabenden; 130 km.', km: 130, priority: 2 },
  { name: 'Kaminwerk', kind: 'venue', city: 'Memmingen', region: 'Bayern', website: 'https://www.kaminwerk.de', tags: ['club', 'rock', 'metal'], fit: 'Memminger Club mit Rock-/Metal-Programm und Support-Slots – 100 km.', km: 100, priority: 2 },
  { name: 'Club Vaudeville', kind: 'venue', city: 'Lindau', region: 'Bayern', website: 'https://www.club-vaudeville.de', tags: ['club', 'alternative'], fit: 'Bodensee-Club, 160 km – lohnt als Wochenendziel mit einem zweiten Gig.', km: 160, priority: 3 },
  { name: 'KUKO Rosenheim', kind: 'youth', city: 'Rosenheim', region: 'Bayern', website: find('KUKO Rosenheim Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Rosenheimer Kulturzentrum mit Jugendarbeit und kleinen Konzerten.', km: 170, priority: 2 },
  { name: 'Leerer Beutel', kind: 'youth', city: 'Regensburg', region: 'Bayern', website: find('Leerer Beutel Regensburg Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Regensburger Kulturzentrum, 170 km, breites Programm mit Nachwuchsschiene.', km: 170, priority: 2 },
  { name: 'Immerhin', kind: 'youth', city: 'Würzburg', region: 'Bayern', website: find('Immerhin Würzburg Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Würzburger Kulturzentrum mit offenem Programm – 230 km, gut mit B-Hof kombinierbar.', km: 230, priority: 2 },
  { name: 'Cairo', kind: 'venue', city: 'Würzburg', region: 'Bayern', website: find('Cairo Würzburg Club Booking'), tags: ['club', 'indie', 'alternative'], fit: 'Kleiner Würzburger Club, oft Vorband-Slots für regionale Acts.', km: 230, priority: 2 },
  { name: 'E-Werk Erlangen', kind: 'youth', city: 'Erlangen', region: 'Bayern', website: 'https://www.e-werk.de', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Erlanger Kulturzentrum mit Konzertprogramm und Nachwuchsförderung.', km: 170, priority: 2 },
  { name: 'Kofferfabrik', kind: 'youth', city: 'Fürth', region: 'Bayern', website: find('Kofferfabrik Fürth Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Fürther Kulturfabrik, 150 km, kleine Bühne mit Szene-Publikum.', km: 150, priority: 2 },
  { name: 'Live-Club Bamberg', kind: 'venue', city: 'Bamberg', region: 'Bayern', website: find('Live Club Bamberg Booking'), tags: ['club', 'rock', 'punk'], fit: 'Bamberger Live-Club, 200 km – Support-Slots für Punk und Alternative.', km: 200, priority: 2 },
  { name: 'Alter Stattbahnhof', kind: 'venue', city: 'Schweinfurt', region: 'Bayern', website: find('Alter Stattbahnhof Schweinfurt Booking'), tags: ['club', 'rock', 'alternative'], fit: 'Schweinfurter Kultur- und Konzertbahnhof, 220 km.', km: 220, priority: 3 },
  { name: 'Colos-Saal', kind: 'venue', city: 'Aschaffenburg', region: 'Bayern', website: 'https://www.colos-saal.de', tags: ['club', 'rock', 'blues'], fit: 'Etablierter Club in Aschaffenburg – Support-Slots sind begehrt, aber vorhanden.', km: 300, priority: 3 },
  { name: 'Bardentreffen Nürnberg', kind: 'festival', city: 'Nürnberg', region: 'Bayern', website: 'https://www.bardentreffen.de', tags: ['straße', 'free', 'open air'], fit: 'Kostenloses Straßenmusikfestival mit offener Bewerbung – ein Wochenende, echte Leute, keine Gage.', deadline: 'Bewerbung Frühjahr', km: 150, priority: 2 },
  { name: 'Ulmer Zelt', kind: 'festival', city: 'Ulm', region: 'Baden-Württemberg', website: find('Ulmer Zelt Festival Bewerbung Bands'), tags: ['kulturfestival', 'sommer'], fit: 'Sommer-Kulturzelt in Ulm, 90 km; das Programm nimmt regionale Bands auf.', deadline: 'Bewerbung Winter/Frühjahr', km: 90, priority: 2 },
  { name: 'Augsburger Sommernächte', kind: 'festival', city: 'Augsburg', region: 'Bayern', website: find('Augsburger Sommernächte Bands Bewerbung'), tags: ['stadtfestival', 'free'], fit: 'Stadtfestival in der eigenen Stadt – Bewerbung über die Kulturverwaltung, gute erste Bühne.', deadline: 'Bewerbung Frühjahr', km: 0, priority: 1 },

  /* Baden-Württemberg --------------------------------------------------- */
  { name: 'Kulturzentrum Merlin', kind: 'youth', city: 'Stuttgart', region: 'Baden-Württemberg', website: find('Kulturzentrum Merlin Stuttgart Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Stuttgarter Kulturzentrum mit Nachwuchsabenden und kleinem Saal.', km: 160, priority: 2 },
  { name: 'Wagenhallen', kind: 'youth', city: 'Stuttgart', region: 'Baden-Württemberg', website: 'https://www.wagenhallen.de', tags: ['kulturzentrum', 'atelier', 'alternative'], fit: 'Großes Kulturareal, offen für eigene Formate und Kooperationen.', km: 160, priority: 3 },
  { name: 'Schocken', kind: 'venue', city: 'Stuttgart', region: 'Baden-Württemberg', website: find('Schocken Stuttgart Konzerte Booking'), tags: ['club', 'alternative'], fit: 'Stuttgarter Club mit gemischtem Programm, 160 km.', km: 160, priority: 2 },
  { name: 'Sudhaus', kind: 'youth', city: 'Tübingen', region: 'Baden-Württemberg', website: find('Sudhaus Tübingen Konzerte Booking'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Tübinger Kulturzentrum, 200 km, bekannt für Nachwuchskonzerte.', km: 200, priority: 2 },
  { name: 'Epplehaus', kind: 'youth', city: 'Tübingen', region: 'Baden-Württemberg', website: 'https://www.epplehaus.de', tags: ['diY', 'punk', 'linke szene'], fit: 'Selbstverwaltetes Haus mit Konzerten – Punk, Hardcore, Emo willkommen.', km: 200, priority: 1 },
  { name: 'Kulturzentrum Dieselstraße', kind: 'youth', city: 'Esslingen', region: 'Baden-Württemberg', website: find('Kulturzentrum Dieselstraße Esslingen Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Esslinger Kulturzentrum, 150 km, kleine Bühne mit Stammpublikum.', km: 150, priority: 2 },
  { name: 'KOHI Kulturraum', kind: 'youth', city: 'Karlsruhe', region: 'Baden-Württemberg', website: find('KOHI Karlsruhe Kulturraum Konzerte'), tags: ['kulturraum', 'nachwuchs'], fit: 'Karlsruher Kulturraum für kleine Konzerte und Lesungen – offen für neue Namen.', km: 250, priority: 3 },
  { name: 'Jubez', kind: 'youth', city: 'Karlsruhe', region: 'Baden-Württemberg', website: 'https://www.jubez.de', tags: ['jugendzentrum', 'nachwuchs'], fit: 'Jugend- und Kulturzentrum Karlsruhe mit Bandförderung.', km: 250, priority: 3 },
  { name: 'Kulturzentrum KFZ', kind: 'youth', city: 'Marburg', region: 'Hessen', website: 'https://www.kfz-marburg.de', tags: ['kulturzentrum', 'punk'], fit: 'Marburger KFZ – linkes Kulturzentrum mit regelmäßigen Konzerten.', km: 480, priority: 3 },
  { name: 'KTS Freiburg', kind: 'youth', city: 'Freiburg', region: 'Baden-Württemberg', website: find('KTS Freiburg Konzerte Booking'), tags: ['diY', 'punk', 'kulturzentrum'], fit: 'Freiburger KTS, Szene-Adresse für laute Musik.', km: 350, priority: 3 },
  { name: 'Slow Club', kind: 'venue', city: 'Freiburg', region: 'Baden-Württemberg', website: find('Slow Club Freiburg Booking'), tags: ['club', 'alternative'], fit: 'Kleiner Freiburger Club, 350 km.', km: 350, priority: 3 },

  /* Nürnberg / Franken --------------------------------------------------- */
  { name: 'Desi Nürnberg', kind: 'youth', city: 'Nürnberg', region: 'Bayern', website: find('Desi Nürnberg Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Nürnberger Kulturzentrum mit Nachwuchsprogramm, 150 km.', km: 150, priority: 2 },
  { name: 'K4 Nürnberg', kind: 'youth', city: 'Nürnberg', region: 'Bayern', website: find('K4 Nürnberg Jugendzentrum Konzerte'), tags: ['jugendzentrum', 'nachwuchs'], fit: 'Jugendzentrum mit Proberaum-Szene – hier entstehen die ersten Nürnberg-Shows.', km: 150, priority: 2 },

  /* Berlin & Brandenburg ------------------------------------------------- */
  { name: 'Schokoladen', kind: 'youth', city: 'Berlin', region: 'Berlin', website: find('Schokoladen Berlin Konzerte Booking'), tags: ['diY', 'indie', 'punk'], fit: 'Berliner Institution für kleine Konzerte – ein Abend, drei Bands, ehrliches Publikum.', km: 600, priority: 2 },
  { name: 'Zukunft am Ostkreuz', kind: 'youth', city: 'Berlin', region: 'Berlin', website: 'https://www.zukunft-am-ostkreuz.de', tags: ['kulturzentrum', 'alternative'], fit: 'Kulturort mit Biergarten und Bühne; offen für Newcomer-Abende.', km: 600, priority: 3 },
  { name: 'Urban Spree', kind: 'venue', city: 'Berlin', region: 'Berlin', website: 'https://www.urbanspree.com', tags: ['alternative', 'artspace'], fit: 'Galerie/Club-Mix in Friedrichshain, kleinere Shows möglich.', km: 600, priority: 3 },
  { name: 'Badehaus', kind: 'venue', city: 'Berlin', region: 'Berlin', website: find('Badehaus Berlin Booking Konzerte'), tags: ['club', 'indie'], fit: 'Kreuzberger Bühne mit Indie-/Alternative-Programm.', km: 600, priority: 3 },
  { name: 'Wild at Heart', kind: 'venue', city: 'Berlin', region: 'Berlin', website: find('Wild at Heart Berlin Booking'), tags: ['club', 'punk', 'rock'], fit: 'Kreuzberger Rock-/Punk-Bühne – Support-Slots sind realistisch.', km: 600, priority: 3 },
  { name: 'K17', kind: 'venue', city: 'Berlin', region: 'Berlin', website: find('K17 Berlin Booking Konzerte'), tags: ['club', 'metal', 'hardcore'], fit: 'Friedrichshainer Club für harte Musik – passt, wenn ihr Berlin plant.', km: 600, priority: 3 },
  { name: 'Waschhaus Potsdam', kind: 'youth', city: 'Potsdam', region: 'Brandenburg', website: 'https://www.waschhaus.de', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Potsdamer Kulturzentrum mit Konzerten und Festivals.', km: 620, priority: 3 },
  { name: 'Weltspiegel Cottbus', kind: 'youth', city: 'Cottbus', region: 'Brandenburg', website: find('Weltspiegel Cottbus Konzerte'), tags: ['kulturzentrum', 'kino'], fit: 'Cottbuser Kulturort mit kleiner Bühne.', km: 700, priority: 3 },

  /* Leipzig, Dresden, Osten --------------------------------------------- */
  { name: 'Werk 2', kind: 'youth', city: 'Leipzig', region: 'Sachsen', website: 'https://www.werk-2.net', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Leipziger Kulturfabrik mit Nachwuchsförderung und mehreren Bühnen.', km: 450, priority: 2 },
  { name: 'Westwerk', kind: 'youth', city: 'Leipzig', region: 'Sachsen', website: find('Westwerk Leipzig Konzerte Booking'), tags: ['kulturzentrum', 'alternative'], fit: 'Leipziger Kulturort in Plagwitz, offen für junge Formate.', km: 450, priority: 3 },
  { name: 'Moritzbastei', kind: 'venue', city: 'Leipzig', region: 'Sachsen', website: 'https://www.moritzbastei.de', tags: ['club', 'studentisch'], fit: 'Leipziger Kellerclub mit vielen kleinen Konzerten.', km: 450, priority: 3 },
  { name: 'Scheune', kind: 'youth', city: 'Dresden', region: 'Sachsen', website: find('Scheune Dresden Konzerte Booking'), tags: ['kulturzentrum', 'alternative'], fit: 'Dresdner Kulturzentrum in der Neustadt, Szene-Publikum.', km: 470, priority: 3 },
  { name: 'Rosis', kind: 'venue', city: 'Dresden', region: 'Sachsen', website: find('Rosis Dresden Booking Konzerte'), tags: ['club', 'punk', 'alternative'], fit: 'Kleine Dresdner Bühne mit Punk- und Indie-Abenden.', km: 470, priority: 3 },
  { name: 'Bunte Republik Neustadt', kind: 'festival', city: 'Dresden', region: 'Sachsen', website: find('Bunte Republik Neustadt Bands Bewerbung'), tags: ['stadtteilfest', 'free'], fit: 'Dresdner Stadtteilfestival mit offenen Bühnen – Bewerbung über die Organisatoren.', deadline: 'Bewerbung Frühjahr', km: 470, priority: 3 },
  { name: 'Objekt 5', kind: 'youth', city: 'Halle (Saale)', region: 'Sachsen-Anhalt', website: find('Objekt 5 Halle Konzerte Booking'), tags: ['kulturzentrum', 'alternative'], fit: 'Hallescher Kulturort mit kleinen Konzerten.', km: 430, priority: 3 },
  { name: 'Moritzhof', kind: 'youth', city: 'Magdeburg', region: 'Sachsen-Anhalt', website: 'https://www.moritzhof-magdeburg.de', tags: ['kulturzentrum', 'jugend'], fit: 'Magdeburger Kulturzentrum mit Nachwuchsprogramm.', km: 520, priority: 3 },
  { name: 'Rosenkeller', kind: 'venue', city: 'Jena', region: 'Thüringen', website: find('Rosenkeller Jena Konzerte Booking'), tags: ['club', 'studentisch'], fit: 'Jenaer Studentenclub mit kleinen Konzerten.', km: 430, priority: 3 },
  { name: 'Kassablanca', kind: 'youth', city: 'Jena', region: 'Thüringen', website: find('Kassablanca Jena Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Jenaer Kulturzentrum, offen für laute Gitarren.', km: 430, priority: 3 },
  { name: 'Franz Mehlhose', kind: 'youth', city: 'Erfurt', region: 'Thüringen', website: find('Franz Mehlhose Erfurt Konzerte'), tags: ['kulturzentrum', 'diY'], fit: 'Erfurter Kulturhaus mit DIY-Konzerten.', km: 400, priority: 3 },
  { name: 'Engelsburg Erfurt', kind: 'youth', city: 'Erfurt', region: 'Thüringen', website: find('Engelsburg Erfurt Konzerte Booking'), tags: ['jugendzentrum', 'nachwuchs'], fit: 'Jugend- und Kulturzentrum in Erfurt, 400 km.', km: 400, priority: 3 },

  /* Norddeutschland ----------------------------------------------------- */
  { name: 'Rote Flora', kind: 'youth', city: 'Hamburg', region: 'Hamburg', website: find('Rote Flora Hamburg Konzerte'), tags: ['diY', 'punk', 'linke szene'], fit: 'Hamburger Szene-Adresse für Punk und Hardcore – nur mit Haltung.', km: 780, priority: 3 },
  { name: 'Fundbureau', kind: 'venue', city: 'Hamburg', region: 'Hamburg', website: find('Fundbureau Hamburg Booking'), tags: ['club', 'alternative'], fit: 'Hamburger Club mit Indie- und Alternative-Abenden.', km: 780, priority: 3 },
  { name: 'Prinzenbar', kind: 'venue', city: 'Hamburg', region: 'Hamburg', website: find('Prinzenbar Hamburg Booking Konzerte'), tags: ['club', 'indie', 'pop'], fit: 'Kleine Bühne im St. Pauli-Kontext, Support-Slots vorhanden.', km: 780, priority: 3 },
  { name: 'Kukoon', kind: 'youth', city: 'Bremen', region: 'Bremen', website: find('Kukoon Bremen Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Bremer Kulturzentrum mit Konzerten und Nachwuchsabenden.', km: 750, priority: 3 },
  { name: 'Treibsand', kind: 'youth', city: 'Lübeck', region: 'Schleswig-Holstein', website: find('Treibsand Lübeck Konzerte Booking'), tags: ['jugendzentrum', 'punk'], fit: 'Lübecker Jugend- und Kulturzentrum mit lauten Abenden.', km: 850, priority: 3 },
  { name: 'Räucherei', kind: 'youth', city: 'Kiel', region: 'Schleswig-Holstein', website: find('Räucherei Kiel Konzerte'), tags: ['kulturzentrum'], fit: 'Kieler Kulturzentrum mit kleinen Konzerten.', km: 900, priority: 3 },
  { name: 'M.A.U. Club', kind: 'venue', city: 'Rostock', region: 'Mecklenburg-Vorpommern', website: find('M.A.U. Club Rostock Booking'), tags: ['club', 'alternative'], fit: 'Rostocker Club mit alternativem Programm.', km: 850, priority: 3 },
  { name: 'Peter-Weiss-Haus', kind: 'youth', city: 'Rostock', region: 'Mecklenburg-Vorpommern', website: 'https://www.peter-weiss-haus.de', tags: ['kulturzentrum', 'links'], fit: 'Rostocker Kulturzentrum mit politischem und musikalischem Programm.', km: 850, priority: 3 },
  { name: 'Kulturetage', kind: 'youth', city: 'Oldenburg', region: 'Niedersachsen', website: 'https://www.kulturetage.de', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Oldenburger Kulturetage mit Bandförderung.', km: 800, priority: 3 },
  { name: 'Pavillon Hannover', kind: 'youth', city: 'Hannover', region: 'Niedersachsen', website: find('Pavillon Hannover Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Hannoversches Kulturzentrum mit Jugendprogramm.', km: 640, priority: 3 },
  { name: 'Lux Hannover', kind: 'venue', city: 'Hannover', region: 'Niedersachsen', website: find('Lux Hannover Booking Konzerte'), tags: ['club', 'indie', 'alternative'], fit: 'Hannoveraner Club, 640 km.', km: 640, priority: 3 },
  { name: 'Musa Göttingen', kind: 'youth', city: 'Göttingen', region: 'Niedersachsen', website: find('Musa Göttingen Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Göttinger Kulturzentrum mit Konzertprogramm.', km: 480, priority: 3 },
  { name: 'Exil Göttingen', kind: 'venue', city: 'Göttingen', region: 'Niedersachsen', website: find('Exil Göttingen Booking Konzerte'), tags: ['club', 'alternative'], fit: 'Göttinger Club mit Szene-Programm.', km: 480, priority: 3 },

  /* NRW ------------------------------------------------------------------ */
  { name: 'Grend', kind: 'youth', city: 'Essen', region: 'Nordrhein-Westfalen', website: 'https://www.grend.de', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Essener Kulturzentrum mit Nachwuchsförderung und Bandwettbewerben.', km: 610, priority: 2 },
  { name: 'Kulturzentrum Lothringen', kind: 'youth', city: 'Bochum', region: 'Nordrhein-Westfalen', website: find('Kulturzentrum Lothringen Bochum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Bochumer Kulturzentrum, kleine Bühne, offenes Programm.', km: 590, priority: 3 },
  { name: 'Dietrich-Keuning-Haus', kind: 'youth', city: 'Dortmund', region: 'Nordrhein-Westfalen', website: find('Dietrich-Keuning-Haus Dortmund Konzerte'), tags: ['kulturzentrum', 'jugend'], fit: 'Dortmunder Kulturzentrum mit Bandproberäumen und Konzerten.', km: 600, priority: 3 },
  { name: 'Alte Feuerwache Köln', kind: 'youth', city: 'Köln', region: 'Nordrhein-Westfalen', website: 'https://www.altefeuerwache.com', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Kölner Kulturzentrum, 600 km, mit Nachwuchsreihen.', km: 600, priority: 3 },
  { name: 'Odonien', kind: 'venue', city: 'Köln', region: 'Nordrhein-Westfalen', website: 'https://www.odonien.de', tags: ['alternative', 'kulturort'], fit: 'Kölner Kulturort mit Bühne im Hof – ungewöhnliche Formate möglich.', km: 600, priority: 3 },
  { name: 'Limes', kind: 'venue', city: 'Köln', region: 'Nordrhein-Westfalen', website: find('Limes Köln Booking Konzerte'), tags: ['club', 'indie'], fit: 'Kleiner Kölner Club für Indie und Alternative.', km: 600, priority: 3 },
  { name: 'Börse Wuppertal', kind: 'youth', city: 'Wuppertal', region: 'Nordrhein-Westfalen', website: find('Börse Wuppertal Konzerte Booking'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Wuppertaler Kulturzentrum mit Konzerten und Bandabenden.', km: 630, priority: 3 },
  { name: 'LOCH Wuppertal', kind: 'youth', city: 'Wuppertal', region: 'Nordrhein-Westfalen', website: find('LOCH Wuppertal Konzerte'), tags: ['diY', 'punk', 'linke szene'], fit: 'Wuppertaler DIY-Ort, kleine laute Abende.', km: 630, priority: 3 },
  { name: 'Utopiastadt', kind: 'youth', city: 'Wuppertal', region: 'Nordrhein-Westfalen', website: 'https://www.utopiastadt.eu', tags: ['kulturort', 'nachwuchs'], fit: 'Wuppertaler Kulturareal mit offenen Formaten.', km: 630, priority: 3 },
  { name: 'Kulturfabrik Krefeld', kind: 'youth', city: 'Krefeld', region: 'Nordrhein-Westfalen', website: 'https://www.kulturfabrik-krefeld.de', tags: ['kulturzentrum', 'nachwuchs'], fit: 'Krefelder Kulturfabrik, 650 km.', km: 650, priority: 3 },
  { name: 'Südbahnhof Krefeld', kind: 'youth', city: 'Krefeld', region: 'Nordrhein-Westfalen', website: find('Südbahnhof Krefeld Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Krefelder Kulturort mit kleiner Bühne.', km: 650, priority: 3 },
  { name: 'Kulturwerkstatt Paderborn', kind: 'youth', city: 'Paderborn', region: 'Nordrhein-Westfalen', website: find('Kulturwerkstatt Paderborn Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Paderborner Kulturwerkstatt mit Nachwuchsabenden.', km: 540, priority: 3 },
  { name: 'BÜZ Minden', kind: 'youth', city: 'Minden', region: 'Nordrhein-Westfalen', website: find('BÜZ Minden Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'jugend'], fit: 'Mindener Bürgerzentrum mit Konzertreihe.', km: 620, priority: 3 },
  { name: 'AZ Aachen', kind: 'youth', city: 'Aachen', region: 'Nordrhein-Westfalen', website: find('AZ Aachen Konzerte Booking'), tags: ['diY', 'punk', 'linke szene'], fit: 'Aachener Autonomes Zentrum mit Konzerten.', km: 590, priority: 3 },
  { name: 'Brotfabrik Bonn', kind: 'youth', city: 'Bonn', region: 'Nordrhein-Westfalen', website: find('Brotfabrik Bonn Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Bonner Kulturzentrum mit kleiner Bühne.', km: 580, priority: 3 },
  { name: 'Vortex Siegen', kind: 'youth', city: 'Siegen', region: 'Nordrhein-Westfalen', website: find('Vortex Siegen Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Siegener Kulturzentrum, 500 km.', km: 500, priority: 3 },

  /* Hessen & Rheinland-Pfalz --------------------------------------------- */
  { name: 'Exzess Frankfurt', kind: 'youth', city: 'Frankfurt', region: 'Hessen', website: find('Exzess Frankfurt Konzerte'), tags: ['diY', 'punk', 'alternative'], fit: 'Frankfurter DIY-Adresse für laute Abende.', km: 400, priority: 3 },
  { name: 'Hafen 2', kind: 'youth', city: 'Offenbach', region: 'Hessen', website: 'https://www.hafen2.de', tags: ['kulturzentrum', 'alternative'], fit: 'Offenbacher Kulturzentrum am Hafen, offenes Programm.', km: 410, priority: 3 },
  { name: 'Centralstation Darmstadt', kind: 'venue', city: 'Darmstadt', region: 'Hessen', website: 'https://www.centralstation-darmstadt.de', tags: ['club', 'rock', 'alternative'], fit: 'Darmstädter Club mit Nachwuchskonzerten im kleinen Saal.', km: 420, priority: 3 },
  { name: 'Oettinger Villa', kind: 'youth', city: 'Darmstadt', region: 'Hessen', website: find('Oettinger Villa Darmstadt Konzerte'), tags: ['jugendzentrum', 'nachwuchs'], fit: 'Darmstädter Jugendkulturhaus mit Bandabenden.', km: 420, priority: 3 },
  { name: 'Schlachthof Wiesbaden', kind: 'youth', city: 'Wiesbaden', region: 'Hessen', website: find('Schlachthof Wiesbaden Konzerte Booking'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Wiesbadener Kulturzentrum, 430 km.', km: 430, priority: 3 },
  { name: 'KFZ Marburg', kind: 'youth', city: 'Marburg', region: 'Hessen', website: 'https://www.kfz-marburg.de', tags: ['kulturzentrum', 'punk'], fit: 'Marburger KFZ, linkes Kulturzentrum mit Konzerten.', km: 480, priority: 3 },
  { name: 'MuK Gießen', kind: 'youth', city: 'Gießen', region: 'Hessen', website: find('MuK Gießen Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Gießener Kulturzentrum mit kleinen Konzerten.', km: 450, priority: 3 },
  { name: 'KUZ Mainz', kind: 'youth', city: 'Mainz', region: 'Rheinland-Pfalz', website: find('KUZ Mainz Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Mainzer Kulturzentrum, 430 km.', km: 430, priority: 3 },
  { name: 'Kulturzentrum Kreuz Fulda', kind: 'youth', city: 'Fulda', region: 'Hessen', website: find('Kreuz Fulda Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'jugend'], fit: 'Fuldarer Kulturzentrum mit Konzerten.', km: 420, priority: 3 },

  /* Wettbewerbe & Newcomer-Bühnen ---------------------------------------- */
  { name: 'Local Heroes', kind: 'contest', city: 'München', region: 'Bayern', website: find('Local Heroes Bandcontest München Bewerbung'), tags: ['wettbewerb', 'nachwuchs'], fit: 'Bandwettbewerb mit Regional-Vorentscheiden – Jury-Feedback und Bühne in einem.', deadline: 'Anmeldung meist Herbst/Winter', km: 70, priority: 2 },
  { name: 'Emergenza Festival', kind: 'contest', city: 'wechselnd', region: '', website: 'https://www.emergenza.net', tags: ['wettbewerb', 'international'], fit: 'Internationaler Bandcontest mit Club-Vorrunden in vielen Städten. Kritisch prüfen, ob Kosten und Nutzen passen.', priority: 3 },
  { name: 'Wacken Metal Battle', kind: 'contest', city: 'wechselnd', region: '', website: find('Wacken Metal Battle Bewerbung'), tags: ['wettbewerb', 'metal'], fit: 'Metal-Battle mit Club-Vorrunden; nur sinnvoll, wenn euer Sound in die Ecke geht.', deadline: 'Anmeldung meist Winter', priority: 3 },

  /* Kleine Festivals ohne großes Bewerbungsverfahren --------------------- */
  { name: 'Immergut Festival', kind: 'festival', city: 'Neustrelitz', region: 'Mecklenburg-Vorpommern', website: 'https://www.immergutrocken.de', tags: ['indie', 'klein'], fit: 'Kleines, gut kuratiertes Indie-Festival – weit weg, aber ein Publikum, das zuhört.', deadline: 'Bewerbung Winter', km: 750, priority: 3 },
  { name: 'Maifeld Derby', kind: 'festival', city: 'Mannheim', region: 'Baden-Württemberg', website: 'https://www.maifeldderby.de', tags: ['indie', 'alternative'], fit: 'Sorgfältig gebuchtes Festival mit Nachwuchs-Slots.', deadline: 'Bewerbung Winter', km: 300, priority: 3 },
  { name: 'Orange Blossom Special', kind: 'festival', city: 'Beverungen', region: 'Nordrhein-Westfalen', website: find('Orange Blossom Special Festival Beverungen'), tags: ['indie', 'alternative'], fit: 'Kleines Festival mit anspruchsvollem Programm, 520 km.', deadline: 'Bewerbung Winter', km: 520, priority: 3 },
  { name: 'Haldern Pop', kind: 'festival', city: 'Rees-Haldern', region: 'Nordrhein-Westfalen', website: 'https://www.haldernpop.com', tags: ['indie', 'alternative'], fit: 'Bekanntes kleines Festival; Bewerbung aussichtslos ohne Release – aber Kontakte lohnen.', deadline: 'Bewerbung Winter', km: 640, priority: 3 },
  { name: 'Appletree Garden', kind: 'festival', city: 'Diepholz', region: 'Niedersachsen', website: find('Appletree Garden Festival Diepholz'), tags: ['indie', 'alternative'], fit: 'Kleines Gartenfestival, 700 km.', deadline: 'Bewerbung Winter', km: 700, priority: 3 },
  { name: 'Umsonst & Draußen Karlsruhe', kind: 'festival', city: 'Karlsruhe', region: 'Baden-Württemberg', website: find('Umsonst und Draußen Karlsruhe Festival Bewerbung'), tags: ['free', 'punk', 'alternative'], fit: 'Selbstorganisiertes Wochenende mit offener Bewerbung.', deadline: 'Bewerbung Frühjahr', km: 250, priority: 3 },
  { name: 'Umsonst & Draußen Hof', kind: 'festival', city: 'Hof', region: 'Bayern', website: find('Umsonst und Draußen Hof Festival Bewerbung'), tags: ['free', 'alternative'], fit: 'Kostenloses Festival in Oberfranken, 320 km.', deadline: 'Bewerbung Frühjahr', km: 320, priority: 3 },
  { name: 'Punk im Pott', kind: 'festival', city: 'Essen', region: 'Nordrhein-Westfalen', website: find('Punk im Pott Festival Bewerbung'), tags: ['punk', 'klein'], fit: 'Regionale Punk-Festival-Reihe im Ruhrgebiet.', deadline: 'Bewerbung Frühjahr', km: 610, priority: 3 },

  /* Weitere Nachwuchs-Adressen, die man kennen sollte -------------------- */
  { name: 'Glockenbachwerkstatt', kind: 'youth', city: 'München', region: 'Bayern', website: find('Glockenbachwerkstatt München Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Münchner Kulturhaus im Glockenbachviertel, kleine Bühne, offene Reihen.', km: 70, priority: 2 },
  { name: 'Alte Utting', kind: 'venue', city: 'München', region: 'Bayern', website: find('Alte Utting München Konzerte'), tags: ['alternative', 'kulturort'], fit: 'Schiff auf der Bahnbrücke – ungewöhnlicher Ort, offen für eigene Formate.', km: 70, priority: 3 },
  { name: 'Bahnwärter Thiel', kind: 'youth', city: 'München', region: 'Bayern', website: find('Bahnwärter Thiel München Konzerte'), tags: ['kulturort', 'alternative'], fit: 'Münchner Kulturort in Containern, Konzerte und Kooperationen möglich.', km: 70, priority: 3 },
  { name: 'Kulturhaus Milbertshofen', kind: 'youth', city: 'München', region: 'Bayern', website: find('Kulturhaus Milbertshofen Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Stadtteil-Kulturhaus mit Konzertreihe und Bandförderung.', km: 70, priority: 2 },
  { name: 'KunstKulturQuartier Nürnberg', kind: 'youth', city: 'Nürnberg', region: 'Bayern', website: find('KunstKulturQuartier Nürnberg Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Nürnberger Kulturquartier mit Nachwuchsbühnen – 150 km.', km: 150, priority: 2 },
  { name: 'Kulturwerkstatt Auf AEG', kind: 'youth', city: 'Nürnberg', region: 'Bayern', website: find('Kulturwerkstatt Auf AEG Nürnberg Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Großes Nürnberger Kulturzentrum mit Bandproberäumen und Konzerten.', km: 150, priority: 2 },
  { name: 'Kulturforum Fürth', kind: 'youth', city: 'Fürth', region: 'Bayern', website: find('Kulturforum Fürth Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Fürther Kulturforum mit kleinen Konzerten, 155 km.', km: 155, priority: 3 },
  { name: 'Kulturzentrum Laboratorium', kind: 'youth', city: 'Stuttgart', region: 'Baden-Württemberg', website: find('Laboratorium Stuttgart Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Stuttgarter Nachwuchsadresse mit Konzerten und Proberäumen.', km: 160, priority: 2 },
  { name: 'Kulturladen Konstanz', kind: 'youth', city: 'Konstanz', region: 'Baden-Württemberg', website: find('Kulturladen Konstanz Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Konstanzer Kulturladen, 220 km – nur mit Wochenendroute.', km: 220, priority: 3 },
  { name: 'Karlstorbahnhof', kind: 'youth', city: 'Heidelberg', region: 'Baden-Württemberg', website: find('Karlstorbahnhof Heidelberg Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Heidelberger Kulturzentrum mit kleiner Bühne.', km: 320, priority: 3 },
  { name: 'Halle02', kind: 'venue', city: 'Heidelberg', region: 'Baden-Württemberg', website: find('Halle02 Heidelberg Booking'), tags: ['club', 'alternative'], fit: 'Heidelberger Club mit Support-Slots für kleinere Acts.', km: 320, priority: 3 },
  { name: 'Dock 4', kind: 'youth', city: 'Kassel', region: 'Hessen', website: find('Dock 4 Kassel Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Kasseler Kulturzentrum, 450 km.', km: 450, priority: 3 },
  { name: 'naTo', kind: 'youth', city: 'Leipzig', region: 'Sachsen', website: find('naTo Leipzig Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Leipziger Kulturzentrum mit Konzerten und offenen Abenden.', km: 450, priority: 3 },
  { name: 'Kraftwerk Chemnitz', kind: 'youth', city: 'Chemnitz', region: 'Sachsen', website: find('Kraftwerk Chemnitz Konzerte'), tags: ['kulturzentrum', 'alternative'], fit: 'Chemnitzer Kulturzentrum mit Nachwuchsprogramm.', km: 450, priority: 3 },
  { name: 'Köpi', kind: 'youth', city: 'Berlin', region: 'Berlin', website: find('Köpi Berlin Konzerte Booking'), tags: ['diY', 'punk', 'linke szene'], fit: 'Berliner Szene-Ort mit Konzerten – Haltung wichtiger als Reichweite.', km: 600, priority: 3 },
  { name: 'Schlachthof Bremen', kind: 'youth', city: 'Bremen', region: 'Bremen', website: find('Schlachthof Bremen Konzerte Booking'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Bremer Kulturzentrum mit Konzerten und Bandförderung.', km: 750, priority: 3 },
  { name: 'Lagerhaus Bremen', kind: 'venue', city: 'Bremen', region: 'Bremen', website: find('Lagerhaus Bremen Booking Konzerte'), tags: ['club', 'alternative'], fit: 'Bremer Club mit kleinen Konzerten.', km: 750, priority: 3 },
  { name: 'Cadillac Oldenburg', kind: 'venue', city: 'Oldenburg', region: 'Niedersachsen', website: find('Cadillac Oldenburg Booking'), tags: ['club', 'alternative'], fit: 'Oldenburger Club, 800 km.', km: 800, priority: 3 },
  { name: 'Kulturzentrum Balou', kind: 'youth', city: 'Dortmund', region: 'Nordrhein-Westfalen', website: find('Balou Dortmund Kulturzentrum Konzerte'), tags: ['kulturzentrum', 'nachwuchs'], fit: 'Dortmunder Kulturzentrum mit Bandabenden.', km: 600, priority: 3 },
];

/** Priority 1 first, then by distance – the order you actually want to work in. */
export function sortSeeds(seeds: ContactSeed[]) {
  return [...seeds].sort(
    (a, b) => (a.priority ?? 2) - (b.priority ?? 2) || (a.km ?? 9999) - (b.km ?? 9999) || a.name.localeCompare(b.name)
  );
}

/* ------------------------------------------------------------ town research */

/**
 * Towns close enough to play without a hotel. No invented venues: the links open a
 * search for the local Jugendzentrum / Kulturzentrum, and what you find becomes a
 * contact of your own. That is how a starter list grows past the curated one.
 */
export const RESEARCH_TOWNS: { name: string; region: string; km: number }[] = [
  { name: 'Friedberg', region: 'Bayern', km: 15 },
  { name: 'Aichach', region: 'Bayern', km: 25 },
  { name: 'Fürstenfeldbruck', region: 'Bayern', km: 50 },
  { name: 'Landsberg am Lech', region: 'Bayern', km: 55 },
  { name: 'Donauwörth', region: 'Bayern', km: 60 },
  { name: 'Krumbach', region: 'Bayern', km: 60 },
  { name: 'Mindelheim', region: 'Bayern', km: 60 },
  { name: 'Dillingen an der Donau', region: 'Bayern', km: 70 },
  { name: 'Kaufbeuren', region: 'Bayern', km: 80 },
  { name: 'Günzburg', region: 'Bayern', km: 80 },
  { name: 'Schongau', region: 'Bayern', km: 80 },
  { name: 'Dachau', region: 'Bayern', km: 80 },
  { name: 'Weilheim in Oberbayern', region: 'Bayern', km: 90 },
  { name: 'Starnberg', region: 'Bayern', km: 90 },
  { name: 'Neuburg an der Donau', region: 'Bayern', km: 90 },
  { name: 'Nördlingen', region: 'Bayern', km: 90 },
  { name: 'Marktoberdorf', region: 'Bayern', km: 100 },
  { name: 'Pfaffenhofen an der Ilm', region: 'Bayern', km: 100 },
  { name: 'Erding', region: 'Bayern', km: 110 },
  { name: 'Freising', region: 'Bayern', km: 110 },
  { name: 'Weißenburg in Bayern', region: 'Bayern', km: 110 },
  { name: 'Gunzenhausen', region: 'Bayern', km: 120 },
  { name: 'Kempten', region: 'Bayern', km: 130 },
  { name: 'Landshut', region: 'Bayern', km: 130 },
  { name: 'Roth', region: 'Bayern', km: 130 },
  { name: 'Bad Tölz', region: 'Bayern', km: 130 },
  { name: 'Schwabach', region: 'Bayern', km: 140 },
  { name: 'Immenstadt', region: 'Bayern', km: 140 },
  { name: 'Dingolfing', region: 'Bayern', km: 160 },
  { name: 'Lindau', region: 'Bayern', km: 160 },
  { name: 'Rosenheim', region: 'Bayern', km: 170 },
  { name: 'Wasserburg am Inn', region: 'Bayern', km: 170 },
  { name: 'Ansbach', region: 'Bayern', km: 170 },
  { name: 'Sonthofen', region: 'Bayern', km: 150 },
  { name: 'Mühldorf am Inn', region: 'Bayern', km: 190 },
  { name: 'Forchheim', region: 'Bayern', km: 190 },
  { name: 'Straubing', region: 'Bayern', km: 200 },
  { name: 'Bamberg', region: 'Bayern', km: 200 },
  { name: 'Amberg', region: 'Bayern', km: 200 },
  { name: 'Schwandorf', region: 'Bayern', km: 200 },
  { name: 'Altötting', region: 'Bayern', km: 210 },
  { name: 'Traunstein', region: 'Bayern', km: 220 },
  { name: 'Deggendorf', region: 'Bayern', km: 230 },
  { name: 'Cham', region: 'Bayern', km: 230 },
  { name: 'Weiden in der Oberpfalz', region: 'Bayern', km: 250 },
  { name: 'Bayreuth', region: 'Bayern', km: 250 },
  { name: 'Lichtenfels', region: 'Bayern', km: 250 },
  { name: 'Passau', region: 'Bayern', km: 260 },
  { name: 'Kulmbach', region: 'Bayern', km: 280 },
  { name: 'Coburg', region: 'Bayern', km: 300 },
  { name: 'Hof', region: 'Bayern', km: 320 },
  { name: 'Göppingen', region: 'Baden-Württemberg', km: 140 },
  { name: 'Biberach an der Riß', region: 'Baden-Württemberg', km: 140 },
  { name: 'Heidenheim an der Brenz', region: 'Baden-Württemberg', km: 150 },
  { name: 'Ludwigsburg', region: 'Baden-Württemberg', km: 165 },
  { name: 'Ravensburg', region: 'Baden-Württemberg', km: 170 },
  { name: 'Aalen', region: 'Baden-Württemberg', km: 170 },
  { name: 'Schwäbisch Gmünd', region: 'Baden-Württemberg', km: 180 },
  { name: 'Böblingen', region: 'Baden-Württemberg', km: 180 },
  { name: 'Sigmaringen', region: 'Baden-Württemberg', km: 180 },
  { name: 'Albstadt', region: 'Baden-Württemberg', km: 200 },
  { name: 'Konstanz', region: 'Baden-Württemberg', km: 220 },
  { name: 'Tuttlingen', region: 'Baden-Württemberg', km: 220 },
  { name: 'Rottweil', region: 'Baden-Württemberg', km: 230 },
  { name: 'Villingen-Schwenningen', region: 'Baden-Württemberg', km: 250 },
];

/** Opens a search for youth centres and clubs in that town. */
export const researchTownUrl = (town: string) =>
  find(`Jugendzentrum OR Kulturzentrum "${town}" Konzerte Booking`);

