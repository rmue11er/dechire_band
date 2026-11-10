'use client';

import { REEL_SAFE, type ReelText } from '@/lib/reels';

function hookSize(text: ReelText, longest: number) {
  if (text.style === 'serif') {
    if (longest <= 10) return 168;
    if (longest <= 16) return 138;
    if (longest <= 24) return 112;
    if (longest <= 34) return 92;
    return 76;
  }
  if (text.style === 'sans') {
    if (longest <= 10) return 132;
    if (longest <= 18) return 104;
    if (longest <= 28) return 84;
    return 68;
  }
  if (longest <= 14) return 96;
  if (longest <= 24) return 80;
  if (longest <= 36) return 64;
  return 54;
}

/**
 * The text layer of a reel. Rendered at exactly 1080×1920 – in the preview it
 * is scaled down by CSS, for the export the very same markup is rasterised
 * into a transparent PNG and overlaid by ffmpeg.
 */
export function ReelOverlay({ text, handle }: { text: ReelText; handle?: string }) {
  const lines = text.hook
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const kicker = text.kicker.trim();
  const sub = text.sub.trim();
  const shownHandle = handle?.trim();

  return (
    <div
      className={`reel-overlay style-${text.style} align-${text.align} place-${text.place}`}
      style={{
        top: REEL_SAFE.top,
        bottom: REEL_SAFE.bottom,
        left: REEL_SAFE.side,
        right: REEL_SAFE.side,
      }}
    >
      <div className="reel-copy">
        {kicker ? <span className="reel-kicker">{kicker}</span> : null}
        {lines.length ? (
          <div className="reel-hook" style={{ fontSize: hookSize(text, longest) }}>
            {lines.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        ) : null}
        {sub ? <span className="reel-sub">{sub}</span> : null}
      </div>
      {text.showHandle && shownHandle ? (
        <span className="reel-handle">{shownHandle.startsWith('@') ? shownHandle : `@${shownHandle}`}</span>
      ) : null}
    </div>
  );
}
