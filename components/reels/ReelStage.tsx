'use client';

import { useEffect, useRef, useState } from 'react';
import { ReelOverlay } from '@/components/reels/ReelOverlay';
import { REEL_SAFE, lyricIndexAt, type ReelLook, type ReelMotion, type ReelText } from '@/lib/reels';
import type { MediaItem } from '@/lib/types';

export interface StageClip {
  key: string;
  media: MediaItem;
  start: number;
  duration: number;
  motion: ReelMotion;
  timelineStart: number;
}

function cssFilter(grade: ReelLook['grade']) {
  if (grade === 'warm') return 'sepia(0.08) saturate(0.68) contrast(1.03) brightness(0.97)';
  if (grade === 'mono') return 'grayscale(1) contrast(1.08) brightness(0.95)';
  if (grade === 'bleach') return 'grayscale(0.35) contrast(1.18) brightness(0.94) saturate(0.55)';
  return 'none';
}

/** The 9:16 stage: media layers, grade, grain, text, safe zones. */
export function ReelStage({
  clips,
  time,
  playing,
  look,
  text,
  handle,
  beats,
  guides,
}: {
  clips: StageClip[];
  time: number;
  playing: boolean;
  look: ReelLook;
  text: ReelText;
  handle?: string;
  beats: number[];
  guides: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mediaRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setScale(width / 1080);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const active =
    clips.find((clip) => time >= clip.timelineStart && time < clip.timelineStart + clip.duration) ??
    clips[clips.length - 1];

  useEffect(() => {
    for (const clip of clips) {
      const video = mediaRefs.current.get(clip.key);
      if (!video) continue;
      if (clip === active) {
        const local = clip.start + Math.max(0, Math.min(clip.duration, time - clip.timelineStart));
        if (Math.abs(video.currentTime - local) > 0.35) {
          try {
            video.currentTime = local;
          } catch {
            /* metadata not ready yet */
          }
        }
        if (playing && video.paused) video.play().catch(() => undefined);
        if (!playing && !video.paused) video.pause();
      } else if (!video.paused) {
        video.pause();
      }
    }
  }, [clips, time, playing, active]);

  const grainOpacity = Math.min(0.4, look.grain / 30 * 0.42);
  const frameRatio =
    look.frame === '4:3' ? 4 / 3 : look.frame === '16:9' ? 16 / 9 : null;
  const frameBar = frameRatio ? Math.round((1920 - 1080 / frameRatio) / 2) : 0;
  const lyrics = text.lyrics ?? [];
  const lyricIndex = lyricIndexAt(lyrics, time);
  const activeLyric = lyricIndex >= 0 ? lyrics[lyricIndex] : null;
  // Lyrics replace the copy, but the mark and handle stay as a quiet frame.
  const frameText = lyrics.length ? { ...text, kicker: '', sub: '', hook: '' } : text;
  const lyricText = activeLyric
    ? {
        ...text,
        kicker: '',
        sub: '',
        hook: activeLyric.text,
        showMark: false,
        showHandle: false,
      }
    : null;

  return (
    <div className="reel-stage-frame" ref={wrapRef}>
      <div
        className="reel-frame reel-preview"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {clips.map((clip) => {
          const isActive = clip === active;
          const animation = isActive && clip.motion !== 'none' ? `reel-push-${clip.motion}` : 'none';
          const style = {
            filter: cssFilter(look.grade),
            animation: clip.motion !== 'none' ? `${animation} ${clip.duration}s linear both` : undefined,
            animationPlayState: playing ? ('running' as const) : ('paused' as const),
          };
          return clip.media.mime.startsWith('video/') ? (
            <video
              key={clip.key}
              ref={(node) => {
                if (node) mediaRefs.current.set(clip.key, node);
                else mediaRefs.current.delete(clip.key);
              }}
              className={`reel-media ${isActive ? 'on' : ''}`}
              style={style}
              src={clip.media.url}
              muted
              playsInline
              preload="auto"
            />
          ) : (
            <img
              key={clip.key}
              className={`reel-media ${isActive ? 'on' : ''}`}
              style={style}
              src={clip.media.url}
              alt=""
            />
          );
        })}

        <span className="reel-grain" style={{ opacity: grainOpacity }} aria-hidden="true" />
        <span
          className="reel-vignette"
          style={{ opacity: look.vignette }}
          aria-hidden="true"
        />

        {frameBar > 0 ? (
          <>
            <span className="reel-mask top" style={{ height: frameBar }} aria-hidden="true" />
            <span className="reel-mask bottom" style={{ height: frameBar }} aria-hidden="true" />
          </>
        ) : null}

        {lyrics.length ? (
          <>
            <ReelOverlay text={frameText} handle={handle} />
            {lyricText ? (
              <ReelOverlay
                key={`lyric-${lyricIndex}`}
                text={lyricText}
                handle={handle}
                lyric={Boolean(activeLyric) && text.lyricFade !== false}
              />
            ) : null}
          </>
        ) : (
          <ReelOverlay text={text} handle={handle} />
        )}

        {guides ? (
          <div className="reel-guides" aria-hidden="true">
            <span className="reel-guide top" style={{ top: REEL_SAFE.top }} />
            <span className="reel-guide bottom" style={{ bottom: REEL_SAFE.bottom }} />
            <span className="reel-guide left" style={{ left: REEL_SAFE.side }} />
            <span className="reel-guide right" style={{ right: REEL_SAFE.side }} />
            <span className="reel-guide-label" style={{ top: REEL_SAFE.top + 10 }}>
              Reels UI
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
