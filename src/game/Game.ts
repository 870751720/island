import type { PlayerGender } from './entities/PlayerModel';
import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { Player, type HandTool } from './entities/Player';
import { PlayerSession } from './mp/PlayerSession';
import type { NetHost } from './net/NetHost';
import type { NetGuest } from './net/NetGuest';
import { loadNickname } from './net/nickname';
import type { AmbientState, AnimalPose, NetMsg, PlayerState, WorldPatch } from './net/Protocol';
import type { NetEvent } from './net/Protocol';
import { applyWorldDelta, type WorldDeltaOp } from './net/WorldDelta';
import type { Actor } from './mp/Actor';
import { Crabs } from './entities/Crab';
import { Butterflies } from './entities/Butterflies';
import { Birds } from './entities/Birds';
import { Wildlife, ANIMAL_LABELS, type AnimalSpecies } from './entities/Wildlife';
import { Pomeranian } from './entities/Pomeranian';
import { CollectSystem } from './systems/CollectSystem';
import { SheepMilkSystem } from './systems/SheepMilkSystem';
import { pickaxeUnlocked } from './systems/ToolTiers';
import { DayNightSystem } from './systems/DayNightSystem';
import { DayEventSystem } from './systems/DayEventSystem';
import { WeatherSystem } from './systems/WeatherSystem';
import { RECIPES, TOOL_IDS, type CraftId, type ToolId, type Tools } from './systems/Crafting';
import { CraftingSystem } from './systems/CraftingSystem';
import { PhotoCamera } from './systems/PhotoCamera';
import { DropSystem, type DropInfo } from './systems/DropSystem';
import { WorkbenchSystem, workbenchItemLevel } from './systems/WorkbenchSystem';
import { CrateSystem } from './systems/CrateSystem';
import type { CrateKind } from './entities/Crate';
import { BaitBarrelSystem, type BaitBarrelInfo } from './systems/BaitBarrelSystem';
import { wineOf, isWineKind, TIPSY_DURATION } from './systems/Wine';
import { BrewBarrelSystem, type BrewBarrelInfo } from './systems/BrewBarrelSystem';
import { WaterPurifierSystem } from './systems/WaterPurifierSystem';
import { RabbitBurrowSystem } from './systems/RabbitBurrowSystem';
import { SmelterSystem, type SmelterInfo } from './systems/SmelterSystem';
import { CookingStationSystem, type CookingStationInfo } from './systems/CookingStationSystem';
import { LoomSystem, type LoomInfo } from './systems/LoomSystem';
import { FenceSystem, fenceKindOfItem } from './systems/FenceSystem';
import { BedSystem, bedItemLevel } from './systems/BedSystem';
import { ShrineSystem } from './systems/ShrineSystem';
import type { ShrineKind } from './entities/Shrine';
import { BUFFS, type HudBuff } from './systems/BuffSystem';
import { MeteorSystem } from './systems/MeteorSystem';
import { CampfireSystem, type CampfireInfo } from './systems/CampfireSystem';
import { EatingSystem } from './systems/EatingSystem';
import { firstFoodIn, FOODS, COOKABLE_KINDS, type Food } from './systems/Food';
import { ITEMS, itemSortIndex } from './systems/Items';
import { WaterSystem } from './systems/WaterSystem';
import { FishingSystem, type FishingState } from './systems/FishingSystem';
import type { FishTier } from './systems/FishTable';
import { BowSystem } from './systems/BowSystem';
import { SwordSystem } from './systems/SwordSystem';
import { LassoSystem } from './systems/LassoSystem';
import { StakeSystem } from './systems/StakeSystem';
import type { StakeSave } from './entities/Stake';
import { LeashLines } from './fx/LeashLines';
import { MumbleSystem } from './systems/MumbleSystem';
import { Particles } from './fx/Particles';
import { GameAudio } from './audio/GameAudio';
import type { SfxName } from './audio/Sfx';
import { WaterFx } from './fx/WaterFx';
import { Rain } from './fx/Rain';
import { RainImpact } from './fx/RainImpact';
import { Wind } from './fx/Wind';
import { PondLife } from './fx/PondLife';
import { Decorations } from './world/Decorations';
import { Footprints } from './fx/Footprints';
import { ItemFlyFx } from './fx/ItemFlyFx';
import { PlayerIndicator } from './ui3d/PlayerIndicator';
import { DEFAULT_CAPACITY, Inventory, type InventorySlot, type ResourceKind } from './systems/Inventory';
import { EQUIPMENT, Equipment, isEquipKind, SLOT_ORDER, type EquipKind, type EquipSlot } from './systems/Equipment';
import { SaveSystem, SAVE_VERSION, type SaveData, type SessionSave } from './systems/SaveSystem';
import type { DeathReport } from './systems/RunStats';
import { SurvivalSystem } from './systems/SurvivalSystem';
import { GmSystem, gmApply, gmSnapshot, type GmConfig } from './systems/GmSystem';
import { IslandTerrain } from './world/IslandTerrain';
import { Ocean } from './world/Ocean';
import { OceanDepth } from './world/OceanDepth';
import { WaterDebugOverlay } from './world/WaterDebugOverlay';
import { Clouds } from './world/Clouds';
import { Props } from './world/Props';
import { updateSeasonSnow } from './world/SeasonSnow';
import { SEED_OF } from './world/TreeSpecies';
import { openBottle } from './systems/BottleMessages';
import { POSEIDON_GRACE_DAYS, POSEIDON_GRACE_CHANCE, POSEIDON_GIFT_KINDS, openLetter } from './systems/PoseidonGrace';
import { MetaProgress, legacyPointsForDay } from './meta/MetaProgress';
import { MetaDaily } from './meta/MetaDaily';
import type { MetaNodeId } from './meta/MetaTree';
import { NO_COLLECT_META, NO_FISHING_META, type CollectMeta, type FishingMeta } from './meta/MetaHooks';
import { rollLoot } from './systems/FishTable';
import { saveAudioSettings, type AudioSettings } from './audio/AudioSettings';
import type { VitalLevels } from '../ui/VitalWarn';

/** Game 构造选项:联机时由 UI 传入网络会话与种子/初始存档 */
export type GameOptions = {
  /** 房主侧网络会话(提供种子,游戏创建后自动挂接) */
  host?: NetHost;
  /** 客人侧网络会话(welcome 已到达,Game 以 guest 模式运行) */
  guest?: NetGuest;
  /** 指定世界种子(房主大厅生成,与本地存档无关) */
  seeds?: { terrainSeed: number };
  /** 指定初始存档(null 表示开新档;缺省读 localStorage) */
  save?: SaveData | null;
};

export type HudSnapshot = {
  hunger: number;
  thirst: number;
  health: number;
  dead: boolean;
  /** 剩余箭数(弹药存储,持弓时工具按钮角标展示) */
  arrow: number;
  /** 剩余鱼饵数(弹药存储,持鱼竿时工具按钮角标展示) */
  bait: number;
  /** 手持围栏/围栏门时背包剩余个数(工具按钮角标) */
  heldFenceCount: number;
  /** 背包格子快照(空格为 null)与容量 */
  slots: InventorySlot[];
  capacity: number;
  hasAxe: boolean;
  hasPickaxe: boolean;
  hasHoe: boolean;
  hasFishingrod: boolean;
  hasBow: boolean;
  hasSword: boolean;
  /** 背包里有套索(或正牵着羊):工具按钮出现套索项 */
  hasLasso: boolean;
  /** 背包剩余套索数(持套索时角标展示) */
  lassoCount: number;
  /** 正牵着一只羊(工具按钮变为「打桩」) */
  leading: boolean;
  /** 身旁有被拴在桩上的羊(工具按钮变为「解开套索」) */
  nearTether: boolean;
  /** 各工具当前等级(0 未拥有、1 基础、2 高级) */
  toolTiers: Tools;
  /** 已制作过的配方 id(图鉴「已制作」标记与工作台列表展示) */
  craftedIds: CraftId[];
  /** 背包里是否有种子(可切换到种子播种) */
  /** 玩家在木箱旁(工具按钮变为木箱,点击打开储物面板) */
  nearCrate: boolean;
  /** 玩家在饵料桶旁(工具按钮变为饵料桶,点击打开投喂/收取面板) */
  nearBaitBarrel: boolean;
  /** 玩家在酿酒桶旁(工具按钮变为酿酒桶,点击打开投料/收取面板) */
  nearBrewBarrel: boolean;
  /** 玩家在冶炼炉旁(工具按钮变为冶炼炉,点击打开投料/收取面板) */
  nearSmelter: boolean;
  /** 玩家在纺织机旁(工具按钮变为纺织机,点击打开投料/收取面板) */
  nearLoom: boolean;
  /** 玩家在床旁(工具按钮变为床,点击开始睡觉) */
  nearBed: boolean;
  /** 睡觉过渡进行中与进度 */
  bedSleeping: boolean;
  bedSleepProgress: number;
  /** 身旁木箱的格子快照(不在木箱旁为 null) */
  crateSlots: InventorySlot[] | null;
  /** 身旁木箱的收纳格数(木箱 10 / 铁箱 20,不在木箱旁为 null) */
  crateCapacity: number | null;
  /** 身旁饵料桶的状态(桶内食物/鱼饵与发酵进度,不在桶旁为 null) */
  baitBarrelInfo: BaitBarrelInfo | null;
  /** 身旁酿酒桶的状态(桶内原料/酒与发酵进度,不在桶旁为 null) */
  brewBarrelInfo: BrewBarrelInfo | null;
  /** 身旁冶炼炉的状态(炉内矿石/铁锭与冶炼进度,不在炉旁为 null) */
  smelterInfo: SmelterInfo | null;
  /** 玩家在烹饪台旁(工具按钮变为烹饪台,点击打开烤制/煮汤面板) */
  nearCookingStation: boolean;
  /** 身旁烹饪台的状态(燃料/煮制队列/存放的汤品,不在台旁为 null) */
  cookingStationInfo: CookingStationInfo | null;
  /** 身旁纺织机的状态(机内绳线/布料与织布进度,不在机旁为 null) */
  loomInfo: LoomInfo | null;
  /** 四个装备栏位当前穿戴的道具(未装备为 null) */
  equipped: Record<EquipSlot, EquipKind | null>;
  gender: PlayerGender;
  tool: HandTool;
  craftId: CraftId | null;
  craftProgress: number;
  canCraftWorkbench: boolean;
  workbenchCrafting: boolean;
  workbenchProgress: number;
  /** 当前工作台等级 1-4(没有工作台为 0) */
  workbenchLevel: number;
  /** 玩家在的工作范围内(工具按钮变为工作台,点击打开制作面板) */
  nearWorkbench: boolean;
  /** 火堆卡片与搭建进度 */
  canCraftCampfire: boolean;
  /** 背包制作页的火堆入口条件(可制作,与卡片弹出条件无关:火堆数量不限) */
  canBuildCampfire: boolean;
  campfireCrafting: boolean;
  campfireProgress: number;
  /** 玩家在火堆旁(工具按钮变为火堆,点击打开火堆面板) */
  nearCampfire: boolean;
  /** 身旁火堆的状态(燃烧与否与剩余燃料),不在火堆旁为 null */
  campfireInfo: CampfireInfo | null;
  eatName: string | null;
  eatProgress: number;
  /** 空手站定等待自动切换工具的进度(0~1,0 表示未在等待) */
  autoEquipProgress: number;
  /** 联机死亡后的复活倒计时剩余秒数(房主权威),未在倒计时时为 null;单机波塞冬庇佑期间也复用该倒计时 */
  respawnLeft: number | null;
  /** 波塞冬的庇佑进行中(单机新手宽容期触发,死亡界面切海洋主题并倒计时复活) */
  poseidonGrace: boolean;
  /** 站在可钓点且手持鱼竿时出现钓鱼按钮 */
  canFish: boolean;
  /** 钓鱼进行中的阶段,空闲为 null */
  fishingState: FishingState | null;
  fishingProgress: number;
  /** 本轮奖池档位与等待期剩余秒数(客人端以此对齐咬钩时刻),非等待态为 null */
  fishingTier: number;
  fishingWaitLeft: number | null;
  /** 咬钩反应窗口进行中(点/连点屏幕收竿)与连点进度 */
  biteActive: boolean;
  biteClicks: number;
  biteNeed: number;
  /** 四档珍宝转盘的目标道具(非转盘态为 null,客人端随快照回流) */
  treasureKind: ResourceKind | null;
  /** 采集挖出的珍宝(碎石成金满级):非空时 HUD 弹珍宝转盘 */
  collectTreasure: ResourceKind | null;
  /** 玩家附近可捡回的掉落物,无时为 null */
  nearDrop: DropInfo | null;
  /** 通用临时提示(自动消失),如「背包满了」 */
  notice: { id: number; text: string } | null;
  /** 当前是第几天(跨过清晨计一天,睡觉跳夜也会推进) */
  day: number;
  /** 玩家正在移动或处于任一交互进行中(用于淡化非必要 HUD 按钮) */
  busy: boolean;
  /** 玩家正在移动(移动中不显示左侧弹出卡片) */
  moving: boolean;
  /** 房主权威计算的头顶交互提示；联机客人不在本地推进交互系统。 */
  indicator: { label: string | null; progress: number | null; color?: string };
  /** 当前生效的 buff(全局祝福 + 个人减速),点图标看效果 tip */
  buffs: HudBuff[];
};

const VIEW_SIZE = 18;

/** updateCamera 复用的注视点偏移临时向量 */
const _camOffset = new THREE.Vector3();

/** 拾取提示(玩家头顶飘图标):道具、数量与诞生时的屏幕坐标 */
export type PickupToast = { items: { kind: ResourceKind; count: number }[]; x: number; y: number };

/** 地图只读快照：UI 定时读取当前已同步到本机的玩家与放置物位置。 */
export type MapSnapshot = {
  island: { width: number; length: number };
  terrain: { columns: number; rows: number; pixels: Uint8Array };
  localPlayerId: string;
  players: { id: string; name: string; x: number; z: number; dead: boolean }[];
  workbenches: { x: number; z: number }[];
};

const AUTOSAVE_INTERVAL = 5; // 自动存档间隔(秒)
const AUTO_EQUIP_DELAY = 0.5; // 站定不动多久后自动切换到需要的工具(秒)
const SWORD_AUTO_EQUIP_DELAY = 1.5; // 持续移动且动物近身多久后自动切换到剑(秒)
const SWORD_AUTO_EQUIP_RANGE = 3; // 动物近身判定范围(米)
/** 被拴的羊/桩的「解开套索」按钮判定范围(米) */
const TETHER_RANGE = 2.2;
const IDLE_HIDE_DELAY = 5; // 玩家多久不移动/不交互后 HUD 才淡出(秒)
const MULTIPLAYER_RESPAWN_DELAY = 3;
/** 联机死亡掉落比例:三种丛类道具必定掉落,其余随身物品(含穿戴装备与工具)按此比例掉在原地 */
const DEATH_DROP_RATIO = 0.6;
/** 必定掉落的丛类道具(挖走待种回的植株) */
const PLANT_DROP_KINDS: readonly ResourceKind[] = ['berryBush', 'shrubBush', 'grassTuft'];
/** 熊吼/扑击声的可闻范围:声源距任意存活玩家不超过该米数才播放 */
const BEAR_SFX_RANGE = 20;

