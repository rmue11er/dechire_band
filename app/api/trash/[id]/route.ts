import { fail, ok, toInt } from '@/lib/api';
import {
  attachDocumentAudio,
  createDocument,
  createDocumentComment,
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
        // Audio files survive in the media library – put the attachments back.
        if (Array.isArray(payload.audio)) {
          for (const track of payload.audio) {
            attachDocumentAudio(document.id, Number(track?.mediaId), String(track?.label ?? ''));
          }
        }
        // Shared-document comments are part of the sheet.
        if (Array.isArray(payload.comments)) {
          for (const entry of payload.comments) {
            const body = String(entry?.body ?? '').trim().slice(0, 2000);
            if (!body) continue;
            createDocumentComment(document.id, {
              author: String(entry?.author ?? 'anonymous').trim().slice(0, 60) || 'anonymous',
              body,
              createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : undefined,
            });
          }
        }
        const restored = getDocument(document.id) ?? document;
        deleteTrashEntry(entry.id);
        return ok({ kind: 'document', item: restored });
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
