'use client';

import { useEffect, useRef, useState } from 'react';
import { Game, type HudSnapshot } from '@/game/Game';
import { Hud } from './Hud';
import { Backpack } from './Backpack';
import { VirtualJoystick } from './VirtualJoystick';

/** 作业状态提示:作业中显示进度条,工具不足时显示提示文字 */
function HarvestIndicator({ hud }: { hud: HudSnapshot }) {
  if (!hud.canAct) {
    return (
      <div style={hintStyle()}>{hud.prompt}(背包中合成)</div>
    );
  }
  return (
    <div style={hintStyle()}>
      {hud.prompt}
      <div
        style={{
          width: 120,
          height: 8,
          marginTop: 6,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.round((hud.harvestProgress ?? 0) * 100)}%`,
            height: '100%',
            background: '#ffd54f',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
}

function hintStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 16px',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    borderRadius: 20,
    fontFamily: 'sans-serif',
    fontSize: 14,
    pointerEvents: 'none',
    userSelect: 'none',
  };
}

const INITIAL_HUD: HudSnapshot = {
  hunger: 100,
  thirst: 100,
  health: 100,
  dead: false,
  wood: 0,
  gravel: 0,
  stone: 0,
  berry: 0,
  axe: false,
  pickaxe: false,
  prompt: null,
  canAct: false,
  harvestProgress: null,
  clock: '12:00',
  isNight: false,
};

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [backpackOpen, setBackpackOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const game = new Game(container, setHud);
    gameRef.current = game;
    game.start();
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}
    >
      <Hud hud={hud} />
      <Backpack
        open={backpackOpen}
        onToggle={() => setBackpackOpen((v) => !v)}
        items={hud}
        onEatBerry={() => gameRef.current?.eatBerry()}
        onCraft={(id) => gameRef.current?.craftTool(id)}
      />
      {!hud.dead && (
        <VirtualJoystick onChange={(x, z) => gameRef.current?.setJoystick(x, z)} />
      )}
      {!hud.dead && hud.prompt && <HarvestIndicator hud={hud} />}
    </div>
  );
}
