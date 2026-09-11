'use client';

import type { PlayerGender } from '@/game/entities/PlayerModel';
import { useEffect, useState } from 'react';
import { BOY_MODEL_VARIANTS } from '@/game/entities/BoyModelVariants';
import { GmSystem, type GmConfig } from '@/game/systems/GmSystem';
import { MetaProgress } from '@/game/meta/MetaProgress';
import { ActionButton, StepperRow, ToggleRow } from './controls';

/** 玩家 tab:无敌/死亡开关、攻击倍率与状态回满 */
export function PlayerTab({
  gender,
  onSetGender,
  onRestoreStatus,
  onSetConfig,
}: {
  gender: PlayerGender;
  onSetGender: (gender: PlayerGender) => void;
  onRestoreStatus: () => void;
  onSetConfig: (patch: Partial<GmConfig>) => void;
}) {
  const [boyVariant, setBoyVariant] = useState(GmSystem.boyModelVariant);
  useEffect(() => {
    const timer = window.setInterval(() => setBoyVariant(GmSystem.boyModelVariant), 250);
    return () => window.clearInterval(timer);
  }, []);
  const [godMode, setGodMode] = useState(GmSystem.godMode);
  const [allowDeath, setAllowDeath] = useState(GmSystem.allowDeath);
  const [attackMultiplier, setAttackMultiplier] = useState(GmSystem.attackMultiplier);
  const [speedMultiplier, setSpeedMultiplier] = useState(GmSystem.speedMultiplier);
  const [metaPoints, setMetaPoints] = useState(MetaProgress.points());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="group" aria-label="玩家性别" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ marginRight: 'auto', color: '#4a3b2a' }}>性别</span>
        {(['boy', 'girl'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={gender === value}
            onClick={() => onSetGender(value)}
            style={{
              minHeight: 44, minWidth: 76, border: 'none', borderRadius: 10,
              background: gender === value ? '#4a3b2a' : 'rgba(0,0,0,0.06)',
              color: gender === value ? '#fff' : '#4a3b2a', fontSize: 15,
            }}
          >
            {value === 'boy' ? '男孩' : '女孩'}
          </button>
        ))}
      </div>
      <fieldset style={{ border: '1px solid #d8c9b4', borderRadius: 10, margin: 0, padding: 10 }}>
        <legend style={{ color: '#4a3b2a' }}>男孩模型对比</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {BOY_MODEL_VARIANTS.map((variant) => (
            <button key={variant.id} aria-pressed={boyVariant === variant.id}
              onClick={() => { onSetConfig({ boyModelVariant: variant.id }); setBoyVariant(variant.id); }}
              style={{ minHeight: 64, padding: 8, border: 'none', borderRadius: 8,
                background: boyVariant === variant.id ? '#4a3b2a' : 'rgba(0,0,0,0.06)',
                color: boyVariant === variant.id ? '#fff' : '#4a3b2a', textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 14 }}>{variant.label}</span>
              <span style={{ display: 'block', fontSize: 12, marginTop: 4 }}>{variant.description}</span>
            </button>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#75634e' }}>
          全房间男孩同步切换，女孩不变。建议卸下帽子和衣裤后对比；模型选择不写入存档。
        </p>
      </fieldset>
      <ToggleRow
        label="无敌模式"
        value={godMode}
        onChange={(v) => {
          onSetConfig({ godMode: v });
          setGodMode(v);
        }}
      />
      <ToggleRow
        label="允许死亡"
        value={allowDeath}
        onChange={(v) => {
          onSetConfig({ allowDeath: v });
          setAllowDeath(v);
        }}
      />
      <StepperRow
        label="攻击力倍率"
        value={attackMultiplier}
        min={0}
        onChange={(v) => {
          onSetConfig({ attackMultiplier: v });
          setAttackMultiplier(v);
        }}
      />
      <StepperRow
        label="移动速度倍率"
        value={speedMultiplier}
        min={0.1}
        step={0.5}
        onChange={(v) => {
          onSetConfig({ speedMultiplier: v });
          setSpeedMultiplier(v);
        }}
      />
      <StepperRow
        label="求生心得(局外)"
        value={metaPoints}
        step={10}
        min={0}
        onChange={(v) => {
          MetaProgress.setPoints(v);
          setMetaPoints(v);
        }}
      />
      <ActionButton label="状态回满(复活)" tone="primary" onClick={onRestoreStatus} />
    </div>
  );
}
