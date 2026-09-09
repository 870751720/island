'use client';

import { ItemIcon } from './ItemIcon';
import { useEffect, useState } from 'react';
import { ITEMS } from '@/game/systems/Items';
import type { HudSnapshot } from '@/game/GameContracts';
import { LOOM_ROPE_PER_CLOTH, LOOM_INTERVAL } from '@/game/systems/LoomSystem';
import { ConvertRow, convertOverlayStyle, convertPanelStyle, convertRowStyle, convertActionButtonStyle, convertCollectButtonStyle, convertTakeButtonStyle, convertBarStyle } from './ConvertRow';

type Props = {
  hud: HudSnapshot;
  /** 把选定数量的绳线丢进纺织机 */
  onFeed: (count: number) => void;
  /** 收取机内织好的全部布料 */
  onCollect: () => void;
  /** 取回机内还没织的绳线 */
  onTakeRope: () => void;
  onClose: () => void;
};

const ACTION_COLOR = '#b5a642';

/** 纺织机面板:机内状态与织布进度 + 数量选择投入(布局对齐烹饪台煮汤区)+ 收取/取回 */
export function LoomPanel({ hud, onFeed, onCollect, onTakeRope, onClose }: Props) {
  const info = hud.loomInfo;
  const [feedCount, setFeedCount] = useState(1);
  const ropeInBag = hud.slots.reduce(
    (sum, slot) => sum + (slot && slot.kind === 'rope' ? slot.count : 0),
    0
  );
  // 背包数量变化后把选数收回上限
  useEffect(() => {
    setFeedCount((prev) => Math.min(prev, ropeInBag));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ropeInBag]);

  // 走开后面板由外层收起,这里兜底不渲染
  if (!info) return null;
  const n = Math.max(1, Math.min(feedCount, ropeInBag));
  const weaving = info.rope >= LOOM_ROPE_PER_CLOTH;

  return (
    <div
      style={convertOverlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={convertPanelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🧵 纺织机</div>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
          每 {LOOM_INTERVAL} 秒用 {LOOM_ROPE_PER_CLOTH} 根{ITEMS.rope.name}织 1 匹{ITEMS.cloth.name}
        </div>

        <div style={{ ...convertRowStyle, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14 }}>
              <ItemIcon kind="rope" size={18} /> 机内绳线 ×{info.rope}
              <span style={{ fontSize: 11, color: weaving ? ACTION_COLOR : '#999', marginLeft: 6 }}>
                {weaving ? '纺织中' : info.rope > 0 ? `还差 ${LOOM_ROPE_PER_CLOTH - info.rope} 根开机` : ''}
              </span>
            </div>
            <div style={convertBarStyle}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(info.progress * 100)}%`,
                  background: `linear-gradient(90deg,${ACTION_COLOR},#e8e2d4)`,
                  transition: 'width 0.2s linear',
                }}
              />
            </div>
          </div>
          <ItemIcon kind="cloth" size={18} />
          <span style={{ fontSize: 14 }}>×{info.cloth}</span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onTakeRope();
            }}
            disabled={info.rope <= 0}
            style={{ ...convertTakeButtonStyle, opacity: info.rope > 0 ? 1 : 0.45 }}
          >
            取回
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.cloth <= 0}
            style={{ ...convertCollectButtonStyle, opacity: info.cloth > 0 ? 1 : 0.45 }}
          >
            收取
          </button>
        </div>

        {ropeInBag > 0 ? (
          <ConvertRow
            kind="rope"
            to="cloth"
            max={ropeInBag}
            value={n}
            onDelta={(d) => setFeedCount((prev) => Math.max(1, Math.min(prev + d, ropeInBag)))}
            actionLabel="投入"
            actionColor={ACTION_COLOR}
            onAction={() => onFeed(n)}
          />
        ) : (
          <div style={{ fontSize: 13, color: '#999' }}>
            背包里没有{ITEMS.rope.name},用工作台把植物纤维搓成绳线再回来吧
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
