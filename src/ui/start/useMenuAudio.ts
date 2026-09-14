import { useEffect, useRef, useState } from 'react';
import { loadAudioSettings } from '@/game/audio/AudioSettings';

import { MENU_SOUND_KEY, menuSoundEnabled, playUiSound } from '@/game/audio/UiAudio';

/** 开始界面海浪随页面销毁；按钮短音使用独立生命周期。 */
export function useMenuAudio() {
  const [enabled, setEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const enabledRef = useRef(false);
  useEffect(() => {
    enabledRef.current = menuSoundEnabled();
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
    playUiSound();
  };
  const toggle = () => {
    if (enabledRef.current && !started) {
      feedback();
      return;
    }
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    try { localStorage.setItem(MENU_SOUND_KEY, enabledRef.current ? 'on' : 'off'); } catch { /* Optional preference. */ }
    if (enabledRef.current) feedback();
    else {
      setStarted(false);
      void context.current?.suspend().catch(() => {});
    }
  };
  return { enabled, started, unlock, toggle };
}
