'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconLayers, IconPlus, IconSearch, IconUpload } from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import StockVideoSearch from '@/components/studio/StockVideoSearch';
import { Modal, Segmented } from '@/components/ui';
import { toast } from '@/lib/toast';
import type { MediaItem } from '@/lib/types';

type Filter = 'all' | 'image' | 'video' | 'logo';

export default function MediaPicker({
  open,
  onClose,
  media,
  selectedIds,
  onConfirm,
  onUploaded,
  multiple = false,
  imagesOnly = false,
  audioOnly = false,
  visualOnly = false,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  media: MediaItem[];
  selectedIds: number[];
  onConfirm: (ids: number[]) => void;
  onUploaded?: (items: MediaItem[]) => void;
  multiple?: boolean;
  imagesOnly?: boolean;
  audioOnly?: boolean;
  /** Videos and photos together – what the reel machine can cut. */
  visualOnly?: boolean;
  /** Restrict the picker to one media type (release cover, master, video …). */
  kind?: 'image' | 'video' | 'audio';
}) {
  const [selection, setSelection] = useState<number[]>(selectedIds);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [source, setSource] = useState<'library' | 'stock'>('library');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelection(selectedIds);
      setQuery('');
      setFilter('all');
      setSource('library');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const only = kind ?? (audioOnly ? 'audio' : imagesOnly ? 'image' : null);
  const stockEnabled = visualOnly || only === 'video';

  const filtered = media.filter((item) => {
    if (visualOnly && (item.mime === 'image/svg+xml' || !(item.mime.startsWith('image/') || item.mime.startsWith('video/')))) {
      return false;
    }
    if (only) {
      if (!item.mime.startsWith(`${only}/`)) return false;
    } else {
      if (filter === 'image' && !item.mime.startsWith('image/')) return false;
      if (filter === 'video' && !item.mime.startsWith('video/')) return false;
      if (filter === 'logo' && item.groupKind !== 'logo' && !item.tags.includes('logo')) return false;
    }
    if (!query.trim()) return true;
    const haystack = [item.title, item.variantLabel, item.groupName, item.tags.join(' '), item.originalName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const toggle = (id: number) => {
    if (!multiple) {
      setSelection([id]);
      return;
    }
    setSelection((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('files', file));
    try {
      const response = await fetch('/api/media', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Upload failed');
      const uploaded: MediaItem[] = data.media ?? [];
      toast(`${uploaded.length} file(s) added to the library`);
      onUploaded?.(uploaded);
      setSelection((current) => [...current, ...uploaded.map((item) => item.id)]);
    } catch (error: any) {
      toast(error.message ?? 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        source === 'stock'
          ? 'Stock clips'
          : only === 'audio'
            ? 'Select audio'
            : only === 'video'
              ? 'Select video'
              : only === 'image'
                ? 'Select image'
                : visualOnly
                  ? 'Select clips'
                  : 'Select media'
      }
      subtitle={
        source === 'stock'
          ? 'Free-to-use footage – copied into your media library, then cut in the reel.'
          : only === 'audio'
          ? 'The finished master – plays at the top of the release.'
          : only === 'video'
            ? 'Music video, Canvas loop or cutdown footage.'
            : visualOnly
              ? 'Videos and photos for the reel – order of selection = order of cuts.'
              : multiple
              ? 'Selection order = carousel order'
              : imagesOnly
                ? 'One image for this document'
                : only === 'image'
                  ? 'Cover artwork, press photo or teaser still.'
                  : 'One media item for this post'
      }
      footer={
        <>
          <span className="small muted" style={{ marginRight: 'auto' }}>
            {selection.length} selected
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onConfirm(selection);
              onClose();
            }}
          >
            Apply
            <IconCheck size={15} />
          </button>
        </>
      }
    >
      <div className="row wrap between" style={{ marginBottom: 14, gap: 10 }}>
        {stockEnabled ? (
          <Segmented
            value={source}
            onChange={(value) => setSource(value)}
            options={[
              { value: 'library', label: 'Library' },
              { value: 'stock', label: 'Stock videos' },
            ]}
          />
        ) : null}
        {source === 'library' ? (
          <>
            <div className="picker-search">
              <IconSearch size={15} />
              <input
                className="input"
                placeholder="Search – title, version, tag …"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {only ? null : (
              <Segmented
                value={filter}
                onChange={(value) => setFilter(value as Filter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'image', label: 'Images' },
                  { value: 'logo', label: 'Logos' },
                  { value: 'video', label: 'Video' },
                ]}
              />
            )}
            <button type="button" className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <IconUpload size={14} />
              {uploading ? 'Uploading …' : 'Upload'}
            </button>
            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              accept={
                only === 'audio'
                  ? 'audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac'
                  : only === 'video'
                    ? 'video/*'
                    : only === 'image'
                      ? 'image/*'
                      : visualOnly
                        ? 'image/*,video/*'
                        : 'image/*,video/*,audio/*'
              }
              onChange={(event) => handleUpload(event.target.files)}
            />
          </>
        ) : null}
      </div>

      {source === 'stock' ? (
        <StockVideoSearch
          onUse={(item) => {
            onUploaded?.([item]);
            setSelection((current) => (multiple ? [...current, item.id] : [item.id]));
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <IconPlus size={22} />
          </div>
          <h3>
            {only === 'audio'
              ? 'No audio found'
              : only === 'video'
                ? 'No video found'
                : visualOnly
                  ? 'Noch keine Fotos oder Videos'
                  : 'No media found'}
          </h3>
          <p>
            {only === 'audio'
              ? 'Upload an MP3, WAV or FLAC – or pick one from the library.'
              : only === 'video'
                ? 'Upload an MP4/MOV – or pick one from the library.'
                : visualOnly
                  ? 'Für Reels: PNG, JPG, WebP oder MP4. SVG-Grafiken kann der Renderer nicht lesen.'
                  : 'Upload files or adjust the filter.'}
          </p>
        </div>
      ) : (
        <div className="picker-grid">
          {filtered.map((item) => {
            const index = selection.indexOf(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`picker-item ${index >= 0 ? 'selected' : ''}`}
                onClick={() => toggle(item.id)}
                title={`${item.title}${item.variantLabel ? ` · ${item.variantLabel}` : ''}`}
              >
                <MediaThumb
                  media={item}
                  className={`picker-thumb ${item.groupKind === 'logo' ? 'contain' : ''}`}
                />
                {index >= 0 ? (
                  <span className="picker-check">{multiple ? index + 1 : <IconCheck size={13} />}</span>
                ) : null}
                <span className="picker-meta">
                  <span className="picker-title truncate">{item.title}</span>
                  {item.variantLabel ? <span className="picker-variant truncate">{item.variantLabel}</span> : null}
                </span>
                {item.usedIn > 0 ? (
                  <span className="picker-used">
                    <IconLayers size={10} /> {item.usedIn}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
