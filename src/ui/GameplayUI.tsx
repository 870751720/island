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
import { ToolButton, TOOL_ICONS, TOOL_LABELS } from './ToolButton';
import { PlacePicker, type PickerItem } from './PlacePicker';
import { CraftPrompt } from './CraftPrompt';
import { WorkbenchPanel } from './WorkbenchPanel';
import type { ResourceKind } from '@/game/systems/Inventory';
import type { HandTool } from '@/game/entities/Player';
import { CampfirePanel } from './CampfirePanel';
import { CratePanel } from './CratePanel';
import { BaitBarrelPanel } from './BaitBarrelPanel';
import { BrewBarrelPanel } from './BrewBarrelPanel';
import { SmelterPanel } from './SmelterPanel';
import { CookingStationPanel } from './CookingStationPanel';
import { LoomPanel } from './LoomPanel';
import { EatPrompt } from './EatPrompt';
import { FishingControls } from './FishingControls';
import { TreasureWheel } from './TreasureWheel';
import { DropPrompt } from './DropPrompt';
import { Notice } from './Notice';
import { DeathScreen } from './DeathScreen';
import { GmPanel } from './gm/GmPanel';
import { BottleMessage } from './BottleMessage';
import { SettingsPanel } from './SettingsPanel';
import { PhotoMode } from './PhotoMode';
import { NetHost } from '@/game/net/NetHost';
import { fadeStyle } from './fade';
import { firstFoodEntryIn, EAT_PROMPT_HUNGER } from '@/game/systems/Food';
import { MapIcon, MapPanel } from './MapPanel';
import type { SaveData } from '@/game/systems/SaveSystem';

const INITIAL_HUD: HudSnapshot = {
  hunger: 100,
  thirst: 100,
  health: 100,
  moving: false,
  dead: false,
  arrow: 0,
  bait: 0,
  slots: [],
  capacity: 10,
  hasAxe: false,
  hasPickaxe: false,
  hasShovel: false,
  hasFishingrod: false,
  hasBow: false,
  hasSword: false,
  hasLasso: false,
  lassoCount: 0,
  leading: false,
  nearTether: false,
  toolTiers: { axe: 0, pickaxe: 0, shovel: 0, fishingrod: 0, bow: 0, sword: 0 },
  craftedIds: [],
  nearCrate: false,
  nearBaitBarrel: false,
  nearBrewBarrel: false,
  nearSmelter: false,
  nearCookingStation: false,
  nearLoom: false,
  nearBed: false,
  bedSleeping: false,
  bedSleepProgress: 0,
  crateSlots: null,
  crateCapacity: null,
  baitBarrelInfo: null,
  brewBarrelInfo: null,
  smelterInfo: null,
  cookingStationInfo: null,
  loomInfo: null,
  equipped: { clothing: null, pants: null, hat: null, backpack: null },
  gender: 'boy',
  tool: 'hand' as const,
  craftId: null,
  craftProgress: 0,
  workbenchCrafted: false,
  campfirePlaced: false,
  workbenchProgress: 0,
  workbenchLevel: 0,
  nearWorkbench: false,
  campfireProgress: 0,
  nearCampfire: false,
  campfireInfo: null,
  eatName: null,
  eatProgress: 0,
  autoEquipProgress: 0,
  respawnLeft: null,
  poseidonGrace: false,
  canFish: false,
  fishingState: null,
  fishingProgress: 0,
  fishingTier: 1,
  fishingWaitLeft: null,
  biteActive: false,
  biteClicks: 0,
  biteNeed: 1,
  treasureKind: null,
  collectTreasure: null,
  nearDrop: null,
  notice: null,
  day: 1,
  heldFenceCount: 0,
  heldPlaceCount: 0,
  heldItemKind: null,
  placeables: [],
  busy: false,
  indicator: { label: null, progress: null },
  buffs: [],
};

