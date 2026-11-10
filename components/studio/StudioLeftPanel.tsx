'use client';

import { useMemo, useRef } from 'react';
import {
  IconEye,
  IconEyeOff,
  IconImage,
  IconLayers,
  IconLayout,
  IconLock,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconSquare,
  IconTrash,
  IconType,
  IconUnlock,
  IconArrowUp,
  IconArrowDown,
} from '@/components/icons';
import { MediaThumb } from '@/components/MediaThumb';
import StockSearch from '@/components/studio/StockSearch';
import { StickerGlyph } from '@/components/studio/ElementContent';
import SurfacePreview from '@/components/studio/SurfacePreview';
import {
  SHAPES,
  STICKERS,
  TEMPLATES,
  TEXT_PRESETS,
  TEXTURES,
  fontById,
  shapeClipPath,
  textureBackground,
  textureBackgroundSize,
  type Template,
  type TextPreset,
} from '@/lib/design';
import type { Design, DesignElement, MediaItem, ShapeKind, StickerKind, TextureKind } from '@/lib/types';

export type StudioTab = 'templates' | 'text' | 'shapes' | 'media' | 'stock' | 'extras' | 'layers';

const TABS: { id: StudioTab; label: string; icon: (p: { size?: number }) => React.ReactElement }[] = [
  { id: 'templates', label: 'Templates', icon: IconLayout },
  { id: 'text', label: 'Text', icon: IconType },
  { id: 'shapes', label: 'Shapes', icon: IconSquare },
  { id: 'media', label: 'Media', icon: IconImage },
  { id: 'stock', label: 'Stock', icon: IconSearch },
  { id: 'extras', label: 'Extras', icon: IconSparkles },
  { id: 'layers', label: 'Layers', icon: IconLayers },
];

const TAB_TITLE: Record<StudioTab, string> = {
  templates: 'Templates',
  text: 'Add text',
  shapes: 'Shapes & fills',
  media: 'Media',
  stock: 'Free photos',
  extras: 'Stickers & effects',
  layers: 'Layers',
};

const TYPE_LABEL: Record<DesignElement['type'], string> = {
  text: 'Text',
  shape: 'Shape',
  image: 'Image',
  sticker: 'Sticker',
  texture: 'Texture',
};

function ShapeThumb({ shape }: { shape: ShapeKind }) {
  const combined = shapeClipPath(shape);
  if (shape === 'frame') {
    return <span className="shape-thumb frame" />;
  }
  if (shape === 'line') {
    return <span className="shape-thumb line" />;
  }
  if (shape === 'tape') {
    return <span className="shape-thumb tape" />;
  }
  return (
    <span
      className="shape-thumb"
      style={{
        clipPath: combined,
        background: 'linear-gradient(135deg, #cbbcf2, #8a72c8)',
        borderRadius: shape === 'ellipse' ? '50%' : shape === 'rect' ? 6 : undefined,
      }}
    />
  );
}

