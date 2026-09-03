'use client';

import { useState } from 'react';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, ToggleRow } from './controls';

/** 风表现三态标签:auto 走自然概率,on/off 强制 */
const WIND_LABELS = { auto: '🍃 自动', on: '🌬️ 强制风', off: '🚫 无风' } as const;

/** 昼夜时刻预设:t∈[0,1),按太阳高度取白天正午/黄昏/深夜/清晨 */
const TIME_PRESETS: { label: string; t: number }[] = [
  { label: '☀️ 正午', t: 0.25 },
  { label: '🌇 黄昏', t: 0.48 },
  { label: '🌙 午夜', t: 0.75 },
  { label: '🌅 清晨', t: 0.97 },
];

/** 世界 tab:昼夜锁定/跳转与强制天气 */
export function WorldTab({
  onSetTime,
  onSetWeather,
  onSetConfig,
}: {
  onSetTime: (t: number) => void;
  onSetWeather: (type: 'sunny' | 'rain') => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [lockDaytime, setLockDaytime] = useState(GmSystem.lockDaytime);
  const [lockNighttime, setLockNighttime] = useState(GmSystem.lockNighttime);
  const [wind, setWind] = useState(GmSystem.wind);
  const [showFps, setShowFps] = useState(GmSystem.showFps);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ToggleRow
        label="显示帧率"
        value={showFps}
        onChange={(v) => {
          onSetConfig({ showFps: v });
          setShowFps(v);
        }}
      />
      <ToggleRow
        label="锁定白天"
        value={lockDaytime}
        onChange={(v) => {
          onSetConfig({ lockDaytime: v });
          setLockDaytime(v);
          if (v) setLockNighttime(false);
        }}
      />
      <ToggleRow
        label="锁定夜晚"
        value={lockNighttime}
        onChange={(v) => {
          onSetConfig({ lockNighttime: v });
          setLockNighttime(v);
          if (v) setLockDaytime(false);
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>跳转时刻(会解除锁定)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TIME_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                onSetConfig({ lockDaytime: false, lockNighttime: false });
                setLockDaytime(false);
                setLockNighttime(false);
                onSetTime(p.t);
              }}
              style={presetStyle}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>强制天气</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <ActionButton label="☀️ 晴天" onClick={() => onSetWeather('sunny')} />
          <ActionButton label="🌧️ 雨天" onClick={() => onSetWeather('rain')} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>风表现</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['auto', 'on', 'off'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                onSetConfig({ wind: mode });
                setWind(mode);
              }}
              style={{ ...presetStyle, background: wind === mode ? '#a8823f' : '#8a6f4b' }}
            >
              {WIND_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const presetStyle = {
  flex: 1,
  minHeight: 44,
  border: 'none',
  borderRadius: 10,
  background: '#8a6f4b',
  color: '#fff',
  fontFamily: 'sans-serif',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;
