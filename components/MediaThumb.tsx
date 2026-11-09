'use client';

import type { CSSProperties } from 'react';
import type { MediaItem } from '@/lib/types';
import { IconFilm, IconMusic, IconPlay } from '@/components/icons';

export function MediaThumb({
  media,
  className,
  style,
  alt,
}: {
  media?: MediaItem | null;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  if (!media) {
    return <div className={`media-placeholder ${className ?? ''}`} style={style} />;
  }
  const isVideo = media.mime.startsWith('video/');
  if (media.mime.startsWith('audio/')) {
    const ext = (media.originalName.split('.').pop() || 'audio').toUpperCase();
    return (
      <span
        className={`media-audio-tile ${className ?? ''}`}
        style={{
          ...style,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
        title={media.title}
      >
        <IconMusic size={20} />
        <span className="media-audio-ext">{ext}</span>
      </span>
    );
  }
  return (
    <>
      {isVideo ? (
        <video
          src={media.url}
          className={className}
          style={style}
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={media.url}
          alt={alt ?? media.alt ?? media.title}
          className={className}
          style={style}
          loading="lazy"
          draggable={false}
        />
      )}
    </>
  );
}

export function MediaTypeBadge({ media }: { media?: MediaItem | null }) {
  if (!media) return null;
  if (media.mime.startsWith('video/')) {
    return (
      <span className="media-type-badge">
        <IconFilm size={12} />
        Video
      </span>
    );
  }
  if (media.mime.startsWith('audio/')) {
    return (
      <span className="media-type-badge">
        <IconMusic size={12} />
        Audio
      </span>
    );
  }
  return null;
}

export function PlayOverlay() {
  return (
    <span className="play-overlay">
      <IconPlay size={16} />
    </span>
  );
}
