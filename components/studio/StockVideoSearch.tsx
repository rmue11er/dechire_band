'use client';

import { useCallback, useRef, useState } from 'react';
import { IconCheck, IconFilm, IconPlus, IconSearch } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { MediaItem } from '@/lib/types';

type Clip = {
  id: string;
  title: string;
  thumb: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  creator: string;
  provider: string;
  license: string;
};

const SUGGESTIONS = [
  'stage smoke',
  'crowd',
  'rain window',
  'fog',
  'city night',
  'light leak',
  'hands',
  'fire',
  'ocean night',
  'forest dark',
  'guitar',
  'empty room',
];

const clock = (seconds: number) => {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
};

/**
 * Free stock clips for the reel machine. Imports the chosen file into the
 * media library so the preview, ffmpeg render and the licence all stay local.
 */
export default function StockVideoSearch({ onUse }: { onUse: (item: MediaItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<string[]>([]);
  const [searched, setSearched] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [keyed, setKeyed] = useState<boolean | null>(null);
  const requestRef = useRef(0);

  const search = useCallback(async (term: string, nextPage = 1) => {
    const value = term.trim();
    if (value.length < 2) return;
    const token = requestRef.current + 1;
    requestRef.current = token;
    setLoading(true);
    setSearched(value);
    try {
      const response = await fetch(
        `/api/stock/videos/search?q=${encodeURIComponent(value)}&page=${nextPage}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Search failed');
      if (requestRef.current !== token) return;
      setResults((current) => (nextPage === 1 ? data.results ?? [] : [...current, ...(data.results ?? [])]));
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
      setKeyed(Boolean(data.keyed));
    } catch (error: any) {
      toast(error.message ?? 'Search failed', 'error');
    } finally {
      if (requestRef.current === token) setLoading(false);
    }
  }, []);

  const use = async (clip: Clip) => {
    setImporting(clip.id);
    try {
      const response = await fetch('/api/stock/videos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: clip.url,
          title: clip.title,
          provider: clip.provider,
          license: clip.license,
          creator: clip.creator,
          width: clip.width,
          height: clip.height,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not import the clip');
      const media = data.media as MediaItem;
      onUse(media);
      setImported((current) => [...current, clip.id]);
      toast('Clip added to your selection');
    } catch (error: any) {
      toast(error.message ?? 'Could not import the clip', 'error');
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
          placeholder="smoke, crowd, rain, neon …"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="btn btn-sm" disabled={loading}>
          {loading ? '…' : 'Go'}
        </button>
      </form>

      <p className="stock-note">
        {keyed
          ? 'Free stock clips via Pexels – free for commercial use, no credit needed. Copied into your library.'
          : 'Free-to-use clips via Wikimedia Commons (CC0, public domain or CC BY). Author and licence are stored with the file.'}
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
          {results.map((clip) => {
            const done = imported.includes(clip.id);
            return (
              <button
                key={clip.id}
                type="button"
                className={`stock-tile ${done ? 'is-added' : ''}`}
                onClick={() => (done ? undefined : use(clip))}
                disabled={importing !== null || done}
                title={`${clip.title}${clip.creator ? ` · ${clip.creator}` : ''}${
                  clip.license ? ` · ${clip.license}` : ''
                }`}
              >
                {clip.thumb ? (
                  <img src={clip.thumb} alt="" loading="lazy" />
                ) : (
                  <span className="stock-tile-fallback">
                    <IconFilm size={18} />
                  </span>
                )}
                <span className="stock-tile-badge">
                  {importing === clip.id ? '…' : done ? <IconCheck size={13} /> : <IconPlus size={13} />}
                </span>
                <span className="stock-tile-duration">{clock(clip.duration)}</span>
                <span className="stock-tile-meta">
                  {clip.provider}
                  {clip.creator ? ` · ${clip.creator}` : ''}
                </span>
              </button>
            );
          })}
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
