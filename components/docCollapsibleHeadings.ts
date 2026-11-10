import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const collapseKey = new PluginKey<CollapseState>('docCollapsibleHeadings');

type CollapseState = { collapsed: Set<number>; enabled: boolean };
type HeadingInfo = { pos: number; level: number; node: any };

function headingsOf(doc: any): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'heading') {
      headings.push({ pos, level: Number(node.attrs.level) || 1, node });
    }
  });
  return headings;
}

/**
 * Hides every block between a collapsed h2 and the next h1/h2. Nested section
 * nodes are descended into, so h2s inside `DocSection` (lyrics) work as well.
 */
function hideRange(doc: any, from: number, to: number, decorations: Decoration[]) {
  const walk = (node: any, nodeFrom: number) => {
    const nodeTo = nodeFrom + node.nodeSize;
    if (nodeTo <= from || nodeFrom >= to) return;
    if (nodeFrom >= from && nodeTo <= to) {
      decorations.push(Decoration.node(nodeFrom, nodeTo, { class: 'doc-collapsed-content' }));
      return;
    }
    if (node.content.size) {
      node.forEach((child: any, offset: number) => walk(child, nodeFrom + 1 + offset));
    }
  };
  doc.forEach((child: any, offset: number) => walk(child, offset));
}

/**
 * Small chevron in front of every h2. The content below it – every block up to
 * the next h1/h2 – is hidden while collapsed. The toggle is a ProseMirror
 * decoration, so it never becomes part of the document HTML or an export.
 */
export const DocCollapsibleHeadings = Extension.create<{ enabled: boolean }>({
  name: 'docCollapsibleHeadings',

  addOptions() {
    return { enabled: true };
  },

  addCommands() {
    return {
      setHeadingsCollapsible:
        (enabled: boolean) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(collapseKey, { enabled }));
          return true;
        },
    } as never;
  },

  addProseMirrorPlugins() {
    const initiallyEnabled = this.options.enabled;
    return [
      new Plugin<CollapseState>({
        key: collapseKey,

        state: {
          init: () => ({ collapsed: new Set<number>(), enabled: initiallyEnabled }),
          apply(transaction, value) {
            const meta = transaction.getMeta(collapseKey) as
              | { toggle?: number; enabled?: boolean }
              | undefined;
            if (meta?.enabled === false) {
              return { collapsed: new Set<number>(), enabled: false };
            }
            const enabled = meta?.enabled ?? value.enabled;
            const next = new Set<number>();
            value.collapsed.forEach((pos) => {
              const mapped = transaction.mapping.map(pos, -1);
              if (mapped >= 0) next.add(mapped);
            });
            if (meta?.toggle != null && enabled) {
              if (next.has(meta.toggle)) next.delete(meta.toggle);
              else next.add(meta.toggle);
            }
            return { collapsed: next, enabled };
          },
        },

        props: {
          decorations(state) {
            const value = collapseKey.getState(state) ?? { collapsed: new Set<number>(), enabled: false };
            if (!value.enabled) return null;
            const collapsed = value.collapsed;
            const headings = headingsOf(state.doc);
            const decorations: Decoration[] = [];

            headings.forEach((heading, index) => {
              if (heading.level !== 2) return;

              const next = headings.slice(index + 1).find((entry) => entry.level <= 2);
              const contentStart = heading.pos + heading.node.nodeSize;
              const contentEnd = next ? next.pos : state.doc.content.size;
              const isCollapsed = collapsed.has(heading.pos);
              const hasContent = contentEnd > contentStart;

              decorations.push(
                Decoration.widget(
                  heading.pos + 1,
                  (view) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = `doc-collapse-toggle${isCollapsed ? ' is-collapsed' : ''}`;
                    button.contentEditable = 'false';
                    button.tabIndex = 0;
                    button.textContent = isCollapsed ? '▸' : '▾';
                    button.setAttribute('aria-expanded', String(!isCollapsed));
                    button.setAttribute('aria-label', isCollapsed ? 'Abschnitt aufklappen' : 'Abschnitt zuklappen');
                    button.title = hasContent
                      ? isCollapsed
                        ? 'Abschnitt aufklappen'
                        : 'Abschnitt zuklappen'
                      : 'Kein Inhalt unter dieser Überschrift';
                    button.disabled = !hasContent;
                    button.addEventListener('mousedown', (event) => event.preventDefault());
                    button.addEventListener('click', (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!hasContent) return;
                      const transaction = view.state.tr.setMeta(collapseKey, { toggle: heading.pos });
                      if (!isCollapsed) {
                        const headingEnd = heading.pos + heading.node.nodeSize - 1;
                        transaction.setSelection(
                          TextSelection.near(view.state.doc.resolve(headingEnd), -1)
                        );
                      }
                      view.dispatch(transaction);
                    });
                    return button;
                  },
                  { side: -1 }
                )
              );

              if (isCollapsed) {
                decorations.push(
                  Decoration.node(heading.pos, heading.pos + heading.node.nodeSize, {
                    class: 'doc-collapsed-heading',
                  })
                );
                hideRange(state.doc, contentStart, contentEnd, decorations);
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    docCollapsibleHeadings: {
      setHeadingsCollapsible: (enabled: boolean) => ReturnType;
    };
  }
}
