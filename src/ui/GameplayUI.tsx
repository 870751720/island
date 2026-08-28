'use client';

import { useEffect, useRef, useState } from 'react';
import { Game, type HudSnapshot } from '@/game/Game';
import { Hud } from './Hud';
import { Backpack } from './Backpack';
import { VirtualJoystick } from './VirtualJoystick';
import { ToolButton } from './ToolButton';
import { CraftPrompt } from './CraftPrompt';
import { EatPrompt } from './EatPrompt';
import { FishingControls } from './FishingControls';
import { DropPrompt } from './DropPrompt';
import { DeathScreen } from './DeathScreen';

const INITIAL_HUD: HudSnapshot = {
  hunger: 100,
  thirst: 100,
  health: 100,
  dead: false,
  wood: 0,
  gravel: 0,
  stone: 0,
  berry: 0,
  fiber: 0,
  rope: 0,
  slots: [],
  capacity: 10,
  axe: false,
  pickaxe: false,
  fishingrod: false,
  tool: 'hand' as const,
  craftId: null,
  craftProgress: 0,
  canCraftWorkbench: false,
  workbenchCrafting: false,
  workbenchProgress: 0,
  eatName: null,
  eatProgress: 0,
  autoEquipProgress: 0,
  canFish: false,
  fishingState: null,
  fishingProgress: 0,
  biteActive: false,
  nearDrop: null,
};

/**
 * 游戏进行中的完整 UI 与 Game 实例生命周期:
 * 挂载时创建并启动 Game,卸载时销毁;死亡后显示确认弹窗,确认则整体卸载回到开始界面。
 */
export function GameplayUI({ onExit }: { onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const game = new Game(
      container,
      setHud,
      // 头顶提示文字每帧更新,直接写 DOM 避免触发 React 重渲染
      (label, x, y) => {
        const el = labelRef.current;
        if (!el) return;
        el.style.display = label ? 'block' : 'none';
        if (label) {
          el.textContent = label;
          el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        }
      }
    );
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
      {!hud.dead && <VirtualJoystick onChange={(x, z) => gameRef.current?.setJoystick(x, z)} />}
      <Hud hud={hud} />
      <button
        aria-label="静音开关"
        onClick={() => setMuted(gameRef.current?.toggleMute() ?? false)}
        style={{
          position: 'absolute',
          top: 'max(10px, env(safe-area-inset-top))',
          right: 'max(10px, env(safe-area-inset-right))',
          width: 44,
          height: 44,
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.75)',
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <Backpack
        open={backpackOpen}
        onToggle={() => setBackpackOpen((v) => !v)}
        hud={hud}
        onUseItem={(kind) => {
          gameRef.current?.eatFood(kind);
          setBackpackOpen(false);
        }}
        onDropItem={(kind) => gameRef.current?.dropItem(kind)}
      />
      {!hud.dead && (
        <>
          {(hud.axe || hud.pickaxe || hud.fishingrod) && (
            <ToolButton
              tool={hud.tool}
              pulse={hud.autoEquipProgress > 0}
              onCycle={() => gameRef.current?.cycleTool()}
            />
          )}
          <CraftPrompt
            hud={hud}
            onCraft={(id) => gameRef.current?.craftTool(id)}
            onCraftWorkbench={() => gameRef.current?.craftWorkbench()}
          />
          <EatPrompt hud={hud} onEat={() => gameRef.current?.eatFood()} />
          <FishingControls
            hud={hud}
            onStart={() => gameRef.current?.startFishing()}
            onHook={() => gameRef.current?.hookFish()}
          />
          {!backpackOpen && (
            <DropPrompt hud={hud} onPickup={() => gameRef.current?.pickupDrop()} />
          )}
        </>
      )}
      {hud.dead && <DeathScreen onConfirm={onExit} />}
      <div
        ref={labelRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'none',
          padding: '4px 14px',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          borderRadius: 20,
          fontFamily: 'sans-serif',
          fontSize: 14,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
