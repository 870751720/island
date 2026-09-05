'use client';

import { ItemIcon } from './ItemIcon';
import { ITEMS } from '@/game/systems/Items';
import { useEffect, useRef, useState } from 'react';
import { Game, type HudSnapshot, type MapSnapshot, type PickupToast } from '@/game/Game';
import type { NetGuest } from '@/game/net/NetGuest';
import { VitalWarn, type VitalWarnHandle } from './VitalWarn';
import { Hud } from './Hud';
import { Backpack } from './Backpack';
import { VirtualJoystick } from './VirtualJoystick';
import { FpsOverlay } from './FpsOverlay';
import { TrafficOverlay } from './TrafficOverlay';
import { ToolButton } from './ToolButton';
import { CraftPrompt } from './CraftPrompt';
import { WorkbenchPanel } from './WorkbenchPanel';
import { workbenchItemLevel } from '@/game/systems/WorkbenchSystem';
import type { ResourceKind } from '@/game/systems/Inventory';
import type { ShrineKind } from '@/game/entities/Shrine';

/** 神龛类道具:背包里「使用」后在脚下立起对应神像 */
const SHRINE_ITEM_KINDS: readonly ShrineKind[] = [
  'poseidonBlessing',
  'beehiveShrine',
  'healCrystal',
  'rainAltar',
  'torch',
];
import { bedItemLevel } from '@/game/systems/BedSystem';
import { CampfirePanel } from './CampfirePanel';
import { CratePanel } from './CratePanel';
import { BaitBarrelPanel } from './BaitBarrelPanel';
import { EatPrompt } from './EatPrompt';
import { FishingControls } from './FishingControls';
import { TreasureWheel } from './TreasureWheel';
import { DropPrompt } from './DropPrompt';
import { Notice } from './Notice';
import { DeathScreen } from './DeathScreen';
import { GmPanel } from './gm/GmPanel';
import { BottleMessage } from './BottleMessage';
import { SettingsPanel } from './SettingsPanel';
import { NetHost } from '@/game/net/NetHost';
import { fadeStyle } from './fade';
import { MapIcon, MapPanel } from './MapPanel';

const INITIAL_HUD: HudSnapshot = {
  hunger: 100,
  thirst: 100,
  health: 100,
  dead: false,
  wood: 0,
  log: 0,
  stone: 0,
  berry: 0,
  fiber: 0,
  fur: 0,
  crabMeat: 0,
  birdMeat: 0,
  gameMeat: 0,
  rope: 0,
  arrow: 0,
  bait: 0,
  bed1: 0,
  bed2: 0,
  slots: [],
  capacity: 10,
  hasAxe: false,
  hasPickaxe: false,
  hasHoe: false,
  hasFishingrod: false,
  hasBow: false,
  hasSword: false,
  toolTiers: { axe: 0, pickaxe: 0, hoe: 0, fishingrod: 0, bow: 0, sword: 0 },
  nearCrate: false,
  nearBaitBarrel: false,
  nearBed: false,
  bedSleeping: false,
  bedSleepProgress: 0,
  crateSlots: null,
  baitBarrelInfo: null,
  equipped: { clothing: null, pants: null, hat: null, backpack: null },
  tool: 'hand' as const,
  craftId: null,
  craftProgress: 0,
  canCraftWorkbench: false,
  workbenchCrafting: false,
  workbenchProgress: 0,
  workbenchLevel: 0,
  nearWorkbench: false,
  canCraftCampfire: false,
  canBuildCampfire: false,
  campfireCrafting: false,
  campfireProgress: 0,
  nearCampfire: false,
  campfireInfo: null,
  eatName: null,
  eatProgress: 0,
  autoEquipProgress: 0,
  respawnLeft: null,
  canFish: false,
  fishingState: null,
  fishingProgress: 0,
  fishingTier: 1,
  fishingWaitLeft: null,
  biteActive: false,
  biteClicks: 0,
  biteNeed: 1,
  treasureKind: null,
  nearDrop: null,
  notice: null,
  day: 1,
  heldFenceCount: 0,
  busy: false,
  indicator: { label: null, progress: null },
  buffs: [],
};

