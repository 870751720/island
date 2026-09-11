import { PerformanceMonitor } from './core/PerformanceMonitor';
import type { PlayerGender } from './entities/PlayerModel';
import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { Player, type HandTool } from './entities/Player';
import { PlayerSession } from './mp/PlayerSession';
import type { NetHost } from './net/NetHost';
import type { NetGuest } from './net/NetGuest';
import { loadProfile, saveProfileGender } from './playerProfile';
import type { AmbientState, AnimalPose, NetMsg, WorldPatch } from './net/Protocol';
import type { NetEvent } from './net/Protocol';
import type { Actor } from './mp/Actor';
import { Crabs } from './entities/Crab';
import { Butterflies } from './entities/Butterflies';
import { Birds } from './entities/Birds';
import { Wildlife, ANIMAL_LABELS, type AnimalSpecies } from './entities/Wildlife';
import { Pomeranian } from './entities/Pomeranian';
import { CollectSystem } from './systems/CollectSystem';
import { SheepMilkSystem } from './systems/SheepMilkSystem';
import { pickaxeUnlocked, hoePlaceTime } from './systems/ToolTiers';
import { DayNightSystem } from './systems/DayNightSystem';
import { DayEventSystem } from './systems/DayEventSystem';
import { WeatherSystem } from './systems/WeatherSystem';
import { TOOL_IDS, type CraftId, type ToolId, type Tools } from './systems/Crafting';
import { CraftingSystem } from './systems/CraftingSystem';
import { DropSystem, type DropInfo } from './systems/DropSystem';
import { WorkbenchSystem } from './systems/WorkbenchSystem';
import { CrateSystem } from './systems/CrateSystem';
import { Crate } from './entities/Crate';
import { BaitBarrelSystem, type BaitBarrelInfo } from './systems/BaitBarrelSystem';
import { wineOf, TIPSY_DURATION } from './systems/Wine';
import { BrewBarrelSystem, type BrewBarrelInfo } from './systems/BrewBarrelSystem';
import { WaterPurifierSystem } from './systems/WaterPurifierSystem';
import { RabbitBurrowSystem } from './systems/RabbitBurrowSystem';
import { SmelterSystem, type SmelterInfo } from './systems/SmelterSystem';
import { CookingStationSystem, type CookingStationInfo } from './systems/CookingStationSystem';
import { LoomSystem, type LoomInfo } from './systems/LoomSystem';
import { FenceSystem, makeFenceHandModel, makeFenceGateHandModel, makeFenceGhost, makeGateGhost } from './systems/FenceSystem';
import { BedSystem } from './systems/BedSystem';
import { Bed } from './entities/Bed';
import { Workbench } from './entities/Workbench';
import { BaitBarrel } from './entities/BaitBarrel';
import { BrewBarrel } from './entities/BrewBarrel';
import { WaterPurifier } from './entities/WaterPurifier';
import { Smelter } from './entities/Smelter';
import { Loom } from './entities/Loom';
import { CookingStation } from './entities/CookingStation';
import { Campfire } from './entities/Campfire';
import { AutoPlaceSystem, buildGhost, miniHeldModel, snapAheadCell } from './systems/AutoPlace';
import { dryCellReason, type FacilityDef, type FacilityKind } from './systems/Facilities';
import { PlaceOccupancy } from './systems/PlaceOccupancy';
import { LightPool } from './world/LightPool';
import { ShrineSystem } from './systems/ShrineSystem';
import { Shrine } from './entities/Shrine';
import { SoilSystem } from './systems/SoilSystem';
import { Soil } from './entities/Soil';
import { CropSystem } from './systems/CropSystem';
import { CROP_SPECS, makeCropSproutPreview } from './entities/Crop';
import { MeteorSystem } from './systems/MeteorSystem';
import { CampfireSystem, type CampfireInfo } from './systems/CampfireSystem';
import { EatingSystem } from './systems/EatingSystem';
import { firstFoodIn, FOODS, COOKABLE_KINDS, type Food } from './systems/Food';
import { WaterSystem } from './systems/WaterSystem';
import { FishingSystem, type FishingState } from './systems/FishingSystem';
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
import { Snow } from './fx/Snow';
import { Wind } from './fx/Wind';
import { PondLife } from './fx/PondLife';
import { Decorations } from './world/Decorations';
import { Footprints } from './fx/Footprints';
import { PlayerIndicator } from './ui3d/PlayerIndicator';
import { DEFAULT_CAPACITY, Inventory, type ResourceKind } from './systems/Inventory';
import { EQUIPMENT, Equipment, SLOT_ORDER, type EquipKind, type EquipSlot } from './systems/Equipment';
import { SaveSystem, SAVE_VERSION, type SaveData, type SessionSave } from './systems/SaveSystem';
import type { DeathReport } from './systems/RunStats';
import { SurvivalSystem } from './systems/SurvivalSystem';
import { GmSystem, gmApply, gmSnapshot, type GmConfig } from './systems/GmSystem';
import { IslandTerrain } from './world/IslandTerrain';
import { Ocean } from './world/Ocean';
import { OceanDepth } from './world/OceanDepth';
import { Clouds } from './world/Clouds';
import { Props, makeBerryBush, makeGrassTuft, makeShrub, makeWormNest } from './world/Props';
import { updateSeasonSnow } from './world/SeasonSnow';
import { SEED_OF } from './world/TreeSpecies';
import { openBottle } from './systems/BottleMessages';
import { POSEIDON_GRACE_DAYS, POSEIDON_GRACE_CHANCE, POSEIDON_GIFT_KINDS, openLetter } from './systems/PoseidonGrace';
import { MetaDaily } from './meta/MetaDaily';
import { MetaProgress } from './meta/MetaProgress';
import type { MetaNodeId } from './meta/MetaTree';
import { NO_COLLECT_META, NO_FISHING_META, type CollectMeta, type FishingMeta } from './meta/MetaHooks';
import { rollLoot } from './systems/FishTable';
import { saveAudioSettings, type AudioSettings } from './audio/AudioSettings';
import type { HudSnapshot, MapSnapshot, PickupToast, VitalLevels } from './GameContracts';
import { buildMapSnapshot, buildMapTerrain } from './systems/MapSnapshotBuilder';
import {
  AUTOSAVE_INTERVAL, AUTO_EQUIP_DELAY, BEAR_SFX_RANGE, DEATH_DROP_RATIO,
  IDLE_HIDE_DELAY, MULTIPLAYER_RESPAWN_DELAY, PLANT_DROP_KINDS,
  SWORD_AUTO_EQUIP_DELAY, SWORD_AUTO_EQUIP_RANGE, TETHER_RANGE, VIEW_SIZE,
} from './GameConfig';
import type { GameOptions, InteractionKind } from './GameTypes';
import { PickupPresentation } from './presentation/PickupPresentation';
import { listPlaceables, nextToolEntry } from './systems/ToolCycle';
import { restoreSession, snapshotSession } from './systems/SessionSaveCodec';
import { HudSnapshotBuilder } from './presentation/HudSnapshotBuilder';
import { buildDeathReport as createDeathReport } from './systems/DeathReportBuilder';
import { InteractionIndicatorBuilder } from './presentation/InteractionIndicatorBuilder';
import { GameCameraController } from './presentation/GameCameraController';
import { FacilityInteractionController } from './systems/FacilityInteractionController';
import { PlayerCommandController } from './systems/PlayerCommandController';
import { WorldReplicationController } from './net/WorldReplicationController';
import { GuestHudSynchronizer } from './net/GuestHudSynchronizer';
import { buildPlayersState } from './net/PlayerSnapshotBuilder';
import { restoreWorld, snapshotWorld, type WorldSaveSystems } from './systems/WorldSaveCodec';
export type { HudSnapshot, MapSnapshot, PickupToast } from './GameContracts';
export type { GameOptions } from './GameTypes';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private cameraController: GameCameraController;
  private loop = new GameLoop();
  readonly performanceMonitor = new PerformanceMonitor();

  gmPerformance(enabled: boolean): void {
    this.performanceMonitor.enabled = enabled;
    this.performanceMonitor.reset();
    this.loop.onFrame = enabled
      ? (interval, cpu) => this.performanceMonitor.record(interval, cpu, this.renderer, this.guestMode ? "客人" : this.hostRef ? "房主" : "单机")
      : null;
  }
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
  private pickupPresentation: PickupPresentation;
  /** 玩家/桩与羊之间的系绳渲染(世界级,两端共用) */
  private leashLines: LeashLines;
  private audio = new GameAudio();
  private hudSnapshotBuilder: HudSnapshotBuilder;
  private interactionIndicatorBuilder: InteractionIndicatorBuilder;
  private worldSaveSystems: WorldSaveSystems;

  /** UI 表现层直接播放音效(珍宝转盘的滚轮与中奖项),仅本地听感、无噪音语义 */
  playUiSfx(name: SfxName): void {
    this.audio.playLocal(name);
  }

  /** 获取地图表现所需的即时状态；客人端读取的玩家/设施均已由房主快照回流。 */
  getMapSnapshot(): MapSnapshot {
    this.mapTerrain ??= buildMapTerrain(this.terrain);
    return buildMapSnapshot(
      this.terrain,
      this.mapTerrain,
      this.local.id,
      this.sessions,
      this.workbench.positions
    );
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
  private facilityInteractions: FacilityInteractionController;
  private fences: FenceSystem;
  /** 全场已放置实体的统一占格判定(各安放系统注册共享) */
  private placeOccupancy = new PlaceOccupancy();
  /** 火光光源池:固定数量的点光源常驻场景,点燃/熄灭只领用归还,避免增删光源触发全材质着色器重编译卡顿 */
  private flameLights = new LightPool(this.scene, 6);
  private autoPlace: AutoPlaceSystem;
  private stakes: StakeSystem;
  private beds: BedSystem;
  private shrines: ShrineSystem;
  private soils: SoilSystem;
  private crops: CropSystem;
  private meteor: MeteorSystem;
  private campfire: CampfireSystem;
  private lastFishingState: FishingState | null = null;
  /** 上次推送的 busy 状态,变化时立即推送让按钮淡出更跟手 */
  private lastBusy = false;
  private lastMoving = false;
  private lastBiteClicks = 0;
  private drops: DropSystem;
  private playerCommands: PlayerCommandController;
  private dayNight: DayNightSystem;
  private dayEvents: DayEventSystem;
  private weather: WeatherSystem;
  private rain: Rain;
  private rainImpact: RainImpact;
  private snow: Snow;
  private windFx: Wind;
  private terrain: IslandTerrain;
  private ocean: Ocean;
  private oceanDepth: OceanDepth;
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
  /** 客人本地预测位置与房主快照的残留偏差(x,z),静止期间按指数衰减抹平 */
  private netDrift = new THREE.Vector2();
  /** 每个已发送输入对应的本地预测位置，用于按房主 ack 重放尚未确认的位移。 */
  private netInputHistory: { seq: number; x: number; z: number }[] = [];
  private netAckInputSeq = 0;
  private lastHurtSfxAt = -10;
  /** 游戏循环累计时间(音效节流用) */
  private loopElapsed = 0;
  private guestHud: GuestHudSynchronizer;
  private autoEquipTimer = 0;
  private swordEquipTimer = 0;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;
  private hostRef: NetHost | null;
  private readonly guestNet: NetGuest | null;
  private worldReplication: WorldReplicationController;
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
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    // Wider PCF filtering softens sampling changes as the sun moves, at mobile resolution.
    sun.shadow.radius = 2;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    const terrain = new IslandTerrain(200, 1000, this.terrainSeed);
    this.terrain = terrain;
    this.scene.add(terrain.mesh);
    this.oceanDepth = new OceanDepth(terrain);
    this.ocean = new Ocean(terrain.seaLevel, this.oceanDepth);
    this.scene.add(this.ocean.mesh);
    this.clouds = new Clouds(terrain.width, terrain.length);
    this.scene.add(this.clouds.group);
    this.props = new Props(this.scene, terrain, !save);
    this.fx = new Particles(this.scene);
    this.waterFx = new WaterFx(this.scene, this.fx);
    // 入包表现的目标点:玩家后背(朝向反方向、肩部高度),玩家移动时终点实时跟随
    this.pickupPresentation = new PickupPresentation(
      this.scene,
      () => this.local,
      this.camera,
      () => ({ width: this.renderer.domElement.clientWidth, height: this.renderer.domElement.clientHeight }),
      (toast) => this.onPickup(toast),
      () => this.audio.play('pickup')
    );

    this.scene.add(terrain.waterGroup);
    this.scene.add(terrain.iceGroup);
    this.footprints = new Footprints(this.scene, terrain);
    this.pondLife = new PondLife(this.scene, terrain);
    this.decorations = new Decorations(this.scene, terrain, this.terrainSeed);
    this.local = new PlayerSession(
      new Player(terrain, terrain.findSpawnPoint(), this.waterFx, this.footprints),
      this.youId ?? undefined,
      this.guestMode ? '我' : this.hostRef ? (loadProfile()?.name || '房主') : '我'
    );
    this.cameraController = new GameCameraController(
      this.renderer,
      this.scene,
      this.camera,
      () => this.player.group.position
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
    // 兔子洞:每个兔子栖息地 1~2 个,受惊的兔子钻进去躲藏,铲子挖开可压死藏在内的兔子。
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
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
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
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
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
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
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
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
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
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
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
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'smelters'),
      // 火光光源池
      this.flameLights
    );
    this.cookingStations = new CookingStationSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 收取汤品/挖回烹饪台与锅里食材入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'cookingStations'),
      // 火光光源池
      this.flameLights
    );
    this.looms = new LoomSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 收取布料/挖回纺织机与机内绳线入包,背包放不下的部分掉到玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
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
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'beds')
    );
    this.campfire = new CampfireSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'campfire'),
      // 烹饪好的食物背包放不下时掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 背包满导致烹饪暂停时提示
      (text, actor) => this.notify(text, actor),
      // 火光光源池
      this.flameLights
    );
    this.facilityInteractions = new FacilityInteractionController(
      {
        crates: this.crates,
        brewBarrels: this.brewBarrels,
        baitBarrels: this.baitBarrels,
        smelters: this.smelters,
        looms: this.looms,
        campfire: this.campfire,
        cookingStations: this.cookingStations,
      },
      this.guestNet,
      (actor) => this.asleepFor(actor),
      (text, actor) => this.notify(text, actor)
    );
    this.shrines = new ShrineSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 挖走神像时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count, actor) => this.giveItem(kind, count, actor),
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'shrines'),
      // 火把火光的光源池
      this.flameLights
    );
    this.soils = new SoilSystem(
      this.scene,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      // 统一安放占格判定:同格已被任何已放置实体占据时不可放
      this.placeOccupancy,
      // 其他占用双手的行为进行中时挖掘让位
      (actor) => this.isSessionBusy(actor, 'soils'),
      // 铲子挖有作物的土壤时优先铲作物(查询与铲除都由作物系统提供)
      (x, z) => !!this.crops.cropAt(x, z),
      (x, z) => this.crops.removeAt(x, z)
    );
    // 作物系统:种子种在土壤上,三阶段生长,成熟后空手采收掉落作物道具
    this.crops = new CropSystem(
      this.scene,
      this.fx,
      this.audio,
      // 播种校验:该格必须有土壤
      (x, z) => this.soils.soilAt(x, z),
      // 其他占用双手的行为进行中时采收让位
      (actor) => this.isSessionBusy(actor, 'crops'),
      // 采收粒子同步给联机客人
      (position, color, count) => {
        if (!this.hostRef) return;
        this.hostRef.broadcastEvent({ kind: 'collectFx', x: position.x, y: position.y, z: position.z, color, count });
      },
      // 局外养成「良种」等级(单机生效,联机 metaOn 为假时恒 0)
      () => this.metaLevel('seedline')
    );
    // 各安放系统注册进统一占格判定:预览与结算共用同一份"同格被占即不可放"
    for (const occupant of [this.workbench, this.crates, this.baitBarrels, this.brewBarrels, this.waterPurifiers, this.smelters, this.cookingStations, this.looms, this.beds, this.campfire, this.shrines, this.soils]) {
      this.placeOccupancy.register(occupant);
    }
    // 统一设施安放:全部可放置道具(建筑/神龛/丛/围栏/门)注册一份 FacilityDef,
    // 共用同一套工具入口、落点预览、站定自动放置与背包「使用」放置
    this.autoPlace = new AutoPlaceSystem(
      this.scene,
      this.terrain,
      (actor) => this.isSessionBusy(actor, 'autoPlace'),
      (kind, actor, cell) => this.settleFacility(kind, actor, cell)
    );
    this.registerFacilities();
    this.drops = new DropSystem(this.scene, this.terrain, this.fx, this.audio);
    this.playerCommands = new PlayerCommandController(
      this.guestNet,
      this.drops,
      this.workbench,
      (actor) => this.asleepFor(actor)
    );
    this.attachSessionSystems(this.local);
    this.guestHud = new GuestHudSynchronizer(
      this.local,
      this.pickupPresentation,
      this.audio,
      this.fx,
      () => this.syncToolTiers(this.local),
      (snapshot) => this.onHud(snapshot),
      () => ({
        autoEquipProgress: this.autoEquipTimer / AUTO_EQUIP_DELAY,
        notice: this.notice,
      })
    );

    this.dayNight = new DayNightSystem(sun, hemi, this.scene);
    this.weather = new WeatherSystem(sun, hemi, this.scene);
    this.worldSaveSystems = {
      dayNight: this.dayNight,
      props: this.props,
      campfire: this.campfire,
      workbench: this.workbench,
      crates: this.crates,
      baitBarrels: this.baitBarrels,
      brewBarrels: this.brewBarrels,
      waterPurifiers: this.waterPurifiers,
      burrows: this.burrows,
      smelters: this.smelters,
      cookingStations: this.cookingStations,
      looms: this.looms,
      fences: this.fences,
      beds: this.beds,
      shrines: this.shrines,
      soils: this.soils,
      crops: this.crops,
      stakes: this.stakes,
      drops: this.drops,
      dog: this.dog,
      wildlife: this.wildlife,
    };
    this.worldReplication = new WorldReplicationController(
      this.worldSaveSystems,
      () => this.hostRef,
      this.guestNet
    );
    this.interactionIndicatorBuilder = new InteractionIndicatorBuilder({
      workbench: this.workbench,
      crates: this.crates,
      baitBarrels: this.baitBarrels,
      brewBarrels: this.brewBarrels,
      burrows: this.burrows,
      smelters: this.smelters,
      cookingStations: this.cookingStations,
      looms: this.looms,
      autoPlace: this.autoPlace,
      fences: this.fences,
      beds: this.beds,
      shrines: this.shrines,
      soils: this.soils,
      crops: this.crops,
      campfire: this.campfire,
    });
    this.hudSnapshotBuilder = new HudSnapshotBuilder(
      {
        autoPlace: this.autoPlace,
        wildlife: this.wildlife,
        crates: this.crates,
        baitBarrels: this.baitBarrels,
        brewBarrels: this.brewBarrels,
        smelters: this.smelters,
        cookingStations: this.cookingStations,
        looms: this.looms,
        beds: this.beds,
        workbench: this.workbench,
        campfire: this.campfire,
        shrines: this.shrines,
        drops: this.drops,
        dayNight: this.dayNight,
        weather: this.weather,
      },
      (session) => this.placeableList(session),
      (session) => this.indicatorFor(session)
    );
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
    // 天气在昼夜之后更新,对光照与天空做调制(状态机已在昼夜系统处创建)
    this.rain = new Rain();
    this.scene.add(this.rain.lines);
    this.snow = new Snow();
    this.scene.add(this.snow.points);
    this.rainImpact = new RainImpact(terrain, this.waterFx, this.fx);
    this.windFx = new Wind();
    this.scene.add(this.windFx.mesh);

    this.loop.add({
      update: (delta, elapsed) => {
        this.loopElapsed = elapsed;
        // 单机拍照模式:时间与全部玩法模拟冻结(玩家无敌),相机取景与渲染照常
        const simDelta = this.cameraController.photoActive && !this.guestMode && !this.hostRef ? 0 : delta;
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
        this.snow.update(delta, this.loopElapsed, this.player.group.position, this.weather.snowIntensity);
        this.clouds.update(delta);
        this.terrain.updateWater(elapsed);
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
        this.pickupPresentation.update(simDelta);
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
          this.autoPlace.updateActor(s, simDelta);
          this.refreshHandModels();
          this.beds.updateActor(s, simDelta);
          this.shrines.updateActor(s, simDelta);
          this.soils.updateActor(s, simDelta);
          this.crops.updateActor(s, simDelta);
          this.workbench.updateActor(s, simDelta);
          this.campfire.updateActor(s, simDelta);
          // 手里的种子/围栏/可放置道具用光后自动收起,回到空手
          const heldTool = s.player.currentTool;
          if (heldTool === 'place' || heldTool === 'fence' || heldTool === 'fenceGate') {
            if (!this.heldPlaceItem(s)) s.player.setTool('hand');
          } else if (heldTool !== 'hand' && !this.hasToolFor(s, heldTool)) {
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
        this.campfire.update(simDelta, elapsed, this.weather.rainIntensity);
        this.shrines.update(simDelta, elapsed);
        this.crops.update(simDelta, elapsed, this.weather.rainIntensity);
        this.baitBarrels.update(simDelta, elapsed, !this.guestMode);
        this.brewBarrels.update(simDelta, elapsed, !this.guestMode);
        this.waterPurifiers.update(simDelta, elapsed);
        this.burrows.update(simDelta, !this.guestMode);
    this.smelters.update(simDelta, elapsed, !this.guestMode);
        this.cookingStations.update(simDelta, elapsed, !this.guestMode, this.weather.rainIntensity);
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
        const renderStart = this.performanceMonitor.enabled ? performance.now() : 0;
        this.clouds.faceCamera(this.camera);
        this.renderer.render(this.scene, this.camera);
        if (this.performanceMonitor.enabled) this.performanceMonitor.renderMs = performance.now() - renderStart;
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
        this.pickupPresentation.flush();
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
            this.autoPlace.updatePreviewFor(s);
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
    // 个人档案性别优先于存档性别:玩家在开始界面改过形象后,续档也应生效
    const profile = loadProfile();
    if (profile) this.local.player.setGender(profile.gender);
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
      this.worldReplication.beginGuest(this.guestNet.welcome?.worldRevision ?? 0);
      this.guestNet.onWorldDelta = (revision, ops) => this.worldReplication.applyDelta(revision, ops);
      this.guestNet.onWorldFull = (revision, state) => this.worldReplication.applyFull(revision, state);
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
    this.local.setName(loadProfile()?.name || '房主');
    this.bindWorldChangeSinks();
    host.attach(this);
    this.hookHostNotices(host);
  }

  /** 房主侧:客人加入/离开时向所有玩家广播全局提示 */
  private hookHostNotices(host: NetHost): void {
    host.onGuestJoined = (name) => this.sysNotify(`${name} 加入了游戏`);
    host.onGuestLeft = (name) => this.sysNotify(`${name} 离开了游戏`);
    host.onGuestConnectionFailed = () => this.sysNotify('有玩家尝试加入，但连接未完成，请让对方重试或切换网络');
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
    return buildPlayersState(this.sessions, this.dayNight, this.weather, (session) => this.heldPlaceItem(session));
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
    return this.worldReplication.snapshot();
  }

  private bindWorldChangeSinks(): void {
    this.worldReplication.bindHostChangeSinks();
  }

  /** 客人侧:应用房主的玩家快照(自己只在大偏差时校正,其余遥控插值) */
  netApplyPlayers(msg: Extract<NetMsg, { t: 'players' }>): void {
    const { time, day } = msg;
    if (time !== undefined) this.dayNight.time = time;
    if (day !== undefined) this.dayNight.day = day;
    // 天气与风采用房主权威值,本地只做表现插值(不再随机轮换/重掷风向)
    if (msg.rain !== undefined && msg.windAmount !== undefined && msg.windDirX !== undefined && msg.windDirZ !== undefined) {
      this.weather.netSync(msg.rain, msg.snow ?? 0, msg.windAmount, msg.windDirX, msg.windDirZ);
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
        // 远程玩家手持的可放置道具模型按权威快照替换(图标与循环条目同理)
        const remoteKind = (p.placeKind as ResourceKind | null) ?? null;
        if (this.handModelKind.get(s) !== remoteKind) {
          this.handModelKind.set(s, remoteKind);
          s.player.setPlaceModel(remoteKind ? this.buildHandModel(remoteKind) : null);
        }
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
      this.pickupPresentation.spawn(s, new THREE.Vector3(event.x, event.y, event.z), [
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
    this.worldReplication.apply(state);
  }

  /** 客人侧:应用房主为本客人生成的 HUD 快照(同时回填本地背包供近旁判定用) */
  netApplyHud(snap: HudSnapshot): void {
    this.guestHud.apply(snap);
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
    this.pickupPresentation.markOrigin(pos, actor);
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
      const all = [save as SessionSave, ...save.others];
      const roster = this.guestNet?.welcome?.roster ?? [];
      for (let i = 0; i < all.length; i++) {
        const id = roster[i];
        this.applyPlayerSave(id === this.youId ? this.local : this.addRemoteSession(true, id), all[i]);
      }
    } else {
      this.applyPlayerSave(this.local, save);
      // 只有房主继续联机岛时恢复队友；单机继续不生成无人控制的远程角色。
      for (const other of this.hostRef ? save.others : []) {
        this.savedRemoteSessions.push(other);
      }
    }
    this.applyWorldSave(save);
  }

  /** 世界部分恢复(昼夜/资源点/摆件/掉落物/狗),客人收到世界快照时复用 */
  private applyWorldSave(save: SaveData): void {
    this.poseidonGraceUsed = save.poseidonGraceUsed;
    restoreWorld(this.worldSaveSystems, save, this.guestMode);
    this.drawnTreasures = new Set(save.drawnTreasures);
    this.tier4Pity.count = save.tier4Pity;
  }

  /** 把一名玩家的会话存档写回其会话(位置/生存/背包/工具/穿戴) */
  private applyPlayerSave(session: PlayerSession, data: SessionSave): void {
    restoreSession(session, data, {
      hasTool: (tool) => this.hasToolFor(session, tool),
      syncToolTiers: () => this.syncToolTiers(session),
    });
  }

  /** 汇总一名玩家的会话进度为存档数据 */
  private collectPlayerSave(session: PlayerSession): SessionSave {
    return snapshotSession(session);
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
      ...snapshotWorld(this.worldSaveSystems),
      poseidonGraceUsed: this.poseidonGraceUsed,
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

  /** 进入相机模式:以玩家当前位置为注视点,停掉移动输入(摇杆层已隐藏不会触发抬起) */
  enterPhotoMode(): void {
    this.setJoystick(0, 0);
    this.cameraController.enterPhotoMode();
  }

  /** 退出相机模式:恢复常规跟随视角与缩放(位置由跟随插值平滑过渡) */
  exitPhotoMode(): void {
    this.cameraController.exitPhotoMode();
  }

  /** 相机模式内按屏幕像素平移注视点(单指拖动) */
  photoPan(dxPx: number, dyPx: number): void {
    this.cameraController.pan(dxPx, dyPx);
  }

  /** 相机模式内缩放(双指捏合或按钮),返回新倍率供 UI 显示 */
  photoZoomBy(factor: number): number {
    return this.cameraController.zoomBy(factor);
  }

  /** 相机模式内绕注视点水平旋转(双指旋转) */
  photoRotate(delta: number): void {
    this.cameraController.rotate(delta);
  }

  /** 相机模式内俯仰(双指上下滑动):delta 为弧度增量 */
  photoRotatePitch(delta: number): void {
    this.cameraController.rotatePitch(delta);
  }

  /** 拍照:立即渲染一帧并读回画面(避免依赖读回缓冲保留),无照片返回 null */
  requestPhoto(cb: (photo: string | null) => void): void {
    cb(this.cameraController.renderAndCapture());
  }

  /** 单机死亡的结算快照,死亡界面展示并生成分享卡片;确认退出后随实例丢弃 */
  deathReport: DeathReport | null = null;

  /** 汇总本局战绩(天数/死因/击杀/采集来自会话,建造从存档快照的摆件数量汇总) */
  private buildDeathReport(s: PlayerSession): DeathReport {
    const save = this.collectSave();
    return createDeathReport(save, s, this.cameraController.capture());
  }

  /** 房主广播入包飞行事件并就地表现远程玩家(客人端本地只触发自己的,其余靠该事件补播) */
  private broadcastItemFly(s: PlayerSession, kind: ResourceKind, count: number): void {
    if (!this.hostRef) return;
    const origin = this.pickupPresentation.originFor(s);
    if (s !== this.local) this.pickupPresentation.spawn(s, origin, [{ kind, count }]);
    this.hostRef.broadcastEvent({ kind: 'itemFly', actor: s.id, item: kind, count, x: origin.x, y: origin.y, z: origin.z });
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
    this.cameraController.update(delta, this.sun, this.dayNight.sunOffset);
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
  selectTool(tool: HandTool, placeKind?: ResourceKind): void {
    this.setToolFor(this.local, tool, placeKind);
    this.guestNet?.action('tool', [tool, placeKind ?? null]);
  }

  /** 切换某会话的手持工具(房主权威端共用入口):牵着羊时锁死套索不响应切换,图标不会被场景/自动切换抢走;
   * 可放置道具经 placeKind 选中具体一种(围栏区分木/石) */
  setToolFor(s: PlayerSession, tool: HandTool, placeKind?: ResourceKind): void {
    if (tool !== 'lasso' && this.wildlife.leashedBy(s.player)) return;
    s.player.setTool(tool);
    if (placeKind && this.autoPlace.supports(placeKind)) {
      this.lastPlaceKind = placeKind;
      this.autoPlace.select(s, placeKind);
    }
  }

  /** 上次手持放置的道具(选择面板里排最前,方便连续放置) */
  private lastPlaceKind: ResourceKind | null = null;

  /** 循环切换手持工具:空手 → 斧子 → … → 套索 → 背包里每种可放置道具各一格(围栏区分木/石);
 * 循环列表必须用稳定顺序(不按「上次使用」重排):选中本身会更新 lastPlaceKind,
 * 重排会让下一步永远落在刚选过的道具附近,在多个道具间来回乒乓切不出去;
 * 「上次使用的排最前」只用于长按选择面板(placeableList);
 * 可放置道具也可经长按工具按钮的选择面板直接点选 */
  cycleTool(): void {
    const next = nextToolEntry(this.local, this.autoPlace, null, (tool) => this.hasTool(tool));
    // 工具驱动的零消耗设施(土壤)不占道具位:切到锄头本身即可,不传选中道具
    this.selectTool(next.tool, next.kind !== 'soil' ? next.kind ?? undefined : undefined);
  }

  /** 某会话背包里可手持放置的道具清单(去重;上次使用的排最前,便于连续放置) */
  private placeableList(s: PlayerSession): { kind: ResourceKind; count: number }[] {
    return listPlaceables(s, this.autoPlace, this.lastPlaceKind);
  }

  /** 从选择面板或背包「使用」选中一种可放置道具切入对应手持模式(联机经 tool 动作上行) */
  pickPlaceItem(kind: ResourceKind): boolean {
    const tool = this.autoPlace.toolOf(kind);
    if (!tool) return false;
    this.selectTool(tool, kind);
    return true;
  }

  /** 该会话手里正举着的可放置道具,供图标、手持模型与快照用 */
  private heldPlaceItem(s: PlayerSession): FacilityKind | null {
    return this.autoPlace.heldKind(s);
  }

  /** 某可放置道具的手持模型(真实建模缩到手心大小) */
  private buildHandModel(kind: FacilityKind): THREE.Object3D {
    return miniHeldModel(this.autoPlace.previewModelOf(kind) ?? new THREE.Group());
  }

  /** 各玩家手持的可放置道具模型随选中/耗尽实时替换(缓存避免每帧重建) */
  private handModelKind = new Map<PlayerSession, FacilityKind | null>();
  private refreshHandModels(): void {
    for (const s of this.sessions) {
      const kind = this.heldPlaceItem(s);
      if (this.handModelKind.get(s) === kind) continue;
      this.handModelKind.set(s, kind);
      s.player.setPlaceModel(kind ? this.buildHandModel(kind) : null);
    }
  }

  /** 工具按钮点击:牵着羊时原地打桩拴住;空手且场景有明确需要的工具时直接切过去;其余情况一律循环切换,
   * 保证点击总能依次切出已拥有的工具与可放置道具,不被场景自动切换截住 */
  useToolButton(): void {
    if (this.player.currentTool === 'lasso' && this.wildlife.leashedBy(this.player)) {
      this.stakeLasso();
      return;
    }
    const need = this.player.currentTool === 'hand' ? this.wantedTool() : null;
    if (need) {
      this.autoEquipTimer = 0;
      this.selectTool(need);
    } else {
      this.cycleTool();
    }
  }

  /** 站定不动时当前场景希望切到的工具(树→斧子、石→镐子、可钓点→鱼竿),不满足条件返回 null;
   * 牵着羊时不自动切换(避免无预兆地松开绳子) */
  private wantedTool(): HandTool | null {
    if (
      this.player.isMoving ||
      (this.guestMode && this.player.isActing) ||
      this.archery.isWorking ||
      this.crafting.isWorking ||
      this.workbench.isUpgrading(this.local) ||
      this.eating.isWorking ||
      this.local.milk.isWorking ||
      this.beds.isBusy(this.local) ||
      this.survival.state.dead ||
      this.wildlife.leashedBy(this.player)
    ) {
      return null;
    }
    // 手持可放置道具(含围栏/围栏门)时是玩家手动选择,不自动切换
    if (this.player.holdsFacility) {
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
    // 身旁没有资源点但站在可钓点(干地、面朝水面)时,自动切鱼竿
    if (
      this.tools.fishingrod &&
      this.player.currentTool !== 'fishingrod' &&
      !this.fishing.isWorking &&
      this.fishing.canFishHere()
    ) {
      return 'fishingrod';
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
      this.workbench.isUpgrading(a) ||
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
      this.workbench.isUpgrading(a) ||
      this.workbench.isDigging(a) ||
      a.eating.isWorking ||
      this.beds.isBusy(a) ||
      a.water.isActive
    ) {
      return false;
    }
    return a.fishing.start(this.weather.rainIntensity > 0.5);
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
      if (actor === this.local) saveProfileGender(gender);
      this.guestNet.action('gmSetGender', [gender]);
      return;
    }
    actor.player.setGender(gender);
    if (actor === this.local) saveProfileGender(gender);
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
  /** GM 设置当前天数;客人端上行车主权威结算,天数随快照回流 */
  gmSetDay(day: number): void {
    if (this.guestNet) {
      this.guestNet.action('gmSetDay', [day]);
      return;
    }
    this.dayNight.day = day;
  }

  /** GM 强制切换天气;客人端上行车主权威结算,天气随快照回流 */
  gmSetWeather(type: 'sunny' | 'rain' | 'snow'): void {
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

  /** 设施的权威结算:cell 由站定自动放置选好,客人上行房主结算;失败给出具体提示 */
  private settleFacility(kind: FacilityKind, actor: PlayerSession, cell: { x: number; z: number }): boolean {
    const def = this.autoPlace.defOf(kind);
    if (!def || this.asleepFor(actor)) return false;
    const at = new THREE.Vector3(cell.x, this.terrain.getHeight(cell.x, cell.z), cell.z);
    if ((!def.free && actor.inventory.count(kind as ResourceKind) <= 0) || !def.place(actor, at)) {
      this.notify(this.placeFailText(actor, kind, null), actor);
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
        this.smelters.passTime(skipped);
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

  /** 安放神龛道具:落在面前吸附格中心立起对应神像(背包「使用」与手持自动安放共用入口),不满足时给出提示 */
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

  /** 通用规则:刚放置的东西可以被铲子挖走时,若正手持铲子则收起,避免原地立刻把它挖掉 */
  private afterPlaceDiggable(actor: PlayerSession = this.local): void {
    if (actor.player.currentTool === 'shovel') actor.player.setTool('hand');
  }

  /** 放置失败提示:落点原因优先,道具已不在背包时点名,设施自定义次之,不再笼统说放不下 */
  private placeFailText(actor: PlayerSession, kind: FacilityKind, reason: string | null): string {
    if (reason) return reason;
    if (kind !== 'soil' && actor.inventory.count(kind) <= 0) return '背包里已经没有这个道具了';
    return this.autoPlace.defOf(kind)?.failText?.(actor) ?? '这里放不下,找个没东西的干地试试';
  }

  /** 丛/蚯蚓窝的落点校验:返回 null=可放,否则为不可放原因 */
  private bushCellOk(actor: PlayerSession, x: number, z: number): string | null {
    return dryCellReason(actor, x, z, this.terrain, this.placeOccupancy, this.props);
  }

  /** 注册全部设施:每种可放置道具一份 FacilityDef——位置校验沿用各系统规则,预览复用实体/资源点建模,放置直达对应系统 */
  private registerFacilities(): void {
    const def = (kind: FacilityKind, facility: FacilityDef): void => {
      this.autoPlace.register(kind, facility);
    };
    const ghost = (build: (scene: THREE.Scene) => THREE.Object3D): (() => THREE.Object3D) =>
      () => buildGhost(build);
    // 木箱/铁箱
    def('crate', { tool: 'place', valid: (a, x, z) => this.crates.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Crate(sc, new THREE.Vector3(), 'crate').group), place: (a, at) => this.crates.use(a, 'crate', at) });
    def('ironCrate', { tool: 'place', valid: (a, x, z) => this.crates.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Crate(sc, new THREE.Vector3(), 'ironCrate').group), place: (a, at) => this.crates.use(a, 'ironCrate', at) });
    // 饵料桶/酿酒桶/净水器/冶炼炉/纺织机/烹饪台
    def('baitBarrel', { tool: 'place', valid: (a, x, z) => this.baitBarrels.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new BaitBarrel(sc, new THREE.Vector3(), 0).group), place: (a, at) => this.baitBarrels.use(a, at) });
    def('brewBarrel', { tool: 'place', valid: (a, x, z) => this.brewBarrels.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new BrewBarrel(sc, new THREE.Vector3(), 0).group), place: (a, at) => this.brewBarrels.use(a, at) });
    def('waterPurifier', {
      tool: 'place',
      valid: (a, x, z) => this.waterPurifiers.canPlaceAt(a, x, z),
      buildPreview: ghost((sc) => new WaterPurifier(sc, new THREE.Vector3(), 0).group),
      place: (a, at) => this.waterPurifiers.use(a, at),
      failText: () => '净化器只能放在海边湿沙滩上,去浅滩试试',
    });
    def('smelter', { tool: 'place', valid: (a, x, z) => this.smelters.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Smelter(sc, new THREE.Vector3(), 0).group), place: (a, at) => this.smelters.use(a, at) });
    def('loom', { tool: 'place', valid: (a, x, z) => this.looms.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Loom(sc, new THREE.Vector3(), 0).group), place: (a, at) => this.looms.use(a, at) });
    def('cookingStation', { tool: 'place', valid: (a, x, z) => this.cookingStations.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new CookingStation(sc, new THREE.Vector3(), 0, 0).group), place: (a, at) => this.cookingStations.use(a, at) });
    // 火堆(放下即引燃)/熄灭的火堆
    def('campfire', { tool: 'place', valid: (a, x, z) => this.campfire.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Campfire(sc, new THREE.Vector3(), 60).group), place: (a, at) => this.campfire.place(a, 'campfire', at) });
    def('deadCampfire', { tool: 'place', valid: (a, x, z) => this.campfire.canPlaceAt(a, x, z), buildPreview: ghost((sc) => new Campfire(sc, new THREE.Vector3(), 0).group), place: (a, at) => this.campfire.place(a, 'deadCampfire', at) });
    // 神龛类(含火把,同一放置入口)
    for (const kind of ['poseidonBlessing', 'beehiveShrine', 'healCrystal', 'rainAltar', 'crocIncense', 'torch'] as const) {
      def(kind, {
        tool: 'place',
        valid: (a, x, z) => this.shrines.canPlaceAt(a, x, z),
        buildPreview: ghost((sc) => new Shrine(sc, new THREE.Vector3(), kind).group),
        place: (a, at) => this.shrines.place(a, kind, at),
      });
    }
    // 床/工作台(各等级道具共用对应等级模型)
    const bedLevels: Partial<Record<ResourceKind, number>> = { bed1: 1, bed2: 2, bed3: 3 };
    for (const [kind, level] of Object.entries(bedLevels) as [ResourceKind, number][]) {
      def(kind, {
        tool: 'place',
        valid: (a, x, z) => this.beds.canPlaceAt(a, x, z),
        buildPreview: ghost((sc) => new Bed(sc, new THREE.Vector3(), level).group),
        place: (a, at) => this.beds.place(a, level, at),
      });
    }
    const benchLevels: Partial<Record<ResourceKind, number>> = { workbench1: 1, workbench2: 2, workbench3: 3, workbench4: 4 };
    for (const [kind, level] of Object.entries(benchLevels) as [ResourceKind, number][]) {
      def(kind, {
        tool: 'place',
        valid: (a, x, z) => this.workbench.canPlaceAt(a, x, z),
        buildPreview: ghost((sc) => new Workbench(sc, new THREE.Vector3(), level).group),
        place: (a, at) => this.workbench.placeItem(a, level, at),
      });
    }
    // 挖来的丛/蚯蚓窝
    def('berryBush', { tool: 'place', valid: (a, x, z) => this.bushCellOk(a, x, z), buildPreview: () => makeBerryBush().group, place: (a, at) => this.placeBush('berryBush', at, a) });
    def('shrubBush', { tool: 'place', valid: (a, x, z) => this.bushCellOk(a, x, z), buildPreview: () => makeShrub(), place: (a, at) => this.placeBush('shrubBush', at, a) });
    def('grassTuft', { tool: 'place', valid: (a, x, z) => this.bushCellOk(a, x, z), buildPreview: () => makeGrassTuft(), place: (a, at) => this.placeBush('grassTuft', at, a) });
    def('wormNest', { tool: 'place', valid: (a, x, z) => this.bushCellOk(a, x, z), buildPreview: () => makeWormNest().group, place: (a, at) => this.placeBush('wormNest', at, a) });
    // 土壤:手持锄头即触发的零消耗设施,站定自动开出一格土壤(高等级锄头更快),铲子可挖掉还原
    def('soil', {
      tool: 'hoe',
      free: true,
      name: '土壤',
      placingLabel: '锄地开垦…',
      valid: (a, x, z) => this.soils.canPlaceAt(a, x, z),
      buildPreview: ghost((sc) => new Soil(sc, new THREE.Vector3()).group),
      place: (a, at) => this.soils.place(a, at),
      holdTime: (a) => hoePlaceTime(a.tools.hoe),
      failText: () => '这里锄不了,找块没东西的干地试试',
    });
    // 作物种子:只能种在没有作物的土壤格上,预览为幼苗造型,站定 2 秒播下
    for (const spec of Object.values(CROP_SPECS)) {
      def(spec.seed, {
        tool: 'place',
        valid: (a, x, z) => this.crops.canPlantAt(a, x, z),
        buildPreview: () => makeCropSproutPreview(spec.kind),
        place: (a, at) => this.crops.plant(a, spec.seed, at),
        placingLabel: `播种:${spec.name}…`,
        failText: () => '种子只能种在空的土壤上,先用锄头开垦',
      });
    }
    // 围栏木/石:落点优先接上现有围栏线,预览横杆按邻居显隐
    for (const [kind, fenceKind] of [['fenceWood', 'branch'], ['fenceStone', 'stone']] as const) {
      def(kind, {
        tool: 'fence',
        target: (a) => {
          const t = this.fences.vertexTarget(a);
          return t ? { x: t.gx, z: t.gz, reason: null } : { ...snapAheadCell(a), reason: '附近没有能立围栏柱的格点,挪个位置再试' };
        },
        buildPreview: makeFenceGhost,
        handModel: () => makeFenceHandModel(fenceKind),
        onPreview: (preview, _a, x, z) => this.fences.applyGhost(preview, x, z),
        place: (a) => this.fences.useFence(a, fenceKind),
        failText: () => '这里放不下,找块没东西的干地正对着要围的方向试试',
      });
    }
    // 围栏门:占一条两格边,落点优先嵌进围栏线缺口,站定自动放置耗时更长
    def('fenceGate', {
      tool: 'fenceGate',
      holdTime: 5,
      target: (a) => {
        const t = this.fences.gateTarget(a);
        if (!t) return { ...snapAheadCell(a), reason: '附近没有能放围栏门的位置,挪个位置再试' };
        return { x: t.gx + (t.dir === 'x' ? 1 : 0), z: t.gz + (t.dir === 'z' ? 1 : 0), reason: null };
      },
      buildPreview: makeGateGhost,
      handModel: () => makeFenceGateHandModel(),
      onPreview: (preview, a) => {
        preview.rotation.y = this.fences.gateGhostRotY(a);
      },
      place: (a) => this.fences.useGate(a),
      failText: () => '这里放不下,找块没东西的干地正对着要围的方向试试',
    });
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

  /** 在给定格中心种回挖来的丛/蚯蚓窝(统一设施结算的 place 委托,落格已校验) */
  private placeBush(kind: 'berryBush' | 'shrubBush' | 'grassTuft' | 'wormNest', at: THREE.Vector3, actor: PlayerSession): boolean {
    const cell = { x: at.x, z: at.z };
    actor.inventory.remove(kind, 1);
    if (kind === 'wormNest') {
      this.props.placeWormNest(cell.x, cell.z);
    } else {
      const bushKind = kind === 'berryBush' ? 'berry' : kind === 'grassTuft' ? 'grass' : 'shrub';
      this.props.placeBush(bushKind, cell.x, cell.z);
    }
    this.audio.play('success');
    const fxPos = new THREE.Vector3(cell.x, this.terrain.getHeight(cell.x, cell.z) + 0.5, cell.z);
    this.fx.burst(fxPos, kind === 'berryBush' ? '#5d8a3a' : kind === 'grassTuft' ? '#a4c46a' : kind === 'wormNest' ? '#6f5a44' : '#6b8f4e', 10);
    return true;
  }

  /** 捡回附近掉落物(点「捡回」卡片),背包放不下则提示 */
  pickupDrop(actor: PlayerSession = this.local): boolean {
    // 客人端:动作上行车主权威结算,状态由快照回流;飞行起点取本地同步到的掉落物位置
    if (this.guestNet) {
      const near = this.drops.getNearby(this.local);
      if (near) this.pickupPresentation.markOrigin(near.position);
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
    this.pickupPresentation.markOrigin(near.position, a);
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

  /** 把背包里该种类道具存入身旁木箱(count 为 Infinity 时整格存入),整格转移失败时给出提示,连发失败静默 */
  crateStore(kind: ResourceKind, count = Infinity, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.crateStore(kind, count, actor);
  }

  /** 把身旁木箱里该种类道具取回背包(count 为 Infinity 时整格取回),整格转移失败时给出提示,连发失败静默 */
  crateTake(kind: ResourceKind, count = Infinity, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.crateTake(kind, count, actor);
  }

  /** 把背包里该种类原料丢进身旁酿酒桶(count ≤ 0 为全部,一次只酿一种,桶被占用时只接受同种),失败时给出提示 */
  brewBarrelFeed(kind: ResourceKind, count = 0, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.brewBarrelFeed(kind, count, actor);
  }

  /** 把身旁酿酒桶里还没发酵的原料取回背包,失败时给出提示 */
  brewBarrelTakeRaw(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.brewBarrelTakeRaw(actor);
  }

  /** 收取身旁酿酒桶里酿好的全部酒,失败时给出提示 */
  brewBarrelCollect(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.brewBarrelCollect(actor);
  }

  /** 把背包里该种类食物丢进身旁饵料桶(count ≤ 0 为全部,每 5 秒发酵 1 个),失败时给出提示 */
  baitBarrelFeed(kind: ResourceKind, count = 0, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.baitBarrelFeed(kind, count, actor);
  }

  /** 把身旁饵料桶里还没发酵的食物取回背包,失败时给出提示 */
  baitBarrelTakeFoods(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.baitBarrelTakeFoods(actor);
  }

  /** 收取身旁饵料桶里发酵好的全部鱼饵,失败时给出提示 */
  baitBarrelCollect(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.baitBarrelCollect(actor);
  }

  /** 把背包里的铁矿石丢进身旁冶炼炉(count ≤ 0 为全部,每 15 秒用 3 块矿石炼 1 块铁锭),失败时给出提示 */
  smelterFeed(count = 0, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.smelterFeed(count, actor);
  }

  smelterAddFuel(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.smelterAddFuel(kind, actor);
  }

  /** 把身旁冶炼炉里还没炼的矿石取回背包,失败时给出提示 */
  smelterTakeOre(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.smelterTakeOre(actor);
  }

  /** 收取身旁冶炼炉里炼好的全部铁锭,失败时给出提示 */
  smelterCollect(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.smelterCollect(actor);
  }

  /** 把背包里的绳线丢进身旁纺织机(count ≤ 0 为全部,每 2 根绳线织 1 匹布料),失败时给出提示 */
  loomFeed(count = 0, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.loomFeed(count, actor);
  }

  /** 把身旁纺织机里还没织的绳线取回背包,失败时给出提示 */
  loomTakeRope(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.loomTakeRope(actor);
  }

  /** 收取身旁纺织机里织好的全部布料,失败时给出提示 */
  loomCollect(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.loomCollect(actor);
  }

  /** 向身旁火堆添加 1 个可燃物,返回是否成功 */
  campfireAddFuel(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.campfireAddFuel(kind, actor);
  }

  /** 向身旁烹饪台添加 1 个可燃物,返回是否成功 */
  cookingAddFuel(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.cookingAddFuel(kind, actor);
  }

  /** 在身旁燃烧的烹饪台上发起烤制(可选份数,与火堆相同),返回是否成功开始 */
  cookingRoast(kind: ResourceKind, count: number, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.cookingRoast(kind, count, actor);
  }

  /** 在身旁燃烧的烹饪台上发起煮汤(选一种食材和份数,每 5 秒煮好 1 份存放台上) */
  cookingBoil(kind: ResourceKind, count: number, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.cookingBoil(kind, count, actor);
  }

  /** 收取身旁烹饪台上煮好的全部汤品,失败时给出提示 */
  cookingCollect(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.cookingCollect(actor);
  }

  /** 把身旁烹饪台锅里还没煮的食材取回背包,失败时给出提示 */
  cookingTakeBoil(actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.cookingTakeBoil(actor);
  }

  /** 在身旁燃烧的火堆上发起烹饪(可选份数,同工作台),返回是否成功开始 */
  campfireCook(kind: ResourceKind, count: number, actor: PlayerSession = this.local): boolean {
    return this.facilityInteractions.campfireCook(kind, count, actor);
  }

  /** 丢弃道具到玩家附近的地上(可指定数量,超出持有数按实际丢弃) */
  dropItem(kind: ResourceKind, count = 1, actor: PlayerSession = this.local): boolean {
    return this.playerCommands.dropItem(kind, count, actor);
  }

  /** 背包格之间移动道具(拖拽交换/合并),返回是否成功 */
  moveItem(from: number, to: number, actor: PlayerSession = this.local): boolean {
    return this.playerCommands.moveItem(from, to, actor);
  }

  /** 整理背包:同类合并到一格并按物品分类排序 */
  sortInventory(actor: PlayerSession = this.local): boolean {
    return this.playerCommands.sortInventory(actor);
  }

  /** 从背包装备一件道具(物品详情点击「装备」),返回是否成功 */
  equipItem(kind: ResourceKind, actor: PlayerSession = this.local): boolean {
    return this.playerCommands.equipItem(kind, actor);
  }

  /** 卸下某栏位的装备放回背包,背包放不下则失败 */
  unequipItem(slot: EquipSlot, actor: PlayerSession = this.local): boolean {
    return this.playerCommands.unequipItem(slot, actor);
  }

  /** 发起定时合成(站定敲打,进度走头顶圆环),返回是否成功开始 */
  craftTool(id: CraftId, actor: PlayerSession = this.local): boolean {
    return this.playerCommands.craftTool(id, actor);
  }

  /** 在工作台发起制作(可选个数,逐个完成),玩家须在的工作范围内,返回是否成功开始 */
  craftAtWorkbench(id: CraftId, count: number, actor: PlayerSession = this.local): boolean {
    return this.playerCommands.craftAtWorkbench(id, count, actor);
  }

  /** 发起工作台升级(站定敲打,完成后换更高等级模型),返回是否成功开始 */
  upgradeWorkbench(actor: PlayerSession = this.local): boolean {
    return this.playerCommands.upgradeWorkbench(actor);
  }

  start(): void {
    // 音频须在用户手势(点击开始)后启动,这里由 GameplayUI 在手势链路中调用
    this.audio.start();
    // 相机直接落位到玩家出生点,否则会从世界原点收敛,开局出现镜头突变
    this.cameraController.placeImmediately();
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
    this.autoPlace.detach(session);
    this.beds.detach(session);
    this.shrines.detach(session);
    this.soils.detach(session);
    this.crops.detach(session);
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
    // 手持设施(安放/围栏/围栏门)时双手被道具占用:除安放外的所有空手站定交互(采集/挤奶/喝水等)一律不可开始
    if (exclude !== 'autoPlace' && s.player.holdsFacility) return true;
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
    if (exclude !== 'workbench' && (this.workbench.isUpgrading(s) || this.workbench.isDigging(s)))
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
    if (exclude !== 'fences' && this.fences.isDigging(s)) return true;
    if (exclude !== 'beds' && this.beds.isBusy(s)) return true;
    if (exclude !== 'shrines' && this.shrines.isDigging(s)) return true;
    if (exclude !== 'soils' && this.soils.isDigging(s)) return true;
    if (exclude !== 'crops' && this.crops.isHarvesting(s)) return true;
    if (exclude !== 'autoPlace' && this.autoPlace.isPlacing(s)) return true;
    return false;
  }

  /** 为会话装配玩家侧交互系统(每会话独立一份:采集/制作/进食/钓鱼/弓/喝水) */
  private attachSessionSystems(session: PlayerSession): void {
    const s = session;
    // 拾取提示只飘在本地玩家头顶;房主广播入包飞行事件,让其他玩家也看得到该玩家的入包表现
    s.inventory.onAdd = (kind, count) => {
      if (s === this.local) this.pickupPresentation.emit(kind, count);
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
        this.pickupPresentation.markOrigin(position, s);
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
      s.craftedIds,
      // 仅火把/火堆/一级工作台制作完成自动拿在手上,其余设施产物进背包
      (kind) => {
        if (kind !== 'torch' && kind !== 'campfire' && kind !== 'workbench1') return;
        this.setToolFor(s, this.autoPlace.toolOf(kind) ?? 'place', kind);
      }
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
      (position) => this.pickupPresentation.markOrigin(position, s),
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

  /** 手上是否还持有该工具(套索额外把「正牵着羊」也算持有,绳子还在手里);可放置道具不经此判定,由循环条目按背包展开 */
  private hasToolFor(s: PlayerSession, tool: Exclude<HandTool, 'hand'>): boolean {
    if (tool === 'lasso')
      return s.inventory.count('lasso') > 0 || this.wildlife.leashedBy(s.player) !== null;
    if (tool === 'fence' || tool === 'fenceGate' || tool === 'place') return false;
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
    this.snow.dispose();
    this.clouds.dispose();
    this.windFx.dispose();
    this.footprints.dispose();
    this.ocean.dispose();
    this.oceanDepth.dispose();
    this.pickupPresentation.dispose();
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
    const poseidonGrace = this.poseidonGrace && s === this.local;
    return this.hudSnapshotBuilder.build(s, busy, {
      autoEquipTimer: this.autoEquipTimer,
      respawnEnabled: !!this.hostRef || poseidonGrace,
      poseidonGrace,
      collectTreasure: this.collectTreasure,
    });
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
    let indicator = this.guestMode ? this.guestHud.indicator(delta) : this.indicatorFor(this.local);
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
    return this.interactionIndicatorBuilder.build(
      session,
      session === this.local,
      this.autoEquipTimer
    );
  }
}
