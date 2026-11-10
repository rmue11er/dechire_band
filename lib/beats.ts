/**
 * Tiny beat tracker for the Reel Machine – no library, no server round-trip.
 *
 * 1. RMS envelope at 100 fps
 * 2. half-wave rectified flux (positive energy jumps = onsets)
 * 3. autocorrelation over 70–170 BPM → tempo
 * 4. phase search over one bar → beat grid
 * 5. loudness jump over 2 s windows → the drop
 *
 * Good enough for cutting a reel on the beat, which is all we need it for.
 */

export interface BeatAnalysis {
  bpm: number;
  /** Beat positions in seconds of the decoded track. */
  beats: number[];
  /** Best guess for the drop / loudest section start (seconds). */
  drop: number;
  duration: number;
}

const HOP = 0.01;

export function analyseAudioBuffer(buffer: AudioBuffer): BeatAnalysis {
  const data = buffer.getChannelData(0);
  const duration = buffer.duration;
  const step = Math.max(1, Math.floor(buffer.sampleRate * HOP));
  const frames = Math.max(1, Math.floor(duration / HOP));

  const env = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    const from = frame * step;
    const to = Math.min(from + step, data.length);
    let sum = 0;
    for (let i = from; i < to; i++) sum += data[i] * data[i];
    env[frame] = Math.sqrt(sum / Math.max(1, to - from));
  }

  // smooth the envelope a little so single noisy samples do not create beats
  const smooth = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    const a = env[Math.max(0, frame - 1)];
    const b = env[frame];
    const c = env[Math.min(frames - 1, frame + 1)];
    smooth[frame] = (a + b * 2 + c) / 4;
  }

  const flux = new Float32Array(frames);
  let peak = 0;
  for (let frame = 1; frame < frames; frame++) {
    flux[frame] = Math.max(0, smooth[frame] - smooth[frame - 1]);
    if (flux[frame] > peak) peak = flux[frame];
  }
  if (peak <= 0) return { bpm: 0, beats: [], drop: 0, duration };
  for (let frame = 0; frame < frames; frame++) flux[frame] /= peak;

  let bestLag = 0;
  let bestScore = -1;
  let bestBpm = 0;
  for (let bpm = 70; bpm <= 170; bpm++) {
    const lag = Math.round(60 / (bpm * HOP));
    if (lag < 2 || lag >= frames) continue;
    let score = 0;
    for (let i = 0; i + lag < frames; i++) score += flux[i] * flux[i + lag];
    score /= frames - lag;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
      bestBpm = bpm;
    }
  }
  if (!bestLag) return { bpm: 0, beats: [], drop: 0, duration };

  let bestPhase = 0;
  let bestPhaseScore = -1;
  for (let phase = 0; phase < bestLag; phase++) {
    let score = 0;
    for (let i = phase; i < frames; i += bestLag) score += flux[i];
    if (score > bestPhaseScore) {
      bestPhaseScore = score;
      bestPhase = phase;
    }
  }

  const beats: number[] = [];
  for (let frame = bestPhase; frame < frames; frame += bestLag) beats.push(frame * HOP);

  // Drop: biggest sustained loudness jump after the intro.
  const window = 200; // 2 s
  let drop = 0;
  let dropScore = 0;
  for (let frame = window * 2; frame + window < frames; frame += 10) {
    let before = 0;
    let after = 0;
    for (let i = 0; i < window; i++) {
      before += env[frame - window + i];
      after += env[frame + i];
    }
    const score = after / window - before / window;
    if (score > dropScore * 1.04) {
      dropScore = score;
      drop = frame * HOP;
    }
  }

  return { bpm: bestBpm, beats, drop, duration };
}

/** Waveform buckets (max amplitude per bucket) for the canvas strip. */
export function audioPeaks(buffer: AudioBuffer, buckets = 900): number[] {
  const data = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / buckets));
  const peaks: number[] = [];
  for (let bucket = 0; bucket < buckets; bucket++) {
    let max = 0;
    const from = bucket * size;
    const to = Math.min(from + size, data.length);
    for (let i = from; i < to; i++) {
      const value = Math.abs(data[i]);
      if (value > max) max = value;
    }
    peaks.push(max);
  }
  const loudest = Math.max(...peaks, 0.0001);
  return peaks.map((value) => value / loudest);
}
