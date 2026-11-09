'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { iconDef } from '@/lib/docIcons';
import { partLabel } from '@/lib/kinds';

export type ImageAlign = 'left' | 'center' | 'right' | 'full';

/**
 * Image node with the two things a printed band document needs: a width in
 * percent and a placement (float left / right, centred, full bleed). Both are
 * plain attributes that survive `getHTML()` and therefore the HTML export.
 */
export const DocImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 70,
        parseHTML: (element) => {
          const raw =
            element.getAttribute('data-width') ?? (element as HTMLElement).style?.width ?? '';
          const value = parseFloat(String(raw).replace('%', ''));
          return Number.isFinite(value) && value > 0 ? Math.min(100, value) : 70;
        },
        renderHTML: () => ({}),
      },
      align: {
        default: 'center' as ImageAlign,
        parseHTML: (element) => (element.getAttribute('data-align') as ImageAlign) || 'center',
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const align = (node.attrs.align as ImageAlign) || 'center';
    const width = Number(node.attrs.width) || 70;
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes as Record<string, unknown>, {
        class: 'doc-img',
        'data-align': align,
        'data-width': String(width),
        style: `width:${align === 'full' ? 100 : width}%`,
      }),
    ];
  },
});

/**
 * Inline Font Awesome icon. The SVG is rendered straight into the document, so
 * the export is self-contained – no webfont, no CDN, no `<use>` reference.
 */
export const DocIcon = Node.create({
  name: 'docIcon',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: 'star',
        parseHTML: (element) => element.getAttribute('data-icon') ?? 'star',
        renderHTML: () => ({}),
      },
      size: {
        default: 16,
        parseHTML: (element) => Number(element.getAttribute('data-size')) || 16,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-icon]' }];
  },

  // keeps `getText()` from gluing two words together around an icon
  renderText() {
    return ' ';
  },

  renderHTML({ node }) {
    const definition = iconDef(String(node.attrs.name));
    const size = Number(node.attrs.size) || 16;
    return [
      'span',
      {
        class: 'doc-icon',
        'data-icon': definition.name,
        'data-size': String(size),
        style: `--ico:${size}px`,
      },
      [
        'svg',
        { viewBox: definition.viewBox, 'aria-hidden': 'true', focusable: 'false' },
        ...definition.paths.map((d) => ['path', { d }]),
      ],
    ];
  },

  addCommands() {
    return {
      insertDocIcon:
        (attrs: { name?: string; size?: number }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { name: attrs.name ?? 'star', size: attrs.size ?? 16 },
          }),
    } as never;
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    docIcon: {
      insertDocIcon: (attrs: { name?: string; size?: number }) => ReturnType;
    };
  }
}

/**
 * A real song part (intro, verse, chorus, bridge …) as a block container.
 * The visible label lives in `data-*` attributes instead of the text, so it
 * stays out of the copy, survives the HTML export and prints with the sheet.
 */
export const DocSection = Node.create({
  name: 'docSection',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      kind: {
        default: 'verse',
        parseHTML: (element) => element.getAttribute('data-part') ?? 'verse',
        renderHTML: () => ({}),
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? '',
        renderHTML: () => ({}),
      },
      tag: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-tag') ?? '',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-part]' }];
  },

  renderHTML({ node }) {
    const kind = String(node.attrs.kind || 'verse');
    return [
      'section',
      {
        class: 'doc-section',
        'data-part': kind,
        'data-label': String(node.attrs.label || partLabel(kind)),
        'data-tag': String(node.attrs.tag || ''),
      },
      0,
    ];
  },

  addCommands() {
    return {
      insertDocSection:
        (attrs: { kind?: string; label?: string; tag?: string } = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
            content: [{ type: 'paragraph' }],
          }),
    } as never;
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    docSection: {
      insertDocSection: (attrs?: { kind?: string; label?: string; tag?: string }) => ReturnType;
    };
  }
}
