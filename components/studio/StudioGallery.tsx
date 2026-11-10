'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  IconCopy,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
} from '@/components/icons';
import SurfacePreview from '@/components/studio/SurfacePreview';
import { useCustomFonts } from '@/components/studio/useCustomFonts';
import { useAccent } from '@/components/PaletteProvider';
import { EmptyState, Field, Modal, PageHead, Spinner } from '@/components/ui';
import { DEFAULT_BACKGROUND, FORMATS, TEMPLATES } from '@/lib/design';
import { recolourDesign } from '@/lib/studio';
import { timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { Design, MediaItem } from '@/lib/types';

const numberFormat = (value: number) => value.toLocaleString('en-GB');

export default function StudioGallery() {
  const router = useRouter();
  // Loads the self-hosted Google Fonts so the previews render correctly.
  useCustomFonts();
  const accent = useAccent();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState('New design');
  const [format, setFormat] = useState('square');

  const load = async () => {
    const [designResponse, mediaResponse] = await Promise.all([
      fetch('/api/designs'),
      fetch('/api/media'),
    ]);
    const designData = await designResponse.json();
    const mediaData = await mediaResponse.json();
    setDesigns(designData.designs ?? []);
    setMedia(mediaData.media ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (payload: {
    title: string;
    width: number;
    height: number;
    background?: any;
    elements?: any[];
  }) => {
    setCreating(true);
    try {
      const response = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background: DEFAULT_BACKGROUND,
          elements: [],
          ...payload,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the design');
      router.push(`/studio/${data.design.id}`);
    } catch (error: any) {
      toast(error.message ?? 'Something went wrong', 'error');
      setCreating(false);
    }
  };

  const startBlank = async () => {
    const preset = FORMATS.find((item) => item.id === format) ?? FORMATS[0];
    await create({ title: title.trim() || 'New design', width: preset.width, height: preset.height });
  };

  const startTemplate = async (templateId: string) => {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const photo =
      media.find((item) => item.groupKind === 'photo') ??
      media.find((item) => item.mime.startsWith('image/'));
    const built = template.build(
      photo ? { url: photo.url, id: photo.id, width: photo.width, height: photo.height } : null
    );
    // Templates ship in the default lavender – bring them onto the live accent.
    const themed = recolourDesign(
      {
        title: template.name,
        width: template.width,
        height: template.height,
        background: built.background ?? DEFAULT_BACKGROUND,
        elements: built.elements,
      },
      accent
    );
    await create({
      title: template.name,
      width: themed.width,
      height: themed.height,
      background: themed.background,
      elements: themed.elements,
    });
  };

  const duplicate = async (design: Design) => {
    await create({
      title: `${design.title} Copy`,
      width: design.width,
      height: design.height,
      background: design.background,
      elements: design.elements,
    });
  };

  const remove = async (design: Design) => {
    if (!design.id) return;
    if (!window.confirm(`Delete design “${design.title}”?`)) return;
    const response = await fetch(`/api/designs/${design.id}`, { method: 'DELETE' });
    if (response.ok) {
      setDesigns((current) => current.filter((item) => item.id !== design.id));
      toast('Design deleted');
    } else {
      toast('Failed to delete', 'error');
    }
  };

  if (loading) return <Spinner label="Setting up the studio" />;

  return (
    <>
      <PageHead
        eyebrow="Design Studio"
        title={
          <>
            Post<span className="slash">/</span>Builder
          </>
        }
        sub="Bilder von Hand bauen: Schrift, Formen, Texturen, eigene Fotos. Export als PNG – oder direkt als Post."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <IconPlus size={15} />
            New design
          </button>
        }
      />

      <section className="studio-gallery-section">
        <div className="gallery-head">
          <h2>
            <IconSparkles size={16} /> Templates
          </h2>
          <span className="mono small muted">One click – then customise</span>
        </div>
        <div className="template-strip">
          {TEMPLATES.map((template) => {
            const previewPhoto =
              media.find((item) => item.groupKind === 'photo') ??
              media.find((item) => item.mime.startsWith('image/'));
            const built = template.build(
              previewPhoto
                ? { url: previewPhoto.url, id: previewPhoto.id, width: previewPhoto.width, height: previewPhoto.height }
                : null
            );
            const previewDesign = recolourDesign(
              {
                title: template.name,
                width: template.width,
                height: template.height,
                background: built.background ?? DEFAULT_BACKGROUND,
                elements: built.elements,
              },
              accent
            );
            const previewWidth = template.height > template.width ? 170 * (template.width / template.height) : 190;
            return (
              <button
                key={template.id}
                type="button"
                className="template-tile"
                onClick={() => startTemplate(template.id)}
                disabled={creating}
              >
                <span className="template-tile-preview">
                  <SurfacePreview design={previewDesign} width={previewWidth} />
                </span>
                <span className="template-tile-info">
                  <strong>{template.name}</strong>
                  <span className="mono">
                    {template.tag} · {numberFormat(template.width)}×{numberFormat(template.height)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="studio-gallery-section">
        <div className="gallery-head">
          <h2>My designs</h2>
          <span className="mono small muted">{designs.length} saved</span>
        </div>

        {designs.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={<IconSparkles size={24} />}
              title="No design yet"
              hint="Start with a template above or build an empty format from scratch."
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}>
                  <IconPlus size={14} /> Empty design
                </button>
              }
            />
          </div>
        ) : (
          <div className="design-grid">
            {designs.map((design) => {
              const previewWidth = design.height > design.width ? 230 * (design.width / design.height) : 260;
              return (
                <article key={design.id} className="design-card">
                  <Link href={`/studio/${design.id}`} className="design-preview">
                    <SurfacePreview design={design} width={previewWidth} />
                  </Link>
                  <div className="design-info">
                    <strong className="truncate">{design.title}</strong>
                    <span className="mono">
                      {design.width}×{design.height} · {timeAgo(design.updatedAt)}
                    </span>
                  </div>
                  <div className="design-actions">
                    <Link href={`/studio/${design.id}`} className="btn btn-sm">
                      <IconPencil size={13} /> Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => duplicate(design)}
                      title="Duplicate"
                      disabled={creating}
                    >
                      <IconCopy size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => remove(design)}
                      title="Delete"
                    >
                      <IconTrash size={13} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New design"
        subtitle="Pick a format – you can change it anytime later."
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={startBlank} disabled={creating}>
              {creating ? 'Creating …' : 'Let’s go'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Title">
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <div className="format-choice">
            {FORMATS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`format-choice-card ${format === preset.id ? 'on' : ''}`}
                onClick={() => setFormat(preset.id)}
              >
                <span className={`format-shape ${preset.id}`} />
                <strong>{preset.label}</strong>
                <span className="mono">{preset.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
