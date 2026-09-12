import { useEffect, useRef, useState } from 'react';
import { loadAudioSettings } from '@/game/audio/AudioSettings';

const KEY = 'island-menu-sound';

/** Menu-only soundscape; disposal also stops all scheduled notes and noise. */
export function useMenuAudio() {
  const [enabled, setEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const bus = useRef<GainNode | null>(null);
  const enabledRef = useRef(false);
  useEffect(() => {
    try { enabledRef.current = localStorage.getItem(KEY) !== 'off'; } catch { enabledRef.current = true; }
    setEnabled(enabledRef.current);
    const visibility = () => {
      const ctx = context.current;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend().catch(() => {});
      else if (enabledRef.current) void ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      void context.current?.close().catch(() => {});
      context.current = null;
      bus.current = null;
    };
  }, []);

  const unlock = () => {
    if (!enabledRef.current) return;
    try {
      if (!context.current) {
        const ctx = new AudioContext();
        context.current = ctx;
        const master = ctx.createGain();
        master.gain.value = 0.65;
        master.connect(ctx.destination);
        bus.current = master;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const waves = ctx.createBufferSource();
        waves.buffer = buffer;
        waves.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 550;
        const volume = ctx.createGain();
        const level = loadAudioSettings().music;
        volume.gain.value = 0.12 * level;
        const tide = ctx.createOscillator();
        tide.frequency.value = 0.12;
        const depth = ctx.createGain();
        depth.gain.value = 0.08 * level;
        tide.connect(depth).connect(volume.gain);
        waves.connect(filter).connect(volume).connect(master);
        waves.start();
        tide.start();
      }
      const ctx = context.current;
      void ctx.resume().then(() => { if (context.current === ctx) setStarted(ctx.state === 'running'); }).catch(() => {});
    } catch { setStarted(false); }
  };
  const feedback = () => {
    unlock();
    const ctx = context.current;
    if (!enabledRef.current || !ctx || !bus.current) return;
    const level = loadAudioSettings().sfx;
    [523.25, 783.99].forEach((frequency, i) => {
      const note = ctx.createOscillator();
      const gain = ctx.createGain();
      const time = ctx.currentTime + i * 0.075;
      note.type = 'sine';
      note.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.085 * level, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
      note.connect(gain).connect(bus.current!);
      note.start(time);
      note.stop(time + 0.5);
      note.onended = () => { note.disconnect(); gain.disconnect(); };
    });
  };
  const toggle = () => {
    if (enabledRef.current && !started) {
      feedback();
      return;
    }
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    try { localStorage.setItem(KEY, enabledRef.current ? 'on' : 'off'); } catch { /* Optional preference. */ }
    if (enabledRef.current) feedback();
    else {
      setStarted(false);
      void context.current?.suspend().catch(() => {});
    }
  };
  return { enabled, started, unlock, feedback, toggle };
}
