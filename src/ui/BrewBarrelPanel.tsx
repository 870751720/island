'use client';

import { ItemIcon } from './ItemIcon';
import { useEffect, useState } from 'react';
import { ITEMS } from '@/game/systems/Items';
import { BREWABLE, BREW_COST, BREW_INTERVAL } from '@/game/systems/Wine';
import type { HudSnapshot } from '@/game/Game';
import type { ResourceKind } from '@/game/systems/Inventory';
import { ConvertRow, convertOverlayStyle, convertPanelStyle, convertRowStyle, convertListStyle, convertActionButtonStyle, convertCollectButtonStyle, convertTakeButtonStyle, convertBarStyle } from './ConvertRow';

type Props = {
  hud: HudSnapshot;
  /** 把选定数量的该种类原料丢进酿酒桶 */
  onFeed: (kind: ResourceKind, count: number) => void;
  /** 收取桶里酿好的全部酒 */
  onCollect: () => void;
  /** 取回桶里还没发酵的原料 */
  onTakeRaw: () => void;
  onClose: () => void;
};

const ACTION_COLOR = '#8e3a52';

/** 统计背包快照里各道具的数量 */
function countOf(hud: HudSnapshot): (kind: ResourceKind) => number {
  return (kind) =>
    hud.slots.reduce((n, slot) => (slot && slot.kind === kind ? n + slot.count : n), 0);
}

/** 酿酒桶面板:桶内酒种/剩余原料/发酵进度 + 数量选择投料(布局对齐烹饪台煮汤区)+ 收取/取回 */
export function BrewBarrelPanel({ hud, onFeed, onCollect, onTakeRaw, onClose }: Props) {
  const info = hud.brewBarrelInfo;
  const count = countOf(hud);
  const [feedCounts, setFeedCounts] = useState<Record<string, number>>({});
  // 背包里可酿酒的原料
  const feedable = (Object.keys(BREWABLE) as ResourceKind[]).filter((k) => count(k) > 0);
  // 原料数量变化后把选数收回上限,且默认选满
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
  // 桶被占用时只接受同种原料,异种置灰
  const locked = info.kind !== null && (info.rawLeft > 0 || info.bottles > 0);

  return (
    <div
      style={convertOverlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={convertPanelStyle}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🍺 酿酒桶</div>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
          每 {BREW_INTERVAL} 秒用 {BREW_COST} 个原料酿 1 瓶酒,一次只酿一种
        </div>

        <div style={{ ...convertRowStyle, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {info.kind !== null ? (
              <>
                <div style={{ fontSize: 14 }}>
                  <ItemIcon kind={info.kind} size={18} /> {ITEMS[info.kind].name} ×{info.rawLeft} 待发酵
                </div>
                <div style={convertBarStyle}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(info.progress * 100)}%`,
                      background: `linear-gradient(90deg,${ACTION_COLOR},#b0496b)`,
                      transition: 'width 0.2s linear',
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#999' }}>桶是空的,丢点原料进来吧</div>
            )}
          </div>
          {info.kind !== null && (
            <>
              <ItemIcon kind={BREWABLE[info.kind]!} size={18} />
              <span style={{ fontSize: 14 }}>×{info.bottles}</span>
            </>
          )}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onTakeRaw();
            }}
            disabled={info.rawLeft <= 0}
            style={{ ...convertTakeButtonStyle, opacity: info.rawLeft > 0 ? 1 : 0.45 }}
          >
            取回
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onCollect();
            }}
            disabled={info.bottles <= 0}
            style={{ ...convertCollectButtonStyle, opacity: info.bottles > 0 ? 1 : 0.45 }}
          >
            收取
          </button>
        </div>

        {feedable.length === 0 && (
          <div style={{ fontSize: 13, color: '#999' }}>
            背包里没有可酿酒的原料({ITEMS.brewBarrel.name}只收浆果/苹果/羊奶/黄金鱼)
          </div>
        )}
        <div style={convertListStyle}>
          {feedable.map((kind) => {
            const max = count(kind);
            const n = Math.min(feedCounts[kind] ?? 1, max);
            const clickable = !locked || kind === info.kind;
            return (
              <div key={kind} style={{ opacity: clickable ? 1 : 0.35 }}>
                <ConvertRow
                  kind={kind}
                  to={BREWABLE[kind]!}
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
                  disabled={!clickable}
                  onAction={() => onFeed(kind, n)}
                />
              </div>
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
