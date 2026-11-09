'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Room tone.
 *
 * Not a song, not a player: a very quiet low drone plus tape hiss, built with
 * WebAudio so the page stays asset-free. Muted by default, only ever starts
 * from a click, and remembers the decision. If the browser blocks audio or the
 * visitor prefers reduced motion, the button simply stays off.
 */
export default function SiteSound() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setReady(true);
    if (window.localStorage.getItem('site-sound') === 'on') {
      // remembered, but browsers still want a gesture – show it as off until clicked
      setOn(false);
    }
  }, []);

  const build = useCallback(() => {
    const AudioCtor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtor) return null;
    const ctx: AudioContext = ctxRef.current ?? new AudioCtor();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // a low fifth, barely moving
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    filter.Q.value = 0.7;
    filter.connect(master);

    const tones = [
      { freq: 55, gain: 0.5 },
      { freq: 82.41, gain: 0.32 },
      { freq: 110.4, gain: 0.12 },
    ].map(({ freq, gain }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const amp = ctx.createGain();
      amp.gain.value = gain;
      osc.connect(amp).connect(filter);
      osc.start();
      return osc;
    });

    // tape hiss / room
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 900;
    noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.06;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();

    // slow breathing on the filter so it never feels static
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    masterRef.current = master;
    nodesRef.current = {
      stop: () => {
        tones.forEach((osc) => {
          try {
            osc.stop();
          } catch {
            /* already stopped */
          }
        });
        try {
          noise.stop();
          lfo.stop();
        } catch {
          /* already stopped */
        }
      },
    };
    return ctx;
  }, []);

  const toggle = async () => {
    if (on) {
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      }
      setOn(false);
      window.localStorage.setItem('site-sound', 'off');
      return;
    }

    const ctx = build();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    const master = masterRef.current;
    if (master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.16, ctx.currentTime, 1.4);
    }
    setOn(true);
    window.localStorage.setItem('site-sound', 'on');
  };

  useEffect(() => () => nodesRef.current?.stop(), []);

  if (!ready) return null;

  return (
    <button
      type="button"
      className={`sf-sound ${on ? 'on' : ''}`}
      onClick={toggle}
      aria-pressed={on}
      title={on ? 'Ton aus' : 'Ton an – Raumklang, sehr leise'}
    >
      <span className="sf-sound-bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sf-sound-label">{on ? 'sound on' : 'sound'}</span>
    </button>
  );
}
