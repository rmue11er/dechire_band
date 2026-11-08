'use client';

import type { ReactNode } from 'react';
import { usePalette } from '@/components/PaletteProvider';
import { UTILITY_COLORS } from '@/lib/palette';

export function Section({
  title,
  hint,
  children,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="ins-section" open={defaultOpen}>
      <summary className="ins-title">
        <span>{title}</span>
        {hint ? <em>{hint}</em> : null}
      </summary>
      <div className="ins-body">{children}</div>
    </details>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ins-row">
      <span className="ins-label">{label}</span>
      <div className="ins-control">{children}</div>
    </div>
  );
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="num-field">
      <input
        type="number"
        className="input input-sm"
        value={Math.round((value ?? 0) * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
      {suffix ? <span className="num-suffix">{suffix}</span> : null}
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="slider-field">
      <div className="slider-label">
        <span>{label}</span>
        <span className="mono">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ColorField({
  label,
  value,
  onChange,
  allowTransparent = false,
  compact = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
  compact?: boolean;
}) {
  const hex = HEX.test(value) ? value : '#000000';
  const ci = usePalette();
  return (
    <div className="color-field">
      {label ? <span className="ins-label">{label}</span> : null}
      <div className="color-line">
        <label
          className="color-swatch-btn"
          style={{
            background:
              value === 'transparent'
                ? 'repeating-conic-gradient(#2a2438 0% 25%, #14111d 0% 50%) 50% / 10px 10px'
                : value,
          }}
          title="Pick color"
        >
          <input type="color" value={hex} onChange={(event) => onChange(event.target.value)} />
        </label>
        <input className="input input-sm" value={value} onChange={(event) => onChange(event.target.value)} />
        {allowTransparent ? (
          <button type="button" className="mini-btn" onClick={() => onChange('transparent')} title="Transparent">
            ∅
          </button>
        ) : null}
      </div>
      <div className="swatch-groups">
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
                className={`swatch ci-swatch ${value.toLowerCase() === color.hex.toLowerCase() ? 'on' : ''}`}
                style={{ background: color.hex }}
                onClick={() => onChange(color.hex)}
                title={`${color.name} · ${color.hex}`}
                aria-label={`${color.name} ${color.hex}`}
              />
            ))}
          </div>
        </div>
        {!compact ? (
          <div className="swatch-group">
            <span className="swatch-group-label">Neutral</span>
            <div className="swatch-row">
              {UTILITY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`swatch ${value.toLowerCase() === color ? 'on' : ''}`}
                  style={{ background: color }}
                  onClick={() => onChange(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="select-field">
      {label ? <span className="ins-label">{label}</span> : null}
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="toggle-group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title ?? String(option.value)}
          className={value === option.value ? 'on' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function IconBtn({
  title,
  onClick,
  active,
  danger,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`icon-btn ${active ? 'on' : ''} ${danger ? 'danger' : ''}`}
    >
      {children}
    </button>
  );
}
