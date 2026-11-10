import { ok } from '@/lib/api';
import { queryAll } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type SearchHit = {
  kind: 'post' | 'media' | 'note' | 'document' | 'milestone' | 'design' | 'snippet' | 'song' | 'video';
  id: number;
  title: string;
  subtitle: string;
  href: string;
};

const clip = (value: string, length = 120) => {
  const flat = String(value ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const term = (url.searchParams.get('q') ?? '').trim();

  if (term.length < 2) return ok({ hits: [] as SearchHit[] });

  const like = `%${term.replace(/[%_]/g, '')}%`;
  const hits: SearchHit[] = [];

  for (const row of queryAll<any>(
    'SELECT id, caption, status FROM posts WHERE caption LIKE ? OR first_comment LIKE ? OR location LIKE ? ORDER BY position ASC LIMIT 8',
    [like, like, like]
  )) {
    hits.push({
      kind: 'post',
      id: Number(row.id),
      title: clip(row.caption, 70) || `Post #${row.id}`,
      subtitle: `Post · ${row.status}`,
      href: `/planner?post=${row.id}`,
    });
  }

  for (const row of queryAll<any>(
    'SELECT id, title, variant_label FROM media WHERE title LIKE ? OR original_name LIKE ? OR tags LIKE ? LIMIT 8',
    [like, like, like]
  )) {
    hits.push({
      kind: 'media',
      id: Number(row.id),
      title: row.title,
      subtitle: `Asset${row.variant_label ? ` · ${row.variant_label}` : ''}`,
      href: '/media',
    });
  }

  for (const row of queryAll<any>(
    'SELECT id, title, status FROM songs WHERE title LIKE ? OR notes LIKE ? OR song_key LIKE ? LIMIT 8',
    [like, like, like]
  )) {
    hits.push({
      kind: 'song',
      id: Number(row.id),
      title: row.title,
      subtitle: `Song · ${row.status}`,
      href: '/songs',
    });
  }

  for (const row of queryAll<any>(
    'SELECT id, title, status, location FROM video_projects WHERE title LIKE ? OR notes LIKE ? OR location LIKE ? OR director LIKE ? LIMIT 8',
    [like, like, like, like]
  )) {
    hits.push({
      kind: 'video',
      id: Number(row.id),
      title: row.title,
      subtitle: `Video · ${row.status}${row.location ? ` · ${row.location}` : ''}`,
      href: `/videos/${row.id}`,
    });
  }

  for (const row of queryAll<any>('SELECT id, title, folder FROM notes WHERE title LIKE ? OR plain_text LIKE ? LIMIT 8', [
    like,
    like,
  ])) {
    hits.push({
      kind: 'note',
      id: Number(row.id),
      title: row.title || 'Untitled note',
      subtitle: `Note · ${row.folder}`,
      href: '/notes',
    });
  }

  for (const row of queryAll<any>(
    'SELECT id, title, kind FROM documents WHERE title LIKE ? OR plain_text LIKE ? LIMIT 8',
    [like, like]
  )) {
    hits.push({
      kind: 'document',
      id: Number(row.id),
      title: row.title || 'Untitled document',
      subtitle: `Document · ${row.kind}`,
      href: '/docs',
    });
  }

  for (const row of queryAll<any>('SELECT id, title, date FROM milestones WHERE title LIKE ? OR note LIKE ? LIMIT 8', [
    like,
    like,
  ])) {
    hits.push({
      kind: 'milestone',
      id: Number(row.id),
      title: row.title,
      subtitle: `Milestone · ${row.date}`,
      href: '/calendar',
    });
  }

  for (const row of queryAll<any>('SELECT id, title FROM designs WHERE title LIKE ? LIMIT 5', [like])) {
    hits.push({
      kind: 'design',
      id: Number(row.id),
      title: row.title,
      subtitle: 'Design',
      href: `/studio/${row.id}`,
    });
  }

  for (const row of queryAll<any>('SELECT id, label, kind FROM snippets WHERE label LIKE ? OR body LIKE ? LIMIT 5', [
    like,
    like,
  ])) {
    hits.push({
      kind: 'snippet',
      id: Number(row.id),
      title: row.label,
      subtitle: `Snippet · ${row.kind}`,
      href: '/planner',
    });
  }

  return ok({ hits });
}
