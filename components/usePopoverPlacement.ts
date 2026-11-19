'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Toolbar popovers hang off a 28 px button. On a narrow or short window they
 * would open half outside the screen, so they are shifted sideways and flipped
 * upwards when there is no room below. Measured once after paint – before any
 * transform is applied, so the numbers stay absolute.
 */
export function usePopoverPlacement(open: boolean) {
  const popRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setStyle(undefined);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const pop = popRef.current;
      if (!pop) return;

      const rect = pop.getBoundingClientRect();
      const overflowRight = rect.right - (window.innerWidth - 8);
      const overflowLeft = 8 - rect.left;
      const shiftX = overflowRight > 0 ? -overflowRight : overflowLeft > 0 ? overflowLeft : 0;

      /* measure against the button, not the (already offset) popover */
      const anchor = (pop.offsetParent as HTMLElement | null)?.getBoundingClientRect();
      const spaceBelow = window.innerHeight - (anchor ? anchor.bottom : rect.top) - 8;
      const spaceAbove = (anchor ? anchor.top : rect.top) - 8;
      const flipUp = spaceBelow < rect.height && spaceAbove > spaceBelow;
      const room = flipUp ? spaceAbove : spaceBelow;
      const cap = room > 160 && room < rect.height ? Math.floor(room) : 0;

      if (!shiftX && !flipUp && !cap) return;
      setStyle({
        ...(shiftX ? { transform: `translateX(${shiftX}px)` } : {}),
        ...(flipUp ? { top: 'auto', bottom: 'calc(100% + 8px)' } : {}),
        ...(cap ? { maxHeight: `${cap}px` } : {}),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return { popRef, popStyle: style };
}