/* 会话可被占用的交互类别(isSessionBusy 排除自身时用) */
type InteractionKind =
  | 'collect'
  | 'milk'
  | 'crafting'
  | 'eating'
  | 'fishing'
  | 'archery'
  | 'sword'
  | 'lasso'
  | 'water'
  | 'workbench'
  | 'campfire'
  | 'crates'
  | 'baitBarrels'
  | 'brewBarrels'
  | 'waterPurifiers'
  | 'burrows'
  | 'smelters'
  | 'cookingStations'
  | 'looms'
  | 'fences'
  | 'beds'
  | 'shrines';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private loop = new GameLoop();
  /** 全部玩家会话(下标 0 为本地玩家;联机时由房主持有远程会话) */
  private sessions: PlayerSession[] = [];
  private mapTerrain?: MapSnapshot['terrain'];
  private local: PlayerSession;
  private props: Props;
  /** 本局已抽中过的珍宝(保底权重用,集齐全部珍宝后清空;房主权威,随存档持久化) */
  private drawnTreasures = new Set<ResourceKind>();
  /** 有饵连续未出四档的次数(四档保底,全体玩家共享,随存档持久化) */
  private tier4Pity = { count: 0 };
  private fx: Particles;
  private itemFly: ItemFlyFx;
  /** 玩家/桩与羊之间的系绳渲染(世界级,两端共用) */
  private leashLines: LeashLines;
  private audio = new GameAudio();

  /** UI 表现层直接播放音效(珍宝转盘的滚轮与中奖项),仅本地听感、无噪音语义 */
  playUiSfx(name: SfxName): void {
    this.audio.playLocal(name);
  }

  /** 获取地图表现所需的即时状态；客人端读取的玩家/设施均已由房主快照回流。 */
  getMapSnapshot(): MapSnapshot {
    if (!this.mapTerrain) {
      const columns = 100;
      const rows = 500;
      const pixels = new Uint8Array(columns * rows);
      for (let row = 0; row < rows; row++) {
        const z = -this.terrain.halfLength + ((row + 0.5) / rows) * this.terrain.length;
        for (let column = 0; column < columns; column++) {
          const x = -this.terrain.halfWidth + ((column + 0.5) / columns) * this.terrain.width;
          const water = this.terrain.getWaterKind(x, z);
          const height = this.terrain.getHeight(x, z);
          pixels[row * columns + column] = water === 'pond' ? 4 : water === 'sea' ? 0 : height < 0.05 ? 1 : height < 1.8 ? 2 : 3;
        }
      }
      this.mapTerrain = { columns, rows, pixels };
    }
    return {
      island: { width: this.terrain.width, length: this.terrain.length },
      terrain: this.mapTerrain,
      localPlayerId: this.local.id,
      players: this.sessions.map((session) => ({
        id: session.id,
        name: session.name,
        x: session.player.group.position.x,
        z: session.player.group.position.z,
        dead: session.survival.state.dead,
      })),
      workbenches: this.workbench.positions,
    };
  }
  private waterFx: WaterFx;
  private pondLife: PondLife;
  private decorations: Decorations;
  private footprints: Footprints;
  /** 单机/本地玩家专用入口:HUD、相机与本地交互都绑定在本地会话上 */
  private get player(): Player {
    return this.local.player;
  }
  private get survival(): SurvivalSystem {
    return this.local.survival;
  }
  private get inventory(): Inventory {
    return this.local.inventory;
  }
  private get equipment(): Equipment {
    return this.local.equipment;
  }
  /** 已拥有的工具(制作一次永久拥有,不进背包,供 HUD/自言自语/制作判断) */
  private get tools(): Tools {
    return this.local.tools;
  }
  private get collect(): CollectSystem {
    return this.local.collect;
  }
  private get crafting(): CraftingSystem {
    return this.local.crafting;
  }
  private get eating(): EatingSystem {
    return this.local.eating;
  }
  private get fishing(): FishingSystem {
    return this.local.fishing;
  }
  private get archery(): BowSystem {
    return this.local.archery;
  }
  private get water(): WaterSystem {
    return this.local.water;
  }
  private workbench: WorkbenchSystem;
  private crates: CrateSystem;
  private baitBarrels: BaitBarrelSystem;
  private brewBarrels: BrewBarrelSystem;
  private waterPurifiers: WaterPurifierSystem;
  private burrows: RabbitBurrowSystem;
  private smelters: SmelterSystem;
  private cookingStations: CookingStationSystem;
  private looms: LoomSystem;
  private fences: FenceSystem;
  private stakes: StakeSystem;
  private beds: BedSystem;
  private shrines: ShrineSystem;
  private meteor: MeteorSystem;
  private campfire: CampfireSystem;
  private lastFishingState: FishingState | null = null;
  /** 上次推送的 busy 状态,变化时立即推送让按钮淡出更跟手 */
  private lastBusy = false;
  private lastMoving = false;
  private lastBiteClicks = 0;
  private drops: DropSystem;
  private dayNight: DayNightSystem;
  private dayEvents: DayEventSystem;
  private weather: WeatherSystem;
  private rain: Rain;
  private rainImpact: RainImpact;
  private windFx: Wind;
  private terrain: IslandTerrain;
  private ocean: Ocean;
  private oceanDepth: OceanDepth;
  private waterDebug: WaterDebugOverlay;
  private crabs: Crabs;
  private butterflies: Butterflies;
  private birds: Birds;
  private wildlife: Wildlife;
  private dog: Pomeranian;
  private clouds: Clouds;
  private indicator: PlayerIndicator;
  private sun: THREE.DirectionalLight;
  private onHud: (snap: HudSnapshot) => void;
  private onLabel: (label: string | null, x: number, y: number, color?: string) => void;
  private onMumble: (text: string | null, x: number, y: number) => void;
  private onVitals: (vitals: VitalLevels | null, x: number, y: number) => void;
  private onPickup: (toast: PickupToast) => void;
  private onDamage: (amount: number, x: number, y: number) => void;
  private onDogEmoji: (emoji: string | null, x: number, y: number) => void;
  private terrainSeed: number;
  private autosaveTimer = 0;
  private mumbles: MumbleSystem;
  private mumbleText: string | null = null;
  private mumbleTimer = 0;
  private hudTimer = 0;
  private noticeId = 0;
  private notice: { id: number; text: string } | null = null;
  private netIndicator: HudSnapshot['indicator'] = { label: null, progress: null };
  /** 客人本地预测位置与房主快照的残留偏差(x,z),静止期间按指数衰减抹平 */
  private netDrift = new THREE.Vector2();
  /** 每个已发送输入对应的本地预测位置，用于按房主 ack 重放尚未确认的位移。 */
  private netInputHistory: { seq: number; x: number; z: number }[] = [];
  private netAckInputSeq = 0;
  /** 客人端进食特效已播放到的快照进度档(0~3) */
  private netEatTick = 0;
  private lastHurtSfxAt = -10;
  /** 游戏循环累计时间(音效节流用) */
  private loopElapsed = 0;
  private netIndicatorProgress: number | null = null;
  private netIndicatorVelocity = 0;
  private netIndicatorAt = 0;
  private autoEquipTimer = 0;
  private swordEquipTimer = 0;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;
  private hostRef: NetHost | null;
  private readonly guestNet: NetGuest | null;
  private netWorldRevision = 0;
  private netWorldMirror: WorldPatch | null = null;
  private netWorldResyncPending = false;
  private savedRemoteSessions: SessionSave[] = [];
  private readonly guestMode: boolean;
  /** 客人自己在房主侧的稳定玩家标识。 */
  private readonly youId: string | null;
  private activeNetActor: PlayerSession | null = null;
  private onBottleMessage: (text: string) => void;
  /** 波塞冬的庇佑进行中(单机新手宽容期死亡触发,倒计时结束后免清档复活并送上赠礼木箱) */
  private poseidonGrace = false;
  /** 本局波塞冬的庇佑是否已用过(单局仅一次,入档防读档刷新) */
  private poseidonGraceUsed = false;
  /** 局外养成「荒岛传承」的每日一次标记(跨天自动重置) */
  private readonly metaDaily = new MetaDaily();
  /** 击碎陨石挖出的珍宝(碎石成金满级):HUD 弹转盘,转完 claimCollectTreasure 入包 */
  private collectTreasure: ResourceKind | null = null;
  /** 局外养成只在单机生效:联机对局双方都不带加成,保持公平与同步简单 */
  private get metaOn(): boolean {
    return !this.hostRef && !this.guestMode;
  }
  /** 某养成节点的等级(联机恒 0) */
  private metaLevel(id: MetaNodeId): number {
    return this.metaOn ? MetaProgress.level(id) : 0;
  }

  constructor(
    container: HTMLElement,
    onHud: (snap: HudSnapshot) => void,
    onLabel: (label: string | null, x: number, y: number, color?: string) => void,
    onMumble: (text: string | null, x: number, y: number) => void,
    onVitals: (vitals: VitalLevels | null, x: number, y: number) => void,
    onPickup: (toast: PickupToast) => void,
    onDamage: (amount: number, x: number, y: number) => void,
    onDogEmoji: (emoji: string | null, x: number, y: number) => void,
    onBottleMessage: (text: string) => void,
    options: GameOptions = {}
  ) {
    this.container = container;
    this.hostRef = options.host ?? null;
    this.guestNet = options.guest ?? null;
    this.guestMode = !!options.guest;
    this.onHud = onHud;
    this.onLabel = onLabel;
    this.onMumble = onMumble;
    this.onVitals = onVitals;
    this.onPickup = onPickup;
    this.onDamage = onDamage;
    this.onDogEmoji = onDogEmoji;
    this.onBottleMessage = onBottleMessage;

    // 有存档则用存档里的世界种子重建同一座岛,否则随机生成一座新岛;
    // 联机时种子与初始状态来自网络(房主大厅的种子 / 客人的欢迎包),客人不读写本地存档
    const welcome = this.guestNet?.welcome ?? null;
    this.youId = welcome?.you ?? null;
    const seeds = welcome?.seeds ?? options.seeds;
    const save = this.guestMode
      ? (welcome?.state ?? null)
      : options.save !== undefined
        ? options.save
        : SaveSystem.load();
    this.terrainSeed = seeds?.terrainSeed ?? save?.terrainSeed ?? Math.random() * 1000;
    this.mumbles = new MumbleSystem((_trigger, text) => {
      this.mumbleText = text;
      this.mumbleTimer = 4;
    });

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // 允许浏览器恢复上下文；能否恢复取决于设备，记录现场以区分 GPU 丢失和逻辑异常。
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.resize();
    container.appendChild(this.renderer.domElement);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    // 正交相机从斜上方观察,2.5D 视角,随角色移动
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);

    this.scene.background = new THREE.Color('#a8d8ea');
    const hemi = new THREE.HemisphereLight('#cfe8ff', '#8a7a5a', 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff3d6', 1.6);
    sun.position.set(25, 35, 15);
    sun.castShadow = true;
    // 阴影范围罩住当前视野,位置在循环中跟随玩家
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun, sun.target);
    this.sun = sun;

    const terrain = new IslandTerrain(200, 1000, this.terrainSeed);
    this.terrain = terrain;
    this.scene.add(terrain.mesh);
    this.oceanDepth = new OceanDepth(terrain);
    this.ocean = new Ocean(terrain.seaLevel, this.oceanDepth);
    this.scene.add(this.ocean.mesh);
    this.waterDebug = new WaterDebugOverlay(terrain);
    this.scene.add(this.waterDebug.mesh);
    this.clouds = new Clouds(terrain.width, terrain.length);
    this.scene.add(this.clouds.group);
    this.props = new Props(this.scene, terrain, !save);
    this.fx = new Particles(this.scene);
    this.waterFx = new WaterFx(this.scene, this.fx);
    // 入包表现的目标点:玩家后背(朝向反方向、肩部高度),玩家移动时终点实时跟随
    this.itemFly = new ItemFlyFx(this.scene, () => this.itemFlyTargetFor(this.local)());

    this.scene.add(terrain.waterGroup);
    this.footprints = new Footprints(this.scene, terrain);
    this.pondLife = new PondLife(this.scene, terrain);
    this.decorations = new Decorations(this.scene, terrain, this.terrainSeed);
    this.local = new PlayerSession(
      new Player(terrain, terrain.findSpawnPoint(), this.waterFx, this.footprints),
      this.youId ?? undefined,
      this.guestMode ? '我' : this.hostRef ? (loadNickname() || '房主') : '我'
    );
    // 自己的头顶不显示名牌，避免与作业提示和自言自语重叠。
    this.local.nameTag.sprite.visible = false;
    this.sessions.push(this.local);
    this.fences = new FenceSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走围栏/门时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时放置/挖掘让位
      (actor) => this.isSessionBusy(actor, 'fences')
    );
    this.player.setObstacles(this.props, this.fences);
    this.scene.add(this.player.group);
    // 拴羊桩(牵着羊点工具按钮在脚下打桩)与系绳渲染
    this.stakes = new StakeSystem(this.scene, terrain);
    this.leashLines = new LeashLines(this.scene);
    this.crabs = new Crabs(
      this.scene,
      terrain,
      // 螃蟹躲着所有玩家跑,联机时客人靠近同样会惊跑
      () => this.sessions.map((s) => s.player.group.position),
      // 挡玩家的物件也挡地上的动物(成树/树桩/大石/围栏),鸟和蝴蝶会飞不受限
      (x, z) => this.isGroundBlocked(x, z),
      // 受击未死:广播给客人补播闪红
      (id) => this.hostRef?.broadcastEvent({ kind: 'creatureHit', target: 'crab', id })
    );
    // 蝴蝶会被场上任意玩家惊飞(联机时客人靠近同样惊飞)
    this.butterflies = new Butterflies(
      this.scene,
      this.props,
      () => this.sessions.filter((s) => !s.survival.state.dead).map((s) => s.player)
    );
    this.birds = new Birds(
      this.scene,
      this.terrain,
      this.props,
      () => this.sessions.filter((s) => !s.survival.state.dead).map((s) => s.player),
      // 受击未死:广播给客人补播闪红
      (id) => this.hostRef?.broadcastEvent({ kind: 'creatureHit', target: 'bird', id })
    );
    // 熊扑击玩家的结算:装备防御减伤(至少 1 点)+ 头顶伤害数字 + 泛红特效与音效
    this.wildlife = new Wildlife(
      this.scene,
      terrain,
      () => this.sessions.map((s) => s.player),
      (player: Player, damage: number, pounce?: boolean) => {
        this.applyWildlifeHit(this.sessionOf(player), damage, !!pounce);
      },
      (animalId) => this.hostRef?.broadcastEvent({ kind: 'wildlifeAttack', animalId }),
      // 动物受击未死:广播给客人补播闪红
      (animalId) => this.hostRef?.broadcastEvent({ kind: 'creatureHit', target: 'wildlife', id: animalId }),
      (x, y, z) => this.hostRef?.broadcastEvent({ kind: 'collectFx', x, y, z, color: '#b3a284', count: 10 }),
      // 鳄鱼跃出水面的水花:广播给客人各自按位置补播
      (x, y, z) => this.hostRef?.broadcastEvent({ kind: 'crocodileBurst', x, y, z }),
      (player: Player) => {
        const session = this.sessionOf(player);
        return !session.survival.state.dead && !player.isSwimming && !player.isSleeping;
      },
      // 熊的咆哮/扑击扬尘等粒子与音效;吼声按声源位置判定:本地(房主)玩家距声源 20 米内才播放,
      // 并广播给客人各自按自己位置判定——每个端只听自己 20 米内的熊声
      this.fx,
      (name, x, z) => {
        const p = this.player.group.position;
        if (Math.hypot(p.x - x, p.z - z) <= BEAR_SFX_RANGE) this.audio.play(name);
        this.hostRef?.broadcastEvent({ kind: 'sfxAt', sfx: name, x, y: 1, z });
      },
      // 挡玩家的物件也挡动物:围栏圈得住,成树/树桩/大石绕着走
      (x, z) => this.isGroundBlocked(x, z),
      Math.random,
      // 营地判定:篝火 6 米内不刷新动物,新个体不在玩家的营地出现
      // (Wildlife 先于 CampfireSystem 构造,初始生成时篝火尚未建立)
      (x, z) => this.campfire?.positions.some((c) => Math.hypot(c.x - x, c.z - z) < 6) ?? false,
      // 局外养成「捕猎·猎手」剥取:击杀战利品在掉落前按等级加成改写
      (species, loot) => this.applyHuntLootMeta(species, loot)
    );
    // 兔子洞:每个兔子栖息地 1~2 个,受惊的兔子钻进去躲藏,锄头挖开可压死藏在内的兔子。
    // 客人端不本地生成,由房主的世界快照(欢迎包/世界增量)补建
    this.burrows = new RabbitBurrowSystem(
      this.scene,
      terrain,
      this.fx,
      // 洞挖开:藏在内的兔子被塌方压死,战利品像普通猎杀一样散落在洞口周围
      (x, z) => {
        const killed = this.wildlife.killHidden(x, z);
        this.local.stats.kills += killed;
        for (let i = 0; i < killed; i++) {
          this.wildlife.lootOf('rabbit').forEach((item, j) => {
            const angle = ((i + j) / (killed + 1)) * Math.PI * 2;
            this.drops.dropAt(item.kind, item.count, x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6);
          });
        }
      },
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'burrows')
    );
    if (!this.guestMode) {
      this.burrows.generateFor(this.wildlife.rabbitHomes());
      this.wildlife.setBurrowSource(this.burrows);
    }
    // 拴绳的联机接线:持绳玩家 → 会话 id(姿态快照用)
    this.wildlife.setPlayerIdResolver((p) => this.sessionOf(p).id);
    // 砍树/采石/敲打/放箭的声响会惊动附近的动物:熊循声警戒,食草动物逃离
    this.audio.onSfx = (name) => {
      if (name === 'chop' || name === 'mine' || name === 'knock' || name === 'shoot') {
        const pos = this.player.group.position;
        this.wildlife.startle(pos.x, pos.z);
      }
      if (this.hostRef) {
        const actor = this.activeNetActor ?? this.local;
        const p = actor.player.group.position;
        this.hostRef.broadcastEvent({ kind: 'feedback', sfx: name, actor: actor.id, x: p.x, y: p.y + 1, z: p.z });
      }
    };
    // 黑色博美伴侣:出生在玩家身旁,闻到肉块会跑去吃,平时跟着玩家或在身边自己玩
    this.dog = new Pomeranian(
      this.scene,
      terrain,
      this.player,
      this.fx,
      this.waterFx,
      (x, z) => this.isGroundBlocked(x, z)
    );
    this.indicator = new PlayerIndicator(this.camera, this.scene);

    // Q 键作为桌面端补充的工具切换
    window.addEventListener('keydown', this.onKeyDown);

    this.workbench = new WorkbenchSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走工作台道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'workbench')
    );
    this.crates = new CrateSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走木箱与箱内物品入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'crates')
    );
    this.baitBarrels = new BaitBarrelSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 收取鱼饵/挖回饵料桶与桶内食物入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'baitBarrels')
    );
    this.brewBarrels = new BrewBarrelSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 收取的酒/挖回酿酒桶与桶内原料入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'brewBarrels')
    );
    this.waterPurifiers = new WaterPurifierSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖回净化器入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'waterPurifiers')
    );
    this.smelters = new SmelterSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 收取铁锭/挖回冶炼炉与炉内矿石入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'smelters')
    );
    this.cookingStations = new CookingStationSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 收取汤品/挖回烹饪台与锅里食材入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'cookingStations')
    );
    this.looms = new LoomSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 收取布料/挖回纺织机与机内绳线入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'looms')
    );
    this.beds = new BedSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走床时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'beds')
    );
    this.campfire = new CampfireSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'campfire'),
      // 烹饪好的食物背包放不下时掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 场上已有烹饪台时不再弹火堆卡片
      () => this.cookingStations.count > 0
    );
    this.shrines = new ShrineSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走神像时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'shrines')
    );
    this.drops = new DropSystem(this.scene, this.terrain, this.fx, this.audio);
    this.attachSessionSystems(this.local);

    this.dayNight = new DayNightSystem(sun, hemi, this.scene);
    // 天数事件:仅房主端结算,刷新的狼/熊经动物姿态快照回流客人
    this.dayEvents = new DayEventSystem(
      this.dayNight,
      this.wildlife,
      () => this.sessions,
      (session, count) => this.notify(`夜色里传来低吼——${count} 头狼盯上了你!`, session),
      (count) => this.sysNotify(`夜幕中传来熊的咆哮……(${count} 头熊出没)`)
    );
    this.meteor = new MeteorSystem(
      this.scene,
      terrain,
      this.props,
      this.player,
      this.dayNight,
      this.fx
    );
    // 天气在昼夜之后更新,对光照与天空做调制
    this.weather = new WeatherSystem(sun, hemi, this.scene);
    this.rain = new Rain();
    this.scene.add(this.rain.lines);
    this.rainImpact = new RainImpact(terrain, this.waterFx, this.fx);
    this.windFx = new Wind();
    this.scene.add(this.windFx.mesh);

    this.loop.add({
      update: (delta, elapsed) => {
        this.loopElapsed = elapsed;
        // 单机拍照模式:时间与全部玩法模拟冻结(玩家无敌),相机取景与渲染照常
        const simDelta = this.photo.active && !this.guestMode && !this.hostRef ? 0 : delta;
        for (const session of this.sessions) session.player.update(simDelta, elapsed);
        this.dayNight.update(simDelta);
        this.crates.update(simDelta);
        this.meteor.update(simDelta);
        this.weather.update(simDelta);
        updateSeasonSnow(simDelta);
        this.audio.setNight(this.dayNight.isNight);
        this.audio.setRainIntensity(this.weather.rainIntensity);
        this.rain.update(delta, this.player.group.position, this.weather.rainIntensity);
        this.rainImpact.update(delta, this.player.group.position, this.weather.rainIntensity);
        this.clouds.update(delta);
        this.terrain.updateWater(elapsed);
        this.waterDebug.mesh.visible = GmSystem.showWaterDebug;
        if (!this.guestMode) {
          this.crabs.update(simDelta, elapsed);
          this.butterflies.update(simDelta, elapsed);
          this.birds.update(simDelta, elapsed);
          this.wildlife.update(simDelta, elapsed);
          this.dayEvents.update();
          this.dog.update(simDelta, elapsed, this.drops, this.dayNight.isNight);
        } else {
          this.crabs.netUpdate(delta, elapsed);
          this.birds.netUpdate(delta, elapsed);
          this.wildlife.netUpdate(delta, elapsed);
          this.dog.netUpdate(delta, elapsed);
        }
        this.props.update(simDelta, elapsed, this.weather.wind, !this.guestMode);
        this.windFx.update(delta, this.player.group.position, this.weather.wind);
        this.fx.update(delta);
        this.itemFly.update(simDelta);
        this.waterFx.update(delta);
        this.pondLife.update(delta, elapsed);
        this.footprints.update(simDelta);
        // 各会话:生存结算与个人交互系统(采集/制作/进食/钓鱼/弓/喝水/挖掘/搭建);
        // 客人端不跑权威模拟,全部由房主快照驱动
        for (const s of this.guestMode ? [] : this.sessions) {
          this.activeNetActor = s;
          // 客人放箭的动作快照:客人射箭在客人端判定,房主按 arrowShot 动作补放箭动画窗口
          if (s !== this.local) {
            if (s.shotAnimLeft > 0) {
              s.shotAnimLeft = Math.max(0, s.shotAnimLeft - simDelta);
              s.player.setAction(s.shotAnimLeft > 0 ? 'shoot' : null);
            }
          }
          // 交互音效只给发起者本人听:远程会话的模拟音效本地静音,只广播给对应客人补播
          this.audio.silent = s !== this.local;
          // 雨神祭坛光环内口渴值冻结(口渴速率归零,饥饿不受影响)
          const rainAltar = this.shrines.inAura('rainAltar', s.player.group.position);
          s.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;
          s.survival.thirstDrainMultiplier =
            this.weather.thirstDrainMultiplier * s.equipment.thirstMultiplier() * (rainAltar ? 0 : 1);
          s.survival.swimming = s.player.isSwimming;
          s.survival.sleeping = s.player.isSleeping;
          // 治愈水晶光环内每 10 秒回复 1 血(与生存结算同源,数值随玩家快照回流客人)
          if (
            !s.survival.state.dead &&
            this.shrines.inAura('healCrystal', s.player.group.position)
          ) {
            s.healTick += simDelta;
            if (s.healTick >= 10) {
              s.healTick -= 10;
              s.survival.state.health = Math.min(100, s.survival.state.health + 1);
            }
          } else {
            s.healTick = 0;
          }
          s.survival.update(simDelta);
          // 血量下降(受击/饥饿/溺水)触发角色模型闪红与受伤音(音效带间隔节流,持续掉血不成串响)
          if (s.survival.state.health < s.lastHealth - 0.001) {
            s.player.hurt();
            if (s === this.local) {
              s.hurtSoundTimer -= simDelta;
              if (s.hurtSoundTimer <= 0) {
                this.audio.play('hurt');
                s.hurtSoundTimer = 1.5;
              }
            }
          }
          s.lastHealth = s.survival.state.health;
          s.player.setHealth(s.survival.state.health);
          // 权威端为每个会话累计闲置时长(本地 pushHud 与客人的 hudFor 共用),活跃时清零
          s.hudIdleTime = this.isSessionActive(s) ? 0 : s.hudIdleTime + simDelta;
          if (s.survival.state.dead) {
            if (!this.guestMode && s.respawnLeft > 0) {
              s.respawnLeft = Math.max(0, s.respawnLeft - simDelta);
              if (s.respawnLeft === 0) {
                if (this.poseidonGrace && !this.hostRef && s === this.local) this.poseidonReviveSession(s);
                else this.respawnMultiplayerSession(s);
              }
            }
            continue;
          }
          s.collect.update(simDelta);
          s.milk.update(simDelta);
          s.crafting.update(simDelta);
          // 工作台配方离台即中断(小幅挪动可能未触发移动中断)
          if (
            s.crafting.isWorking &&
            s.crafting.currentRecipe?.station === 'workbench' &&
            !this.workbench.isNear(s)
          ) {
            s.crafting.cancel();
          }
          s.eating.update(simDelta);
          s.fishing.update(simDelta, this.isSessionBusy(s, 'fishing'));
          // 弓由玩家移动瞄准操控:只有本地玩家自己跑(客人的弓在客人端判定,结果上行结算);套索同理
          if (s === this.local) {
            s.archery.update(simDelta, this.isSessionBusy(s, 'archery') || s.survival.state.dead);
            s.sword.update(simDelta, this.isSessionBusy(s, 'sword') || s.survival.state.dead);
            s.lasso.update(simDelta, this.isSessionBusy(s, 'lasso') || s.survival.state.dead);
          } else {
            // 远程玩家的弓不跑瞄准逻辑,但 arrowShot 复现的视觉箭矢要照常飞行与消失;
            // 剑的 swordHit 复现挥砍动作窗口、套索的 lassoThrown 复现绳圈也要照常推进
            s.archery.updateVisuals(simDelta);
            s.sword.updateVisuals(simDelta);
            s.lasso.updateVisuals(simDelta);
          }
          s.water.update(simDelta, this.isSessionBusy(s, 'water'), !!this.waterPurifiers.nearby(s));
          this.crates.updateActor(s, simDelta);
          this.baitBarrels.updateActor(s, simDelta);
          this.brewBarrels.updateActor(s, simDelta);
          this.waterPurifiers.updateActor(s, simDelta);
          this.burrows.updateActor(s, simDelta);
          this.smelters.updateActor(s, simDelta);
          this.cookingStations.updateActor(s, simDelta);
          this.looms.updateActor(s, simDelta);
          this.fences.updateActor(s, simDelta);
          this.beds.updateActor(s, simDelta);
          this.shrines.updateActor(s, simDelta);
          this.workbench.updateActor(s, simDelta);
          this.campfire.updateActor(s, simDelta);
          // 手里的种子/围栏用光后自动收起,回到空手
          if (s.player.currentTool !== 'hand' && !this.hasToolFor(s, s.player.currentTool)) {
            s.player.setTool('hand');
          }
        }
        this.activeNetActor = null;
        this.audio.silent = false;
        // 局外养成的每日一次标记跨天重置
        this.metaDaily.ensure(this.dayNight.day);
        // 睡觉过渡中:天空随进度日夜流转(多人同时睡取最先入睡者的进度)
        for (const s of this.sessions) {
          const sleepProgress = this.beds.getSleepProgress(s);
          if (sleepProgress !== null) {
            this.dayNight.setSleepProgress(sleepProgress);
            break;
          }
        }
        this.fences.update(simDelta, this.sessions.map((s) => s.player.group.position));
        this.campfire.update(simDelta, elapsed);
        this.shrines.update(simDelta, elapsed);
        this.baitBarrels.update(simDelta, elapsed, !this.guestMode);
        this.brewBarrels.update(simDelta, elapsed, !this.guestMode);
        this.waterPurifiers.update(simDelta, elapsed);
        this.burrows.update(simDelta, !this.guestMode);
    this.smelters.update(simDelta, elapsed, !this.guestMode);
    this.cookingStations.update(simDelta, elapsed, !this.guestMode);
    this.looms.update(simDelta, elapsed, !this.guestMode);
        this.drops.update(simDelta, elapsed);
        this.mumbles.update(delta, {
          elapsed,
          dead: this.survival.state.dead,
          hunger: this.survival.state.hunger,
          thirst: this.survival.state.thirst,
          health: this.survival.state.health,
          phase: this.dayNight.state.phase,
          day: this.dayNight.day,
          rainIntensity: this.weather.rainIntensity,
          windIntensity: this.weather.windIntensity,
          freeSlots: this.inventory.freeSlots,
          branch: this.inventory.count('branch'),
          stone: this.inventory.count('stone'),
          tools: this.tools,
          collecting: this.collect.isWorking,
          workbenchCount: this.workbench.count,
          smelterCount: this.smelters.count,
          loomCount: this.looms.count,
          cookingCount: this.cookingStations.count,
          bedCount: this.beds.count,
          hasCookable: COOKABLE_KINDS.some((k) => this.inventory.count(k) > 0),
          bottle: this.inventory.count('bottle'),
          meteorActive: this.meteor.active,
        });
        this.updateIndicator(simDelta);
        this.updateLeashLines();
        this.updateCamera(delta);
        this.ocean.update(this.camera, elapsed);
        this.renderer.render(this.scene, this.camera);
        for (const s of this.sessions) {
          if (s.survival.state.dead && !s.lastDead) {
            // 倒下时松开手里的绳子:套索掉在羊脚下,羊恢复野生
            const led = this.wildlife.leashedBy(s.player);
            if (led) {
              this.wildlife.releaseLeash(led.id);
              this.drops.dropAt('lasso', 1, led.x, led.z);
            }
            // 背包里有复活石则碎裂一颗,免惩罚在出生点原地苏醒(客人端死亡表现由快照驱动)
            if (this.guestMode || !this.tryReviveWithStone(s)) {
              s.player.setDead();
              if (this.hostRef) {
                this.dropDeathLoot(s);
                s.respawnLeft = MULTIPLAYER_RESPAWN_DELAY;
                this.sysNotify(`${s.name} 倒下了`);
              }
              if (s === this.local) {
                this.audio.play('death');
                // 死亡瞬间清摇杆(死亡界面会卸载摇杆,残留的最后输入会让复活后持续移动)
                this.setJoystick(0, 0);
                // 单机死亡:新手宽容期内可能触发波塞冬的庇佑(倒计时后免清档复活);
                // 否则先结算战绩供死亡界面分享,再清档。联机玩家由房主在倒计时结束后重生。
                if (!this.hostRef && !this.guestMode) {
                  if (!this.poseidonGraceUsed && this.dayNight.day <= POSEIDON_GRACE_DAYS && Math.random() < POSEIDON_GRACE_CHANCE) {
                    this.poseidonGrace = true;
                    this.poseidonGraceUsed = true;
                    s.respawnLeft = MULTIPLAYER_RESPAWN_DELAY;
                  } else {
                    this.deathReport = this.buildDeathReport(s);
                    SaveSystem.clear();
                  }
                }
              }
            }
          }
          s.lastDead = s.survival.state.dead;
        }
        if (!this.guestMode && this.sessions.some((s) => !s.survival.state.dead)) {
          this.autosaveTimer += delta;
          if (this.autosaveTimer >= AUTOSAVE_INTERVAL) {
            this.autosaveTimer = 0;
            SaveSystem.save(this.collectSave());
          }
        }
        if (!this.guestMode) this.pushHud(delta);
        this.flushPickups();
        // 客人端不跑权威采集模拟,但自动切工具需要近旁资源点判定,本地只做扫描
        if (this.guestMode) {
          this.collect.scanNearby();
          // 客人的弓在本地完整跑瞄准/飞行/命中判定,命中结果上行房主权威结算;
          // 远程玩家的弓不在此端模拟(其放箭声效由房主 feedback 事件补播)
          this.local.archery.update(
            delta,
            this.isSessionBusy(this.local, 'archery') || this.survival.state.dead
          );
          // 客人的剑同样在本地完整跑索敌与命中判定,命中结果上行房主权威结算
          this.local.sword.update(
            delta,
            this.isSessionBusy(this.local, 'sword') || this.survival.state.dead
          );
          // 客人的套索同样在本地完整跑瞄准/飞行/命中判定,结果上行房主权威结算
          this.local.lasso.update(
            delta,
            this.isSessionBusy(this.local, 'lasso') || this.survival.state.dead
          );
          for (const s of this.sessions) {
            // 远程玩家(房主)的弓只推进 arrowShot 复现的视觉箭矢,套索推进 lassoThrown 复现的绳圈
            if (s !== this.local) {
              s.archery.updateVisuals(delta);
              s.lasso.updateVisuals(delta);
            }
            // 纯表现:钓鱼线/围栏落点预览的结算在房主,客人端本地复现画面;
            // 复现期间静音——本人的音效已由房主 feedback 事件补播,这里再播会重一声,
            // 远程玩家的交互音效按设计只给发起者本人听
            this.audio.silent = true;
            s.fishing.update(delta, false);
            this.fences.updatePreviewFor(s);
          }
          this.audio.silent = false;
        }
        // 客人静止期间把本地预测位置的残留偏差向房主快照柔和抹平(移动中不干预,避免和输入打架)
        if (this.guestMode && !this.player.isMoving && this.netDrift.lengthSq() > 1e-8) {
          const k = 1 - Math.exp(-3 * delta);
          this.player.group.position.x += this.netDrift.x * k;
          this.player.group.position.z += this.netDrift.y * k;
          this.netDrift.multiplyScalar(1 - k);
        }
        this.updateAutoEquip(delta);
        this.updateSwordAutoEquip(delta);
      },
    });

    this.applySave(save);
    if (this.hostRef) {
      this.bindWorldChangeSinks();
      this.hostRef.attach(this);
      this.hookHostNotices(this.hostRef);
    }
    if (this.guestNet) {
      this.guestNet.onPlayers = (m) => this.netApplyPlayers(m);
      this.guestNet.onInputSent = (seq) => {
        const pos = this.player.group.position;
        this.netInputHistory.push({ seq, x: pos.x, z: pos.z });
        if (this.netInputHistory.length > 256) this.netInputHistory.shift();
      };
      this.guestNet.onAnimals = (list) => this.netApplyAnimals(list);
      this.guestNet.onAmbient = (state) => this.netApplyAmbient(state);
      this.netWorldMirror = this.netWorldState();
      this.netWorldRevision = this.guestNet.welcome?.worldRevision ?? 0;
      this.guestNet.onWorldDelta = (revision, ops) => this.netApplyWorldDelta(revision, ops);
      this.guestNet.onWorldFull = (revision, state) => this.netApplyWorldFull(revision, state);
      this.guestNet.onHud = (snap) => this.netApplyHud(snap);
      this.guestNet.onEvent = (event) => this.netApplyEvent(event);
      this.guestNet.begin();
    }
  }

  /** 房主侧当前玩家顺序，欢迎包用它对应初始存档。 */
  sessionIds(): string[] {
    return this.sessions.map((session) => session.id);
  }

  /** 单机中途转联机:挂接已创建房间的 NetHost,世界种子与快照广播自此生效,之后来客走正常欢迎流程。 */
  bindHost(host: NetHost): void {
    if (this.hostRef || this.guestMode) return;
    this.hostRef = host;
    host.terrainSeed = this.terrainSeed;
    // 单机时本地角色叫「我」,转为房主后对客人显示联机昵称
    this.local.setName(loadNickname() || '房主');
    this.bindWorldChangeSinks();
    host.attach(this);
    this.hookHostNotices(host);
  }

  /** 房主侧:客人加入/离开时向所有玩家广播全局提示 */
  private hookHostNotices(host: NetHost): void {
    host.onGuestJoined = (name) => this.sysNotify(`${name} 加入了游戏`);
    host.onGuestLeft = (name) => this.sysNotify(`${name} 离开了游戏`);
  }

  /** 房主恢复旧联机岛后，按昵称优先认领此前保存的队友角色；excludeIds 为仍在断线保留期内的角色。 */
  claimSavedRemoteSession(name: string, excludeIds: string[] = []): PlayerSession | null {
    const pool = this.savedRemoteSessions.filter((session) => !excludeIds.includes(session.id));
    const index = pool.findIndex((session) => session.name === name) || (pool.length ? 0 : -1);
    if (index < 0) return null;
    const [saved] = pool.splice(index, 1);
    const session = this.addRemoteSession(false, saved.id, name);
    this.applyPlayerSave(session, saved);
    session.setName(name);
    return session;
  }

  /** 房主侧:客人断线即把角色移出世界,离场快照保留在待恢复列表(仍计入存档) */
  suspendRemoteSession(session: PlayerSession): SessionSave {
    const save = this.collectPlayerSave(session);
    this.savedRemoteSessions.push(save);
    this.removeRemoteSession(session);
    return save;
  }

  /** 房主侧:断线客人凭恢复令牌重连,按离场快照原样重建角色 */
  resumeRemoteSession(data: SessionSave, name: string): PlayerSession {
    this.savedRemoteSessions = this.savedRemoteSessions.filter((s) => s.id !== data.id);
    const session = this.addRemoteSession(false, data.id, name);
    this.applyPlayerSave(session, data);
    session.setName(name);
    return session;
  }

  /** 房主侧:玩家快照消息(姿态/个人状态/昼夜/天气) */
  netPlayersState() {
    const wind = this.weather.wind;
    return {
      time: this.dayNight.time,
      day: this.dayNight.day,
      weather: this.weather.rainIntensity > 0.05 ? 'rain' : 'sunny',
      rain: this.weather.rainIntensity,
      windAmount: this.weather.windIntensity,
      windDirX: wind.dirX,
      windDirZ: wind.dirZ,
      list: this.sessions.map((s): PlayerState => {
        const p = s.player.group.position;
        const sv = s.survival.state;
        return {
          id: s.id,
          name: s.name,
          x: p.x,
          y: p.y,
          z: p.z,
          rotY: s.player.group.rotation.y,
          tool: s.player.currentTool as string,
          toolTier: (s.tools as Record<string, number>)[s.player.currentTool],
          hunger: sv.hunger,
          thirst: sv.thirst,
          health: sv.health,
          stamina: sv.stamina,
          equipped: s.equipment.snapshot(),
          gender: s.player.currentGender,
          dead: sv.dead,
          action: s.player.currentAction,
          refresh: Math.round(s.player.refreshSeconds),
          tipsy: Math.round(s.player.tipsySeconds),
        };
      }),
    };
  }

  /** 房主侧:动物快照消息 */
  netAnimalsState(): AnimalPose[] {
    return this.wildlife.netPoses();
  }

  netCombatAnimalsState(): AnimalPose[] {
    return this.wildlife.netCombatPoses();
  }

  netPassiveAnimalsState(): AnimalPose[] {
    return this.wildlife.netPassivePoses();
  }

  netAmbientState(): AmbientState {
    return {
      crabs: this.crabs.netPoses(),
      birds: this.birds.netPoses(),
        butterflies: this.butterflies.netPoses(),
        dog: this.dog.netPose(),
    };
  }

  /** 联机世界离散状态；连续倒计时不入网络比较。 */
  netWorldState(): WorldPatch {
    return {
      props: this.props.snapshot().map(({ regrowLeft: _, ...prop }) => prop),
      campfires: this.campfire.snapshot(),
      workbenches: this.workbench.snapshot(),
      workbenchCrafted: this.workbench.hasCrafted,
      crates: this.crates.snapshot(),
      baitBarrels: this.baitBarrels.snapshot(),
      brewBarrels: this.brewBarrels.snapshot(),
      waterPurifiers: this.waterPurifiers.snapshot(),
      smelters: this.smelters.snapshot(),
      cookingStations: this.cookingStations.snapshot(),
      looms: this.looms.snapshot(),
      fences: this.fences.snapshotFences(),
      fenceGates: this.fences.snapshotGates(),
      beds: this.beds.snapshot(),
      shrines: this.shrines.snapshot(),
      stakes: this.stakes.snapshot(),
      drops: this.drops.snapshot(),
      burrows: this.burrows.netSnapshot(),
    };
  }

  private bindWorldChangeSinks(): void {
    const send = (section: keyof WorldPatch) =>
      (change: import('./systems/WorldEntityId').EntityChange) => this.hostRef?.broadcastWorldChange(section, change);
    this.props.setChangeSink(send('props'));
    this.campfire.setChangeSink(send('campfires'));
    this.workbench.setChangeSink((change) => {
      send('workbenches')(change);
      if (change.op === 'add' && this.workbench.hasCrafted) {
        send('workbenchCrafted')({ op: 'set', id: '', fields: { value: true } });
      }
    });
    this.crates.setChangeSink(send('crates'));
    this.baitBarrels.setChangeSink(send('baitBarrels'));
    this.brewBarrels.setChangeSink(send('brewBarrels'));
    this.waterPurifiers.setChangeSink(send('waterPurifiers'));
    this.burrows.setChangeSink(send('burrows'));
    this.smelters.setChangeSink(send('smelters'));
    this.cookingStations.setChangeSink(send('cookingStations'));
    this.looms.setChangeSink(send('looms'));
    this.fences.setChangeSinks(send('fences'), send('fenceGates'));
    this.beds.setChangeSink(send('beds'));
    this.shrines.setChangeSink(send('shrines'));
    this.stakes.setChangeSink(send('stakes'));
    this.drops.setChangeSink(send('drops'));
  }

  private netApplyWorldDelta(revision: number, ops: WorldDeltaOp[]): void {
    if (!this.netWorldMirror || revision <= this.netWorldRevision || this.netWorldResyncPending) return;
    if (revision !== this.netWorldRevision + 1) {
      this.netWorldResyncPending = true;
      this.guestNet?.requestWorldResync(this.netWorldRevision);
      return;
    }
    this.netWorldRevision = revision;
    const changed = applyWorldDelta(this.netWorldMirror, ops);
    const propOps = ops.filter((op) => op.section === 'props');
    const propsAppliedInPlace = propOps.length > 0 && this.props.applyNetDelta(propOps);
    const patch: WorldPatch = {};
    for (const section of changed) {
      if (section === 'props' && propsAppliedInPlace) continue;
      Object.assign(patch, { [section]: this.netWorldMirror[section] });
    }
    // 围栏系统会统一重建柱、横杆、门和阻挡线，任一集合变化都要带上另一份镜像。
    if (changed.has('fences') || changed.has('fenceGates')) {
      patch.fences = this.netWorldMirror.fences;
      patch.fenceGates = this.netWorldMirror.fenceGates;
    }
    this.netApplyWorld(patch);
  }

  private netApplyWorldFull(revision: number, state: WorldPatch): void {
    this.netWorldMirror = state;
    this.netWorldRevision = revision;
    this.netWorldResyncPending = false;
    this.netApplyWorld(state);
  }

  /** 客人侧:应用房主的玩家快照(自己只在大偏差时校正,其余遥控插值) */
  netApplyPlayers(msg: Extract<NetMsg, { t: 'players' }>): void {
    const { time, day } = msg;
    if (time !== undefined) this.dayNight.time = time;
    if (day !== undefined) this.dayNight.day = day;
    // 天气与风采用房主权威值,本地只做表现插值(不再随机轮换/重掷风向)
    if (msg.rain !== undefined && msg.windAmount !== undefined && msg.windDirX !== undefined && msg.windDirZ !== undefined) {
      this.weather.netSync(msg.rain, msg.windAmount, msg.windDirX, msg.windDirZ);
    }
    const list = msg.players.full ?? [];
    const liveIds = new Set(list.map((p) => p.id));
    for (const session of [...this.sessions]) {
      if (session !== this.local && !liveIds.has(session.id)) this.removeRemoteSession(session);
    }
    for (const p of list) {
      let s = this.sessions.find((session) => session.id === p.id);
      if (!s) s = this.addRemoteSession(true, p.id, p.name);
      s.setName(s === this.local ? '我' : p.name);
      s.player.setGender(p.gender ?? 'boy');
      if (s !== this.local && SLOT_ORDER.some((slot) => s.equipment.getEquipped(slot) !== p.equipped[slot])) {
        s.equipment.restore(p.equipped, s.inventory);
      }
      if (s === this.local) {
        const pos = s.player.group.position;
        let targetX = p.x;
        let targetZ = p.z;
        if (msg.ackInputSeq >= this.netAckInputSeq) {
          this.netInputHistory = this.netInputHistory.filter((sample) => sample.seq > msg.ackInputSeq);
          this.netAckInputSeq = msg.ackInputSeq;
          // 房主位置只包含 ack 以前的输入；保留首个未确认输入发出以后客户端实际预测出的位移。
          // 该位移已经经过本地碰撞约束，比脱离 Player 系统按速度重新积分更贴近真实运动。
          const firstPending = this.netInputHistory[0];
          if (firstPending) {
            targetX += pos.x - firstPending.x;
            targetZ += pos.z - firstPending.z;
          }
        } else {
          // 姿态通道允许丢包/乱序时，旧 ack 不得把本地玩家拉回更早的权威位置。
          targetX = pos.x;
          targetZ = pos.z;
        }
        const dx = targetX - pos.x;
        const dz = targetZ - pos.z;
        if (Math.hypot(dx, dz) > 3) {
          pos.set(targetX, p.y, targetZ);
          this.netDrift.set(0, 0);
        } else {
          // 小偏差保留为渲染误差，静止后柔和收敛，避免移动手感被快照拖拽。
          this.netDrift.set(dx, dz);
        }
      } else {
        s.player.setNetPose(p.x, p.y, p.z, p.rotY);
        s.player.setTool(p.tool as HandTool);
        if (p.toolTier)
          s.player.setToolTier(p.tool as Exclude<HandTool, 'hand'>, p.toolTier);
          // 远程玩家钓鱼表现:作业动作出现即本地起播浮漂钓线,动作消失即收线;
          // 交互音效只给发起者本人听,远程会话起播时静音
          this.audio.silent = true;
          if (p.action === 'cast' || p.action === 'fish') s.fishing.netEnter();
          else s.fishing.netStop();
          this.audio.silent = false;
      }
      s.player.setAction(p.action);
      // 客人本地按权威快照对齐酒意计时(舒爽/晕晕的加速减速要在本地预测移动里生效)
      if (s === this.local) s.player.netSyncWine(p.refresh ?? 0, p.tipsy ?? 0);
      s.survival.state.hunger = p.hunger;
      s.survival.state.thirst = p.thirst;
      s.survival.state.health = p.health;
      s.survival.state.stamina = p.stamina;
      // 客人端闪红与受伤音跟随快照血量下降(受击/饥饿/溺水等所有掉血来源)
      if (p.health < s.lastHealth - 0.001) {
        s.player.hurt();
        if (s === this.local && this.loopElapsed - this.lastHurtSfxAt > 1.5) {
          this.audio.play('hurt');
          this.lastHurtSfxAt = this.loopElapsed;
        }
      }
      // 消费本次权威血量；否则同一次掉血会被后续每个快照重复判定为新伤害。
      s.lastHealth = p.health;
      s.player.setHealth(p.health);
      if (p.dead && !s.lastDead) {
        s.player.setDead();
        // 客人的死亡过渡由快照驱动,这里先于主循环消费 lastDead,须就地清摇杆
        if (s === this.local) {
          this.audio.play('death');
          this.setJoystick(0, 0);
        }
      }
      if (!p.dead && s.lastDead) {
        s.player.respawn(new THREE.Vector3(p.x, p.y, p.z));
        if (s === this.local) this.setJoystick(0, 0);
      }
      s.survival.state.dead = p.dead;
      s.lastDead = p.dead;
    }
  }

  /** 房主权威事件：在客人端补播动作声效、轻量粒子与定向 UI。 */
  netApplyEvent(event: NetEvent): void {
    if (event.kind === 'bottle') {
      if (event.target === this.local.id) this.onBottleMessage(event.text);
      return;
    }
    // 房主定向发回的临时提示:只播在触发者本人屏幕上
    if (event.kind === 'notice') {
      if (event.target === this.local.id) this.notify(event.text);
      return;
    }
    // 全局系统提示(加入/离开/死亡):所有玩家屏幕都播
    if (event.kind === 'sysNotice') {
      this.notify(event.text);
      return;
    }
    if (event.kind === 'collectFx') {
      this.fx.burst(
        new THREE.Vector3(event.x, event.y, event.z),
        event.color,
        Math.max(1, Math.min(24, Math.round(event.count)))
      );
      return;
    }
    // 其他玩家的入包飞行补播(本人那份由 HUD 快照差额本地触发,跳过避免重复)
    if (event.kind === 'itemFly') {
      if (event.actor === this.local.id) return;
      const s = this.sessions.find((x) => x.id === event.actor);
      if (!s) return;
      this.spawnItemFlights(s, new THREE.Vector3(event.x, event.y, event.z), [
        { kind: event.item, count: event.count },
      ]);
      return;
    }
    // 定位音效(熊吼/扑击等):声源距本地玩家 20 米内才播放,与房主判定一致
    if (event.kind === 'sfxAt') {
      const p = this.player.group.position;
      if (Math.hypot(p.x - event.x, p.z - event.z) <= BEAR_SFX_RANGE) {
        this.audio.play(event.sfx);
      }
      return;
    }
    if (event.kind === 'gm') {
      gmApply(event.config);
      return;
    }
    // 客人被野生动物击中的补播:粒子/击中音/伤害数字/扑击减速(血量本身由快照回流)
    if (event.kind === 'wildlifeHit') {
      const s = this.sessions.find((x) => x.id === event.target);
      if (!s) return;
      if (event.pounce) s.player.applySlow(3);
      this.playWildlifeHitFeedback(s, Math.max(1, Math.round(event.damage)));
      return;
    }
    if (event.kind === 'wildlifeAttack') {
      this.wildlife.netPlayAttack(event.animalId);
      return;
    }
    // 鳄鱼跃出水面:本地补水花粒子,离得近才播水花声(位置表现,不进姿态快照)
    if (event.kind === 'crocodileBurst') {
      this.fx.burst(new THREE.Vector3(event.x, event.y, event.z), '#bfe3f2', 14);
      const p = this.player.group.position;
      if (Math.hypot(p.x - event.x, p.z - event.z) <= BEAR_SFX_RANGE) this.audio.play('splash');
      return;
    }
    // 生物受击未死的补播:闪红表现(血量与死亡由房主权威结算,经快照回流)
    if (event.kind === 'creatureHit') {
      if (event.target === 'wildlife') this.wildlife.netFlash(event.id);
      else if (event.target === 'crab') this.crabs.netFlash(event.id);
      else if (event.target === 'bird') this.birds.netFlash(event.id);
      return;
    }
    // 他人放箭:本地复现箭矢飞行(放箭动作随姿态快照回流,命中由射手端判定)
    if (event.kind === 'arrowShot') {
      if (event.actor === this.local.id) return;
      this.sessions.find((s) => s.id === event.actor)?.archery.netPlayShot(event.dx, event.dz);
      return;
    }
    // 他人掷出套索:本地复现绳圈飞行(甩索动作随姿态快照回流,命中由掷出端判定)
    if (event.kind === 'lassoThrown') {
      if (event.actor === this.local.id) return;
      this.sessions.find((s) => s.id === event.actor)?.lasso.netPlayThrow(event.dx, event.dz);
      return;
    }
    // 他人套索命中:视觉绳立即消失,牵引绳由拴绳渲染接管
    if (event.kind === 'lassoCaught') {
      if (event.actor === this.local.id) return;
      this.sessions.find((s) => s.id === event.actor)?.lasso.netPlayCatch();
      return;
    }
    // 复活石碎裂表现:本人补上提示与音效,其余玩家看到出生点光效
    if (event.kind === 'reviveFx') {
      const s = this.sessions.find((x) => x.id === event.target);
      if (!s) return;
      if (s === this.local) {
        this.audio.play('success');
        this.notify('复活石发出微光碎裂了,你在出生点苏醒');
      } else {
        const p = s.player.group.position;
        this.fx.burst(new THREE.Vector3(p.x, p.y + 1.2, p.z), '#7fd8e8', 22);
      }
      return;
    }
    // 交互音效只给发起者自己听:只有事件属于本地玩家时补播,其余只保留轻量粒子反馈
    if (event.actor === this.local.id) this.audio.play(event.sfx);
    const colors: Partial<Record<SfxName, string>> = {
      chop: '#a97b48',
      mine: '#9a9a9a',
      pick: '#7fae55',
      pickStone: '#aaa69d',
      knock: '#c99a5c',
      pickup: '#f5d76e',
      success: '#fff0a8',
      hurt: '#c0392d',
      shoot: '#d8c69a',
      arrowHit: '#8d6e63',
      splash: '#cfe8ff',
      death: '#7d3c3c',
    };
    const color = colors[event.sfx];
    if (color) this.fx.burst(new THREE.Vector3(event.x, event.y, event.z), color, 8);
  }

  /** 网络动作执行期间标记发起者,让随后产生的反馈事件带上正确玩家坐标;交互音效只给本人听,结算期间本地静音。 */
  runNetAction<T>(actor: PlayerSession, action: () => T): T {
    this.activeNetActor = actor;
    this.audio.silent = true;
    try {
      return action();
    } finally {
      this.activeNetActor = null;
      this.audio.silent = false;
    }
  }

  /** 客人侧:应用房主的动物快照 */
  netApplyAnimals(list: AnimalPose[]): void {
    this.wildlife.netApply(list);
  }

  netApplyAmbient(state: AmbientState): void {
    const elapsed = performance.now() / 1000;
    this.crabs.netApply(state.crabs);
    this.birds.netApply(state.birds, elapsed);
    this.butterflies.netApply(state.butterflies, elapsed);
    this.dog.netApply(state.dog, elapsed);
  }

  /** 客人侧:应用房主的世界快照(重放摆件与掉落物,资源点原地更新) */
  netApplyWorld(state: WorldPatch): void {
    if (state.props) this.props.applySave(state.props);
    if (state.campfires) this.campfire.netApply(state.campfires);
    if (state.workbenches) {
      this.workbench.netApply(state.workbenches);
    }
    if (state.workbenchCrafted) this.workbench.restoreCrafted();
    if (state.crates) {
      this.crates.netApply(state.crates);
    }
    if (state.baitBarrels) {
      this.baitBarrels.netApply(state.baitBarrels);
    }
    if (state.brewBarrels) {
      this.brewBarrels.netApply(state.brewBarrels);
    }
    if (state.waterPurifiers) {
      this.waterPurifiers.netApply(state.waterPurifiers);
    }
    if (state.burrows) {
      this.burrows.netApply(state.burrows);
    }
    if (state.smelters) {
      this.smelters.netApply(state.smelters);
    }
    if (state.cookingStations) {
      this.cookingStations.netApply(state.cookingStations);
    }
    if (state.looms) {
      this.looms.netApply(state.looms);
    }
    if (state.fences || state.fenceGates) {
      this.fences.netApply(state.fences ?? [], state.fenceGates ?? []);
    }
    if (state.beds) {
      this.beds.netApply(state.beds);
    }
    if (state.shrines) {
      this.shrines.netApply(state.shrines);
    }
    if (state.stakes) {
      this.stakes.netApply(state.stakes);
    }
    if (state.drops) {
      this.drops.netApply(state.drops);
    }
  }

  /** 客人侧:应用房主为本客人生成的 HUD 快照(同时回填本地背包供近旁判定用) */
  netApplyHud(snap: HudSnapshot): void {
    // 客人端入包不走 Inventory.add,对比快照前后数量差补发拾取飘字
    const countSlots = (slots: readonly InventorySlot[]): Map<ResourceKind, number> => {
      const map = new Map<ResourceKind, number>();
      for (const slot of slots) if (slot) map.set(slot.kind, (map.get(slot.kind) ?? 0) + slot.count);
      return map;
    };
    const before = countSlots(this.local.inventory.snapshot());
    this.local.inventory.load(snap.slots, snap.capacity);
    for (const [kind, n] of countSlots(snap.slots)) {
      const gained = n - (before.get(kind) ?? 0);
      if (gained > 0) this.emitPickup(kind, gained);
    }
    Object.assign(this.local.tools, snap.toolTiers);
    // 弹药数以房主快照为准回流,数量增加时补拾取飘字(与背包槽同一策略)
    for (const kind of ['arrow', 'bait'] as const) {
      const gained = snap[kind] - this.local.ammo.count(kind);
      this.local.ammo[kind] = snap[kind];
      if (gained > 0) this.emitPickup(kind, gained);
    }
    this.local.craftedIds.clear();
    for (const id of snap.craftedIds) this.local.craftedIds.add(id);
    this.syncToolTiers(this.local);
    this.local.player.setTool(snap.tool);
    // 装备穿戴由房主权威结算:快照回流后同步本地装备状态,触发外观/背包容量刷新
    const equipChanged = SLOT_ORDER.some(
      (slot) => this.local.equipment.getEquipped(slot) !== snap.equipped[slot]
    );
    if (equipChanged) this.local.equipment.restore(snap.equipped, this.local.inventory);
    const now = performance.now() / 1000;
    const previous = this.netIndicator;
    if (
      previous.label === snap.indicator.label &&
      previous.progress !== null &&
      snap.indicator.progress !== null &&
      this.netIndicatorAt > 0
    ) {
      const dt = Math.max(0.05, now - this.netIndicatorAt);
      this.netIndicatorVelocity = THREE.MathUtils.clamp(
        (snap.indicator.progress - previous.progress) / dt,
        -2,
        2
      );
    } else {
      this.netIndicatorVelocity = 0;
      this.netIndicatorProgress = snap.indicator.progress;
    }
    this.netIndicator = snap.indicator;
    this.netIndicatorAt = now;
    // 钓鱼阶段与等待时长对齐本地表现(起播/咬钩时刻/中鱼收线/结束);
    // 对齐期间静音:兜底起播的音效已由房主 feedback 事件补播,这里再播会重一声
    this.audio.silent = true;
    this.fishing.netSyncState(snap.fishingState, snap.biteClicks, snap.fishingTier as FishTier, snap.fishingWaitLeft);
    this.audio.silent = false;
    // 客人端本地复现进食特效(权威结算在房主):快照进度每过 1/3 触发一次咀嚼声与掉渣
    const food = snap.eatName ? FOODS.find((f) => f.name === snap.eatName) : null;
    if (food) {
      const tick = Math.floor(snap.eatProgress * 3);
      if (tick !== this.netEatTick) {
        this.netEatTick = tick;
        if (tick >= 1) {
          this.audio.play('munch');
          const p = this.player.group.position.clone();
          p.y += 2;
          this.fx.burst(p, food.fxColor, 3);
        }
      }
    } else {
      this.netEatTick = 0;
    }
    // 自动切工具进度由客人本地计时(房主不知道客人端该值),提示也只用客人本地 notice,覆盖后再下发 UI
    this.onHud({
      ...snap,
      autoEquipProgress: this.autoEquipTimer / AUTO_EQUIP_DELAY,
      notice: this.notice,
    });
  }

  /** 房主收到客人放箭动作:权威扣一支箭(射没射中都消耗;客人背包有无限箭袋则免扣)、补放箭动画窗口、复现视觉箭矢并转发给其他客人 */
  netArrowShot(actor: PlayerSession, dx: number, dz: number): void {
    if (actor.inventory.count('endlessQuiver') <= 0) actor.ammo.remove('arrow', 1);
    actor.shotAnimLeft = 0.35;
    actor.archery.netPlayShot(dx, dz);
    this.hostRef?.broadcastEvent({ kind: 'arrowShot', actor: actor.id, dx, dz });
  }

  /** 房主收到客人掷套索动作:补甩索动作窗口、复现绳圈并转发给其他客人(套中才扣道具,走 lassoHit) */
  netLassoThrown(actor: PlayerSession, dx: number, dz: number): void {
    actor.shotAnimLeft = 0.35;
    actor.lasso.netPlayThrow(dx, dz);
    this.hostRef?.broadcastEvent({ kind: 'lassoThrown', actor: actor.id, dx, dz });
  }

  /** 牵着羊点工具按钮:在脚下打一根木桩,把羊拴在桩上(客人端上行动作由房主结算) */
  stakeLasso(actor: PlayerSession = this.local): boolean {
    if (this.guestNet) return this.guestNet.action('lassoStake', []);
    const led = this.wildlife.leashedBy(actor.player);
    if (!led || actor.player.isSwimming) return false;
    const p = actor.player.group.position;
    if (!this.wildlife.stakeSheep(led.id, p.x, p.z)) return false;
    this.stakes.place(p.x, p.z);
    this.audio.play('knock');
    const fxPos = p.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#8a6239', 8);
    return true;
  }

  /** 靠近被拴的羊或桩点「解开套索」:羊恢复野生,桩拆掉,套索收回操作者背包(客人端上行动作由房主结算) */
  untieLasso(actor: PlayerSession = this.local): boolean {
    if (this.guestNet) return this.guestNet.action('lassoUntie', []);
    const staked = this.wildlife.stakedNear(actor.player.group.position, TETHER_RANGE);
    if (!staked) return false;
    this.wildlife.releaseLeash(staked.id);
    const stake = this.stakes.nearest(staked.anchor.x, staked.anchor.z, 0.6);
    if (stake) this.stakes.remove(stake);
    this.giveItem('lasso', 1, actor);
    this.audio.play('knock');
    return true;
  }

  /** 空手挤奶结算:从拴养有奶的羊身上取走一份羊奶并重置产奶计时(客人端上行动作由房主结算) */
  milkSheep(actor: PlayerSession = this.local, sheepId: number, x: number, z: number): boolean {
    if (this.guestNet) return this.guestNet.action('milkSheep', [sheepId, x, z]);
    if (!this.wildlife.takeMilk(sheepId)) return false;
    const pos = new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
    this.giveItem('milk', 1, actor);
    this.markPickupOrigin(pos, actor);
    // 入包音效由拾取飞行(flushPickups/快照回流)统一播放,这里不再播,避免客人端补播两次
    this.fx.burst(new THREE.Vector3(pos.x, pos.y + 0.8, pos.z), '#f6f1e4', 8);
    if (this.hostRef && actor !== this.local) {
      this.hostRef.broadcastEvent({ kind: 'collectFx', x: pos.x, y: pos.y + 0.8, z: pos.z, color: '#f6f1e4', count: 8 });
    }
    return true;
  }

  /** 每帧更新玩家/桩与羊之间的系绳渲染(两端共用,信息来自动物权威状态或姿态快照镜像) */
  private updateLeashLines(): void {
    const entries: { key: string; from: THREE.Vector3; to: THREE.Vector3 }[] = [];
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    for (const info of this.wildlife.leashedInfos()) {
      const pose = info.pose;
      if (!pose) continue;
      if ('by' in pose) {
        const holder = this.sessions.find((s) => s.id === pose.by);
        if (!holder) continue;
        const hp = holder.player.group.position;
        from.set(hp.x, hp.y + 1.0, hp.z);
      } else {
        from.set(pose.stake.x, this.terrain.getHeight(pose.stake.x, pose.stake.z) + 0.5, pose.stake.z);
      }
      to.set(info.x, this.terrain.getHeight(info.x, info.z) + 0.45, info.z);
      entries.push({ key: String(info.id), from: from.clone(), to: to.clone() });
    }
    this.leashLines.sync(entries);
  }

  /** 动物击中某玩家的最终结算:减伤+防御掉血 + 压制减速 + 打击粒子/音效 + 本地伤害数字 */
  private applyWildlifeHit(session: PlayerSession, damage: number, pounce: boolean): void {
    const player = session.player;
    let final = damage * (1 - session.equipment.totalReduce()) - session.equipment.totalDefense();
    // 局外养成「剑术」2 级:受到的伤害降低 10%
    if (this.metaLevel('swordplay') >= 2 && session === this.local) final *= 0.9;
    final = Math.max(1, Math.round(final));
    session.survival.damage(final);
    // 扑击命中额外压制:减速 3 秒(移动减半),摔得爬不起来;
    // 局外养成「剑术」3 级:20% 几率闪身躲开熊扑的减速
    if (pounce && !(this.metaLevel('swordplay') >= 3 && session === this.local && Math.random() < 0.2)) {
      player.applySlow(3);
    }
    this.playWildlifeHitFeedback(session, final);
    // 客人被击中的表现在客人端补播(闪红与音效由血量快照驱动,这里补齐粒子/数字/减速)
    if (this.hostRef && session !== this.local) {
      this.hostRef.broadcastEvent({ kind: 'wildlifeHit', target: session.id, damage: final, pounce });
    }
  }

  /** 局外养成「捕猎·猎手」剥取:战利品在掉落前按等级加成改写(击杀链路统一走 lootOf) */
  private applyHuntLootMeta(
    species: AnimalSpecies,
    loot: { kind: ResourceKind; count: number }[]
  ): { kind: ResourceKind; count: number }[] {
    const level = this.metaLevel('plunder');
    if (level <= 0) return loot;
    let out = loot;
    if (level >= 1 && Math.random() < 0.1) {
      out = out.map((item) => ({ ...item, count: item.count + 1 }));
    }
    if (level >= 2 && (species === 'wolf' || species === 'bear')) {
      out = [...out, { kind: 'gameMeat', count: 1 }];
    }
    if (level >= 3 && !this.metaDaily.firstKillUsed) {
      this.metaDaily.firstKillUsed = true;
      out = out.map((item) => ({ ...item, count: item.count * 2 }));
    }
    return out;
  }

  /** 采集「碎石成金」满级:击碎陨石小概率挖出珍宝——按珍宝池抽取并交给 HUD 弹转盘 */
  private openCollectTreasure(): void {
    this.collectTreasure = rollLoot(4, 'sea', this.drawnTreasures).kind;
  }

  /** 采集侧珍宝转盘转完:入包并清掉待转盘状态 */
  claimCollectTreasure(actor: PlayerSession = this.local): boolean {
    if (!this.collectTreasure) return false;
    const kind = this.collectTreasure;
    this.collectTreasure = null;
    this.giveItem(kind, 1, actor);
    return true;
  }

  /** 局外养成「采集·巧匠」注入(单机生效,联机空实现) */
  private collectMetaFor(): CollectMeta {
    if (!this.metaOn) return NO_COLLECT_META;
    return {
      levels: {
        gleaning: this.metaLevel('gleaning'),
        rockWealth: this.metaLevel('rockWealth'),
        seedline: this.metaLevel('seedline'),
      },
      takeFirstCollect: () => {
        if (this.metaDaily.firstCollectUsed) return false;
        this.metaDaily.firstCollectUsed = true;
        return true;
      },
      meteorTreasure: () => this.openCollectTreasure(),
    };
  }

  /** 局外养成「钓鱼·渔父」注入(单机生效,联机空实现) */
  private fishingMetaFor(): FishingMeta {
    if (!this.metaOn) return NO_FISHING_META;
    return {
      levels: {
        baitSave: this.metaLevel('baitSave'),
        noSlip: this.metaLevel('noSlip'),
        fullLoad: this.metaLevel('fullLoad'),
      },
      takeFreeBaitCast: () => {
        if (this.metaDaily.freeBaitCasts >= 2) return false;
        this.metaDaily.freeBaitCasts += 1;
        return true;
      },
      takeFirstCast: () => {
        if (this.metaDaily.firstCastUsed) return false;
        this.metaDaily.firstCastUsed = true;
        return true;
      },
      takeAutoBite: () => {
        if (this.metaDaily.autoBiteUsed) return false;
        this.metaDaily.autoBiteUsed = true;
        return true;
      },
    };
  }

  /** 受击的本地表现:红色粒子迸溅 + 击中音 + 本地玩家头顶伤害数字 */
  private playWildlifeHitFeedback(session: PlayerSession, final: number): void {
    const p = session.player.group.position;
    this.fx.burst(new THREE.Vector3(p.x, p.y + 1.2, p.z), '#c0392d', 12);
    const previousActor = this.activeNetActor;
    this.activeNetActor = session;
    this.audio.play('chop');
    this.activeNetActor = previousActor;
    if (session !== this.local) return; // 伤害数字只飘在本地玩家头顶
    const head = new THREE.Vector3(p.x, p.y + 2.5, p.z).project(this.camera);
    this.onDamage(
      final,
      Math.round(((head.x + 1) / 2) * this.renderer.domElement.clientWidth),
      Math.round(((1 - head.y) / 2) * this.renderer.domElement.clientHeight)
    );
  }

  /** 有存档时恢复全部进度(位置、背包、工具、生存、昼夜、资源点与摆件) */
  private applySave(save: SaveData | null): void {
    if (!save) return;
    if (this.guestMode) {
      // 客人:按房主会话顺序重放,自己的那份落到本地会话(其余建为遥控玩家)
      const all = [save as SessionSave, ...(save.others ?? [])];
      const roster = this.guestNet?.welcome?.roster ?? [];
      for (let i = 0; i < all.length; i++) {
        const id = roster[i];
        this.applyPlayerSave(id === this.youId ? this.local : this.addRemoteSession(true, id), all[i]);
      }
    } else {
      this.applyPlayerSave(this.local, save);
      // 只有房主继续联机岛时恢复队友；单机继续不生成无人控制的远程角色。
      for (const other of this.hostRef ? (save.others ?? []) : []) {
        this.savedRemoteSessions.push(other);
      }
    }
    this.applyWorldSave(save);
  }

  /** 世界部分恢复(昼夜/资源点/摆件/掉落物/狗),客人收到世界快照时复用 */
  private applyWorldSave(save: SaveData): void {
    this.dayNight.restore(save.dayTime, save.day ?? 1);
    this.poseidonGraceUsed = save.poseidonGraceUsed ?? false;
    this.props.applySave(save.props);
    // 旧档里没有蚯蚓窝资源点(改版前蚯蚓是不入档的环境生物),补撒一批野生的
    this.props.seedWildWormNests();
    this.campfire.restore(save.campfires);
    if (save.workbenches) this.workbench.restore(save.workbenches);
    if (save.workbenchCrafted) this.workbench.restoreCrafted();
    this.crates.restore(save.crates);
    if (save.baitBarrels) this.baitBarrels.restore(save.baitBarrels);
    if (save.brewBarrels) this.brewBarrels.restore(save.brewBarrels);
    if (save.waterPurifiers) this.waterPurifiers.restore(save.waterPurifiers);
    if (save.burrows) this.burrows.restore(save.burrows);
    if (save.smelters) this.smelters.restore(save.smelters);
    if (save.cookingStations) this.cookingStations.restore(save.cookingStations);
    if (save.looms) this.looms.restore(save.looms);
    this.fences.restore(save.fences ?? [], save.fenceGates ?? []);
    this.beds.restore(save.beds ?? []);
    this.shrines.restore(save.shrines ?? []);
    if (save.stakes) {
      this.stakes.restore(save.stakes);
      // 拴住的羊入档:读档时在每个桩位生成一只已拴住的羊(只在权威端生成,客人端由姿态快照补建)
      if (!this.guestMode) {
        for (const s of save.stakes) this.wildlife.spawnStakedSheep(s.x, s.z);
      }
    }
    this.drops.restore(save.drops);
    if (save.dog) this.dog.restore(save.dog.x, save.dog.z);
    this.drawnTreasures = new Set(save.drawnTreasures ?? []);
    this.tier4Pity.count = save.tier4Pity ?? 0;
  }

  /** 把一名玩家的会话存档写回其会话(位置/生存/背包/工具/穿戴) */
  private applyPlayerSave(session: PlayerSession, data: SessionSave): void {
    session.player.setGender(data.gender ?? 'boy');
    const p = session.player.group.position;
    p.set(data.player.x, data.player.y, data.player.z);
    session.survival.state.hunger = data.survival.hunger;
    session.survival.state.thirst = data.survival.thirst;
    session.survival.state.health = data.survival.health;
    session.survival.state.stamina = data.survival.stamina;
    session.lastHealth = data.survival.health;
    session.survival.state.dead = false;
    session.inventory.load(data.slots, data.capacity);
    session.ammo.reset();
    session.ammo.arrow = data.ammo?.arrow ?? 0;
    session.ammo.bait = data.ammo?.bait ?? 0;
    // 旧档背包格里的箭/鱼饵归一化到独立弹药存储
    for (const slot of session.inventory.snapshot()) {
      if (slot?.kind === 'arrow' || slot?.kind === 'bait') {
        session.inventory.remove(slot.kind, slot.count);
        session.ammo.add(slot.kind, slot.count);
      }
    }
    session.equipment.restore(data.equipped, session.inventory);
    // 恢复已拥有的工具(含等级)
    for (const [id, tier] of Object.entries(data.tools)) {
      if (tier > 0) session.tools[id as ToolId] = tier;
    }
    session.craftedIds.clear();
    for (const id of data.crafted ?? []) session.craftedIds.add(id);
    // 战绩计数与死因随档恢复(旧档缺省为 0/null)
    session.stats.kills = data.stats?.kills ?? 0;
    session.stats.collected = data.stats?.collected ?? 0;
    session.survival.deathCause = null;
    this.syncToolTiers(session);
    if (data.handTool === 'hand' || this.hasToolFor(session, data.handTool)) {
      session.player.setTool(data.handTool);
    }
  }

  /** 汇总一名玩家的会话进度为存档数据 */
  private collectPlayerSave(session: PlayerSession): SessionSave {
    const p = session.player.group.position;
    const sv = session.survival.state;
    return {
      id: session.id,
      name: session.name,
      player: { x: p.x, y: p.y, z: p.z },
      survival: { hunger: sv.hunger, thirst: sv.thirst, health: sv.health, stamina: sv.stamina },
      slots: session.inventory.snapshot(),
      capacity: session.inventory.capacity,
      ammo: session.ammo.snapshot(),
      tools: { ...session.tools },
      crafted: [...session.craftedIds],
      equipped: session.equipment.snapshotForSave(),
      handTool: session.player.currentTool,
      gender: session.player.currentGender,
      stats: { ...session.stats },
    };
  }

  /** 汇总当前进度为存档数据(联机时房主把全部玩家会话一并保存);纯快照,不改现场状态 */
  collectSave(forNetwork = false): SaveData {
    // 被牵着(未打桩)的羊不入档:存档里给该玩家多记一个套索(等价退回背包),现场绳子保持不动
    const playerSave = (s: PlayerSession): SessionSave => {
      const sv = this.collectPlayerSave(s);
      if (!forNetwork && this.wildlife.leashedBy(s.player)) {
        const slots = sv.slots.map((slot) => (slot ? { ...slot } : null));
        const stack = slots.find((slot) => slot?.kind === 'lasso');
        if (stack) stack.count += 1;
        else {
          const empty = slots.indexOf(null);
          if (empty >= 0) slots[empty] = { kind: 'lasso', count: 1 };
        }
        sv.slots = slots;
      }
      return sv;
    };
    return {
      ...playerSave(this.local),
      others: [
        ...this.sessions.slice(1).map(playerSave),
        ...(forNetwork ? [] : this.savedRemoteSessions),
      ],
      version: SAVE_VERSION,
      terrainSeed: this.terrainSeed,
      dayTime: this.dayNight.time,
      day: this.dayNight.day,
      poseidonGraceUsed: this.poseidonGraceUsed,
      props: this.props.snapshot(),
      campfires: this.campfire.snapshot(),
      workbenches: this.workbench.snapshot(),
      workbenchCrafted: this.workbench.hasCrafted,
      crates: this.crates.snapshot(),
      baitBarrels: this.baitBarrels.snapshot(),
      brewBarrels: this.brewBarrels.snapshot(),
      waterPurifiers: this.waterPurifiers.snapshot(),
      smelters: this.smelters.snapshot(),
      cookingStations: this.cookingStations.snapshot(),
      looms: this.looms.snapshot(),
      fences: this.fences.snapshotFences(),
      fenceGates: this.fences.snapshotGates(),
      beds: this.beds.snapshot(),
      shrines: this.shrines.snapshot(),
      stakes: this.stakes.snapshot(),
      drops: this.drops.snapshot(),
      burrows: this.burrows.snapshot(),
      dog: this.dog.snapshot(),
      drawnTreasures: [...this.drawnTreasures],
      tier4Pity: this.tier4Pity.count,
      stats: { ...this.local.stats },
    };
  }

  /** 设置面板调整音量后热应用(音乐/音效两条总线)并持久化 */
  setAudioSettings(settings: AudioSettings): void {
    this.audio.setVolumes(settings.music, settings.sfx);
    saveAudioSettings(settings);
  }

  /** 相机模式(拍照模式)状态:纯本地表现,不影响联机同步 */
  private photo = new PhotoCamera();

  /** 进入相机模式:以玩家当前位置为注视点,停掉移动输入(摇杆层已隐藏不会触发抬起) */
  enterPhotoMode(): void {
    this.setJoystick(0, 0);
    this.photo.enter(this.player.group.position);
    this.camera.zoom = this.photo.zoom;
    this.camera.updateProjectionMatrix();
  }

  /** 退出相机模式:恢复常规跟随视角与缩放(位置由跟随插值平滑过渡) */
  exitPhotoMode(): void {
    this.photo.exit();
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
  }

  /** 相机模式内按屏幕像素平移注视点(单指拖动) */
  photoPan(dxPx: number, dyPx: number): void {
    if (!this.photo.active) return;
    const h = this.renderer.domElement.clientHeight || 1;
    const worldPerPx = ((this.camera.top - this.camera.bottom) / h) / this.photo.zoom;
    this.photo.pan(dxPx, dyPx, worldPerPx, this.player.group.position);
  }

  /** 相机模式内缩放(双指捏合或按钮),返回新倍率供 UI 显示 */
  photoZoomBy(factor: number): number {
    if (!this.photo.active) return this.photo.zoom;
    this.photo.zoomBy(factor);
    this.camera.zoom = this.photo.zoom;
    this.camera.updateProjectionMatrix();
    return this.photo.zoom;
  }

  /** 相机模式内绕注视点水平旋转(双指旋转) */
  photoRotate(delta: number): void {
    if (!this.photo.active) return;
    this.photo.rotate(delta);
  }

  /** 相机模式内俯仰(双指上下滑动):delta 为弧度增量 */
  photoRotatePitch(delta: number): void {
    if (!this.photo.active) return;
    this.photo.rotatePitch(delta);
  }

  /** 拍照:立即渲染一帧并读回画面(避免依赖读回缓冲保留),无照片返回 null */
  requestPhoto(cb: (photo: string | null) => void): void {
    this.renderer.render(this.scene, this.camera);
    cb(this.captureScene());
  }

  /** 单机死亡的结算快照,死亡界面展示并生成分享卡片;确认退出后随实例丢弃 */
  deathReport: DeathReport | null = null;

  /** 汇总本局战绩(天数/死因/击杀/采集来自会话,建造从存档快照的摆件数量汇总) */
  private buildDeathReport(s: PlayerSession): DeathReport {
    const save = this.collectSave();
    const built =
      save.campfires.length +
      save.workbenches.length +
      save.crates.length +
      (save.baitBarrels?.length ?? 0) +
      (save.waterPurifiers?.length ?? 0) +
      (save.smelters?.length ?? 0) +
      (save.cookingStations?.length ?? 0) +
      (save.looms?.length ?? 0) +
      save.fences.length +
      save.fenceGates.length +
      save.beds.length +
      (save.shrines?.length ?? 0) +
      (save.stakes?.length ?? 0);
    // 局外养成:本局沉淀的求生心得(超过 2 天才开始结算),写入局外存储并展示在死亡界面
    const legacyPoints = legacyPointsForDay(save.day ?? 1);
    if (legacyPoints > 0) MetaProgress.grant(legacyPoints);
    return {
      day: save.day ?? 1,
      cause: s.survival.deathCause ?? 'animal',
      kills: s.stats.kills,
      collected: s.stats.collected,
      crafted: s.craftedIds.size,
      built,
      legacyPoints,
      scene: this.captureScene(),
    };
  }

  /** 抓取当前画面作卡片底图(本帧已渲染,同一任务内读回缓冲安全) */
  private captureScene(): string | null {
    try {
      return this.renderer.domElement.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }

  /** 背包入包时道具模型飞向玩家后背,到达后头顶飘出图标与数量 */
  /** 本帧入包待合并的拾取项(同帧多种道具合并为一条提示) */
  private pendingPickups: { kind: ResourceKind; count: number }[] = [];
  /** 各玩家入包道具的飞行起点:采集/捡拾时为资源点/掉落物位置,短时保留。
   * 客人端入包由 HUD 快照回流触发,起点要短暂保留等待快照到达 */
  private pickupOrigins = new Map<string, { pos: THREE.Vector3; until: number }>();
  /** 各玩家的入包飞行终点(后背跟随回调,按会话缓存复用向量) */
  private itemFlyTargets = new Map<string, () => THREE.Vector3>();

  /** 记录入包飞行起点(短时保留:客人端入包由快照回流,晚几帧才触发) */
  private markPickupOrigin(position: THREE.Vector3, session: PlayerSession = this.local): void {
    this.pickupOrigins.set(session.id, { pos: position.clone(), until: performance.now() + 1000 });
  }

  /** 取某玩家有效的飞行起点,过期或无记录返回 null(由调用方兜底) */
  private peekPickupOrigin(s: PlayerSession): THREE.Vector3 | null {
    const o = this.pickupOrigins.get(s.id);
    if (!o) return null;
    if (performance.now() > o.until) {
      this.pickupOrigins.delete(s.id);
      return null;
    }
    return o.pos;
  }

  /** 某玩家入包飞行的终点回调:玩家后背(朝向反方向、肩部高度),玩家移动时实时跟随 */
  private itemFlyTargetFor(s: PlayerSession): () => THREE.Vector3 {
    let t = this.itemFlyTargets.get(s.id);
    if (!t) {
      const v = new THREE.Vector3();
      t = () => {
        const p = s.player.group.position;
        const rot = s.player.group.rotation.y;
        return v.set(p.x - Math.sin(rot) * 0.45, p.y + 1.5, p.z - Math.cos(rot) * 0.45);
      };
      this.itemFlyTargets.set(s.id, t);
    }
    return t;
  }

  private emitPickup(kind: ResourceKind, count: number): void {
    const existing = this.pendingPickups.find((p) => p.kind === kind);
    if (existing) existing.count += count;
    else this.pendingPickups.push({ kind, count });
  }

  /** 无明确起点时的兜底:道具从玩家身前出发(合成产出等来源) */
  private defaultPickupOrigin(s: PlayerSession = this.local): THREE.Vector3 {
    const p = s.player.group.position;
    const rot = s.player.group.rotation.y;
    return new THREE.Vector3(p.x + Math.sin(rot) * 0.9, p.y + 1, p.z + Math.cos(rot) * 0.9);
  }

  /** 为某位玩家播入包飞行:每件道具单独模型错峰起飞(同种最多 3 个),全部到达后触发 onDone */
  private spawnItemFlights(
    s: PlayerSession,
    origin: THREE.Vector3,
    items: { kind: ResourceKind; count: number }[],
    onDone?: () => void
  ): void {
    const spawns: { kind: ResourceKind; delay: number }[] = [];
    for (const item of items) {
      const n = Math.min(item.count, 3);
      for (let j = 0; j < n; j++) spawns.push({ kind: item.kind, delay: spawns.length * 0.12 });
    }
    let remaining = spawns.length;
    const target = this.itemFlyTargetFor(s);
    for (const sp of spawns) {
      this.itemFly.spawn(sp.kind, origin, sp.delay, () => {
        if (--remaining === 0) onDone?.();
      }, target);
    }
  }

  /** 房主广播入包飞行事件并就地表现远程玩家(客人端本地只触发自己的,其余靠该事件补播) */
  private broadcastItemFly(s: PlayerSession, kind: ResourceKind, count: number): void {
    if (!this.hostRef) return;
    const origin = this.peekPickupOrigin(s) ?? this.defaultPickupOrigin(s);
    if (s !== this.local) this.spawnItemFlights(s, origin, [{ kind, count }]);
    this.hostRef.broadcastEvent({ kind: 'itemFly', actor: s.id, item: kind, count, x: origin.x, y: origin.y, z: origin.z });
  }

  /** 帧末统一发出本帧的拾取:道具模型从起点错峰飞向玩家后背缩没,全部到达后合并飘一条提示 */
  private flushPickups(): void {
    if (this.pendingPickups.length === 0) return;
    const items = this.pendingPickups;
    this.pendingPickups = [];
    const origin = this.peekPickupOrigin(this.local) ?? this.defaultPickupOrigin();
    this.spawnItemFlights(this.local, origin, items, () => {
      this.audio.play('pickup');
      const p = this.player.group.position;
      const head = new THREE.Vector3(p.x, p.y + 3.2, p.z).project(this.camera);
      const w = this.renderer.domElement.clientWidth;
      const h = this.renderer.domElement.clientHeight;
      this.onPickup({
        items,
        x: Math.round(((head.x + 1) / 2) * w),
        y: Math.round(((1 - head.y) / 2) * h),
      });
    });
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    console.warn('[Game] WebGL context lost', {
      guest: this.guestMode,
      memory: { ...this.renderer.info.memory },
      calls: this.renderer.info.render.calls,
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height,
    });
  };

  private onContextRestored = (): void => {
    this.resize();
    console.info('[Game] WebGL context restored', { guest: this.guestMode });
  };

  private resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer?.setSize(w, h);
    this.renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    if (this.camera) {
      const aspect = w / h;
      this.camera.left = -VIEW_SIZE * aspect;
      this.camera.right = VIEW_SIZE * aspect;
      this.camera.top = VIEW_SIZE;
      this.camera.bottom = -VIEW_SIZE;
      this.camera.updateProjectionMatrix();
    }
  }

  /** 地上生物的不可走判定:围栏与所有会挡玩家的物件(成树/树桩/大石) */
  private isGroundBlocked(x: number, z: number): boolean {
    return this.fences.isBlocked(x, z) || this.props.isBlocked(x, z);
  }

  /** 相机以固定偏移跟随角色:从正南上方看向玩家,屏幕「上」即世界 -Z,
   * 与键盘 W/摇杆上推的移动语义一致(俯角与旧版对角视角相同,只改水平朝向)。
   * 相机模式下改为注视 PhotoCamera 的中心(可平移/缩放/旋转),不再跟随玩家。 */
  private updateCamera(delta: number): void {
    const target = this.photo.active ? this.photo.center : this.player.group.position;
    const off = this.photo.offset(_camOffset);
    const desiredX = target.x + off.x;
    const desiredY = target.y + off.y;
    const desiredZ = target.z + off.z;
    if (this.photo.active) {
      // 拖动平移要求 1:1 跟手,不做平滑插值
      this.camera.position.set(desiredX, desiredY, desiredZ);
    } else {
      const k = 1 - Math.pow(0.001, delta);
      this.camera.position.x += (desiredX - this.camera.position.x) * k;
      this.camera.position.y += (desiredY - this.camera.position.y) * k;
      this.camera.position.z += (desiredZ - this.camera.position.z) * k;
    }
    this.camera.lookAt(target.x, target.y, target.z);

    // 太阳与阴影范围跟随玩家(方向由昼夜系统维护),大岛也能全程有影子
    const d = this.dayNight.sunOffset;
    this.sun.position.set(target.x + d.x, target.y + d.y, target.z + d.z);
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'q') this.cycleTool();
  };

  /** 本地玩家手上是否还持有该工具 */
  private hasTool(tool: Exclude<HandTool, 'hand'>): boolean {
    return this.hasToolFor(this.local, tool);
  }

  setJoystick(x: number, z: number): void {
    this.player.input.setJoystick(x, z);
    this.guestNet?.sendInput(x, z);
  }

  /** 切换手持工具:客人本地先切(预测表现)并上行给房主;切走套索时松开手里的绳(套索回包,羊受惊) */
  selectTool(tool: HandTool): void {
    this.setToolFor(this.local, tool);
    this.guestNet?.action('tool', [tool]);
  }

  /** 切换某会话的手持工具(房主权威端共用入口):牵着羊时锁死套索不响应切换,图标不会被场景/自动切换抢走 */
  setToolFor(s: PlayerSession, tool: HandTool): void {
    if (tool !== 'lasso' && this.wildlife.leashedBy(s.player)) return;
    s.player.setTool(tool);
  }

  /** 循环切换手持工具:空手 → 斧子 → 镐子 → 锄头 → 鱼竿 → 弓 → 木剑 → 套索 → 围栏/门(仅手里还有的) */
  cycleTool(): void {
    this.selectTool(this.nextToolInCycle());
  }

  /** 循环顺序里当前工具的下一个(仅手里还有的) */
  private nextToolInCycle(): HandTool {
    const order: HandTool[] = [
      'hand',
      'axe',
      'pickaxe',
      'hoe',
      'fishingrod',
      'bow',
      'sword',
      'lasso',
      'fence',
      'fenceGate',
    ];
    const owned: HandTool[] = order.filter((t) => t === 'hand' || this.hasTool(t));
    return owned[(owned.indexOf(this.player.currentTool) + 1) % owned.length];
  }

  /** 工具按钮点击:牵着羊时原地打桩拴住;场景有明确需要的工具时直接切过去;否则循环切换 */
  useToolButton(): void {
    if (this.player.currentTool === 'lasso' && this.wildlife.leashedBy(this.player)) {
      this.stakeLasso();
      return;
    }
    const need = this.wantedTool();
    if (need) {
      this.autoEquipTimer = 0;
      this.selectTool(need);
    } else {
      this.cycleTool();
    }
  }

  /** 站定不动时当前场景希望切到的工具(树→斧子、石→镐子),不满足条件返回 null;钓鱼不自动切换;
   * 牵着羊时不自动切换(避免无预兆地松开绳子) */
  private wantedTool(): HandTool | null {
    if (
      this.player.isMoving ||
      (this.guestMode && this.player.isActing) ||
      this.archery.isWorking ||
      this.crafting.isWorking ||
      this.workbench.isWorking(this.local) ||
      this.eating.isWorking ||
      this.local.milk.isWorking ||
      this.beds.isBusy(this.local) ||
      this.survival.state.dead ||
      this.wildlife.leashedBy(this.player)
    ) {
      return null;
    }
    const nearby = this.collect.getNearby();
    if (nearby) {
      if (
        nearby.kind === 'tree' &&
        !this.collect.isPickingFruit(nearby) &&
        this.tools.axe &&
        this.player.currentTool !== 'axe'
      ) {
        return 'axe';
      }
      if (
        (nearby.kind === 'rock' ||
          nearby.kind === 'iron' ||
          nearby.kind === 'meteor') &&
        // 镐类资源各有解锁等级,未解锁前不自动切换
        pickaxeUnlocked(nearby.kind, this.tools.pickaxe) &&
        this.tools.pickaxe &&
        this.player.currentTool !== 'pickaxe'
      ) {
        return 'pickaxe';
      }
      return null;
    }
    return null;
  }

  /** 空手站在需要工具的资源点旁不动 1 秒且已拥有该工具时,自动切换到手上 */
  private updateAutoEquip(delta: number): void {
    const need = this.wantedTool();
    if (!need) {
      this.autoEquipTimer = 0;
      return;
    }
    this.autoEquipTimer += delta;
    if (this.autoEquipTimer >= AUTO_EQUIP_DELAY) {
      this.autoEquipTimer = 0;
      // 客人端走 selectTool:本地先切做预测表现,并上行 tool 动作由房主权威结算
      this.selectTool(need);
    }
  }

  /** 持续移动且动物近身时自动切剑:有剑、在移动、手上不是弓箭,动物 3 米内持续 1.5 秒后切换;
   * 牵着羊时不自动切(切走套索会松开绳子),需要自卫时手动切换 */
  private updateSwordAutoEquip(delta: number): void {
    const should =
      this.tools.sword &&
      this.player.isMoving &&
      this.player.currentTool !== 'bow' &&
      this.player.currentTool !== 'sword' &&
      this.player.currentTool !== 'lasso' &&
      !this.survival.state.dead &&
      this.wildlife.leashedBy(this.player) === null &&
      this.wildlife.nearestAlive(this.player.group.position, SWORD_AUTO_EQUIP_RANGE) !== null;
    if (!should) {
      this.swordEquipTimer = 0;
      return;
    }
    this.swordEquipTimer += delta;
    if (this.swordEquipTimer >= SWORD_AUTO_EQUIP_DELAY) {
      this.swordEquipTimer = 0;
      this.selectTool('sword');
    }
  }

  /** 吃食物(定时进食动作):指定种类则吃该种,否则吃背包里最前面的,返回是否成功开始 */
  eatFood(kind?: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('eatFood', [kind]);
    if (this.eatBlocked(actor)) return false;
    const food = this.foodToEat(kind, actor);
    return food ? actor.eating.start(food) : false;
  }

  /** 连续吃到满饥饿或吃完(进食卡的「吃饱」按钮) */
  eatUntilFull(kind?: ResourceKind, actor: PlayerSession = this.local): boolean {
    if (this.guestNet) return this.guestNet.action('eatUntilFull', [kind]);
    if (this.eatBlocked(actor)) return false;
    const food = this.foodToEat(kind, actor);
    return food ? actor.eating.startFull(food) : false;
  }

  /** 进食前置:任一占双手的行为进行中则不可开吃 */
  private eatBlocked(a: PlayerSession): boolean {
    return (
      a.crafting.isWorking ||
      this.workbench.isWorking(a) ||
      a.eating.isWorking ||
      a.fishing.isWorking ||
      this.beds.isBusy(a)
    );
  }

  /** 找要吃的食物:指定了种类用种类,否则吃背包里最前面的 */
  private foodToEat(kind: ResourceKind | undefined, a: PlayerSession): Food | undefined {
    return kind ? FOODS.find((f) => f.kind === kind) : firstFoodIn(a.inventory.snapshot());
  }

  /** 发起钓鱼(屏幕中心按钮),返回是否成功开始 */
  startFishing(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('startFishing', []);

    const a = actor;
    if (
      a.crafting.isWorking ||
      this.workbench.isWorking(a) ||
      this.workbench.isDigging(a) ||
      a.eating.isWorking ||
      this.beds.isBusy(a) ||
      a.water.isActive
    ) {
      return false;
    }
    return a.fishing.start();
  }

  /** 咬钩窗口内点击屏幕任意处收竿 */
  hookFish(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('hookFish', []);

    return actor.fishing.hook();
  }

  /** 四档珍宝转盘转完后结算入包(客人端动作上行,房主权威结算) */
  claimTreasure(actor: PlayerSession = this.local): boolean {
    if (this.guestNet) return this.guestNet.action('claimTreasure', []);

    return actor.fishing.claimTreasure();
  }

  /** GM 发放道具(直接进背包);工具类改为直接点亮拥有状态 */
  gmGiveItem(kind: ResourceKind, count: number, actor: Actor = this.local): void {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) {
      this.guestNet.action('gmGiveItem', [kind, count]);
      return;
    }

    if ((TOOL_IDS as string[]).includes(kind)) {
      actor.tools[kind as ToolId] = 1;
      this.syncToolTiers(actor);
      return;
    }
    this.giveItem(kind, count, actor);
  }

  /** GM 直接把工具点亮到指定等级(1 基础 / 2 高级) */
  gmGiveTool(tool: ToolId, tier: 1 | 2 | 3, actor: PlayerSession = this.local): void {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) {
      this.guestNet.action('gmGiveTool', [tool, tier]);
      return;
    }

    actor.tools[tool] = Math.max(actor.tools[tool], tier);
    this.syncToolTiers(actor);
  }

  /** 会话工具等级同步到角色模型(升级/读档/快照对账后调用) */
  private syncToolTiers(actor: Actor): void {
    for (const id of TOOL_IDS) actor.player.setToolTier(id, actor.tools[id]);
  }

  /** 产物入账:弹药(箭/鱼饵)进独立弹药存储,其余进背包,背包放不下的部分掉在玩家身旁地上 */
  giveItem(kind: ResourceKind, count: number, actor: Actor = this.local): number {
    if (kind === 'arrow' || kind === 'bait') return actor.ammo.add(kind, count);
    const added = actor.inventory.add(kind, count);
    const overflow = count - added;
    if (overflow > 0) this.drops.dropOverflow(kind, overflow, actor);
    return added;
  }

  /** GM 性别设置仅修改发起者；客人等待房主快照确认。 */
  gmSetGender(gender: PlayerGender, actor: PlayerSession = this.local): void {
    if (gender !== 'boy' && gender !== 'girl') return;
    if (this.guestNet) {
      this.guestNet.action('gmSetGender', [gender]);
      return;
    }
    actor.player.setGender(gender);
    SaveSystem.save(this.collectSave());
  }

  /** GM 生存状态回满并复活 */
  gmRestoreStatus(actor: PlayerSession = this.local): void {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) {
      this.guestNet.action('gmRestoreStatus', []);
      return;
    }

    const s = actor.survival.state;
    s.hunger = s.thirst = s.health = s.stamina = 100;
    s.dead = false;
  }

  /** 房主权威执行联机重生：个人携带进度清零，岛屿与其他玩家保持不变。 */
  private respawnMultiplayerSession(session: PlayerSession): void {
    session.inventory.reset();
    session.equipment.reset();
    session.ammo.reset();
    for (const id of TOOL_IDS) session.tools[id] = 0;
    this.syncToolTiers(session);
    const survival = session.survival.state;
    survival.hunger = survival.thirst = survival.health = survival.stamina = 100;
    survival.dead = false;
    session.lastHealth = 100;
    session.lastDead = false;
    session.player.input.setJoystick(0, 0);
    session.player.respawn(this.terrain.findSpawnPoint());
  }

  /** 单机波塞冬庇佑复活:不清档、随身进度原样保留,状态回满在出生点苏醒,身旁送上赠礼木箱 */
  private poseidonReviveSession(session: PlayerSession): void {
    this.poseidonGrace = false;
    const survival = session.survival.state;
    survival.hunger = survival.thirst = survival.health = survival.stamina = 100;
    survival.dead = false;
    session.lastHealth = 100;
    session.lastDead = false;
    session.player.input.setJoystick(0, 0);
    const spawn = this.terrain.findSpawnPoint();
    session.player.respawn(spawn);
    this.spawnPoseidonGift(spawn);
    // 海蓝光柱自下而上三段迸溅,配合音效与提示,让苏醒的瞬间有「被海神送回岸边」的仪式感
    for (const y of [0.3, 1.1, 1.9]) {
      this.fx.burst(new THREE.Vector3(spawn.x, spawn.y + y, spawn.z), '#2ec4b6', 16);
    }
    this.audio.play('success');
    this.notify('海浪把你送回了出生点,波塞冬在身旁留下了一只木箱');
  }

  /** 在出生点旁找一块干地放下赠礼木箱(二级装备一套 + 海神的信);找不到合适位置时退化为放在出生点本身 */
  private spawnPoseidonGift(spawn: THREE.Vector3): void {
    const offsets: readonly [number, number][] = [
      [1.1, 0.5],
      [-1.1, 0.5],
      [0, 1.4],
      [1.1, -0.8],
      [-1.1, -0.8],
    ];
    for (const [dx, dz] of offsets) {
      if (this.crates.spawnGift(spawn.x + dx, spawn.z + dz, POSEIDON_GIFT_KINDS)) return;
    }
    this.crates.spawnGift(spawn.x, spawn.z, POSEIDON_GIFT_KINDS);
  }

  /** 联机死亡的随身掉落(房主权威,掉落物经世界增量同步给客人):
   * 丛类植株必定掉落;其余背包道具按 DEATH_DROP_RATIO 掉落份数;弹药按份数比例掉落;穿戴装备与已拥有工具各有该比例的概率掉落(工具保留等级,捡回即重新点亮)。 */
  private dropDeathLoot(session: PlayerSession): void {
    for (const slot of session.inventory.snapshot()) {
      if (!slot) continue;
      const ratio = PLANT_DROP_KINDS.includes(slot.kind) ? 1 : DEATH_DROP_RATIO;
      const n = Math.round(slot.count * ratio);
      if (n > 0) this.drops.drop(slot.kind, n, session);
    }
    for (const kind of ['arrow', 'bait'] as const) {
      const n = Math.round(session.ammo.count(kind) * DEATH_DROP_RATIO);
      if (n > 0) {
        this.drops.drop(kind, n, session);
        session.ammo.remove(kind, n);
      }
    }
    for (const kind of Object.values(session.equipment.snapshot())) {
      if (kind && Math.random() < DEATH_DROP_RATIO) this.drops.drop(kind, 1, session);
    }
    for (const id of TOOL_IDS) {
      const tier = session.tools[id];
      if (tier > 0 && Math.random() < DEATH_DROP_RATIO) this.drops.drop(id, 1, session, tier);
    }
  }
  /** GM 跳转昼夜时刻,t∈[0,1),0.25 为正午;客人端上行车主权威结算,时刻随快照回流 */
  gmSetTime(t: number): void {
    if (this.guestNet) {
      this.guestNet.action('gmSetTime', [t]);
      return;
    }
    this.dayNight.time = t;
  }

  /** GM 设置当前天数;客人端上行车主权威结算,天数随快照回流 */
  gmSetDay(day: number): void {
    if (this.guestNet) {
      this.guestNet.action('gmSetDay', [day]);
      return;
    }
    this.dayNight.day = day;
  }

  /** GM 强制切换天气;客人端上行车主权威结算,天气随快照回流 */
  gmSetWeather(type: 'sunny' | 'rain'): void {
    if (this.guestNet) {
      this.guestNet.action('gmSetWeather', [type]);
      return;
    }
    this.weather.force(type);
  }

  /** GM 在玩家附近的草地上生成一只指定动物;客人端上行车主权威结算 */
  gmSpawnAnimal(species: AnimalSpecies): void {
    if (this.guestNet) {
      this.guestNet.action('gmSpawnAnimal', [species]);
      return;
    }
    this.gmSpawnAnimalFor(species, this.local);
  }

  /** GM 生成落点:在该玩家附近的草地上生成指定动物并提示 */
  gmSpawnAnimalFor(species: AnimalSpecies, actor: PlayerSession = this.local): void {
    const p = actor.player.group.position;
    this.notify(
      this.wildlife.gmSpawnNear(species, p.x, p.z)
        ? `已在附近生成${ANIMAL_LABELS[species]}`
        : '附近没有合适的草地,挪个位置再试',
      actor
    );
  }

  /** GM 特殊事件:立即在该玩家所在水洼触发一次鳄鱼袭击(不走概率);客人端上行房主结算 */
  gmTriggerCrocodile(): void {
    if (this.guestNet) {
      this.guestNet.action('gmTriggerCrocodile', []);
      return;
    }
    this.gmTriggerCrocodileFor(this.local);
  }

  gmTriggerCrocodileFor(actor: PlayerSession): void {
    if (!this.spawnCrocodileNear(actor)) this.notify('站在水洼边上再试', actor);
  }

  /** GM 开关调整:本地立即生效;联机时全房间同步同一份配置 */  gmSetConfig(patch: Partial<GmConfig>): void {
    gmApply(patch);
    if (this.guestNet) this.guestNet.action('gmConfig', [gmSnapshot()]);
    else this.hostRef?.broadcastEvent({ kind: 'gm', config: gmSnapshot() });
  }

  /** 房主收到客人上行/本地触发后的 GM 配置落盘:应用并广播给所有客人 */
  gmApplyNetConfig(config: unknown): void {
    gmApply(config as Partial<GmConfig>);
    this.hostRef?.broadcastEvent({ kind: 'gm', config: gmSnapshot() });
  }

  /** 睡觉期间锁交互:一切主动操作入口先检查该状态 */
  private asleepFor(actor: PlayerSession): boolean {
    return actor.player.isSleeping;
  }

  /** 背包里点击「使用」木箱/铁箱:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useCrate(kind: CrateKind = 'crate', actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useCrate', [kind]);

    if (this.asleepFor(actor)) return false;
    if (!this.crates.use(actor, kind)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 背包里点击「使用」工作台道具:校验通过后在玩家脚下原地放回对应等级,不满足时给出提示 */
  useWorkbenchItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useWorkbenchItem', [kind]);

    const level = workbenchItemLevel(kind);
    if (this.asleepFor(actor) || level === null || !this.workbench.placeItem(actor, level)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 背包里点击「使用」床道具:校验通过后在玩家脚下原地放下对应等级的床,不满足时给出提示 */
  useBedItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useBedItem', [kind]);

    const level = bedItemLevel(kind);
    if (this.asleepFor(actor) || level === null || !this.beds.place(actor, level)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 各等级床的睡觉数值:入睡所需的最低饥饿/口渴、睡觉消耗、健康恢复 */
  private static readonly SLEEP_STATS: Record<number, { need: number; cost: number; heal: number }> = {
    1: { need: 20, cost: 20, heal: 20 },
    2: { need: 15, cost: 15, heal: 25 },
    3: { need: 10, cost: 10, heal: 30 },
  };

  /** 靠近床发起睡觉:玩家躺上床,天空在过渡中日夜流转,醒来后统一结算 */
  sleep(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('sleep', []);

    const a = actor;
    const bed = this.beds.nearby(a);
    if (this.beds.isBusy(a) || !bed || a.survival.state.dead) return false;
    const stats = Game.SLEEP_STATS[bed.level];
    const s = a.survival.state;
    if (s.hunger < stats.need || s.thirst < stats.need) {
      this.notify('又饿又渴睡不着,先吃点喝点再睡吧', a);
      return false;
    }
    const skipped = this.dayNight.beginSleep();
    return this.beds.startSleep(
      a,
      () => {
        this.dayNight.endSleep();
        this.props.advance(skipped);
        this.campfire.passTime(skipped, performance.now() / 1000);
        this.cookingStations.passTime(skipped);
        s.hunger -= stats.cost;
        s.thirst -= stats.cost;
        s.health = Math.min(100, s.health + stats.heal);
        this.audio.play('success');
        const p = a.player.group.position.clone();
        p.y += 0.8;
        this.fx.burst(p, '#cfe8ff', 14);
        this.notify('一觉睡到了第二天清晨', a);
      }
    );
  }

  /** 背包里点击「使用」围栏/围栏门:吸附到面前的格点(边)放下,不满足时给出提示 */
  useFenceItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useFenceItem', [kind]);

    const a = actor;
    if (this.asleepFor(a)) return false;
    const fenceKind = fenceKindOfItem(kind);
    const ok = fenceKind
      ? this.fences.useFence(a, fenceKind)
      : kind === 'fenceGate'
        ? this.fences.useGate(a)
        : false;
    if (!ok) {
      this.notify('这里放不下,找块没东西的干地正对着要围的方向试试', a);
      return false;
    }
    this.afterPlaceDiggable(a);
    return true;
  }

  /** 背包里点击「使用」神龛道具:校验通过后在玩家脚下原地立起对应神像,不满足时给出提示 */
  useShrine(actor: PlayerSession = this.local, kind: ShrineKind = 'poseidonBlessing'): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useShrine', [kind]);

    if (this.asleepFor(actor) || !this.shrines.place(actor, kind)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 死亡瞬间的复活石结算:碎裂一颗,免惩罚在出生点苏醒(血量回半,携带不变);没有则返回 false */
  private tryReviveWithStone(session: PlayerSession): boolean {
    if (!session.inventory.remove('reviveStone', 1)) return false;
    const sv = session.survival.state;
    sv.dead = false;
    sv.health = Math.max(sv.health, 50);
    session.lastHealth = sv.health;
    session.lastDead = false;
    session.player.respawn(this.terrain.findSpawnPoint());
    this.playReviveFx(session);
    this.hostRef?.broadcastEvent({ kind: 'reviveFx', target: session.id });
    return true;
  }

  /** 复活石碎裂的表现:出生点青蓝光柱迸溅 + 音效,本人另给一条提示 */
  private playReviveFx(session: PlayerSession): void {
    const p = session.player.group.position;
    this.fx.burst(new THREE.Vector3(p.x, p.y + 1.2, p.z), '#7fd8e8', 22);
    if (session === this.local) this.audio.play('success');
    this.notify('复活石发出微光碎裂了,你在出生点苏醒', session);
  }

  /** 通用规则:刚放置的东西可以被锄头挖走时,若正手持锄头则收起,避免原地立刻把它挖掉 */
  private afterPlaceDiggable(actor: PlayerSession = this.local): void {
    if (actor.player.currentTool === 'hoe') actor.player.setTool('hand');
  }

  /** 拔开漂流瓶:消耗瓶子并返回瓶中信内容,没有瓶子返回 null */
  useBottle(actor: PlayerSession = this.local): string | null {
    if (this.guestNet) {
      this.guestNet.action('useBottle', []);
      return null;
    }
    const text = openBottle(actor.inventory);
    if (text && actor !== this.local) this.hostRef?.broadcastEvent({ kind: 'bottle', target: actor.id, text });
    return text;
  }

  /** 拆开海神的信:消耗信纸并随机读到一句留言,没有信返回 null(仅单机投放,不走联机事件) */
  useLetter(actor: PlayerSession = this.local): string | null {
    if (this.guestNet) return null;
    return openLetter(actor.inventory);
  }

  /** 背包里点击「使用」种子:校验与摆放一致(不能在水里/水边,脚下不能被占住),通过后在原地种下 */
  useSeed(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useSeed', [kind]);

    const a = actor;
    if (this.asleepFor(a)) return false;
    const species = (Object.keys(SEED_OF) as (keyof typeof SEED_OF)[]).find((s) => SEED_OF[s] === kind);
    if (!species || a.inventory.count(kind) <= 0) return false;
    const p = a.player.group.position;
    if (
      a.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里种不了,找个没东西的干地试试', a);
      return false;
    }
    a.inventory.remove(kind, 1);
    this.props.plant(species, p.x, p.z);
    this.audio.play('success');
    const fxPos = p.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#7fae55', 10);
    return true;
  }

  /** 背包里点击「使用」挖来的丛/蚯蚓窝:校验与工作台摆放一致(不能在水里/水边,脚下不能被占住),通过后在原地放回 */
  useBush(kind: 'berryBush' | 'shrubBush' | 'grassTuft' | 'wormNest', actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useBush', [kind]);

    const a = actor;
    if (this.asleepFor(a)) return false;
    if (a.inventory.count(kind) <= 0) return false;
    const p = a.player.group.position;
    if (
      a.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里放不下,找个没东西的干地试试', a);
      return false;
    }
    a.inventory.remove(kind, 1);
    if (kind === 'wormNest') {
      this.props.placeWormNest(p.x, p.z);
    } else {
      const bushKind = kind === 'berryBush' ? 'berry' : kind === 'grassTuft' ? 'grass' : 'shrub';
      this.props.placeBush(bushKind, p.x, p.z);
    }
    this.afterPlaceDiggable(a);
    this.audio.play('success');
    const fxPos = p.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, kind === 'berryBush' ? '#5d8a3a' : kind === 'grassTuft' ? '#a4c46a' : kind === 'wormNest' ? '#6f5a44' : '#6b8f4e', 10);
    return true;
  }

  /** 捡回附近掉落物(点「捡回」卡片),背包放不下则提示 */
  pickupDrop(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流;飞行起点取本地同步到的掉落物位置
    if (this.guestNet) {
      const near = this.drops.getNearby(this.local);
      if (near) this.markPickupOrigin(near.position);
      return this.guestNet.action('pickupDrop', []);
    }

    const a = actor;
    if (this.asleepFor(a)) return false;
    const near = this.drops.getNearby(a);
    if (!near) return false;
    if (
      !(TOOL_IDS as string[]).includes(near.kind) &&
      near.kind !== 'arrow' &&
      near.kind !== 'bait' &&
      !a.inventory.canFit(near.kind)
    ) {
      this.notify('背包满了,装不下更多东西', a);
      return false;
    }
    this.markPickupOrigin(near.position, a);
    // 工具类掉落物(死亡掉落的斧/镐等)捡回即重新点亮对应等级,不进背包
    return this.drops.pickupNearby(a, (d) => {
      if (d.kind === 'arrow' || d.kind === 'bait') return a.ammo.add(d.kind, d.count);
      if (!(TOOL_IDS as string[]).includes(d.kind)) return a.inventory.add(d.kind, d.count);
      const tool = d.kind as ToolId;
      a.tools[tool] = Math.max(a.tools[tool], d.tier ?? 1);
      this.syncToolTiers(a);
      return d.count;
    });
  }

  /** 通用临时提示(由 UI 自动消失);联机时代客人权威结算产生的提示定向发回本人屏幕 */
  notify(text: string, actor: PlayerSession = this.local): void {
    if (actor !== this.local && this.hostRef) {
      this.hostRef.broadcastEvent({ kind: 'notice', target: actor.id, text });
      return;
    }
    this.notice = { id: ++this.noticeId, text };
    this.hudTimer = 1; // 跳过节流立即推送
    this.pushHud(0);
  }

  /** 全局系统提示(加入/离开/死亡):房主广播给所有客人并在本地展示,客人端经 sysNotice 事件触发 */
  sysNotify(text: string): void {
    if (this.hostRef) this.hostRef.broadcastEvent({ kind: 'sysNotice', text });
    this.notify(text);
  }

  /** 发起定时搭建火堆(站定敲打,进度走头顶圆环),返回是否成功开始 */
  craftCampfire(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('craftCampfire', []);

    if (this.asleepFor(actor)) return false;
    return this.campfire.start(actor);
  }

  /** 把背包里该种类道具存入身旁木箱(count 为 Infinity 时整格存入),整格转移失败时给出提示,连发失败静默 */
  crateStore(kind: ResourceKind, count = Infinity, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流(JSON 无法携带 Infinity,透传 null 由房主还原)
    if (this.guestNet) return this.guestNet.action('crateStore', [kind, count === Infinity ? null : count]);

    if (this.asleepFor(actor)) return false;
    const result = this.crates.store(actor, kind, count);
    if (result === 'full' && count === Infinity) {
      this.notify(`${this.crates.nearbyKind(actor) === 'ironCrate' ? '铁箱' : '木箱'}装不下了`, actor);
    }
    return result === 'ok';
  }

  /** 把身旁木箱里该种类道具取回背包(count 为 Infinity 时整格取回),整格转移失败时给出提示,连发失败静默 */
  crateTake(kind: ResourceKind, count = Infinity, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流(JSON 无法携带 Infinity,透传 null 由房主还原)
    if (this.guestNet) return this.guestNet.action('crateTake', [kind, count === Infinity ? null : count]);

    if (this.asleepFor(actor)) return false;
    const result = this.crates.take(actor, kind, count);
    if (result === 'full' && count === Infinity) this.notify('背包满了,装不下更多东西', actor);
    return result === 'ok';
  }

  /** 背包里点击「使用」饵料桶:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useBaitBarrel(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useBaitBarrel', []);

    if (this.asleepFor(actor) || !this.baitBarrels.use(actor)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 背包里点击「使用」酿酒桶:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useBrewBarrel(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useBrewBarrel', []);

    if (this.asleepFor(actor) || !this.brewBarrels.use(actor)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 把背包里该种类原料丢进身旁酿酒桶(count ≤ 0 为全部,一次只酿一种,桶被占用时只接受同种),失败时给出提示 */
  brewBarrelFeed(kind: ResourceKind, count = 0, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('brewBarrelFeed', [kind, count]);

    if (this.asleepFor(actor)) return false;
    if (!this.brewBarrels.feed(actor, kind, count)) {
      this.notify('桶里正在酿别的,一次只能酿一种', actor);
      return false;
    }
    return true;
  }

  /** 把身旁酿酒桶里还没发酵的原料取回背包,失败时给出提示 */
  brewBarrelTakeRaw(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('brewBarrelTakeRaw', []);

    if (this.asleepFor(actor)) return false;
    if (!this.brewBarrels.takeRaw(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 收取身旁酿酒桶里酿好的全部酒,失败时给出提示 */
  brewBarrelCollect(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('brewBarrelCollect', []);

    if (this.asleepFor(actor)) return false;
    if (!this.brewBarrels.collect(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 背包里点击「使用」海水净化器:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useWaterPurifier(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行房主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useWaterPurifier', []);

    if (this.asleepFor(actor) || !this.waterPurifiers.use(actor)) {
      this.notify('净化器只能放在湿沙滩上,去海边浅滩试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 把背包里该种类食物丢进身旁饵料桶(count ≤ 0 为全部,每 5 秒发酵 1 个),失败时给出提示 */
  baitBarrelFeed(kind: ResourceKind, count = 0, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('baitBarrelFeed', [kind, count]);

    if (this.asleepFor(actor)) return false;
    if (!this.baitBarrels.feed(actor, kind, count)) {
      this.notify('桶里装不下了', actor);
      return false;
    }
    return true;
  }

  /** 把身旁饵料桶里还没发酵的食物取回背包,失败时给出提示 */
  baitBarrelTakeFoods(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('baitBarrelTakeFoods', []);

    if (this.asleepFor(actor)) return false;
    if (!this.baitBarrels.takeFoods(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 收取身旁饵料桶里发酵好的全部鱼饵,失败时给出提示 */
  baitBarrelCollect(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('baitBarrelCollect', []);

    if (this.asleepFor(actor)) return false;
    if (!this.baitBarrels.collect(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 背包里点击「使用」冶炼炉:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useSmelter(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useSmelter', []);

    if (this.asleepFor(actor) || !this.smelters.use(actor)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 把背包里的铁矿石丢进身旁冶炼炉(count ≤ 0 为全部,每 15 秒用 3 块矿石炼 1 块铁锭),失败时给出提示 */
  smelterFeed(count = 0, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('smelterFeed', [count]);

    if (this.asleepFor(actor)) return false;
    if (!this.smelters.feed(actor, count)) {
      this.notify('炉里装不下了', actor);
      return false;
    }
    return true;
  }

  /** 把身旁冶炼炉里还没炼的矿石取回背包,失败时给出提示 */
  smelterTakeOre(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('smelterTakeOre', []);

    if (this.asleepFor(actor)) return false;
    if (!this.smelters.takeOre(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 收取身旁冶炼炉里炼好的全部铁锭,失败时给出提示 */
  smelterCollect(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('smelterCollect', []);

    if (this.asleepFor(actor)) return false;
    if (!this.smelters.collect(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 背包里点击「使用」纺织机:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useLoom(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useLoom', []);

    if (this.asleepFor(actor) || !this.looms.use(actor)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 把背包里的绳线丢进身旁纺织机(count ≤ 0 为全部,每 2 根绳线织 1 匹布料),失败时给出提示 */
  loomFeed(count = 0, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('loomFeed', [count]);

    if (this.asleepFor(actor)) return false;
    if (!this.looms.feed(actor, count)) {
      this.notify('机里织不上了', actor);
      return false;
    }
    return true;
  }

  /** 把身旁纺织机里还没织的绳线取回背包,失败时给出提示 */
  loomTakeRope(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('loomTakeRope', []);

    if (this.asleepFor(actor)) return false;
    if (!this.looms.takeRope(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 收取身旁纺织机里织好的全部布料,失败时给出提示 */
  loomCollect(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('loomCollect', []);

    if (this.asleepFor(actor)) return false;
    if (!this.looms.collect(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 向身旁火堆添加 1 个可燃物,返回是否成功 */  campfireAddFuel(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('campfireAddFuel', [kind]);

    if (this.asleepFor(actor)) return false;
    return this.campfire.addFuel(actor, kind) > 0;
  }

  /** 背包里点击「使用」烹饪台:校验通过后在玩家脚下原地放下(未点燃,需添柴),不满足时给出提示 */
  useCookingStation(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useCookingStation', []);

    if (this.asleepFor(actor) || !this.cookingStations.use(actor)) {
      this.notify('这里放不下,找个没东西的干地试试', actor);
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 向身旁烹饪台添加 1 个可燃物,返回是否成功 */
  cookingAddFuel(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('cookingAddFuel', [kind]);

    if (this.asleepFor(actor)) return false;
    return this.cookingStations.addFuel(actor, kind) > 0;
  }

  /** 在身旁燃烧的烹饪台上发起烤制(可选份数,与火堆相同),返回是否成功开始 */
  cookingRoast(kind: ResourceKind, count: number, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('cookingRoast', [kind, count]);

    if (this.asleepFor(actor)) return false;
    return this.cookingStations.startRoast(actor, kind, count);
  }

  /** 在身旁燃烧的烹饪台上发起煮汤(选一种食材和份数,每 5 秒煮好 1 份存放台上) */
  cookingBoil(kind: ResourceKind, count: number, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('cookingBoil', [kind, count]);

    if (this.asleepFor(actor)) return false;
    const result = this.cookingStations.startBoil(actor, kind, count);
    if (result === 'notLit') this.notify('火还没点着,先添柴引火吧', actor);
    else if (result === 'busy') this.notify('锅里还在煮别的,等煮完再下锅', actor);
    else if (result === 'invalid') return false;
    return result === 'ok';
  }

  /** 收取身旁烹饪台上煮好的全部汤品,失败时给出提示 */
  cookingCollect(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('cookingCollect', []);

    if (this.asleepFor(actor)) return false;
    if (this.cookingStations.collect(actor) <= 0) {
      this.notify('还没有煮好的汤', actor);
      return false;
    }
    return true;
  }

  /** 把身旁烹饪台锅里还没煮的食材取回背包,失败时给出提示 */
  cookingTakeBoil(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('cookingTakeBoil', []);

    if (this.asleepFor(actor)) return false;
    if (!this.cookingStations.takeBoil(actor)) {
      this.notify('背包满了,装不下更多东西', actor);
      return false;
    }
    return true;
  }

  /** 在身旁燃烧的火堆上发起烹饪(可选份数,同工作台),返回是否成功开始 */
  campfireCook(kind: ResourceKind, count: number, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('campfireCook', [kind, count]);

    if (this.asleepFor(actor)) return false;
    return this.campfire.startCooking(actor, kind, count);
  }

  /** 丢弃道具到玩家附近的地上(可指定数量,超出持有数按实际丢弃) */
  dropItem(kind: ResourceKind, count = 1, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('dropItem', [kind, count]);

    const a = actor;
    if (this.asleepFor(a)) return false;
    const n = Math.min(count, a.inventory.count(kind));
    if (n <= 0) return false;
    a.inventory.remove(kind, n);
    this.drops.drop(kind, n, a);
    return true;
  }

  /** 背包格之间移动道具(拖拽交换/合并),返回是否成功 */
  moveItem(from: number, to: number, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('moveItem', [from, to]);

    return actor.inventory.move(from, to);
  }

  /** 整理背包:同类合并到一格并按物品分类排序 */
  sortInventory(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('sortInventory', []);

    actor.inventory.sort(itemSortIndex);
    return true;
  }

  /** 从背包装备一件道具(物品详情点击「装备」),返回是否成功 */
  equipItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('equipItem', [kind]);

    return isEquipKind(kind) ? actor.equipment.equip(kind, actor.inventory, true) : false;
  }

  /** 卸下某栏位的装备放回背包,背包放不下则失败 */
  unequipItem(slot: EquipSlot, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('unequipItem', [slot]);

    return actor.equipment.unequip(slot, actor.inventory);
  }

  /** 发起定时合成(站定敲打,进度走头顶圆环),返回是否成功开始 */
  craftTool(id: CraftId, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('craftTool', [id]);

    const a = actor;
    if (this.asleepFor(a) || this.workbench.isWorking(a) || this.workbench.isDigging(a)) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe && recipe.station === 'hand' ? a.crafting.start(recipe) : false;
  }

  /** 在工作台发起制作(可选个数,逐个完成),玩家须在的工作范围内,返回是否成功开始 */
  craftAtWorkbench(id: CraftId, count: number, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('craftAtWorkbench', [id, count]);

    const a = actor;
    if (
      this.asleepFor(a) ||
      this.workbench.isWorking(a) ||
      this.workbench.isDigging(a) ||
      !this.workbench.isNear(a)
    ) {
      return false;
    }
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe &&
      recipe.station === 'workbench' &&
      (recipe.minBenchLevel ?? 1) <= this.workbench.level(a)
      ? a.crafting.start(recipe, count)
      : false;
  }

  /** 发起工作台制作(完成后在原位放置),返回是否成功开始 */
  craftWorkbench(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('craftWorkbench', []);

    if (this.asleepFor(actor) || actor.crafting.isWorking || actor.eating.isWorking) return false;
    return this.workbench.start(actor);
  }

  /** 发起工作台升级(站定敲打,完成后换更高等级模型),返回是否成功开始 */
  upgradeWorkbench(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('upgradeWorkbench', []);

    if (this.asleepFor(actor) || actor.crafting.isWorking || actor.eating.isWorking) return false;
    return this.workbench.upgrade(actor);
  }

  start(): void {
    // 音频须在用户手势(点击开始)后启动,这里由 GameplayUI 在手势链路中调用
    this.audio.start();
    // 相机直接落位到玩家出生点,否则会从世界原点收敛,开局出现镜头突变
    const target = this.player.group.position;
    this.camera.position.copy(target).add(this.photo.offset());
    this.camera.lookAt(target.x, target.y, target.z);
    this.loop.start();
  }

  /** 联机(房主侧)接入一名远程玩家:出生点同本地玩家,参与物理与动物判定 */
  addRemoteSession(remote = false, id?: string, name = '岛友'): PlayerSession {
    const player = new Player(
      this.terrain,
      this.terrain.findSpawnPoint(),
      this.waterFx,
      this.footprints,
      remote ? { remote: true } : { keyboard: false }
    );
    player.setObstacles(this.props, this.fences);
    this.scene.add(player.group);
    const session = new PlayerSession(player, id, name);
    session.nameTag.sprite.visible = true;
    this.attachSessionSystems(session);
    this.sessions.push(session);
    return session;
  }

  /** 联机(房主侧)移除一名远程玩家(断线超时):松开其牵着的羊,套索掉在羊脚下 */
  removeRemoteSession(session: PlayerSession): void {
    const led = this.wildlife.leashedBy(session.player);
    if (led) {
      this.wildlife.releaseLeash(led.id);
      this.drops.dropAt('lasso', 1, led.x, led.z);
    }
    this.sessions = this.sessions.filter((s) => s !== session);
    this.campfire.detach(session);
    this.workbench.detach(session);
    this.crates.detach(session);
    this.baitBarrels.detach(session);
    this.brewBarrels.detach(session);
    this.waterPurifiers.detach(session);
    this.burrows.detach(session);
    this.smelters.detach(session);
    this.cookingStations.detach(session);
    this.looms.detach(session);
    this.fences.detach(session);
    this.beds.detach(session);
    this.shrines.detach(session);
    this.scene.remove(session.player.group);
    session.nameTag.dispose();
    session.player.dispose();
  }

  /** 找到某玩家实体所属的会话(本地玩家恒为 local) */
  private sessionOf(player: Player): PlayerSession {
    return this.sessions.find((s) => s.player === player) ?? this.local;
  }

  /** 该会话是否被任一交互占用;exclude 用来排除询问方自身(“别人忙吗”) */
  private isSessionBusy(s: PlayerSession, exclude?: InteractionKind): boolean {
    // 牵着羊时双手被绳子占用:除套索自身外的所有站定交互(采集/喝水/制作等)一律不可开始
    if (exclude !== 'lasso' && this.wildlife.leashedBy(s.player)) return true;
    // 弓优先级最高:瞄准中(虚线可见)或放箭动作期间,其他站定交互(采集/喝水等)让位,先放箭再交互
    if (exclude !== 'archery' && (s.archery.isWorking || s.archery.isAiming)) return true;
    if (exclude !== 'sword' && s.sword.isWorking) return true;
    if (exclude !== 'lasso' && (s.lasso.isWorking || s.lasso.isAiming)) return true;
    if (exclude !== 'collect' && s.collect.isWorking) return true;
    if (exclude !== 'milk' && s.milk.isWorking) return true;
    if (exclude !== 'crafting' && s.crafting.isWorking) return true;
    if (exclude !== 'eating' && s.eating.isWorking) return true;
    if (exclude !== 'fishing' && s.fishing.isWorking) return true;
    if (exclude !== 'water' && s.water.isActive) return true;
    if (exclude !== 'workbench' && (this.workbench.isWorking(s) || this.workbench.isDigging(s)))
      return true;
    if (exclude !== 'campfire' && this.campfire.isBusy(s)) return true;
    if (exclude !== 'crates' && this.crates.isDigging(s)) return true;
    if (exclude !== 'baitBarrels' && this.baitBarrels.isDigging(s)) return true;
    if (exclude !== 'brewBarrels' && this.brewBarrels.isDigging(s)) return true;
    if (exclude !== 'waterPurifiers' && this.waterPurifiers.isDigging(s)) return true;
    if (exclude !== 'burrows' && this.burrows.isDigging(s)) return true;
    if (exclude !== 'smelters' && this.smelters.isDigging(s)) return true;
    if (exclude !== 'cookingStations' && this.cookingStations.isBusy(s)) return true;
    if (exclude !== 'looms' && this.looms.isDigging(s)) return true;
    if (exclude !== 'fences' && (this.fences.isDigging(s) || this.fences.isPlacing(s)))
      return true;
    if (exclude !== 'beds' && this.beds.isBusy(s)) return true;
    if (exclude !== 'shrines' && this.shrines.isDigging(s)) return true;
    return false;
  }

  /** 为会话装配玩家侧交互系统(每会话独立一份:采集/制作/进食/钓鱼/弓/喝水) */
  private attachSessionSystems(session: PlayerSession): void {
    const s = session;
    // 拾取提示只飘在本地玩家头顶;房主广播入包飞行事件,让其他玩家也看得到该玩家的入包表现
    s.inventory.onAdd = (kind, count) => {
      if (s === this.local) this.emitPickup(kind, count);
      this.broadcastItemFly(s, kind, count);
    };
    // 穿戴变化即时反映到玩家模型;背包类装备扩容,卸下/换小背包则收缩并溢出掉落。
    // 作为制作材料被消耗的背包不收缩:新背包马上穿上且容量更大,收缩会把物品挤掉
    s.equipment.onChange = (slot, kind, asMaterial) => {
      s.player.setEquip(slot, kind);
      const cap = kind ? EQUIPMENT[kind].capacity : undefined;
      if (cap) s.inventory.setCapacity(cap);
      if (slot === 'backpack' && !asMaterial) {
        const target = cap ?? DEFAULT_CAPACITY;
        for (const item of s.inventory.shrink(target)) {
          // 掉落只在权威端生成,客人端由同步复现
          if (!this.guestMode) this.drops.dropOverflow(item.kind, item.count, s);
        }
      }
    };
    s.collect = new CollectSystem(
      s.player,
      this.props,
      s.inventory,
      s.tools,
      this.fx,
      this.audio,
      // 合成/进食/钓鱼/播种占用双手,期间采集让位
      () => this.isSessionBusy(s, 'collect'),
      (position, color, count) => {
        if (!this.hostRef) return;
        this.hostRef.broadcastEvent({
          kind: 'collectFx',
          x: position.x,
          y: position.y,
          z: position.z,
          color,
          count,
        });
      },
      // 记录采集产出的飞行起点(本地玩家供自己的入包飞行,房主侧供远程玩家的飞行与广播)
      (position) => {
        s.stats.collected += 1;
        this.markPickupOrigin(position, s);
      },
      // 蜂巢神龛在岛上时,采集浆果丛有概率多掉 1 颗
      () => this.shrines.berryBlessed,
      // 砍树自然补种时避开所有在场玩家,树苗不在任何人面前凭空出现
      () => this.sessions.map((session) => session.player.group.position),
      // 局外养成「采集·巧匠」
      this.collectMetaFor()
    );
    s.milk = new SheepMilkSystem(
      s.player,
      this.wildlife,
      this.audio,
      // 合成/进食/钓鱼等占用双手时挤奶让位
      () => this.isSessionBusy(s, 'milk'),
      // 一次挤奶完成:统一走 milkSheep 结算(客人端上行,房主权威入包)
      (sheepId, x, z) => this.milkSheep(s, sheepId, x, z)
    );
    s.crafting = new CraftingSystem(
      s.player,
      s.inventory,
      s.tools,
      s.equipment,
      this.fx,
      this.audio,
      // 背包放不下的产物掉在玩家身旁
      (kind, count) => this.giveItem(kind, count, s),
      s.craftedIds
    );
    s.eating = new EatingSystem(s.player, s.inventory, s.survival, this.fx, this.audio, (food) => {
      // 喝酒附带限时增益:舒爽状态下再喝转为晕晕的
      const wine = wineOf(food.kind);
      if (wine) s.player.applyWine(wine.refresh, TIPSY_DURATION);
    });
    s.fishing = new FishingSystem(
      this.scene,
      s.player,
      this.terrain,
      s.inventory,
      s.ammo,
      this.waterFx,
      this.fx,
      this.audio,
      s.tools,
      // 记录鱼获的飞行起点(本地玩家供自己的入包飞行,房主侧供远程玩家的飞行与广播)
      (position) => this.markPickupOrigin(position, s),
      // 波塞冬神像放置期间杂物概率降低
      () => this.shrines.junkCut,
      // 珍宝保底:共享的已抽珍宝集合
      () => this.drawnTreasures,
      // 四档保底:共享的有饵连续未出珍宝计数
      () => this.tier4Pity,
      // 局外养成「钓鱼·渔父」
      this.fishingMetaFor()
    );
    s.archery = new BowSystem(
      this.scene,
      s.player,
      this.terrain,
      s.ammo,
      this.crabs,
      this.birds,
      this.wildlife,
      this.fx,
      this.audio,
      s.tools,
      // 击杀的战利品散落在击杀位置周围,走近后点「捡回」拾取
      (items: { kind: ResourceKind; count: number }[], x: number, z: number) => {
        s.stats.kills += 1;
        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2;
          this.drops.dropAt(item.kind, item.count, x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6);
        });
      },
      // 客人端:命中判定在本地完成,结果上行房主权威结算(扣箭/伤害/掉落随快照回流)
      this.guestMode && s === this.local
        ? (hit, x, z) =>
            this.guestNet?.action('arrowHit', [
              hit.kind,
              hit.kind === 'wildlife' ? hit.animalId : 0,
              Math.round(x * 10) / 10,
              Math.round(z * 10) / 10,
            ])
        : undefined,
      // 本地玩家放箭时广播视觉(客人上行动作由房主转发,房主直接广播事件)
      s === this.local
        ? (dx, dz) => {
            if (this.guestNet) this.guestNet.action('arrowShot', [dx, dz]);
            else this.hostRef?.broadcastEvent({ kind: 'arrowShot', actor: s.id, dx, dz });
          }
        : undefined,
      // 「晕晕的」醉酒状态:箭矢伤害 +30%;局外养成「神射」满级再 +30%
      () => (s.player.tipsySeconds > 0 ? 1.3 : 1) * (this.metaLevel('deadeye') >= 3 ? 1.3 : 1),
      // 无限箭袋:放在背包里时开弓不检查、放箭不消耗箭
      () => s.inventory.count('endlessQuiver') > 0,
      // 局外养成「神射」:每天前 3 支箭免消耗(2 级),每支 10% 概率免消耗(1 级)
      () => {
        if (this.metaLevel('deadeye') < 1) return false;
        if (this.metaLevel('deadeye') >= 2 && this.metaDaily.freeArrows < 3) {
          this.metaDaily.freeArrows += 1;
          return true;
        }
        return Math.random() < 0.1;
      }
    );
    s.sword = new SwordSystem(
      s.player,
      this.wildlife,
      this.fx,
      this.audio,
      // 击杀的战利品散落在玩家身旁,走近后点「捡回」拾取
      (items: { kind: ResourceKind; count: number }[], x: number, z: number) => {
        s.stats.kills += 1;
        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2;
          this.drops.dropAt(item.kind, item.count, x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6);
        });
      },
      // 客人端:命中判定在本地完成,结果上行房主权威结算(伤害/掉落随快照回流)
      this.guestMode && s === this.local
        ? (animalId: number) => this.guestNet?.action('swordHit', [animalId])
        : undefined,
      // 石剑(2 级)伤害更高
      () => s.tools.sword,
      // 「晕晕的」醉酒状态:攻击力 +30%;局外养成「剑术」1 级:10% 概率双倍伤害
      () =>
        (s.player.tipsySeconds > 0 ? 1.3 : 1) *
        (this.metaLevel('swordplay') >= 1 && Math.random() < 0.1 ? 2 : 1)
    );
    s.lasso = new LassoSystem(
      this.scene,
      s.player,
      this.terrain,
      s.inventory,
      this.wildlife,
      this.fx,
      this.audio,
      // 客人端:命中判定在本地完成,结果上行房主权威结算(拴绳状态随姿态快照回流)
      this.guestMode && s === this.local
        ? (animalId: number, x: number, z: number) =>
            this.guestNet?.action('lassoHit', [
              animalId,
              Math.round(x * 10) / 10,
              Math.round(z * 10) / 10,
            ])
        : undefined,
      // 本地玩家掷出时广播视觉(客人上行动作由房主转发,房主直接广播事件)
      s === this.local
        ? (dx: number, dz: number) => {
            if (this.guestNet) this.guestNet.action('lassoThrow', [dx, dz]);
            else this.hostRef?.broadcastEvent({ kind: 'lassoThrown', actor: s.id, dx, dz });
          }
        : undefined,
      // 命中权威结算成功(含房主结算客人上行命中):收掉该会话的视觉绳并广播,让各端不再播完伸出→收回
      (animalId: number) => {
        s.lasso.netPlayCatch();
        this.hostRef?.broadcastEvent({ kind: 'lassoCaught', actor: s.id });
      }
    );
    s.water = new WaterSystem(s.player, this.terrain, s.survival, this.audio, () => this.onDrinkRound(s));
  }

  /** 某玩家喝完一轮水:按 GM 概率在所站水洼触发鳄鱼袭击(房主权威结算,客人端只看表现);防鳄熏香 30 米光环内不触发 */
  private onDrinkRound(session: PlayerSession): void {
    if (this.guestMode) return;
    if (this.shrines.inAura('crocIncense', session.player.group.position)) return;
    if (Math.random() >= GmSystem.crocodileChance) return;
    this.spawnCrocodileNear(session);
  }

  /** 在该玩家所站(或最近)的水洼里生成鳄鱼袭击;成功返回 true */
  private spawnCrocodileNear(session: PlayerSession): boolean {
    const p = session.player.group.position;
    const pond = this.terrain.waterAreas.reduce(
      (best, w) => (Math.hypot(p.x - w.x, p.z - w.z) < Math.hypot(p.x - best.x, p.z - best.z) ? w : best),
      this.terrain.waterAreas[0]
    );
    if (!pond || Math.hypot(p.x - pond.x, p.z - pond.z) > pond.radius + 2) {
      this.notify('附近没有水洼,鳄鱼没来', session);
      return false;
    }
    this.wildlife.spawnCrocodile({ x: pond.x, z: pond.z, radius: pond.radius }, session.player);
    this.notify('水面翻涌,一条鳄鱼窜了出来!', session);
    return true;
  }

  /** 手上是否还持有该工具(围栏/门按背包数量判断;套索额外把「正牵着羊」也算持有,绳子还在手里) */
  private hasToolFor(s: PlayerSession, tool: Exclude<HandTool, 'hand'>): boolean {
    if (tool === 'fence')
      return s.inventory.count('fenceWood') + s.inventory.count('fenceStone') > 0;
    if (tool === 'fenceGate') return s.inventory.count('fenceGate') > 0;
    if (tool === 'lasso')
      return s.inventory.count('lasso') > 0 || this.wildlife.leashedBy(s.player) !== null;
    return !!s.tools[tool];
  }

  dispose(): void {
    this.loop.stop();
    this.hostRef?.detach();
    this.guestNet?.dispose();
    // 退出前再存一次,保证最近进度不丢;已死亡则存档已清(客人不写本地档)
    if (!this.guestMode && this.sessions.some((s) => !s.survival.state.dead)) SaveSystem.save(this.collectSave());
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    for (const s of this.sessions) {
      s.nameTag.dispose();
      s.player.dispose();
    }
    this.drops.dispose();
    this.leashLines.dispose();
    this.props.dispose();
    this.decorations.dispose();
    this.rain.dispose();
    this.windFx.dispose();
    this.footprints.dispose();
    this.waterDebug.dispose();
    this.ocean.dispose();
    this.oceanDepth.dispose();
    this.audio.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private pushHud(delta: number): void {
    this.hudTimer += delta;
    // 钓鱼阶段变化(尤其咬钩)与连点计数立即推送,保证反应窗口反馈及时
    const fishingState = this.fishing.currentState;
    const fishingChanged = fishingState !== this.lastFishingState;
    const clicksChanged =
      fishingState === 'bite' && this.fishing.biteClicks !== this.lastBiteClicks;
    this.lastFishingState = fishingState;
    this.lastBiteClicks = this.fishing.biteClicks;
    // 玩家移动/交互中立刻显示;连续闲置 5s 后才淡出(闲置计时在权威会话循环里统一累计)
    const busy = !this.isSessionActive(this.local) && this.local.hudIdleTime >= IDLE_HIDE_DELAY;
    const busyChanged = busy !== this.lastBusy;
    this.lastBusy = busy;
    // 移动开始/结束立即推送,弹出卡片随移动隐藏/恢复要跟手
    const moving = this.local.player.isMoving;
    const movingChanged = moving !== this.lastMoving;
    this.lastMoving = moving;
    if (this.hudTimer < 0.25 && !fishingChanged && !clicksChanged && !busyChanged && !movingChanged)
      return;
    this.hudTimer = 0;
    this.onHud({ ...this.snapshotHud(this.local, busy), notice: this.notice });
  }

  /** 计算某会话的 HUD 数据快照(本地走 pushHud,联机时房主为每个客人各算一份下发;notice 是房主本地提示,不下发) */
  hudFor(s: PlayerSession): Omit<HudSnapshot, 'notice'> {
    return this.snapshotHud(s, !this.isSessionActive(s) && s.hudIdleTime >= IDLE_HIDE_DELAY);
  }

  private snapshotHud(s: PlayerSession, busy: boolean): Omit<HudSnapshot, 'notice'> {
    return {
      ...s.survival.state,
      arrow: s.ammo.count('arrow'),
      bait: s.ammo.count('bait'),
      heldFenceCount:
        s.player.currentTool === 'fence'
          ? s.inventory.count('fenceWood') + s.inventory.count('fenceStone')
          : s.player.currentTool === 'fenceGate'
            ? s.inventory.count('fenceGate')
            : 0,
      slots: s.inventory.snapshot(),
      capacity: s.inventory.capacity,
      hasAxe: !!s.tools.axe,
      hasPickaxe: !!s.tools.pickaxe,
      hasHoe: !!s.tools.hoe,
      hasFishingrod: !!s.tools.fishingrod,
      hasBow: !!s.tools.bow,
      hasSword: !!s.tools.sword,
      hasLasso: s.inventory.count('lasso') > 0 || this.wildlife.leashedBy(s.player) !== null,
      lassoCount: s.inventory.count('lasso'),
      leading: this.wildlife.leashedBy(s.player) !== null,
      nearTether:
        this.wildlife.stakedNear(s.player.group.position, TETHER_RANGE) !== null,
      toolTiers: { ...s.tools },
      craftedIds: [...s.craftedIds],
      nearCrate: !!this.crates.nearby(s),
      nearBaitBarrel: !!this.baitBarrels.nearby(s),
      nearBrewBarrel: !!this.brewBarrels.nearby(s),
      nearSmelter: !!this.smelters.nearby(s),
      nearLoom: !!this.looms.nearby(s),
      nearBed: !!this.beds.nearby(s),
      bedSleeping: this.beds.isSleeping(s),
      bedSleepProgress: this.beds.getSleepProgress(s) ?? 0,
      crateSlots: this.crates.nearbySlots(s),
      crateCapacity: this.crates.nearbyCapacity(s),
      baitBarrelInfo: this.baitBarrels.nearbyInfo(s),
      brewBarrelInfo: this.brewBarrels.nearbyInfo(s),
      smelterInfo: this.smelters.nearbyInfo(s),
      nearCookingStation: !!this.cookingStations.nearby(s),
      cookingStationInfo: this.cookingStations.nearbyInfo(s),
      loomInfo: this.looms.nearbyInfo(s),
      equipped: s.equipment.snapshot(),
      gender: s.player.currentGender,
      tool: s.player.currentTool,
      craftId: s.crafting.currentRecipe?.id ?? null,
      craftProgress: s.crafting.getProgress() ?? 0,
      canCraftWorkbench: this.workbench.canStart(s),
      workbenchCrafting: this.workbench.isWorking(s),
      workbenchProgress: this.workbench.getProgress(s) ?? 0,
      workbenchLevel: this.workbench.level(s),
      nearWorkbench: this.workbench.isNear(s),
      canCraftCampfire: this.campfire.canStart(s),
      canBuildCampfire: this.campfire.canBuild(s),
      campfireCrafting: this.campfire.isBusy(s),
      campfireProgress: this.campfire.getProgress(s) ?? 0,
      nearCampfire: !!this.campfire.nearby(s),
      campfireInfo: this.campfire.getCampfireInfo(s),
      eatName: s.eating.currentFood?.name ?? null,
      eatProgress: s.eating.getProgress() ?? 0,
      autoEquipProgress: this.autoEquipTimer > 0 ? this.autoEquipTimer / AUTO_EQUIP_DELAY : 0,
      respawnLeft: s.survival.state.dead && (this.hostRef || (this.poseidonGrace && s === this.local)) ? s.respawnLeft : null,
      poseidonGrace: this.poseidonGrace && s === this.local && s.survival.state.dead,
      canFish: s.fishing.canStart(),
      fishingState: s.fishing.currentState,
      fishingProgress: s.fishing.getProgress() ?? 0,
      fishingTier: s.fishing.lootTier,
      fishingWaitLeft: s.fishing.waitLeft,
      biteActive: s.fishing.currentState === 'bite',
      biteClicks: s.fishing.biteClicks,
      biteNeed: s.fishing.biteNeed,
      treasureKind: s.fishing.treasureLoot,
      collectTreasure: this.collectTreasure,
      nearDrop: this.drops.getNearby(s),
      day: this.dayNight.day,
      busy,
      moving: s.player.isMoving,
      indicator: this.indicatorFor(s),
      buffs: this.buffsFor(s),
};
  }
  /** 某会话当前生效的 buff:全局祝福(波塞冬/蜂巢) + 光环祝福(治愈水晶/雨神祭坛) + 个人减速(熊扑),供 HUD 图标展示 */
  private buffsFor(s: PlayerSession): HudBuff[] {
    const list: HudBuff[] = [];
    if (this.shrines.blessed) list.push({ ...BUFFS.poseidon, remain: null });
    if (this.shrines.berryBlessed) list.push({ ...BUFFS.beehive, remain: null });
    const pos = s.player.group.position;
    if (this.shrines.inAura('healCrystal', pos)) list.push({ ...BUFFS.healCrystal, remain: null });
    if (this.shrines.inAura('rainAltar', pos)) list.push({ ...BUFFS.rainAltar, remain: null });
    const slow = s.player.slowSeconds;
    if (slow > 0) list.push({ ...BUFFS.bearSlow, remain: Math.ceil(slow) });
    const refresh = s.player.refreshSeconds;
    if (refresh > 0) list.push({ ...BUFFS.refresh, remain: Math.ceil(refresh) });
    const tipsy = s.player.tipsySeconds;
    if (tipsy > 0) list.push({ ...BUFFS.tipsy, remain: Math.ceil(tipsy) });
    return list;
  }

  /** 该玩家正在移动或处于任一交互进行中:闲置满 5s 后据此淡出设置/地图/背包/工具按钮与弹出卡片
   * 各交互(采集/制作/挖除/吃喝/钓鱼/拉弓等)都会设置玩家的作业动画,统一用 isActing 判定 */
  private isSessionActive(s: PlayerSession): boolean {
    return (
      s.player.isMoving ||
      s.player.isActing ||
      this.beds.isBusy(s) ||
      s.fishing.currentState !== null
    );
  }

  /** 玩家头顶的作业提示文字(投影到屏幕坐标,由 React UI 渲染)与进度圆环 */
  private updateIndicator(delta: number): void {
    let indicator = this.guestMode ? this.netIndicator : this.indicatorFor(this.local);
    if (this.guestMode && indicator.progress !== null) {
      const age = Math.min(0.25, performance.now() / 1000 - this.netIndicatorAt);
      const estimated = THREE.MathUtils.clamp(
        indicator.progress + this.netIndicatorVelocity * age,
        0,
        1
      );
      const current = this.netIndicatorProgress ?? estimated;
      this.netIndicatorProgress = THREE.MathUtils.lerp(
        current,
        estimated,
        1 - Math.exp(-18 * delta)
      );
      indicator = { ...indicator, progress: this.netIndicatorProgress };
    }
    // 客人端自动切工具的等待提示无法来自房主快照(计时在客人本地),这里本地补上
    if (this.guestMode && this.autoEquipTimer > 0) {
      const nearby = this.collect.getNearby();
      const tool =
        nearby?.kind === 'tree'
          ? '斧子'
          : nearby?.kind === 'rock' || nearby?.kind === 'iron' || nearby?.kind === 'meteor'
            ? '镐子'
            : '鱼竿';
      indicator = {
        ...indicator,
        label: `切换${tool}…`,
        progress: this.autoEquipTimer / AUTO_EQUIP_DELAY,
      };
    }
    const { label, progress, color } = indicator;
    const p = this.player.group.position;
    // 咬钩连点时头顶进度环与文字抬高,避开屏幕中央的全屏连点提示
    const bite = this.local.fishing.currentState === 'bite';
    this.indicator.group.position.copy(p);
    this.indicator.setProgress(progress, bite);
    this.indicator.setStamina(
      this.player.isSwimming ? this.survival.state.stamina / 100 : null
    );

    // 头顶文字投影为屏幕坐标(预告彩字时带颜色)
    const head = new THREE.Vector3(p.x, p.y + (bite ? 3.85 : 2.75), p.z).project(this.camera);
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    this.onLabel(
      label,
      Math.round(((head.x + 1) / 2) * w),
      Math.round(((1 - head.y) / 2) * h),
      color
    );

    // 自言自语气泡挂在作业提示上方,4 秒后消失
    if (this.mumbleText) {
      this.mumbleTimer -= delta;
      if (this.mumbleTimer <= 0) this.mumbleText = null;
    }
    const bubble = new THREE.Vector3(p.x, p.y + 4.3, p.z).project(this.camera);
    this.onMumble(
      this.mumbleText,
      Math.round(((bubble.x + 1) / 2) * w),
      Math.round(((1 - bubble.y) / 2) * h)
    );

    // 博美的头顶表情同样投影为屏幕坐标,交给 React 气泡渲染
    const dogAnchor = new THREE.Vector3();
    this.dog.fillEmojiAnchor(dogAnchor);
    dogAnchor.project(this.camera);
    this.onDogEmoji(
      this.dog.activeEmoji,
      Math.round(((dogAnchor.x + 1) / 2) * w),
      Math.round(((1 - dogAnchor.y) / 2) * h)
    );

    // 低数值提醒挂在头顶(作业提示下方),任一数值 ≤20% 时 UI 层显示对应图标+剩余条
    const s = this.survival.state;
    const warnAnchor = new THREE.Vector3(p.x, p.y + 1.9, p.z).project(this.camera);
    this.onVitals(
      s.dead ? null : { hunger: s.hunger, thirst: s.thirst, health: s.health },
      Math.round(((warnAnchor.x + 1) / 2) * w),
      Math.round(((1 - warnAnchor.y) / 2) * h)
    );
  }

  /** 为指定会话计算头顶交互反馈，房主借 HUD 快照定向同步给每名客人。 */
  private indicatorFor(session: PlayerSession): HudSnapshot['indicator'] {
    const nearby = session.collect.getNearby();
    let label: string | null = null;
    let progress: number | null = null;
    let color: string | undefined;
    if (session.survival.state.dead) {
      // 死亡时不显示
    } else if (session.milk.isWorking) {
      label = '挤羊奶…';
      progress = session.milk.getProgress();
    } else if (session.crafting.isWorking) {
      const { total, current } = session.crafting.queueInfo;
      label = `制作中:${session.crafting.currentRecipe!.name}${total > 1 ? ` ${current}/${total}` : ''}`;
      progress = session.crafting.getProgress();
    } else if (this.workbench.isWorking(session)) {
      label = this.workbench.isUpgrading(session) ? '升级中:工作台' : '制作中:工作台';
      progress = this.workbench.getProgress(session);
    } else if (this.workbench.isDigging(session)) {
      label = '挖工作台…';
      progress = this.workbench.getDigProgress(session);
    } else if (this.crates.isDigging(session)) {
      label = this.crates.diggingKind(session) === 'ironCrate' ? '挖铁箱…' : '挖木箱…';
      progress = this.crates.getDigProgress(session);
    } else if (this.baitBarrels.isDigging(session)) {
      label = '挖饵料桶…';
      progress = this.baitBarrels.getDigProgress(session);
    } else if (this.brewBarrels.isDigging(session)) {
      label = '挖酿酒桶…';
      progress = this.brewBarrels.getDigProgress(session);
    } else if (this.burrows.isDigging(session)) {
      label = '挖兔子洞…';
      progress = this.burrows.getDigProgress(session);
    } else if (this.smelters.isDigging(session)) {
      label = '挖冶炼炉…';
      progress = this.smelters.getDigProgress(session);
    } else if (this.cookingStations.isDigging(session)) {
      label = '挖烹饪台…';
      progress = this.cookingStations.getDigProgress(session);
    } else if (this.cookingStations.isRoasting(session)) {
      const { total, current } = this.cookingStations.roastInfo(session);
      const food = ITEMS[this.cookingStations.roastingKind(session)!];
      label = `烤制中:${food.icon} ${food.name} ${current}/${total}`;
      progress = this.cookingStations.getProgress(session);
    } else if (this.looms.isDigging(session)) {
      label = '挖纺织机…';
      progress = this.looms.getDigProgress(session);
    } else if (this.fences.isPlacing(session)) {
      label = session.player.currentTool === 'fenceGate' ? '装围栏门…' : '立围栏…';
      progress = this.fences.getPlaceProgress(session);
    } else if (this.fences.isDigging(session)) {
      label = '拆围栏…';
      progress = this.fences.getDigProgress(session);
    } else if (this.beds.isSleeping(session)) {
      label = '睡觉中…';
      progress = this.beds.getSleepProgress(session);
    } else if (this.beds.isDigging(session)) {
      label = '挖床…';
      progress = this.beds.getDigProgress(session);
    } else if (this.shrines.isDigging(session)) {
      label = '拆神像…';
      progress = this.shrines.getDigProgress(session);
    } else if (this.campfire.isDigging(session)) {
      label = '挖火堆…';
      progress = this.campfire.getDigProgress(session);
    } else if (this.campfire.isCooking(session)) {
      const { total, current } = this.campfire.cookInfo(session);
      const food = ITEMS[this.campfire.cookingKind(session)!];
      label = `烹饪中:${food.icon} ${food.name} ${current}/${total}`;
      progress = this.campfire.getProgress(session);
    } else if (this.campfire.isWorking(session)) {
      label = '搭建中:小火堆';
      progress = this.campfire.getProgress(session);
    } else if (session.eating.isWorking) {
      const food = session.eating.currentFood!;
      label = `${food.icon} ${isWineKind(food.kind) ? '喝' : '吃'}${food.name}`;
      progress = session.eating.getProgress();
    } else if (session.fishing.isWorking) {
      const s = session.fishing.currentState!;
      const tease = session.fishing.getTease();
      label =
        s === 'casting'
          ? '抛竿…'
          : s === 'waiting'
            ? tease?.text ?? '等待上钩…'
            : s === 'bite'
              ? session.fishing.biteNeed > 1
                ? `咬钩了!快连点屏幕!${session.fishing.biteClicks}/${session.fishing.biteNeed}`
                : '咬钩了!快点击屏幕!'
              : s === 'treasure'
                ? '转珍宝转盘中…'
                : '收线…';
      progress = session.fishing.getProgress();
      color = tease?.color;
    } else if (nearby && session.collect.canCollect(nearby)) {
      progress = session.collect.getHarvestInfo()?.progress ?? null;
      const digging = session.player.currentTool === 'hoe';
      label =
        session.collect.isPickingFruit(nearby)
          ? '摘果子'
          : nearby.kind === 'tree'
          ? '砍树'
          : nearby.kind === 'iron'
            ? '采铁'
            : nearby.kind === 'rock' || nearby.kind === 'meteor'
              ? '采石'
            : nearby.kind === 'gravel'
              ? '捡石头'
              : nearby.kind === 'shrub'
                ? digging
                  ? '挖灌木丛'
                  : '捡树枝'
              : nearby.kind === 'grass'
                ? digging
                  ? '挖草丛'
                  : '采纤维'
                : nearby.kind === 'wormNest'
                  ? digging
                    ? '挖蚯蚓窝'
                    : '捉蚯蚓'
                  : digging
                    ? '挖浆果丛'
                    : '采浆果';
    } else if (session.water.isActive) {
      label = '喝水';
      progress = session.water.getProgress();
    } else if (session === this.local && this.autoEquipTimer > 0 && !nearby) {
      label = '切换鱼竿…';
      progress = this.autoEquipTimer / AUTO_EQUIP_DELAY;
    } else if (nearby) {
      const switching = session === this.local && this.autoEquipTimer > 0;
      label =
        nearby.kind === 'tree'
          ? switching
            ? '切换斧子…'
            : session.tools.axe
              ? null
              : '需要斧子'
          : nearby.kind === 'iron'
            ? switching
              ? '切换镐子…'
              : session.tools.pickaxe >= 2
                ? null
                : '需要石镐'
            : nearby.kind === 'rock'
              ? switching
                ? '切换镐子…'
                : session.tools.pickaxe
                  ? null
                  : '需要镐子'
              : nearby.kind === 'meteor'
                ? switching
                  ? '切换镐子…'
                  : session.tools.pickaxe >= 3
                    ? null
                    : '需要铁镐'
                : null;
      if (switching) progress = this.autoEquipTimer / AUTO_EQUIP_DELAY;
    }
    return { label, progress, color };
  }
}
