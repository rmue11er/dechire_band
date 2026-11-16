'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconPlus, IconSearch } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { MediaItem } from '@/lib/types';

type Photo = {
  id: string;
  title: string;
  thumb: string;
  url: string;
  width: number;
  height: number;
  creator: string;
  provider: string;
  source: string;
  license: string;
  pageUrl: string;
};

type Provider = {
  key: string;
  label: string;
  hint: string;
  available: boolean;
  keyEnv?: string;
};

const SUGGESTIONS = [
  'concert crowd',
  'stage smoke',
  'electric guitar',
  'rain window',
  'empty hall',
  'fog forest',
  'hands',
  'moon',
  'typewriter',
  'microphone',
  'rain street night',
  'grain texture',
];

/**
 * Multi-provider stock search. Everything shown is free for commercial use; the
 * keyless sources (Openverse, Wikimedia) always work, Pexels/Unsplash/Pixabay
 * appear as soon as their API key is in the environment.
 */
export default function StockSearch({ onUse }: { onUse: (item: MediaItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Photo[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState<'all' | string>('all');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [searched, setSearched] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState<{ provider: string; error: string }[]>([]);
  const requestRef = useRef(0);

  /* which providers exist – also tells the user what a key would unlock */
  useEffect(() => {
    fetch('/api/stock/search')
      .then((response) => response.json())
      .then((data) => setProviders(data.providers ?? []))
      .catch(() => setProviders([]));
  }, []);

  const search = useCallback(
    async (term: string, nextPage = 1, nextProvider = provider) => {
      const value = term.trim();
      if (value.length < 2) return;
      const token = requestRef.current + 1;
      requestRef.current = token;
      setLoading(true);
      setSearched(value);
      try {
        const params = new URLSearchParams({
          q: value,
          page: String(nextPage),
          provider: nextProvider,
        });
        const response = await fetch(`/api/stock/search?${params}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Search failed');
        if (requestRef.current !== token) return;
        setResults((current) => (nextPage === 1 ? data.results ?? [] : [...current, ...(data.results ?? [])]));
        setPage(nextPage);
        setHasMore(Boolean(data.hasMore));
        setFailed(Array.isArray(data.failed) ? data.failed : []);
        if (Array.isArray(data.providers)) setProviders(data.providers);
      } catch (error: any) {
        toast(error.message ?? 'Search failed', 'error');
      } finally {
        if (requestRef.current === token) setLoading(false);
      }
    },
    [provider]
  );

  const pick = (key: 'all' | string) => {
    setProvider(key);
    if (searched) void search(searched, 1, key);
  };

  const use = async (photo: Photo) => {
    setImporting(photo.id);
    try {
      const response = await fetch('/api/stock/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photo.url,
          title: photo.title,
          provider: photo.source,
          license: photo.license,
          creator: photo.creator,
          pageUrl: photo.pageUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not import the photo');
      onUse(data.media as MediaItem);
      toast('Photo added to the library and placed');
    } catch (error: any) {
      toast(error.message ?? 'Could not import the photo', 'error');
    } finally {
      setImporting(null);
    }
  };

  const locked = providers.filter((entry) => !entry.available);

  return (
    <div className="stock">
      <form
        className="stock-search"
        onSubmit={(event) => {
          event.preventDefault();
          search(query, 1);
        }}
      >
        <IconSearch size={14} />
        <input
          className="input"
          value={query}
          placeholder="smoke, crowd, rain …"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="btn btn-sm" disabled={loading}>
          {loading ? '…' : 'Go'}
        </button>
      </form>

      <div className="stock-providers">
        <button
          type="button"
          className={`stock-provider ${provider === 'all' ? 'is-active' : ''}`}
          onClick={() => pick('all')}
        >
          Alle
        </button>
        {providers.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`stock-provider ${provider === entry.key ? 'is-active' : ''} ${
              entry.available ? '' : 'is-locked'
            }`}
            onClick={() => (entry.available ? pick(entry.key) : undefined)}
            disabled={!entry.available}
            title={entry.available ? entry.hint : `${entry.hint} (${entry.keyEnv})`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="stock-note">
        Alles hier ist kostenlos kommerziell nutzbar. Die Datei wird in die eigene Mediathek kopiert – danach
        gehört sie zum Projekt, unabhängig vom Anbieter.
        {locked.length ? (
          <>
            {' '}
            Für {locked.map((entry) => entry.label).join(', ')} fehlt noch ein API-Key (
            {[...new Set(locked.map((entry) => entry.keyEnv).filter(Boolean))].join(', ')}) – eintragen und
            neu starten.
          </>
        ) : null}
      </p>

      {failed.length ? (
        <p className="stock-note stock-note-warn">
          {failed.map((entry) => `${entry.provider}: ${entry.error}`).join(' · ')}
        </p>
      ) : null}

      {results.length === 0 && !loading ? (
        <div className="stock-suggestions">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="stock-chip"
              onClick={() => {
                setQuery(item);
                search(item, 1);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="stock-grid">
          {results.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="stock-tile"
              onClick={() => use(photo)}
              disabled={importing !== null}
              title={`${photo.title}${photo.creator ? ` · ${photo.creator}` : ''} · ${photo.license}`}
            >
              <img src={photo.thumb} alt="" loading="lazy" />
              <span className="stock-tile-badge">
                {importing === photo.id ? '…' : <IconPlus size={13} />}
              </span>
              <span className="stock-tile-meta">
                {photo.provider}
                {photo.creator ? ` · ${photo.creator}` : ''}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <span className="mono small muted">Searching “{searched}” …</span> : null}

      {hasMore && !loading ? (
        <button
          type="button"
          className="btn btn-sm btn-ghost stock-more"
          onClick={() => search(searched, page + 1)}
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}
