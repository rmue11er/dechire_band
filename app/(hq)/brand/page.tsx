'use client';

import { useEffect, useRef, useState } from 'react';
import { IconDownload, IconExternal, IconImage, IconSwatch } from '@/components/icons';
import { PageHead, Spinner } from '@/components/ui';
import { isLightHex, roleLabel } from '@/lib/palette';
import { usePalette } from '@/components/PaletteProvider';
import { toast } from '@/lib/toast';
import type { Profile } from '@/lib/types';

const today = () => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date());

export default function BrandSheetPage() {
  const palette = usePalette();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState<'png' | 'svg' | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((response) => response.json())
      .then((data) => setProfile(data.profile))
      .catch(() => toast('Could not load the profile', 'error'));
  }, []);

  const exportImage = async (format: 'png' | 'svg') => {
    const node = sheetRef.current;
    if (!node) return;
    setBusy(format);
    try {
      const lib = await import('html-to-image');
      const dataUrl =
        format === 'png'
          ? await lib.toPng(node, { pixelRatio: 2, cacheBust: false, backgroundColor: '#08070b' })
          : await lib.toSvg(node, { cacheBust: false, backgroundColor: '#08070b' });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `dechire-brand-sheet.${format}`;
      link.click();
      toast(format === 'png' ? 'PNG downloaded (2×)' : 'SVG downloaded');
    } catch (error) {
      console.error(error);
      toast('Export failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!profile) return <Spinner label="Loading the brand sheet" />;

  const light = palette.filter((color) => isLightHex(color.hex));
  const dark = palette.filter((color) => !isLightHex(color.hex));

  return (
    <>
      <PageHead
        eyebrow="Brand kit"
        title={
          <>
            Brand<span className="slash">/</span>Sheet
          </>
        }
        sub="One page with logo, colours, type and rules – for printers, promoters, merch and everyone who works with the band."
        actions={
          <>
            <a className="btn btn-ghost" href="/api/export/presskit" title="Bio, Fotos, Logo und Unterlagen als ZIP">
              <IconDownload size={15} /> Press kit .zip
            </a>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              <IconExternal size={15} /> Print / PDF
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => exportImage('svg')} disabled={!!busy}>
              <IconDownload size={15} /> {busy === 'svg' ? 'Rendering …' : 'SVG'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => exportImage('png')} disabled={!!busy}>
              <IconDownload size={15} /> {busy === 'png' ? 'Rendering …' : 'PNG 2×'}
            </button>
          </>
        }
      />

      <div className="brand-stage">
        <div className="brand-sheet" ref={sheetRef}>
          <header className="bs-head">
            <div className="bs-brand">
              {profile.avatarUrl ? (
                <img className="bs-avatar" src={profile.avatarUrl} alt={`${profile.bandName} logo`} />
              ) : (
                <div className="bs-avatar placeholder">D</div>
              )}
              <div className="bs-brand-text">
                <strong className="bs-name">{profile.bandName}</strong>
                <span className="bs-sub">Brand sheet · CI guide</span>
              </div>
            </div>
            <div className="bs-meta">
              <span>@{profile.handle}</span>
              <span>{profile.website}</span>
              <span>{today()}</span>
            </div>
          </header>

          <section className="bs-section">
            <div className="bs-section-head">
              <span className="bs-num">01</span>
              <h2>Logo</h2>
              <p>Always use the original file, never re-draw or re-type the wordmark.</p>
            </div>
            <div className="bs-logo-row">
              <figure className="bs-logo-tile dark">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Logo on dark" /> : <span>D</span>}
                <figcaption>On night · #08070b</figcaption>
              </figure>
              <figure className="bs-logo-tile light">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Logo on bone" /> : <span>D</span>}
                <figcaption>On bone · #efe7da</figcaption>
              </figure>
            </div>
            <ul className="bs-rules-inline">
              <li>Clear space around the logo: at least the height of the “D”.</li>
              <li>Minimum width 320 px on screen, 25 mm in print.</li>
              <li>Never stretch, rotate, outline or put a gradient on the logo.</li>
            </ul>
          </section>

          <section className="bs-section">
            <div className="bs-section-head">
              <span className="bs-num">02</span>
              <h2>Colours</h2>
              <p>{palette.length} CI colours · {light.length} for light surfaces, {dark.length} for dark ones.</p>
            </div>
            <div className="bs-palette">
              {palette.map((color) => (
                <div
                  key={`${color.name}-${color.hex}`}
                  className={`bs-swatch ${isLightHex(color.hex) ? 'on-light' : ''}`}
                  style={{ background: color.hex }}
                >
                  <strong>{color.name}</strong>
                  <span className="bs-hex">{color.hex.toUpperCase()}</span>
                  <span className="bs-role">{roleLabel(color.role)}</span>
                </div>
              ))}
            </div>
            <p className="bs-note">
              One accent per layout. Lavender carries the light work, bone the paper, rust and wound the emotion, moss
              and fog the quiet rhythm. Backgrounds stay dark – black is the stage.
            </p>
          </section>

          <section className="bs-section">
            <div className="bs-section-head">
              <span className="bs-num">03</span>
              <h2>Typography</h2>
              <p>Two display faces, one text face, one mono. Nothing else.</p>
            </div>
            <div className="bs-type">
              <div className="bs-type-row">
                <span className="bs-type-label">Display · Anton</span>
                <span className="bs-sample display">DECHIRE</span>
              </div>
              <div className="bs-type-row">
                <span className="bs-type-label">Headline · Bebas Neue</span>
                <span className="bs-sample headline">FRACTURE // 2026</span>
              </div>
              <div className="bs-type-row">
                <span className="bs-type-label">Editorial · Playfair Display</span>
                <span className="bs-sample editorial">Until the noise takes over.</span>
              </div>
              <div className="bs-type-row">
                <span className="bs-type-label">Body · Inter</span>
                <span className="bs-sample body">
                  Post-hardcore from the Ruhr. Loud, honest, unpolished – and always at eye level with the room.
                </span>
              </div>
              <div className="bs-type-row">
                <span className="bs-type-label">Mono · Space Mono</span>
                <span className="bs-sample mono-label">POST-HARDCORE /// DECHIRE · 2026</span>
              </div>
            </div>
          </section>

          <section className="bs-section bs-dodont">
            <div className="bs-section-head">
              <span className="bs-num">04</span>
              <h2>Rules</h2>
              <p>Short version for anyone who has to work with the material.</p>
            </div>
            <div className="bs-rule-columns">
              <div className="bs-rule-col do">
                <strong>Do</strong>
                <ul>
                  <li>Keep lots of black. The image breathes through the empty space.</li>
                  <li>Use one CI colour as the accent, everything else stays dark.</li>
                  <li>Set headlines in Anton or Bebas, uppercase, tight tracking.</li>
                  <li>Keep an 8 % safe margin in stories and reels.</li>
                  <li>Use the original logo version for every format.</li>
                </ul>
              </div>
              <div className="bs-rule-col dont">
                <strong>Don’t</strong>
                <ul>
                  <li>No second accent colour next to lavender.</li>
                  <li>No white boxes behind the logo.</li>
                  <li>No soft shadows, no glow, no neon.</li>
                  <li>No body copy below 14 px or below 9 pt in print.</li>
                  <li>No stock photos with clean studio light – keep it raw.</li>
                </ul>
              </div>
            </div>
          </section>

          <footer className="bs-foot">
            <span>POST-HARDCORE /// {profile.bandName.toUpperCase()}</span>
            <span>Band HQ · {profile.handle}</span>
          </footer>
        </div>
      </div>

      <p className="brand-hint">
        <IconImage size={14} /> The sheet is rendered from your live profile and CI palette – change a colour in
        Settings and export it again. <IconSwatch size={14} /> PNG for chat and print shops, SVG for designers and
        vector work.
      </p>
    </>
  );
}
