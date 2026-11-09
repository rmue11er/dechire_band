'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  IconCheck,
  IconChevronLeft,
  IconDownload,
  IconImage,
  IconPlus,
  IconRedo,
  IconSparkles,
  IconUndo,
  IconX,
} from '@/components/icons';
import MediaPicker from '@/components/MediaPicker';
import { useAccent } from '@/components/PaletteProvider';
import CanvasSurface from '@/components/studio/CanvasSurface';
import StudioInspector, { type AlignTarget } from '@/components/studio/StudioInspector';
import StudioLeftPanel, { type StudioTab } from '@/components/studio/StudioLeftPanel';
import VariantsModal from '@/components/studio/VariantsModal';
import { useCustomFonts } from '@/components/studio/useCustomFonts';
import {
  DEFAULT_BACKGROUND,
  FORMATS,
  TEMPLATES,
  TEXT_PRESETS,
  clamp,
  createImage,
  createShape,
  createSticker,
  createText,
  createTexture,
  type Template,
  type TextPreset,
} from '@/lib/design';
import { adaptDesign, recolourDesign, type DesignVariant } from '@/lib/studio';
import { toast } from '@/lib/toast';
import { zipBlob, type ZipEntry } from '@/lib/zipStore';
import type { Design, DesignElement, MediaItem, ShapeKind, StickerKind, TextureKind } from '@/lib/types';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type Handles = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_POSITIONS: Record<Handles, { left: string; top: string; cursor: string }> = {
  nw: { left: '0%', top: '0%', cursor: 'nwse-resize' },
  n: { left: '50%', top: '0%', cursor: 'ns-resize' },
  ne: { left: '100%', top: '0%', cursor: 'nesw-resize' },
  e: { left: '100%', top: '50%', cursor: 'ew-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  sw: { left: '0%', top: '100%', cursor: 'nesw-resize' },
  w: { left: '0%', top: '50%', cursor: 'ew-resize' },
};

function snapAxis(value: number, size: number, targets: number[], threshold: number) {
  let best = { delta: 0, guide: null as number | null, dist: threshold };
  const checks: [number, number][] = [
    [0, value],
    [size / 2, value + size / 2],
    [size, value + size],
  ];
  for (const target of targets) {
    for (const [offset, edge] of checks) {
      const distance = Math.abs(edge - target);
      if (distance < best.dist) {
        best = { delta: target - edge, guide: target, dist: distance };
      }
    }
  }
  return best;
}

function SelectionFrame({
  element,
  zoom,
  onHandle,
  onRotate,
}: {
  element: DesignElement;
  zoom: number;
  onHandle: (event: React.PointerEvent, handle: Handles) => void;
  onRotate: (event: React.PointerEvent) => void;
}) {
  const size = 10 / zoom;
  const line = 1.4 / zoom;
  return (
    <div
      className="selection-frame"
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: 'center center',
        border: `${line}px solid #b9a5e8`,
        boxShadow: `0 0 0 ${line}px rgba(6,5,10,0.55)`,
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    >
      <div
        className="selection-label"
        style={{
          position: 'absolute',
          left: 0,
          top: -24 / zoom,
          transform: `rotate(${-element.rotation}deg)`,
          transformOrigin: 'bottom left',
          fontSize: 11 / zoom,
          lineHeight: 1.4,
          padding: `${2 / zoom}px ${6 / zoom}px`,
          borderRadius: 4 / zoom,
          background: '#b9a5e8',
          color: '#0a0812',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}
      >
        {element.name}
      </div>

      <div
        onPointerDown={onRotate}
        title="Rotate"
        data-role="rotate"
        style={{
          position: 'absolute',
          left: '50%',
          top: -30 / zoom,
          width: 18 / zoom,
          height: 18 / zoom,
          marginLeft: -9 / zoom,
          borderRadius: '50%',
          background: '#b9a5e8',
          border: `${2 / zoom}px solid #0a0812`,
          cursor: 'grab',
          pointerEvents: 'auto',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -24 / zoom,
          width: line,
          height: 20 / zoom,
          background: 'rgba(185,165,232,0.7)',
          transform: 'translateX(-50%)',
        }}
      />

      {(Object.keys(HANDLE_POSITIONS) as Handles[]).map((handle) => (
        <div
          key={handle}
          data-role={`handle-${handle}`}
          onPointerDown={(event) => onHandle(event, handle)}
          style={{
            position: 'absolute',
            left: HANDLE_POSITIONS[handle].left,
            top: HANDLE_POSITIONS[handle].top,
            width: size,
            height: size,
            transform: 'translate(-50%, -50%)',
            background: '#0a0812',
            border: `${1.6 / zoom}px solid #b9a5e8`,
            borderRadius: 3 / zoom,
            cursor: HANDLE_POSITIONS[handle].cursor,
            pointerEvents: 'auto',
          }}
        />
      ))}
    </div>
  );
}

export default function DesignEditor({ designId }: { designId: number }) {
  const router = useRouter();
  // Subscribing here re-renders the canvas once the self-hosted fonts arrive.
  useCustomFonts();
  const accent = useAccent();
  const [design, setDesign] = useState<Design | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<StudioTab>('templates');
  const [zoom, setZoom] = useState(0.4);
  const [showSafe, setShowSafe] = useState(false);
  const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [busy, setBusy] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [exportDesign, setExportDesign] = useState<Design | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const designRef = useRef<Design | null>(null);
  const dirtyRef = useRef(false);
  const pastRef = useRef<Design[]>([]);
  const futureRef = useRef<Design[]>([]);
  const scaleRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const selectedIdRef = useRef<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const gestureRef = useRef<any>(null);

  zoomRef.current = zoom;
  selectedIdRef.current = selectedId;
  editingIdRef.current = editingId;

  const setDesignBoth = useCallback((next: Design) => {
    designRef.current = next;
    setDesign(next);
  }, []);

  /* --------------------------------------------------------------- Laden */

  useEffect(() => {
    Promise.all([
      fetch(`/api/designs/${designId}`).then((response) => {
        if (!response.ok) throw new Error('not-found');
        return response.json();
      }),
      fetch('/api/media').then((response) => response.json()),
    ])
      .then(([designData, mediaData]) => {
        const loaded: Design = designData.design;
        setDesignBoth(loaded);
        setMedia(mediaData.media ?? []);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [designId, setDesignBoth]);

  /* ------------------------------------------------------------- History */

  const commit = useCallback(
    (updater: (current: Design) => Design, snapshot = true) => {
      const current = designRef.current;
      if (!current) return;
      if (snapshot) {
        pastRef.current = [...pastRef.current.slice(-99), current];
        futureRef.current = [];
        setHistoryVersion((value) => value + 1);
      }
      const next = updater(current);
      dirtyRef.current = true;
      setSaveState('dirty');
      setDesignBoth(next);
    },
    [setDesignBoth]
  );

  const updateElement = useCallback(
    (id: string, patch: Record<string, any>, snapshot = true) => {
      commit(
        (current) => ({
          ...current,
          elements: current.elements.map((element) =>
            element.id === id ? ({ ...element, ...patch } as DesignElement) : element
          ),
        }),
        snapshot
      );
    },
    [commit]
  );

  const updateDesign = useCallback(
    (patch: Partial<Design>, snapshot = true) => {
      commit((current) => ({ ...current, ...patch }), snapshot);
    },
    [commit]
  );

  const undo = useCallback(() => {
    if (!pastRef.current.length || !designRef.current) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [designRef.current, ...futureRef.current];
    dirtyRef.current = true;
    setSaveState('dirty');
    setDesignBoth(previous);
    setHistoryVersion((value) => value + 1);
    setEditingId(null);
  }, [setDesignBoth]);

  const redo = useCallback(() => {
    if (!futureRef.current.length || !designRef.current) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, designRef.current];
    dirtyRef.current = true;
    setSaveState('dirty');
    setDesignBoth(next);
    setHistoryVersion((value) => value + 1);
    setEditingId(null);
  }, [setDesignBoth]);

  /* -------------------------------------------------------------- Speichern */

  useEffect(() => {
    if (!design || !dirtyRef.current || !design.id) return;
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        const response = await fetch(`/api/designs/${design.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: design.title,
            width: design.width,
            height: design.height,
            background: design.background,
            elements: design.elements,
          }),
        });
        if (!response.ok) throw new Error('Failed to save');
        dirtyRef.current = false;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [design]);

  const saveNow = useCallback(async () => {
    const current = designRef.current;
    if (!current?.id) return;
    setSaveState('saving');
    try {
      await fetch(`/api/designs/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: current.title,
          width: current.width,
          height: current.height,
          background: current.background,
          elements: current.elements,
        }),
      });
      dirtyRef.current = false;
      setSaveState('saved');
      toast('Design saved');
    } catch {
      setSaveState('error');
      toast('Failed to save', 'error');
    }
  }, []);

  /* ----------------------------------------------------------------- Zoom */

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !design) return;
    const fit = () => {
      const padding = 84;
      const availableWidth = viewport.clientWidth - padding;
      const availableHeight = viewport.clientHeight - padding;
      if (availableWidth <= 0 || availableHeight <= 0) return;
      const next = Math.min(availableWidth / design.width, availableHeight / design.height, 1);
      setZoom(clamp(next, 0.06, 1));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [design?.width, design?.height]);

  /* ------------------------------------------------------------ Gestures */

  const finishGesture = useCallback(() => {
    gestureRef.current = null;
    setGuides({ v: null, h: null });
    window.removeEventListener('pointermove', handleGestureMove);
    window.removeEventListener('pointerup', finishGesture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGestureMove = useCallback(
    (event: PointerEvent) => {
      const gesture = gestureRef.current;
      const current = designRef.current;
      if (!gesture || !current) return;

      const dx = (event.clientX - gesture.startClientX) / zoomRef.current;
      const dy = (event.clientY - gesture.startClientY) / zoomRef.current;

      if (gesture.type === 'move') {
        const threshold = 8 / zoomRef.current;
        const others = current.elements.filter((element) => element.id !== gesture.id && !element.hidden);
        const vTargets = [0, current.width / 2, current.width];
        const hTargets = [0, current.height / 2, current.height];
        others.forEach((element) => {
          vTargets.push(element.x, element.x + element.w / 2, element.x + element.w);
          hTargets.push(element.y, element.y + element.h / 2, element.y + element.h);
        });
        const snapX = snapAxis(gesture.start.x + dx, gesture.start.w, vTargets, threshold);
        const snapY = snapAxis(gesture.start.y + dy, gesture.start.h, hTargets, threshold);
        setGuides({ v: snapX.guide, h: snapY.guide });
        updateElement(
          gesture.id,
          {
            x: Math.round(gesture.start.x + dx + snapX.delta),
            y: Math.round(gesture.start.y + dy + snapY.delta),
          },
          false
        );
        return;
      }

      if (gesture.type === 'resize') {
        const rad = (gesture.start.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        const dir: Record<Handles, [number, number]> = {
          n: [0, -1],
          s: [0, 1],
          e: [1, 0],
          w: [-1, 0],
          nw: [-1, -1],
          ne: [1, -1],
          se: [1, 1],
          sw: [-1, 1],
        };
        const [dirX, dirY] = dir[gesture.handle as Handles];
        const startW = gesture.start.w;
        const startH = gesture.start.h;
        let width = Math.max(12, startW + dirX * localX);
        let height = Math.max(12, startH + dirY * localY);
        if (event.shiftKey && dirX !== 0 && dirY !== 0) {
          const ratio = startW / startH;
          if (Math.abs(localX) > Math.abs(localY)) height = width / ratio;
          else width = height * ratio;
        }
        const shiftLocalX = (dirX * (width - startW)) / 2;
        const shiftLocalY = (dirY * (height - startH)) / 2;
        const shiftX = shiftLocalX * cos - shiftLocalY * sin;
        const shiftY = shiftLocalX * sin + shiftLocalY * cos;
        const centerX = gesture.start.x + startW / 2 + shiftX;
        const centerY = gesture.start.y + startH / 2 + shiftY;
        updateElement(
          gesture.id,
          {
            x: Math.round(centerX - width / 2),
            y: Math.round(centerY - height / 2),
            w: Math.round(width),
            h: Math.round(height),
          },
          false
        );
        return;
      }

      if (gesture.type === 'rotate') {
        const node = scaleRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / zoomRef.current;
        const pointerY = (event.clientY - rect.top) / zoomRef.current;
        const angle = Math.atan2(pointerY - gesture.centerY, pointerX - gesture.centerX);
        let rotation = gesture.start.rotation + ((angle - gesture.startAngle) * 180) / Math.PI;
        if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
        updateElement(gesture.id, { rotation: Math.round(rotation * 10) / 10 }, false);
      }
    },
    [updateElement]
  );

  const beginGesture = useCallback(
    (type: 'move' | 'resize' | 'rotate', element: DesignElement, event: React.PointerEvent, handle?: Handles) => {
      event.preventDefault();
      event.stopPropagation();
      if (element.locked) return;
      const node = scaleRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const centerX = element.x + element.w / 2;
      const centerY = element.y + element.h / 2;
      const pointerX = (event.clientX - rect.left) / zoomRef.current;
      const pointerY = (event.clientY - rect.top) / zoomRef.current;

      commit((current) => current, true);

      gestureRef.current = {
        type,
        handle,
        id: element.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        start: { ...element },
        centerX,
        centerY,
        startAngle: Math.atan2(pointerY - centerY, pointerX - centerX),
      };
      window.addEventListener('pointermove', handleGestureMove);
      window.addEventListener('pointerup', finishGesture);
    },
    [commit, finishGesture, handleGestureMove]
  );

  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id);
    if (editingIdRef.current && editingIdRef.current !== id) setEditingId(null);
  }, []);

  const onElementPointerDown = useCallback(
    (event: React.PointerEvent, element: DesignElement) => {
      event.stopPropagation();
      selectElement(element.id);
      if (editingIdRef.current === element.id) return;
      beginGesture('move', element, event);
    },
    [beginGesture, selectElement]
  );

  const onElementDoubleClick = useCallback(
    (_event: React.MouseEvent, element: DesignElement) => {
      if (element.type === 'text' && !element.locked) {
        setSelectedId(element.id);
        commit((current) => current, true);
        setEditingId(element.id);
      }
    },
    [commit]
  );

  /* ------------------------------------------------------------- Aktionen */

  const selectedElement = useMemo(
    () => design?.elements.find((element) => element.id === selectedId) ?? null,
    [design, selectedId]
  );

  const addElement = useCallback(
    (element: DesignElement) => {
      commit((current) => ({ ...current, elements: [...current.elements, element] }));
      setSelectedId(element.id);
      setEditingId(null);
    },
    [commit]
  );

  const deleteElement = useCallback(
    (id?: string) => {
      const targetId = id ?? selectedIdRef.current;
      if (!targetId) return;
      commit((current) => ({ ...current, elements: current.elements.filter((element) => element.id !== targetId) }));
      if (selectedIdRef.current === targetId) setSelectedId(null);
      setEditingId(null);
    },
    [commit]
  );

  const duplicateElement = useCallback(
    (id?: string) => {
      const current = designRef.current;
      const targetId = id ?? selectedIdRef.current;
      if (!current || !targetId) return;
      const source = current.elements.find((element) => element.id === targetId);
      if (!source) return;
      const copy = {
        ...source,
        id: `${source.type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        x: source.x + 30,
        y: source.y + 30,
        name: `${source.name} Kopie`,
        locked: false,
      } as DesignElement;
      commit((state) => ({ ...state, elements: [...state.elements, copy] }));
      setSelectedId(copy.id);
    },
    [commit]
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const element = designRef.current?.elements.find((item) => item.id === id);
      if (!element) return;
      updateElement(id, { hidden: !element.hidden });
    },
    [updateElement]
  );

  const toggleLock = useCallback(
    (id: string) => {
      const element = designRef.current?.elements.find((item) => item.id === id);
      if (!element) return;
      updateElement(id, { locked: !element.locked });
    },
    [updateElement]
  );

  const moveLayer = useCallback(
    (id: string, direction: 'up' | 'down') => {
      commit((current) => {
        const index = current.elements.findIndex((element) => element.id === id);
        if (index < 0) return current;
        const target = direction === 'up' ? index + 1 : index - 1;
        if (target < 0 || target >= current.elements.length) return current;
        const elements = [...current.elements];
        [elements[index], elements[target]] = [elements[target], elements[index]];
        return { ...current, elements };
      });
    },
    [commit]
  );

  const orderElement = useCallback(
    (where: 'front' | 'back' | 'forward' | 'backward') => {
      const id = selectedIdRef.current;
      if (!id) return;
      commit((current) => {
        const elements = [...current.elements];
        const index = elements.findIndex((element) => element.id === id);
        if (index < 0) return current;
        const [element] = elements.splice(index, 1);
        if (where === 'front') elements.push(element);
        else if (where === 'back') elements.unshift(element);
        else if (where === 'forward') elements.splice(Math.min(elements.length, index + 1), 0, element);
        else elements.splice(Math.max(0, index - 1), 0, element);
        return { ...current, elements };
      });
    },
    [commit]
  );

  const alignElement = useCallback(
    (align: AlignTarget) => {
      const id = selectedIdRef.current;
      const current = designRef.current;
      if (!id || !current) return;
      const element = current.elements.find((item) => item.id === id);
      if (!element) return;
      const patch: Record<string, number> = {};
      if (align === 'left') patch.x = 0;
      if (align === 'center') patch.x = Math.round((current.width - element.w) / 2);
      if (align === 'right') patch.x = Math.round(current.width - element.w);
      if (align === 'top') patch.y = 0;
      if (align === 'middle') patch.y = Math.round((current.height - element.h) / 2);
      if (align === 'bottom') patch.y = Math.round(current.height - element.h);
      updateElement(id, patch);
    },
    [updateElement]
  );

  const applyFormat = useCallback(
    (width: number, height: number) => {
      updateDesign({ width, height });
    },
    [updateDesign]
  );

  const fitElementsToFormat = useCallback(
    (width: number, height: number) => {
      const current = designRef.current;
      if (!current) return;
      commit(() => adaptDesign(current, width, height));
    },
    [commit]
  );

  const applyTemplate = useCallback(
    (template: Template) => {
      const photo =
        media.find((item) => item.groupKind === 'photo') ??
        media.find((item) => item.mime.startsWith('image/'));
      const built = template.build(
        photo ? { url: photo.url, id: photo.id, width: photo.width, height: photo.height } : null
      );
      // Templates are drawn in the default lavender CI – pull them onto the live accent.
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
      commit((current) => ({
        ...current,
        width: themed.width,
        height: themed.height,
        background: themed.background,
        elements: themed.elements,
      }));
      setSelectedId(null);
      setEditingId(null);
      toast(`Template “${template.name}” applied`);
    },
    [accent, commit, media]
  );

  const addText = useCallback(
    (preset: TextPreset) => {
      const current = designRef.current;
      if (!current) return;
      const element = createText({ width: current.width, height: current.height }, preset);
      addElement(element);
    },
    [addElement]
  );

  const addShape = useCallback(
    (shape: ShapeKind) => {
      const current = designRef.current;
      if (!current) return;
      addElement(createShape({ width: current.width, height: current.height }, shape));
    },
    [addElement]
  );

  const addImage = useCallback(
    (item: MediaItem) => {
      const current = designRef.current;
      if (!current) return;
      addElement(
        createImage(
          { width: current.width, height: current.height },
          { url: item.url, id: item.id, width: item.width, height: item.height }
        )
      );
    },
    [addElement]
  );

  const addSticker = useCallback(
    (glyph: StickerKind) => {
      const current = designRef.current;
      if (!current) return;
      addElement(createSticker({ width: current.width, height: current.height }, glyph));
    },
    [addElement]
  );

  const addTexture = useCallback(
    (texture: TextureKind) => {
      const current = designRef.current;
      if (!current) return;
      addElement(createTexture({ width: current.width, height: current.height }, texture));
    },
    [addElement]
  );

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('files', file));
      try {
        const response = await fetch('/api/media', { method: 'POST', body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Upload failed');
        const uploaded: MediaItem[] = data.media ?? [];
        setMedia((current) => [...uploaded, ...current]);
        if (uploaded[0]) addImage(uploaded[0]);
        toast('Image uploaded and placed');
      } catch (error: any) {
        toast(error.message ?? 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
    },
    [addImage]
  );

  /* -------------------------------------------------------------- Export */

  const renderPng = useCallback(async (): Promise<Blob | null> => {
    const node = exportRef.current;
    if (!node) return null;
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: false });
    const response = await fetch(dataUrl);
    return response.blob();
  }, []);

  const downloadPng = useCallback(async () => {
    const current = designRef.current;
    if (!current) return;
    setBusy('download');
    try {
      const blob = await renderPng();
      if (!blob) throw new Error('Render failed');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${current.title.replace(/[^\wäöüß-]+/gi, '-').toLowerCase() || 'design'}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast('PNG downloaded');
    } catch (error: any) {
      console.error(error);
      toast('Export failed', 'error');
    } finally {
      setBusy(null);
    }
  }, [renderPng]);

  const slug = (value: string) =>
    value
      .replace(/[^\wäöüß-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'design';

  /** One design → every feed/story format, packaged as a ZIP. */
  const exportSet = useCallback(async () => {
    const current = designRef.current;
    if (!current) return;
    setBusy('set');
    try {
      const files: ZipEntry[] = [];
      for (const preset of FORMATS) {
        setExportDesign(adaptDesign(current, preset.width, preset.height));
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))
        );
        await new Promise((resolve) => setTimeout(resolve, 140));
        const blob = await renderPng();
        if (!blob) continue;
        files.push({
          name: `${slug(current.title)}-${preset.width}x${preset.height}.png`,
          data: new Uint8Array(await blob.arrayBuffer()),
        });
      }
      if (!files.length) throw new Error('Nothing rendered');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob(files));
      link.download = `${slug(current.title)}-formats.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast(`${files.length} formats in one ZIP`);
    } catch (error: any) {
      console.error(error);
      toast('Export failed', 'error');
    } finally {
      setExportDesign(null);
      setBusy(null);
    }
  }, [renderPng]);

  const applyVariant = useCallback(
    (variant: DesignVariant) => {
      commit((current) => ({
        ...current,
        background: variant.design.background,
        elements: variant.design.elements,
      }));
      setVariantsOpen(false);
      setSelectedId(null);
      setEditingId(null);
      toast(`Direction “${variant.label}” applied`);
    },
    [commit]
  );

  const saveToLibrary = useCallback(
    async (mode: 'library' | 'post') => {
      const current = designRef.current;
      if (!current) return;
      setBusy(mode);
      try {
        const blob = await renderPng();
        if (!blob) throw new Error('Render failed');
        const form = new FormData();
        form.append('files', new File([blob], `design-${current.id}.png`, { type: 'image/png' }));
        form.append('title', current.title);
        form.append('tags', 'design,instagram');
        const mediaResponse = await fetch('/api/media', { method: 'POST', body: form });
        const mediaData = await mediaResponse.json();
        if (!mediaResponse.ok) throw new Error(mediaData.error ?? 'Upload failed');
        const uploaded = mediaData.media?.[0];

        if (mode === 'library') {
          toast('Design saved to the media library');
          return;
        }

        const postResponse = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'photo',
            status: 'draft',
            caption: current.title,
            mediaIds: uploaded ? [uploaded.id] : [],
          }),
        });
        if (!postResponse.ok) throw new Error('Could not create the post');
        toast('Post draft created – continue in the planner');
        router.push('/planner');
      } catch (error: any) {
        console.error(error);
        toast(error.message ?? 'Export failed', 'error');
      } finally {
        setBusy(null);
      }
    },
    [renderPng, router]
  );

  /* ------------------------------------------------------------ Tastatur */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.closest('[contenteditable="true"]'));

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveNow();
        return;
      }
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (inField) return;
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateElement();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIdRef.current) {
        event.preventDefault();
        deleteElement();
        return;
      }
      if (event.key === 'Escape') {
        setEditingId(null);
        setSelectedId(null);
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && selectedIdRef.current) {
        event.preventDefault();
        const element = designRef.current?.elements.find((item) => item.id === selectedIdRef.current);
        if (!element) return;
        const step = event.shiftKey ? 10 : 1;
        const patch: Record<string, number> = {};
        if (event.key === 'ArrowUp') patch.y = element.y - step;
        if (event.key === 'ArrowDown') patch.y = element.y + step;
        if (event.key === 'ArrowLeft') patch.x = element.x - step;
        if (event.key === 'ArrowRight') patch.x = element.x + step;
        updateElement(element.id, patch);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteElement, duplicateElement, redo, saveNow, undo, updateElement]);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleGestureMove);
      window.removeEventListener('pointerup', finishGesture);
    };
  }, [finishGesture, handleGestureMove]);

  /* ------------------------------------------------------------------ UI */

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading design</span>
      </div>
    );
  }

  if (notFound || !design) {
    return (
      <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20 }}>Design not found</h2>
        <p className="muted" style={{ margin: '10px 0 20px' }}>
          Maybe it was deleted. Head back to the overview and start again.
        </p>
        <Link href="/studio" className="btn btn-primary">
          Go to the design studio
        </Link>
      </div>
    );
  }

  const saveLabel =
    saveState === 'saving'
      ? 'Saving …'
      : saveState === 'dirty'
      ? 'Unsaved'
      : saveState === 'error'
      ? 'Save failed'
      : saveState === 'saved'
      ? 'Saved'
      : 'Ready';

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-topbar-left">
          <Link href="/studio" className="btn btn-icon" title="Back to gallery">
            <IconChevronLeft size={16} />
          </Link>
          <input
            className="studio-title"
            value={design.title}
            onChange={(event) => updateDesign({ title: event.target.value }, false)}
            spellCheck={false}
          />
          <span className={`studio-save ${saveState}`}>{saveLabel}</span>
        </div>

        <div className="studio-topbar-right">
          <div className="zoom-box">
            <button type="button" onClick={() => setZoom((value) => clamp(value - 0.1, 0.06, 2))} title="Zoom out">
              −
            </button>
            <span className="mono">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => clamp(value + 0.1, 0.06, 2))} title="Zoom in">
              +
            </button>
          </div>
          <button
            type="button"
            className="btn btn-icon"
            onClick={undo}
            disabled={!pastRef.current.length}
            title="Undo (⌘Z)"
          >
            <IconUndo size={16} />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={redo}
            disabled={!futureRef.current.length}
            title="Redo (⇧⌘Z)"
          >
            <IconRedo size={16} />
          </button>
          <span className="topbar-sep" />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setVariantsOpen(true)}
            title="Six directions for this design"
          >
            <IconSparkles size={15} />
            Directions
          </button>
          <button type="button" className="btn btn-ghost" onClick={downloadPng} disabled={busy === 'download'}>
            <IconDownload size={15} />
            {busy === 'download' ? 'Rendering …' : 'PNG'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportSet}
            disabled={busy === 'set'}
            title="1:1, 4:5 and 9:16 as one ZIP"
          >
            <IconDownload size={15} />
            {busy === 'set' ? 'Zipping …' : '3 sizes'}
          </button>
          <button type="button" className="btn" onClick={() => saveToLibrary('library')} disabled={busy === 'library'}>
            <IconImage size={15} />
            {busy === 'library' ? 'Uploading …' : 'To library'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => saveToLibrary('post')} disabled={busy === 'post'}>
            <IconPlus size={15} />
            {busy === 'post' ? 'Creating …' : 'As post'}
          </button>
        </div>
      </header>

      <div className="studio-workbench">
        <StudioLeftPanel
          tab={tab}
          onTab={setTab}
          design={design}
          media={media}
          selectedId={selectedId}
          onAddText={addText}
          onAddShape={addShape}
          onAddImage={addImage}
          onAddStockImage={(item) => {
            setMedia((current) => [item, ...current]);
            addImage(item);
          }}
          onAddSticker={addSticker}
          onAddTexture={addTexture}
          onApplyTemplate={applyTemplate}
          onSelect={selectElement}
          onToggleHidden={toggleHidden}
          onToggleLock={toggleLock}
          onMoveLayer={moveLayer}
          onDelete={deleteElement}
          onUpload={uploadFiles}
          uploading={uploading}
        />

        <div
          className="canvas-viewport"
          ref={viewportRef}
          onPointerDown={() => {
            setSelectedId(null);
            setEditingId(null);
          }}
        >
          <div className="canvas-stage" style={{ width: design.width * zoom, height: design.height * zoom }}>
            <div
              className="canvas-scale"
              ref={scaleRef}
              style={{
                width: design.width,
                height: design.height,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'relative',
              }}
            >
              <CanvasSurface
                design={design}
                interactive
                editingId={editingId}
                selectedId={selectedId}
                onElementPointerDown={onElementPointerDown}
                onElementDoubleClick={onElementDoubleClick}
                onTextChange={(text) => {
                  if (editingId) updateElement(editingId, { text }, false);
                }}
                onTextEnd={() => setEditingId(null)}
              />

              {showSafe ? (
                <>
                  <div className="safe-zone top" style={{ height: 250 }} />
                  <div className="safe-zone bottom" style={{ height: 340 }} />
                </>
              ) : null}

              {guides.v !== null ? (
                <div className="snap-guide v" style={{ left: guides.v, width: 1 / zoom }} />
              ) : null}
              {guides.h !== null ? (
                <div className="snap-guide h" style={{ top: guides.h, height: 1 / zoom }} />
              ) : null}

              {selectedElement && !editingId ? (
                <SelectionFrame
                  element={selectedElement}
                  zoom={zoom}
                  onHandle={(event, handle) => beginGesture('resize', selectedElement, event, handle)}
                  onRotate={(event) => beginGesture('rotate', selectedElement, event)}
                />
              ) : null}
            </div>
          </div>

          <div className="canvas-footer">
            <span className="mono">
              {design.width} × {design.height} px
            </span>
            <span className="canvas-footer-hint">Double-click text = edit · drag = move · Shift = 15° steps</span>
            <span className="mono">{design.elements.filter((element) => !element.hidden).length} elements</span>
          </div>
        </div>

        <StudioInspector
          design={design}
          element={selectedElement}
          showSafe={showSafe}
          onToggleSafe={() => setShowSafe((value) => !value)}
          onUpdateElement={(patch, snapshot = true) => {
            if (selectedElement) updateElement(selectedElement.id, patch, snapshot);
          }}
          onUpdateDesign={updateDesign}
          onDelete={() => deleteElement()}
          onDuplicate={() => duplicateElement()}
          onOrder={orderElement}
          onAlign={alignElement}
          onApplyFormat={applyFormat}
          onFitToFormat={fitElementsToFormat}
          onReplaceImage={() => setPickerOpen(true)}
          onClose={() => setSelectedId(null)}
        />
      </div>

      <div className="studio-export" aria-hidden="true">
        <div
          ref={exportRef}
          style={{ width: (exportDesign ?? design).width, height: (exportDesign ?? design).height }}
        >
          <CanvasSurface design={exportDesign ?? design} />
        </div>
      </div>

      <VariantsModal
        open={variantsOpen}
        design={design}
        accent={accent}
        onClose={() => setVariantsOpen(false)}
        onApply={applyVariant}
      />

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        media={media}
        selectedIds={[]}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
        onConfirm={(ids) => {
          const item = media.find((entry) => entry.id === ids[0]);
          if (item && selectedElement && selectedElement.type === 'image') {
            updateElement(selectedElement.id, { url: item.url, mediaId: item.id });
          }
        }}
      />
    </div>
  );
}
