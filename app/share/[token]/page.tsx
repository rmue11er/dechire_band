import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DocComments from '@/components/DocComments';
import ReleasePlayer from '@/components/ReleasePlayer';
import { formatDate } from '@/lib/format';
import { docKindLabel } from '@/lib/kinds';
import { getDocumentByShareToken, getProfile, listDocumentComments } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const document = getDocumentByShareToken(token);
  if (!document) return { title: 'Document not found', robots: { index: false, follow: false } };
  const profile = getProfile();
  return {
    title: `${document.title || 'Document'} · ${profile.bandName}`,
    description: document.plainText.slice(0, 160),
    robots: { index: false, follow: false },
    openGraph: {
      title: `${document.title || 'Document'} · ${profile.bandName}`,
      description: document.plainText.slice(0, 160),
      type: 'article',
    },
  };
}

/**
 * Public read-only page for a shared document. Only the token owner can see it,
 * the page is not linked anywhere and never indexed. Lyrics sheets bring their
 * demos along – they are part of the document.
 */
export default async function SharedDocumentPage({ params }: Props) {
  const { token } = await params;
  const document = getDocumentByShareToken(token);
  if (!document) notFound();

  const profile = getProfile();
  const kindLabel = docKindLabel(document.kind);
  const tagline = profile.bio?.split('\n')[0] || 'emotional post-hardcore /// augsburg';
  const comments = listDocumentComments(document.id);

  return (
    <main className="doc-share">
      <article className="doc-page doc-share-sheet">
        <header className="doc-share-head">
          <span className="doc-share-brand">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : null}
            <span>
              <strong>{profile.bandName}</strong>
              <em>{tagline}</em>
            </span>
          </span>
          <span className="doc-share-kind">{kindLabel}</span>
        </header>

        <div className="doc-sheet-body">
          <div className="doc-share-titlewrap">
            <span className="doc-sheet-kicker">
              <span className="doc-sheet-kicker-mark" aria-hidden="true">
                ///
              </span>
              {kindLabel}
            </span>
            <h1 className="doc-sheet-title">{document.title || 'Untitled document'}</h1>
            <span className="doc-sheet-rule" aria-hidden="true" />
            <span className="doc-share-meta">
              {formatDate(document.updatedAt)}
              {profile.handle ? ` · @${profile.handle}` : ''}
              {document.songTitle ? ` · ${document.songTitle}` : ''}
            </span>
          </div>

          <div className="prose doc-content" dangerouslySetInnerHTML={{ __html: document.content }} />

          {document.audio.length ? (
            <section className="doc-share-audio">
              <h2>
                <span className="doc-share-audio-mark" aria-hidden="true">
                  ♫
                </span>
                {document.audio.length === 1 ? 'Demo' : 'Demos'}
              </h2>
              {document.audio.map((track) => (
                <div key={track.id} className="doc-share-track">
                  <ReleasePlayer
                    src={track.media.url}
                    title={track.label || track.media.title}
                    badge={track.media.mime.includes('mpeg') ? 'MP3' : 'Audio'}
                  />
                  <a className="doc-share-download" href={`${track.media.url}?download=1`}>
                    Download
                  </a>
                </div>
              ))}
            </section>
          ) : null}

          <footer className="doc-sheet-foot">
            <span>{profile.bandName} /// Shared document</span>
            <span>{profile.website ?? ''}</span>
          </footer>
        </div>
      </article>

      <DocComments token={token} initial={comments} />

      <p className="doc-share-note">
        Private link – not indexed. Anyone with this link can read the document and leave a note.
      </p>
    </main>
  );
}
