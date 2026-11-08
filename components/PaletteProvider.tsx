'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_ACCENT, DEFAULT_PALETTE, applyAccent } from '@/lib/palette';
import type { PaletteColor } from '@/lib/types';

const PaletteContext = createContext<PaletteColor[]>(DEFAULT_PALETTE);
const AccentContext = createContext<string>(DEFAULT_ACCENT);

export const usePalette = () => useContext(PaletteContext);
export const useAccent = () => useContext(AccentContext);

export default function PaletteProvider({
  children,
  accentHex = DEFAULT_ACCENT,
}: {
  children: ReactNode;
  accentHex?: string;
}) {
  const [colors, setColors] = useState<PaletteColor[]>(DEFAULT_PALETTE);
  const [accent, setAccent] = useState(accentHex);

  useEffect(() => {
    const load = () => {
      fetch('/api/palette')
        .then((response) => response.json())
        .then((data) => {
          if (Array.isArray(data.colors) && data.colors.length) setColors(data.colors);
        })
        .catch(() => {
          /* Offline: the default CI stays active */
        });
    };

    load();

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (Array.isArray(detail) && detail.length) setColors(detail);
      else load();
    };

    window.addEventListener('palette:updated', onUpdate);
    return () => window.removeEventListener('palette:updated', onUpdate);
  }, []);

  useEffect(() => {
    const onAccent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (typeof detail === 'string' && detail) setAccent(detail);
    };
    window.addEventListener('accent:updated', onAccent);
    return () => window.removeEventListener('accent:updated', onAccent);
  }, []);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  return (
    <PaletteContext.Provider value={colors}>
      <AccentContext.Provider value={accent}>{children}</AccentContext.Provider>
    </PaletteContext.Provider>
  );
}
