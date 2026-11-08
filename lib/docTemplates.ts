import type { DocumentKind } from './types';

export interface DocTemplate {
  id: string;
  title: string;
  kind: DocumentKind;
  label: string;
  hint: string;
  content: string;
}

const table = (head: string[], rows: string[][]) => {
  const headRow = `<tr>${head.map((cell) => `<th><p>${cell}</p></th>`).join('')}</tr>`;
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td><p>${cell}</p></td>`).join('')}</tr>`)
    .join('');
  return `<table><tbody>${headRow}${body}</tbody></table>`;
};

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'rider',
    title: 'Technical rider',
    kind: 'rider',
    label: 'Technical rider',
    hint: 'Line-up, channel list, monitoring, backline, hospitality',
    content: `
<h2>1 · Band</h2>
<p><strong>DECHIRE</strong> – post-hardcore, 5 piece. Home base: Essen, Germany.<br>Set length: 60 minutes. No playback, no backing tracks.</p>
<h2>2 · Contacts</h2>
${table(
  ['Role', 'Name', 'Phone / mail'],
  [
    ['Tour management', 'Jan Reuter', '+49 170 000000 · jan@dechire.band'],
    ['FOH engineer', 'Mira Kolb', '+49 170 000001 · mira@dechire.band'],
    ['Merch / guest list', 'Lina Sander', 'guestlist@dechire.band'],
  ]
)}
<h2>3 · Stage & channel list</h2>
<p>Stage minimum 6 × 4 m, drum riser 2 × 2 m. We need a complete PA and a soundcheck of 45 minutes.</p>
${table(
  ['Ch', 'Source', 'Mic / DI', 'Notes'],
  [
    ['1', 'Kick', 'Beta 91 + D6', 'Inside / outside'],
    ['2', 'Snare top', 'SM57', ''],
    ['3', 'Snare bottom', 'SM57', 'Polarity inverted'],
    ['4', 'Hi-hat', 'SM81', 'Optional'],
    ['5', 'Rack tom', 'e604', ''],
    ['6', 'Floor tom', 'e604', ''],
    ['7', 'Overhead L', 'C414', ''],
    ['8', 'Overhead R', 'C414', ''],
    ['9', 'Bass DI', 'DI', 'Pre/post split, we bring the amp'],
    ['10', 'Guitar L', 'SM57', 'Amp on stage left'],
    ['11', 'Guitar R', 'SM57', 'Amp on stage right'],
    ['12', 'Lead vocal', 'Beta 58', 'Wireless welcome'],
    ['13', 'Backing vocal L', 'Beta 58', ''],
    ['14', 'Backing vocal R', 'Beta 58', ''],
  ]
)}
<h2>4 · Backline we bring</h2>
<ul>
  <li>Drums (shells, hardware, 2 × kick pedal), 4 cymbals, throne</li>
  <li>Bass amp: 500 W head + 4 × 10 cabinet</li>
  <li>Guitar amps: 2 × 50 W tube heads + 2 × 4 × 12 cabinets</li>
  <li>Own vocal mics on request, otherwise house mics are fine</li>
</ul>
<h2>5 · Backline we need from the venue</h2>
<ul>
  <li>Drum riser 2 × 2 m (carpet, please)</li>
  <li>6 × DI box, 10 × mic stand (tall boom)</li>
  <li>2 × power drops stage left, 2 × stage right, 1 × drum riser</li>
</ul>
<h2>6 · Monitoring</h2>
<p>4 monitor mixes, all on wedges. Mix 1: lead vocal, mix 2: guitar L / bass, mix 3: guitar R, mix 4: drums. Side fills welcome but not required.</p>
<h2>7 · Lighting</h2>
<p>No colour wash in the first two songs. We play in a dark room with a lot of backlight – no strobes, no haze in the first 20 minutes (haze is fine for the whole set, please).</p>
<h2>8 · Power</h2>
<p>230 V / 16 A stage left and right, plus one 230 V line at the drum riser. Please do not share with kitchen equipment.</p>
<h2>9 · Hospitality</h2>
<p>Still water (6 × 1.5 l), 2 × coffee, 6 × beer after the show, one warm meal for 5 people. Two parking spots next to the load-in. One private room as a backstage – a shared room is fine as a fallback.</p>
`.trim(),
  },
  {
    id: 'contract',
    title: 'Booking confirmation',
    kind: 'contract',
    label: 'Booking confirmation',
    hint: 'Fee, billing, cancellation, curfew',
    content: `
<h2>Booking confirmation</h2>
<p><strong>Between</strong> the promoter and <strong>DECHIRE</strong>, represented by tour management.</p>
<h2>1 · Event</h2>
${table(
  ['Item', 'Detail'],
  [
    ['Venue', '—'],
    ['Date', '—'],
    ['Doors / show', '20:15 / 21:00'],
    ['Set length', '60 minutes'],
  ]
)}
<h2>2 · Fee & billing</h2>
<p>Agreed fee: <strong>€ —</strong> plus VAT. Invoice after the show, payment within 14 days. Travel lump sum € —.</p>
<h2>3 · Extras</h2>
<ul>
  <li>6 × guest list spots, additional spots by arrangement</li>
  <li>Merch commission: 0 % (we sell at the merch table with our own staff)</li>
  <li>Two parking spots and a secure backstage room</li>
</ul>
<h2>4 · Cancellation</h2>
<p>Free cancellation up to 14 days before the show. Afterwards we charge 50 % of the fee, within 5 days 100 %.</p>
<h2>5 · Notes</h2>
<p>Please attach the technical rider and the day schedule. This confirmation counts as an agreement once both sides have signed it (print, sign, scan, send back).</p>
`.trim(),
  },
  {
    id: 'itinerary',
    title: 'Tour itinerary',
    kind: 'itinerary',
    label: 'Itinerary',
    hint: 'Day schedule with load-in, show and travel',
    content: `
<h2>Day sheet</h2>
${table(
  ['Time', 'What', 'Who / where'],
  [
    ['12:00', 'Departure', 'Backline van, Essen'],
    ['16:30', 'Load-in', 'Gate 3, backyard'],
    ['18:00', 'Soundcheck', '45 minutes'],
    ['19:00', 'Line check / dinner', ''],
    ['20:15', 'Doors', ''],
    ['21:00', 'Show', '60 minutes'],
    ['22:15', 'Merch & meet', 'Merch table in the foyer'],
    ['23:30', 'Load-out', ''],
  ]
)}
<h2>Sleeping</h2>
<p>5 beds, one room is fine. Address and key handover to be confirmed by the promoter.</p>
<h2>Open questions</h2>
<ul data-type="taskList">
  <li data-checked="false">Confirm parking spots for the van</li>
  <li data-checked="false">Get the contact of the venue tech</li>
  <li data-checked="false">Check the curfew on Sundays</li>
</ul>
`.trim(),
  },
  {
    id: 'press',
    title: 'Press text',
    kind: 'press',
    label: 'Press & bio',
    hint: 'Short and long bio for promoters and press',
    content: `
<h2>Short (50 words)</h2>
<p>DECHIRE come from the Ruhr and play post-hardcore that sounds like a room with the light switched off. Loud, honest, unpolished.</p>
<h2>Long (150 words)</h2>
<p>DECHIRE started in a rehearsal room in Essen – no plan, no budget, but a lot of frustration and a borrowed amp. Ten years later the band still sounds like that room: heavy guitars, vocals that keep slipping between singing and screaming, songs that break before they get comfortable.</p>
<p>With <strong>Fracture</strong> DECHIRE released the most direct record so far: three minutes that cost the band two years. The lyrics are about the moment something breaks and you decide to keep the pieces.</p>
<p>Live the band plays almost the entire record, without playback, without a click.</p>
<h2>Quotes</h2>
<blockquote>“Post-hardcore from the Ruhr – loud, honest, unpolished.”</blockquote>
<h2>Links</h2>
<p>Instagram: @dechire.band · Music: dechire.band/links · Booking: booking@dechire.band</p>
`.trim(),
  },
  {
    id: 'orga',
    title: 'Stage plot & backline notes',
    kind: 'orga',
    label: 'Stage plot',
    hint: 'Who stands where, power and DI notes',
    content: `
<h2>Stage plot (from the audience)</h2>
<pre><code>        drums (riser 2×2)
   guitar L              guitar R
        bass          lead vocal
     backing vocal L   backing vocal R</code></pre>
<h2>Notes</h2>
<ul>
  <li>Guitar amps behind the players, tilted, facing across the stage</li>
  <li>Bass amp stage left, next to the drum riser</li>
  <li>Two power drops per side, one line at the riser</li>
  <li>Merch table in the foyer, band staffed</li>
</ul>
<h2>To bring</h2>
<ul data-type="taskList">
  <li data-checked="true">Carpet for the riser</li>
  <li data-checked="false">Spare cables (2 × 10 m)</li>
  <li data-checked="false">Setlist prints</li>
</ul>
`.trim(),
  },
  {
    id: 'blank',
    title: 'Untitled document',
    kind: 'other',
    label: 'Blank document',
    hint: 'Start from an empty page',
    content: '<p></p>',
  },
];

export const templateById = (id: string) => DOC_TEMPLATES.find((template) => template.id === id) ?? DOC_TEMPLATES[DOC_TEMPLATES.length - 1];
