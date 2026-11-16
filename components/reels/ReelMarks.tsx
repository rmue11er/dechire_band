'use client';

import type { ReelMarks as Marks } from '@/lib/reels';

/**
 * The print frame of a reel: a hairline inside the safe margin or four crop
 * marks like a contact sheet. Rendered into the overlay PNG, so preview and
 * export share exactly the same geometry.
 */
export function ReelMarks({ marks }: { marks?: Marks }) {
  if (!marks || marks === 'none') return null;
  if (marks === 'frame') {
    return <span className="reel-marks is-frame" aria-hidden="true" />;
  }
  return (
    <span className="reel-marks is-crop" aria-hidden="true">
      <i className="tl" />
      <i className="tr" />
      <i className="bl" />
      <i className="br" />
    </span>
  );
}