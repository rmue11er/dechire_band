import { fail, ok, toInt } from '@/lib/api';
import {
  createDocument,
  createMilestone,
  createNote,
  createPost,
  deleteTrashEntry,
  getDocument,
  getMilestone,
  getNote,
  getPost,
  getTrashEntry,
} from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Puts a deleted entry back – as a new record, with the same content. */
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const entry = getTrashEntry(toInt(id));
  if (!entry) return fail('Entry not found in the bin', 404);

  const payload = entry.payload ?? {};

  try {
    switch (entry.kind) {
      case 'post': {
        const newId = createPost({
          type: payload.type,
          status: payload.status === 'published' ? 'draft' : payload.status ?? 'draft',
          caption: payload.caption,
          firstComment: payload.firstComment,
          altText: payload.altText,
          location: payload.location,
          songTitle: payload.songTitle,
          songArtist: payload.songArtist,
          scheduledAt: payload.scheduledAt,
          publishedAt: null,
          mediaIds: Array.isArray(payload.mediaIds) ? payload.mediaIds : [],
        });
        const post = getPost(newId);
        if (!post) throw new Error('Could not restore the post');
        deleteTrashEntry(entry.id);
        return ok({ kind: 'post', item: post });
      }
      case 'document': {
        const document = createDocument(payload);
        if (!document) throw new Error('Could not restore the document');
        deleteTrashEntry(entry.id);
        return ok({ kind: 'document', item: document });
      }
      case 'milestone': {
        const milestone = createMilestone(payload);
        if (!milestone) throw new Error('Could not restore the milestone');
        deleteTrashEntry(entry.id);
        return ok({ kind: 'milestone', item: milestone });
      }
      case 'note': {
        const note = createNote(payload);
        if (!note) throw new Error('Could not restore the note');
        deleteTrashEntry(entry.id);
        return ok({ kind: 'note', item: note });
      }
      default:
        return fail(`Unknown entry type: ${entry.kind}`, 400);
    }
  } catch (error: any) {
    return fail(error?.message ?? 'Restore failed', 400);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteTrashEntry(toInt(id));
  return ok({ ok: true });
}
