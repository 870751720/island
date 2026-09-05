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
import { DayNightSystem } from './systems/DayNightSystem';
import { WeatherSystem } from './systems/WeatherSystem';
import { RECIPES, TOOL_IDS, type CraftId, type ToolId, type Tools } from './systems/Crafting';
import { CraftingSystem } from './systems/CraftingSystem';
import { DropSystem, type DropInfo } from './systems/DropSystem';
import { WorkbenchSystem, workbenchItemLevel } from './systems/WorkbenchSystem';
import { CrateSystem } from './systems/CrateSystem';
import { FenceSystem, fenceKindOfItem } from './systems/FenceSystem';
import { BedSystem, bedItemLevel } from './systems/BedSystem';
import { ShrineSystem } from './systems/ShrineSystem';
import { BUFFS, type HudBuff } from './systems/BuffSystem';
import { MeteorSystem } from './systems/MeteorSystem';
import { CampfireSystem, type CampfireInfo } from './systems/CampfireSystem';
import { EatingSystem } from './systems/EatingSystem';
import { firstFoodIn, FOODS, type Food } from './systems/Food';
import { ITEMS } from './systems/Items';
import { WaterSystem } from './systems/WaterSystem';
import { FishingSystem, type FishingState } from './systems/FishingSystem';
import type { FishTier } from './systems/FishTable';
import { BowSystem } from './systems/BowSystem';
import { SwordSystem } from './systems/SwordSystem';
import { MumbleSystem } from './systems/MumbleSystem';
import { Particles } from './fx/Particles';
import { GameAudio } from './audio/GameAudio';
import type { SfxName } from './audio/Sfx';
import { WaterFx } from './fx/WaterFx';
import { Rain } from './fx/Rain';
import { RainImpact } from './fx/RainImpact';
import { Wind } from './fx/Wind';
import { PondLife } from './fx/PondLife';
import { Footprints } from './fx/Footprints';
import { ItemFlyFx } from './fx/ItemFlyFx';
import { PlayerIndicator } from './ui3d/PlayerIndicator';
import { DEFAULT_CAPACITY, Inventory, type InventorySlot, type ResourceKind } from './systems/Inventory';
import { EQUIPMENT, Equipment, isEquipKind, SLOT_ORDER, type EquipKind, type EquipSlot } from './systems/Equipment';
import { SaveSystem, SAVE_VERSION, type SaveData, type SessionSave } from './systems/SaveSystem';
import { SurvivalSystem } from './systems/SurvivalSystem';
import { GmSystem, gmApply, gmSnapshot, type GmConfig } from './systems/GmSystem';
import { IslandTerrain } from './world/IslandTerrain';
import { Ocean } from './world/Ocean';
import { OceanDepth } from './world/OceanDepth';
import { WaterDebugOverlay } from './world/WaterDebugOverlay';
import { Clouds } from './world/Clouds';
import { Props } from './world/Props';
import { SEED_OF } from './world/TreeSpecies';
import { openBottle } from './systems/BottleMessages';
import { MinimapSystem, type GroundKind, type MinimapMarker, type MinimapSnapshot } from './systems/MinimapSystem';
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
  wood: number;
  stone: number;
  berry: number;
  fiber: number;
  fur: number;
  crabMeat: number;
  birdMeat: number;
  gameMeat: number;
  rope: number;
  arrow: number;
  /** 背包剩余鱼饵数(持鱼竿时工具按钮角标展示) */
  bait: number;
  /** 背包里的床数(工作台面板判断二级床配方可见性) */
  bed1: number;
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
  /** 各工具当前等级(0 未拥有、1 基础、2 精致),用于展示精致名称 */
  toolTiers: Tools;
  /** 背包里是否有种子(可切换到种子播种) */
  /** 玩家在木箱旁(工具按钮变为木箱,点击打开储物面板) */
  nearCrate: boolean;
  /** 玩家在床旁(工具按钮变为床,点击开始睡觉) */
  nearBed: boolean;
  /** 睡觉过渡进行中与进度 */
  bedSleeping: boolean;
  bedSleepProgress: number;
  /** 身旁木箱的 10 格快照(不在木箱旁为 null) */
  crateSlots: InventorySlot[] | null;
  /** 四个装备栏位当前穿戴的道具(未装备为 null) */
  equipped: Record<EquipSlot, EquipKind | null>;
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
  /** 联机死亡后的复活倒计时剩余秒数(房主权威),未在倒计时时为 null */
  respawnLeft: number | null;
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
  /** 玩家附近可捡回的掉落物,无时为 null */
  nearDrop: DropInfo | null;
  /** 通用临时提示(自动消失),如「背包满了」 */
  notice: { id: number; text: string } | null;
  /** 当前是第几天(跨过正午计一天,睡觉跳夜也会推进) */
  day: number;
  /** 玩家正在移动或处于任一交互进行中(用于淡化非必要 HUD 按钮) */
  busy: boolean;
  /** 房主权威计算的头顶交互提示；联机客人不在本地推进交互系统。 */
  indicator: { label: string | null; progress: number | null; color?: string };
  /** 当前生效的 buff(全局祝福 + 个人减速),点图标看效果 tip */
  buffs: HudBuff[];
};

const VIEW_SIZE = 18;

/** 拾取提示(玩家头顶飘图标):道具、数量与诞生时的屏幕坐标 */
export type PickupToast = { items: { kind: ResourceKind; count: number }[]; x: number; y: number };

