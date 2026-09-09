'use client';

import { ItemIcon } from './ItemIcon';
import { useEffect, useState } from 'react';
import { ITEMS } from '@/game/systems/Items';
import { BAIT_YIELD } from '@/game/systems/Food';
import { BAIT_CONVERT_INTERVAL } from '@/game/systems/BaitBarrelSystem';
import type { HudSnapshot } from '@/game/GameContracts';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ConvertRow, convertOverlayStyle, convertPanelStyle, convertRowStyle, convertListStyle, convertActionButtonStyle, convertCollectButtonStyle, convertTakeButtonStyle, convertBarStyle } from './ConvertRow';

type Props = {
  hud: HudSnapshot;
  /** 把选定数量的该种类食物丢进饵料桶 */
  onFeed: (kind: ResourceKind, count: number) => void;
  /** 收取桶内发酵好的全部鱼饵 */
  onCollect: () => void;
  /** 取回桶内还没发酵的食物 */
  onTakeFoods: () => void;
  onClose: () => void;
};

const ACTION_COLOR = '#a0742c';

/** 统计背包快照里各道具的数量 */
function countOf(hud: HudSnapshot): (kind: ResourceKind) => number {
  return (kind) =>
    hud.slots.reduce((n, slot) => (slot && slot.kind === kind ? n + slot.count : n), 0);
}

/** 饵料桶面板:桶内食物队列与发酵进度 + 数量选择投喂(布局对齐烹饪台煮汤区)+ 收取/取回 */
export function BaitBarrelPanel({ hud, onFeed, onCollect, onTakeFoods, onClose }: Props) {
  const info = hud.baitBarrelInfo;
  const count = countOf(hud);
  const [feedCounts, setFeedCounts] = useState<Record<string, number>>({});
  // 背包里可投喂的食物
  const feedable = (Object.keys(BAIT_YIELD) as ResourceKind[]).filter((k) => count(k) > 0);
  // 食物数量变化后把选数收回上限,且默认选满
  const feedKey = feedable.map((k) => count(k)).join(',');
  useEffect(() => {
    setFeedCounts((prev) => {
      const next = { ...prev };
      for (const k of feedable) next[k] = Math.min(prev[k] ?? 1, count(k));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedKey]);

  // 走开后面板由外层收起,这里兜底不渲染
  if (!info) return null;
  const hasFood = info.foods.length > 0;

  return (
    <div
      style={convertOverlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={convertPanelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🪣 饵料桶</div>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
          每 {BAIT_CONVERT_INTERVAL} 秒发酵 1 个食物,按角标兑换鱼饵
        </div>

        <div style={{ ...convertRowStyle, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {hasFood ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {info.foods.map((food, i) => (
                    <div
                      key={`${food.kind}-${i}`}
                      style={{ position: 'relative', width: 36, height: 36 }}
                    >
                      <ItemIcon kind={food.kind} size={26} />
                      <span
                        style={{
                          position: 'absolute',
                          right: -2,
                          bottom: -2,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#555',
                        }}
                      >
                        ×{food.count}
                      </span>
                      <span
                        style={{
                          position: 'absolute',
                          left: -2,
                          top: -2,
                          fontSize: 10,
                          color: ACTION_COLOR,
                          fontWeight: 700,
                        }}
                      >
                        🪱{BAIT_YIELD[food.kind]}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={convertBarStyle}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(info.progress * 100)}%`,
                      background: `linear-gradient(90deg,${ACTION_COLOR},#e6b422)`,
                      transition: 'width 0.2s linear',
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#999' }}>桶是空的,丢点吃的进来吧</div>
            )}
          </div>
          <span style={{ fontSize: 14 }}>🪱×{info.bait}</span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onTakeFoods();
            }}
            disabled={!hasFood}
            style={{ ...convertTakeButtonStyle, opacity: hasFood ? 1 : 0.45 }}
          >
            取回
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.bait <= 0}
            style={{ ...convertCollectButtonStyle, opacity: info.bait > 0 ? 1 : 0.45 }}
          >
            收取
          </button>
        </div>

        {feedable.length === 0 && (
          <div style={{ fontSize: 13, color: '#999' }}>
            背包里没有可投喂的食物({ITEMS.baitBarrel.name}不挑食,水果/鱼/肉/熟食都行)
          </div>
        )}
        <div style={convertListStyle}>
          {feedable.map((kind) => {
            const max = count(kind);
            const n = Math.min(feedCounts[kind] ?? 1, max);
            return (
              <ConvertRow
                key={kind}
                kind={kind}
                to="bait"
                hint={`→ 🪱 ${ITEMS.bait.name} ×${BAIT_YIELD[kind]}/个`}
                max={max}
                value={n}
                onDelta={(d) =>
                  setFeedCounts((c) => ({
                    ...c,
                    [kind]: Math.max(1, Math.min((c[kind] ?? 1) + d, max)),
                  }))
                }
                actionLabel="投入"
                actionColor={ACTION_COLOR}
                onAction={() => onFeed(kind, n)}
              />
            );
          })}
        </div>

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