/**
 * 会劫持工具按钮的东西里,哪些能被锄头挖走:
 * 持锄头面对它们时不劫持按钮(意图是挖走,不是交互)。
 * 火堆暂不可挖,照常劫持;以后支持挖走时在这里标 true。
 */
const HIJACK_DIGGABLE: Partial<Record<'workbench' | 'campfire' | 'crate' | 'baitBarrel' | 'bed', boolean>> = {
  crate: true,
  baitBarrel: true,
  workbench: true,
  bed: true,
};

/** 面前劫持按钮的东西是否可被锄头挖走(无劫持时为 false) */
function hijackerDiggable(
  nearWorkbench: boolean,
  nearCampfire: boolean,
  nearCrate: boolean,
  nearBaitBarrel: boolean,
  nearBed: boolean
): boolean {
  if (nearWorkbench) return !!HIJACK_DIGGABLE.workbench;
  if (nearCampfire) return !!HIJACK_DIGGABLE.campfire;
  if (nearCrate) return !!HIJACK_DIGGABLE.crate;
  if (nearBaitBarrel) return !!HIJACK_DIGGABLE.baitBarrel;
  if (nearBed) return !!HIJACK_DIGGABLE.bed;
  return false;
}
/**
 * 游戏进行中的完整 UI 与 Game 实例生命周期:
 * 挂载时创建并启动 Game,卸载时销毁;死亡后显示确认弹窗,确认则整体卸载回到开始界面。
 */
