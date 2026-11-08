'use client';

import type { CSSProperties } from 'react';
import ElementContent from '@/components/studio/ElementContent';
import { backgroundCss } from '@/lib/design';
import type { Design, DesignElement } from '@/lib/types';

export default function CanvasSurface({
  design,
  interactive = false,
  editingId,
  selectedId,
  onElementPointerDown,
  onElementDoubleClick,
  onTextChange,
  onTextEnd,
  className,
}: {
  design: Pick<Design, 'width' | 'height' | 'background' | 'elements'>;
  interactive?: boolean;
  editingId?: string | null;
  selectedId?: string | null;
  onElementPointerDown?: (event: React.PointerEvent, element: DesignElement) => void;
  onElementDoubleClick?: (event: React.MouseEvent, element: DesignElement) => void;
  onTextChange?: (text: string) => void;
  onTextEnd?: () => void;
  className?: string;
}) {
  const surfaceStyle: CSSProperties = {
    position: 'relative',
    width: design.width,
    height: design.height,
    background: backgroundCss(design.background),
    overflow: 'hidden',
    flexShrink: 0,
  };

  return (
    <div className={`canvas-surface ${className ?? ''}`} style={surfaceStyle} data-design-surface="true">
      {design.elements.map((element, index) => {
        if (element.hidden) return null;
        const isSelected = selectedId === element.id;
        return (
          <div
            key={element.id}
            data-element-id={element.id}
            style={{
              position: 'absolute',
              left: element.x,
              top: element.y,
              width: element.w,
              height: element.h,
              transform: `rotate(${element.rotation}deg)`,
              transformOrigin: 'center center',
              opacity: element.opacity,
              mixBlendMode: element.blendMode === 'normal' ? undefined : (element.blendMode as CSSProperties['mixBlendMode']),
              zIndex: index + 1,
              cursor: interactive ? (element.locked ? 'not-allowed' : 'move') : 'default',
              outline: interactive && isSelected ? '1px solid rgba(185,165,232,0.0)' : undefined,
            }}
            onPointerDown={
              interactive
                ? (event) => {
                    if (element.locked) return;
                    onElementPointerDown?.(event, element);
                  }
                : undefined
            }
            onDoubleClick={
              interactive
                ? (event) => {
                    onElementDoubleClick?.(event, element);
                  }
                : undefined
            }
          >
            <ElementContent element={element} editing={editingId === element.id} onTextChange={onTextChange} onTextEnd={onTextEnd} />
          </div>
        );
      })}
    </div>
  );
}
