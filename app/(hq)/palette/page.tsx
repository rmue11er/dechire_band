'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconCheck, IconPlus, IconSearch, IconSparkles, IconSwatch, IconTrash } from '@/components/icons';
import { PageHead, Spinner } from '@/components/ui';
import {
  MOODS,
  SCHEMES,
  contrastRatio,
  generatePalette,
  hexToOklch,
  isHex,
  ladder,
  oklchToHex,
  search,
  type Mood,
  type PaletteEntry,
  type Scheme,
  type Swatch,
} from '@/lib/colorlab';
import { DEFAULT_ACCENT, DEFAULT_PALETTE, PALETTE_ROLES, applyAccent } from '@/lib/palette';
import { toast } from '@/lib/toast';
import type { PaletteColor, Profile } from '@/lib/types';

const ROLE_FALLBACK = ['primary', 'accent', 'paper', 'signal', 'calm', 'warm', 'neutral', 'deep', 'base'];

const asEntries = (colors: PaletteColor[]): PaletteEntry[] =>
  colors.map((color) => ({ name: color.name, hex: color.hex, role: color.role }));

export default function PaletteLabPage() {
  const [saved, setSaved] = useState<PaletteColor[] | null>(null);
  const [colors, setColors] = useState<PaletteEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [mood, setMood] = useState<Mood>('any');
  const [scheme, setScheme] = useState<Scheme>('any');
  const [seedHex, setSeedHex] = useState(DEFAULT_ACCENT);
  const [lightness, setLightness] = useState<[number, number]>([0.35, 0.92]);
  const [chroma, setChroma] = useState<[number, number]>([0.02, 0.2]);

  useEffect(() => {
    Promise.all([fetch('/api/palette').then((response) => response.json()), fetch('/api/profile').then((response) => response.json())])
      .then(([paletteData, profileData]) => {
        const next: PaletteColor[] = paletteData.colors ?? DEFAULT_PALETTE;
        setSaved(next);
        setColors(asEntries(next));
        setProfile(profileData.profile ?? null);
        setSeedHex(profileData.profile?.accentHex ?? DEFAULT_ACCENT);
      })
      .catch(() => {
        setSaved(DEFAULT_PALETTE);
        setColors(asEntries(DEFAULT_PALETTE));
      });
  }, []);

  const dynamicMood = mood === 'any';
  const seed = isHex(seedHex) ? seedHex : DEFAULT_ACCENT;

  const result = useMemo(
    () =>
      search({
        query,
        mood,
        scheme,
        seedHex: seed,
        lightness,
        chroma,
        palette: colors,
        limit: 40,
      }),
    [query, mood, scheme, seed, lightness, chroma, colors]
  );

  const variants = useMemo(() => ladder(seed), [seed]);
  const dirty = JSON.stringify(colors.map((color) => `${color.name}|${color.hex}|${color.role}`)) !==
    JSON.stringify((saved ?? []).map((color) => `${color.name}|${color.hex}|${color.role}`));

  /* ---------------------------------------------------------------- actions */

  const addColor = (swatch: Swatch | PaletteEntry) => {
    const hex = swatch.hex.toLowerCase();
    if (colors.some((color) => color.hex === hex)) {
      toast('Already in the palette');
      return;
    }
    if (colors.length >= 24) {
      toast('A palette holds 24 colours at most', 'error');
      return;
    }
    const role = ROLE_FALLBACK.find((candidate) => !colors.some((color) => color.role === candidate)) ?? 'custom';
    setColors((current) => [...current, { name: swatch.name, hex, role }]);
  };

  const removeColor = (hex: string) => setColors((current) => current.filter((color) => color.hex !== hex));

  const updateRole = (hex: string, role: string) =>
    setColors((current) => current.map((color) => (color.hex === hex ? { ...color, role } : color)));

  const savePalette = async () => {
    if (!colors.length) {
      toast('The palette needs at least one colour', 'error');
      return;
    }
    setBusy('save');
    try {
      const response = await fetch('/api/palette', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colors }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      setSaved(data.colors);
      setColors(asEntries(data.colors));
      window.dispatchEvent(new CustomEvent('palette:updated', { detail: data.colors }));
      toast('Palette saved');
    } catch (error: any) {
      toast(error.message ?? 'Failed to save', 'error');
    } finally {
      setBusy(null);
    }
  };

  const resetPalette = () => {
    if (!saved) return;
    setColors(asEntries(saved));
    toast('Back to the saved palette');
  };

  const setAccent = async (hex: string) => {
    setBusy(`accent-${hex}`);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accentHex: hex }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      setProfile(data.profile);
      setSeedHex(hex);
      applyAccent(hex, data.profile.accent2Hex ?? null);
      window.dispatchEvent(new CustomEvent('accent:updated', { detail: { accent: hex, accent2: data.profile.accent2Hex } }));
      toast('Accent colour set');
    } catch (error: any) {
      toast(error.message ?? 'Failed to set accent', 'error');
    } finally {
      setBusy(null);
    }
  };

  const generate = () => {
    const generated = generatePalette(seed, mood, scheme);
    setColors(generated.colors);
    toast(`Generated a ${MOODS.find((entry) => entry.value === mood)?.label.toLowerCase() ?? 'balanced'} set – save to keep it`);
  };

  const surprise = () => {
    const moods: Mood[] = ['pastel', 'muted', 'dark', 'bright', 'earthy', 'vintage'];
    const schemes: Scheme[] = ['analogous', 'complementary', 'triad', 'split', 'tetrad', 'mono'];
    const hex = oklchToHex({
      h: Math.floor(Math.random() * 360),
      l: 0.55 + Math.random() * 0.25,
      c: 0.06 + Math.random() * 0.1,
    });
    setSeedHex(hex);
    setMood(moods[Math.floor(Math.random() * moods.length)]);
    setScheme(schemes[Math.floor(Math.random() * schemes.length)]);
    setQuery('');
  };

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast(`${hex.toUpperCase()} copied`);
    } catch {
      toast('Clipboard not available', 'error');
    }
  };

  if (!saved) return <Spinner label="Mixing colours" />;

  /* ---------------------------------------------------------------- preview */

  const byRole = (role: string) => colors.find((color) => color.role === role)?.hex;
  const darkest = [...colors].sort((a, b) => hexToOklch(a.hex).l - hexToOklch(b.hex).l)[0]?.hex ?? '#0b0a10';
  const lightest = [...colors].sort((a, b) => hexToOklch(b.hex).l - hexToOklch(a.hex).l)[0]?.hex ?? '#f4f1ea';
  const base = byRole('base') ?? darkest;
  const paper = byRole('paper') ?? lightest;
  const primary = byRole('primary') ?? colors[1]?.hex ?? DEFAULT_ACCENT;
  const accent = byRole('accent') ?? colors[2]?.hex ?? DEFAULT_ACCENT;
  const signal = byRole('signal') ?? accent;
  const onPrimary = contrastRatio(primary, paper) > contrastRatio(primary, base) ? paper : base;
  const onBase = contrastRatio(paper, base) > 4.5 ? paper : lightest;

  return (
    <>
      <PageHead
        eyebrow="Colour lab /// OKLCH search"
        title={
          <>
            Colour<span className="slash">/</span>Lab
          </>
        }
        sub="Find colours instead of guessing them: guided search, harmonies and suggestions that are scored against the palette you already have."
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={resetPalette} disabled={!dirty || busy !== null}>
              Discard
            </button>
            <button type="button" className="btn btn-primary" onClick={savePalette} disabled={!dirty || busy !== null}>
              <IconCheck size={15} />
              {busy === 'save' ? 'Saving …' : 'Save palette'}
            </button>
          </>
        }
      />

      <div className="lab-layout">
        <div className="lab-main">
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconSearch size={16} />
                Find colours
              </div>
              <span className="mono small muted">{result.readback}</span>
            </div>

            <div className="panel-body lab-find">
              <div className="lab-searchrow">
                <span className="lab-searchfield">
                  <IconSearch size={15} />
                  <input
                    className="input"
                    value={query}
                    placeholder="pastel purple · muted moss · warm rust · complement of lavender"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </span>
                <button type="button" className="btn btn-ghost" onClick={surprise}>
                  <IconSparkles size={15} />
                  Surprise me
                </button>
              </div>

              <div className="lab-row">
                <span className="lab-row-label mono small muted">Mood</span>
                <div className="lab-chips">
                  {MOODS.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      className={`lab-chip ${mood === entry.value ? 'on' : ''}`}
                      title={entry.hint}
                      onClick={() => setMood(entry.value)}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lab-row">
                <span className="lab-row-label mono small muted">Harmony</span>
                <div className="lab-chips">
                  {SCHEMES.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      className={`lab-chip ${scheme === entry.value ? 'on' : ''}`}
                      title={entry.hint}
                      onClick={() => setScheme(entry.value)}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lab-row">
                <span className="lab-row-label mono small muted">Seed</span>
                <div className="lab-seeds">
                  {colors.slice(0, 10).map((color) => (
                    <button
                      key={`seed-${color.hex}`}
                      type="button"
                      className={`lab-seed ${color.hex === seed.toLowerCase() ? 'on' : ''}`}
                      style={{ background: color.hex }}
                      title={`${color.name} · ${color.hex}`}
                      onClick={() => setSeedHex(color.hex)}
                    />
                  ))}
                  <label className="lab-seed custom" title="Pick a seed colour">
                    <input type="color" value={seed} onChange={(event) => setSeedHex(event.target.value)} />
                  </label>
                  <span className="mono small muted lab-seed-hex">{seed.toUpperCase()}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setAccent(seed)}
                    disabled={busy !== null}
                  >
                    use as accent
                  </button>
                </div>
              </div>

              {dynamicMood ? (
                <div className="lab-ranges">
                  <label className="lab-range">
                    <span className="mono small muted">
                      Lightness <em>{Math.round(lightness[0] * 100)}–{Math.round(lightness[1] * 100)}</em>
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={98}
                      value={Math.round(lightness[0] * 100)}
                      onChange={(event) =>
                        setLightness([Math.min(Number(event.target.value) / 100, lightness[1] - 0.05), lightness[1]])
                      }
                    />
                    <input
                      type="range"
                      min={5}
                      max={98}
                      value={Math.round(lightness[1] * 100)}
                      onChange={(event) =>
                        setLightness([lightness[0], Math.max(Number(event.target.value) / 100, lightness[0] + 0.05)])
                      }
                    />
                  </label>
                  <label className="lab-range">
                    <span className="mono small muted">
                      Chroma <em>{chroma[0].toFixed(2)}–{chroma[1].toFixed(2)}</em>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      value={Math.round(chroma[0] * 100)}
                      onChange={(event) => setChroma([Math.min(Number(event.target.value) / 100, chroma[1] - 0.01), chroma[1]])}
                    />
                    <input
                      type="range"
                      min={0}
                      max={32}
                      value={Math.round(chroma[1] * 100)}
                      onChange={(event) => setChroma([chroma[0], Math.max(Number(event.target.value) / 100, chroma[0] + 0.01)])}
                    />
                  </label>
                </div>
              ) : (
                <p className="lab-note mono small muted">
                  Mood presets set the lightness and chroma corridor – switch to <em>Any</em> to dial them in yourself.
                </p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconSwatch size={16} />
                Suggestions
              </div>
              <span className="mono small muted">{result.swatches.length} scored against your palette</span>
            </div>

            {result.swatches.length === 0 ? (
              <div className="lab-empty">
                <p className="muted small">Nothing in that corner of the colour space. Widen the mood or clear the search.</p>
              </div>
            ) : (
              <div className="lab-grid">
                {result.swatches.map((swatch) => {
                  const included = colors.some((color) => color.hex === swatch.hex);
                  return (
                    <article key={swatch.hex} className={`lab-card ${included ? 'in' : ''}`}>
                      <button
                        type="button"
                        className="lab-card-swatch"
                        style={{ background: swatch.hex }}
                        onClick={() => addColor(swatch)}
                        title={included ? 'Already in the palette' : 'Add to the palette'}
                      >
                        <span className="lab-card-add">{included ? <IconCheck size={14} /> : <IconPlus size={14} />}</span>
                      </button>

                      <div className="lab-card-body">
                        <span className="lab-card-name">{swatch.name}</span>
                        <span className="lab-card-hex mono">{swatch.hex.toUpperCase()}</span>
                        <span className="lab-card-fit" title={`Fits your palette: ${swatch.fit}/100`}>
                          <span style={{ width: `${swatch.fit}%` }} />
                        </span>
                        <span className="lab-card-note">{swatch.note}</span>
                        <span className="lab-card-actions">
                          <button type="button" className="lab-mini" onClick={() => setSeedHex(swatch.hex)} title="Use as seed">
                            seed
                          </button>
                          <button
                            type="button"
                            className="lab-mini"
                            onClick={() => setAccent(swatch.hex)}
                            disabled={busy !== null}
                            title="Set as UI accent"
                          >
                            accent
                          </button>
                          <button type="button" className="lab-mini" onClick={() => copy(swatch.hex)} title="Copy hex">
                            copy
                          </button>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">Tints &amp; shades of the seed</div>
              <span className="mono small muted">{seed.toUpperCase()}</span>
            </div>
            <div className="lab-ladder">
              {variants.map((variant) => (
                <button
                  key={`${variant.hex}-${variant.note}`}
                  type="button"
                  className="lab-ladder-step"
                  style={{ background: variant.hex }}
                  onClick={() => addColor(variant)}
                  title={`${variant.name} · ${variant.note}`}
                >
                  <span className="mono">{variant.note}</span>
                  <span className="mono">{variant.hex.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="lab-side">
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">Working palette</div>
              <span className="mono small muted">{colors.length}/24</span>
            </div>

            <ul className="lab-palette">
              {colors.map((color) => {
                const oklch = hexToOklch(color.hex);
                return (
                  <li key={color.hex} className="lab-palette-row">
                    <span className="lab-palette-swatch" style={{ background: color.hex }} />
                    <span className="lab-palette-info">
                      <strong className="truncate">{color.name}</strong>
                      <span className="mono">{color.hex.toUpperCase()}</span>
                    </span>
                    <select
                      className="select lab-palette-role"
                      value={color.role}
                      onChange={(event) => updateRole(color.hex, event.target.value)}
                      aria-label={`Role of ${color.name}`}
                    >
                      {PALETTE_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <span className="lab-palette-lch mono" title="Lightness / chroma">
                      {Math.round(oklch.l * 100)}/{oklch.c.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="lab-palette-remove"
                      onClick={() => removeColor(color.hex)}
                      title="Remove"
                      aria-label={`Remove ${color.name}`}
                    >
                      <IconTrash size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">Preview</div>
              <span className="mono small muted">live</span>
            </div>
            <div className="lab-preview" style={{ background: base, color: onBase }}>
              <span className="lab-preview-kicker" style={{ color: primary }}>
                post-hardcore /// ruhr
              </span>
              <strong>DECHIRE</strong>
              <span className="lab-preview-rule" style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
              <p style={{ color: onBase }}>
                {colors.length} colours · contrast {contrastRatio(paper, base).toFixed(1)}:1 on the base.
              </p>
              <div className="lab-preview-actions">
                <span className="lab-preview-btn" style={{ background: primary, color: onPrimary }}>
                  Plan a post
                </span>
                <span className="lab-preview-chip" style={{ borderColor: accent, color: accent }}>
                  final
                </span>
                <span className="lab-preview-dot" style={{ background: signal }} />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">Generate a set</div>
            </div>
            <div className="panel-body lab-generate">
              <p className="small muted">
                Builds night, deep, primary, accent, paper and signal from the seed – in the corridor of the mood you
                picked ({MOODS.find((entry) => entry.value === mood)?.label.toLowerCase()},{' '}
                {SCHEMES.find((entry) => entry.value === scheme)?.label.toLowerCase()} harmony).
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={generate}>
                <IconSparkles size={14} />
                Replace working palette
              </button>
              <p className="mono small muted">Nothing is stored until you hit “Save palette”.</p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
