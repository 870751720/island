'use client';

import { useState } from 'react';
import { DEFAULT_AUDIO_SETTINGS, loadAudioSettings } from '@/game/audio/AudioSettings';

/** 滑杆行:名称 + range input + 百分比 */
function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label
      style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: '#4a3b2a' }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#5b8a4a', height: 28 }}
      />
    </label>
  );
}

/**
 * 游戏内设置面板:音乐/音效音量(拖动即热应用并持久化),
 * 以及「返回主界面」(由外层卸载游戏回到开始界面)。
 */
export function SettingsPanel({
  onApply,
  onExit,
  onClose,
}: {
  /** 音量变化时热应用到 GameAudio 并持久化 */
  onApply: (settings: { music: number; sfx: number }) => void;
  onExit: () => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(loadAudioSettings() ?? DEFAULT_AUDIO_SETTINGS);
  const apply = (next: { music: number; sfx: number }) => {
    setSettings(next);
    onApply(next);
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(84vw, 340px)',
          padding: 20,
          background: '#fdf8ee',
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#4a3b2a' }}>设置</div>
        <SliderRow
          label="🎵 音乐"
          value={settings.music}
          onChange={(v) => apply({ ...settings, music: v })}
        />
        <SliderRow
          label="🔊 音效"
          value={settings.sfx}
          onChange={(v) => apply({ ...settings, sfx: v })}
        />
        <button
          onClick={onExit}
          style={{
            padding: '12px 0',
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            background: '#c0392b',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          返回主界面
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '10px 0',
            fontSize: 15,
            color: '#4a3b2a',
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          继续游戏
        </button>
      </div>
    </div>
  );
}
