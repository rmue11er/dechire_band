'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

  const downloadHtml = () => {
    const body = contentRef.current.html;
    const band = profile?.bandName ?? 'DECHIRE';
    const kindLabel = DOC_KINDS.find((item) => item.value === kind)?.label ?? 'Document';
    const logo = profile?.avatarUrl ?? '';
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title || 'Document'} · ${band}</title>
<style>
  :root { --ci: ${ciPrimary}; }
  * { box-sizing: border-box; }
  body { font: 14.5px/1.65 "Helvetica Neue", Arial, sans-serif; color: #16141c; margin: 0; padding: 40px 0 0; background: #fff; }
  .sheet { max-width: 780px; margin: 0 auto; padding: 0 32px 56px; }
  .brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 2px solid var(--ci); padding-bottom: 14px; }
  .brand-left { display: flex; align-items: center; gap: 12px; }
  .brand-left img { width: 46px; height: 46px; object-fit: contain; border-radius: 8px; background: #f4f1fa; }
  .brand-name { font-size: 15px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
  .brand-sub { display: block; font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: #6b6478; margin-top: 3px; }
  .brand-right { text-align: right; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #6b6478; line-height: 1.7; }
  h1 { font-size: 26px; margin: 26px 0 6px; letter-spacing: -.01em; }
  h2 { font-size: 17px; margin: 28px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #e6e2ee; color: #1d1a26; }
  h2::before { content: ''; display: inline-block; width: 8px; height: 8px; background: var(--ci); margin-right: 8px; border-radius: 2px; vertical-align: middle; }
  h3 { font-size: 15px; margin: 20px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12.5px; }
  th, td { border: 1px solid #dcd6e6; padding: 7px 10px; text-align: left; vertical-align: top; }
  th { background: #f5f2fb; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px; padding-left: 20px; }
  blockquote { margin: 14px 0; padding: 10px 14px; border-left: 3px solid var(--ci); background: #f7f4fd; color: #3a3446; }
  mark { background: #efe6ff; }
  pre { background: #f6f4fa; border: 1px solid #e4dff0; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12.5px; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
  .foot { margin-top: 44px; padding-top: 12px; border-top: 1px solid #e6e2ee; display: flex; justify-content: space-between; gap: 12px; font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: #6b6478; }
  @media print { body { padding-top: 0; } .sheet { max-width: none; padding: 0 18mm 14mm; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="brand">
    <div class="brand-left">
      ${logo ? `<img src="${logo}" alt="">` : ''}
      <div>
        <span class="brand-name">${band}</span>
        <span class="brand-sub">${kindLabel} · ${status === 'final' ? 'Final' : 'Draft'}</span>
      </div>
    </div>
    <div class="brand-right">
      ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}<br>
      ${profile?.handle ? `@${profile.handle}` : ''}
    </div>
  </div>
  <h1>${title || 'Document'}</h1>
  ${body}
  <div class="foot">
    <span>Post-hardcore /// ${band.toUpperCase()}</span>
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

      <div className="doc-page">
        <header className="doc-sheet-brand">
          <div className="doc-sheet-left">
            {profile?.avatarUrl ? (
              <img className="doc-sheet-logo" src={profile.avatarUrl} alt="" />
            ) : (
              <div className="doc-sheet-logo placeholder">D</div>
            )}
            <div>
              <strong className="doc-sheet-name">{profile?.bandName ?? 'DECHIRE'}</strong>
              <span className="doc-sheet-sub">
                {docKindLabel(kind)} · {status === 'final' ? 'Final' : 'Draft'}
              </span>
            </div>
          </div>
          <div className="doc-sheet-meta">
            <span>{new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}</span>
            {profile?.handle ? <span>@{profile.handle}</span> : null}
          </div>
        </header>

        <h1 className="doc-sheet-title">{title || 'Untitled document'}</h1>

        <EditorContent editor={editor} />

        <footer className="doc-sheet-foot">
          <span>
            Post-hardcore /// {(profile?.bandName ?? 'DECHIRE').toUpperCase()}
          </span>
          <span>{profile?.website ?? ''}</span>
        </footer>
      </div>
    </div>
  );
}
