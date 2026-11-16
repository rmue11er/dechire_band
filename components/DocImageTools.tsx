'use client';

import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { IconAlignCenter, IconAlignLeft, IconAlignRight, IconExpand } from '@/components/icons';
import type { ImageAlign } from '@/components/docNodes';

/**
 * Size and placement tools for the image that is currently selected. They live
 * in an overlay right next to the image instead of a strip above the sheet:
 * that is where you look when you want to make a picture smaller, and it also
 * means two corner grips can drag the width directly.
 */

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  contentWidth: number;
  widthPercent: number;
  align: ImageAlign;
  below: boolean;
};

const PRESETS = [25, 50, 75, 100];
const MIN = 10;
const BAR_WIDTH = 452;

const ALIGN_ICONS = {
  left: <IconAlignLeft size={14} />,
  center: <IconAlignCenter size={14} />,
  right: <IconAlignRight size={14} />,
  full: <IconExpand size={14} />,
} as const;

export default function DocImageTools({ editor }: { editor: Editor | null }) {
  const [box, setBox] = useState<Box | null>(null);
  const [mounted, setMounted] = useState(false);

  const measure = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setBox(null);
      return;
    }
    const selection = editor.state.selection;
    if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') {
      setBox(null);
      return;
    }
    const dom = editor.view.nodeDOM(selection.from);
    if (!(dom instanceof HTMLElement)) {
      setBox(null);
      return;
    }
    const rect = dom.getBoundingClientRect();
    if (!rect.width) {
      setBox(null);
      return;
    }
    setBox({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      contentWidth: editor.view.dom.getBoundingClientRect().width || rect.width,
      widthPercent: Math.round(Number(selection.node.attrs.width) || 70),
      align: ((selection.node.attrs.align as ImageAlign) || 'center') as ImageAlign,
      below: rect.bottom + 58 < window.innerHeight,
    });
  }, [editor]);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Chrome puts the caret next to a block image on click, which clears the
   * node selection a moment after ProseMirror made it. So the image is picked
   * again on the next tick – only then do the grips stay.
   */
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const onClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target.tagName !== 'IMG') return;
      if (!target.classList.contains('doc-img')) return;

      const doc = editor.state.doc;
      const base = editor.view.posAtDOM(target, 0);
      const position = [base, base - 1, base + 1].find(
        (candidate) => candidate >= 0 && doc.nodeAt(candidate)?.type.name === 'image',
      );
      if (position === undefined) return;

      window.setTimeout(() => {
        if (editor.isDestroyed) return;
        if (editor.state.doc.nodeAt(position)?.type.name !== 'image') return;
        editor.commands.setNodeSelection(position);
      }, 0);
    };

    dom.addEventListener('click', onClick);
    return () => dom.removeEventListener('click', onClick);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    measure();
    editor.on('selectionUpdate', measure);
    editor.on('transaction', measure);
    editor.on('update', measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      editor.off('selectionUpdate', measure);
      editor.off('transaction', measure);
      editor.off('update', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      document.body.classList.remove('doc-img-resizing');
    };
  }, [editor, measure]);

  const applyWidth = useCallback(
    (percent: number) => {
      if (!editor) return;
      const next = Math.max(MIN, Math.min(100, Math.round(percent)));
      const align = ((editor.getAttributes('image').align as ImageAlign) || 'center') as ImageAlign;
      editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .updateAttributes('image', { width: next, align: align === 'full' ? 'center' : align })
        .run();
    },
    [editor],
  );

  const startResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!box) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startPercent = box.widthPercent;
    const perPixel = 100 / Math.max(160, box.contentWidth);

    document.body.classList.add('doc-img-resizing');

    const move = (moveEvent: PointerEvent) => {
      applyWidth(startPercent + (moveEvent.clientX - startX) * perPixel);
    };
    const stop = () => {
      document.body.classList.remove('doc-img-resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const nudge = (direction: -1 | 1) => {
    if (!box) return;
    const step = direction > 0 ? 5 : -5;
    applyWidth(box.widthPercent + step);
  };

  const setAlign = (align: ImageAlign) => {
    editor?.chain().focus(undefined, { scrollIntoView: false }).updateAttributes('image', { align }).run();
  };

  if (!mounted || !box) return null;

  const viewportWidth = window.innerWidth;
  const barWidth = Math.min(BAR_WIDTH, Math.max(260, viewportWidth - 16));
  const barLeft = Math.max(8, Math.min(box.left + box.width / 2 - barWidth / 2, viewportWidth - barWidth - 8));
  const barTop = box.below ? box.top + box.height + 10 : box.top - 52;

  return createPortal(
    <>
      <div
        className="doc-img-frame"
        style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      >
        <span
          className="doc-img-grip doc-img-grip-sw"
          role="slider"
          tabIndex={0}
          aria-label="Resize image"
          aria-valuemin={MIN}
          aria-valuemax={100}
          aria-valuenow={box.widthPercent}
          title="Drag to resize"
          onPointerDown={startResize}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              nudge(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              nudge(1);
            }
          }}
        />
        <span
          className="doc-img-grip doc-img-grip-se"
          role="presentation"
          title="Drag to resize"
          onPointerDown={startResize}
        />
      </div>

      <div className="doc-img-bar" style={{ left: barLeft, top: barTop, width: barWidth }}>
        <span className="mono doc-img-bar-label">Size</span>

        <button
          type="button"
          className="doc-img-step"
          title="Smaller"
          aria-label="Make the image smaller"
          onClick={() => nudge(-1)}
        >
          –
        </button>
        <span className="mono doc-img-percent">{box.widthPercent}%</span>
        <button
          type="button"
          className="doc-img-step"
          title="Bigger"
          aria-label="Make the image bigger"
          onClick={() => nudge(1)}
        >
          +
        </button>

        <input
          className="doc-img-range"
          type="range"
          min={MIN}
          max={100}
          step={1}
          value={box.widthPercent}
          aria-label="Image width"
          onChange={(event) => applyWidth(Number(event.target.value))}
        />

        <span className="doc-img-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`doc-img-preset ${box.widthPercent === preset ? 'on' : ''}`}
              title={`${preset}% width`}
              onClick={() => applyWidth(preset)}
            >
              {preset}
            </button>
          ))}
        </span>

        <span className="doc-img-sep" />

        {(['left', 'center', 'right', 'full'] as ImageAlign[]).map((align) => (
          <button
            key={align}
            type="button"
            className={`doc-img-align ${box.align === align ? 'on' : ''}`}
            title={
              align === 'full'
                ? 'Full width'
                : align === 'left'
                  ? 'Float left, text wraps'
                  : align === 'right'
                    ? 'Float right, text wraps'
                    : 'Centred'
            }
            aria-label={`Align ${align}`}
            onClick={() => setAlign(align)}
          >
            {ALIGN_ICONS[align]}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}
