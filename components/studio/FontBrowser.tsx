'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCheck, IconPlus, IconSearch, IconTrash, IconX } from '@/components/icons';
import { Modal } from '@/components/ui';
import type { FontOption } from '@/lib/design';
import { toast } from '@/lib/toast';
import { useCustomFonts } from '@/components/studio/useCustomFonts';

type Hit = { family: string; category: string; variants: number };

/**
 * Search Google's font catalogue and self-host whatever gets picked.
 * Nothing is loaded from Google at runtime after that.
 */
export default function FontBrowser({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (font: FontOption) => void;
}) {
  const { fonts, records, addFont, removeFont, searchFonts } = useCustomFonts();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    async (value: string) => {
      setSearching(true);
      setError(null);
      try {
        setHits(await searchFonts(value));
      } catch (problem: any) {
        setError(problem?.message ?? 'Search failed');
        setHits([]);
      } finally {
        setSearching(false);
      }
    },
    [searchFonts]
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    void runSearch('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, runSearch]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void runSearch(query), 320);
    return () => window.clearTimeout(timer);
  }, [query, open, runSearch]);

  const addedByFamily = new Map(fonts.map((font) => [font.label.toLowerCase(), font]));
  const recordBySlug = new Map(records.map((record) => [record.slug, record]));

  const add = async (family: string) => {
    setBusy(family);
    try {
      const font = await addFont(family);
      toast(`“${family}” added – it now lives on your server`);
      onPick(font);
    } catch (problem: any) {
      toast(problem?.message ?? 'Could not add the font', 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (fontId: string, family: string) => {
    const record = recordBySlug.get(fontId.replace(/^gf-/, ''));
    if (!record) return;
    if (!window.confirm(`Remove “${family}” from the studio?`)) return;
    try {
      await removeFont(record.id);
      toast(`“${family}” removed`);
    } catch (problem: any) {
      toast(problem?.message ?? 'Could not remove the font', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Google Fonts"
      subtitle="Search the catalogue – a font is downloaded once and served from this server."
      footer={
        <>
          <span className="small muted" style={{ marginRight: 'auto' }}>
            {fonts.length} added · {hits.length} results
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="fb">
        <div className="input-icon">
          <IconSearch size={15} />
          <input
            ref={inputRef}
            className="input"
            placeholder="Search e.g. condensed, serif, mono, grotesk …"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="fb-clear" aria-label="Clear" onClick={() => setQuery('')}>
              <IconX size={13} />
            </button>
          ) : null}
        </div>

        {error ? <p className="fb-error">{error}</p> : null}

        <div className="fb-list">
          {searching && !hits.length ? <p className="fb-empty">Searching …</p> : null}
          {!searching && !hits.length && !error ? <p className="fb-empty">Nothing found.</p> : null}

          {hits.map((hit) => {
            const added = addedByFamily.get(hit.family.toLowerCase());
            const isBusy = busy === hit.family;
            return (
              <div className="fb-row" key={hit.family}>
                <div className="fb-row-main">
                  <strong>{hit.family}</strong>
                  <span>
                    {hit.category || 'Google'} · {hit.variants} {hit.variants === 1 ? 'weight' : 'weights'}
                  </span>
                </div>
                {added ? (
                  <div className="fb-row-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => onPick(added)}
                      title="Use this font on the selected text"
                    >
                      <IconCheck size={13} /> Use
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost"
                      aria-label={`Remove ${hit.family}`}
                      onClick={() => remove(added.id, hit.family)}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={isBusy || busy !== null}
                    onClick={() => add(hit.family)}
                  >
                    {isBusy ? 'Adding …' : <><IconPlus size={13} /> Add</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="fb-hint">
          Downloads happen on this server and stay in <code>data/fonts/</code> — no requests to Google when the
          studio is open, and exports keep working offline.
        </p>
      </div>
    </Modal>
  );
}