/**
 * 会劫持工具按钮的东西里,哪些能被铲子挖走:
 * 持铲子面对它们时不劫持按钮(意图是挖走,不是交互)。
 * 火堆暂不可挖,照常劫持;以后支持挖走时在这里标 true。
 */
const HIJACK_DIGGABLE: Partial<Record<'workbench' | 'campfire' | 'crate' | 'baitBarrel' | 'brewBarrel' | 'smelter' | 'cookingStation' | 'loom' | 'bed', boolean>> = {
  crate: true,
  baitBarrel: true,
  brewBarrel: true,
  smelter: true,
  cookingStation: true,
  loom: true,
  workbench: true,
  bed: true,
};

/** 面前劫持按钮的东西是否可被铲子挖走(无劫持时为 false) */
function hijackerDiggable(
  nearWorkbench: boolean,
  nearCampfire: boolean,
  nearCrate: boolean,
  nearBaitBarrel: boolean,
  nearBrewBarrel: boolean,
  nearSmelter: boolean,
  nearCookingStation: boolean,
  nearLoom: boolean,
  nearBed: boolean
): boolean {
  if (nearWorkbench) return !!HIJACK_DIGGABLE.workbench;
  if (nearCampfire) return !!HIJACK_DIGGABLE.campfire;
  if (nearCrate) return !!HIJACK_DIGGABLE.crate;
  if (nearBaitBarrel) return !!HIJACK_DIGGABLE.baitBarrel;
  if (nearBrewBarrel) return !!HIJACK_DIGGABLE.brewBarrel;
  if (nearSmelter) return !!HIJACK_DIGGABLE.smelter;
  if (nearCookingStation) return !!HIJACK_DIGGABLE.cookingStation;
  if (nearLoom) return !!HIJACK_DIGGABLE.loom;
  if (nearBed) return !!HIJACK_DIGGABLE.bed;
  return false;
}
/**
 * 游戏进行中的完整 UI 与 Game 实例生命周期:
 * 挂载时创建并启动 Game,卸载时销毁;死亡后显示确认弹窗,确认则整体卸载回到开始界面。
 */
