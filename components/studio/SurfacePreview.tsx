'use client';

import { memo } from 'react';
import CanvasSurface from '@/components/studio/CanvasSurface';
import type { Design } from '@/lib/types';

function SurfacePreview({
  design,
  width,
  className,
}: {
  design: Pick<Design, 'width' | 'height' | 'background' | 'elements'>;
  width: number;
  className?: string;
}) {
  const scale = width / design.width;
  const height = design.height * scale;
  return (
    <div
      className={`surface-preview ${className ?? ''}`}
      style={{ width, height, overflow: 'hidden', position: 'relative', flexShrink: 0 }}
    >
      <div
        style={{
          width: design.width,
          height: design.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <CanvasSurface design={design} />
      </div>
    </div>
  );
}

export default memo(SurfacePreview);
