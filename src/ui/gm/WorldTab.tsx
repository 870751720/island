'use client';

import { useState } from 'react';
import type { Game } from '@/game/Game';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, ToggleRow } from './controls';
import { usePerformanceReport } from './PerformanceOverlay';

/** 风表现三态标签:auto 走自然概率,on/off 强制 */
const WIND_LABELS = { auto: '🍃 自动', on: '🌬️ 强制风', off: '🚫 无风' } as const;

/** 昼夜时刻预设:t∈[0,1),按太阳高度取白天正午/黄昏/深夜/清晨 */
const TIME_PRESETS: { label: string; t: number }[] = [
  { label: '☀️ 正午', t: 0.25 },
  { label: '🌇 黄昏', t: 0.48 },
  { label: '🌙 午夜', t: 0.75 },
  { label: '🌅 清晨', t: 0.97 },
];

/** 世界 tab:时刻锁定与强制天气 */
export function WorldTab({
  getGame,
  onSetDay,
  onSetWeather,
  onSetConfig,
}: {
  getGame: () => Game | null;
  onSetDay: (day: number) => void;
  onSetWeather: (type: 'sunny' | 'rain' | 'snow') => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [lockTime, setLockTime] = useState<number | null>(GmSystem.lockTime);
  const [wind, setWind] = useState(GmSystem.wind);
  const [showFps, setShowFps] = useState(GmSystem.showFps);
  const [showTraffic, setShowTraffic] = useState(GmSystem.showTraffic);
  const [snowPreview, setSnowPreview] = useState(GmSystem.snowPreview);
  const [dayInput, setDayInput] = useState('');
  const perf = usePerformanceReport(getGame);

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
        label="显示网络流量与延迟"
        value={showTraffic}
        onChange={(v) => {
          onSetConfig({ showTraffic: v });
          setShowTraffic(v);
        }}
      />
      <ToggleRow
        label="本机性能诊断"
        value={perf.enabled}
        onChange={(v) => getGame()?.gmPerformance(v)}
      />
      <ToggleRow
        label="雪季预览（地形植被覆雪）"
        value={snowPreview}
        onChange={(v) => {
          onSetConfig({ snowPreview: v });
          setSnowPreview(v);
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>锁定时刻(再次点击解锁)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TIME_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                const next = lockTime === p.t ? null : p.t;
                onSetConfig({ lockTime: next });
                setLockTime(next);
              }}
              style={{ ...presetStyle, background: lockTime === p.t ? '#a8823f' : '#8a6f4b' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>设置当前天数</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="number"
            min={1}
            placeholder="天数"
            value={dayInput}
            onChange={(e) => setDayInput(e.target.value)}
            style={dayInputStyle}
          />
          <ActionButton
            label="应用"
            onClick={() => {
              const d = Math.floor(Number(dayInput));
              if (d >= 1) onSetDay(d);
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>强制天气</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <ActionButton label="☀️ 晴天" onClick={() => onSetWeather('sunny')} />
          <ActionButton label="🌧️ 雨天" onClick={() => onSetWeather('rain')} />
          <ActionButton label="🌨️ 雪天" onClick={() => onSetWeather('snow')} />
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

const dayInputStyle = {
  flex: 1,
  minHeight: 44,
  padding: '0 10px',
  border: 'none',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.08)',
  color: '#4a3b2a',
  fontFamily: 'sans-serif',
  fontSize: 14,
} as const;
