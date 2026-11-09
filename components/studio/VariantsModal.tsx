'use client';

import { useMemo } from 'react';
import SurfacePreview from '@/components/studio/SurfacePreview';
import { Modal } from '@/components/ui';
import { designVariants, type DesignVariant } from '@/lib/studio';
import type { Design } from '@/lib/types';

export default function VariantsModal({
  open,
  design,
  accent,
  onClose,
  onApply,
}: {
  open: boolean;
  design: Design | null;
  accent: string;
  onClose: () => void;
  onApply: (variant: DesignVariant) => void;
}) {
  const variants = useMemo(
    () => (open && design ? designVariants(design, accent) : []),
    [open, design, accent]
  );

  const previewWidth = design ? Math.round((design.width / design.height) * 210) : 168;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Directions"
      subtitle="Six takes on this design – one click replaces the canvas, ⌘Z brings it back."
    >
      <div className="variant-grid">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            className="variant-card"
            onClick={() => onApply(variant)}
            title={`Apply “${variant.label}”`}
          >
            <span className="variant-preview">
              <SurfacePreview design={variant.design} width={previewWidth} />
            </span>
            <span className="variant-info">
              <strong>{variant.label}</strong>
              <span className="mono">{variant.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
