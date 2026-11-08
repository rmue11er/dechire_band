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
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconCheck,
  IconCode,
  IconHash,
  IconHighlight,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconPin,
  IconQuote,
  IconRedo,
  IconStrike,
  IconTask,
  IconTrash,
  IconUnderline,
  IconUndo,
} from '@/components/icons';
import { Field } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { Note } from '@/lib/types';

type Status = 'idle' | 'dirty' | 'saving' | 'saved';

export default function NoteEditor({
  note,
  folders,
  onSaved,
  onDeleted,
}: {
  note: Note;
  folders: string[];
  onSaved: (note: Note) => void;
  onDeleted: (id: number) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [folder, setFolder] = useState(note.folder);
  const [tags, setTags] = useState(note.tags.join(', '));
  const [pinned, setPinned] = useState(note.pinned);
  const [status, setStatus] = useState<Status>('idle');
  const [savedAt, setSavedAt] = useState<string>(note.updatedAt);
  const [words, setWords] = useState(0);
  const [tick, setTick] = useState(0);
  const dirtyRef = useRef(false);
  const versionRef = useRef(0);
  const contentRef = useRef({ html: note.content, text: note.plainText });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    versionRef.current += 1;
    setStatus('dirty');
    setTick((value) => value + 1);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Sit down. Write it out. Even if it hurts …' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: note.content || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'prose note-content', spellcheck: 'true' },
    },
    onUpdate: ({ editor: instance }) => {
      contentRef.current = { html: instance.getHTML(), text: instance.getText() };
      setWords(instance.getText().split(/\s+/).filter(Boolean).length);
      markDirty();
    },
  });

  // Switching notes: take over content and fields
  useEffect(() => {
    setTitle(note.title);
    setFolder(note.folder);
    setTags(note.tags.join(', '));
    setPinned(note.pinned);
    setStatus('idle');
    setSavedAt(note.updatedAt);
    contentRef.current = { html: note.content, text: note.plainText };
    dirtyRef.current = false;
    if (editor) {
      editor.commands.setContent(note.content || '<p></p>', false);
      setWords(editor.getText().split(/\s+/).filter(Boolean).length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, editor]);

  const save = useCallback(async () => {
    if (!dirtyRef.current) return;
    const versionAtStart = versionRef.current;
    setStatus('saving');
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled',
          content: contentRef.current.html,
          plainText: contentRef.current.text,
          folder: folder.trim() || 'Allgemein',
          tags: tags
            .split(',')
            .map((tag) => tag.trim().replace(/^#/, ''))
            .filter(Boolean),
          pinned,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      onSaved(data.note);
      setSavedAt(data.note.updatedAt);
      const stillDirty = versionRef.current !== versionAtStart;
      dirtyRef.current = stillDirty;
      setStatus(stillDirty ? 'dirty' : 'saved');
      if (stillDirty) setTick((value) => value + 1);
    } catch (error: any) {
      setStatus('dirty');
      toast(error.message ?? 'Failed to save', 'error');
    }
  }, [note.id, title, folder, tags, pinned, onSaved]);

  // Autosave: every change (text or fields) restarts the timer
  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(save, 800);
    return () => clearTimeout(timer);
  }, [tick, title, folder, tags, pinned, save]);

  // Keyboard shortcuts
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
    if (!window.confirm('Delete this note?')) return;
    const response = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
    if (response.ok) {
      onDeleted(note.id);
      toast('Note deleted');
    }
  };

  if (!editor) {
    return (
      <div className="panel notes-editor-panel">
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const tool = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string
  ) => (
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

  return (
    <div className="panel notes-editor-panel">
      <div className="note-head">
        <input
          className="note-title-input"
          placeholder="Note title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            markDirty();
          }}
        />
        <div className="note-head-actions">
          <span className={`note-status ${status}`}>
            {status === 'saving'
              ? 'Saving …'
              : status === 'dirty'
              ? 'Unsaved'
              : status === 'saved'
              ? 'Saved'
              : `Last edited ${timeAgo(savedAt)}`}
          </span>
          <button
            type="button"
            className={`btn btn-icon ${pinned ? 'pinned' : ''}`}
            onClick={() => {
              setPinned(!pinned);
              markDirty();
            }}
            title={pinned ? 'Unpin' : 'Pin'}
          >
            <IconPin size={15} />
          </button>
          <button type="button" className="btn btn-icon" onClick={remove} title="Delete note">
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      <div className="note-meta">
        <Field label="Folder">
          <input
            className="input"
            list="note-folders"
            value={folder}
            onChange={(event) => {
              setFolder(event.target.value);
              markDirty();
            }}
          />
        </Field>
        <datalist id="note-folders">
          {folders.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <Field label="Tags" hint={<span className="count">comma separated</span>}>
          <input
            className="input"
            placeholder="show, setlist, ideas"
            value={tags}
            onChange={(event) => {
              setTags(event.target.value);
              markDirty();
            }}
          />
        </Field>
      </div>

      <div className="note-toolbar">
        <div className="tool-group">
          {tool(false, () => editor.chain().focus().undo().run(), <IconUndo size={15} />, 'Undo')}
          {tool(false, () => editor.chain().focus().redo().run(), <IconRedo size={15} />, 'Redo')}
        </div>
        <span className="tool-sep" />
        <div className="tool-group">
          {tool(
            editor.isActive('heading', { level: 1 }),
            () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            <span className="tool-text">H1</span>,
            'Heading 1'
          )}
          {tool(
            editor.isActive('heading', { level: 2 }),
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            <span className="tool-text">H2</span>,
            'Heading 2'
          )}
          {tool(
            editor.isActive('heading', { level: 3 }),
            () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            <span className="tool-text">H3</span>,
            'Heading 3'
          )}
        </div>
        <span className="tool-sep" />
        <div className="tool-group">
          {tool(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <IconBold size={15} />, 'Bold')}
          {tool(
            editor.isActive('italic'),
            () => editor.chain().focus().toggleItalic().run(),
            <IconItalic size={15} />,
            'Italic'
          )}
          {tool(
            editor.isActive('underline'),
            () => editor.chain().focus().toggleUnderline().run(),
            <IconUnderline size={15} />,
            'Underline'
          )}
          {tool(
            editor.isActive('strike'),
            () => editor.chain().focus().toggleStrike().run(),
            <IconStrike size={15} />,
            'Strikethrough'
          )}
          {tool(
            editor.isActive('highlight'),
            () => editor.chain().focus().toggleHighlight().run(),
            <IconHighlight size={15} />,
            'Highlight'
          )}
        </div>
        <span className="tool-sep" />
        <div className="tool-group">
          {tool(
            editor.isActive('bulletList'),
            () => editor.chain().focus().toggleBulletList().run(),
            <IconList size={15} />,
            'Bullet list'
          )}
          {tool(
            editor.isActive('orderedList'),
            () => editor.chain().focus().toggleOrderedList().run(),
            <IconListOrdered size={15} />,
            'Numbered list'
          )}
          {tool(
            editor.isActive('taskList'),
            () => editor.chain().focus().toggleTaskList().run(),
            <IconTask size={15} />,
            'Checklist'
          )}
        </div>
        <span className="tool-sep" />
        <div className="tool-group">
          {tool(
            editor.isActive('blockquote'),
            () => editor.chain().focus().toggleBlockquote().run(),
            <IconQuote size={15} />,
            'Quote'
          )}
          {tool(
            editor.isActive('codeBlock'),
            () => editor.chain().focus().toggleCodeBlock().run(),
            <IconCode size={15} />,
            'Code block'
          )}
          {tool(
            editor.isActive('link'),
            () => {
              const url = window.prompt('Link URL', editor.getAttributes('link').href ?? 'https://');
              if (url === null) return;
              if (!url) {
                editor.chain().focus().unsetLink().run();
              } else {
                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
              }
            },
            <IconLink size={15} />,
            'Link'
          )}
        </div>
        <span className="tool-sep" />
        <div className="tool-group">
          {tool(
            editor.isActive({ textAlign: 'left' }),
            () => editor.chain().focus().setTextAlign('left').run(),
            <IconAlignLeft size={15} />,
            'Align left'
          )}
          {tool(
            editor.isActive({ textAlign: 'center' }),
            () => editor.chain().focus().setTextAlign('center').run(),
            <IconAlignCenter size={15} />,
            'Align center'
          )}
          {tool(
            editor.isActive({ textAlign: 'right' }),
            () => editor.chain().focus().setTextAlign('right').run(),
            <IconAlignRight size={15} />,
            'Align right'
          )}
        </div>
      </div>

      <div className="note-editor-scroll">
        <EditorContent editor={editor} />
      </div>

      <div className="note-foot">
        <span className="mono">{words} words</span>
        <span className="mono">
          <IconHash size={11} /> {tags || 'no tags'}
        </span>
        <button type="button" className="btn btn-sm btn-ghost" onClick={save}>
          <IconCheck size={13} /> Save now
        </button>
      </div>
    </div>
  );
}
