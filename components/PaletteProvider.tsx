'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_ACCENT, DEFAULT_PALETTE, applyAccent } from '@/lib/palette';
import type { PaletteColor } from '@/lib/types';

const PaletteContext = createContext<PaletteColor[]>(DEFAULT_PALETTE);
const AccentContext = createContext<string>(DEFAULT_ACCENT);
const Accent2Context = createContext<string | null>(null);

export const usePalette = () => useContext(PaletteContext);
export const useAccent = () => useContext(AccentContext);
export const useAccent2 = () => useContext(Accent2Context);

export default function PaletteProvider({
  children,
  accentHex = DEFAULT_ACCENT,
  accent2Hex = null,
}: {
  children: ReactNode;
  accentHex?: string;
  accent2Hex?: string | null;
}) {
  const [colors, setColors] = useState<PaletteColor[]>(DEFAULT_PALETTE);
  const [accent, setAccent] = useState(accentHex);
  const [accent2, setAccent2] = useState<string | null>(accent2Hex);

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
      if (typeof detail === 'string' && detail) {
        setAccent(detail);
        return;
      }
      if (detail && typeof detail === 'object') {
        if (typeof detail.accent === 'string' && detail.accent) setAccent(detail.accent);
        setAccent2(typeof detail.accent2 === 'string' ? detail.accent2 : null);
      }
    };
    window.addEventListener('accent:updated', onAccent);
    return () => window.removeEventListener('accent:updated', onAccent);
  }, []);

  useEffect(() => {
    applyAccent(accent, accent2);
  }, [accent, accent2]);

  return (
    <PaletteContext.Provider value={colors}>
      <AccentContext.Provider value={accent}>
        <Accent2Context.Provider value={accent2}>{children}</Accent2Context.Provider>
      </AccentContext.Provider>
    </PaletteContext.Provider>
  );
}
