'use client';

import { useEffect, useRef, useState } from 'react';
import { Game, type HudSnapshot, type PickupToast } from '@/game/Game';
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
import { GmPanel } from './gm/GmPanel';
import { BottleMessage } from './BottleMessage';

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
  hasAxe: false,
  hasPickaxe: false,
  hasFishingrod: false,
  hasBow: false,
  hasSeed: false,
  equipped: { clothing: null, pants: null, hat: null, backpack: null },
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
  biteClicks: 0,
  biteNeed: 1,
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
  // 拾取飘字:入包时在玩家头顶飘出图标与数量,动画结束后自动移除
  const pickupIdRef = useRef(0);
  const [pickups, setPickups] = useState<(PickupToast & { id: number })[]>([]);
  const [gmOpen, setGmOpen] = useState(false);
  // 瓶中信:拔开漂流瓶后弹出的留言,关闭后清空
  const [bottleMsg, setBottleMsg] = useState<string | null>(null);
  // 连续 5 次点击红心(2 秒内)打开 GM 面板
  const heartTapsRef = useRef<number[]>([]);
  const handleHeartTap = () => {
    const now = performance.now();
    const taps = heartTapsRef.current.filter((t) => now - t < 2000);
    taps.push(now);
    heartTapsRef.current = taps;
    if (taps.length >= 5) {
      heartTapsRef.current = [];
      setGmOpen(true);
    }
  };

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
      // 头顶提示文字每帧更新,直接写 DOM 避免触发 React 重渲染(预告彩字带颜色)
      (label: string | null, x: number, y: number, color?: string) => {
        const el = labelRef.current;
        if (!el) return;
        el.style.display = label ? 'block' : 'none';
        if (label) {
          el.textContent = label;
          el.style.color = color ?? '#fff';
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
      },
      // 背包入包时头顶飘出「图标 ×数量」
      (toast) => {
        const id = ++pickupIdRef.current;
        setPickups((list) => [...list, { ...toast, id }]);
        setTimeout(() => setPickups((list) => list.filter((t) => t.id !== id)), 1400);
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
      <Hud hud={hud} onHeartTap={handleHeartTap} />
      {gmOpen && (
        <GmPanel
          onClose={() => setGmOpen(false)}
          actions={{
            restoreStatus: () => gameRef.current?.gmRestoreStatus(),
            setTime: (t) => gameRef.current?.gmSetTime(t),
            setWeather: (type) => gameRef.current?.gmSetWeather(type),
            giveItem: (kind, count) => gameRef.current?.gmGiveItem(kind, count),
          }}
        />
      )}
      <Backpack
        open={backpackOpen}
        onToggle={() => setBackpackOpen((v) => !v)}
        hud={hud}
        onUseItem={(kind) => {
          if (kind === 'bottle') {
            const msg = gameRef.current?.useBottle();
            if (msg) setBottleMsg(msg);
            setBackpackOpen(false);
            return;
          }
          gameRef.current?.eatFood(kind);
          setBackpackOpen(false);
        }}
        onDropItem={(kind) => gameRef.current?.dropItem(kind)}
        onCraft={(id) => {
          if (gameRef.current?.craftTool(id)) setBackpackOpen(false);
        }}
        onCraftWorkbench={() => {
          if (gameRef.current?.craftWorkbench()) setBackpackOpen(false);
        }}
        onEquip={(kind) => gameRef.current?.equipItem(kind)}
        onUnequip={(slot) => gameRef.current?.unequipItem(slot)}
      />
      {!hud.dead && (
        <>
          {(hud.hasAxe ||
            hud.hasPickaxe ||
            hud.hasFishingrod ||
            hud.hasBow ||
            hud.hasSeed ||
            hud.nearWorkbench ||
            hud.nearCampfire) && (
            <ToolButton
              tool={hud.tool}
              pulse={hud.autoEquipProgress > 0}
              workbench={hud.nearWorkbench && hud.craftId === null}
              campfire={hud.nearCampfire && !hud.nearWorkbench && hud.craftId === null}
              arrowCount={hud.arrow}
              onCycle={() => gameRef.current?.useToolButton()}
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
      {bottleMsg && <BottleMessage text={bottleMsg} onClose={() => setBottleMsg(null)} />}
      {hud.dead && <DeathScreen onConfirm={onExit} />}
      {pickups.map((t) => (
        <div key={t.id} className="pickup-toast" style={{ left: t.x, top: t.y }}>
          {t.items.map((item, i) => (
            <span key={i} style={{ marginLeft: i > 0 ? 8 : 0 }}>
              {item.icon}
              <span className="pickup-count">×{item.count}</span>
            </span>
          ))}
        </div>
      ))}
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