const AUTOSAVE_INTERVAL = 5; // 自动存档间隔(秒)
const AUTO_EQUIP_DELAY = 0.5; // 站定不动多久后自动切换到需要的工具(秒)
const IDLE_HIDE_DELAY = 5; // 玩家多久不移动/不交互后 HUD 才淡出(秒)
const MULTIPLAYER_RESPAWN_DELAY = 3;
/** 熊吼/扑击声的可闻范围:声源距任意存活玩家不超过该米数才播放 */
const BEAR_SFX_RANGE = 20;

/* 会话可被占用的交互类别(isSessionBusy 排除自身时用) */
type InteractionKind =
  | 'collect'
  | 'crafting'
  | 'eating'
  | 'fishing'
  | 'archery'
  | 'sword'
  | 'water'
  | 'workbench'
  | 'campfire'
  | 'crates'
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
  private local: PlayerSession;
  private props: Props;
  private fx: Particles;
  private itemFly: ItemFlyFx;
  private audio = new GameAudio();
  private waterFx: WaterFx;
  private pondLife: PondLife;
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
  private fences: FenceSystem;
  private beds: BedSystem;
  private shrines: ShrineSystem;
  private meteor: MeteorSystem;
  private campfire: CampfireSystem;
  private lastFishingState: FishingState | null = null;
  /** 上次推送的 busy 状态,变化时立即推送让按钮淡出更跟手 */
  private lastBusy = false;
  private lastBiteClicks = 0;
  /** 连续未移动且无交互的时长:达到 IDLE_HIDE_DELAY 后 HUD 淡出 */
  private idleTime = 0;
  private drops: DropSystem;
  private dayNight: DayNightSystem;
  private weather: WeatherSystem;
  private rain: Rain;
  private rainImpact: RainImpact;
  private windFx: Wind;
  private terrain: IslandTerrain;
  private ocean: Ocean;
  private oceanDepth: OceanDepth;
  private waterDebug: WaterDebugOverlay;
  private minimap: MinimapSystem;
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
    // 兜底:GPU 内存压力下浏览器可能回收 WebGL 上下文(画面变白、UI 与逻辑仍在),
    // preventDefault 允许浏览器异步恢复;恢复事件由 Three 内部处理并重传资源,画面自愈
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
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

    const terrain = new IslandTerrain(160, this.terrainSeed);
    this.terrain = terrain;
    this.minimap = new MinimapSystem(terrain.size);
    this.scene.add(terrain.mesh);
    this.oceanDepth = new OceanDepth(terrain);
    this.ocean = new Ocean(terrain.seaLevel, this.oceanDepth);
    this.scene.add(this.ocean.mesh);
    this.waterDebug = new WaterDebugOverlay(terrain);
    this.scene.add(this.waterDebug.mesh);
    this.clouds = new Clouds(terrain.size * 0.95);
    this.scene.add(this.clouds.group);
    this.props = new Props(this.scene, terrain, !save);
    this.fx = new Particles(this.scene);
    this.waterFx = new WaterFx(this.scene, this.fx);
    // 入包表现的目标点:玩家后背(朝向反方向、肩部高度),玩家移动时终点实时跟随
    this.itemFly = new ItemFlyFx(this.scene, () => this.itemFlyTargetFor(this.local)());

    this.scene.add(terrain.waterGroup);
    this.footprints = new Footprints(this.scene, terrain);
    this.pondLife = new PondLife(this.scene, terrain);
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
      (x, z) => this.isGroundBlocked(x, z)
    );
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
      (kind, count, actor) => this.giveItem(kind, count, actor)
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
    this.meteor = new MeteorSystem(
      this.scene,
      terrain,
      this.props,
      this.player,
      this.dayNight,
      this.fx,
      this.audio
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
        for (const session of this.sessions) session.player.update(delta, elapsed);
        this.minimap.update(this.player.group.position.x, this.player.group.position.z);
        this.dayNight.update(delta);
        this.meteor.update(delta);
        this.weather.update(delta);
        this.audio.setNight(this.dayNight.isNight);
        this.audio.setRainIntensity(this.weather.rainIntensity);
        this.rain.update(delta, this.player.group.position, this.weather.rainIntensity);
        this.rainImpact.update(delta, this.player.group.position, this.weather.rainIntensity);
        this.clouds.update(delta);
        this.terrain.updateWater(elapsed);
        this.waterDebug.mesh.visible = GmSystem.showWaterDebug;
        if (!this.guestMode) {
          this.crabs.update(delta, elapsed);
          this.butterflies.update(delta, elapsed);
          this.birds.update(delta, elapsed);
          this.wildlife.update(delta, elapsed);
          this.dog.update(delta, elapsed, this.drops, this.dayNight.isNight);
        } else {
          this.crabs.netUpdate(delta, elapsed);
          this.birds.netUpdate(delta, elapsed);
          this.wildlife.netUpdate(delta, elapsed);
          this.dog.netUpdate(delta, elapsed);
        }
        this.props.update(delta, elapsed, this.weather.wind);
        this.windFx.update(delta, this.player.group.position, this.weather.wind);
        this.fx.update(delta);
        this.itemFly.update(delta);
        this.waterFx.update(delta);
        this.pondLife.update(delta, elapsed);
        this.footprints.update(delta);
        // 各会话:生存结算与个人交互系统(采集/制作/进食/钓鱼/弓/喝水/挖掘/搭建);
        // 客人端不跑权威模拟,全部由房主快照驱动
        for (const s of this.guestMode ? [] : this.sessions) {
          this.activeNetActor = s;
          // 客人放箭的动作快照:客人射箭在客人端判定,房主按 arrowShot 动作补放箭动画窗口
          if (s !== this.local) {
            if (s.shotAnimLeft > 0) {
              s.shotAnimLeft = Math.max(0, s.shotAnimLeft - delta);
              s.player.setAction(s.shotAnimLeft > 0 ? 'shoot' : null);
            }
          }
          // 交互音效只给发起者本人听:远程会话的模拟音效本地静音,只广播给对应客人补播
          this.audio.silent = s !== this.local;
          s.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;
          s.survival.thirstDrainMultiplier =
            this.weather.thirstDrainMultiplier * s.equipment.thirstMultiplier();
          s.survival.swimming = s.player.isSwimming;
          s.survival.sleeping = s.player.isSleeping;
          s.survival.update(delta);
          // 血量下降(受击/饥饿/溺水)触发角色模型闪红与受伤音(音效带间隔节流,持续掉血不成串响)
          if (s.survival.state.health < s.lastHealth - 0.001) {
            s.player.hurt();
            if (s === this.local) {
              s.hurtSoundTimer -= delta;
              if (s.hurtSoundTimer <= 0) {
                this.audio.play('hurt');
                s.hurtSoundTimer = 1.5;
              }
            }
          }
          s.lastHealth = s.survival.state.health;
          if (s.survival.state.dead) {
            if (this.hostRef && s.respawnLeft > 0) {
              s.respawnLeft = Math.max(0, s.respawnLeft - delta);
              if (s.respawnLeft === 0) this.respawnMultiplayerSession(s);
            }
            continue;
          }
          s.collect.update(delta);
          s.crafting.update(delta);
          // 工作台配方离台即中断(小幅挪动可能未触发移动中断)
          if (
            s.crafting.isWorking &&
            s.crafting.currentRecipe?.station === 'workbench' &&
            !this.workbench.isNear(s)
          ) {
            s.crafting.cancel();
          }
          s.eating.update(delta);
          s.fishing.update(delta, this.isSessionBusy(s, 'fishing'));
          // 弓由玩家移动瞄准操控:只有本地玩家自己跑(客人的弓在客人端判定,结果上行结算)
          if (s === this.local) {
            s.archery.update(delta, this.isSessionBusy(s, 'archery') || s.survival.state.dead);
            s.sword.update(delta, this.isSessionBusy(s, 'sword') || s.survival.state.dead);
          } else {
            // 远程玩家的弓不跑瞄准逻辑,但 arrowShot 复现的视觉箭矢要照常飞行与消失;
            // 剑的 swordHit 复现挥砍动作窗口也要照常推进与收尾
            s.archery.updateVisuals(delta);
            s.sword.updateVisuals(delta);
          }
          // 手持鱼竿站在水边是准备钓鱼,自动喝水让位
          s.water.update(delta, this.isSessionBusy(s, 'water') || s.player.currentTool === 'fishingrod');
          this.crates.updateActor(s, delta);
          this.fences.updateActor(s, delta);
          this.beds.updateActor(s, delta);
          this.shrines.updateActor(s, delta);
          this.workbench.updateActor(s, delta);
          this.campfire.updateActor(s, delta);
          // 手里的种子/围栏用光后自动收起,回到空手
          if (s.player.currentTool !== 'hand' && !this.hasToolFor(s, s.player.currentTool)) {
            s.player.setTool('hand');
          }
        }
        this.activeNetActor = null;
        this.audio.silent = false;
        // 睡觉过渡中:天空随进度日夜流转(多人同时睡取最先入睡者的进度)
        for (const s of this.sessions) {
          const sleepProgress = this.beds.getSleepProgress(s);
          if (sleepProgress !== null) {
            this.dayNight.setSleepProgress(sleepProgress);
            break;
          }
        }
        this.fences.update(delta, this.sessions.map((s) => s.player.group.position));
        this.campfire.update(delta, elapsed);
        this.shrines.update(delta, elapsed);
        this.drops.update(delta, elapsed);
        this.mumbles.update(delta, {
          elapsed,
          dead: this.survival.state.dead,
          hunger: this.survival.state.hunger,
          thirst: this.survival.state.thirst,
          health: this.survival.state.health,
          phase: this.dayNight.state.phase,
          rainIntensity: this.weather.rainIntensity,
          freeSlots: this.inventory.freeSlots,
          wood: this.inventory.count('wood'),
          stone: this.inventory.count('stone'),
          tools: this.tools,
          collecting: this.collect.isWorking,
        });
        this.updateIndicator(delta);
        this.updateCamera(delta);
        this.ocean.update(this.camera, elapsed);
        this.renderer.render(this.scene, this.camera);
        for (const s of this.sessions) {
          if (s.survival.state.dead && !s.lastDead) {
            // 背包里有复活石则碎裂一颗,免惩罚在出生点原地苏醒(客人端死亡表现由快照驱动)
            if (this.guestMode || !this.tryReviveWithStone(s)) {
              s.player.setDead();
              if (this.hostRef) s.respawnLeft = MULTIPLAYER_RESPAWN_DELAY;
              if (s === this.local) {
                this.audio.play('death');
                // 死亡瞬间清摇杆(死亡界面会卸载摇杆,残留的最后输入会让复活后持续移动)
                this.setJoystick(0, 0);
                // 单机死亡清档；联机玩家由房主在倒计时结束后重生。
                if (!this.hostRef && !this.guestMode) SaveSystem.clear();
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
          for (const s of this.sessions) {
            // 远程玩家(房主)的弓只推进 arrowShot 复现的视觉箭矢
            if (s !== this.local) s.archery.updateVisuals(delta);
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
      },
    });

    this.applySave(save);
    if (this.hostRef) this.bindWorldChangeSinks();
    if (this.hostRef) this.hostRef.attach(this);
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
      list: this.sessions.map((s) => {
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
          hunger: sv.hunger,
          thirst: sv.thirst,
          health: sv.health,
          stamina: sv.stamina,
          dead: sv.dead,
          action: s.player.currentAction,
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
      fences: this.fences.snapshotFences(),
      fenceGates: this.fences.snapshotGates(),
      beds: this.beds.snapshot(),
      shrines: this.shrines.snapshot(),
      drops: this.drops.snapshot(),
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
    this.fences.setChangeSinks(send('fences'), send('fenceGates'));
    this.beds.setChangeSink(send('beds'));
    this.shrines.setChangeSink(send('shrines'));
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
          // 远程玩家钓鱼表现:作业动作出现即本地起播浮漂钓线,动作消失即收线;
          // 交互音效只给发起者本人听,远程会话起播时静音
          this.audio.silent = true;
          if (p.action === 'cast' || p.action === 'fish') s.fishing.netEnter();
          else s.fishing.netStop();
          this.audio.silent = false;
      }
      s.player.setAction(p.action);
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
    if (state.fences || state.fenceGates) {
      this.fences.netApply(state.fences ?? [], state.fenceGates ?? []);
    }
    if (state.beds) {
      this.beds.netApply(state.beds);
    }
    if (state.shrines) {
      this.shrines.netApply(state.shrines);
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

  /** 房主收到客人放箭动作:权威扣一支箭(射没射中都消耗)、补放箭动画窗口、复现视觉箭矢并转发给其他客人 */
  netArrowShot(actor: PlayerSession, dx: number, dz: number): void {
    actor.inventory.remove('arrow', 1);
    actor.shotAnimLeft = 0.35;
    actor.archery.netPlayShot(dx, dz);
    this.hostRef?.broadcastEvent({ kind: 'arrowShot', actor: actor.id, dx, dz });
  }

  /** 熊击某玩家的最终结算:减伤掉血 + 压制减速 + 打击粒子/音效 + 本地伤害数字 */
  private applyWildlifeHit(session: PlayerSession, damage: number, pounce: boolean): void {
    const player = session.player;
    const final = Math.max(1, damage - session.equipment.totalDefense());
    session.survival.damage(final);
    // 扑击命中额外压制:减速 3 秒(移动减半),摔得爬不起来
    if (pounce) player.applySlow(3);
    this.playWildlifeHitFeedback(session, final);
    // 客人被击中的表现在客人端补播(闪红与音效由血量快照驱动,这里补齐粒子/数字/减速)
    if (this.hostRef && session !== this.local) {
      this.hostRef.broadcastEvent({ kind: 'wildlifeHit', target: session.id, damage: final, pounce });
    }
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

  /** 世界部分恢复(昼夜/资源点/摆件/掉落物/狗/迷雾),客人收到世界快照时复用 */
  private applyWorldSave(save: SaveData): void {
    this.dayNight.time = save.dayTime;
    if (save.day) this.dayNight.day = save.day;
    this.props.applySave(save.props);
    if (save.fog) this.minimap.restore(save.fog);
    this.campfire.restore(save.campfires);
    if (save.workbenches) this.workbench.restore(save.workbenches);
    if (save.workbenchCrafted) this.workbench.restoreCrafted();
    this.crates.restore(save.crates);
    this.fences.restore(save.fences ?? [], save.fenceGates ?? []);
    this.beds.restore(save.beds ?? []);
    this.shrines.restore(save.shrines ?? []);
    this.drops.restore(save.drops);
    if (save.dog) this.dog.restore(save.dog.x, save.dog.z);
  }

  /** 把一名玩家的会话存档写回其会话(位置/生存/背包/工具/穿戴) */
  private applyPlayerSave(session: PlayerSession, data: SessionSave): void {
    const p = session.player.group.position;
    p.set(data.player.x, data.player.y, data.player.z);
    session.survival.state.hunger = data.survival.hunger;
    session.survival.state.thirst = data.survival.thirst;
    session.survival.state.health = data.survival.health;
    session.survival.state.stamina = data.survival.stamina;
    session.lastHealth = data.survival.health;
    session.survival.state.dead = false;
    session.inventory.load(data.slots, data.capacity);
    session.equipment.restore(data.equipped, session.inventory);
    // 恢复已拥有的工具(含等级)
    for (const [id, tier] of Object.entries(data.tools)) {
      if (tier > 0) session.tools[id as ToolId] = tier;
    }
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
      tools: { ...session.tools },
      equipped: session.equipment.snapshotForSave(),
      handTool: session.player.currentTool,
    };
  }

  /** 汇总当前进度为存档数据(联机时房主把全部玩家会话一并保存) */
  collectSave(forNetwork = false): SaveData {
    return {
      ...this.collectPlayerSave(this.local),
      others: [
        ...this.sessions.slice(1).map((s) => this.collectPlayerSave(s)),
        ...(forNetwork ? [] : this.savedRemoteSessions),
      ],
      version: SAVE_VERSION,
      terrainSeed: this.terrainSeed,
      dayTime: this.dayNight.time,
      day: this.dayNight.day,
      props: this.props.snapshot(),
      campfires: this.campfire.snapshot(),
      workbenches: this.workbench.snapshot(),
      workbenchCrafted: this.workbench.hasCrafted,
      crates: this.crates.snapshot(),
      fences: this.fences.snapshotFences(),
      fenceGates: this.fences.snapshotGates(),
      beds: this.beds.snapshot(),
      shrines: this.shrines.snapshot(),
      drops: this.drops.snapshot(),
      dog: this.dog.snapshot(),
      fog: this.minimap.serialize(),
    };
  }

  /** 小地图地面采样(绘制底图颜色用):高度低于水面为水,岸边为沙,高处为深草 */
  getGroundKind(x: number, z: number): GroundKind {
    const h = this.terrain.getHeight(x, z);
    if (h < this.terrain.getWaterLevel(x, z) - 0.02) return 'water';
    if (h < 0.05) return 'sand';
    return h < 1.8 ? 'grass' : 'dark';
  }

  /** 供小地图每帧拉取:岛屿尺寸、玩家落点、已探索迷雾与建筑标记 */
  getMinimapSnapshot(): MinimapSnapshot {
    const p = this.player.group.position;
    const markers: MinimapMarker[] = [];
    for (const pos of this.workbench.positions) markers.push({ kind: 'workbench', ...pos });
    for (const pos of this.campfire.positions) markers.push({ kind: 'campfire', ...pos });
    for (const pos of this.beds.positions) markers.push({ kind: 'bed', ...pos });
    return {
      islandSize: this.terrain.size,
      player: { x: p.x, z: p.z },
      others: this.sessions
        .filter((s) => s !== this.local)
        .map((s) => ({
          x: s.player.group.position.x,
          z: s.player.group.position.z,
          name: s.name,
        })),
      markers: markers.filter((m) => this.minimap.isExplored(m.x, m.z)),
      explored: this.minimap.grid,
      gridLen: this.minimap.gridLen,
    };
  }

  /** 设置面板调整音量后热应用(音乐/音效两条总线)并持久化 */
  setAudioSettings(settings: AudioSettings): void {
    this.audio.setVolumes(settings.music, settings.sfx);
    saveAudioSettings(settings);
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
   * 与键盘 W/摇杆上推的移动语义一致(俯角与旧版对角视角相同,只改水平朝向) */
  private updateCamera(delta: number): void {
    const target = this.player.group.position;
    const desiredX = target.x;
    const desiredY = target.y + 24;
    const desiredZ = target.z + Math.hypot(20, 20);
    const k = 1 - Math.pow(0.001, delta);
    this.camera.position.x += (desiredX - this.camera.position.x) * k;
    this.camera.position.y += (desiredY - this.camera.position.y) * k;
    this.camera.position.z += (desiredZ - this.camera.position.z) * k;
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

  /** 切换手持工具:客人本地先切(预测表现)并上行给房主 */
  selectTool(tool: HandTool): void {
    this.player.setTool(tool);
    this.guestNet?.action('tool', [tool]);
  }

  /** 循环切换手持工具:空手 → 斧子 → 镐子 → 锄头 → 鱼竿 → 弓 → 木剑 → 围栏/门(仅手里还有的) */
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
      'fence',
      'fenceGate',
    ];
    const owned: HandTool[] = order.filter((t) => t === 'hand' || this.hasTool(t));
    return owned[(owned.indexOf(this.player.currentTool) + 1) % owned.length];
  }

  /** 工具按钮点击:场景有明确需要的工具时直接切过去,否则循环切换 */
  useToolButton(): void {
    const need = this.wantedTool();
    if (need) {
      this.autoEquipTimer = 0;
      this.selectTool(need);
    } else {
      this.cycleTool();
    }
  }

  /** 站定不动时当前场景希望切到的工具(树→斧子、石→镐子),不满足条件返回 null;钓鱼不自动切换 */
  private wantedTool(): HandTool | null {
    if (
      this.player.isMoving ||
      (this.guestMode && this.player.isActing) ||
      this.archery.isWorking ||
      this.crafting.isWorking ||
      this.workbench.isWorking(this.local) ||
      this.eating.isWorking ||
      this.beds.isBusy(this.local) ||
      this.survival.state.dead
    ) {
      return null;
    }
    const nearby = this.collect.getNearby();
    if (nearby) {
      if (nearby.kind === 'tree' && this.tools.axe && this.player.currentTool !== 'axe') {
        return 'axe';
      }
      if (
        (nearby.kind === 'rock' || nearby.kind === 'meteor') &&
        this.tools.pickaxe &&
        this.player.currentTool !== 'pickaxe'
      ) {
        return 'pickaxe';
      }
      if (nearby.kind === 'worm' && this.tools.hoe && this.player.currentTool !== 'hoe') {
        return 'hoe';
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

  /** 吃食物(定时进食动作):指定种类则吃该种,否则吃背包里最前面的,返回是否成功开始 */
  eatFood(kind?: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('eatFood', [kind]);

    const a = actor;
    if (
      a.crafting.isWorking ||
      this.workbench.isWorking(a) ||
      a.eating.isWorking ||
      a.fishing.isWorking ||
      this.beds.isBusy(a)
    ) {
      return false;
    }
    const food = kind ? FOODS.find((f) => f.kind === kind) : firstFoodIn(a.inventory.snapshot());
    return food ? a.eating.start(food) : false;
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

  /** GM 发放道具(直接进背包);工具类改为直接点亮拥有状态 */
  gmGiveItem(kind: ResourceKind, count: number, actor: Actor = this.local): void {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) {
      this.guestNet.action('gmGiveItem', [kind, count]);
      return;
    }

    if ((TOOL_IDS as string[]).includes(kind)) {
      actor.tools[kind as ToolId] = 1;
      return;
    }
    this.giveItem(kind, count, actor);
  }

  /** GM 直接把工具点亮到指定等级(1 基础 / 2 精致) */
  gmGiveTool(tool: ToolId, tier: 1 | 2, actor: PlayerSession = this.local): void {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) {
      this.guestNet.action('gmGiveTool', [tool, tier]);
      return;
    }

    actor.tools[tool] = Math.max(actor.tools[tool], tier);
  }

  /** 产物入包,背包放不下的部分掉在玩家身旁地上 */
  giveItem(kind: ResourceKind, count: number, actor: Actor = this.local): number {
    const added = actor.inventory.add(kind, count);
    const overflow = count - added;
    if (overflow > 0) this.drops.dropOverflow(kind, overflow, actor);
    return added;
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
    for (const id of TOOL_IDS) session.tools[id] = 0;
    const survival = session.survival.state;
    survival.hunger = survival.thirst = survival.health = survival.stamina = 100;
    survival.dead = false;
    session.lastHealth = 100;
    session.lastDead = false;
    session.player.input.setJoystick(0, 0);
    session.player.respawn(this.terrain.findSpawnPoint());
  }

  /** GM 跳转昼夜时刻,t∈[0,1),0.25 为正午;客人端上行车主权威结算,时刻随快照回流 */
  gmSetTime(t: number): void {
    if (this.guestNet) {
      this.guestNet.action('gmSetTime', [t]);
      return;
    }
    this.dayNight.time = t;
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
    if (actor !== this.local) {
      this.wildlife.gmSpawnNear(species, p.x, p.z);
      return;
    }
    this.notify(
      this.wildlife.gmSpawnNear(species, p.x, p.z)
        ? `已在附近生成${ANIMAL_LABELS[species]}`
        : '附近没有合适的草地,挪个位置再试'
    );
  }

  /** GM 开关调整:本地立即生效;联机时全房间同步同一份配置 */
  gmSetConfig(patch: Partial<GmConfig>): void {
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

  /** 背包里点击「使用」木箱:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useCrate(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useCrate', []);

    if (this.asleepFor(actor)) return false;
    if (!this.crates.use(actor)) {
      this.notify('这里放不下,找个没东西的干地试试');
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
      this.notify('这里放不下,找个没东西的干地试试');
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
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable(actor);
    return true;
  }

  /** 睡觉消耗/恢复的固定数值 */
  private static readonly SLEEP_COST = 20;

  /** 靠近床发起睡觉:玩家躺上床,天空在过渡中日夜流转,醒来后统一结算 */
  sleep(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('sleep', []);

    const a = actor;
    if (this.beds.isBusy(a) || !this.beds.nearby(a) || a.survival.state.dead) return false;
    const s = a.survival.state;
    if (s.hunger < Game.SLEEP_COST || s.thirst < Game.SLEEP_COST) {
      if (a === this.local) this.notify('又饿又渴睡不着,先吃点喝点再睡吧');
      return false;
    }
    const skipped = this.dayNight.beginSleep();
    return this.beds.startSleep(
      a,
      () => {
        this.dayNight.endSleep();
        this.props.advance(skipped);
        this.campfire.passTime(skipped, performance.now() / 1000);
        s.hunger -= Game.SLEEP_COST;
        s.thirst -= Game.SLEEP_COST;
        s.health = Math.min(100, s.health + Game.SLEEP_COST);
        this.audio.play('success');
        const p = a.player.group.position.clone();
        p.y += 0.8;
        this.fx.burst(p, '#cfe8ff', 14);
        if (a === this.local) this.notify('一觉睡到了第二天清晨');
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
      this.notify('这里放不下,找块没东西的干地正对着要围的方向试试');
      return false;
    }
    this.afterPlaceDiggable(a);
    return true;
  }

  /** 背包里点击「使用」波塞冬的祝福:校验通过后在玩家脚下原地立起神像,不满足时给出提示 */
  useShrine(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('useShrine', []);

    if (this.asleepFor(actor) || !this.shrines.place(actor)) {
      this.notify('这里放不下,找个没东西的干地试试');
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
    if (session === this.local) {
      this.audio.play('success');
      this.notify('复活石发出微光碎裂了,你在出生点苏醒');
    }
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
      this.notify('这里种不了,找个没东西的干地试试');
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

  /** 背包里点击「使用」挖来的丛:校验与工作台摆放一致(不能在水里/水边,脚下不能被占住),通过后在原地种下 */
  useBush(kind: 'berryBush' | 'shrubBush' | 'grassTuft', actor: PlayerSession = this.local): boolean {
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
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    a.inventory.remove(kind, 1);
    const bushKind = kind === 'berryBush' ? 'berry' : kind === 'grassTuft' ? 'grass' : 'shrub';
    this.props.placeBush(bushKind, p.x, p.z);
    this.afterPlaceDiggable(a);
    this.audio.play('success');
    const fxPos = p.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, kind === 'berryBush' ? '#5d8a3a' : kind === 'grassTuft' ? '#a4c46a' : '#6b8f4e', 10);
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
    if (!a.inventory.canFit(near.kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    this.markPickupOrigin(near.position, a);
    return this.drops.pickupNearby(a);
  }

  /** 通用临时提示(由 UI 自动消失) */
  notify(text: string): void {
    this.notice = { id: ++this.noticeId, text };
    this.hudTimer = 1; // 跳过节流立即推送
    this.pushHud(0);
  }

  /** 发起定时搭建火堆(站定敲打,进度走头顶圆环),返回是否成功开始 */
  craftCampfire(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('craftCampfire', []);

    if (this.asleepFor(actor)) return false;
    return this.campfire.start(actor);
  }

  /** 把背包里该种类全部道具存入身旁木箱(整格),失败时给出提示 */
  crateStore(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('crateStore', [kind]);

    if (this.asleepFor(actor)) return false;
    if (!this.crates.store(actor, kind)) {
      this.notify('木箱装不下了');
      return false;
    }
    return true;
  }

  /** 把身旁木箱里该种类全部道具取回背包(整格),失败时给出提示 */
  crateTake(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('crateTake', [kind]);

    if (this.asleepFor(actor)) return false;
    if (!this.crates.take(actor, kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    return true;
  }

  /** 向身旁火堆添加 1 个可燃物,返回是否成功 */
  campfireAddFuel(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流
    if (this.guestNet) return this.guestNet.action('campfireAddFuel', [kind]);

    if (this.asleepFor(actor)) return false;
    return this.campfire.addFuel(actor, kind) > 0;
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

  /** 联机(房主侧)移除一名远程玩家(断线超时) */
  removeRemoteSession(session: PlayerSession): void {
    this.sessions = this.sessions.filter((s) => s !== session);
    this.campfire.detach(session);
    this.workbench.detach(session);
    this.crates.detach(session);
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
    // 弓优先级最高:瞄准中(虚线可见)或放箭动作期间,其他站定交互(采集/喝水等)让位,先放箭再交互
    if (exclude !== 'archery' && (s.archery.isWorking || s.archery.isAiming)) return true;
    if (exclude !== 'sword' && s.sword.isWorking) return true;
    if (exclude !== 'collect' && s.collect.isWorking) return true;
    if (exclude !== 'crafting' && s.crafting.isWorking) return true;
    if (exclude !== 'eating' && s.eating.isWorking) return true;
    if (exclude !== 'fishing' && s.fishing.isWorking) return true;
    if (exclude !== 'water' && s.water.isActive) return true;
    if (exclude !== 'workbench' && (this.workbench.isWorking(s) || this.workbench.isDigging(s)))
      return true;
    if (exclude !== 'campfire' && this.campfire.isBusy(s)) return true;
    if (exclude !== 'crates' && this.crates.isDigging(s)) return true;
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
    // 穿戴变化即时反映到玩家模型;背包类装备扩容,卸下/换小背包则收缩并溢出掉落
    s.equipment.onChange = (slot, kind) => {
      s.player.setEquip(slot, kind);
      const cap = kind ? EQUIPMENT[kind].capacity : undefined;
      if (cap) s.inventory.setCapacity(cap);
      if (slot === 'backpack') {
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
      (position) => this.markPickupOrigin(position, s)
    );
    s.crafting = new CraftingSystem(
      s.player,
      s.inventory,
      s.tools,
      this.fx,
      this.audio,
      // 背包放不下的产物掉在玩家身旁
      (kind, count) => this.giveItem(kind, count, s),
      // 装备做出来且评分高于身上这件时直接上身
      (kind) => {
        if (isEquipKind(kind)) s.equipment.equip(kind, s.inventory);
      }
    );
    s.eating = new EatingSystem(s.player, s.inventory, s.survival, this.fx, this.audio);
    s.fishing = new FishingSystem(
      this.scene,
      s.player,
      this.terrain,
      s.inventory,
      this.waterFx,
      this.fx,
      this.audio,
      s.tools,
      // 记录鱼获的飞行起点(本地玩家供自己的入包飞行,房主侧供远程玩家的飞行与广播)
      (position) => this.markPickupOrigin(position, s),
      // 波塞冬神像放置期间杂物概率降低
      () => this.shrines.junkCut
    );
    s.archery = new BowSystem(
      this.scene,
      s.player,
      this.terrain,
      s.inventory,
      this.crabs,
      this.birds,
      this.wildlife,
      this.fx,
      this.audio,
      s.tools,
      // 击杀的战利品散落在击杀位置周围,走近后点「捡回」拾取
      (items: { kind: ResourceKind; count: number }[], x: number, z: number) => {
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
        : undefined
    );
    s.sword = new SwordSystem(
      s.player,
      this.wildlife,
      this.fx,
      this.audio,
      // 击杀的战利品散落在玩家身旁,走近后点「捡回」拾取
      (items: { kind: ResourceKind; count: number }[], x: number, z: number) => {
        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2;
          this.drops.dropAt(item.kind, item.count, x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6);
        });
      },
      // 客人端:命中判定在本地完成,结果上行房主权威结算(伤害/掉落随快照回流)
      this.guestMode && s === this.local
        ? (animalId: number) => this.guestNet?.action('swordHit', [animalId])
        : undefined
    );
    s.water = new WaterSystem(s.player, this.terrain, s.survival, this.audio);
  }

  /** 手上是否还持有该工具(围栏/门按背包数量判断) */
  private hasToolFor(s: PlayerSession, tool: Exclude<HandTool, 'hand'>): boolean {
    if (tool === 'fence')
      return s.inventory.count('fenceWood') + s.inventory.count('fenceStone') > 0;
    if (tool === 'fenceGate') return s.inventory.count('fenceGate') > 0;
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
    this.rain.dispose();
    this.windFx.dispose();
    this.footprints.dispose();
    this.waterDebug.dispose();
    this.ocean.dispose();
    this.oceanDepth.dispose();
    this.audio.dispose();
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
    // 玩家移动/交互中立刻显示;连续闲置 5s 后才淡出
    const active = this.isPlayerBusy;
    this.idleTime = active ? 0 : this.idleTime + delta;
    const busy = !active && this.idleTime >= IDLE_HIDE_DELAY;
    const busyChanged = busy !== this.lastBusy;
    this.lastBusy = busy;
    if (this.hudTimer < 0.25 && !fishingChanged && !clicksChanged && !busyChanged) return;
    this.hudTimer = 0;
    this.onHud({ ...this.snapshotHud(this.local, busy), notice: this.notice });
  }

  /** 计算某会话的 HUD 数据快照(本地走 pushHud,联机时房主为每个客人各算一份下发;notice 是房主本地提示,不下发) */
  hudFor(s: PlayerSession): Omit<HudSnapshot, 'notice'> {
    return this.snapshotHud(s, false);
  }

  private snapshotHud(s: PlayerSession, busy: boolean): Omit<HudSnapshot, 'notice'> {
    return {
      ...s.survival.state,
      wood: s.inventory.count('wood'),
      stone: s.inventory.count('stone'),
      berry: s.inventory.count('berry'),
      fiber: s.inventory.count('fiber'),
      fur: s.inventory.count('fur'),
      crabMeat: s.inventory.count('crabMeat'),
      birdMeat: s.inventory.count('birdMeat'),
      gameMeat: s.inventory.count('gameMeat'),
      rope: s.inventory.count('rope'),
      arrow: s.inventory.count('arrow'),
      bait: s.inventory.count('bait'),
      bed1: s.inventory.count('bed1'),
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
      toolTiers: { ...s.tools },
      nearCrate: !!this.crates.nearby(s),
      nearBed: !!this.beds.nearby(s),
      bedSleeping: this.beds.isSleeping(s),
      bedSleepProgress: this.beds.getSleepProgress(s) ?? 0,
      crateSlots: this.crates.nearbySlots(s),
      equipped: s.equipment.snapshot(),
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
      respawnLeft: s.survival.state.dead && this.hostRef ? s.respawnLeft : null,
      canFish: s.fishing.canStart(),
      fishingState: s.fishing.currentState,
      fishingProgress: s.fishing.getProgress() ?? 0,
      fishingTier: s.fishing.lootTier,
      fishingWaitLeft: s.fishing.waitLeft,
      biteActive: s.fishing.currentState === 'bite',
      biteClicks: s.fishing.biteClicks,
      biteNeed: s.fishing.biteNeed,
      nearDrop: this.drops.getNearby(s),
      day: this.dayNight.day,
      busy,
      indicator: this.indicatorFor(s),
      buffs: this.buffsFor(s),
};
  }
  /** 某会话当前生效的 buff:全局祝福(波塞冬神像) + 个人减速(熊扑),供 HUD 图标展示 */
  private buffsFor(s: PlayerSession): HudBuff[] {
    const list: HudBuff[] = [];
    if (this.shrines.blessed) list.push({ ...BUFFS.poseidon, remain: null });
    const slow = s.player.slowSeconds;
    if (slow > 0) list.push({ ...BUFFS.bearSlow, remain: Math.ceil(slow) });
    return list;
  }

  /** 玩家正在移动或处于任一交互进行中:闲置满 5s 后据此淡出设置/地图/背包/工具按钮与弹出卡片
   * 各交互(采集/制作/挖除/吃喝/钓鱼/拉弓等)都会设置玩家的作业动画,统一用 isActing 判定 */
  private get isPlayerBusy(): boolean {
    return (
      this.player.isMoving ||
      this.player.isActing ||
      this.beds.isBusy(this.local) ||
      this.fishing.currentState !== null
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
          : nearby?.kind === 'rock' || nearby?.kind === 'meteor'
            ? '镐子'
            : nearby?.kind === 'worm'
              ? '锄头'
              : '鱼竿';
      indicator = {
        ...indicator,
        label: `切换${tool}…`,
        progress: this.autoEquipTimer / AUTO_EQUIP_DELAY,
      };
    }
    const { label, progress, color } = indicator;
    const p = this.player.group.position;
    this.indicator.group.position.copy(p);
    this.indicator.setProgress(progress);
    this.indicator.setStamina(
      this.player.isSwimming ? this.survival.state.stamina / 100 : null
    );

    // 头顶文字投影为屏幕坐标(预告彩字时带颜色)
    const head = new THREE.Vector3(p.x, p.y + 2.75, p.z).project(this.camera);
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
      label = '挖木箱…';
      progress = this.crates.getDigProgress(session);
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
      label = `${session.eating.currentFood!.icon} 吃${session.eating.currentFood!.name}`;
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
              : '收线…';
      progress = session.fishing.getProgress();
      color = tease?.color;
    } else if (nearby && session.collect.canCollect(nearby)) {
      progress = session.collect.getHarvestInfo()?.progress ?? null;
      const digging = session.player.currentTool === 'hoe';
      label =
        nearby.kind === 'tree'
          ? '砍树'
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
                  : nearby.kind === 'worm'
                    ? '挖蚯蚓'
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
              ? '需要手持斧子'
              : '需要斧子'
          : nearby.kind === 'rock' || nearby.kind === 'meteor'
            ? switching
              ? '切换镐子…'
              : session.tools.pickaxe
                ? '需要手持镐子'
                : '需要镐子'
            : nearby.kind === 'worm'
              ? switching
                ? '切换锄头…'
                : session.tools.hoe
                  ? '需要手持锄头'
                  : '需要锄头'
              : null;
      if (switching) progress = this.autoEquipTimer / AUTO_EQUIP_DELAY;
    }
    return { label, progress, color };
  }
}
