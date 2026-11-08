'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconCheck,
  IconCode,
  IconDownload,
  IconExternal,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconPin,
  IconQuote,
  IconRedo,
  IconStrike,
  IconTable,
  IconTask,
  IconTrash,
  IconUnderline,
  IconUndo,
} from '@/components/icons';
import { Segmented } from '@/components/ui';
import { usePalette } from '@/components/PaletteProvider';
import { DOC_KINDS, docKindLabel } from '@/lib/kinds';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { BandDocument, DocumentKind, Profile } from '@/lib/types';

type Status = 'idle' | 'dirty' | 'saving' | 'saved';

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'document';

export default function DocEditor({
  document: doc,
  onSaved,
  onDeleted,
}: {
  document: BandDocument;
  onSaved: (doc: BandDocument) => void;
  onDeleted: (id: number) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [kind, setKind] = useState<DocumentKind>(doc.kind);
  const [status, setStatus] = useState<'draft' | 'final'>(doc.status);
  const [tags, setTags] = useState(doc.tags.join(', '));
  const [saveState, setSaveState] = useState<Status>('idle');
  const [savedAt, setSavedAt] = useState(doc.updatedAt);
  const [words, setWords] = useState(0);
  const [tick, setTick] = useState(0);
  const dirtyRef = useRef(false);
  const versionRef = useRef(0);
  const contentRef = useRef({ html: doc.content, text: doc.plainText });
  const palette = usePalette();
  const [profile, setProfile] = useState<Profile | null>(null);
  const ciPrimary = palette.find((color) => color.role === 'primary')?.hex ?? '#6b54a6';
  const band = profile?.bandName ?? 'DECHIRE';

  useEffect(() => {
    fetch('/api/profile')
      .then((response) => response.json())
      .then((data) => setProfile(data.profile ?? null))
      .catch(() => setProfile(null));
  }, []);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    versionRef.current += 1;
    setSaveState('dirty');
    setTick((value) => value + 1);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Write it down – sections, tables, checklists …' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false, HTMLAttributes: { class: 'doc-table' } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: doc.content || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'prose doc-content', spellcheck: 'true' },
    },
    onUpdate: ({ editor: instance }) => {
      contentRef.current = { html: instance.getHTML(), text: instance.getText() };
      setWords(instance.getText().split(/\s+/).filter(Boolean).length);
      markDirty();
    },
  });

  useEffect(() => {
    setTitle(doc.title);
    setKind(doc.kind);
    setStatus(doc.status);
    setTags(doc.tags.join(', '));
    setSaveState('idle');
    setSavedAt(doc.updatedAt);
    contentRef.current = { html: doc.content, text: doc.plainText };
    dirtyRef.current = false;
    if (editor) {
      editor.commands.setContent(doc.content || '<p></p>', false);
      setWords(editor.getText().split(/\s+/).filter(Boolean).length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, editor]);

  const save = useCallback(async () => {
    if (!dirtyRef.current) return;
    const versionAtStart = versionRef.current;
    setSaveState('saving');
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled document',
          kind,
          status,
          content: contentRef.current.html,
          plainText: contentRef.current.text,
          tags: tags
            .split(',')
            .map((tag) => tag.trim().replace(/^#/, ''))
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      onSaved(data.document);
      setSavedAt(data.document.updatedAt);
      const stillDirty = versionRef.current !== versionAtStart;
      dirtyRef.current = stillDirty;
      setSaveState(stillDirty ? 'dirty' : 'saved');
      if (stillDirty) setTick((value) => value + 1);
    } catch (error: any) {
      setSaveState('dirty');
      toast(error.message ?? 'Failed to save', 'error');
    }
  }, [doc.id, title, kind, status, tags, onSaved]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(save, 900);
    return () => clearTimeout(timer);
  }, [tick, title, kind, status, tags, save]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const remove = async () => {
    if (!window.confirm('Delete this document? It cannot be recovered.')) return;
    const response = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    if (response.ok) {
      onDeleted(doc.id);
      toast('Document deleted');
    }
  };

  const toDataUrl = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return url;
      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  const downloadHtml = async () => {
    const body = contentRef.current.html;
    const bandName = band;
    const kindLabel = DOC_KINDS.find((item) => item.value === kind)?.label ?? 'Document';
    const logo = profile?.avatarUrl ? await toDataUrl(profile.avatarUrl) : '';
    const mark = profile?.docImageUrl ? await toDataUrl(profile.docImageUrl) : '';
    const strength = ((profile?.docMarkStrength ?? 14) / 100).toFixed(3);
    const dateLabel = new Date().toLocaleDateString('en-GB', { dateStyle: 'long' });
    const docNo = String(doc.id).padStart(3, '0');
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title || 'Document'} · ${bandName}</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  :root { --ci: ${ciPrimary}; --ci-deep: #6b54a6; --mark: ${strength}; }
  body { margin: 0; padding: 32px 20px 56px; background: #efedf4; color: #1a1722; font: 14.5px/1.7 "Helvetica Neue", Arial, sans-serif; }
  .sheet { position: relative; overflow: hidden; max-width: 800px; margin: 0 auto; padding: 46px 46px 52px; background: #fdfdfd; box-shadow: 0 18px 44px rgba(20, 16, 30, 0.14); }
  .top { position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, var(--ci-deep), var(--ci)); }
  .corner { position: absolute; width: 13px; height: 13px; border: 0 solid #d3cce2; }
  .corner.tl { top: 16px; left: 16px; border-top-width: 1px; border-left-width: 1px; }
  .corner.tr { top: 16px; right: 16px; border-top-width: 1px; border-right-width: 1px; }
  .corner.bl { bottom: 16px; left: 16px; border-bottom-width: 1px; border-left-width: 1px; }
  .corner.br { bottom: 16px; right: 16px; border-bottom-width: 1px; border-right-width: 1px; }
  .mark { position: absolute; right: -36px; bottom: -52px; width: 48%; max-width: 340px; opacity: var(--mark); filter: grayscale(1) contrast(1.06); mix-blend-mode: multiply; }
  .sheet > *:not(.top):not(.corner):not(.mark) { position: relative; z-index: 1; }
  .brand { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding-bottom: 16px; border-bottom: 1px solid #e6e1f0; }
  .brand-left { display: flex; align-items: center; gap: 13px; }
  .brand-left img { width: 44px; height: 44px; object-fit: cover; border-radius: 4px; background: #f4f1fa; box-shadow: 0 0 0 1px #e8e3f2; }
  .brand-name { display: block; font-size: 19px; line-height: 1; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #14121a; }
  .brand-sub { display: block; margin-top: 7px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 8.5px; letter-spacing: .18em; text-transform: uppercase; color: #8f88a3; }
  .brand-type { display: grid; justify-items: end; gap: 7px; text-align: right; }
  .badge { padding: 3px 8px 2px; border-radius: 2px; border: 1px solid #e0daea; font-family: ui-monospace, Menlo, monospace; font-size: 8px; letter-spacing: .2em; text-transform: uppercase; color: #8f88a3; }
  .badge.final { border-color: #d6c9f0; background: rgba(185, 165, 232, .16); color: #4d3d7e; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); border-bottom: 1px solid #e6e1f0; margin: 0 0 30px; }
  .meta > span { padding: 11px 16px; border-left: 1px solid #f1edf8; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #2b2537; }
  .meta > span:first-child { padding-left: 0; border-left: 0; }
  .meta em { display: block; margin-bottom: 5px; font-style: normal; font-size: 8px; letter-spacing: .26em; text-transform: uppercase; color: #a99fbe; }
  .kicker { font-family: ui-monospace, Menlo, monospace; font-size: 9px; letter-spacing: .26em; text-transform: uppercase; color: var(--ci-deep); }
  h1.title { margin: 11px 0 0; font-size: 32px; line-height: 1.12; letter-spacing: -.022em; color: #0f0d14; }
  .rule { display: block; width: 54px; height: 3px; margin: 18px 0 26px; border-radius: 2px; background: linear-gradient(90deg, var(--ci-deep), var(--ci)); }
  .body h2 { display: flex; align-items: baseline; gap: 11px; margin: 30px 0 10px; font-size: 17px; color: #14121a; }
  .body h2::before { content: ''; width: 3px; height: 13px; border-radius: 2px; background: linear-gradient(180deg, var(--ci-deep), var(--ci)); transform: translateY(1px); }
  .body h2::after { content: ''; flex: 1 1 auto; height: 1px; transform: translateY(-3px); background: linear-gradient(90deg, #e3ddf0, rgba(227, 221, 240, 0)); }
  .body h3 { margin: 20px 0 6px; font-size: 14.5px; color: #24202f; }
  .body p { margin: 0 0 11px; }
  .body a { color: #5b3fa8; text-decoration: underline; text-underline-offset: 2px; }
  .body ul, .body ol { padding-left: 20px; }
  .body li::marker { color: #8d7cb8; }
  .body blockquote { margin: 16px 0; padding: 12px 16px; border-left: 3px solid var(--ci); background: linear-gradient(90deg, rgba(185, 165, 232, .11), rgba(185, 165, 232, 0)); font-style: italic; color: #332c42; }
  .body mark { background: #efe6ff; color: #2c2340; }
  .body code { padding: 1px 5px; border-radius: 3px; background: #f1eef7; font-family: ui-monospace, Menlo, monospace; font-size: .86em; }
  .body pre { padding: 13px 15px; border: 1px solid #e4dff0; border-radius: 6px; background: #f7f5fb; overflow-x: auto; }
  .body hr { margin: 24px 0; border: 0; border-top: 1px solid #e2dee8; }
  .body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px; border: 1px solid #e2dcee; }
  .body th, .body td { border: 1px solid #e9e4f2; padding: 9px 11px; text-align: left; vertical-align: top; }
  .body th { border-bottom: 2px solid #ddd4ee; background: #f6f3fc; font-family: ui-monospace, Menlo, monospace; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #5c5470; }
  .body tbody tr:nth-child(even) td { background: #fbfaff; }
  .body table p { margin: 0; }
  .body ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  .body ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
  .body ul[data-type="taskList"] input { accent-color: #6b54a6; }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 44px; padding-top: 14px; border-top: 1px solid #e6e1f0; font-family: ui-monospace, Menlo, monospace; font-size: 8.5px; letter-spacing: .2em; text-transform: uppercase; color: #9b94ad; }
  .foot span:first-child::before { content: ''; display: inline-block; width: 5px; height: 5px; margin-right: 8px; border-radius: 50%; background: var(--ci-deep); vertical-align: 1px; }
  @media print { body { padding: 0; background: #fff; } .sheet { max-width: none; box-shadow: none; padding: 0; } .corner { display: none; } }
</style>
</head>
<body>
<div class="sheet">
  <span class="top"></span>
  <span class="corner tl"></span>
  <span class="corner tr"></span>
  <span class="corner bl"></span>
  <span class="corner br"></span>
  ${mark ? `<img class="mark" src="${mark}" alt="">` : ''}
  <header class="brand">
    <div class="brand-left">
      ${logo ? `<img src="${logo}" alt="">` : ''}
      <div>
        <span class="brand-name">${bandName}</span>
        <span class="brand-sub">${profile?.bio?.split('\n')[0] || 'Post-hardcore // Ruhr'}</span>
      </div>
    </div>
    <div class="brand-type">
      <span class="badge ${status === 'final' ? 'final' : ''}">${status === 'final' ? 'Final' : 'Draft'}</span>
    </div>
  </header>
  <div class="meta">
    <span><em>No.</em>${docNo}</span>
    <span><em>Date</em>${dateLabel}</span>
    ${profile?.handle ? `<span><em>Contact</em>@${profile.handle}</span>` : ''}
  </div>
  <span class="kicker">${kindLabel} · ${bandName.toUpperCase()}</span>
  <h1 class="title">${title || 'Document'}</h1>
  <span class="rule"></span>
  <div class="body">${body}</div>
  <div class="foot">
    <span>Post-hardcore /// ${bandName.toUpperCase()}</span>
    <span>${profile?.website ?? ''}</span>
  </div>
</div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${slug(title || 'document')}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('HTML downloaded');
  };

  if (!editor) {
    return (
      <div className="panel">
        <div className="loading-screen" style={{ minHeight: 220 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const tool = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      className={`tool-btn ${active ? 'on' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );

  const inTable = editor.isActive('table');

  return (
    <div className="panel doc-panel">
      <div className="doc-head">
        <div className="doc-head-main">
          <input
            className="doc-title"
            value={title}
            placeholder="Document title"
            onChange={(event) => {
              setTitle(event.target.value);
              markDirty();
            }}
          />
          <div className="doc-meta">
            <span className="mono small muted">{timeAgo(savedAt)}</span>
            <span className="mono small muted">·</span>
            <span className="mono small muted">{words} words</span>
            <span className="mono small muted">·</span>
            <span
              className={`doc-save ${saveState === 'dirty' ? 'dirty' : saveState === 'saving' ? 'saving' : 'saved'}`}
            >
              {saveState === 'dirty' ? 'Unsaved' : saveState === 'saving' ? 'Saving …' : 'Saved'}
            </span>
          </div>
        </div>
        <div className="doc-actions">
          <Segmented
            value={status}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'final', label: 'Final' },
            ]}
            onChange={(value) => {
              setStatus(value);
              markDirty();
            }}
          />
          <button type="button" className="btn btn-sm btn-ghost" onClick={downloadHtml} title="Download as HTML">
            <IconDownload size={14} /> HTML
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()} title="Print or save as PDF">
            <IconExternal size={14} /> Print / PDF
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={remove} title="Delete document">
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      <div className="doc-fields">
        <label className="doc-field">
          <span className="label">Type</span>
          <select
            className="select"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as DocumentKind);
              markDirty();
            }}
          >
            {DOC_KINDS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="doc-field grow">
          <span className="label">Tags</span>
          <input
            className="input"
            value={tags}
            placeholder="rider, tour, venue"
            onChange={(event) => {
              setTags(event.target.value);
              markDirty();
            }}
          />
        </label>
      </div>

      <div className="doc-toolbar">
        {tool(false, () => editor.chain().focus().undo().run(), <IconUndo size={15} />, 'Undo')}
        {tool(false, () => editor.chain().focus().redo().run(), <IconRedo size={15} />, 'Redo')}
        <span className="tool-sep" />
        {tool(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <span className="tool-h">H1</span>, 'Heading 1')}
        {tool(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <span className="tool-h">H2</span>, 'Heading 2')}
        {tool(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <span className="tool-h">H3</span>, 'Heading 3')}
        <span className="tool-sep" />
        {tool(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <IconBold size={15} />, 'Bold')}
        {tool(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <IconItalic size={15} />, 'Italic')}
        {tool(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <IconUnderline size={15} />, 'Underline')}
        {tool(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <IconStrike size={15} />, 'Strikethrough')}
        {tool(editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), <IconPin size={15} />, 'Highlight')}
        <span className="tool-sep" />
        {tool(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <IconList size={15} />, 'Bullet list')}
        {tool(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <IconListOrdered size={15} />, 'Numbered list')}
        {tool(editor.isActive('taskList'), () => editor.chain().focus().toggleTaskList().run(), <IconTask size={15} />, 'Checklist')}
        {tool(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), <IconQuote size={15} />, 'Quote')}
        {tool(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), <IconCode size={15} />, 'Code block')}
        <span className="tool-sep" />
        {tool(editor.isActive('link'), () => {
          const previous = editor.getAttributes('link').href as string | undefined;
          const url = window.prompt('Link URL', previous ?? 'https://');
          if (url === null) return;
          if (!url.trim()) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
        }, <IconLink size={15} />, 'Link')}
        {tool(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), <IconAlignLeft size={15} />, 'Align left')}
        {tool(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), <IconAlignCenter size={15} />, 'Align centre')}
        {tool(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), <IconAlignRight size={15} />, 'Align right')}
        <span className="tool-sep" />
        {tool(
          inTable,
          () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          <IconTable size={15} />,
          'Insert table'
        )}
        {inTable ? (
          <>
            <button type="button" className="tool-text" onClick={() => editor.chain().focus().addRowAfter().run()}>
              +row
            </button>
            <button type="button" className="tool-text" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              +col
            </button>
            <button type="button" className="tool-text" onClick={() => editor.chain().focus().deleteRow().run()}>
              −row
            </button>
            <button type="button" className="tool-text" onClick={() => editor.chain().focus().deleteColumn().run()}>
              −col
            </button>
            <button type="button" className="tool-text danger" onClick={() => editor.chain().focus().deleteTable().run()}>
              del
            </button>
          </>
        ) : null}
      </div>

      <div
        className="doc-page"
        style={{ '--doc-mark': (profile?.docMarkStrength ?? 14) / 100 } as CSSProperties}
      >
        <span className="doc-sheet-top" aria-hidden="true" />
        <span className="doc-sheet-corner tl" aria-hidden="true" />
        <span className="doc-sheet-corner tr" aria-hidden="true" />
        <span className="doc-sheet-corner bl" aria-hidden="true" />
        <span className="doc-sheet-corner br" aria-hidden="true" />
        {profile?.docImageUrl ? (
          <img className="doc-sheet-mark" src={profile.docImageUrl} alt="" aria-hidden="true" />
        ) : null}

        <header className="doc-sheet-brand">
          <div className="doc-sheet-left">
            {profile?.avatarUrl ? (
              <img className="doc-sheet-logo" src={profile.avatarUrl} alt="" />
            ) : (
              <div className="doc-sheet-logo placeholder">{(profile?.bandName ?? 'D').slice(0, 1)}</div>
            )}
            <div>
              <strong className="doc-sheet-name">{profile?.bandName ?? 'DECHIRE'}</strong>
              <span className="doc-sheet-sub">
                {profile?.bio?.split('\n')[0] || 'Post-hardcore // Ruhr'}
              </span>
            </div>
          </div>
          <div className="doc-sheet-type">
            <span className={`doc-sheet-badge ${status}`}>
              {status === 'final' ? 'Final' : 'Draft'}
            </span>
          </div>
        </header>

        <div className="doc-sheet-meta">
          <span>
            <em>No.</em>
            {String(doc.id).padStart(3, '0')}
          </span>
          <span>
            <em>Date</em>
            {new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}
          </span>
          {profile?.handle ? (
            <span>
              <em>Contact</em>@{profile.handle}
            </span>
          ) : null}
        </div>

        <div className="doc-sheet-titlewrap">
          <span className="doc-sheet-kicker">
            {docKindLabel(kind)} · {band.toUpperCase()}
          </span>
          <h1 className="doc-sheet-title">{title || 'Untitled document'}</h1>
          <span className="doc-sheet-rule" aria-hidden="true" />
        </div>

        <EditorContent editor={editor} />

        <footer className="doc-sheet-foot">
          <span>Post-hardcore /// {(profile?.bandName ?? 'DECHIRE').toUpperCase()}</span>
          <span>{profile?.website ?? ''}</span>
        </footer>
      </div>
    </div>
  );
}
