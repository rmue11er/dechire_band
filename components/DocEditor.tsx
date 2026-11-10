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
  IconCopy,
  IconDownload,
  IconMusic,
  IconExternal,
  IconItalic,
  IconImage,
  IconLink,
  IconList,
  IconListOrdered,
  IconPin,
  IconQuote,
  IconRedo,
  IconShare,
  IconStrike,
  IconTable,
  IconTask,
  IconTrash,
  IconUnderline,
  IconUndo,
} from '@/components/icons';
import DocAudio from '@/components/DocAudio';
import EmojiPicker from '@/components/EmojiPicker';
import IconPicker from '@/components/IconPicker';
import MediaPicker from '@/components/MediaPicker';
import { DocIcon, DocImage, DocSection, type ImageAlign } from '@/components/docNodes';
import { Modal } from '@/components/ui';
import { usePalette } from '@/components/PaletteProvider';
import {
  DOC_KINDS,
  LYRIC_PARTS,
  docKindLabel,
  guessPartKind,
  isNumberedPart,
  partLabel,
  type PartKind,
} from '@/lib/kinds';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type {
  BandDocument,
  DocFolder,
  DocumentAudio,
  DocumentKind,
  MediaItem,
  Profile,
} from '@/lib/types';

type Status = 'idle' | 'dirty' | 'saving' | 'saved';

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'document';

