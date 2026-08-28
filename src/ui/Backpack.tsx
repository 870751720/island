'use client';

import type { HudSnapshot } from '@/game/Game';
import { RECIPES, hasCost, type Recipe } from '@/game/systems/Crafting';

type Props = {
  open: boolean;
  onToggle: () => void;
  items: HudSnapshot;
  onEatBerry: () => void;
  onCraft: (id: 'axe' | 'pickaxe') => void;
};

const RESOURCES: { kind: 'wood' | 'gravel' | 'stone' | 'berry'; icon: string; name: string }[] = [
  { kind: 'wood', icon: '🪵', name: '木材' },
  { kind: 'gravel', icon: '🪨', name: '碎石' },
  { kind: 'stone', icon: '🪨', name: '石头' },
  { kind: 'berry', icon: '🍒', name: '浆果' },
];

function rowStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
  };
}

function actionButton(disabled: boolean, label: string, onPress: () => void): React.ReactNode {
  return (
    <button
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      style={{
        padding: '6px 14px',
        borderRadius: 8,
        border: 'none',
        background: disabled ? '#bbb' : '#4caf50',
        color: '#fff',
        fontSize: 14,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  );
}

export function Backpack({ open, onToggle, items, onEatBerry, onCraft }: Props) {
  return (
    <>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onToggle();
        }}
        style={{
          position: 'absolute',
          top: 'max(10px, env(safe-area-inset-top))',
          right: 'max(10px, env(safe-area-inset-right))',
          width: 48,
          height: 48,
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.75)',
          fontSize: 24,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        🎒
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'max(66px, calc(env(safe-area-inset-top) + 56px))',
            right: 'max(10px, env(safe-area-inset-right))',
            width: 'min(78vw, 280px)',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 12,
            fontFamily: 'sans-serif',
            fontSize: 15,
            color: '#333',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>背包</div>
          {RESOURCES.map(({ kind, icon, name }) => (
            <div key={kind} style={rowStyle()}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ flex: 1 }}>{name}</span>
              <span>× {items[kind]}</span>
              {kind === 'berry' &&
                actionButton(items.berry <= 0, '吃', onEatBerry)}
            </div>
          ))}
          <div style={{ fontWeight: 700, margin: '10px 0 4px' }}>合成</div>
          {RECIPES.map((recipe: Recipe) => {
            const owned = items[recipe.id];
            return (
              <div key={recipe.id} style={rowStyle()}>
                <span style={{ fontSize: 20 }}>{recipe.icon}</span>
                <span style={{ flex: 1 }}>{recipe.name}</span>
                {owned ? (
                  <span style={{ color: '#4caf50', fontWeight: 700 }}>已拥有</span>
                ) : (
                  actionButton(
                    !hasCost(recipe.cost, items),
                    Object.entries(recipe.cost)
                      .map(([k, n]) => `${n}${k === 'wood' ? '木' : '碎'} `)
                      .join(''),
                    () => onCraft(recipe.id)
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
