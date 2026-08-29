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

/** GM 面板:调试开关,直接读写 GmSystem 内存态 */
export function GmPanel({ onClose }: { onClose: () => void }) {
  const [allowDeath, setAllowDeath] = useState(GmSystem.allowDeath);
  const [lockDaytime, setLockDaytime] = useState(GmSystem.lockDaytime);

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
