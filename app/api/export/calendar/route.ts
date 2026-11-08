import { listMilestones, listPosts } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const pad = (value: number) => String(value).padStart(2, '0');

const stamp = (value: string) => {
  const date = new Date(value);
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`
  );
};

const escape = (value: string) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** Calendar subscription: every scheduled post and every milestone. */
export async function GET() {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DECHIRE Band HQ//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:DECHIRE · Band HQ',
    'X-WR-TIMEZONE:Europe/Berlin',
  ];

  for (const post of listPosts()) {
    const when = post.status === 'published' ? post.publishedAt : post.scheduledAt;
    if (!when) continue;
    const title = post.caption.split('\n')[0].slice(0, 70) || `Post #${post.id}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:post-${post.id}@dechire-band-hq`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(when)}`,
      `SUMMARY:${escape(`Post: ${title}`)}`,
      `DESCRIPTION:${escape(`${post.caption}\n\n${post.firstComment}`.trim())}`,
      `CATEGORIES:Instagram,${escape(post.type)}`,
      'END:VEVENT'
    );
  }

  for (const milestone of listMilestones()) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:milestone-${milestone.id}@dechire-band-hq`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART;VALUE=DATE:${milestone.date.replace(/-/g, '')}`,
      `SUMMARY:${escape(milestone.title)}`,
      `DESCRIPTION:${escape(`${milestone.kind}${milestone.note ? ` · ${milestone.note}` : ''}`)}`,
      'CATEGORIES:Milestone',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  return new Response(`${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="dechire-band-hq.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