export function GameplayUI({
  net,
  initialSave,
  onExit,
  onBecomeHost,
}: {
  /** 联机会话(房主或客人);缺省为单机 */
  net?: { host?: NetHost; guest?: NetGuest };
  /** 单机启动时已锁定的存档:null 表示明确开新档,不允许 Game 再读取 localStorage */
  initialSave?: SaveData | null;
  onExit: () => void;
  /** 单机中途在设置里开启多人模式:把新创建的房主会话交回外层统一托管(退出时一并销毁) */
  onBecomeHost: (host: NetHost) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  // 世界生成期间的遮罩,首帧渲染完成后淡出
  const [worldReady, setWorldReady] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [campfireOpen, setCampfireOpen] = useState(false);
  const [crateOpen, setCrateOpen] = useState(false);
  const [baitBarrelOpen, setBaitBarrelOpen] = useState(false);
  const [brewBarrelOpen, setBrewBarrelOpen] = useState(false);
  const [smelterOpen, setSmelterOpen] = useState(false);
  const [cookingStationOpen, setCookingStationOpen] = useState(false);
  const [loomOpen, setLoomOpen] = useState(false);
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
  // 相机模式:隐藏全部玩法 UI 自由取景拍照,由设置面板进入
  const [photoMode, setPhotoMode] = useState(false);
  const enterPhotoMode = () => {
    const game = gameRef.current;
    if (!game || hud.dead) return;
    game.enterPhotoMode();
    setSettingsOpen(false);
    setPhotoMode(true);
  };
  const exitPhotoMode = () => {
    gameRef.current?.exitPhotoMode();
    setPhotoMode(false);
  };
  // 死亡时强制退出相机模式,回到死亡结算界面
  useEffect(() => {
    if (hud.dead && photoMode) exitPhotoMode();
  }, [hud.dead]);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<MapSnapshot | null>(null);
  // 瓶中信:拔开漂流瓶后弹出的留言,关闭后清空
  const [bottleMsg, setBottleMsg] = useState<string | null>(null);
  // 海神的信:拆开后弹出的信纸,关闭后清空
  const [letterMsg, setLetterMsg] = useState<string | null>(null);
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
  useEffect(() => {
    if (!hud.nearBrewBarrel) setBrewBarrelOpen(false);
  }, [hud.nearBrewBarrel]);
  useEffect(() => {
    if (!hud.nearSmelter) setSmelterOpen(false);
  }, [hud.nearSmelter]);
  useEffect(() => {
    if (!hud.nearCookingStation) setCookingStationOpen(false);
  }, [hud.nearCookingStation]);
  useEffect(() => {
    if (!hud.nearLoom) setLoomOpen(false);
  }, [hud.nearLoom]);
  // 死亡后关闭所有弹出的面板
  useEffect(() => {
    if (hud.dead) {
      setBackpackOpen(false);
      setWorkbenchOpen(false);
      setCampfireOpen(false);
      setCrateOpen(false);
      setBaitBarrelOpen(false);
      setSmelterOpen(false);
      setCookingStationOpen(false);
      setLoomOpen(false);
    }
  }, [hud.dead]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // 世界生成在 Game 构造函数里同步阻塞主线程,先让浏览器画一帧 loading 遮罩再开始构建
    let cancelled = false;
    let game: Game | null = null;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelled || !containerRef.current) return;
        game = new Game(
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
          : net?.guest
            ? {}
            : { save: initialSave ?? null }),
      }
        );
        gameRef.current = game;
        game.start();
        // 首帧已入队后再撤遮罩,确保玩家看到的是渲染好的画面
        requestAnimationFrame(() => setWorldReady(true));
      })
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      game?.dispose();
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

  const closeMap = () => setMapOpen(false);

  // 持铲子且面前劫持按钮的东西可被挖走时,按钮保持工具模式(不劫持)
  const digHijack =
    hud.tool === 'shovel' &&
    hijackerDiggable(hud.nearWorkbench, hud.nearCampfire, hud.nearCrate, hud.nearBaitBarrel, hud.nearBrewBarrel, hud.nearSmelter, hud.nearCookingStation, hud.nearLoom, hud.nearBed);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // 背景取场景天空色,淡出时与首帧画面自然衔接
          background: '#a8d8ea',
          opacity: worldReady ? 0 : 1,
          pointerEvents: worldReady ? 'none' : 'auto',
          transition: 'opacity 0.5s ease-out',
        }}
      >
        <span style={{ color: '#3f6f8f', fontSize: 18, letterSpacing: 4 }}>正在登上小岛…</span>
      </div>
      {!hud.dead && !photoMode && <VirtualJoystick onChange={(x, z) => gameRef.current?.setJoystick(x, z)} />}
      {!photoMode && (
        <>
          <FpsOverlay />
          <TrafficOverlay />
              <Hud
                hud={hud}
                onHeartTap={handleHeartTap}
                rightReserve={mapOpen ? 210 : 120}
              />
        </>
      )}
      {/* 右上角:设置按钮左、地图入口或小地图右；玩家移动/交互中一起淡出 */}
      {!hud.dead && !photoMode && (
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
              aria-label="打开小地图"
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
          {mapOpen && mapSnapshot && (
            <div style={fadeStyle(hud.busy)}>
              <MapPanel snapshot={mapSnapshot} onClose={closeMap} />
            </div>
          )}
        </div>
      )}
      {settingsOpen && (
        <SettingsPanel
          onApply={(s) => gameRef.current?.setAudioSettings(s)}
          onExit={onExit}
          onClose={() => setSettingsOpen(false)}
          onEnterPhotoMode={enterPhotoMode}
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
          gender={hud.gender}
          onClose={() => setGmOpen(false)}
          actions={{
            restoreStatus: () => gameRef.current?.gmRestoreStatus(),
            setGender: (gender) => gameRef.current?.gmSetGender(gender),
            setTime: (t) => gameRef.current?.gmSetTime(t),
            setDay: (day) => gameRef.current?.gmSetDay(day),
            setWeather: (type) => gameRef.current?.gmSetWeather(type),
            setConfig: (patch) => gameRef.current?.gmSetConfig(patch),
            giveItem: (kind, count) => gameRef.current?.gmGiveItem(kind, count),
            giveTool: (tool, tier) => gameRef.current?.gmGiveTool(tool, tier),
            spawnAnimal: (species) => gameRef.current?.gmSpawnAnimal(species),
            triggerCrocodile: () => gameRef.current?.gmTriggerCrocodile(),
          }}
        />
      )}
      {!photoMode && (
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
          if (kind === 'letter') {
            const msg = gameRef.current?.useLetter();
            if (msg) setLetterMsg(msg);
            setBackpackOpen(false);
            return;
          }
          // 可放置道具(建筑/丛/神龛/围栏等)统一在就近最优格放下,放不下时提示原因
          if (gameRef.current?.useFacilityItem(kind)) {
            setBackpackOpen(false);
            return;
          }
          if (kind === 'oakSeed' || kind === 'pineSeed' || kind === 'fruitSeed') {
            gameRef.current?.useSeed(kind);
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
        onEquip={(kind) => gameRef.current?.equipItem(kind)}
        onUnequip={(slot) => gameRef.current?.unequipItem(slot)}
        onMoveItem={(from, to) => gameRef.current?.moveItem(from, to)}
        onSort={() => gameRef.current?.sortInventory()}
      />
      )}
      {!hud.dead && !photoMode && (
        <>
          {(hud.hasAxe ||
            hud.hasPickaxe ||
            hud.hasShovel ||
            hud.hasFishingrod ||
            hud.hasBow ||
            hud.hasSword ||
            hud.hasLasso ||
            hud.nearTether ||
            hud.nearWorkbench ||
            hud.nearCampfire ||
            hud.nearCrate ||
            hud.nearBaitBarrel ||
            hud.nearBrewBarrel ||
            hud.nearSmelter ||
            hud.nearCookingStation ||
            hud.nearLoom ||
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
              brewBarrel={
                hud.nearBrewBarrel &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                hud.craftId === null &&
                !digHijack
              }
              smelter={
                hud.nearSmelter &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                hud.craftId === null &&
                !digHijack
              }
              cookingStation={
                hud.nearCookingStation &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                hud.craftId === null &&
                !digHijack
              }
              loom={
                hud.nearLoom &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                hud.craftId === null &&
                !digHijack
              }
              bed={
                hud.nearBed &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                !hud.nearLoom &&
                hud.craftId === null &&
                !hud.bedSleeping &&
                !digHijack
              }
              stake={hud.leading}
              untie={
                hud.nearTether &&
                !hud.leading &&
                !hud.nearWorkbench &&
                !hud.nearCampfire &&
                !hud.nearCrate &&
                !hud.nearBaitBarrel &&
                !hud.nearBrewBarrel &&
                !hud.nearSmelter &&
                !hud.nearCookingStation &&
                !hud.nearLoom &&
                !hud.nearBed &&
                hud.craftId === null
              }
              arrowCount={hud.arrow}
              baitCount={hud.bait}
              fenceCount={hud.heldFenceCount}
              placeCount={hud.heldPlaceCount}
              placeKind={hud.heldItemKind}
              lassoCount={hud.lassoCount}
              dimmed={hud.busy}
              onLongPress={() => setPlacePickerOpen(true)}
              onCycle={() => gameRef.current?.useToolButton()}
              onWorkbench={() => setWorkbenchOpen(true)}
              onCampfire={() => setCampfireOpen(true)}
              onCrate={() => setCrateOpen(true)}
              onBaitBarrel={() => setBaitBarrelOpen(true)}
              onBrewBarrel={() => setBrewBarrelOpen(true)}
              onSmelter={() => setSmelterOpen(true)}
              onCookingStation={() => setCookingStationOpen(true)}
              onLoom={() => setLoomOpen(true)}
              onBed={() => gameRef.current?.sleep()}
              onStake={() => gameRef.current?.stakeLasso()}
              onUntie={() => gameRef.current?.untieLasso()}
            />
          )}
          {placePickerOpen &&
            (() => {
              // 手持选择面板:空手 + 已拥有工具 + 套索 + 背包可放置道具(上次使用的排最前),当前手持高亮
              const entries: (PickerItem & { tool?: HandTool; kind?: ResourceKind })[] = [
                {
                  key: 'hand',
                  icon: TOOL_ICONS.hand,
                  name: TOOL_LABELS.hand!,
                  tool: 'hand',
                  active: hud.tool === 'hand',
                },
                ...(['axe', 'pickaxe', 'shovel', 'fishingrod', 'bow', 'sword'] as const)
                  .filter((t) => hud.toolTiers[t] > 0)
                  .map((t) => ({
                    key: t,
                    icon: TOOL_ICONS[t],
                    name: TOOL_LABELS[t]!,
                    tool: t as HandTool,
                    active: hud.tool === t,
                  })),
                ...(hud.hasLasso
                  ? [
                      {
                        key: 'lasso',
                        icon: TOOL_ICONS.lasso,
                        name: TOOL_LABELS.lasso!,
                        tool: 'lasso' as HandTool,
                        active: hud.tool === 'lasso',
                      },
                    ]
                  : []),
                ...hud.placeables.map((p) => ({
                  key: p.kind,
                  icon: ITEMS[p.kind].icon,
                  name: ITEMS[p.kind].name,
                  count: p.count,
                  kind: p.kind,
                  active: hud.heldItemKind === p.kind,
                })),
              ];
              return (
                <PlacePicker
                  items={entries}
                  onPick={(entry) => {
                    if (entry.tool) gameRef.current?.selectTool(entry.tool);
                    else if (entry.kind) gameRef.current?.pickPlaceItem(entry.kind);
                    setPlacePickerOpen(false);
                  }}
                  onClose={() => setPlacePickerOpen(false)}
                />
              );
            })()}
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
              onStore={(kind, count) => gameRef.current?.crateStore(kind, count) ?? false}
              onTake={(kind, count) => gameRef.current?.crateTake(kind, count) ?? false}
              onClose={() => setCrateOpen(false)}
            />
          )}
          {baitBarrelOpen && hud.nearBaitBarrel && (
            <BaitBarrelPanel
              hud={hud}
              onFeed={(kind, count) => gameRef.current?.baitBarrelFeed(kind, count)}
              onCollect={() => gameRef.current?.baitBarrelCollect()}
              onTakeFoods={() => gameRef.current?.baitBarrelTakeFoods()}
              onClose={() => setBaitBarrelOpen(false)}
            />
          )}
          {brewBarrelOpen && hud.nearBrewBarrel && (
            <BrewBarrelPanel
              hud={hud}
              onFeed={(kind, count) => gameRef.current?.brewBarrelFeed(kind, count)}
              onCollect={() => gameRef.current?.brewBarrelCollect()}
              onTakeRaw={() => gameRef.current?.brewBarrelTakeRaw()}
              onClose={() => setBrewBarrelOpen(false)}
            />
          )}
          {smelterOpen && hud.nearSmelter && (
            <SmelterPanel
              hud={hud}
              onFeed={(count) => gameRef.current?.smelterFeed(count)}
              onCollect={() => gameRef.current?.smelterCollect()}
              onTakeOre={() => gameRef.current?.smelterTakeOre()}
              onClose={() => setSmelterOpen(false)}
            />
          )}
          {cookingStationOpen && hud.nearCookingStation && (
            <CookingStationPanel
              hud={hud}
              onAddFuel={(kind) => gameRef.current?.cookingAddFuel(kind)}
              onRoast={(kind, count) => {
                gameRef.current?.cookingRoast(kind, count);
                setCookingStationOpen(false);
              }}
              onBoil={(kind, count) => {
                gameRef.current?.cookingBoil(kind, count);
              }}
              onCollect={() => gameRef.current?.cookingCollect()}
              onTakeBoil={() => gameRef.current?.cookingTakeBoil()}
              onClose={() => setCookingStationOpen(false)}
            />
          )}
          {loomOpen && hud.nearLoom && (
            <LoomPanel
              hud={hud}
              onFeed={(count) => gameRef.current?.loomFeed(count)}
              onCollect={() => gameRef.current?.loomCollect()}
              onTakeRope={() => gameRef.current?.loomTakeRope()}
              onClose={() => setLoomOpen(false)}
            />
          )}
          {(() => {
            // 左侧弹出卡片三选一,优先级:捡回 > 进食 > 手搓;各自组件内再判定自身细条件
            const dropActive = !!hud.nearDrop && !hud.dead && !hud.moving && !backpackOpen;
            const eatActive =
              !dropActive &&
              hud.eatName === null &&
              hud.hunger < EAT_PROMPT_HUNGER &&
              !hud.dead &&
              !hud.moving &&
              !!firstFoodEntryIn(hud.slots);
            return (
              <>
                <CraftPrompt
                  hud={hud}
                  onCraft={(id) => gameRef.current?.craftTool(id)}
                  suppressed={dropActive || eatActive}
                />
                <EatPrompt
                  hud={hud}
                  onEat={() => gameRef.current?.eatFood()}
                  onEatFull={() => gameRef.current?.eatUntilFull()}
                  suppressed={dropActive}
                />
                {!backpackOpen && (
                  <DropPrompt hud={hud} onPickup={() => gameRef.current?.pickupDrop()} />
                )}
              </>
            );
          })()}
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
          <TreasureWheel
            key={hud.collectTreasure ? `collect-${hud.collectTreasure}` : 'collect-none'}
            kind={hud.collectTreasure}
            onClaim={() => gameRef.current?.claimCollectTreasure()}
            onSfx={(name) => gameRef.current?.playUiSfx(name)}
          />
          <Notice notice={hud.notice} />
        </>
      )}
      {bottleMsg && <BottleMessage text={bottleMsg} onClose={() => setBottleMsg(null)} />}
      {letterMsg && (
        <BottleMessage text={letterMsg} onClose={() => setLetterMsg(null)} icon="📜" title="海神的信" closeLabel="收好信纸" />
      )}
      {hud.dead && (
        <DeathScreen
          onConfirm={onExit}
          autoRespawn={!!(net?.host || net?.guest) || hud.poseidonGrace}
          respawnLeft={hud.respawnLeft}
          report={gameRef.current?.deathReport ?? null}
          poseidon={hud.poseidonGrace}
        />
      )}
      {photoMode && !hud.dead && gameRef.current && (
        <PhotoMode game={gameRef.current} day={hud.day} onClose={exitPhotoMode} />
      )}
      {!photoMode && pickups.map((t) => (
        <div key={t.id} className="pickup-toast" style={{ left: t.x, top: t.y }}>
          {t.items.map((item, i) => (
            <span key={i} style={{ marginLeft: i > 0 ? 8 : 0, display: 'inline-flex', alignItems: 'center' }}>
              <ItemIcon kind={item.kind} size={22} />
              <span className="pickup-count">{ITEMS[item.kind].name}×{item.count}</span>
            </span>
          ))}
        </div>
      ))}
      {!photoMode && damagePops.map((d) => (
        <div key={d.id} className="damage-pop" style={{ left: d.x, top: d.y }}>
          -{d.amount}
        </div>
      ))}
      {!photoMode && (
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
      )}
      {!photoMode && (
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
      )}
      {!photoMode && (
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
      )}
      {!photoMode && <VitalWarn ref={vitalWarnRef} />}
    </div>
  );
}
