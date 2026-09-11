'use client';

import { useState } from 'react';
import type { Game } from '@/game/Game';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { ActionButton, ToggleRow } from './controls';
import { usePerformanceReport } from './PerformanceOverlay';

/** 季节五态标签:auto=跟随真实季节(默认),其余为强制覆盖 */
const SEASON_LABELS = { auto: '🔁 跟随', spring: '🌸 春', summer: '☀️ 夏', autumn: '🍂 秋', winter: '❄️ 冬' } as const;

/** 天气四态标签 */
const WEATHER_LABELS = { sunny: '☀️ 晴天', wind: '🌬️ 刮风', rain: '🌧️ 雨天', snow: '🌨️ 雪天' } as const;

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
  onSetWeather: (type: 'sunny' | 'wind' | 'rain' | 'snow') => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [lockTime, setLockTime] = useState<number | null>(GmSystem.lockTime);
  const [showFps, setShowFps] = useState(GmSystem.showFps);
  const [showTraffic, setShowTraffic] = useState(GmSystem.showTraffic);
  const [season, setSeason] = useState(GmSystem.season);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#8a7a5a', padding: '0 4px' }}>季节(跟随真实季节 / 强制覆盖)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(['auto', 'spring', 'summer', 'autumn', 'winter'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                onSetConfig({ season: s });
                setSeason(s);
              }}
              style={{ ...presetStyle, background: season === s ? '#a8823f' : '#8a6f4b' }}
            >
              {SEASON_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
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
          {(['sunny', 'wind', 'rain', 'snow'] as const).map((w) => (
            <ActionButton key={w} label={WEATHER_LABELS[w]} onClick={() => onSetWeather(w)} />
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
