'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconDocument,
  IconFolder,
  IconMusic,
  IconPencil,
  IconPlus,
  IconSearch,
  IconShare,
  IconTrash,
} from '@/components/icons';
import DocEditor from '@/components/DocEditor';
import { EmptyState, Modal, PageHead, Spinner } from '@/components/ui';
import { DOC_TEMPLATES } from '@/lib/docTemplates';
import { DOC_KINDS, docKindLabel } from '@/lib/kinds';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { BandDocument, DocFolder } from '@/lib/types';

type FolderFilter = 'all' | 'unfiled' | number;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<BandDocument[]>([]);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{ folder: DocFolder | null } | null>(null);
  const [folderName, setFolderName] = useState('');
  const [dragDocId, setDragDocId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | 'unfiled' | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      const items: BandDocument[] = data.documents ?? [];
      setDocuments(items);
      setFolders(data.folders ?? []);
      // Deep link from the release planner: /docs?doc=12
      const wanted = Number(new URLSearchParams(window.location.search).get('doc') ?? '');
      setSelectedId((current) =>
        Number.isFinite(wanted) && items.some((item) => item.id === wanted)
          ? wanted
          : current ?? items[0]?.id ?? null
      );
    } catch {
      toast('Could not load the documents', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return documents.filter((document) => {
      if (kind !== 'all' && document.kind !== kind) return false;
      if (folderFilter === 'unfiled' && document.folderId) return false;
      if (typeof folderFilter === 'number' && document.folderId !== folderFilter) return false;
      if (!query.trim()) return true;
      const haystack = [document.title, document.plainText, document.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [documents, kind, folderFilter, query]);

  const counts = useMemo(() => {
    const perFolder = new Map<number, number>();
    let unfiled = 0;
    documents.forEach((document) => {
      if (document.folderId) perFolder.set(document.folderId, (perFolder.get(document.folderId) ?? 0) + 1);
      else unfiled += 1;
    });
    return { perFolder, unfiled };
  }, [documents]);

  const activeDocument = documents.find((document) => document.id === selectedId) ?? null;

  const createFromTemplate = async (templateId: string) => {
    const template = DOC_TEMPLATES.find((entry) => entry.id === templateId) ?? DOC_TEMPLATES[DOC_TEMPLATES.length - 1];
    setCreating(templateId);
    try {
      const plainText = template.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          kind: template.kind,
          folderId: typeof folderFilter === 'number' ? folderFilter : null,
          content: template.content,
          plainText,
          tags: [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the document');
      setDocuments((current) => [data.document, ...current]);
      setSelectedId(data.document.id);
      setNewOpen(false);
      toast('Document created');
    } catch (error: any) {
      toast(error.message ?? 'Could not create the document', 'error');
    } finally {
      setCreating(null);
    }
  };

  const handleSaved = (saved: BandDocument) => {
    setDocuments((current) => current.map((document) => (document.id === saved.id ? saved : document)));
  };

  const handleDeleted = (id: number) => {
    setDocuments((current) => {
      const next = current.filter((document) => document.id !== id);
      setSelectedId((selected) => (selected === id ? next[0]?.id ?? null : selected));
      return next;
    });
  };

  const openFolderModal = (folder: DocFolder | null) => {
    setFolderName(folder?.name ?? '');
    setFolderModal({ folder });
  };

  const saveFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      toast('Give the folder a name', 'error');
      return;
    }
    const editing = folderModal?.folder ?? null;
    const response = await fetch(editing ? `/api/doc-folders/${editing.id}` : '/api/doc-folders', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast(data.error ?? 'Could not save the folder', 'error');
      return;
    }
    setFolders(data.folders ?? []);
    setFolderModal(null);
    toast(editing ? 'Folder renamed' : 'Folder created');
  };

  const deleteFolder = async (folder: DocFolder) => {
    if (!window.confirm(`Delete “${folder.name}”? The documents stay and move to “No folder”.`)) return;
    const response = await fetch(`/api/doc-folders/${folder.id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      toast(data.error ?? 'Could not delete the folder', 'error');
      return;
    }
    setFolders(data.folders ?? []);
    setDocuments((current) =>
      current.map((document) =>
        document.folderId === folder.id ? { ...document, folderId: null, folderName: null } : document
      )
    );
    if (folderFilter === folder.id) setFolderFilter('all');
    toast('Folder removed');
  };

  const moveDocument = async (documentId: number, targetFolderId: number | null) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: targetFolderId }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast(data.error ?? 'Could not move the document', 'error');
      return;
    }
    setDocuments((current) =>
      current.map((document) => (document.id === documentId ? { ...document, ...data.document } : document))
    );
    setDragDocId(null);
    setDropTarget(null);
    toast(targetFolderId ? 'Document moved' : 'Document moved to “No folder”');
  };

  const dropOnFolder = (targetFolderId: number | null) => {
    const id = dragDocId;
    setDragDocId(null);
    setDropTarget(null);
    if (id) moveDocument(id, targetFolderId);
  };

  if (loading) return <Spinner label="Opening the filing cabinet" />;

  return (
    <>
      <PageHead
        eyebrow="Documents"
        title={
          <>
            Files<span className="slash">/</span>Orga
          </>
        }
        sub="Technical rider, booking confirmations, itineraries, press texts, lyrics. Write it here, print it as PDF, send it to the promoter – and play the demo while you read."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <IconPlus size={15} /> New document
          </button>
        }
      />

      <div className="docs-layout">
        <aside className="panel docs-sidebar">
          <div className="docs-search">
            <IconSearch size={15} />
            <input
              className="input"
              placeholder="Search documents …"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="doc-folders">
            <div className="doc-folders-head">
              <span className="doc-folders-title mono">Folders</span>
              <button
                type="button"
                className="doc-folder-add"
                onClick={() => openFolderModal(null)}
                title="New folder"
                aria-label="New folder"
              >
                <IconPlus size={12} />
              </button>
            </div>

            <button
              type="button"
              className={`doc-folder-row ${folderFilter === 'all' ? 'on' : ''}`}
              onClick={() => setFolderFilter('all')}
            >
              <IconFolder size={13} />
              <span className="truncate">All documents</span>
              <em>{documents.length}</em>
            </button>
            <button
              type="button"
              className={`doc-folder-row ${folderFilter === 'unfiled' ? 'on' : ''} ${
                dropTarget === 'unfiled' ? 'drop' : ''
              }`}
              onClick={() => setFolderFilter('unfiled')}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget('unfiled');
              }}
              onDragLeave={() => setDropTarget((target) => (target === 'unfiled' ? null : target))}
              onDrop={(event) => {
                event.preventDefault();
                dropOnFolder(null);
              }}
            >
              <IconDocument size={13} />
              <span className="truncate">No folder</span>
              <em>{counts.unfiled}</em>
            </button>

            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`doc-folder-row ${folderFilter === folder.id ? 'on' : ''} ${
                  dropTarget === folder.id ? 'drop' : ''
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget(folder.id);
                }}
                onDragLeave={() => setDropTarget((target) => (target === folder.id ? null : target))}
                onDrop={(event) => {
                  event.preventDefault();
                  dropOnFolder(folder.id);
                }}
              >
                <button type="button" className="doc-folder-pick" onClick={() => setFolderFilter(folder.id)}>
                  <IconFolder size={13} />
                  <span className="truncate">{folder.name}</span>
                  <em>{counts.perFolder.get(folder.id) ?? 0}</em>
                </button>
                <span className="doc-folder-actions">
                  <button
                    type="button"
                    onClick={() => openFolderModal(folder)}
                    title="Rename folder"
                    aria-label={`Rename ${folder.name}`}
                  >
                    <IconPencil size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFolder(folder)}
                    title="Delete folder"
                    aria-label={`Delete ${folder.name}`}
                  >
                    <IconTrash size={10} />
                  </button>
                </span>
              </div>
            ))}
          </div>

          <div className="folder-tabs">
            <button
              type="button"
              className={`folder-tab ${kind === 'all' ? 'on' : ''}`}
              onClick={() => setKind('all')}
            >
              All
            </button>
            {DOC_KINDS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className={`folder-tab ${kind === entry.value ? 'on' : ''}`}
                onClick={() => setKind(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="doc-list">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<IconDocument size={22} />}
                title="No document found"
                hint="Change the filter or start from a template."
              />
            ) : (
              filtered.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  draggable
                  className={`doc-item ${document.id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(document.id)}
                  onDragStart={(event) => {
                    setDragDocId(document.id);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(document.id));
                  }}
                  onDragEnd={() => {
                    setDragDocId(null);
                    setDropTarget(null);
                  }}
                >
                  <div className="doc-item-top">
                    <span className="doc-item-title truncate">{document.title || 'Untitled document'}</span>
                    {document.shareToken ? (
                      <span className="doc-item-share" title="Public link active">
                        <IconShare size={11} />
                      </span>
                    ) : null}
                  </div>
                  <p className="doc-item-snippet two-line">
                    {document.plainText?.slice(0, 110) || 'Empty document'}
                  </p>
                  <div className="doc-item-meta">
                    <span className="chip">{docKindLabel(document.kind)}</span>
                    {document.audio?.length ? (
                      <span className="doc-item-audio" title={`${document.audio.length} audio file(s)`}>
                        <IconMusic size={10} /> {document.audio.length}
                      </span>
                    ) : null}
                    <span className="mono">{timeAgo(document.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="docs-main">
          {activeDocument ? (
            <DocEditor
              key={activeDocument.id}
              document={activeDocument}
              folders={folders}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="panel">
              <EmptyState
                icon={<IconDocument size={24} />}
                title="No document selected"
                hint="Pick one on the left or start from a template – the technical rider is a good start."
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}>
                    <IconPlus size={14} /> New document
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New document"
        subtitle="Templates for the paperwork that shows up around every show."
      >
        <div className="template-grid">
          {DOC_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="template-card"
              onClick={() => createFromTemplate(template.id)}
              disabled={!!creating}
            >
              <div className="template-card-head">
                <IconDocument size={16} />
                <strong>{template.label}</strong>
              </div>
              <p className="small muted">{template.hint}</p>
              <span className="template-card-cta">{creating === template.id ? 'Creating …' : 'Use template'}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!folderModal}
        onClose={() => setFolderModal(null)}
        title={folderModal?.folder ? 'Rename folder' : 'New folder'}
        subtitle="Folders keep riders, lyrics and press texts apart – documents can always be moved."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFolderModal(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveFolder}>
              {folderModal?.folder ? 'Save name' : 'Create folder'}
            </button>
          </>
        }
      >
        <label className="doc-share-field">
          <span className="label">Folder name</span>
          <input
            className="input"
            value={folderName}
            placeholder="e.g. Lyrics, Tour 2027, Press"
            onChange={(event) => setFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveFolder();
            }}
          />
        </label>
      </Modal>
    </>
  );
}
