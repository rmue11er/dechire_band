'use client';

import { useSyncExternalStore } from 'react';
import { registerFonts, type FontOption } from '@/lib/design';

/**
 * Tiny store for self-hosted Google Fonts.
 *
 * The `@font-face` rules are injected as a `<style>` tag (not a linked
 * stylesheet) so `html-to-image` can read them on export without any CORS
 * trouble, and `registerFonts` makes the families resolvable by id.
 */
export interface FontBundle {
  fonts: FontOption[];
  css: string;
}

export interface FontRecord {
  id: number;
  family: string;
  slug: string;
  category: string;
  weights: number[];
  files: { filename: string; weight: number; subset: string; size: number }[];
  createdAt: string;
}

interface Payload extends FontBundle {
  records?: FontRecord[];
}

const EMPTY: FontBundle = { fonts: [], css: '' };

let bundle: FontBundle = EMPTY;
let records: FontRecord[] = [];
let loading: Promise<void> | null = null;
let styleElement: HTMLStyleElement | null = null;
const listeners = new Set<() => void>();

function apply(payload: Payload | null) {
  bundle = { fonts: payload?.fonts ?? [], css: payload?.css ?? '' };
  if (Array.isArray(payload?.records)) records = payload.records;
  registerFonts(bundle.fonts);

  if (typeof document !== 'undefined') {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'studio-custom-fonts';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = bundle.css;
  }

  listeners.forEach((listener) => listener());
}

function load(): Promise<void> {
  if (!loading) {
    loading = fetch('/api/fonts')
      .then((response) => response.json())
      .then((data) => apply(data))
      .catch(() => {
        /* offline or first install – the built-in fonts still work */
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  void load();
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => bundle;
const getServerSnapshot = () => EMPTY;

export async function addFont(family: string): Promise<FontOption> {
  const response = await fetch('/api/fonts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ family }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not add the font');
  apply(data);
  const added = (data.fonts as FontOption[]).find((font) => font.label === family);
  if (!added) throw new Error('Font was downloaded but is not in the list');
  return added;
}

export async function removeFont(id: number) {
  const response = await fetch(`/api/fonts/${id}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not remove the font');
  apply(data);
}

export async function searchFonts(query: string) {
  const response = await fetch(`/api/fonts/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Search failed');
  return data.results as { family: string; category: string; variants: number }[];
}

/** Subscribes to the store – the first subscriber kicks off the request. */
export function useCustomFonts() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { fonts: snapshot.fonts, records, addFont, removeFont, searchFonts };
}
