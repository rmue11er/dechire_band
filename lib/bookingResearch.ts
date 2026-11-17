import { getBookingContact, listBookingContacts, updateBookingContact } from './repo';
import type { BookingContact } from './types';

/**
 * Looks up the e-mail address of a booking contact on its own website.
 *
 * Deliberately a small crawler and not a table of guesses: `info@venue.de`
 * invented from a venue name either bounces or lands on someone who has nothing
 * to do with the show. So we read what the venue published – mailto: links and
 * addresses in the text – and follow Impressum / Kontakt / Booking pages, which
 * German sites have to keep up to date anyway. The page an address was found on
 * is written into the contact notes, so it can be checked later.
 */

const UA = 'DECHIRE-Booking/1.0 (band booking research)';
const TIMEOUT_MS = 12000;
const MAX_PAGES = 5;
const DELAY_MS = 300;
const MAX_HTML = 400_000;

const SLEEP = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type ResearchResult = {
  status: 'found' | 'none' | 'no-website' | 'error';
  email: string | null;
  candidates: string[];
  sourceUrl: string;
  note: string;
};

const SERVICE_HOSTS = /(duckduckgo|google|bing|ecosia|startpage|qwant)\./i;

/** The seed list uses search links where a domain was not certain. */
export const isSearchUrl = (url: string) => SERVICE_HOSTS.test(url);

const BAD_EMAIL = [
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^(webmaster|postmaster|hostmaster|abuse|datenschutz|privacy)@/i,
  /@example\./i,
  /@example$|@domain\./i,
  /\.(png|jpe?g|gif|webp|svg|avif|css|js)$/i,
  /@\d*x\./i,
  /^(name|email|user|test|your)@/i,
  /sentry|wixpress|cloudflare|shopify|squarespace|jimdo|wordpress\.org|pqina|googleapis|gstatic|jquery|unpkg|fontawesome|hubspot|mailchimp/i,
  /^u003/i,
  /\.\./,
];

const STRONG = /^(booking|bookings|programm|programming|konzert|konzerte|live|kultur|presse|press|agentur|management|anfrage)/i;
const WEAK = /^(info|kontakt|contact|mail|office|hallo|hello|post|band|bands|music|team)/i;
const WEAK_ONLY = /^(tickets?|shop|newsletter|webmaster|abuse|jobs?|karriere|datenschutz|privacy|impressum|info-box)/i;

const decodeEntities = (value: string) =>
  value
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
      if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
      const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
      return named[lower] ?? match;
    })
    // the usual anti-spam spellings
    .replace(/\s*[([{]\s*(at|ät)\s*[)\]}]\s*/gi, '@')
    .replace(/\s*[([{]\s*(dot|punkt)\s*[)\]}]\s*/gi, '.');

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
};

const looksReal = (value: string) => {
  const email = value.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return false;
  if (email.length > 90) return false;
  if (email.split('@')[0].length > 40) return false;
  return !BAD_EMAIL.some((pattern) => pattern.test(email));
};

const scoreOf = (email: string, host: string) => {
  let score = 0;
  if (host && email.endsWith(`@${host}`)) score += 6;
  else score -= 2; /* another domain than the site – could be an agency */
  if (STRONG.test(email)) score += 6;
  else if (WEAK.test(email)) score += 4;
  else if (WEAK_ONLY.test(email)) score -= 4;
  return score;
};

