'use client';

import { useEffect, useRef, useState } from 'react';
import { IconX } from '@/components/icons';
import { usePalette } from '@/components/PaletteProvider';
import { usePopoverPlacement } from '@/components/usePopoverPlacement';

/** Colours that always read well on the bone sheet, next to the CI swatches. */
const SHEET_INK = ['#141311', '#3a3633', '#6f6a64', '#8b857c', '#ffffff'];

export default function DocColorPicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (color: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { popRef, popStyle } = usePopoverPlacement(open);
  const ci = usePalette();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (color: string | null) => {
    onPick(color);
    setOpen(false);
  };

  const active = value ?? '';

  return (
    <div className="emoji-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`tool-btn ${open ? 'on' : ''}`}
        title="Text colour"
        aria-label="Text colour"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
      >
        <span className="tool-color" aria-hidden="true">
          A
          <span
            className="tool-color-bar"
            style={{ background: active || 'transparent' }}
          />
        </span>
      </button>

      {open ? (
        <div
          className="emoji-pop doc-color-pop"
          role="dialog"
          aria-label="Text colour"
          ref={popRef}
          style={popStyle}
        >
          <div className="emoji-pop-head">
            <span className="mono small muted">Text colour</span>
            <button
              type="button"
              className="emoji-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <IconX size={12} />
            </button>
          </div>

          <div className="doc-color-body">
            <div className="swatch-group">
              <span className="swatch-group-label">
                Band CI
                <em>{ci.length}</em>
              </span>
              <div className="swatch-row ci">
                {ci.map((color) => (
                  <button
                    key={`${color.role}-${color.hex}-${color.name}`}
                    type="button"
                    className={`swatch ci-swatch ${active.toLowerCase() === color.hex.toLowerCase() ? 'on' : ''}`}
                    style={{ background: color.hex }}
                    onClick={() => pick(color.hex)}
                    title={`${color.name} · ${color.hex}`}
                    aria-label={`${color.name} ${color.hex}`}
                  />
                ))}
              </div>
            </div>

            <div className="swatch-group">
              <span className="swatch-group-label">Sheet ink</span>
              <div className="swatch-row">
                {SHEET_INK.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`swatch ${active.toLowerCase() === color ? 'on' : ''}`}
                    style={{ background: color }}
                    onClick={() => pick(color)}
                    title={color}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>

            <div className="doc-color-foot">
              <label className="doc-color-custom" title="Any colour">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(active) ? active : '#141311'}
                  onChange={(event) => onPick(event.target.value)}
                />
                <span className="mono small muted">Custom</span>
              </label>
              <button type="button" className="tool-text" onClick={() => pick(null)}>
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
