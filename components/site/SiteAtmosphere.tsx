'use client';

import { useEffect, useRef } from 'react';

/**
 * Film layer of the public page: grain, scanlines, vignette and a hairline
 * scroll indicator. Everything here is decorative and pointer-transparent.
 */
export default function SiteAtmosphere() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="atmo" aria-hidden="true">
      <div className="atmo-grain" />
      <div className="atmo-scan" />
      <div className="atmo-vignette" />
      <div className="atmo-bar" ref={barRef} style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}