export default function DocEditor({
  document: doc,
  folders,
  onSaved,
  onDeleted,
}: {
  document: BandDocument;
  folders: DocFolder[];
  onSaved: (doc: BandDocument) => void;
  onDeleted: (id: number) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [kind, setKind] = useState<DocumentKind>(doc.kind);
  const [folderId, setFolderId] = useState<number | null>(doc.folderId);
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
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [audio, setAudio] = useState<DocumentAudio[]>(doc.audio ?? []);
  const [audioOpen, setAudioOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const ciPrimary = palette.find((color) => color.role === 'primary')?.hex ?? '#e2e29c';
  const band = profile?.bandName ?? 'déchire';

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetch('/api/profile')
      .then((response) => response.json())
      .then((data) => setProfile(data.profile ?? null))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    fetch('/api/media')
      .then((response) => response.json())
      .then((data) => setMedia(data.media ?? []))
      .catch(() => setMedia([]));
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
      DocImage.configure({ inline: false, allowBase64: false }),
      DocIcon,
      DocSection,
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
    setFolderId(doc.folderId);
    setTags(doc.tags.join(', '));
    setSaveState('idle');
    setSavedAt(doc.updatedAt);
    setAudio(doc.audio ?? []);
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
          folderId,
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
  }, [doc.id, title, kind, folderId, tags, onSaved]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(save, 900);
    return () => clearTimeout(timer);
  }, [tick, title, kind, folderId, tags, save]);

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

  const insertImage = (item: MediaItem) => {
    if (!editor) return;
    const position = editor.state.selection.from;
    editor
      .chain()
      .focus()
      .setImage({ src: item.url, alt: item.alt || item.title, title: item.title })
      .run();
    // select the node we just dropped so the size/position tools show up
    if (editor.state.doc.nodeAt(position)?.type.name === 'image') {
      editor.chain().setNodeSelection(position).run();
    }
  };

  const refreshAudio = async () => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/audio`);
      const data = await response.json();
      if (response.ok) setAudio(data.audio ?? []);
    } catch {
      /* keep what we have */
    }
  };

  const attachAudio = async (item: MediaItem) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: item.id, label: item.title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not attach the audio file');
      setAudio(data.audio ?? []);
      toast(`${item.title} attached`);
    } catch (error: any) {
      toast(error.message ?? 'Could not attach the audio file', 'error');
    }
  };

  const detachAudio = async (id: number) => {
    setAudio((current) => current.filter((track) => track.id !== id));
    const response = await fetch(`/api/document-audio/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast('Could not detach the audio file', 'error');
      refreshAudio();
    }
  };

  const renameAudio = async (id: number, label: string) => {
    setAudio((current) => current.map((track) => (track.id === id ? { ...track, label } : track)));
    const response = await fetch(`/api/document-audio/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (!response.ok) {
      toast('Could not rename the demo', 'error');
      refreshAudio();
    }
  };

  const shareUrl = doc.shareToken && origin ? `${origin}/share/${doc.shareToken}` : '';

  const createShareLink = async (rotate = false) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the link');
      onSaved(data.document);
      toast(rotate ? 'Old link invalidated, new link created' : 'Public link created');
    } catch (error: any) {
      toast(error.message ?? 'Could not create the link', 'error');
    }
  };

  const stopSharing = async () => {
    const response = await fetch(`/api/documents/${doc.id}/share`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      toast(data.error ?? 'Could not disable the link', 'error');
      return;
    }
    onSaved(data.document);
    toast('Public link disabled');
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('Link copied');
    } catch {
      toast('Could not copy – select the link manually', 'error');
    }
  };

  /* ---------------------------------------------------------- song parts */

  /** Top-level parts of the sheet, in reading order. */
  const collectParts = () => {
    if (!editor) return [] as { pos: number; size: number; kind: string; label: string; tag: string }[];
    const parts: { pos: number; size: number; kind: string; label: string; tag: string }[] = [];
    editor.state.doc.forEach((node, offset) => {
      if (node.type.name !== 'docSection') return;
      const kind = String(node.attrs.kind || 'verse');
      parts.push({
        pos: offset,
        size: node.nodeSize,
        kind,
        label: String(node.attrs.label || partLabel(kind)),
        tag: String(node.attrs.tag || ''),
      });
    });
    return parts;
  };

  const countParts = (kind: string, excludePos?: number) =>
    collectParts().filter((part) => part.kind === kind && part.pos !== excludePos).length;

  const autoPartLabel = (kind: PartKind, excludePos?: number) => {
    const base = partLabel(kind);
    const used = countParts(kind, excludePos);
    return isNumberedPart(kind) || used > 0 ? `${base} ${used + 1}` : base;
  };

  const sectionDepthAtCursor = () => {
    if (!editor) return 0;
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === 'docSection') return depth;
    }
    return 0;
  };

  const insertPart = (kind: PartKind) => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    // A part always lands after the block the cursor sits in – a section found
    // there is a top-level block itself, so this is also "after the part".
    const pos = $from.depth > 0 ? $from.after(1) : $from.pos;
    editor
      .chain()
      .insertContentAt(pos, {
        type: 'docSection',
        attrs: { kind, label: autoPartLabel(kind), tag: '' },
        content: [{ type: 'paragraph' }],
      })
      .run();
    editor.chain().focus().setTextSelection(pos + 2).scrollIntoView().run();
  };

  const changePartKind = (kind: PartKind) => {
    if (!editor) return;
    const attrs = editor.getAttributes('docSection');
    const previousKind = String(attrs.kind || 'verse');
    const label = String(attrs.label || partLabel(previousKind));
    const previousBase = partLabel(previousKind);
    const autoLabel = !label || label === previousBase || label.startsWith(`${previousBase} `);
    const depth = sectionDepthAtCursor();
    const pos = depth ? editor.state.selection.$from.before(depth) : undefined;
    editor
      .chain()
      .updateAttributes('docSection', {
        kind,
        label: autoLabel ? autoPartLabel(kind, pos) : label,
      })
      .run();
  };

  const setPartAttr = (attrs: Record<string, string>) => {
    if (!editor) return;
    editor.chain().updateAttributes('docSection', attrs).run();
  };

  const endPart = () => {
    if (!editor) return;
    const depth = sectionDepthAtCursor();
    if (!depth) return;
    const pos = editor.state.selection.$from.after(depth);
    editor.chain().insertContentAt(pos, { type: 'paragraph' }).run();
    editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
  };

  const unwrapPart = () => {
    if (!editor) return;
    const depth = sectionDepthAtCursor();
    if (!depth) return;
    const { $from } = editor.state.selection;
    const node = $from.node(depth);
    const start = $from.before(depth);
    const content = node.content.toJSON();
    editor
      .chain()
      .insertContentAt(
        { from: start, to: start + node.nodeSize },
        content.length ? content : [{ type: 'paragraph' }]
      )
      .run();
    editor.chain().focus().setTextSelection(start + 1).scrollIntoView().run();
  };

  const jumpToPart = (pos: number) => {
    editor?.chain().focus().setTextSelection(pos + 2).scrollIntoView().run();
  };

  /** Swap two neighbouring parts – only when nothing sits between them. */
  const movePart = (index: number, direction: -1 | 1) => {
    if (!editor) return;
    const parts = collectParts();
    const current = parts[index];
    const neighbour = parts[index + direction];
    if (!current || !neighbour) return;
    const adjacent =
      direction < 0
        ? neighbour.pos + neighbour.size === current.pos
        : current.pos + current.size === neighbour.pos;
    if (!adjacent) {
      toast('Parts need to sit directly next to each other to swap', 'error');
      return;
    }
    const currentNode = editor.state.doc.nodeAt(current.pos);
    const neighbourNode = editor.state.doc.nodeAt(neighbour.pos);
    if (!currentNode || !neighbourNode) return;
    const from = Math.min(current.pos, neighbour.pos);
    const to = Math.max(current.pos + current.size, neighbour.pos + neighbour.size);
    const ordered = direction < 0 ? [currentNode, neighbourNode] : [neighbourNode, currentNode];
    editor.view.dispatch(editor.state.tr.replaceWith(from, to, ordered));
  };

  const countTopHeadings = () => {
    if (!editor) return 0;
    let count = 0;
    editor.state.doc.forEach((node) => {
      if (node.type.name === 'heading' && Number(node.attrs.level) >= 2) count += 1;
    });
    return count;
  };

  /** Older lyric sheets used plain headings – turn them into real parts. */
  const convertHeadings = () => {
    if (!editor) return;
    const json = editor.getJSON() as any;
    const nodes: any[] = [];
    let section: any = null;
    for (const node of json.content ?? []) {
      if (node.type === 'heading' && Number(node.attrs?.level ?? 2) >= 2) {
        const text = (node.content ?? [])
          .map((child: any) => child.text ?? '')
          .join('')
          .trim();
        const kind = guessPartKind(text);
        section = {
          type: 'docSection',
          attrs: { kind, label: text || partLabel(kind), tag: '' },
          content: [],
        };
        nodes.push(section);
      } else if (section) {
        section.content.push(node);
      } else {
        nodes.push(node);
      }
    }
    for (const node of nodes) {
      if (node.type === 'docSection' && !node.content.length) {
        node.content.push({ type: 'paragraph' });
      }
    }
    editor.commands.setContent({ type: 'doc', content: nodes });
    toast('Headings turned into parts');
  };

  /** The export leaves `/api/files/…` behind – so every image is inlined as data URL. */
  const inlineImages = async (html: string) => {
    const sources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((src) => src && !src.startsWith('data:'));
    if (!sources.length) return html;
    const unique = [...new Set(sources)];
    const resolved = await Promise.all(unique.map(async (src) => [src, await toDataUrl(src)] as const));
    const map = new Map(resolved);
    return html.replace(/(<img[^>]*?src=")([^"]+)(")/g, (whole, head, src, tail) =>
      map.has(src) ? `${head}${map.get(src)}${tail}` : whole
    );
  };

  /** Small demos travel inside the HTML file, big ones keep their library URL. */
  const inlineAudio = async (tracks: DocumentAudio[]) => {
    const budget = 24 * 1024 * 1024;
    let used = 0;
    const items: { label: string; src: string }[] = [];
    for (const track of tracks) {
      const src =
        used + track.media.size <= budget
          ? await toDataUrl(track.media.url)
          : new URL(track.media.url, window.location.href).href;
      if (src.startsWith('data:')) used += track.media.size;
      items.push({ label: track.label || 'Demo', src });
    }
    return items;
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const downloadHtml = async () => {
    const [body, demos] = await Promise.all([
      inlineImages(contentRef.current.html),
      inlineAudio(audio),
    ]);
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
    const accentRgb = token('--accent-rgb', '226 226 156');
    const tagline = profile?.bio?.split('\n')[0] || 'emotional post-hardcore /// augsburg';
    const mono = 'ui-monospace, "SF Mono", Menlo, monospace';
    const display = '"Redaction", "Instrument Serif", Georgia, serif';
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title || 'Document'} · ${bandName}</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  :root { --accent: ${accent}; --accent-2: ${accent2}; --accent-deep: ${accentDeep}; --accent-rgb: ${accentRgb}; --mark: ${strength}; }
  body { margin: 0; padding: 26px 16px 48px; background: #151413; color: #1d1b19; font: 14.5px/1.72 "Inter", "Helvetica Neue", Arial, sans-serif; }
  .sheet { position: relative; overflow: hidden; max-width: 820px; margin: 0 auto; background: #f4f1ea; background-image: radial-gradient(rgb(21 20 19 / .045) .5px, transparent .6px); background-size: 3px 3px; box-shadow: 0 26px 60px -30px rgba(0, 0, 0, .8); }
  .mast { position: relative; overflow: hidden; padding: 22px 34px 0; background: #0b0b0a; color: #f5f1ea; }
  .photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; opacity: var(--mark); filter: grayscale(1) contrast(1.1) brightness(1.05); }
  .veil { position: absolute; inset: 0; background: linear-gradient(100deg, rgb(11 11 10 / .95) 0%, rgb(11 11 10 / .82) 42%, rgb(11 11 10 / .52) 100%); }
  .mast-inner { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 13px; min-width: 0; }
  .brand img { width: 40px; height: 40px; object-fit: cover; border-radius: 3px; background: rgba(255, 255, 255, .06); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .16); }
  .wordmark { display: grid; gap: 5px; }
  .wordmark strong { font-family: ${display}; font-weight: 400; font-size: 27px; line-height: .9; letter-spacing: .015em; color: #faf7f1; }
  .wordmark em { font-style: normal; font-family: ${mono}; font-size: 8px; letter-spacing: .24em; text-transform: uppercase; color: var(--accent); opacity: .85; }
  .mast-meta { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 10px 0 13px; border-top: 1px solid rgba(255, 255, 255, .12); font-family: ${mono}; font-size: 8.5px; letter-spacing: .18em; text-transform: uppercase; color: rgba(255, 255, 255, .62); }
  .mast-meta .kind { color: var(--accent); }
  .mast::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); z-index: 2; }
  .body { position: relative; padding: 30px 34px 44px; }
  .kicker { display: inline-flex; align-items: baseline; gap: 8px; font-family: ${mono}; font-size: 9px; letter-spacing: .26em; text-transform: uppercase; color: var(--accent-deep); }
  .kicker b { font-family: ${display}; font-weight: 400; font-size: 11px; letter-spacing: 0; color: var(--accent-2); }
  h1 { margin: 9px 0 0; font-family: ${display}; font-weight: 400; font-size: 36px; line-height: 1.05; letter-spacing: .005em; color: #141311; }
  .rule { display: block; width: 64px; height: 4px; margin: 16px 0 24px; background: linear-gradient(90deg, var(--accent-deep), var(--accent-2)); }
  .body h2 { display: flex; align-items: baseline; gap: 11px; margin: 30px 0 10px; font-size: 11.5px; font-weight: 800; letter-spacing: .14em; color: #141311; }
  .body h2::before { content: ''; width: 3px; height: 13px; border-radius: 1px; background: linear-gradient(180deg, var(--accent-deep), var(--accent-2)); transform: translateY(2px); }
  .body h2::after { content: ''; flex: 1 1 auto; height: 1px; transform: translateY(-2px); background: linear-gradient(90deg, rgb(20 19 17 / .18), rgb(20 19 17 / 0)); }
  .body h1 { font-family: ${display}; font-weight: 400; font-size: 22px; letter-spacing: .01em; }
  .body h3 { margin: 20px 0 6px; font-size: 14px; color: #161514; }
  .body p { margin: 0 0 11px; }
  .sheet.lyrics .body { font-size: 15px; line-height: 1.85; }
  .sheet.lyrics .body p { margin: 0 0 3px; }
  .doc-section { position: relative; margin: 28px 0 0; padding: 12px 0 2px 17px; border-left: 2px solid rgb(20 19 17 / .22); }
  .doc-section::before { content: attr(data-label); display: block; margin: 0 0 7px; font-family: ${mono}; font-size: 8.5px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: rgb(20 19 17 / .55); }
  .doc-section[data-tag]:not([data-tag=''])::after { content: attr(data-tag); position: absolute; top: 10px; right: 0; padding: 1px 6px; border: 1px solid rgb(var(--accent-rgb) / .45); border-radius: 2px; font-family: ${mono}; font-size: 8px; letter-spacing: .12em; color: var(--accent-deep); }
  .doc-section[data-part='chorus'] { border-left-color: var(--accent); border-left-width: 3px; background: linear-gradient(90deg, rgb(var(--accent-rgb) / .09), transparent 62%); }
  .doc-section[data-part='chorus']::before { color: var(--accent-deep); }
  .doc-section[data-part='prechorus'],
  .doc-section[data-part='bridge'] { border-left-color: var(--accent-2); }
  .doc-section[data-part='prechorus']::before,
  .doc-section[data-part='bridge']::before { color: var(--accent-2); }
  .doc-section[data-part='bridge'] { border-left-style: dashed; }
  .doc-section[data-part='intro'],
  .doc-section[data-part='outro'] { border-left-style: dotted; border-left-color: rgb(20 19 17 / .34); }
  .doc-section[data-part='breakdown'],
  .doc-section[data-part='solo'] { border-left-color: #141311; }
  .body strong { color: #0d0d0c; }
  .body a { color: var(--accent-deep); text-decoration: underline; text-underline-offset: 2px; }
  .body ul, .body ol { padding-left: 20px; }
  .body li::marker { color: var(--accent-deep); }
  .body blockquote { margin: 16px 0; padding: 12px 16px; border-left: 3px solid var(--accent-2); background: rgb(var(--accent-rgb) / .08); font-style: italic; color: #3a3633; }
  .body mark { background: rgb(var(--accent-rgb) / .38); color: #262321; }
  .body code { padding: 1px 5px; border-radius: 3px; background: rgb(20 19 17 / .07); font-family: ${mono}; font-size: .86em; }
  .body pre { padding: 13px 15px; border: 1px solid rgb(20 19 17 / .16); border-radius: 4px; background: rgb(20 19 17 / .045); overflow-x: auto; }
  .body hr { margin: 24px 0; border: 0; border-top: 1px solid rgb(20 19 17 / .16); }
  .body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px; border: 1px solid rgb(20 19 17 / .2); }
  .body th, .body td { border: 1px solid rgb(20 19 17 / .18); padding: 8px 11px; text-align: left; vertical-align: top; }
  .body th { background: #141311; border-color: #141311; font-family: ${mono}; font-size: 8.5px; letter-spacing: .16em; text-transform: uppercase; color: #f4f1ea; }
  .body th * { color: #f4f1ea; }
  .body tbody tr:nth-child(even) td { background: rgb(20 19 17 / .035); }
  .body table p { margin: 0; }
  .body img.doc-img { display: block; height: auto; margin: 18px auto; border-radius: 3px; box-shadow: 0 12px 26px -18px rgba(0, 0, 0, .8); page-break-inside: avoid; }
  .body img.doc-img[data-align="left"] { float: left; margin: 4px 20px 14px 0; }
  .body img.doc-img[data-align="right"] { float: right; margin: 4px 0 14px 20px; }
  .body img.doc-img[data-align="full"] { width: 100% !important; margin: 22px 0; }
  .body::after { content: ''; display: block; clear: both; }
  .body .doc-icon { display: inline-block; vertical-align: -.12em; line-height: 0; color: var(--accent-deep); }
  .body .doc-icon svg { width: var(--ico, 16px); height: var(--ico, 16px); fill: currentColor; }  .body ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  .body ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
  .body ul[data-type="taskList"] input { accent-color: var(--accent-deep); }
  .demos { display: grid; gap: 10px; margin: 30px 0 0; padding-top: 16px; border-top: 1px dashed rgb(20 19 17 / .26); }
  .demos-title { font-family: ${mono}; font-size: 8.5px; letter-spacing: .24em; text-transform: uppercase; color: var(--accent-deep); }
  .demos figure { margin: 0; }
  .demos figcaption { margin-bottom: 5px; font-size: 11.5px; font-weight: 700; color: #161514; }
  .demos audio { width: 100%; height: 36px; filter: grayscale(1) contrast(.9); }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 40px; padding-top: 12px; border-top: 1px solid rgb(20 19 17 / .18); font-family: ${mono}; font-size: 8.5px; letter-spacing: .2em; text-transform: uppercase; color: rgb(20 19 17 / .5); }
  .foot span:first-child::before { content: ''; display: inline-block; width: 5px; height: 5px; margin-right: 8px; background: var(--accent-2); vertical-align: 1px; }
  @media print { body { padding: 0; background: #fff; } .sheet { max-width: none; box-shadow: none; } }
</style>
</head>
<body>
<div class="sheet${kind === 'lyrics' ? ' lyrics' : ''}">
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
    ${
      demos.length
        ? `<div class="demos"><span class="demos-title">Demo</span>${demos
            .map(
              (track) =>
                `<figure><figcaption>${escapeHtml(track.label)}</figcaption><audio controls preload="metadata" src="${track.src}"></audio></figure>`
            )
            .join('')}</div>`
        : ''
    }
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

  const parts = collectParts();
  const headingCount = countTopHeadings();
  const selectionPos = editor.state.selection.from;
  const inSection = editor.isActive('docSection');
  const partAttrs = inSection ? editor.getAttributes('docSection') : null;
  const activePartIndex = parts.findIndex(
    (part) => selectionPos >= part.pos && selectionPos < part.pos + part.size
  );

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
          <button
            type="button"
            className={`btn btn-sm btn-ghost doc-share-btn ${doc.shareToken ? 'on' : ''}`}
            onClick={() => setShareOpen(true)}
            title={doc.shareToken ? 'Public link is active' : 'Share this document'}
          >
            <IconShare size={14} /> {doc.shareToken ? 'Shared' : 'Share'}
          </button>
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
        <label className="doc-field">
          <span className="label">Folder</span>
          <select
            className="select"
            value={folderId ?? ''}
            onChange={(event) => {
              setFolderId(event.target.value ? Number(event.target.value) : null);
              markDirty();
            }}
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
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

      <DocAudio
        tracks={audio}
        onAttach={() => setAudioOpen(true)}
        onRemove={detachAudio}
        onRename={renameAudio}
      />

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
        {tool(false, () => setMediaOpen(true), <IconImage size={15} />, 'Insert image')}
        <IconPicker
          onPick={(name) =>
            editor.chain().focus().insertContent({ type: 'docIcon', attrs: { name, size: 16 } }).run()
          }
        />
        <EmojiPicker onPick={(emoji) => editor.chain().focus().insertContent(emoji).run()} />
      </div>

      {inSection && partAttrs ? (
        <div className="doc-part-tools" data-part={String(partAttrs.kind || 'verse')}>
          <span className="doc-part-dot" aria-hidden="true" />
          <span className="doc-part-title mono">Part</span>
          <select
            className="select doc-part-select"
            value={String(partAttrs.kind || 'verse')}
            onChange={(event) => changePartKind(event.target.value as PartKind)}
            aria-label="Part type"
          >
            {LYRIC_PARTS.map((part) => (
              <option key={part.value} value={part.value}>
                {part.label}
              </option>
            ))}
          </select>
          <input
            className="input doc-part-name"
            value={String(partAttrs.label || '')}
            placeholder="Label"
            aria-label="Part label"
            onChange={(event) => setPartAttr({ label: event.target.value })}
          />
          <input
            className="input doc-part-tag"
            value={String(partAttrs.tag || '')}
            placeholder="×2 · half-time"
            aria-label="Part note"
            onChange={(event) => setPartAttr({ tag: event.target.value })}
          />
          <span className="tool-sep" />
          {['×2', '×3'].map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tool-text ${String(partAttrs.tag || '') === tag ? 'on' : ''}`}
              onClick={() => setPartAttr({ tag: String(partAttrs.tag || '') === tag ? '' : tag })}
              title={`Mark as repeated ${tag}`}
            >
              {tag}
            </button>
          ))}
          <span className="tool-sep" />
          <button type="button" className="tool-text" onClick={endPart}>
            End part
          </button>
          <button type="button" className="tool-text danger" onClick={unwrapPart}>
            Unwrap
          </button>
        </div>
      ) : null}

      {kind === 'lyrics' || parts.length ? (
        <div className="doc-lyric-bar">
          <span className="doc-lyric-label">Part</span>
          {LYRIC_PARTS.map((part) => (
            <button
              key={part.value}
              type="button"
              className="tool-text doc-part-chip"
              data-part={part.value}
              onClick={() => insertPart(part.value)}
              title={`Insert ${part.label}`}
            >
              {part.label}
            </button>
          ))}
          {kind === 'lyrics' && !parts.length && headingCount ? (
            <button type="button" className="tool-text doc-convert" onClick={convertHeadings}>
              Convert headings
            </button>
          ) : null}
          <span className="doc-lyric-hint">One sheet per song – title = song title.</span>
        </div>
      ) : null}

      {parts.length ? (
        <div className="doc-map">
          <span className="doc-map-caption mono">Structure</span>
          <div className="doc-map-rail">
            {parts.map((part, index) => (
              <div
                key={`${part.pos}-${index}`}
                className={`doc-map-part ${index === activePartIndex ? 'on' : ''}`}
                data-part={part.kind}
              >
                <button
                  type="button"
                  className="doc-map-jump"
                  onClick={() => jumpToPart(part.pos)}
                  title={`Jump to ${part.label}`}
                >
                  <span className="doc-map-index mono">{String(index + 1).padStart(2, '0')}</span>
                  <span className="doc-map-kind">{part.label}</span>
                  {part.tag ? <span className="doc-map-tag">{part.tag}</span> : null}
                </button>
                <span className="doc-map-move">
                  <button
                    type="button"
                    onClick={() => movePart(index, -1)}
                    disabled={index === 0}
                    title="Move part up"
                    aria-label={`Move ${part.label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => movePart(index, 1)}
                    disabled={index === parts.length - 1}
                    title="Move part down"
                    aria-label={`Move ${part.label} down`}
                  >
                    ↓
                  </button>
                </span>
              </div>
            ))}
          </div>
          <span className="doc-map-count mono">
            {parts.length} {parts.length === 1 ? 'part' : 'parts'}
          </span>
        </div>
      ) : null}

      {editor.isActive('image') ? (
        <div className="doc-img-tools">
          <span className="mono small muted">Image</span>
          <label className="doc-img-width">
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={Number(editor.getAttributes('image').width) || 70}
              onChange={(event) =>
                editor.chain().updateAttributes('image', { width: Number(event.target.value) }).run()
              }
            />
            <span className="mono small muted">{Number(editor.getAttributes('image').width) || 70}%</span>
          </label>
          <span className="tool-sep" />
          {(['left', 'center', 'right', 'full'] as ImageAlign[]).map((align) => (
            <button
              key={align}
              type="button"
              className={`tool-text ${editor.getAttributes('image').align === align ? 'on' : ''}`}
              onClick={() => editor.chain().updateAttributes('image', { align }).run()}
            >
              {align}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`doc-page ${kind === 'lyrics' ? 'lyrics' : ''}`.trim()}
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
                <em>{profile?.bio?.split('\n')[0] || 'emotional post-hardcore /// augsburg'}</em>
              </span>
            </div>
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
            {audio.length ? (
              <div className="doc-sheet-demos">
                <span className="doc-sheet-demos-label">
                  <IconMusic size={10} /> Demo
                </span>
                {audio.map((track) => (
                  <span key={track.id} className="doc-sheet-demo">
                    {track.label || 'Demo'}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <EditorContent editor={editor} />

          <footer className="doc-sheet-foot">
            <span>{band} /// Post-hardcore</span>
            <span>{profile?.website ?? ''}</span>
          </footer>
        </div>
      </div>

      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        media={media}
        selectedIds={[]}
        imagesOnly
        onConfirm={(ids) => {
          const item = media.find((entry) => entry.id === ids[0]);
          if (item) insertImage(item);
          setMediaOpen(false);
        }}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
      />

      <MediaPicker
        open={audioOpen}
        onClose={() => setAudioOpen(false)}
        media={media}
        selectedIds={[]}
        audioOnly
        onConfirm={(ids) => {
          const item = media.find((entry) => entry.id === ids[0]);
          if (item) attachAudio(item);
          setAudioOpen(false);
        }}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
      />

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share document"
        subtitle={
          audio.length
            ? 'Only this document – the attached demos come with it.'
            : 'Only this document, nothing else from the workspace.'
        }
        footer={
          doc.shareToken ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setShareOpen(false)}>
                Close
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => createShareLink(true)}>
                New link
              </button>
              <button type="button" className="btn btn-danger" onClick={stopSharing}>
                Stop sharing
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setShareOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => createShareLink(false)}>
                Create link
              </button>
            </>
          )
        }
      >
        <div className="doc-share-panel">
          {doc.shareToken ? (
            <>
              <label className="doc-share-field">
                <span className="label">Public link</span>
                <input
                  className="input"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <div className="doc-share-actions">
                <button type="button" className="btn btn-sm btn-primary" onClick={copyShareLink}>
                  <IconCopy size={13} /> Copy
                </button>
                <a className="btn btn-sm btn-ghost" href={shareUrl} target="_blank" rel="noreferrer">
                  <IconExternal size={13} /> Open
                </a>
              </div>
              <p className="small muted">
                Anyone with this link can read the document
                {audio.length
                  ? ` and play ${audio.length === 1 ? 'the demo' : `the ${audio.length} demos`}`
                  : ''}
                . “New link” invalidates the old one immediately.
              </p>
            </>
          ) : (
            <p className="small muted">
              Creates a public page with only this document – no sidebar, no other files, not indexed
              by search engines.
            </p>
          )}
          {audio.length ? (
            <p className="doc-share-audio-note">
              <IconMusic size={12} /> {audio.length === 1 ? 'The attached demo is' : `The ${audio.length} attached demos are`}{' '}
              playable on the shared page.
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
