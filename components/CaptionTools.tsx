'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconType, IconUndo, IconX } from '@/components/icons';
import { SEPARATORS, TEXT_STYLES, toPlainText, type TextStyleId } from '@/lib/textStyles';
import { toast } from '@/lib/toast';

/**
 * Inline text helpers for captions: Unicode “fonts” Instagram actually accepts,
 * plus a few structural bits. Works on the current selection, or the whole text.
 */
export default function CaptionTools({
  targetRef,
  value,
  onChange,
  compact = false,
}: {
  targetRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const history = useRef<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 372;
      const height = 470;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow > 320 ? rect.bottom + 8 : Math.max(12, rect.top - height - 8);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      setPosition({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const write = useCallback(
    (next: string, range?: { start: number; end: number }) => {
      history.current = [value, ...history.current].slice(0, 10);
      onChange(next);
      const element = targetRef.current;
      if (!element) return;
      requestAnimationFrame(() => {
        element.focus();
        const position = range ? range.start + range.end : next.length;
        element.setSelectionRange(position, position);
      });
    },
    [onChange, targetRef, value]
  );

  const apply = (transform: (text: string) => string) => {
    const element = targetRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const hasSelection = end > start;
    if (hasSelection) {
      const result = transform(value.slice(start, end));
      write(value.slice(0, start) + result + value.slice(end), { start, end: result.length });
    } else {
      write(transform(value));
    }
  };

  const insert = (text: string) => {
    const element = targetRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    write(value.slice(0, start) + text + value.slice(end), { start, end: text.length });
  };

  const undo = () => {
    const [previous, ...rest] = history.current;
    if (previous === undefined) return;
    history.current = rest;
    onChange(previous);
  };

  const styled = value !== toPlainText(value);

  return (
    <div className="caption-tools" ref={boxRef}>
      <button
        type="button"
        ref={buttonRef}
        className="btn btn-sm btn-ghost"
        onClick={() => setOpen((state) => !state)}
      >
        <IconType size={14} />
        {compact ? 'Aa' : 'Text styles'}
      </button>

      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={undo}
        disabled={!history.current.length}
        title="Undo the last style change"
      >
        <IconUndo size={13} />
      </button>

      {styled ? (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          title="Turn the styled characters back into plain text"
          onClick={() => {
            apply(toPlainText);
            toast('Back to plain text');
          }}
        >
          Aa
        </button>
      ) : null}

      {open && position
        ? createPortal(
            <div
              className="caption-pop floating"
              ref={popRef}
              style={{ top: position.top, left: position.left }}
            >
              <div className="caption-pop-head">
                <span className="label">Fonts</span>
            <span className="mono small muted">selection or all</span>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
              <IconX size={13} />
            </button>
          </div>

          <div className="caption-fonts">
            {TEXT_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                className="caption-font"
                onClick={() => apply(style.transform)}
                title={`${style.label} – ${style.sample}`}
              >
                <span className="caption-font-sample">{style.sample}</span>
                <span className="caption-font-label">{style.label}</span>
              </button>
            ))}
          </div>

          <div className="caption-pop-head">
            <span className="label">Structure</span>
          </div>
          <div className="caption-seps">
            {SEPARATORS.map((separator) => (
              <button
                key={separator.label}
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  insert(separator.value);
                  setOpen(false);
                }}
              >
                {separator.label}
              </button>
            ))}
          </div>

              <p className="caption-note">
                <IconCheck size={12} /> These are real Unicode characters – Instagram keeps them, PDFs and
                print exports too. Screen readers may read them oddly, so keep the important words plain.
              </p>
            </div>,
            document.body
          )
        : null}

      {styled && !compact ? (
        <span className="mono small muted caption-flag" title="Contains styled characters">
          styled
        </span>
      ) : null}
    </div>
  );
}
