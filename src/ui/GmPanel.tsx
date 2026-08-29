'use client';

import { useState } from 'react';
import { GmSystem } from '@/game/systems/GmSystem';

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        width: '100%',
        minHeight: 48,
        padding: '10px 14px',
        border: 'none',
        borderRadius: 10,
        background: 'rgba(0,0,0,0.06)',
        fontFamily: 'sans-serif',
        fontSize: 15,
        color: '#4a3b2a',
        cursor: 'pointer',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          minWidth: 46,
          padding: '4px 10px',
          borderRadius: 999,
          background: value ? '#3aa76d' : '#b0a89e',
          color: '#fff',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {value ? '开启' : '关闭'}
      </span>
    </button>
  );
}

/** 钓鱼档位名称(GM 面板概率权重用) */
const TIER_NAMES = ['杂物', '普通鱼', '大鱼', '珍宝'];

/** GM 面板:调试开关,直接读写 GmSystem 内存态 */
export function GmPanel({ onClose, onGrantRod }: { onClose: () => void; onGrantRod: () => void }) {
  const [allowDeath, setAllowDeath] = useState(GmSystem.allowDeath);
  const [lockDaytime, setLockDaytime] = useState(GmSystem.lockDaytime);
  const [weights, setWeights] = useState<number[]>([...GmSystem.fishingTierWeights]);

  const setWeight = (i: number, v: number) => {
    const next = weights.map((w, j) => (j === i ? v : w));
    GmSystem.fishingTierWeights = next;
    setWeights(next);
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
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(320px, 86vw)',
          padding: 20,
        background: '#faf6ef',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        fontFamily: 'sans-serif',
        }}
      >
        <div style={{ marginBottom: 16, textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#4a3b2a' }}>
          GM 面板
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ToggleRow
            label="允许死亡"
            value={allowDeath}
            onChange={(v) => {
              GmSystem.allowDeath = v;
              setAllowDeath(v);
            }}
          />
          <ToggleRow
            label="锁定白天"
            value={lockDaytime}
            onChange={(v) => {
              GmSystem.lockDaytime = v;
              setLockDaytime(v);
            }}
          />
        </div>
        <div style={{ marginTop: 18, marginBottom: 6, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#4a3b2a' }}>
          钓鱼
        </div>
        <button onClick={onGrantRod} style={{ ...rowButtonStyle, background: '#3aa76d' }}>
          发放鱼竿 ×1
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {TIER_NAMES.map((name, i) => (
            <div key={name} style={weightRowStyle}>
              <span>{name}权重</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setWeight(i, Math.max(0, weights[i] - 5))} style={stepStyle}>
                  −
                </button>
                <span style={{ minWidth: 34, textAlign: 'center', fontWeight: 600 }}>{weights[i]}</span>
                <button onClick={() => setWeight(i, weights[i] + 5)} style={stepStyle}>
                  +
                </button>
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            minHeight: 44,
            border: 'none',
            borderRadius: 10,
            background: '#8a6f4b',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}

const rowButtonStyle = {
  width: '100%',
  minHeight: 44,
  border: 'none',
  borderRadius: 10,
  background: '#8a6f4b',
  color: '#fff',
  fontFamily: 'sans-serif',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const weightRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  padding: '6px 14px',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.06)',
  fontSize: 14,
  color: '#4a3b2a',
  fontFamily: 'sans-serif',
} as const;

const stepStyle = {
  width: 36,
  height: 36,
  border: 'none',
  borderRadius: 8,
  background: '#8a6f4b',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
} as const;