export default function StudioLeftPanel({
  tab,
  onTab,
  design,
  media,
  selectedId,
  onAddText,
  onAddShape,
  onAddImage,
  onAddStockImage,
  onAddSticker,
  onAddTexture,
  onApplyTemplate,
  onSelect,
  onToggleHidden,
  onToggleLock,
  onMoveLayer,
  onDelete,
  onUpload,
  uploading,
}: {
  tab: StudioTab;
  onTab: (tab: StudioTab) => void;
  design: Design;
  media: MediaItem[];
  selectedId: string | null;
  onAddText: (preset: TextPreset) => void;
  onAddShape: (shape: ShapeKind) => void;
  onAddImage: (item: MediaItem) => void;
  onAddStockImage: (item: MediaItem) => void;
  onAddSticker: (glyph: StickerKind) => void;
  onAddTexture: (texture: TextureKind) => void;
  onApplyTemplate: (template: Template) => void;
  onSelect: (id: string | null) => void;
  onToggleHidden: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onUpload: (files: FileList | null) => void;
  uploading: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const layerElements = [...design.elements].reverse();

  const templatePreviews = useMemo(
    () =>
      TEMPLATES.map((template) => ({
        template,
        design: { ...template.build(null), width: template.width, height: template.height },
      })),
    []
  );

  return (
    <div className="studio-left">
      <nav className="studio-rail">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`rail-btn ${tab === item.id ? 'on' : ''}`}
              onClick={() => onTab(item.id)}
              title={item.label}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="studio-panel">
        <div className="studio-panel-head">
          <h3>{TAB_TITLE[tab]}</h3>
        </div>

        <div className="studio-panel-body">
          {tab === 'templates' ? (
            <div className="template-list">
              {templatePreviews.map(({ template, design: previewDesign }) => (
                <button
                  key={template.id}
                  type="button"
                  className="template-card"
                  onClick={() => onApplyTemplate(template)}
                >
                  <SurfacePreview design={previewDesign} width={190} className="template-preview" />
                  <span className="template-info">
                    <strong>{template.name}</strong>
                    <span>{template.tag}</span>
                    <span className="mono">
                      {template.width} × {template.height}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'text' ? (
            <div className="text-preset-list">
              <button type="button" className="text-preset add-first" onClick={() => onAddText(TEXT_PRESETS[0])}>
                <IconPlus size={15} /> Add text
              </button>
              {TEXT_PRESETS.map((preset) => {
                const font = fontById(preset.patch.fontFamily ?? 'anton');
                return (
                  <button key={preset.id} type="button" className="text-preset" onClick={() => onAddText(preset)}>
                    <span
                      className="text-preset-sample"
                      style={{
                        fontFamily: font.stack,
                        fontWeight: preset.patch.fontWeight ?? 400,
                        textTransform: preset.patch.uppercase ? 'uppercase' : 'none',
                        letterSpacing: `${Math.min(6, (preset.patch.letterSpacing ?? 0) / 2)}px`,
                      }}
                    >
                      {preset.sample}
                    </span>
                    <span className="text-preset-label">
                      {preset.label} · {font.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {tab === 'shapes' ? (
            <div className="shape-grid">
              {SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  className="shape-card"
                  onClick={() => onAddShape(shape.id)}
                  title={shape.label}
                >
                  <ShapeThumb shape={shape.id} />
                  <span>{shape.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'media' ? (
            <div className="media-panel">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => fileInput.current?.click()}>
                <IconPlus size={14} />
                {uploading ? 'Uploading …' : 'Upload image'}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => onUpload(event.target.files)}
              />
              {media.length === 0 ? (
                <p className="small muted">No media in the library yet.</p>
              ) : (
                <div className="media-panel-grid">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="media-panel-item"
                      onClick={() => onAddImage(item)}
                      title={`${item.title}${item.variantLabel ? ` · ${item.variantLabel}` : ''}`}
                    >
                      <MediaThumb media={item} className="media-panel-thumb" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {tab === 'stock' ? <StockSearch onUse={onAddStockImage} /> : null}

          {tab === 'extras' ? (
            <div className="extras-panel">
              <span className="panel-sub-title">Stickers</span>
              <div className="sticker-grid">
                {STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    className="sticker-card"
                    onClick={() => onAddSticker(sticker.id)}
                    title={sticker.label}
                  >
                    <span className="sticker-glyph">
                      <StickerGlyph glyph={sticker.id} color="#e2e29c" />
                    </span>
                  </button>
                ))}
              </div>

              <span className="panel-sub-title">Effects & textures</span>
              <div className="texture-grid">
                {TEXTURES.map((texture) => (
                  <button
                    key={texture.id}
                    type="button"
                    className="texture-card"
                    onClick={() => onAddTexture(texture.id)}
                  >
                    <span
                      className="texture-preview"
                      style={{
                        backgroundImage: textureBackground(texture.id, 'rgba(185,165,232,0.85)', 10),
                        backgroundSize: textureBackgroundSize(texture.id, 10),
                      }}
                    />
                    <span>{texture.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'layers' ? (
            <div className="layer-list">
              {layerElements.length === 0 ? (
                <p className="small muted">No elements yet.</p>
              ) : (
                layerElements.map((element) => (
                  <div
                    key={element.id}
                    className={`layer-row ${selectedId === element.id ? 'on' : ''}`}
                    onClick={() => onSelect(element.id)}
                  >
                    <span className="layer-type">{TYPE_LABEL[element.type]}</span>
                    <span className="layer-name truncate">{element.name}</span>
                    <span className="layer-actions">
                      <button
                        type="button"
                        title={element.hidden ? 'Show' : 'Hide'}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleHidden(element.id);
                        }}
                      >
                        {element.hidden ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                      </button>
                      <button
                        type="button"
                        title={element.locked ? 'Unlock' : 'Lock'}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleLock(element.id);
                        }}
                      >
                        {element.locked ? <IconLock size={13} /> : <IconUnlock size={13} />}
                      </button>
                      <button
                        type="button"
                        title="Move up"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveLayer(element.id, 'up');
                        }}
                      >
                        <IconArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveLayer(element.id, 'down');
                        }}
                      >
                        <IconArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(element.id);
                        }}
                      >
                        <IconTrash size={13} />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
