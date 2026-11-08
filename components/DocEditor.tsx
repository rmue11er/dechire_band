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
import EmojiPicker from '@/components/EmojiPicker';
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
    const strength = ((profile?.docMarkStrength ?? 30) / 100).toFixed(3);
    const dateLabel = new Date().toLocaleDateString('en-GB', { dateStyle: 'long' });
    const docNo = String(doc.id).padStart(3, '0');
    const rootStyle = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      rootStyle.getPropertyValue(name).trim() || fallback;
    const accent = token('--accent', ciPrimary);
    const accent2 = token('--accent-2', ciPrimary);
    const accentDeep = token('--accent-deep', ciPrimary);
    const accentRgb = token('--accent-rgb', '185 165 232');
    const tagline = profile?.bio?.split('\n')[0] || 'Post-hardcore // Ruhr';
    const mono = 'ui-monospace, "SF Mono", Menlo, monospace';
    const display = '"Anton", "Impact", sans-serif';
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title || 'Document'} · ${bandName}</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  :root { --accent: ${accent}; --accent-2: ${accent2}; --accent-deep: ${accentDeep}; --accent-rgb: ${accentRgb}; --mark: ${strength}; }
  body { margin: 0; padding: 26px 16px 48px; background: #14111c; color: #1d1826; font: 14.5px/1.72 "Inter", "Helvetica Neue", Arial, sans-serif; }
  .sheet { position: relative; overflow: hidden; max-width: 820px; margin: 0 auto; background: #f4f1ea; background-image: radial-gradient(rgb(20 16 26 / .045) .5px, transparent .6px); background-size: 3px 3px; box-shadow: 0 26px 60px -30px rgba(0, 0, 0, .8); }
  .mast { position: relative; overflow: hidden; padding: 22px 34px 0; background: #0b0a10; color: #f6f2ff; }
  .photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; opacity: var(--mark); filter: grayscale(1) contrast(1.1) brightness(1.05); }
  .veil { position: absolute; inset: 0; background: linear-gradient(100deg, rgb(11 10 16 / .95) 0%, rgb(11 10 16 / .82) 42%, rgb(11 10 16 / .52) 100%); }
  .mast-inner { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 13px; min-width: 0; }
  .brand img { width: 40px; height: 40px; object-fit: cover; border-radius: 3px; background: rgba(255, 255, 255, .06); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .16); }
  .wordmark { display: grid; gap: 5px; }
  .wordmark strong { font-family: ${display}; font-weight: 400; font-size: 27px; line-height: .9; letter-spacing: .015em; text-transform: uppercase; color: #fbf8ff; }
  .wordmark em { font-style: normal; font-family: ${mono}; font-size: 8px; letter-spacing: .24em; text-transform: uppercase; color: var(--accent); opacity: .85; }
  .stamp { transform: rotate(-7deg); padding: 5px 10px 4px; border: 2px solid var(--accent); border-radius: 2px; font-family: ${mono}; font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); background: rgb(var(--accent-rgb) / .08); }
  .stamp.draft { border-color: rgba(255, 255, 255, .28); color: rgba(255, 255, 255, .55); background: none; }
  .mast-meta { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 10px 0 13px; border-top: 1px solid rgba(255, 255, 255, .12); font-family: ${mono}; font-size: 8.5px; letter-spacing: .18em; text-transform: uppercase; color: rgba(255, 255, 255, .62); }
  .mast-meta .kind { color: var(--accent); }
  .mast::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); z-index: 2; }
  .body { position: relative; padding: 30px 34px 44px; }
  .kicker { display: inline-flex; align-items: baseline; gap: 8px; font-family: ${mono}; font-size: 9px; letter-spacing: .26em; text-transform: uppercase; color: var(--accent-deep); }
  .kicker b { font-family: ${display}; font-weight: 400; font-size: 11px; letter-spacing: 0; color: var(--accent-2); }
  h1 { margin: 9px 0 0; font-family: ${display}; font-weight: 400; font-size: 36px; line-height: 1.02; letter-spacing: .005em; text-transform: uppercase; color: #100d16; }
  .rule { display: block; width: 64px; height: 4px; margin: 16px 0 24px; background: linear-gradient(90deg, var(--accent-deep), var(--accent-2)); }
  .body h2 { display: flex; align-items: baseline; gap: 11px; margin: 30px 0 10px; font-size: 11.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #100d16; }
  .body h2::before { content: ''; width: 3px; height: 13px; border-radius: 1px; background: linear-gradient(180deg, var(--accent-deep), var(--accent-2)); transform: translateY(2px); }
  .body h2::after { content: ''; flex: 1 1 auto; height: 1px; transform: translateY(-2px); background: linear-gradient(90deg, rgb(16 13 22 / .18), rgb(16 13 22 / 0)); }
  .body h1 { font-family: ${display}; font-weight: 400; font-size: 22px; letter-spacing: .01em; text-transform: uppercase; }
  .body h3 { margin: 20px 0 6px; font-size: 14px; color: #14101c; }
  .body p { margin: 0 0 11px; }
  .body strong { color: #0d0a12; }
  .body a { color: var(--accent-deep); text-decoration: underline; text-underline-offset: 2px; }
  .body ul, .body ol { padding-left: 20px; }
  .body li::marker { color: var(--accent-deep); }
  .body blockquote { margin: 16px 0; padding: 12px 16px; border-left: 3px solid var(--accent-2); background: rgb(var(--accent-rgb) / .08); font-style: italic; color: #2f283c; }
  .body mark { background: rgb(var(--accent-rgb) / .38); color: #241d31; }
  .body code { padding: 1px 5px; border-radius: 3px; background: rgb(16 13 22 / .07); font-family: ${mono}; font-size: .86em; }
  .body pre { padding: 13px 15px; border: 1px solid rgb(16 13 22 / .16); border-radius: 4px; background: rgb(16 13 22 / .045); overflow-x: auto; }
  .body hr { margin: 24px 0; border: 0; border-top: 1px solid rgb(16 13 22 / .16); }
  .body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px; border: 1px solid rgb(16 13 22 / .2); }
  .body th, .body td { border: 1px solid rgb(16 13 22 / .18); padding: 8px 11px; text-align: left; vertical-align: top; }
  .body th { background: #100d16; border-color: #100d16; font-family: ${mono}; font-size: 8.5px; letter-spacing: .16em; text-transform: uppercase; color: #f4f1ea; }
  .body th * { color: #f4f1ea; }
  .body tbody tr:nth-child(even) td { background: rgb(16 13 22 / .035); }
  .body table p { margin: 0; }
  .body ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  .body ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
  .body ul[data-type="taskList"] input { accent-color: var(--accent-deep); }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 40px; padding-top: 12px; border-top: 1px solid rgb(16 13 22 / .18); font-family: ${mono}; font-size: 8.5px; letter-spacing: .2em; text-transform: uppercase; color: rgb(16 13 22 / .5); }
  .foot span:first-child::before { content: ''; display: inline-block; width: 5px; height: 5px; margin-right: 8px; background: var(--accent-2); vertical-align: 1px; }
  @media print { body { padding: 0; background: #fff; } .sheet { max-width: none; box-shadow: none; } }
</style>
</head>
<body>
<div class="sheet">
  <header class="mast">
    ${mark ? `<img class="photo" src="${mark}" alt="">` : ''}
    <span class="veil"></span>
    <div class="mast-inner">
      <div class="brand">
        ${logo ? `<img src="${logo}" alt="">` : ''}
        <span class="wordmark">
          <strong>${bandName}</strong>
          <em>${tagline}</em>
        </span>
      </div>
      <span class="stamp ${status === 'final' ? '' : 'draft'}">${status === 'final' ? 'Final' : 'Draft'}</span>
    </div>
    <div class="mast-meta">
      <span class="kind">${kindLabel}</span>
      <span>No. ${docNo}</span>
      <span>${dateLabel}</span>
      ${profile?.handle ? `<span>@${profile.handle}</span>` : ''}
    </div>
  </header>
  <div class="body">
    <span class="kicker"><b>///</b>${kindLabel}</span>
    <h1>${title || 'Document'}</h1>
    <span class="rule"></span>
    ${body}
    <div class="foot">
      <span>${bandName} /// Post-hardcore</span>
      <span>${profile?.website ?? ''}</span>
    </div>
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
        <span className="tool-sep" />
        <EmojiPicker onPick={(emoji) => editor.chain().focus().insertContent(emoji).run()} />
      </div>

      <div
        className="doc-page"
        style={{ '--doc-mark': (profile?.docMarkStrength ?? 30) / 100 } as CSSProperties}
      >
        <header className="doc-sheet-mast">
          {profile?.docImageUrl ? (
            <img className="doc-sheet-photo" src={profile.docImageUrl} alt="" aria-hidden="true" />
          ) : null}
          <span className="doc-sheet-veil" aria-hidden="true" />

          <div className="doc-sheet-mast-inner">
            <div className="doc-sheet-brand">
              {profile?.avatarUrl ? (
                <img className="doc-sheet-logo" src={profile.avatarUrl} alt="" />
              ) : (
                <span className="doc-sheet-logo placeholder">{band.slice(0, 1)}</span>
              )}
              <span className="doc-sheet-wordmark">
                <strong>{band}</strong>
                <em>{profile?.bio?.split('\n')[0] || 'Post-hardcore // Ruhr'}</em>
              </span>
            </div>
            <span className={`doc-sheet-stamp ${status}`}>{status === 'final' ? 'Final' : 'Draft'}</span>
          </div>

          <div className="doc-sheet-mast-meta">
            <span className="doc-sheet-kind">{docKindLabel(kind)}</span>
            <span>No. {String(doc.id).padStart(3, '0')}</span>
            <span>{new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}</span>
            {profile?.handle ? <span>@{profile.handle}</span> : null}
          </div>
        </header>

        <div className="doc-sheet-body">
          <div className="doc-sheet-titlewrap">
            <span className="doc-sheet-kicker">
              <span className="doc-sheet-kicker-mark" aria-hidden="true">
                ///
              </span>
              {docKindLabel(kind)}
            </span>
            <h1 className="doc-sheet-title">{title || 'Untitled document'}</h1>
            <span className="doc-sheet-rule" aria-hidden="true" />
          </div>

          <EditorContent editor={editor} />

          <footer className="doc-sheet-foot">
            <span>{band} /// Post-hardcore</span>
            <span>{profile?.website ?? ''}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
