'use client';

import { ItemIcon } from './ItemIcon';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { HudSnapshot } from '@/game/Game';
import {
  RECIPES,
  hasCost,
  maxCraftCount,
  recipeIconKind,
  recipeIconLevel,
  recipeVisible,
  workbenchUpgradeCost,
  type CraftId,
  type Recipe,
} from '@/game/systems/Crafting';
import { RecipeBook } from './RecipeBook';
import { costLabel } from './materials';

/** 工作台制作面板:列出所有工作台配方,可调数量,确认后关闭面板并开始排队制作;材料够时可升级工作台 */
export function WorkbenchPanel({
  hud,
  onCraft,
  onUpgrade,
  onClose,
}: {
  hud: HudSnapshot;
  onCraft: (id: CraftId, count: number) => void;
  onUpgrade: () => boolean;
  onClose: () => void;
}) {
  // 只列出当前能制作的配方(材料齐、工具未拥有、装备评分高于身上这件、工作台等级足够),做不出的不占位置
  const recipes = RECIPES.filter(
    (r) =>
      r.station === 'workbench' &&
      (r.minBenchLevel ?? 1) <= hud.workbenchLevel &&
      recipeVisible(r, hud, toolsOf(hud), hud.equipped, hud.slots)
  );
  const [bookOpen, setBookOpen] = useState(false);
  // 升级到下一级的材料表与现有存量(材料不足时提示还缺什么)
  const upgradeCost = workbenchUpgradeCost(hud.workbenchLevel);
  const upgradeCounts = {
    fur: hud.fur,
    stone: hud.stone,
    wood: hud.wood,
    rope: hud.rope,
    adventureBook: hud.adventureBook,
  };
  const upgradeReady = hasCost(upgradeCost, upgradeCounts);
  const [upgradeHint, setUpgradeHint] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(recipes.map((r) => [r.id, 1]))
  );

  // 材料变化后把超出可制作上限的数量收回来
  useEffect(() => {
    setCounts((prev) => {
      const next = { ...prev };
      for (const r of recipes) {
        const max = maxCount(r, hud);
        if ((next[r.id] ?? 1) > max) next[r.id] = max;
      }
      return next;
    });
  }, [hud.wood, hud.log, hud.stone, hud.fiber, hud.rope, hud.fur, hud.bed1, hud.bed2, hud.hasFishingrod, hud.hasBow]);

  return (
    <div
      style={overlayStyle}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>
            🛠️ 工作台 Lv.{hud.workbenchLevel}
          </span>
          <button
            style={bookButtonStyle}
            onPointerDown={(e) => {
              e.preventDefault();
              setBookOpen(true);
            }}
          >
            📖 合成图鉴
          </button>
        </div>
        <div style={listStyle}>
          {recipes.length === 0 && (
            <div style={{ fontSize: 13, color: '#999', padding: '6px 0' }}>
              材料还不够,先去收集吧
            </div>
          )}
          {recipes.map((r) => {
            const max = maxCount(r, hud);
            const count = Math.min(counts[r.id] ?? 1, max);
            const ownedTools = toolsOf(hud);
            return (
              <div key={r.id} style={rowStyle}>
                <ItemIcon kind={recipeIconKind(r)} level={recipeIconLevel(r)} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {costLabel(r.cost)}
                    {r.output && count > 1 ? ` ×${count}` : ''}
                  </div>
                </div>
                {r.output && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      style={stepButtonStyle}
                      disabled={count <= 1}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setCounts((c) => ({ ...c, [r.id]: Math.max(1, count - 1) }));
                      }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>
                      {count}
                    </span>
                    <button
                      style={stepButtonStyle}
                      disabled={count >= max}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setCounts((c) => ({ ...c, [r.id]: Math.min(max, count + 1) }));
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
                <button
                  style={craftButtonStyle(max > 0)}
                  disabled={max === 0}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (max > 0) onCraft(r.id, Math.max(1, count));
                  }}
                >
                  {max === 0
                    ? r.tool && ownedTools[r.tool]
                      ? '已拥有'
                      : '材料不足'
                    : '制作'}
                </button>
              </div>
            );
          })}
        </div>
        {hud.workbenchLevel > 0 && hud.workbenchLevel < 4 && (
          <div style={{ ...rowStyle, marginTop: 10, background: 'rgba(76,175,80,0.08)' }}>
            <span style={{ fontSize: 26 }}>⬆️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>升级到 Lv.{hud.workbenchLevel + 1}</div>
              <div style={{ fontSize: 12, color: upgradeHint ? '#c62828' : '#888' }}>
                {upgradeHint ?? costLabel(upgradeCost)}
              </div>
            </div>
            <button
              style={craftButtonStyle(upgradeReady)}
              onPointerDown={(e) => {
                e.preventDefault();
                if (upgradeReady) {
                  if (onUpgrade()) onClose();
                } else {
                  setUpgradeHint(
                    `还缺:${costLabel(
                      Object.fromEntries(
                        Object.entries(upgradeCost).map(([kind, n]) => [
                          kind,
                          Math.max((n ?? 0) - upgradeCounts[kind as keyof typeof upgradeCounts], 0),
                        ])
                      )
                    )}`
                  );
                }
              }}
            >
              {upgradeReady ? '升级' : '材料不足'}
            </button>
          </div>
        )}
        <button style={closeButtonStyle} onPointerDown={(e) => { e.preventDefault(); onClose(); }}>
          关闭
        </button>
      </div>
      {bookOpen && <RecipeBook onClose={() => setBookOpen(false)} />}
    </div>
  );
}

function toolsOf(hud: HudSnapshot) {
  return hud.toolTiers;
}

function maxCount(recipe: Recipe, hud: HudSnapshot): number {
  return maxCraftCount(recipe, hud, toolsOf(hud));
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
};

const panelStyle: CSSProperties = {
  width: 'min(92vw, 400px)',
  padding: '16px 14px',
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 14,
  fontFamily: 'sans-serif',
  fontSize: 15,
  color: '#333',
  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

// 配方列表内部滚动:高度上限按至少露出 6 行(约 60px/行 + 10px 间距)取值
const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  maxHeight: 'max(416px, 60vh)',
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.8)',
};

const stepButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(0,0,0,0.08)',
  fontSize: 20,
  lineHeight: 1,
  touchAction: 'none',
  userSelect: 'none',
};

const craftButtonStyle = (enabled: boolean): CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  background: enabled ? '#4caf50' : '#bbb',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  touchAction: 'none',
  userSelect: 'none',
});

const closeButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '10px 0',
  borderRadius: 10,
  border: 'none',
  background: 'rgba(0,0,0,0.1)',
  fontSize: 15,
  touchAction: 'none',
  userSelect: 'none',
};

const bookButtonStyle: CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'rgba(0,0,0,0.08)',
  color: '#666',
  fontSize: 13,
  fontWeight: 700,
  touchAction: 'none',
  userSelect: 'none',
};
