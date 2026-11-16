'use client';

import { ReelMarks } from '@/components/reels/ReelMarks';
import type { ReelMarks as Marks } from '@/lib/reels';

/**
 * Bookend card: a dark, quiet sheet over the running picture with the song
 * title. It is rasterised as a timed overlay, so the video keeps its timing.
 */
export function ReelCard({
  kind,
  title,
  kicker,
  sub,
  handle,
  marks,
}: {
  kind: 'intro' | 'outro';
  title: string;
  kicker?: string;
  sub?: string;
  handle?: string;
  marks?: Marks;
}) {
  const cleanTitle = (title || 'déchire').trim().slice(0, 80);
  const size =
    cleanTitle.length <= 10 ? 152 : cleanTitle.length <= 18 ? 126 : cleanTitle.length <= 28 ? 100 : 82;

  return (
    <div className={`reel-card is-${kind}`}>
      <span className="reel-card-veil" aria-hidden="true" />

      <div className="reel-card-copy">
        <span className="reel-card-kicker">{kicker?.trim() || 'déchire'}</span>
        <h2 style={{ fontSize: size }}>{cleanTitle}</h2>
        <span className="reel-card-rule" aria-hidden="true" />
        <p>{sub?.trim() || (kind === 'outro' ? 'out now' : '')}</p>
      </div>

      <span className="reel-mark" aria-hidden="true">
        d<span className="reel-mark-e">é</span>chire
      </span>
      {handle ? (
        <span className="reel-card-handle">
          {handle.startsWith('@') ? handle : `@${handle}`}
        </span>
      ) : null}

      <ReelMarks marks={marks} />
    </div>
  );
}