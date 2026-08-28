/** 音量设置(0~1),持久化到 localStorage,开始界面的设置区读写 */
export type AudioSettings = {
  music: number;
  sfx: number;
};

const KEY = 'island-audio-settings';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { music: 0.6, sfx: 0.9 };

export function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      music: clamp01(parsed.music, DEFAULT_AUDIO_SETTINGS.music),
      sfx: clamp01(parsed.sfx, DEFAULT_AUDIO_SETTINGS.sfx),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 隐私模式等场景下写入失败即可,不影响游戏
  }
}

function clamp01(v: unknown, fallback: number): number {
  return typeof v === 'number' && v >= 0 && v <= 1 ? v : fallback;
}
