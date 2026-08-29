'use client';

import { useEffect, useRef, useState } from 'react';
import { Game, type HudSnapshot } from '@/game/Game';
import { Hud } from './Hud';
import { Backpack } from './Backpack';
import { VirtualJoystick } from './VirtualJoystick';
import { ToolButton } from './ToolButton';
import { CraftPrompt } from './CraftPrompt';
import { WorkbenchPanel } from './WorkbenchPanel';
import { CampfirePanel } from './CampfirePanel';
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
  stone: 0,
  berry: 0,
  fiber: 0,
  rope: 0,
  arrow: 0,
  slots: [],
  capacity: 10,
  axe: false,
  pickaxe: false,
  fishingrod: false,
  bow: false,
  tool: 'hand' as const,
  craftId: null,
  craftProgress: 0,
  canCraftWorkbench: false,
  workbenchCrafting: false,
  workbenchProgress: 0,
  nearWorkbench: false,
  canCraftCampfire: false,
  campfireCrafting: false,
  campfireProgress: 0,
  nearCampfire: false,
  campfireInfo: null,
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
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [campfireOpen, setCampfireOpen] = useState(false);
  const mumbleRef = useRef<HTMLDivElement>(null);

  // 离开工作台/火堆范围自动收起对应面板
  useEffect(() => {
    if (!hud.nearWorkbench) setWorkbenchOpen(false);
  }, [hud.nearWorkbench]);
  useEffect(() => {
    if (!hud.nearCampfire) setCampfireOpen(false);
  }, [hud.nearCampfire]);
  // 死亡后关闭所有弹出的面板
  useEffect(() => {
    if (hud.dead) {
      setBackpackOpen(false);
      setWorkbenchOpen(false);
      setCampfireOpen(false);
    }
  }, [hud.dead]);

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
      },
      // 自言自语气泡同样每帧直写 DOM,挂在角色头顶
      (text, x, y) => {
        const el = mumbleRef.current;
        if (!el) return;
        el.style.display = text ? 'block' : 'none';
        if (text) {
          el.textContent = text;
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
      <Backpack
        open={backpackOpen}
        onToggle={() => setBackpackOpen((v) => !v)}
        hud={hud}
        onUseItem={(kind) => {
          gameRef.current?.eatFood(kind);
          setBackpackOpen(false);
        }}
        onDropItem={(kind) => gameRef.current?.dropItem(kind)}
        onCraft={(id) => {
          if (gameRef.current?.craftTool(id)) setBackpackOpen(false);
        }}
      />
      {!hud.dead && (
        <>
          {(hud.axe ||
            hud.pickaxe ||
            hud.fishingrod ||
            hud.bow ||
            hud.nearWorkbench ||
            hud.nearCampfire) && (
            <ToolButton
              tool={hud.tool}
              pulse={hud.autoEquipProgress > 0}
              workbench={hud.nearWorkbench && hud.craftId === null}
              campfire={hud.nearCampfire && !hud.nearWorkbench && hud.craftId === null}
              arrowCount={hud.arrow}
              onCycle={() => gameRef.current?.cycleTool()}
              onWorkbench={() => setWorkbenchOpen(true)}
              onCampfire={() => setCampfireOpen(true)}
            />
          )}
          {workbenchOpen && (
            <WorkbenchPanel
              hud={hud}
              onCraft={(id, count) => {
                if (gameRef.current?.craftAtWorkbench(id, count)) setWorkbenchOpen(false);
              }}
              onClose={() => setWorkbenchOpen(false)}
            />
          )}
          {campfireOpen && hud.nearCampfire && (
            <CampfirePanel
              hud={hud}
              onAddFuel={(kind) => gameRef.current?.campfireAddFuel(kind)}
              onCook={(kind, count) => {
                gameRef.current?.campfireCook(kind, count);
                setCampfireOpen(false);
              }}
              onClose={() => setCampfireOpen(false)}
            />
          )}
          <CraftPrompt
            hud={hud}
            onCraft={(id) => gameRef.current?.craftTool(id)}
            onCraftWorkbench={() => gameRef.current?.craftWorkbench()}
            onCraftCampfire={() => gameRef.current?.craftCampfire()}
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
      <div
        ref={mumbleRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'none',
          maxWidth: '60vw',
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.94)',
          color: '#4a3b2a',
          borderRadius: 14,
          fontFamily: 'sans-serif',
          fontSize: 14,
          lineHeight: 1.4,
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          userSelect: 'none',
          // 气泡小尾巴
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 55% 100%, 50% calc(100% + 6px), 45% 100%, 0 100%)',
        }}
      />
    </div>
  );
}