/** mailto: links first (they are meant as contact), then plain text. */
export function extractEmails(html: string, pageUrl: string): string[] {
  const host = hostOf(pageUrl);
  const scores = new Map<string, number>();

  const add = (raw: string, bonus: number) => {
    const cleaned = decodeEntities(decodeURIComponentSafe(raw)).replace(/[.,;:)\]]+$/, '').trim();
    if (!looksReal(cleaned)) return;
    const email = cleaned.toLowerCase();
    scores.set(email, (scores.get(email) ?? 0) + bonus + scoreOf(email, host));
  };

  for (const match of html.matchAll(/href\s*=\s*["']mailto:([^"'#>?]+)/gi)) add(match[1], 5);

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  for (const match of text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) {
    /* plain text is greedy – only accept what belongs to this site */
    if (!host || !match[0].toLowerCase().endsWith(`@${host}`)) continue;
    add(match[0], 1);
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([email]) => email);
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') ?? '';
    if (type && !/text\/html|application\/xhtml/i.test(type)) return null;
    const text = await response.text();
    return text.slice(0, MAX_HTML);
  } catch {
    return null;
  }
}

/** Impressum / Kontakt / Booking pages of the same site, most promising first. */
export function contactPages(html: string, baseUrl: string): string[] {
  const host = hostOf(baseUrl);
  const wanted = /impressum|imprint|kontakt|contact|booking|presse|press|ueber-uns|about/i;
  const pages: { url: string; weight: number }[] = [];

  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const href = match[1];
    const label = decodeEntities(match[2].replace(/<[^>]+>/g, ' ')).trim();
    if (!wanted.test(href) && !wanted.test(label)) continue;
    let absolute: URL;
    try {
      absolute = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (absolute.protocol !== 'https:' && absolute.protocol !== 'http:') continue;
    if (hostOf(absolute.href) !== host) continue;
    const weight = /impressum|imprint/i.test(absolute.pathname) ? 3 : /kontakt|contact/i.test(absolute.pathname) ? 2 : 1;
    pages.push({ url: absolute.href, weight });
  }

  const unique = new Map<string, number>();
  for (const page of pages) unique.set(page.url, Math.max(unique.get(page.url) ?? 0, page.weight));

  /* JavaScript-heavy sites give us no links at all – try the usual paths */
  for (const path of ['/impressum', '/kontakt', '/imprint', '/contact']) {
    try {
      const url = new URL(path, baseUrl).href;
      if (!unique.has(url)) unique.set(url, 0.5);
    } catch {
      /* ignore */
    }
  }

  return [...unique.entries()].sort((a, b) => b[1] - a[1]).map(([url]) => url);
}

/** One contact, end to end. */
export async function researchContact(website: string): Promise<ResearchResult> {
  const raw = String(website ?? '').trim();
  const empty = (status: ResearchResult['status'], note: string): ResearchResult => ({
    status,
    email: null,
    candidates: [],
    sourceUrl: '',
    note,
  });

  if (!raw) return empty('no-website', 'keine Website hinterlegt');
  if (!/^https?:\/\//i.test(raw)) return empty('no-website', 'Website ist kein Link');
  if (isSearchUrl(raw)) return empty('no-website', 'nur ein Suchlink – Domain unbekannt');

  const home = await fetchPage(raw);
  if (!home) return empty('error', 'Website nicht erreichbar');

  const front = extractEmails(home, raw);
  const strongFront = front.find((email) => STRONG.test(email) || WEAK.test(email));
  if (strongFront) {
    return {
      status: 'found',
      email: strongFront,
      candidates: front.slice(0, 4),
      sourceUrl: raw,
      note: strongFront.endsWith(`@${hostOf(raw)}`) ? '' : 'Adresse liegt auf einer anderen Domain',
    };
  }

  /* only shop/ticket addresses on the front page – the good one is deeper */
  const pages = contactPages(home, raw).slice(0, MAX_PAGES - 1);
  const deep: { email: string; page: string }[] = [];
  for (const page of pages) {
    const html = await fetchPage(page);
    if (!html) continue;
    for (const email of extractEmails(html, page)) deep.push({ email, page });
    const strongDeep = deep.find((entry) => STRONG.test(entry.email));
    if (strongDeep) {
      return {
        status: 'found',
        email: strongDeep.email,
        candidates: [...new Set([strongDeep.email, ...front, ...deep.map((entry) => entry.email)])].slice(0, 4),
        sourceUrl: strongDeep.page,
        note: strongDeep.email.endsWith(`@${hostOf(raw)}`) ? '' : 'Adresse liegt auf einer anderen Domain',
      };
    }
    await SLEEP(150);
  }

  const fallback = front[0] ?? deep[0]?.email ?? '';
  if (fallback) {
    return {
      status: 'found',
      email: fallback,
      candidates: [...new Set([fallback, ...front, ...deep.map((entry) => entry.email)])].slice(0, 4),
      sourceUrl: front.length ? raw : (deep[0]?.page ?? raw),
      note: fallback.endsWith(`@${hostOf(raw)}`) ? '' : 'Adresse liegt auf einer anderen Domain',
    };
  }

  return empty('none', 'keine Adresse auf der Website gefunden');
}

/* ------------------------------------------------------------------- job */

export type ResearchState = {
  running: boolean;
  total: number;
  done: number;
  found: number;
  skipped: number;
  failed: number;
  current: string;
  startedAt: string | null;
  finishedAt: string | null;
  log: { name: string; email: string; status: string; note: string }[];
};

let state: ResearchState = {
  running: false,
  total: 0,
  done: 0,
  found: 0,
  skipped: 0,
  failed: 0,
  current: '',
  startedAt: null,
  finishedAt: null,
  log: [],
};

export const researchState = (): ResearchState => state;

const researchStamp = () => new Date().toISOString().slice(0, 10);

/** Writes the address plus its source into the contact – that is the audit trail. */
export function applyResearchResult(contact: BookingContact, result: ResearchResult): BookingContact {
  const line = result.email
    ? `E-Mail recherchiert: ${result.email}${result.sourceUrl ? ` (${result.sourceUrl})` : ''}${
        result.note ? ` – ${result.note}` : ''
      } · ${researchStamp()}`
    : `E-Mail-Recherche ohne Ergebnis: ${result.note} · ${researchStamp()}`;

  return updateBookingContact(contact.id, {
    ...(result.email ? { email: result.email } : {}),
    ...(result.sourceUrl && !contact.sourceUrl ? { sourceUrl: result.sourceUrl } : {}),
    notes: contact.notes.includes(line)
      ? contact.notes
      : [contact.notes, line].filter(Boolean).join('\n').slice(0, 4000),
  });
}

/**
 * Walks the list in the background – the request that starts it returns right
 * away, the page polls `/api/booking/research` for progress (same pattern as
 * the outreach queue).
 */
export async function runResearch(ids: number[], overwrite = false) {
  if (state.running) return;

  const contacts = ids.length
    ? ids.map((id) => getBookingContact(id)).filter((contact): contact is NonNullable<typeof contact> => Boolean(contact))
    : listBookingContacts();

  state = {
    running: true,
    total: contacts.length,
    done: 0,
    found: 0,
    skipped: 0,
    failed: 0,
    current: '',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    log: [],
  };

  for (const contact of contacts) {
    if (!overwrite && contact.email) {
      state.done += 1;
      state.skipped += 1;
      continue;
    }

    state.current = contact.name;
    try {
      const result = await researchContact(contact.website);
      if (result.email) {
        applyResearchResult(contact, result);
        state.found += 1;
        state.log.unshift({ name: contact.name, email: result.email, status: result.status, note: result.sourceUrl });
      } else {
        state.failed += 1;
        state.log.unshift({ name: contact.name, email: '', status: result.status, note: result.note });
      }
    } catch (error: any) {
      state.failed += 1;
      state.log.unshift({ name: contact.name, email: '', status: 'error', note: error?.message ?? 'Fehler' });
    }

    state.done += 1;
    state.log = state.log.slice(0, 40);
    await SLEEP(DELAY_MS);
  }

  state.running = false;
  state.current = '';
  state.finishedAt = new Date().toISOString();
}
