'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MediaPicker from '@/components/MediaPicker';
import {
  IconExternal,
  IconEye,
  IconFilm,
  IconGlobe,
  IconImage,
  IconLink,
  IconNote,
  IconPencil,
  IconPlus,
  IconRotate,
  IconSettings,
  IconSwatch,
  IconTrash,
  IconType,
  IconZap,
} from '@/components/icons';
import { Field, PageHead, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { MediaItem, SiteLink, SiteSettings } from '@/lib/types';

const LINK_KINDS = ['instagram', 'bandcamp', 'spotify', 'youtube', 'tiktok', 'tickets', 'mail', 'other'];

const SECTIONS: { key: keyof SiteSettings; label: string; hint: string }[] = [
  { key: 'showHero', label: 'Hero', hint: 'Name, photo, tagline' },
  { key: 'showIntro', label: 'A note from us', hint: 'The letter' },
  { key: 'showMedia', label: 'Photos', hint: 'Taped next to the letter + clip' },
  { key: 'showFeed', label: 'Feed', hint: 'Latest published posts' },
  { key: 'showConnect', label: 'Say hi', hint: 'Quote and links' },
  { key: 'showFooter', label: 'Footer', hint: 'Big name, small print' },
];

function Toggle({
  label,
  hint,
  on,
  onToggle,
  compact,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: (value: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={`web-toggle ${compact ? 'compact' : ''}`}>
      <div>
        <strong>{label}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
      <button
        type="button"
        className={`switch ${on ? 'on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onToggle(!on)}
      />
    </div>
  );
}

export default function WebsitePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [pickerFor, setPickerFor] = useState<'hero' | 'shots' | null>(null);

  const load = useCallback(async () => {
    const [siteRes, mediaRes] = await Promise.all([fetch('/api/site'), fetch('/api/media')]);
    const site = await siteRes.json();
    const library = await mediaRes.json();
    setSettings(site.settings);
    setDraft(site.settings);
    setMedia(library.media ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => Boolean(draft && settings && JSON.stringify(draft) !== JSON.stringify(settings)),
    [draft, settings]
  );

  const patch = (changes: Partial<SiteSettings>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  const save = async (changes?: Partial<SiteSettings>) => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch('/api/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, ...(changes ?? {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Save failed');
      setSettings(data.settings);
      setDraft(data.settings);
      setPreviewKey((key) => key + 1);
      toast('Website updated');
    } catch (error: any) {
      toast(error.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateLink = (index: number, changes: Partial<SiteLink>) => {
    if (!draft) return;
    patch({ links: draft.links.map((link, at) => (at === index ? { ...link, ...changes } : link)) });
  };

  if (loading || !draft) return <Spinner label="Loading website" />;

  const heroMedia = media.find((item) => item.id === draft.heroMediaId) ?? null;
  const shots = draft.mediaIds
    .map((id) => media.find((item) => item.id === id))
    .filter((item): item is MediaItem => Boolean(item));
  const previewSrc = `/site?v=${previewKey}`;

  return (
    <>
      <PageHead
        eyebrow="Public site"
        title={
          <>
            Website <span className="slash">/</span> One-pager
          </>
        }
        sub="One page for the outside: who you are, a few photos, and how to reach you. Every block can be switched off."
        actions={
          <>
            <a className="btn btn-ghost" href="/site" target="_blank" rel="noreferrer">
              Open site <IconExternal size={14} />
            </a>
            <button type="button" className="btn btn-primary" onClick={() => save()} disabled={saving}>
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </>
        }
      />

      <MediaPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        media={media}
        multiple={pickerFor === 'shots'}
        selectedIds={pickerFor === 'shots' ? draft.mediaIds : draft.heroMediaId ? [draft.heroMediaId] : []}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
        onConfirm={(ids) => {
          if (pickerFor === 'shots') {
            patch({ mediaIds: ids });
          } else {
            patch({ heroMediaId: ids[0] ?? null, heroUrl: media.find((item) => item.id === ids[0])?.url ?? null });
          }
          setPickerFor(null);
          setPreviewKey((key) => key + 1);
        }}
      />

      <div className="web-grid">
        <div className="web-stack">
          {/* ------------------------------------------------------- status */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconGlobe size={16} />
                Status
              </div>
              <span className={`status ${draft.published ? 'published' : 'draft'}`}>
                <span className="dot" />
                {draft.published ? 'Live' : 'Pre-launch'}
              </span>
            </div>
            <div className="panel-body web-stack">
              <Toggle
                label="Site is live"
                hint="Off = only the gate is shown (name, tagline, Instagram)."
                on={draft.published}
                onToggle={(value) => {
                  patch({ published: value });
                  save({ published: value });
                }}
              />
              <div className={`web-banner ${draft.published ? 'ok' : 'warn'}`}>
                <IconEye size={15} />
                <span>
                  {draft.published
                    ? 'The page is reachable at /site and shows every block you left on.'
                    : 'Draft mode: visitors only see the gate. Nothing else is visible.'}
                </span>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------- sections */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconZap size={16} />
                Blocks
              </div>
              <span className="small muted">
                {SECTIONS.filter((section) => draft[section.key]).length} of {SECTIONS.length} on
              </span>
            </div>
            <div className="panel-body web-sections">
              {SECTIONS.map((section) => (
                <Toggle
                  key={String(section.key)}
                  compact
                  label={section.label}
                  hint={section.hint}
                  on={Boolean(draft[section.key])}
                  onToggle={(value) => patch({ [section.key]: value } as Partial<SiteSettings>)}
                />
              ))}
              <Toggle
                compact
                label="Film grain"
                hint="Noise + scanlines over the whole page"
                on={draft.grain}
                onToggle={(value) => patch({ grain: value })}
              />
            </div>
          </section>

          {/* --------------------------------------------------------- hero */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconImage size={16} />
                Hero
              </div>
            </div>
            <div className="panel-body web-stack">
              <div className="web-media-row">
                <div className="web-media-thumb">
                  {heroMedia ? <img src={heroMedia.url} alt="" /> : <IconImage size={20} />}
                </div>
                <div className="grow">
                  <button type="button" className="btn btn-sm" onClick={() => setPickerFor('hero')}>
                    <IconImage size={14} /> Choose from library
                  </button>
                  <p className="small muted" style={{ marginTop: 6 }}>
                    A photo of the four of you works better than artwork — even a bad one.
                  </p>
                </div>
                {heroMedia ? (
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost"
                    aria-label="Remove hero image"
                    onClick={() => {
                      patch({ heroMediaId: null });
                      setPreviewKey((key) => key + 1);
                    }}
                  >
                    <IconTrash size={14} />
                  </button>
                ) : null}
              </div>

              <div className="web-split">
                <Field label="Video loop (optional)" hint={<span className="count">mp4/webm</span>}>
                  <input
                    className="input"
                    placeholder="https://…/loop.mp4"
                    value={draft.heroVideo}
                    onChange={(event) => patch({ heroVideo: event.target.value })}
                  />
                </Field>
                <Field label="How dark the photo sits" hint={<span className="count">{draft.heroOverlay}%</span>}>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={draft.heroOverlay}
                    onChange={(event) => patch({ heroOverlay: Number(event.target.value) })}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------------- note */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconNote size={16} />
                A note from us
              </div>
            </div>
            <div className="panel-body web-stack">
              <div className="web-split">
                <Field label="Opening line" hint={<span className="count">big serif</span>}>
                  <input
                    className="input"
                    placeholder="hello."
                    value={draft.introTitle}
                    onChange={(event) => patch({ introTitle: event.target.value })}
                  />
                </Field>
                <Field label="Signature" hint={<span className="count">below the letter</span>}>
                  <input
                    className="input"
                    placeholder="— Marla, Bene, Jonte & Tobi"
                    value={draft.introSignature}
                    onChange={(event) => patch({ introSignature: event.target.value })}
                  />
                </Field>
              </div>

              <Field
                label="The letter"
                hint={<span className="count">one paragraph per line · *text* = accent</span>}
              >
                <textarea
                  className="textarea web-manifesto"
                  value={draft.manifesto.join('\n')}
                  onChange={(event) =>
                    patch({ manifesto: event.target.value.split('\n').filter((line) => line.trim().length > 0) })
                  }
                  placeholder={'We are four people from the Ruhr…\nWe never learned how to do this properly.'}
                />
              </Field>

              <Field
                label="Signature"
                hint={<span className="count">the line under the letter – leave empty for none</span>}
              >
                <input
                  className="input"
                  value={draft.introSignature}
                  onChange={(event) => patch({ introSignature: event.target.value })}
                  placeholder="— no one, in particular"
                />
              </Field>
            </div>
          </section>

          {/* ------------------------------------------------------- media */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconImage size={16} />
                Media corner
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setPickerFor('shots')}>
                <IconPlus size={14} /> Pick photos
              </button>
            </div>
            <div className="panel-body web-stack">
              <div className="web-split">
                <Field label="Small label">
                  <input
                    className="input"
                    placeholder="photos"
                    value={draft.mediaTitle}
                    onChange={(event) => patch({ mediaTitle: event.target.value })}
                  />
                </Field>
                <Field label="Caption under the photos">
                  <input
                    className="input"
                    placeholder="shot on phones, mostly in the dark"
                    value={draft.mediaNote}
                    onChange={(event) => patch({ mediaNote: event.target.value })}
                  />
                </Field>
              </div>

              {shots.length ? (
                <div className="web-shots">
                  {shots.map((shot) => (
                    <div className="web-shot" key={shot.id}>
                      <img src={shot.url} alt="" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => {
                          patch({ mediaIds: draft.mediaIds.filter((id) => id !== shot.id) });
                          setPreviewKey((key) => key + 1);
                        }}
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="small muted">No photos picked yet — the corner stays hidden.</p>
              )}

              <div className="divider" />

              <Toggle
                label="Show a clip above the photos"
                hint="YouTube, Vimeo, Instagram or an mp4 link."
                on={draft.showTeaser}
                onToggle={(value) => patch({ showTeaser: value })}
              />
              <Field label="Clip link">
                <input
                  className="input"
                  placeholder="https://youtu.be/…"
                  value={draft.teaserUrl}
                  onChange={(event) => patch({ teaserUrl: event.target.value })}
                />
              </Field>
            </div>
          </section>

          {/* ------------------------------------------------------- words */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconType size={16} />
                Words
              </div>
            </div>
            <div className="panel-body web-stack">
              <div className="web-split">
                <Field label="Band name">
                  <input
                    className="input"
                    value={draft.bandName}
                    onChange={(event) => patch({ bandName: event.target.value })}
                  />
                </Field>
                <Field label="Tagline" hint={<span className="count">under the name</span>}>
                  <input
                    className="input"
                    value={draft.tagline}
                    onChange={(event) => patch({ tagline: event.target.value })}
                  />
                </Field>
              </div>

              <div className="web-split">
                <Field label="Feed label">
                  <input
                    className="input"
                    placeholder="from the feed"
                    value={draft.feedTitle}
                    onChange={(event) => patch({ feedTitle: event.target.value })}
                  />
                </Field>
                <Field label="Search description" hint={<span className="count">meta</span>}>
                  <input
                    className="input"
                    value={draft.seoDescription}
                    onChange={(event) => patch({ seoDescription: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------- links */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconLink size={16} />
                Links
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  patch({ links: [...draft.links, { label: 'New link', url: 'https://', kind: 'other' }] })
                }
              >
                <IconPlus size={14} /> Add link
              </button>
            </div>
            <div className="panel-body web-stack">
              {draft.links.length === 0 ? (
                <p className="small muted">No links yet — add Instagram, Bandcamp, booking.</p>
              ) : null}
              {draft.links.map((link, index) => (
                <div className="web-link-row" key={`${index}-${link.kind}`}>
                  <input
                    className="input"
                    value={link.label}
                    placeholder="Instagram"
                    aria-label="Link label"
                    onChange={(event) => updateLink(index, { label: event.target.value })}
                  />
                  <input
                    className="input"
                    value={link.url}
                    placeholder="https://…"
                    aria-label="Link url"
                    onChange={(event) => updateLink(index, { url: event.target.value })}
                  />
                  <select
                    className="select"
                    value={link.kind}
                    aria-label="Link kind"
                    onChange={(event) => updateLink(index, { kind: event.target.value })}
                  >
                    {LINK_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost"
                    aria-label="Remove link"
                    onClick={() => patch({ links: draft.links.filter((_, at) => at !== index) })}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
              <p className="web-hint">
                <IconPencil size={13} />
                The link marked “instagram” is used for the handle in the header and for the feed tiles.
              </p>
            </div>
          </section>

          {/* ------------------------------------------------------- press */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconFilm size={16} />
                Say hi & footer
              </div>
            </div>
            <div className="panel-body web-stack">
              <Field
                label="Big line in the contact block"
                hint={<span className="count">empty = friendly default</span>}
              >
                <textarea
                  className="textarea"
                  rows={2}
                  value={draft.pressQuote}
                  onChange={(event) => patch({ pressQuote: event.target.value })}
                  placeholder="Booking, collabs, or just to tell us a song helped."
                />
              </Field>
              <div className="web-split">
                <Field label="Small line under it">
                  <input
                    className="input"
                    placeholder="— press quote or a note"
                    value={draft.pressSource}
                    onChange={(event) => patch({ pressSource: event.target.value })}
                  />
                </Field>
                <Field label="Footer note">
                  <input
                    className="input"
                    value={draft.footerNote}
                    onChange={(event) => patch({ footerNote: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------ colour */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconSwatch size={16} />
                Accent
              </div>
            </div>
            <div className="panel-body web-stack">
              <div className="web-colour-row">
                <button
                  type="button"
                  className={`btn btn-sm ${draft.accentHex === '' ? 'btn-primary' : ''}`}
                  onClick={() => {
                    patch({ accentHex: '' });
                    setPreviewKey((key) => key + 1);
                  }}
                >
                  <IconSettings size={14} /> Use HQ accent
                </button>
                <input
                  className="input"
                  style={{ maxWidth: 130 }}
                  value={draft.accentHex}
                  placeholder="#b9a5e8"
                  onChange={(event) => patch({ accentHex: event.target.value })}
                />
                <input
                  type="color"
                  aria-label="Accent colour"
                  value={/^#[0-9a-f]{6}$/i.test(draft.accentHex) ? draft.accentHex : '#b9a5e8'}
                  onChange={(event) => patch({ accentHex: event.target.value })}
                  style={{ width: 42, height: 34, background: 'none', border: '0' }}
                />
              </div>
              <div className="web-colour-row">
                {['#b9a5e8', '#c86a4a', '#7e9c94', '#8792a6', '#c0455a', '#efe7da'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`web-swatch ${draft.accentHex.toLowerCase() === hex ? 'on' : ''}`}
                    style={{ background: hex }}
                    aria-label={hex}
                    onClick={() => {
                      patch({ accentHex: hex });
                      setPreviewKey((key) => key + 1);
                    }}
                  />
                ))}
              </div>
              <p className="web-hint">
                <IconSwatch size={13} />
                Only the website uses this colour — the workspace keeps the accent from Settings.
              </p>
            </div>
          </section>

          <div className="web-savebar">
            <span className="small muted grow">
              {dirty ? 'Unsaved changes' : `Last saved ${formatDate(settings?.updatedAt)}`}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setDraft(settings);
                setPreviewKey((key) => key + 1);
              }}
              disabled={!dirty}
            >
              Reset
            </button>
            <button type="button" className="btn btn-primary" onClick={() => save()} disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------- preview */}
        <aside className="web-preview">
          <div className="web-preview-head">
            <span className="web-preview-url grow">/site</span>
            <div className="seg" role="tablist">
              {(['desktop', 'mobile'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={device === option}
                  className={device === option ? 'on' : ''}
                  onClick={() => setDevice(option)}
                >
                  {option === 'desktop' ? 'Desktop' : 'Mobile'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-icon btn-ghost"
              aria-label="Refresh preview"
              onClick={() => setPreviewKey((key) => key + 1)}
            >
              <IconRotate size={15} />
            </button>
          </div>
          <div className={`web-frame ${device === 'mobile' ? 'mobile' : ''}`}>
            <iframe key={previewKey} src={previewSrc} title="Website preview" />
          </div>
          <p className="web-hint">
            <IconEye size={13} />
            The preview shows the saved version. Save to see your changes.
          </p>
        </aside>
      </div>
    </>
  );
}
