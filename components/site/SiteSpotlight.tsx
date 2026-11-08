'use client';

import { useEffect, useRef } from 'react';

/**
 * The hero photo only exists where the pointer is: a torch in a dark room.
 * On touch devices (and before the first move) the mask stays in the middle,
 * so there is always *something* to see.
 */
export default function SiteSpotlight({
  image,
  video,
}: {
  image?: string | null;
  video?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    /* the vars live on the hero so veil, torch and ring all follow the pointer */
    const host = node.parentElement ?? node;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = node.getBoundingClientRect();
        host.style.setProperty('--sx', `${Math.round(event.clientX - rect.left)}px`);
        host.style.setProperty('--sy', `${Math.round(event.clientY - rect.top)}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!video && !image) return null;

  return (
    <div className="sf-spot" ref={ref} aria-hidden="true">
      {video ? <video src={video} autoPlay muted loop playsInline /> : <img src={image ?? ''} alt="" />}
    </div>
  );
}
