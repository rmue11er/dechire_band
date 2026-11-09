'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconDocument, IconMusic, IconPlus, IconSearch } from '@/components/icons';
import DocEditor from '@/components/DocEditor';
import { EmptyState, Modal, PageHead, Spinner } from '@/components/ui';
import { DOC_TEMPLATES } from '@/lib/docTemplates';
import { DOC_KINDS, docKindLabel } from '@/lib/kinds';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { BandDocument } from '@/lib/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<BandDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      const items: BandDocument[] = data.documents ?? [];
      setDocuments(items);
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
      if (!query.trim()) return true;
      const haystack = [document.title, document.plainText, document.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [documents, kind, query]);

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
                  className={`doc-item ${document.id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(document.id)}
                >
                  <div className="doc-item-top">
                    <span className="doc-item-title truncate">{document.title || 'Untitled document'}</span>
                    <span className={`doc-status ${document.status}`}>{document.status === 'final' ? 'final' : 'draft'}</span>
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
    </>
  );
}
