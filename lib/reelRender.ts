import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UPLOAD_DIR } from './db';
import { createMedia, getMedia } from './repo';
import { REEL_FPS, REEL_H, REEL_W, type ReelPlan } from './reels';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

let statusCache: { ok: boolean; version?: string; error?: string } | null = null;

/** Is ffmpeg available on this machine? Cached – the UI asks once per page load. */
export function ffmpegStatus() {
  if (statusCache) return statusCache;
  const result = spawnSync(FFMPEG, ['-version'], { encoding: 'utf8' });
  if (result.status === 0) {
    statusCache = { ok: true, version: (result.stdout || '').split('\n')[0]?.trim() };
  } else {
    statusCache = {
      ok: false,
      error: result.error?.message ?? 'ffmpeg could not be started',
    };
  }
  return statusCache;
}

function sourcePath(mediaId: number) {
  const media = getMedia(mediaId);
  if (!media) throw new Error(`Media ${mediaId} not found`);
  const file = path.basename(decodeURIComponent(media.url.split('/').pop() ?? ''));
  const absolute = path.join(UPLOAD_DIR, file);
  if (!fs.existsSync(absolute)) throw new Error(`${media.title} is missing on disk`);
  return { media, absolute };
}

function hexColour(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? `0x${value.slice(1).toUpperCase()}` : '0xB9A5E8';
}

function clipFilter(motion: ReelPlan['clips'][number]['motion'], index: number) {
  const zoom =
    motion === 'in'
      ? `zoompan=z='min(1+0.0011*on,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${REEL_W}x${REEL_H}:fps=${REEL_FPS},`
      : motion === 'out'
        ? `zoompan=z='max(1.12-0.0011*on,1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${REEL_W}x${REEL_H}:fps=${REEL_FPS},`
        : '';
  return (
    `[${index}:v]scale=${REEL_W}:${REEL_H}:force_original_aspect_ratio=increase,` +
    `crop=${REEL_W}:${REEL_H},setsar=1,fps=${REEL_FPS},${zoom}` +
    `format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v${index}]`
  );
}

function gradeChain(grade: ReelPlan['look']['grade']) {
  if (grade === 'warm') {
    return 'eq=contrast=1.04:saturation=0.9:brightness=-0.012,colorbalance=rs=0.05:gs=0.01:bs=-0.05';
  }
  if (grade === 'mono') return 'hue=s=0,eq=contrast=1.1:brightness=-0.02';
  if (grade === 'faded') {
    return "eq=contrast=0.94:saturation=0.72:brightness=0.02,curves=all='0/0.06 0.5/0.5 1/0.94'";
  }
  return '';
}

export interface RenderResult {
  mediaId: number;
  coverId: number | null;
  duration: number;
  filename: string;
}

/**
 * Renders the plan with ffmpeg: crop/fit + optional push-in, global grade,
 * grain, vignette, beat flashes, text overlay PNG, loudness-normalised song,
 * cover frame – all in one pass.
 */
