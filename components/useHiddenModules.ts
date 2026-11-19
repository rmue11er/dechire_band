'use client';

import { useEffect, useState } from 'react';
import {
  HIDDEN_MODULES_EVENT,
  HIDDEN_MODULES_KEY,
  normaliseHiddenModules,
} from '@/lib/modules';

/*
 * One tiny store for "which modules are switched off" so the sidebar and the
 * command palette share a single request and react to a change in Settings
 * without a reload.
 */
let cache: string[] | null = null;
let request: Promise<string[]> | null = null;
const listeners = new Set<(hidden: string[]) => void>();

const readStored = (): string[] => {
  try {
    const raw = window.localStorage.getItem(HIDDEN_MODULES_KEY);
    return raw ? normaliseHiddenModules(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

function publish(list: string[]) {
  cache = list;
  try {
    window.localStorage.setItem(HIDDEN_MODULES_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked – the server value still holds */
  }
  listeners.forEach((listener) => listener(list));
}

/** Called by the settings page after saving – updates every mounted consumer. */
export function setHiddenModules(list: unknown) {
  publish(normaliseHiddenModules(list));
}

export function refreshHiddenModules(): Promise<string[]> {
  if (!request) {
    request = fetch('/api/profile')
      .then((response) => response.json())
      .then((data) => normaliseHiddenModules(data?.profile?.hiddenModules))
      .catch(() => cache ?? readStored())
      .then((list) => {
        publish(list);
        return list;
      })
      .finally(() => {
        request = null;
      });
  }
  return request;
}

export function useHiddenModules(): string[] {
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    setHidden(cache ?? readStored());
    listeners.add(setHidden);
    if (cache === null) refreshHiddenModules();

    const onUpdate = (event: Event) => publish(normaliseHiddenModules((event as CustomEvent).detail));
    window.addEventListener(HIDDEN_MODULES_EVENT, onUpdate);
    return () => {
      listeners.delete(setHidden);
      window.removeEventListener(HIDDEN_MODULES_EVENT, onUpdate);
    };
  }, []);

  return hidden;
}
