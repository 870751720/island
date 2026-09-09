'use client';

import { ItemIcon } from './ItemIcon';
import { useEffect, useState } from 'react';
import { ITEMS } from '@/game/systems/Items';
import type { HudSnapshot } from '@/game/GameContracts';
import { SMELT_ORE_PER_INGOT, SMELT_INTERVAL } from '@/game/systems/SmelterSystem';
import { ConvertRow, convertOverlayStyle, convertPanelStyle, convertRowStyle, convertActionButtonStyle, convertCollectButtonStyle, convertTakeButtonStyle, convertBarStyle } from './ConvertRow';

type Props = {
  hud: HudSnapshot;
  /** 把选定数量的铁矿石丢进冶炼炉 */
  onFeed: (count: number) => void;
  /** 收取炉内炼好的全部铁锭 */
  onCollect: () => void;
  /** 取回炉内还没炼的矿石 */
  onTakeOre: () => void;
  onClose: () => void;
};

const ACTION_COLOR = '#c0392b';

/** 冶炼炉面板:炉内状态与冶炼进度 + 数量选择投入(布局对齐烹饪台煮汤区)+ 收取/取回 */
export function SmelterPanel({ hud, onFeed, onCollect, onTakeOre, onClose }: Props) {
  const info = hud.smelterInfo;
  const [feedCount, setFeedCount] = useState(1);
  const oreInBag = hud.slots.reduce(
    (sum, slot) => sum + (slot && slot.kind === 'ironOre' ? slot.count : 0),
    0
  );
  // 背包数量变化后把选数收回上限
  useEffect(() => {
    setFeedCount((prev) => Math.min(prev, oreInBag));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oreInBag]);

  // 走开后面板由外层收起,这里兜底不渲染
  if (!info) return null;
  const n = Math.max(1, Math.min(feedCount, oreInBag));
  const smelting = info.ore >= SMELT_ORE_PER_INGOT;

  return (
    <div
      style={convertOverlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={convertPanelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🏭 冶炼炉</div>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
          每 {SMELT_INTERVAL} 秒用 {SMELT_ORE_PER_INGOT} 块{ITEMS.ironOre.name}炼 1 块
          {ITEMS.ironIngot.name}
        </div>

        <div style={{ ...convertRowStyle, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14 }}>
              <ItemIcon kind="ironOre" size={18} /> 炉内矿石 ×{info.ore}
              <span style={{ fontSize: 11, color: smelting ? ACTION_COLOR : '#999', marginLeft: 6 }}>
                {smelting ? '冶炼中' : info.ore > 0 ? `还差 ${SMELT_ORE_PER_INGOT - info.ore} 块开炉` : ''}
              </span>
            </div>
            <div style={convertBarStyle}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(info.progress * 100)}%`,
                  background: `linear-gradient(90deg,${ACTION_COLOR},#e8703a)`,
                  transition: 'width 0.2s linear',
                }}
              />
            </div>
          </div>
          <ItemIcon kind="ironIngot" size={18} />
          <span style={{ fontSize: 14 }}>×{info.ingot}</span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onTakeOre();
            }}
            disabled={info.ore <= 0}
            style={{ ...convertTakeButtonStyle, opacity: info.ore > 0 ? 1 : 0.45 }}
          >
            取回
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.ingot <= 0}
            style={{ ...convertCollectButtonStyle, opacity: info.ingot > 0 ? 1 : 0.45 }}
          >
            收取
          </button>
        </div>

        {oreInBag > 0 ? (
          <ConvertRow
            kind="ironOre"
            to="ironIngot"
            max={oreInBag}
            value={n}
            onDelta={(d) => setFeedCount((prev) => Math.max(1, Math.min(prev + d, oreInBag)))}
            actionLabel="投入"
            actionColor={ACTION_COLOR}
            onAction={() => onFeed(n)}
          />
        ) : (
          <div style={{ fontSize: 13, color: '#999' }}>
            背包里没有{ITEMS.ironOre.name},去北岛的铁矿或陨石里挖些回来吧
          </div>
        )}

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{ ...convertActionButtonStyle('#4caf50'), marginTop: 16, width: '100%' }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