export async function renderReel(
  plan: ReelPlan,
  overlayDataUrl: string | null,
  onProgress: (progress: number) => void
): Promise<RenderResult> {
  const status = ffmpegStatus();
  if (!status.ok) {
    throw new Error('ffmpeg is not available on this server – install it or set FFMPEG_PATH.');
  }

  const clips = plan.clips.filter((clip) => clip.duration > 0.25);
  if (!clips.length) throw new Error('The reel needs at least one clip');
  const duration = Number(clips.reduce((sum, clip) => sum + clip.duration, 0).toFixed(3));
  if (duration < 1) throw new Error('The reel is too short');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dechire-reel-'));
  const outputName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-reel.mp4`;
  const outputPath = path.join(UPLOAD_DIR, outputName);
  const coverName = outputName.replace(/\.mp4$/, '-cover.jpg');
  const coverPath = path.join(UPLOAD_DIR, coverName);

  try {
    const inputArgs: string[] = [];
    const filters: string[] = [];
    clips.forEach((clip, index) => {
      const { media, absolute } = sourcePath(clip.mediaId);
      if (media.mime === 'image/svg+xml') {
        throw new Error(`${media.title} is an SVG – the reel renderer needs a photo or video (PNG/JPG/MP4).`);
      }
      if (media.mime.startsWith('video/')) {
        inputArgs.push('-ss', clip.start.toFixed(3), '-t', clip.duration.toFixed(3), '-i', absolute);
      } else {
        inputArgs.push('-loop', '1', '-framerate', String(REEL_FPS), '-t', clip.duration.toFixed(3), '-i', absolute);
      }
      filters.push(clipFilter(clip.motion, index));
    });

    let overlayIndex: number | null = null;
    if (overlayDataUrl && overlayDataUrl.startsWith('data:image/png;base64,')) {
      const overlayPath = path.join(tmp, 'overlay.png');
      fs.writeFileSync(overlayPath, Buffer.from(overlayDataUrl.split(',')[1], 'base64'));
      overlayIndex = clips.length;
      inputArgs.push('-loop', '1', '-framerate', String(REEL_FPS), '-i', overlayPath);
    }

    const audioIndex = clips.length + (overlayIndex == null ? 0 : 1);
    const { absolute: audioPath } = sourcePath(plan.audio.mediaId);
    inputArgs.push('-ss', plan.audio.start.toFixed(3), '-t', duration.toFixed(3), '-i', audioPath);

    const videoLabels = clips.map((_, index) => `[v${index}]`).join('');
    filters.push(`${videoLabels}concat=n=${clips.length}:v=1:a=0[cat]`);

    let label = 'cat';
    const steps: string[] = [];
    const grade = gradeChain(plan.look.grade);
    if (grade) steps.push(grade);
    if (plan.look.grain > 0) steps.push(`noise=alls=${Math.round(Math.min(30, plan.look.grain))}:allf=t+u`);
    if (plan.look.vignette > 0) steps.push(`vignette=angle=${(Math.min(1, plan.look.vignette) * 0.6).toFixed(2)}`);
    if (steps.length) {
      filters.push(`[${label}]${steps.join(',')}[graded]`);
      label = 'graded';
    }

    if (overlayIndex != null) {
      filters.push(`[${label}][${overlayIndex}:v]overlay=0:0:format=auto[texted]`);
      label = 'texted';
    }

    const flashes = plan.look.flash
      ? plan.beats
          .filter((beat) => beat > 0.7 && beat < duration - 0.55)
          .slice(0, 64)
          .map((beat) => `between(t,${beat.toFixed(3)},${(beat + 0.09).toFixed(3)})`)
      : [];
    if (flashes.length) {
      filters.push(
        `[${label}]drawbox=x=0:y=0:w=iw:h=ih:color=${hexColour(plan.look.accent)}@0.10:t=fill:enable='${flashes.join('+')}'[flashed]`
      );
      label = 'flashed';
    }

    if (plan.look.fadeOut) {
      filters.push(`[${label}]fade=t=out:st=${(duration - 0.4).toFixed(2)}:d=0.4[outv]`);
      label = 'outv';
    }

    const audioFade = Math.min(0.8, duration * 0.2);
    filters.push(
      `[${audioIndex}:a]atrim=duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS,` +
        `afade=t=in:st=0:d=0.25,afade=t=out:st=${(duration - audioFade).toFixed(2)}:d=${audioFade.toFixed(2)},` +
        `loudnorm=I=-14:TP=-1:LRA=11,aresample=48000,alimiter=limit=0.95[aout]`
    );

    const args = [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostats',
      '-progress',
      'pipe:1',
      ...inputArgs,
      '-filter_complex',
      filters.join(';'),
      '-map',
      `[${label}]`,
      '-map',
      '[aout]',
      '-t',
      duration.toFixed(3),
      '-r',
      String(REEL_FPS),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-movflags',
      '+faststart',
      outputPath,
    ];

    const result = await new Promise<RenderResult>((resolve, reject) => {
      const child = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      let lastProgress = 0;
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        for (const line of chunk.split('\n')) {
          const match = /^out_time_ms=(\d+)$/.exec(line.trim());
          if (match) {
            const seconds = Number(match[1]) / 1_000_000;
            const progress = Math.max(lastProgress, Math.min(0.99, seconds / duration));
            if (progress - lastProgress > 0.01) {
              lastProgress = progress;
              onProgress(progress);
            }
          }
        }
      });
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => {
        stderr = (stderr + chunk).slice(-6000);
      });
      child.on('error', (error) => reject(error));
      child.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(stderr.trim().split('\n').slice(-3).join(' ') || `ffmpeg exited with ${code}`));
          return;
        }
        try {
          onProgress(1);
          const size = fs.statSync(outputPath).size;
          const title = (plan.title || 'Reel').slice(0, 80);
          const mediaId = createMedia({
            title: `${title} · Reel`,
            filename: outputName,
            originalName: `${title}.mp4`,
            mime: 'video/mp4',
            size,
            width: REEL_W,
            height: REEL_H,
            alt: plan.text.hook || title,
            tags: ['reel', 'export'],
          });

          let coverId: number | null = null;
          try {
            const coverAt = Math.max(0, Math.min(plan.coverAt || 0.5, duration - 0.1));
            const coverArgs = [
              '-y',
              '-hide_banner',
              '-loglevel',
              'error',
              '-ss',
              coverAt.toFixed(2),
              '-i',
              outputPath,
              '-frames:v',
              '1',
              '-q:v',
              '2',
              coverPath,
            ];
            const coverResult = spawnSync(FFMPEG, coverArgs, { encoding: 'utf8' });
            if (coverResult.status === 0 && fs.existsSync(coverPath)) {
              coverId = createMedia({
                title: `${title} · Cover`,
                filename: coverName,
                originalName: `${title}-cover.jpg`,
                mime: 'image/jpeg',
                size: fs.statSync(coverPath).size,
                width: REEL_W,
                height: REEL_H,
                alt: plan.text.hook || title,
                tags: ['reel', 'cover'],
              });
            }
          } catch {
            /* a missing cover must not fail the render */
          }

          resolve({ mediaId, coverId, duration, filename: outputName });
        } catch (error: any) {
          reject(error);
        }
      });
    });

    return result;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