export function GameplayUI({
  net,
  onExit,
  onBecomeHost,
}: {
  /** 联机会话(房主或客人);缺省为单机 */
  net?: { host?: NetHost; guest?: NetGuest };
  onExit: () => void;
  /** 单机中途在设置里开启多人模式:把新创建的房主会话交回外层统一托管(退出时一并销毁) */
  onBecomeHost: (host: NetHost) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [campfireOpen, setCampfireOpen] = useState(false);
  const [crateOpen, setCrateOpen] = useState(false);
  const [baitBarrelOpen, setBaitBarrelOpen] = useState(false);
  const mumbleRef = useRef<HTMLDivElement>(null);
  const dogEmojiRef = useRef<HTMLDivElement>(null);
  const vitalWarnRef = useRef<VitalWarnHandle>(null);
  // 拾取飘字:入包时在玩家头顶飘出图标与数量,动画结束后自动移除
  const pickupIdRef = useRef(0);
  const [pickups, setPickups] = useState<(PickupToast & { id: number })[]>([]);
  // 受伤飘字:头顶飘出红色伤害数字,动画结束后自动移除
  const damageIdRef = useRef(0);
  const [damagePops, setDamagePops] = useState<{ id: number; amount: number; x: number; y: number }[]>([]);
  const [gmOpen, setGmOpen] = useState(false);
  // 游戏内设置面板(音乐音量/返回主界面)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<MapSnapshot | null>(null);
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
  // 单机中途开启多人模式:创建房间并把已在运行的游戏挂接为房主权威端
  const [mpBusy, setMpBusy] = useState(false);
  const [mpError, setMpError] = useState('');
  const enableMultiplayer = async () => {
    const game = gameRef.current;
    if (!game || mpBusy) return;
    setMpBusy(true);
    setMpError('');
    const host = new NetHost();
    try {
      await host.createRoom();
      game.bindHost(host);
      onBecomeHost(host);
    } catch (error) {
      host.dispose();
      setMpError(error instanceof Error ? error.message : '创建房间失败，请重试');
    } finally {
      setMpBusy(false);
    }
  };

  // 离开工作台/火堆范围自动收起对应面板
  useEffect(() => {
    if (!hud.nearWorkbench) setWorkbenchOpen(false);
  }, [hud.nearWorkbench]);
  useEffect(() => {
    if (!hud.nearCampfire) setCampfireOpen(false);
  }, [hud.nearCampfire]);
  useEffect(() => {
    if (!hud.nearCrate) setCrateOpen(false);
  }, [hud.nearCrate]);
  useEffect(() => {
    if (!hud.nearBaitBarrel) setBaitBarrelOpen(false);
  }, [hud.nearBaitBarrel]);
  // 死亡后关闭所有弹出的面板
  useEffect(() => {
    if (hud.dead) {
      setBackpackOpen(false);
      setWorkbenchOpen(false);
      setCampfireOpen(false);
      setCrateOpen(false);
      setBaitBarrelOpen(false);
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
      // 低数值提醒:每帧直写 DOM,组件内部自行判断是否显示
      (vitals, x, y) => vitalWarnRef.current?.update(vitals, x, y),
      // 背包入包时头顶飘出「图标 ×数量」
      (toast) => {
        const id = ++pickupIdRef.current;
        setPickups((list) => [...list, { ...toast, id }]);
        setTimeout(() => setPickups((list) => list.filter((t) => t.id !== id)), 1400);
      },
      // 受伤时头顶飘出伤害数字
      (amount, x, y) => {
        const id = ++damageIdRef.current;
        setDamagePops((list) => [...list, { id, amount, x, y }]);
        setTimeout(() => setDamagePops((list) => list.filter((d) => d.id !== id)), 1000);
      },
      // 博美头顶的小表情,同样每帧直写 DOM
      (emoji, x, y) => {
        const el = dogEmojiRef.current;
        if (!el) return;
        el.style.display = emoji ? 'block' : 'none';
        if (emoji) {
          el.textContent = emoji;
          el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        }
      },
      setBottleMsg,
      {
        host: net?.host,
        guest: net?.guest,
        // 房主可在大厅选择新岛或恢复上一次由房主持有的联机存档。
        ...(net?.host
          ? {
              seeds: { terrainSeed: net.host.terrainSeed },
              save: net.host.initialSave,
            }
          : {}),
      }
    );
    gameRef.current = game;
    game.start();
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  // 地图打开期间低频读取表现快照，足够跟随移动且避免把位置数据塞进高频 HUD。
  useEffect(() => {
    if (!mapOpen) return;
    const update = () => {
      const snapshot = gameRef.current?.getMapSnapshot();
      if (snapshot) setMapSnapshot(snapshot);
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [mapOpen]);

  const closeMap = () => {
    setMapExpanded(false);
    setMapOpen(false);
  };

  // 持锄头且面前劫持按钮的东西可被挖走时,按钮保持工具模式(不劫持)
  const digHijack =
    hud.tool === 'hoe' &&
    hijackerDiggable(hud.nearWorkbench, hud.nearCampfire, hud.nearCrate, hud.nearBaitBarrel, hud.nearBed);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}
    >
      {!hud.dead && <VirtualJoystick onChange={(x, z) => gameRef.current?.setJoystick(x, z)} />}
      <FpsOverlay />
      <TrafficOverlay />
      <Hud hud={hud} onHeartTap={handleHeartTap} />
      {/* 右上角:设置按钮左、地图入口或小地图右；玩家移动/交互中一起淡出 */}
      {!hud.dead && (
        <div
          style={{
            position: 'absolute',
            top: 'max(10px, env(safe-area-inset-top))',
            right: 'max(10px, env(safe-area-inset-right))',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="设置"
            style={{
              width: 44,
              height: 44,
              fontSize: 17,
              lineHeight: 1,
              border: 'none',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.75)',
              cursor: 'pointer',
              ...fadeStyle(hud.busy),
            }}
          >
            ⚙️
          </button>
          {!mapOpen && (
            <button
              onClick={() => setMapOpen(true)}
              aria-label="打开地图"
              style={{
                width: 44,
                height: 44,
                padding: 8,
                lineHeight: 1,
                border: 'none',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.82)',
                cursor: 'pointer',
                touchAction: 'manipulation',
                ...fadeStyle(hud.busy),
              }}
            >
              <MapIcon size={28} />
            </button>
          )}
          {mapOpen && !mapExpanded && mapSnapshot && (
            <div style={fadeStyle(hud.busy)}>
              <MapPanel snapshot={mapSnapshot} expanded={false} onExpand={() => setMapExpanded(true)} onClose={closeMap} />
            </div>
          )}
        </div>
      )}
      {mapOpen && mapExpanded && mapSnapshot && (
        <MapPanel snapshot={mapSnapshot} expanded onExpand={() => {}} onClose={closeMap} />
      )}
      {settingsOpen && (
        <SettingsPanel
          onApply={(s) => gameRef.current?.setAudioSettings(s)}
          onExit={onExit}
          onClose={() => setSettingsOpen(false)}
          multiplayer={
            net?.guest
              ? undefined
              : {
                  roomCode: net?.host?.roomCode ?? '',
                  busy: mpBusy,
                  error: mpError,
                  onEnable: () => void enableMultiplayer(),
                }
          }
        />
      )}
      {gmOpen && (
        <GmPanel
          onClose={() => setGmOpen(false)}
          actions={{
            restoreStatus: () => gameRef.current?.gmRestoreStatus(),
            setTime: (t) => gameRef.current?.gmSetTime(t),
            setWeather: (type) => gameRef.current?.gmSetWeather(type),
            setConfig: (patch) => gameRef.current?.gmSetConfig(patch),
            giveItem: (kind, count) => gameRef.current?.gmGiveItem(kind, count),
            giveTool: (tool, tier) => gameRef.current?.gmGiveTool(tool, tier),
            spawnAnimal: (species) => gameRef.current?.gmSpawnAnimal(species),
            triggerCrocodile: () => gameRef.current?.gmTriggerCrocodile(),
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
          if (kind === 'berryBush' || kind === 'shrubBush' || kind === 'grassTuft') {
            gameRef.current?.useBush(kind);
            setBackpackOpen(false);
            return;
          }
          if (kind === 'oakSeed' || kind === 'pineSeed' || kind === 'fruitSeed') {
            gameRef.current?.useSeed(kind);
            setBackpackOpen(false);
            return;
          }
          if (kind === 'crate') {
            gameRef.current?.useCrate();
            setBackpackOpen(false);
            return;
          }
          if (kind === 'baitBarrel') {
            gameRef.current?.useBaitBarrel();
            setBackpackOpen(false);
            return;
          }
          if (kind === 'fenceWood' || kind === 'fenceStone' || kind === 'fenceGate') {
            gameRef.current?.useFenceItem(kind);
            setBackpackOpen(false);
            return;
          }
          if (workbenchItemLevel(kind) !== null) {
            gameRef.current?.useWorkbenchItem(kind);
            setBackpackOpen(false);
            return;
          }
          if (bedItemLevel(kind) !== null) {
            gameRef.current?.useBedItem(kind);
            setBackpackOpen(false);
            return;
          }
          if ((SHRINE_ITEM_KINDS as readonly ResourceKind[]).includes(kind)) {
            gameRef.current?.useShrine(undefined, kind as ShrineKind);
            setBackpackOpen(false);
            return;
          }
          gameRef.current?.eatFood(kind);
          setBackpackOpen(false);
        }}
        onDropItem={(kind, count) => gameRef.current?.dropItem(kind, count)}
        onCraft={(id) => {
          if (gameRef.current?.craftTool(id)) setBackpackOpen(false);
        }}
        onCraftWorkbench={() => {
          if (gameRef.current?.craftWorkbench()) setBackpackOpen(false);
        }}
        onCraftCampfire={() => {
          if (gameRef.current?.craftCampfire()) setBackpackOpen(false);
        }}
        onEquip={(kind) => gameRef.current?.equipItem(kind)}
        onUnequip={(slot) => gameRef.current?.unequipItem(slot)}
        onMoveItem={(from, to) => gameRef.current?.moveItem(from, to)}
      />
      {!hud.dead && (
        <>
          {(hud.hasAxe ||
            hud.hasPickaxe ||
            hud.hasHoe ||
            hud.hasFishingrod ||
            hud.hasBow ||
            hud.hasSword ||
            hud.nearWorkbench ||
            hud.nearCampfire ||
            hud.nearCrate ||
            hud.nearBaitBarrel ||
            hud.nearBed) && (
            <ToolButton
              tool={hud.tool}
              pulse={hud.autoEquipProgress > 0}
              workbench={hud.nearWorkbench && hud.craftId === null && !digHijack}
              campfire={hud.nearCampfire && !hud.nearWorkbench && hud.craftId === null && !digHijack}
              crate={hud.nearCrate && !hud.nearWorkbench && !hud.nearCampfire && hud.craftId === null && !digHijack}
              baitBarrel={
                hud.nearBaitBarrel &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                hud.craftId === null &&
                !digHijack
              }
              bed={
                hud.nearBed &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                hud.craftId === null &&
                !hud.bedSleeping &&
                !digHijack
              }
              arrowCount={hud.arrow}
              baitCount={hud.bait}
              fenceCount={hud.heldFenceCount}
              dimmed={hud.busy}
              onCycle={() => gameRef.current?.useToolButton()}
              onWorkbench={() => setWorkbenchOpen(true)}
              onCampfire={() => setCampfireOpen(true)}
              onCrate={() => setCrateOpen(true)}
              onBaitBarrel={() => setBaitBarrelOpen(true)}
              onBed={() => gameRef.current?.sleep()}
            />
          )}
          {workbenchOpen && (
            <WorkbenchPanel
              hud={hud}
              onCraft={(id, count) => {
                if (gameRef.current?.craftAtWorkbench(id, count)) setWorkbenchOpen(false);
              }}
              onUpgrade={() => !!gameRef.current?.upgradeWorkbench()}
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
          {crateOpen && hud.nearCrate && (
            <CratePanel
              hud={hud}
              onStore={(kind) => gameRef.current?.crateStore(kind)}
              onTake={(kind) => gameRef.current?.crateTake(kind)}
              onClose={() => setCrateOpen(false)}
            />
          )}
          {baitBarrelOpen && hud.nearBaitBarrel && (
            <BaitBarrelPanel
              hud={hud}
              onFeed={(kind) => gameRef.current?.baitBarrelFeed(kind)}
              onCollect={() => gameRef.current?.baitBarrelCollect()}
              onClose={() => setBaitBarrelOpen(false)}
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
          <TreasureWheel
            key={hud.treasureKind ?? 'none'}
            kind={hud.treasureKind}
            onClaim={() => gameRef.current?.claimTreasure()}
            onSfx={(name) => gameRef.current?.playUiSfx(name)}
          />
          {!backpackOpen && (
            <DropPrompt hud={hud} onPickup={() => gameRef.current?.pickupDrop()} />
          )}
          <Notice notice={hud.notice} />
        </>
      )}
      {bottleMsg && <BottleMessage text={bottleMsg} onClose={() => setBottleMsg(null)} />}
      {hud.dead && (
        <DeathScreen
          onConfirm={onExit}
          autoRespawn={!!(net?.host || net?.guest)}
          respawnLeft={hud.respawnLeft}
        />
      )}
      {pickups.map((t) => (
        <div key={t.id} className="pickup-toast" style={{ left: t.x, top: t.y }}>
          {t.items.map((item, i) => (
            <span key={i} style={{ marginLeft: i > 0 ? 8 : 0, display: 'inline-flex', alignItems: 'center' }}>
              <ItemIcon kind={item.kind} size={22} />
              <span className="pickup-count">{ITEMS[item.kind].name}×{item.count}</span>
            </span>
          ))}
        </div>
      ))}
      {damagePops.map((d) => (
        <div key={d.id} className="damage-pop" style={{ left: d.x, top: d.y }}>
          -{d.amount}
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
      <div
        ref={dogEmojiRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'none',
          padding: '2px 7px',
          background: 'rgba(255,255,255,0.94)',
          borderRadius: 999,
          fontFamily: 'sans-serif',
          fontSize: 14,
          lineHeight: 1.2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 30,
        }}
      />
      <VitalWarn ref={vitalWarnRef} />
    </div>
  );
}
