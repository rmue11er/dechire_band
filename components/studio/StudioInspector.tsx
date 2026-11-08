'use client';

import { useState } from 'react';
import {
  IconAlignBottom,
  IconAlignCenter,
  IconAlignLeft,
  IconAlignMiddle,
  IconAlignRight,
  IconAlignTop,
  IconArrowDown,
  IconArrowUp,
  IconBringFront,
  IconCopy,
  IconLock,
  IconPlus,
  IconSearch,
  IconSendBack,
  IconTrash,
  IconUnlock,
  IconX,
} from '@/components/icons';
import { ColorField, IconBtn, NumberField, Row, Section, SelectField, SliderField, ToggleGroup } from '@/components/studio/controls';
import { StickerGlyph } from '@/components/studio/ElementContent';
import FontBrowser from '@/components/studio/FontBrowser';
import { useCustomFonts } from '@/components/studio/useCustomFonts';
import { BLEND_MODES, FONTS, FORMATS, SHAPES, STICKERS, TEXTURES, fontById, textureBackground } from '@/lib/design';
import type { FontOption } from '@/lib/design';
import type { Design, DesignElement } from '@/lib/types';

export type AlignTarget = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export default function StudioInspector({
  design,
  element,
  showSafe,
  onToggleSafe,
  onUpdateElement,
  onUpdateDesign,
  onDelete,
  onDuplicate,
  onOrder,
  onAlign,
  onApplyFormat,
  onFitToFormat,
  onReplaceImage,
  onClose,
}: {
  design: Design;
  element: DesignElement | null;
  showSafe: boolean;
  onToggleSafe: () => void;
  onUpdateElement: (patch: Record<string, any>, snapshot?: boolean) => void;
  onUpdateDesign: (patch: Partial<Design>, snapshot?: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOrder: (where: 'front' | 'back' | 'forward' | 'backward') => void;
  onAlign: (align: AlignTarget) => void;
  onApplyFormat: (width: number, height: number) => void;
  onFitToFormat: (width: number, height: number) => void;
  onReplaceImage: () => void;
  onClose: () => void;
}) {
  const { fonts: googleFonts } = useCustomFonts();
  const [fontBrowserOpen, setFontBrowserOpen] = useState(false);

  const pickFont = (font: FontOption) => {
    const current = element && element.type === 'text' ? element.fontWeight : font.weights[0];
    const weight = font.weights.includes(current)
      ? current
      : font.weights[Math.min(font.weights.length - 1, Math.floor(font.weights.length / 2))];
    onUpdateElement({ fontFamily: font.id, fontWeight: weight });
  };

  if (!element) {
    return (
      <div className="studio-inspector">
        <div className="inspector-head">
          <span className="inspector-eyebrow">Canvas</span>
          <strong>Set up page</strong>
        </div>

        <div className="inspector-scroll">
          <Section title="Format" hint="Instagram">
            <div className="format-buttons">
              {FORMATS.map((format) => {
                const active = design.width === format.width && design.height === format.height;
                return (
                  <button
                    key={format.id}
                    type="button"
                    className={`format-btn ${active ? 'on' : ''}`}
                    onClick={() => onApplyFormat(format.width, format.height)}
                  >
                    <span className={`format-shape ${format.id}`} />
                    <strong>{format.label}</strong>
                    <span className="mono">{format.hint}</span>
                  </button>
                );
              })}
            </div>

            <Row label="Size">
              <div className="size-pair">
                <NumberField value={design.width} min={200} max={4000} onChange={(value) => onUpdateDesign({ width: value })} suffix="B" />
                <NumberField value={design.height} min={200} max={4000} onChange={(value) => onUpdateDesign({ height: value })} suffix="H" />
              </div>
            </Row>

            {design.elements.length ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost full"
                onClick={() => onFitToFormat(design.width, design.height)}
                title="Scale all elements proportionally to the current canvas"
              >
                Fit elements to format
              </button>
            ) : null}
          </Section>

          <Section title="Background">
            <ToggleGroup
              value={design.background.type}
              onChange={(value) => onUpdateDesign({ background: { ...design.background, type: value } })}
              options={[
                { value: 'solid', label: 'Color' },
                { value: 'gradient', label: 'Gradient' },
              ]}
            />
            {design.background.type === 'solid' ? (
              <ColorField
                label="Color"
                value={design.background.color}
                onChange={(color) => onUpdateDesign({ background: { ...design.background, color, type: 'solid' } })}
              />
            ) : (
              <>
                <ColorField
                  label="From"
                  value={design.background.from}
                  onChange={(from) => onUpdateDesign({ background: { ...design.background, from } })}
                />
                <ColorField
                  label="To"
                  value={design.background.to}
                  onChange={(to) => onUpdateDesign({ background: { ...design.background, to } })}
                />
                <SliderField
                  label="Angle"
                  suffix="°"
                  min={0}
                  max={360}
                  value={design.background.angle}
                  onChange={(angle) => onUpdateDesign({ background: { ...design.background, angle } })}
                />
              </>
            )}
          </Section>

          <Section title="Guides">
            <label className="checkline">
              <input type="checkbox" checked={showSafe} onChange={onToggleSafe} />
              <span>Show safe areas</span>
            </label>
            <p className="hint-text">
              Keep text and logos out of the edges – Instagram crops stories and reels top and bottom.
            </p>
          </Section>
        </div>
      </div>
    );
  }

  const isText = element.type === 'text';
  const isShape = element.type === 'shape';
  const isImage = element.type === 'image';
  const isSticker = element.type === 'sticker';
  const isTexture = element.type === 'texture';
  const font = isText ? fontById(element.fontFamily) : null;
  const typeLabel = {
    text: 'Text',
    shape: 'Shape',
    image: 'Image',
    sticker: 'Sticker',
    texture: 'Texture',
  }[element.type];

  return (
    <div className="studio-inspector">
      <div className="inspector-head">
        <span className="inspector-eyebrow">{typeLabel}</span>
        <strong className="truncate">{element.name}</strong>
        <div className="inspector-head-actions">
          <IconBtn
            title={element.locked ? 'Unlock' : 'Lock'}
            onClick={() => onUpdateElement({ locked: !element.locked })}
            active={element.locked}
          >
            {element.locked ? <IconLock size={14} /> : <IconUnlock size={14} />}
          </IconBtn>
          <IconBtn title="Close" onClick={onClose}>
            <IconX size={14} />
          </IconBtn>
        </div>
      </div>

      <div className="inspector-scroll">
        <Section title="Position & size">
          <div className="grid-2">
            <Row label="X">
              <NumberField value={element.x} onChange={(x) => onUpdateElement({ x })} />
            </Row>
            <Row label="Y">
              <NumberField value={element.y} onChange={(y) => onUpdateElement({ y })} />
            </Row>
            <Row label="Width">
              <NumberField value={element.w} min={10} onChange={(w) => onUpdateElement({ w })} />
            </Row>
            <Row label="Height">
              <NumberField value={element.h} min={10} onChange={(h) => onUpdateElement({ h })} />
            </Row>
          </div>

          <div className="align-row">
            <IconBtn title="Align left" onClick={() => onAlign('left')}>
              <IconAlignLeft size={15} />
            </IconBtn>
            <IconBtn title="Center horizontally" onClick={() => onAlign('center')}>
              <IconAlignCenter size={15} />
            </IconBtn>
            <IconBtn title="Align right" onClick={() => onAlign('right')}>
              <IconAlignRight size={15} />
            </IconBtn>
            <span className="align-sep" />
            <IconBtn title="Align top" onClick={() => onAlign('top')}>
              <IconAlignTop size={15} />
            </IconBtn>
            <IconBtn title="Center vertically" onClick={() => onAlign('middle')}>
              <IconAlignMiddle size={15} />
            </IconBtn>
            <IconBtn title="Align bottom" onClick={() => onAlign('bottom')}>
              <IconAlignBottom size={15} />
            </IconBtn>
          </div>

          <div className="align-row">
            <IconBtn title="Bring to front" onClick={() => onOrder('front')}>
              <IconBringFront size={15} />
            </IconBtn>
            <IconBtn title="Bring forward" onClick={() => onOrder('forward')}>
              <IconArrowUp size={15} />
            </IconBtn>
            <IconBtn title="Send backward" onClick={() => onOrder('backward')}>
              <IconArrowDown size={15} />
            </IconBtn>
            <IconBtn title="Send to back" onClick={() => onOrder('back')}>
              <IconSendBack size={15} />
            </IconBtn>
            <span className="align-sep" />
            <IconBtn title="Duplicate" onClick={onDuplicate}>
              <IconCopy size={15} />
            </IconBtn>
            <IconBtn title="Delete" onClick={onDelete} danger>
              <IconTrash size={15} />
            </IconBtn>
          </div>

          <SliderField
            label="Rotation"
            suffix="°"
            min={-180}
            max={180}
            value={Math.round(element.rotation)}
            onChange={(rotation) => onUpdateElement({ rotation })}
          />
          <SliderField
            label="Opacity"
            suffix="%"
            min={0}
            max={100}
            value={Math.round(element.opacity * 100)}
            onChange={(value) => onUpdateElement({ opacity: value / 100 })}
          />
          <SelectField
            label="Blend mode"
            value={element.blendMode}
            onChange={(blendMode) => onUpdateElement({ blendMode })}
            options={BLEND_MODES.map((mode) => ({ value: mode, label: mode }))}
          />
        </Section>

        {isText ? (
          <>
            <Section title="Text">
              <textarea
                className="textarea textarea-sm"
                rows={3}
                value={element.text}
                onChange={(event) => onUpdateElement({ text: event.target.value }, false)}
              />
              <SelectField
                label="Font"
                value={element.fontFamily}
                onChange={(id) => {
                  const next = fontById(id);
                  const weight = next.weights.includes(element.fontWeight)
                    ? element.fontWeight
                    : next.weights[Math.min(next.weights.length - 1, Math.floor(next.weights.length / 2))];
                  onUpdateElement({ fontFamily: id, fontWeight: weight });
                }}
                groups={[
                  {
                    label: 'Built in',
                    options: FONTS.map((item) => ({ value: item.id, label: `${item.label} – ${item.mood}` })),
                  },
                  ...(googleFonts.length
                    ? [
                        {
                          label: 'Google Fonts (self-hosted)',
                          options: googleFonts.map((item) => ({
                            value: item.id,
                            label: `${item.label} – ${item.mood}`,
                          })),
                        },
                      ]
                    : []),
                ]}
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost font-browse-btn"
                onClick={() => setFontBrowserOpen(true)}
              >
                <IconSearch size={13} /> Search Google Fonts
                {googleFonts.length ? <span className="font-count">{googleFonts.length}</span> : null}
              </button>
              <FontBrowser
                open={fontBrowserOpen}
                onClose={() => setFontBrowserOpen(false)}
                onPick={(font) => {
                  pickFont(font);
                  setFontBrowserOpen(false);
                }}
              />
              <div className="grid-2">
                <Row label="Size">
                  <NumberField value={element.fontSize} min={6} max={600} onChange={(fontSize) => onUpdateElement({ fontSize })} />
                </Row>
                <Row label="Weight">
                  <SelectField
                    value={String(element.fontWeight)}
                    onChange={(value) => onUpdateElement({ fontWeight: Number(value) })}
                    options={(font?.weights ?? [400]).map((weight) => ({ value: String(weight), label: String(weight) }))}
                  />
                </Row>
              </div>
              <ToggleGroup
                value={element.align}
                onChange={(align) => onUpdateElement({ align })}
                options={[
                  { value: 'left', label: <IconAlignLeft size={14} /> },
                  { value: 'center', label: <IconAlignCenter size={14} /> },
                  { value: 'right', label: <IconAlignRight size={14} /> },
                ]}
              />
              <div className="toggle-row">
                <button
                  type="button"
                  className={`pill-btn ${element.uppercase ? 'on' : ''}`}
                  onClick={() => onUpdateElement({ uppercase: !element.uppercase })}
                >
                  AA Uppercase
                </button>
                <button
                  type="button"
                  className={`pill-btn ${element.italic ? 'on' : ''}`}
                  onClick={() => onUpdateElement({ italic: !element.italic })}
                >
                  <em>Italic</em>
                </button>
              </div>
              <SliderField
                label="Line height"
                min={0.6}
                max={2.4}
                step={0.05}
                value={element.lineHeight}
                onChange={(lineHeight) => onUpdateElement({ lineHeight })}
              />
              <SliderField
                label="Letter spacing"
                min={-20}
                max={60}
                value={element.letterSpacing}
                onChange={(letterSpacing) => onUpdateElement({ letterSpacing })}
              />
            </Section>

            <Section title="Color & effects">
              <ColorField label="Text color" value={element.color} onChange={(color) => onUpdateElement({ color })} />
              <SelectField
                label="Shadow"
                value={element.shadow}
                onChange={(shadow) => onUpdateElement({ shadow })}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'soft', label: 'Soft' },
                  { value: 'glow', label: 'Lavender glow' },
                  { value: 'hard', label: 'Hard shadow' },
                  { value: 'echo', label: 'Color echo' },
                ]}
              />
              <SliderField
                label="Outline"
                min={0}
                max={20}
                value={element.outlineWidth}
                onChange={(outlineWidth) => onUpdateElement({ outlineWidth })}
              />
              {element.outlineWidth > 0 ? (
                <ColorField
                  label="Outline color"
                  value={element.outlineColor}
                  onChange={(outlineColor) => onUpdateElement({ outlineColor })}
                />
              ) : null}
              <ColorField
                label="Text background"
                value={element.bgColor}
                onChange={(bgColor) => onUpdateElement({ bgColor })}
                allowTransparent
              />
              {element.bgColor !== 'transparent' ? (
                <div className="grid-2">
                  <Row label="Padding">
                    <NumberField value={element.bgPadding} min={0} max={120} onChange={(bgPadding) => onUpdateElement({ bgPadding })} />
                  </Row>
                  <Row label="Radius">
                    <NumberField value={element.bgRadius} min={0} max={200} onChange={(bgRadius) => onUpdateElement({ bgRadius })} />
                  </Row>
                </div>
              ) : null}
            </Section>
          </>
        ) : null}

        {isShape ? (
          <>
            <Section title="Shape">
              <SelectField
                label="Type"
                value={element.shape}
                onChange={(shape) => onUpdateElement({ shape })}
                options={SHAPES.map((shape) => ({ value: shape.id, label: shape.label }))}
              />
              <ToggleGroup
                value={element.fillType}
                onChange={(fillType) => onUpdateElement({ fillType })}
                options={[
                  { value: 'solid', label: 'Color' },
                  { value: 'gradient', label: 'Gradient' },
                  { value: 'none', label: 'Outline only' },
                ]}
              />
              {element.fillType === 'solid' ? (
                <ColorField label="Fill" value={element.fill} onChange={(fill) => onUpdateElement({ fill })} />
              ) : null}
              {element.fillType === 'gradient' ? (
                <>
                  <ColorField
                    label="From"
                    value={element.gradientFrom}
                    onChange={(gradientFrom) => onUpdateElement({ gradientFrom })}
                    allowTransparent
                  />
                  <ColorField
                    label="To"
                    value={element.gradientTo}
                    onChange={(gradientTo) => onUpdateElement({ gradientTo })}
                    allowTransparent
                  />
                  <SliderField
                    label="Angle"
                    suffix="°"
                    min={0}
                    max={360}
                    value={element.gradientAngle}
                    onChange={(gradientAngle) => onUpdateElement({ gradientAngle })}
                  />
                </>
              ) : null}
              <SliderField
                label="Outline"
                min={0}
                max={40}
                value={element.strokeWidth}
                onChange={(strokeWidth) => onUpdateElement({ strokeWidth })}
              />
              {element.strokeWidth > 0 ? (
                <ColorField
                  label="Outline color"
                  value={element.strokeColor}
                  onChange={(strokeColor) => onUpdateElement({ strokeColor })}
                />
              ) : null}
              {element.shape === 'rect' ? (
                <SliderField
                  label="Corners"
                  min={0}
                  max={300}
                  value={element.radius}
                  onChange={(radius) => onUpdateElement({ radius })}
                />
              ) : null}
            </Section>
          </>
        ) : null}

        {isImage ? (
          <Section title="Image">
            <button type="button" className="btn btn-sm full" onClick={onReplaceImage}>
              Replace image
            </button>
            <ToggleGroup
              value={element.fit}
              onChange={(fit) => onUpdateElement({ fit })}
              options={[
                { value: 'cover', label: 'Fill' },
                { value: 'contain', label: 'Fit' },
              ]}
            />
            <SliderField
              label="Corners"
              min={0}
              max={400}
              value={element.radius}
              onChange={(radius) => onUpdateElement({ radius })}
            />
            <SliderField
              label="Grayscale"
              suffix="%"
              value={element.grayscale}
              onChange={(grayscale) => onUpdateElement({ grayscale })}
            />
            <SliderField
              label="Contrast"
              suffix="%"
              min={40}
              max={200}
              value={element.contrast}
              onChange={(contrast) => onUpdateElement({ contrast })}
            />
            <SliderField
              label="Brightness"
              suffix="%"
              min={30}
              max={180}
              value={element.brightness}
              onChange={(brightness) => onUpdateElement({ brightness })}
            />
            <SliderField
              label="Saturation"
              suffix="%"
              min={0}
              max={200}
              value={element.saturation}
              onChange={(saturation) => onUpdateElement({ saturation })}
            />
            <ColorField label="Tint" value={element.tintColor} onChange={(tintColor) => onUpdateElement({ tintColor })} />
            <SliderField
              label="Tint strength"
              suffix="%"
              value={Math.round(element.tintOpacity * 100)}
              onChange={(value) => onUpdateElement({ tintOpacity: value / 100 })}
            />
          </Section>
        ) : null}

        {isSticker ? (
          <Section title="Sticker">
            <div className="sticker-grid small">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  className={`sticker-card ${element.glyph === sticker.id ? 'on' : ''}`}
                  onClick={() => onUpdateElement({ glyph: sticker.id, name: sticker.label })}
                  title={sticker.label}
                >
                  <span className="sticker-glyph">
                    <StickerGlyph glyph={sticker.id} color={element.color} />
                  </span>
                </button>
              ))}
            </div>
            <ColorField label="Color" value={element.color} onChange={(color) => onUpdateElement({ color })} />
          </Section>
        ) : null}

        {isTexture ? (
          <Section title="Texture">
            <SelectField
              label="Pattern"
              value={element.texture}
              onChange={(texture) => onUpdateElement({ texture })}
              options={TEXTURES.map((texture) => ({ value: texture.id, label: texture.label }))}
            />
            <div className="texture-grid small">
              {TEXTURES.map((texture) => (
                <button
                  key={texture.id}
                  type="button"
                  className={`texture-card ${element.texture === texture.id ? 'on' : ''}`}
                  onClick={() => onUpdateElement({ texture: texture.id })}
                >
                  <span
                    className="texture-preview"
                    style={{
                      backgroundImage: textureBackground(texture.id, element.color, element.scale),
                      backgroundSize: `${element.scale}px ${element.scale}px`,
                    }}
                  />
                  <span>{texture.label}</span>
                </button>
              ))}
            </div>
            <ColorField label="Color" value={element.color} onChange={(color) => onUpdateElement({ color })} />
            <SliderField
              label="Density"
              min={3}
              max={80}
              value={element.scale}
              onChange={(scale) => onUpdateElement({ scale })}
            />
          </Section>
        ) : null}
      </div>
    </div>
  );
}
