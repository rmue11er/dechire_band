'use client';

import { useCallback, useRef, useState } from 'react';
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
  license: string;
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
 * Search over Openverse (CC0 / public domain only) and pull the chosen photo
 * into the band's own media library – no credit, no licence fee, and the export
 * keeps working because the file is served from our own origin afterwards.
 */
export default function StockSearch({ onUse }: { onUse: (item: MediaItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [searched, setSearched] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const requestRef = useRef(0);

  const search = useCallback(
    async (term: string, nextPage = 1) => {
      const value = term.trim();
      if (value.length < 2) return;
      const token = requestRef.current + 1;
      requestRef.current = token;
      setLoading(true);
      setSearched(value);
      try {
        const response = await fetch(
          `/api/stock/search?q=${encodeURIComponent(value)}&page=${nextPage}`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Search failed');
        if (requestRef.current !== token) return;
        setResults((current) => (nextPage === 1 ? data.results ?? [] : [...current, ...(data.results ?? [])]));
        setPage(nextPage);
        setHasMore(Boolean(data.hasMore));
      } catch (error: any) {
        toast(error.message ?? 'Search failed', 'error');
      } finally {
        if (requestRef.current === token) setLoading(false);
      }
    },
    []
  );

  const use = async (photo: Photo) => {
    setImporting(photo.id);
    try {
      const response = await fetch('/api/stock/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photo.url,
          title: photo.title,
          provider: photo.provider,
          license: photo.license,
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

      <p className="stock-note">
        CC0 / public domain via Openverse – free for the band, no credit needed. The photo is copied into
        your media library.
      </p>

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
              title={`${photo.title}${photo.creator ? ` · ${photo.creator}` : ''}`}
            >
              <img src={photo.thumb} alt="" loading="lazy" />
              <span className="stock-tile-badge">
                {importing === photo.id ? '…' : <IconPlus size={13} />}
              </span>
              <span className="stock-tile-meta">
                CC0 {photo.provider ? `· ${photo.provider}` : ''}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <span className="mono small muted">Searching “{searched}” …</span> : null}

      {hasMore && !loading ? (
        <button type="button" className="btn btn-sm btn-ghost stock-more" onClick={() => search(searched, page + 1)}>
          Load more
        </button>
      ) : null}
    </div>
  );
}
