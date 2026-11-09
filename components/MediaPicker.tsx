'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconLayers, IconPlus, IconSearch, IconUpload } from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
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
}: {
  open: boolean;
  onClose: () => void;
  media: MediaItem[];
  selectedIds: number[];
  onConfirm: (ids: number[]) => void;
  onUploaded?: (items: MediaItem[]) => void;
  multiple?: boolean;
  imagesOnly?: boolean;
}) {
  const [selection, setSelection] = useState<number[]>(selectedIds);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelection(selectedIds);
      setQuery('');
      setFilter('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = media.filter((item) => {
    if (imagesOnly && !item.mime.startsWith('image/')) return false;
    if (filter === 'image' && !item.mime.startsWith('image/')) return false;
    if (filter === 'video' && !item.mime.startsWith('video/')) return false;
    if (filter === 'logo' && item.groupKind !== 'logo' && !item.tags.includes('logo')) return false;
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
      title="Select media"
      subtitle={
        multiple
          ? 'Selection order = carousel order'
          : imagesOnly
            ? 'One image for this document'
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
        <div className="picker-search">
          <IconSearch size={15} />
          <input
            className="input"
            placeholder="Search – title, version, tag …"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'image', label: 'Images' },
            { value: 'logo', label: 'Logos' },
            ...(imagesOnly ? [] : [{ value: 'video', label: 'Video' }]),
          ]}
        />
        <button type="button" className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <IconUpload size={14} />
          {uploading ? 'Uploading …' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept={imagesOnly ? 'image/*' : 'image/*,video/*'}
          onChange={(event) => handleUpload(event.target.files)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <IconPlus size={22} />
          </div>
          <h3>No media found</h3>
          <p>Upload files or adjust the filter.</p>
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
