'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  IconChevronRight,
  IconCopy,
  IconDownload,
  IconFolder,
  IconImage,
  IconLayers,
  IconMusic,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import { EmptyState, Field, Modal, PageHead, Segmented, Spinner } from '@/components/ui';
import { formatDate, formatBytes } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { MediaFolder, MediaGroup, MediaItem, Song } from '@/lib/types';

type Filter = 'all' | 'image' | 'video' | 'logo';

const KIND_LABEL: Record<string, string> = {
  logo: 'Logo',
  photo: 'Photo',
  artwork: 'Artwork',
  merch: 'Merch',
  video: 'Video',
  other: 'Other',
};

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [groups, setGroups] = useState<MediaGroup[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  /** 'all' = no song filter, 'none' = unlinked, otherwise a song id */
  const [songFilter, setSongFilter] = useState<'all' | 'none' | number>('all');
  /** 'all' = everything, 'unfiled' = no folder, otherwise a folder id */
  const [place, setPlace] = useState<'all' | 'unfiled' | number>('all');
  const [folderModal, setFolderModal] = useState<{ id?: number; parentId: number | null; name: string } | null>(
    null
  );
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'files' | 'groups'>('files');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [activeGroup, setActiveGroup] = useState<MediaGroup | null>(null);
  const [groupModal, setGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', kind: 'artwork' });
  const [edit, setEdit] = useState({ title: '', variantLabel: '', alt: '', tags: '', groupId: '', folderId: '', songId: '' });
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<{ id: number; status: string; caption: string; scheduledAt: string | null; publishedAt: string | null }[]>([]);
  const [replacing, setReplacing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/media');
    const data = await response.json();
    setMedia(data.media ?? []);
    setGroups(data.groups ?? []);
    setFolders(data.folders ?? []);
    setSongs(data.songs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('song');
    if (!raw) return;
    if (raw === 'none') setSongFilter('none');
    else if (Number(raw) > 0) setSongFilter(Number(raw));
  }, []);

  useEffect(() => {
    if (activeMedia) {
      setEdit({
        title: activeMedia.title,
        variantLabel: activeMedia.variantLabel,
        alt: activeMedia.alt,
        tags: activeMedia.tags.join(', '),
        groupId: activeMedia.groupId ? String(activeMedia.groupId) : '',
        folderId: activeMedia.folderId ? String(activeMedia.folderId) : '',
        songId: activeMedia.songId ? String(activeMedia.songId) : '',
      });
      fetch(`/api/media/${activeMedia.id}`)
        .then((response) => response.json())
        .then((data) => setUsage(data.usage ?? []))
        .catch(() => setUsage([]));
    } else {
      setUsage([]);
    }
  }, [activeMedia]);

  const replaceFile = async (files: FileList | null) => {
    if (!activeMedia || !files?.length) return;
    setReplacing(true);
    const form = new FormData();
    form.append('file', files[0]);
    try {
      const response = await fetch(`/api/media/${activeMedia.id}/replace`, { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not replace the file');
      setActiveMedia(data.media);
      await load();
      toast('File replaced – every post keeps using this asset');
    } catch (error: any) {
      toast(error.message ?? 'Could not replace the file', 'error');
    } finally {
      setReplacing(false);
      if (replaceInput.current) replaceInput.current.value = '';
    }
  };

  const upload = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    const form = new FormData();
    list.forEach((file) => form.append('files', file));
    if (typeof place === 'number') form.append('folderId', String(place));
    if (typeof songFilter === 'number') form.append('songId', String(songFilter));
    try {
      const response = await fetch('/api/media', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Upload failed');
      toast(`${data.media?.length ?? 0} file(s) added`);
      await load();
    } catch (error: any) {
      toast(error.message ?? 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const saveEdit = async () => {
    if (!activeMedia) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/media/${activeMedia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: edit.title,
          variantLabel: edit.variantLabel,
          alt: edit.alt,
          tags: edit.tags
            .split(',')
            .map((tag) => tag.trim().replace(/^#/, ''))
            .filter(Boolean),
          groupId: edit.groupId ? Number(edit.groupId) : null,
          folderId: edit.folderId ? Number(edit.folderId) : null,
          songId: edit.songId ? Number(edit.songId) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      await load();
      setActiveMedia(null);
      toast('Media details saved');
    } catch (error: any) {
      toast(error.message ?? 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeMedia = async () => {
    if (!activeMedia) return;
    if (!window.confirm(`Delete "${activeMedia.title}"?`)) return;
    try {
      const response = await fetch(`/api/media/${activeMedia.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setActiveMedia(null);
      await load();
      toast('File deleted');
    } catch (error: any) {
      toast(error.message ?? 'Failed to delete', 'error');
    }
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    try {
      const response = await fetch('/api/media-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });
      if (!response.ok) throw new Error('Could not create the group');
      setGroupModal(false);
      setNewGroup({ name: '', kind: 'artwork' });
      await load();
      toast('Asset group created');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const copyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${item.url}`);
      toast('File URL copied');
    } catch {
      toast('Could not copy', 'error');
    }
  };

  const saveFolder = async () => {
    if (!folderModal) return;
    const name = folderModal.name.trim();
    if (!name) {
      toast('Folder name is required', 'error');
      return;
    }
    try {
      const response = folderModal.id
        ? await fetch(`/api/media/folders/${folderModal.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId: folderModal.parentId }),
          })
        : await fetch('/api/media/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId: folderModal.parentId }),
          });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the folder');
      setFolders(data.folders ?? []);
      setFolderModal(null);
      toast(folderModal.id ? 'Folder renamed' : 'Folder created');
    } catch (error: any) {
      toast(error.message ?? 'Could not save the folder', 'error');
    }
  };

  const removeFolder = async (folder: MediaFolder) => {
    if (!window.confirm(`Delete the folder “${folder.name}”? Files move one level up.`)) return;
    try {
      const response = await fetch(`/api/media/folders/${folder.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not delete the folder');
      setFolders(data.folders ?? []);
      setPlace(folder.parentId ?? 'all');
      await load();
      toast('Folder deleted');
    } catch (error: any) {
      toast(error.message ?? 'Could not delete the folder', 'error');
    }
  };

  const moveTo = async (folderId: number | null, ids?: number[]) => {
    const list = ids ?? (dragId ? [dragId] : []);
    setDragId(null);
    setDropTarget(null);
    if (!list.length) return;
    try {
      const response = await fetch('/api/media/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: list, folderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not move the files');
      setMedia(data.media ?? []);
      setFolders((await (await fetch('/api/media/folders')).json()).folders ?? []);
      toast(list.length === 1 ? 'File moved' : `${list.length} files moved`);
    } catch (error: any) {
      toast(error.message ?? 'Could not move the files', 'error');
    }
  };

  const currentFolder = typeof place === 'number' ? folders.find((folder) => folder.id === place) ?? null : null;
  const childFolders = currentFolder ? folders.filter((folder) => folder.parentId === currentFolder.id) : [];
  const scoped =
    place === 'all' ? media : media.filter((item) => (place === 'unfiled' ? item.folderId == null : item.folderId === place));

  const crumbs: MediaFolder[] = [];
  if (currentFolder) {
    let cursor: MediaFolder | null = currentFolder;
    while (cursor) {
      crumbs.unshift(cursor);
      const parentId = cursor.parentId;
      cursor = parentId == null ? null : folders.find((folder) => folder.id === parentId) ?? null;
    }
  }

  const filtered = scoped.filter((item) => {
    if (filter === 'image' && !item.mime.startsWith('image/')) return false;
    if (filter === 'video' && !item.mime.startsWith('video/')) return false;
    if (filter === 'logo' && item.groupKind !== 'logo' && !item.tags.includes('logo')) return false;
    if (songFilter === 'none' && item.songId) return false;
    if (typeof songFilter === 'number' && item.songId !== songFilter) return false;
    if (!query.trim()) return true;
    const haystack = [
      item.title,
      item.variantLabel,
      item.groupName,
      item.folderName,
      item.songTitle,
      item.originalName,
      item.tags.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  if (loading) return <Spinner label="Sorting the library" />;

  return (
    <div
      className="media-page"
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        upload(event.dataTransfer.files);
      }}
    >
      <PageHead
        eyebrow="Media library"
        title={
          <>
            Assets<span className="slash">/</span>Archive
          </>
        }
        sub="Every logo, every photo, every version in one place. Sort them into folders, group the variants."
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFolderModal({ parentId: currentFolder?.id ?? null, name: '' })}
            >
              <IconFolder size={15} />
              New folder
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setGroupModal(true)}>
              <IconFolder size={15} />
              Asset group
            </button>
            <button type="button" className="btn btn-primary" onClick={() => fileInput.current?.click()}>
              <IconUpload size={15} />
              {uploading ? 'Uploading …' : 'Upload files'}
            </button>
          </>
        }
      />

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept="image/*,video/*"
        onChange={(event) => upload(event.target.files)}
      />

      <div className="media-toolbar">
        <div className="media-search">
          <IconSearch size={15} />
          <input
            className="input"
            placeholder="Search titles, versions, tags …"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="select media-song-filter"
          value={songFilter}
          onChange={(event) => {
            const value = event.target.value;
            setSongFilter(value === 'all' || value === 'none' ? value : Number(value));
          }}
          aria-label="Filter by song"
        >
          <option value="all">All songs</option>
          <option value="none">No song</option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title}
            </option>
          ))}
        </select>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'image', label: 'Images' },
            { value: 'logo', label: 'Logos' },
            { value: 'video', label: 'Video' },
          ]}
        />
        <Segmented
          value={view}
          onChange={(value) => setView(value)}
          options={[
            { value: 'files', label: 'Files' },
            { value: 'groups', label: 'Asset groups' },
          ]}
        />
      </div>

      {typeof songFilter === 'number' ? (
        <p className="media-song-hint">
          <IconMusic size={12} />
          Uploads land under <strong>{songs.find((song) => song.id === songFilter)?.title ?? 'this song'}</strong> – open
          the song to see documents and the rest of its media.
        </p>
      ) : null}

      <div className="media-shell">
        <aside className="folder-rail">
          <div className="folder-rail-head">
            <span>Folders</span>
            <button
              type="button"
              className="btn btn-icon"
              title="New folder"
              onClick={() => setFolderModal({ parentId: currentFolder?.id ?? null, name: '' })}
            >
              <IconPlus size={13} />
            </button>
          </div>

          <button
            type="button"
            className={`folder-row root ${place === 'all' ? 'on' : ''}`}
            onClick={() => setPlace('all')}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTarget('all');
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(event) => {
              event.preventDefault();
              moveTo(null);
            }}
          >
            <IconLayers size={14} />
            <span className="truncate">All files</span>
            <em>{media.length}</em>
          </button>

          <button
            type="button"
            className={`folder-row root ${place === 'unfiled' ? 'on' : ''} ${dropTarget === 'unfiled' ? 'drop' : ''}`}
            onClick={() => setPlace('unfiled')}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTarget('unfiled');
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(event) => {
              event.preventDefault();
              moveTo(null);
            }}
          >
            <IconFolder size={14} />
            <span className="truncate">Unfiled</span>
            <em>{media.filter((item) => item.folderId == null).length}</em>
          </button>

          {folders.length ? <span className="folder-divider" /> : null}

          {folders.map((folder) => (
            <button
              key={`${folder.id}-${dragId ?? 'none'}`}
              type="button"
              className={`folder-row ${place === folder.id ? 'on' : ''} ${
                dropTarget === `folder-${folder.id}` ? 'drop' : ''
              }`}
              style={{ paddingLeft: 10 + folder.depth * 14 }}
              onClick={() => setPlace(folder.id)}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(`folder-${folder.id}`);
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(event) => {
                event.preventDefault();
                moveTo(folder.id);
              }}
            >
              <IconFolder size={13} />
              <span className="truncate">{folder.name}</span>
              <em>{folder.total}</em>
            </button>
          ))}

          {folders.length === 0 ? <p className="folder-empty">No folders yet – create one to sort the archive.</p> : null}
        </aside>

        <div className="media-content">
          {currentFolder ? (
            <div className="folder-bar">
              <div className="folder-crumbs">
                <button type="button" onClick={() => setPlace('all')}>
                  All files
                </button>
                {crumbs.map((crumb, index) => (
                  <span key={crumb.id}>
                    <IconChevronRight size={11} />
                    <button
                      type="button"
                      className={index === crumbs.length - 1 ? 'current' : ''}
                      onClick={() => setPlace(crumb.id)}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
              <div className="folder-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setFolderModal({ parentId: currentFolder.id, name: '' })}
                >
                  <IconPlus size={13} /> Subfolder
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  title="Rename folder"
                  onClick={() =>
                    setFolderModal({ id: currentFolder.id, parentId: currentFolder.parentId, name: currentFolder.name })
                  }
                >
                  <IconPencil size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  title="Delete folder"
                  onClick={() => removeFolder(currentFolder)}
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </div>
          ) : place === 'unfiled' ? (
            <div className="folder-bar">
              <div className="folder-crumbs">
                <button type="button" onClick={() => setPlace('all')}>
                  All files
                </button>
                <span>
                  <IconChevronRight size={11} />
                  <button type="button" className="current">
                    Unfiled
                  </button>
                </span>
              </div>
            </div>
          ) : null}

          {view === 'groups' ? (
        groups.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={<IconFolder size={24} />}
              title="No asset groups yet"
              hint="Group your logo in all its variants – transparent, white, sticker, avatar."
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setGroupModal(true)}>
                  <IconPlus size={14} /> Create group
                </button>
              }
            />
          </div>
        ) : (
          <div className="group-grid">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="group-card"
                onClick={() => setActiveGroup(group)}
              >
                <div className="group-stack">
                  {group.previews.length === 0 ? (
                    <div className="group-stack-empty">
                      <IconImage size={20} />
                    </div>
                  ) : (
                    group.previews
                      .slice(0, 3)
                      .map((url, index) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="group-stack-img"
                          style={{ zIndex: 3 - index, transform: `translate(${index * 8}px, ${index * -6}px)` }}
                        />
                      ))
                  )}
                </div>
                <div className="group-info">
                  <span className="chip accent">{KIND_LABEL[group.kind] ?? group.kind}</span>
                  <h3>{group.name}</h3>
                  <span className="mono small muted">
                    {group.count} {group.count === 1 ? 'version' : 'versions'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )
      ) : filtered.length === 0 && childFolders.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<IconImage size={24} />}
            title={place === 'all' ? 'No files found' : 'This folder is empty'}
            hint="Drag files into this window, drop them onto a folder or use the upload button."
          />
        </div>
      ) : (
        <>
          {childFolders.length ? (
            <div className="folder-grid">
              {childFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={`folder-card ${dropTarget === `folder-${folder.id}` ? 'drop' : ''}`}
                  onClick={() => setPlace(folder.id)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTarget(`folder-${folder.id}`);
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    moveTo(folder.id);
                  }}
                >
                  <IconFolder size={22} />
                  <strong className="truncate">{folder.name}</strong>
                  <span className="mono">
                    {folder.total} {folder.total === 1 ? 'file' : 'files'}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {filtered.length ? (
            <div className="asset-grid">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className={`asset-card ${dragId === item.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(item.id));
                    setDragId(item.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropTarget(null);
                  }}
                >
              <button type="button" className="asset-thumb" onClick={() => setActiveMedia(item)}>
                <MediaThumb
                  media={item}
                  className={`asset-thumb-img ${item.groupKind === 'logo' ? 'contain' : ''}`}
                />
                {item.variantLabel ? <span className="asset-variant-badge">{item.variantLabel}</span> : null}
              </button>
              <div className="asset-body">
                <div className="asset-title truncate" title={item.title}>
                  {item.title}
                </div>
                <div className="asset-sub truncate">{item.folderName ?? item.groupName ?? 'Unfiled'}</div>
                {item.songTitle ? (
                  <div className="asset-song truncate" title={`Song: ${item.songTitle}`}>
                    <IconMusic size={10} /> {item.songTitle}
                  </div>
                ) : null}
                <div className="asset-meta">
                  <span className="mono">
                    {item.width && item.height ? `${item.width}×${item.height}` : item.mime.split('/')[1]}
                  </span>
                  <span className="mono">{formatBytes(item.size)}</span>
                  {item.usedIn > 0 ? (
                    <span className="chip">
                      <IconLayers size={10} /> {item.usedIn}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="asset-actions">
                <a
                  className="btn btn-icon"
                  href={`${item.url}?download=1`}
                  title="Download"
                  onClick={(event) => event.stopPropagation()}
                >
                  <IconDownload size={14} />
                </a>
                <button
                  type="button"
                  className="btn btn-icon"
                  title="Copy URL"
                  onClick={() => copyUrl(item)}
                >
                  <IconCopy size={14} />
                </button>
              </div>
            </article>
                ))}
              </div>
            ) : null}
          </>
        )}
        </div>
      </div>

      {dragOver ? (
        <div className="drop-overlay">
          <div className="drop-card">
            <IconUpload size={30} />
            <h3>Drop to upload</h3>
            <p>Images and videos go straight into the library.</p>
          </div>
        </div>
      ) : null}

      {/* File details */}
      <Modal
        open={!!activeMedia}
        onClose={() => setActiveMedia(null)}
        title={activeMedia?.title ?? ''}
        subtitle={activeMedia?.variantLabel || activeMedia?.groupName || 'File details'}
        footer={
          <>
            <a className="btn btn-ghost" href={`${activeMedia?.url}?download=1`}>
              <IconDownload size={15} /> Download
            </a>
            <button type="button" className="btn btn-danger" onClick={removeMedia}>
              <IconTrash size={15} /> Delete
            </button>
            <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              Save
            </button>
          </>
        }
      >
        {activeMedia ? (
          <div className="media-detail">
            <div className="media-detail-preview">
              <div className="checker">
                <MediaThumb media={activeMedia} className="media-detail-img" />
              </div>
              <div className="media-detail-meta">
                <span className="mono">{activeMedia.mime}</span>
                <span className="mono">{formatBytes(activeMedia.size)}</span>
                <span className="mono">
                  {activeMedia.width && activeMedia.height
                    ? `${activeMedia.width}×${activeMedia.height} px`
                    : 'Size unknown'}
                </span>
                <span className="mono">in {activeMedia.usedIn} post(s)</span>
                {activeMedia.songTitle ? <span className="mono">Song: {activeMedia.songTitle}</span> : null}
                <span className="mono">since {formatDate(activeMedia.createdAt)}</span>
              </div>
            </div>

            <div className="media-detail-form">
              <Field label="Title">
                <input
                  className="input"
                  value={edit.title}
                  onChange={(event) => setEdit({ ...edit, title: event.target.value })}
                />
              </Field>
              <Field label="Version / label" hint={<span className="count">e.g. “transparent”, “4:5”</span>}>
                <input
                  className="input"
                  value={edit.variantLabel}
                  onChange={(event) => setEdit({ ...edit, variantLabel: event.target.value })}
                />
              </Field>
              <Field label="Asset group">
                <select
                  className="select"
                  value={edit.groupId}
                  onChange={(event) => setEdit({ ...edit, groupId: event.target.value })}
                >
                  <option value="">No group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Folder">
                <select
                  className="select"
                  value={edit.folderId}
                  onChange={(event) => setEdit({ ...edit, folderId: event.target.value })}
                >
                  <option value="">Unfiled</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {'\u00a0\u00a0'.repeat(folder.depth) + folder.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Song" hint={<span className="count">What is this asset for?</span>}>
                <select
                  className="select"
                  value={edit.songId}
                  onChange={(event) => setEdit({ ...edit, songId: event.target.value })}
                >
                  <option value="">No song</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags" hint={<span className="count">comma separated</span>}>
                <input
                  className="input"
                  value={edit.tags}
                  onChange={(event) => setEdit({ ...edit, tags: event.target.value })}
                />
              </Field>
              <Field label="Alt text">
                <textarea
                  className="textarea"
                  rows={2}
                  value={edit.alt}
                  onChange={(event) => setEdit({ ...edit, alt: event.target.value })}
                />
              </Field>

              <div className="media-replace">
                <div>
                  <span className="label">File</span>
                  <p className="small muted" style={{ margin: '4px 0 0' }}>
                    New version with the same file name? Replace it – every post keeps the reference.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => replaceInput.current?.click()}
                  disabled={replacing}
                >
                  <IconUpload size={13} /> {replacing ? 'Replacing …' : 'Replace file'}
                </button>
                <input
                  ref={replaceInput}
                  type="file"
                  hidden
                  onChange={(event) => replaceFile(event.target.files)}
                />
              </div>

              <div className="media-usage">
                <span className="label">Used in</span>
                {usage.length === 0 ? (
                  <p className="small muted" style={{ margin: '4px 0 0' }}>
                    Not used in any post yet.
                  </p>
                ) : (
                  <div className="media-usage-list">
                    {usage.map((entry) => (
                      <Link key={entry.id} href={`/planner?post=${entry.id}`} className="media-usage-row">
                        <span className={`status ${entry.status}`}>
                          <span className="dot" />
                          {entry.status}
                        </span>
                        <span className="truncate">{entry.caption.split('\n')[0].slice(0, 60) || 'Post'}</span>
                        <span className="mono small muted">
                          {formatDate(entry.publishedAt ?? entry.scheduledAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Asset-Gruppe */}
      <Modal
        open={!!activeGroup}
        onClose={() => setActiveGroup(null)}
        title={activeGroup?.name ?? ''}
        subtitle={`${activeGroup?.count ?? 0} versions in this group`}
        size="normal"
      >
        {activeGroup ? (
          <div className="variant-list">
            {media
              .filter((item) => item.groupId === activeGroup.id)
              .map((item) => (
                <div key={item.id} className="variant-row">
                  <div className="variant-thumb">
                    <MediaThumb media={item} className="variant-thumb-img" />
                  </div>
                  <div className="grow">
                    <div className="variant-title">{item.title}</div>
                    <div className="variant-sub">{item.variantLabel || 'Original'}</div>
                    <div className="mono small muted">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
                      {formatBytes(item.size)} · {item.usedIn}× verwendet
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setActiveMedia(item);
                      setActiveGroup(null);
                    }}
                  >
                    Details
                  </button>
                  <a className="btn btn-sm btn-ghost" href={`${item.url}?download=1`}>
                    <IconDownload size={14} />
                    Get version
                  </a>
                </div>
              ))}
          </div>
        ) : null}
      </Modal>

      {/* New group */}
      <Modal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        title="Create asset group"
        subtitle="A group bundles all versions of one asset – e.g. your logo in several formats."
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setGroupModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={createGroup}>
              Create group
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Name">
            <input
              className="input"
              placeholder="z. B. déchire Wordmark"
              value={newGroup.name}
              onChange={(event) => setNewGroup({ ...newGroup, name: event.target.value })}
            />
          </Field>
          <Field label="Kind">
            <select
              className="select"
              value={newGroup.kind}
              onChange={(event) => setNewGroup({ ...newGroup, kind: event.target.value })}
            >
              <option value="logo">Logo</option>
              <option value="artwork">Artwork</option>
              <option value="photo">Photo</option>
              <option value="merch">Merch</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
      </Modal>

      {/* New / rename folder */}
      <Modal
        open={!!folderModal}
        onClose={() => setFolderModal(null)}
        title={folderModal?.id ? 'Rename folder' : 'New folder'}
        subtitle={
          folderModal?.id
            ? 'Renaming keeps every file where it is.'
            : folderModal?.parentId
              ? 'The folder is created inside the one you have open.'
              : 'Folders can nest – drag files onto them to move them.'
        }
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFolderModal(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveFolder}>
              {folderModal?.id ? 'Save' : 'Create folder'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Name">
            <input
              className="input"
              placeholder="e.g. Live 2026, Releases, Logos"
              autoFocus
              value={folderModal?.name ?? ''}
              onChange={(event) =>
                setFolderModal((current) => (current ? { ...current, name: event.target.value } : current))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveFolder();
              }}
            />
          </Field>
        </div>
      </Modal>

      <button
        type="button"
        className="fab"
        onClick={() => fileInput.current?.click()}
        title="Upload files"
      >
        {uploading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <IconPlus size={20} />}
      </button>
    </div>
  );
}
