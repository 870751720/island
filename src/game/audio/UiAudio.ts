import { loadAudioSettings } from './AudioSettings';

export const MENU_SOUND_KEY = 'island-menu-sound';
export type UiSound = 'click' | 'confirm';
type Note = readonly [number, number, number, number, OscillatorType, number?];

const CONFIRM: readonly Note[] = [
  [659.25, 0, 0.095, 0.18, 'triangle'],
  [987.77, 0.085, 0.23, 0.26, 'triangle'],
  [1975.54, 0.085, 0.11, 0.07, 'sine'],
  [180, 0.085, 0.10, 0.19, 'sine', 110],
];
const CLICK: readonly Note[] = [
  [523.25, 0, 0.45, 0.085 * 0.65, 'sine'],
  [783.99, 0.075, 0.45, 0.085 * 0.65, 'sine'],
];

/** 短音独立于页面生命周期；所有音符结束后释放上下文，页面切换不会截断尾音。 */
let context: AudioContext | null = null;
let pending = 0;

export function menuSoundEnabled(): boolean {
  try { return localStorage.getItem(MENU_SOUND_KEY) !== 'off'; } catch { return true; }
}

export function playUiSound(kind: UiSound = 'click', scope: 'menu' | 'game' = 'menu'): void {
  const level = loadAudioSettings().sfx;
  const enabled = () => scope === 'game' || menuSoundEnabled();
  if (!enabled() || level <= 0) return;
  try {
    const ctx = context ??= new AudioContext();
    pending++;
    const release = () => {
      pending--;
      if (pending === 0 && context === ctx) {
        context = null;
        void ctx.close().catch(() => {});
      }
    };
    void ctx.resume().then(() => {
      if (document.hidden || !enabled()) { release(); return; }
      const notes = kind === 'confirm' ? CONFIRM : CLICK;
      let remaining = notes.length;
      const start = ctx.currentTime + 0.015;
      for (const [frequency, offset, duration, peak, type, end] of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = kind === 'confirm' ? 5200 : 3200;
        const time = start + offset;
        const volume = Math.max(0.0001, peak * level);
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, time);
        if (end) osc.frequency.exponentialRampToValueAtTime(end, time + duration);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + (kind === 'confirm' ? 0.002 : 0.008));
        if (kind === 'confirm') {
          gain.gain.linearRampToValueAtTime(volume * 0.72, time + Math.min(0.035, duration * 0.3));
          gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.18), time + duration * 0.72);
        }
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        gain.gain.linearRampToValueAtTime(0, time + duration + 0.01);
        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.onended = () => {
          osc.disconnect(); filter.disconnect(); gain.disconnect();
          if (--remaining === 0) release();
        };
        osc.start(time);
        osc.stop(time + duration + 0.03);
      }
    }, release);
  } catch { /* 音频不可用时不阻断按钮行为。 */ }
}
