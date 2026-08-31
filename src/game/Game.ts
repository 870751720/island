import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { Player, type HandTool } from './entities/Player';
import { Crabs } from './entities/Crab';
import { Butterflies } from './entities/Butterflies';
import { Birds } from './entities/Birds';
import { Wildlife } from './entities/Wildlife';
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
import { MeteorSystem } from './systems/MeteorSystem';
import { CampfireSystem, type CampfireInfo } from './systems/CampfireSystem';
import { EatingSystem } from './systems/EatingSystem';
import { firstFoodIn, FOODS, type Food } from './systems/Food';
import { ITEMS } from './systems/Items';
import { WaterSystem } from './systems/WaterSystem';
import { FishingSystem, type FishingState } from './systems/FishingSystem';
import { BowSystem } from './systems/BowSystem';
import { MumbleSystem } from './systems/MumbleSystem';
import { Particles } from './fx/Particles';
import { GameAudio } from './audio/GameAudio';
import { WaterFx } from './fx/WaterFx';
import { Rain } from './fx/Rain';
import { RainImpact } from './fx/RainImpact';
import { Wind } from './fx/Wind';
import { PondLife } from './fx/PondLife';
import { Footprints } from './fx/Footprints';
import { PlayerIndicator } from './ui3d/PlayerIndicator';
import { Inventory, type InventorySlot, type ResourceKind } from './systems/Inventory';
import { EQUIPMENT, Equipment, isEquipKind, type EquipKind, type EquipSlot } from './systems/Equipment';
import { SaveSystem, SAVE_VERSION, type SaveData } from './systems/SaveSystem';
import { mulberry32 } from './core/rng';
import { SurvivalSystem } from './systems/SurvivalSystem';
import { IslandTerrain } from './world/IslandTerrain';
import { Ocean } from './world/Ocean';
import { Clouds } from './world/Clouds';
import { Props } from './world/Props';
import { SEED_OF } from './world/TreeSpecies';
import { openBottle } from './systems/BottleMessages';
import { MinimapSystem, type GroundKind, type MinimapMarker, type MinimapSnapshot } from './systems/MinimapSystem';
import { saveAudioSettings, type AudioSettings } from './audio/AudioSettings';
import type { VitalLevels } from '../ui/VitalWarn';

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
  /** 站在可钓点且手持鱼竿时出现钓鱼按钮 */
  canFish: boolean;
  /** 钓鱼进行中的阶段,空闲为 null */
  fishingState: FishingState | null;
  fishingProgress: number;
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
};

const VIEW_SIZE = 18;

/** 拾取提示(玩家头顶飘图标):图标、数量与诞生时的屏幕坐标 */
export type PickupToast = { items: { icon: string; count: number }[]; x: number; y: number };

const AUTOSAVE_INTERVAL = 5; // 自动存档间隔(秒)
const AUTO_EQUIP_DELAY = 1; // 站定不动多久后自动切换到需要的工具(秒)
const IDLE_HIDE_DELAY = 5; // 玩家多久不移动/不交互后 HUD 才淡出(秒)

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private loop = new GameLoop();
  private player: Player;
  private collect: CollectSystem;
  private water: WaterSystem;
  private props: Props;
  private fx: Particles;
  private audio = new GameAudio();
  private waterFx: WaterFx;
  private pondLife: PondLife;
  private footprints: Footprints;
  private survival = new SurvivalSystem();
  private inventory = new Inventory();
  private equipment = new Equipment();
  /** 已拥有的工具(制作一次永久拥有,不进背包,供 HUD/自言自语/制作判断) */
  private tools: Tools = { axe: 0, pickaxe: 0, hoe: 0, fishingrod: 0, bow: 0 };
  private crafting: CraftingSystem;
  private workbench: WorkbenchSystem;
  private crates: CrateSystem;
  private fences: FenceSystem;
  private beds: BedSystem;
  private meteor: MeteorSystem;
  private campfire: CampfireSystem;
  private eating: EatingSystem;
  private lastFishingState: FishingState | null = null;
  /** 上次推送的 busy 状态,变化时立即推送让按钮淡出更跟手 */
  private lastBusy = false;
  private lastBiteClicks = 0;
  /** 连续未移动且无交互的时长:达到 IDLE_HIDE_DELAY 后 HUD 淡出 */
  private idleTime = 0;
  private fishing: FishingSystem;
  private archery: BowSystem;
  private drops: DropSystem;
  private dayNight: DayNightSystem;
  private weather: WeatherSystem;
  private rain: Rain;
  private rainImpact: RainImpact;
  private windFx: Wind;
  private terrain: IslandTerrain;
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
  private propsSeed: number;
  private autosaveTimer = 0;
  private mumbles: MumbleSystem;
  private mumbleText: string | null = null;
  private mumbleTimer = 0;
  private hudTimer = 0;
  private noticeId = 0;
  private notice: { id: number; text: string } | null = null;
  private autoEquipTimer = 0;
  private lastDead = false;
  private lastHealth = 100;
  private hurtSoundTimer = 0;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;

  constructor(
    container: HTMLElement,
    onHud: (snap: HudSnapshot) => void,
    onLabel: (label: string | null, x: number, y: number, color?: string) => void,
    onMumble: (text: string | null, x: number, y: number) => void,
    onVitals: (vitals: VitalLevels | null, x: number, y: number) => void,
    onPickup: (toast: PickupToast) => void,
    onDamage: (amount: number, x: number, y: number) => void,
    onDogEmoji: (emoji: string | null, x: number, y: number) => void
  ) {
    this.container = container;
    this.onHud = onHud;
    this.onLabel = onLabel;
    this.onMumble = onMumble;
    this.onVitals = onVitals;
    this.onPickup = onPickup;
    this.onDamage = onDamage;
    this.onDogEmoji = onDogEmoji;

    // 有存档则用存档里的世界种子重建同一座岛,否则随机生成一座新岛
    const save = SaveSystem.load();
    this.terrainSeed = save?.terrainSeed ?? Math.random() * 1000;
    this.propsSeed = save?.propsSeed ?? Math.floor(Math.random() * 0xffffffff);
    this.inventory.onAdd = (kind, count) => this.emitPickup(kind, count);
    this.mumbles = new MumbleSystem((_trigger, text) => {
      this.mumbleText = text;
      this.mumbleTimer = 4;
    });

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
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
    this.scene.add(new Ocean(Math.max(500, terrain.size * 3)).mesh);
    this.clouds = new Clouds(terrain.size * 0.95);
    this.scene.add(this.clouds.group);
    this.props = new Props(this.scene, terrain, mulberry32(this.propsSeed));
    this.fx = new Particles(this.scene);
    this.waterFx = new WaterFx(this.scene, this.fx);

    this.scene.add(terrain.waterGroup);
    this.footprints = new Footprints(this.scene, terrain);
    this.pondLife = new PondLife(this.scene, terrain);
    this.player = new Player(terrain, terrain.findSpawnPoint(), this.waterFx, this.footprints);
    this.fences = new FenceSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走围栏/门时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.beds.isBusy ||
        this.water.isActive
    );
    this.player.setObstacles(this.props, this.fences);
    this.scene.add(this.player.group);
    // 穿戴变化即时反映到玩家模型;背包类装备同时扩容背包
    this.equipment.onChange = (slot, kind) => {
      this.player.setEquip(slot, kind);
      const cap = kind ? EQUIPMENT[kind].capacity : undefined;
      if (cap) this.inventory.setCapacity(cap);
    };
    this.crabs = new Crabs(
      this.scene,
      terrain,
      this.player,
      // 挡玩家的物件也挡地上的动物(成树/树桩/大石/围栏),鸟和蝴蝶会飞不受限
      (x, z) => this.isGroundBlocked(x, z)
    );
    this.butterflies = new Butterflies(this.scene, this.props, this.player);
    this.birds = new Birds(this.scene, this.terrain, this.props, this.player);
    // 熊扑击玩家的结算:装备防御减伤(至少 1 点)+ 头顶伤害数字 + 泛红特效与音效
    this.wildlife = new Wildlife(
      this.scene,
      terrain,
      this.player,
      (damage: number, pounce?: boolean) => {
        const final = Math.max(1, damage - this.equipment.totalDefense());
        this.survival.damage(final);
        // 扑击命中额外压制:减速 3 秒(移动减半),摔得爬不起来
        if (pounce) this.player.applySlow(3);
        const p = this.player.group.position;
        this.fx.burst(new THREE.Vector3(p.x, p.y + 1.2, p.z), '#c0392d', 12);
        this.audio.play('chop');
        const head = new THREE.Vector3(p.x, p.y + 2.5, p.z).project(this.camera);
        this.onDamage(
          final,
          Math.round(((head.x + 1) / 2) * this.renderer.domElement.clientWidth),
          Math.round(((1 - head.y) / 2) * this.renderer.domElement.clientHeight)
        );
      },
      () => !this.survival.state.dead && !this.player.isSwimming && !this.player.isSleeping,
      // 熊的咆哮/扑击扬尘等粒子与音效
      this.fx,
      (name) => this.audio.play(name),
      // 挡玩家的物件也挡动物:围栏圈得住,成树/树桩/大石绕着走
      (x, z) => this.isGroundBlocked(x, z)
    );
    // 砍树/采石/敲打/放箭的声响会惊动附近的动物:熊循声警戒,食草动物逃离
    this.audio.onSfx = (name) => {
      if (name === 'chop' || name === 'mine' || name === 'knock' || name === 'shoot') {
        const pos = this.player.group.position;
        this.wildlife.startle(pos.x, pos.z);
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
    this.water = new WaterSystem(this.player, terrain, this.survival, this.audio);
    this.indicator = new PlayerIndicator(this.camera, this.scene);

    // Q 键作为桌面端补充的工具切换
    window.addEventListener('keydown', this.onKeyDown);

    this.collect = new CollectSystem(
      this.player,
      this.props,
      this.inventory,
      this.tools,
      this.fx,
      this.audio,
      // 合成/进食/钓鱼/播种占用双手,期间采集让位
      () =>
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.beds.isBusy
    );
    this.crafting = new CraftingSystem(
      this.player,
      this.inventory,
      this.tools,
      this.fx,
      this.audio,
      // 背包放不下的产物掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 装备做出来且评分高于身上这件时直接上身
      (kind) => {
        if (isEquipKind(kind)) this.equipment.equip(kind, this.inventory);
      }
    );
    this.workbench = new WorkbenchSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走工作台道具入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.water.isActive
    );
    this.crates = new CrateSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走木箱与箱内物品入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.water.isActive
    );
    this.beds = new BedSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 挖走床时道具入包,背包放不下的部分掉在玩家身旁
      (kind, count) => this.giveItem(kind, count),
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.water.isActive
    );
    this.eating = new EatingSystem(this.player, this.inventory, this.survival, this.fx, this.audio);
    this.fishing = new FishingSystem(
      this.scene,
      this.player,
      this.terrain,
      this.inventory,
      this.waterFx,
      this.fx,
      this.audio,
      this.tools
    );
    this.campfire = new CampfireSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio,
      this.tools,
      // 其他占用双手的行为进行中时挖掘让位
      () =>
        this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.beds.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.water.isActive,
      // 烹饪好的食物背包放不下时掉在玩家身旁
      (kind, count) => this.giveItem(kind, count)
    );
    this.archery = new BowSystem(
      this.scene,
      this.player,
      this.terrain,
      this.inventory,
      this.crabs,
      this.birds,
      this.wildlife,
      this.fx,
      this.audio,
      this.tools,
      // 击杀的战利品散落在击杀位置周围,走近后点「捡回」拾取
      (items: { kind: ResourceKind; count: number }[], x: number, z: number) => {
        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2;
          this.drops.dropAt(item.kind, item.count, x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6);
        });
      }
    );
    this.drops = new DropSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.fx,
      this.audio
    );

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
        this.player.update(delta, elapsed);
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
        this.crabs.update(delta, elapsed);
        this.butterflies.update(delta, elapsed);
        this.birds.update(delta, elapsed);
        this.wildlife.update(delta, elapsed);
        this.dog.update(delta, elapsed, this.drops, this.dayNight.isNight);
        this.props.update(delta, elapsed, this.weather.wind);
        this.windFx.update(delta, this.player.group.position, this.weather.wind);
        this.fx.update(delta);
        this.waterFx.update(delta);
        this.pondLife.update(delta, elapsed);
        this.footprints.update(delta);
        this.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;
        this.survival.thirstDrainMultiplier =
          this.weather.thirstDrainMultiplier * this.equipment.thirstMultiplier();
        this.survival.swimming = this.player.isSwimming;
        this.survival.sleeping = this.player.isSleeping;
        this.survival.update(delta);
      // 血量下降(受击/饥饿/溺水)触发角色模型闪红与受伤音(音效带间隔节流,持续掉血不成串响)
      if (this.survival.state.health < this.lastHealth - 0.001) {
        this.player.hurt();
        this.hurtSoundTimer -= delta;
        if (this.hurtSoundTimer <= 0) {
          this.audio.play('hurt');
          this.hurtSoundTimer = 1.5;
        }
      }
      this.lastHealth = this.survival.state.health;
        this.collect.update(delta);
            this.crates.update(delta);
        this.fences.update(delta);
        this.beds.update(delta);
        // 睡觉过渡中:天空随进度日夜流转
        if (this.beds.isSleeping) {
          this.dayNight.setSleepProgress(this.beds.getSleepProgress() ?? 0);
        }
        this.crafting.update(delta);
        // 工作台配方离台即中断(小幅挪动可能未触发移动中断)
        if (
          this.crafting.isWorking &&
          this.crafting.currentRecipe?.station === 'workbench' &&
          !this.workbench.isNear
        ) {
          this.crafting.cancel();
        }
    this.workbench.update(delta);
    this.campfire.update(delta, elapsed);
    this.eating.update(delta);
    this.fishing.update(
      delta,
      this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.beds.isBusy ||
        this.water.isActive
    );
    this.archery.update(
      delta,
      this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.beds.isBusy ||
        this.water.isActive ||
        this.survival.state.dead
    );
        this.drops.update(delta, elapsed);
        // 手里的种子/围栏用光后自动收起,回到空手
        if (this.player.currentTool !== 'hand' && !this.hasTool(this.player.currentTool)) {
          this.player.setTool('hand');
        }
        this.updateAutoEquip(delta);
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
    this.water.update(
      delta,
      this.collect.isWorking ||
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.workbench.isDigging ||
        this.campfire.isBusy ||
        this.eating.isWorking ||
        this.fishing.isWorking ||
        this.archery.isWorking ||
        this.crates.isDigging ||
        this.fences.isDigging ||
        this.beds.isBusy
    );
        this.updateIndicator(delta);
        this.updateCamera(delta);
        this.renderer.render(this.scene, this.camera);
        if (this.survival.state.dead && !this.lastDead) {
          this.player.setDead();
          this.audio.play('death');
          // 死亡即清档:下次进入从新岛重新开始
          SaveSystem.clear();
        }
        this.lastDead = this.survival.state.dead;
        if (!this.survival.state.dead) {
          this.autosaveTimer += delta;
          if (this.autosaveTimer >= AUTOSAVE_INTERVAL) {
            this.autosaveTimer = 0;
            SaveSystem.save(this.collectSave());
          }
        }
        this.pushHud(delta);
        this.flushPickups();
      },
    });

    this.applySave(save);
  }

  /** 有存档时恢复全部进度(位置、背包、工具、生存、昼夜、资源点与摆件) */
  private applySave(save: SaveData | null): void {
    if (!save) return;
    const p = this.player.group.position;
    p.set(save.player.x, save.player.y, save.player.z);
    this.survival.state.hunger = save.survival.hunger;
    this.survival.state.thirst = save.survival.thirst;
    this.survival.state.health = save.survival.health;
    this.survival.state.stamina = save.survival.stamina;
    this.lastHealth = save.survival.health;
    this.survival.state.dead = false;
    this.inventory.load(save.slots, save.capacity);
    this.equipment.restore(save.equipped, this.inventory);
    // 恢复已拥有的工具(含等级)
    for (const [id, tier] of Object.entries(save.tools)) {
      if (tier > 0) this.tools[id as ToolId] = tier;
    }
    const tool = save.handTool;
    if (tool === 'hand' || this.hasTool(tool)) {
      this.player.setTool(tool);
    }
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
    this.drops.restore(save.drops);
    if (save.dog) this.dog.restore(save.dog.x, save.dog.z);
  }

  /** 汇总当前进度为存档数据 */
  private collectSave(): SaveData {
    const p = this.player.group.position;
    const s = this.survival.state;
    return {
      version: SAVE_VERSION,
      terrainSeed: this.terrainSeed,
      propsSeed: this.propsSeed,
      player: { x: p.x, y: p.y, z: p.z },
      survival: { hunger: s.hunger, thirst: s.thirst, health: s.health, stamina: s.stamina },
      slots: this.inventory.snapshot(),
      capacity: this.inventory.capacity,
      tools: { ...this.tools },
      equipped: this.equipment.snapshotForSave(),
      handTool: this.player.currentTool,
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

  /** 背包入包时在玩家头顶飘出图标与数量 */
  /** 本帧入包待合并的拾取项(同帧多种道具合并为一条提示) */
  private pendingPickups: { icon: string; count: number }[] = [];

  private emitPickup(kind: ResourceKind, count: number): void {
    const icon = ITEMS[kind].icon;
    const existing = this.pendingPickups.find((p) => p.icon === icon);
    if (existing) existing.count += count;
    else this.pendingPickups.push({ icon, count });
  }

  /** 帧末统一发出本帧的拾取提示:同一瞬间获得的多种道具合并为一条,避免重叠 */
  private flushPickups(): void {
    if (this.pendingPickups.length === 0) return;
    const p = this.player.group.position;
    const head = new THREE.Vector3(p.x, p.y + 3.2, p.z).project(this.camera);
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    this.onPickup({
      items: this.pendingPickups,
      x: Math.round(((head.x + 1) / 2) * w),
      y: Math.round(((1 - head.y) / 2) * h),
    });
    this.pendingPickups = [];
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

  /** 手上是否还持有该工具(围栏/门按背包数量判断) */
  private hasTool(tool: Exclude<HandTool, 'hand'>): boolean {
    if (tool === 'fence')
      return this.inventory.count('fenceWood') + this.inventory.count('fenceStone') > 0;
    if (tool === 'fenceGate') return this.inventory.count('fenceGate') > 0;
    return !!this.tools[tool];
  }

  setJoystick(x: number, z: number): void {
    this.player.input.setJoystick(x, z);
  }

  /** 循环切换手持工具:空手 → 斧子 → 镐子 → 锄头 → 鱼竿 → 弓 → 围栏/门(仅手里还有的) */
  cycleTool(): void {
    const order: HandTool[] = [
      'hand',
      'axe',
      'pickaxe',
      'hoe',
      'fishingrod',
      'bow',
      'fence',
      'fenceGate',
    ];
    const owned: HandTool[] = order.filter((t) => t === 'hand' || this.hasTool(t));
    const next = owned[(owned.indexOf(this.player.currentTool) + 1) % owned.length];
    this.player.setTool(next);
  }

  /** 工具按钮点击:场景有明确需要的工具时直接切过去,否则循环切换 */
  useToolButton(): void {
    const need = this.wantedTool();
    if (need) {
      this.autoEquipTimer = 0;
      this.player.setTool(need);
    } else {
      this.cycleTool();
    }
  }

  /** 站定不动时当前场景希望切到的工具(树→斧子、石→镐子、水边→鱼竿),不满足条件返回 null */
  private wantedTool(): HandTool | null {
    if (
      this.player.isMoving ||
      this.crafting.isWorking ||
      this.workbench.isWorking ||
      this.eating.isWorking ||
      this.beds.isBusy ||
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
    if (
      this.tools.fishingrod &&
      this.player.currentTool !== 'fishingrod' &&
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
      this.player.setTool(need);
    }
  }

  /** 吃食物(定时进食动作):指定种类则吃该种,否则吃背包里最前面的,返回是否成功开始 */
  eatFood(kind?: ResourceKind): boolean {
    if (
      this.crafting.isWorking ||
      this.workbench.isWorking ||
      this.eating.isWorking ||
      this.fishing.isWorking ||
      this.beds.isBusy
    ) {
      return false;
    }
    const food = kind
      ? FOODS.find((f) => f.kind === kind)
      : firstFoodIn(this.inventory.snapshot());
    return food ? this.eating.start(food) : false;
  }

  /** 发起钓鱼(屏幕中心按钮),返回是否成功开始 */
  startFishing(): boolean {
    if (
      this.crafting.isWorking ||
      this.workbench.isWorking ||
      this.workbench.isDigging ||
      this.eating.isWorking ||
      this.beds.isBusy ||
      this.water.isActive
    ) {
      return false;
    }
    return this.fishing.start();
  }

  /** 咬钩窗口内点击屏幕任意处收竿 */
  hookFish(): boolean {
    return this.fishing.hook();
  }

  /** GM 发放道具(直接进背包);工具类改为直接点亮拥有状态 */
  gmGiveItem(kind: ResourceKind, count: number): void {
    if ((TOOL_IDS as string[]).includes(kind)) {
      this.tools[kind as ToolId] = 1;
      return;
    }
    this.giveItem(kind, count);
  }

  /** GM 直接把工具点亮到指定等级(1 基础 / 2 精致) */
  gmGiveTool(tool: ToolId, tier: 1 | 2): void {
    this.tools[tool] = Math.max(this.tools[tool], tier);
  }

  /** 产物入包,背包放不下的部分掉在玩家身旁地上 */
  giveItem(kind: ResourceKind, count: number): number {
    const added = this.inventory.add(kind, count);
    const overflow = count - added;
    if (overflow > 0) this.drops.dropOverflow(kind, overflow);
    return added;
  }

  /** GM 生存状态回满并复活 */
  gmRestoreStatus(): void {
    const s = this.survival.state;
    s.hunger = s.thirst = s.health = s.stamina = 100;
    s.dead = false;
  }

  /** GM 跳转昼夜时刻,t∈[0,1),0.25 为正午 */
  gmSetTime(t: number): void {
    this.dayNight.time = t;
  }

  /** GM 强制切换天气 */
  gmSetWeather(type: 'sunny' | 'rain'): void {
    this.weather.force(type);
  }

  /** 睡觉期间锁交互:一切主动操作入口先检查该状态 */
  private get asleep(): boolean {
    return this.player.isSleeping;
  }

  /** 背包里点击「使用」木箱:校验通过后在玩家脚下原地放下,不满足时给出提示 */
  useCrate(): boolean {
    if (this.asleep) return false;
    if (!this.crates.use()) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }

  /** 背包里点击「使用」工作台道具:校验通过后在玩家脚下原地放回对应等级,不满足时给出提示 */
  useWorkbenchItem(kind: ResourceKind): boolean {
    const level = workbenchItemLevel(kind);
    if (this.asleep || level === null || !this.workbench.placeItem(level)) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }

  /** 背包里点击「使用」床道具:校验通过后在玩家脚下原地放下对应等级的床,不满足时给出提示 */
  useBedItem(kind: ResourceKind): boolean {
    const level = bedItemLevel(kind);
    if (this.asleep || level === null || !this.beds.place(level)) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }

  /** 睡觉消耗/恢复的固定数值 */
  private static readonly SLEEP_COST = 20;

  /** 靠近床发起睡觉:玩家躺上床,天空在过渡中日夜流转,醒来后统一结算 */
  sleep(): boolean {
    if (this.beds.isBusy || !this.beds.nearby || this.survival.state.dead) return false;
    const s = this.survival.state;
    if (s.hunger < Game.SLEEP_COST || s.thirst < Game.SLEEP_COST) {
      this.notify('又饿又渴睡不着,先吃点喝点再睡吧');
      return false;
    }
    const skipped = this.dayNight.beginSleep();
    return this.beds.startSleep(
      () => {
        this.dayNight.endSleep();
        this.props.advance(skipped);
        this.campfire.passTime(skipped, performance.now() / 1000);
        s.hunger -= Game.SLEEP_COST;
        s.thirst -= Game.SLEEP_COST;
        s.health = Math.min(100, s.health + Game.SLEEP_COST);
        this.audio.play('success');
        const p = this.player.group.position.clone();
        p.y += 0.8;
        this.fx.burst(p, '#cfe8ff', 14);
        this.notify('一觉睡到了第二天清晨');
      }
    );
  }

  /** 背包里点击「使用」围栏/围栏门:吸附到面前的格点(边)放下,不满足时给出提示 */
  useFenceItem(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    const fenceKind = fenceKindOfItem(kind);
    const ok = fenceKind
      ? this.fences.useFence(fenceKind)
      : kind === 'fenceGate'
        ? this.fences.useGate()
        : false;
    if (!ok) {
      this.notify('这里放不下,找块没东西的干地正对着要围的方向试试');
      return false;
    }
    this.afterPlaceDiggable();
    return true;
  }

  /** 通用规则:刚放置的东西可以被锄头挖走时,若正手持锄头则收起,避免原地立刻把它挖掉 */
  private afterPlaceDiggable(): void {
    if (this.player.currentTool === 'hoe') this.player.setTool('hand');
  }

  /** 拔开漂流瓶:消耗瓶子并返回瓶中信内容,没有瓶子返回 null */
  useBottle(): string | null {
    return openBottle(this.inventory);
  }

  /** 背包里点击「使用」种子:校验与摆放一致(不能在水里/水边,脚下不能被占住),通过后在原地种下 */
  useSeed(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    const species = (Object.keys(SEED_OF) as (keyof typeof SEED_OF)[]).find((s) => SEED_OF[s] === kind);
    if (!species || this.inventory.count(kind) <= 0) return false;
    const p = this.player.group.position;
    if (
      this.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里种不了,找个没东西的干地试试');
      return false;
    }
    this.inventory.remove(kind, 1);
    this.props.plant(species, p.x, p.z);
    this.audio.play('success');
    const fxPos = p.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, '#7fae55', 10);
    return true;
  }

  /** 背包里点击「使用」挖来的丛:校验与工作台摆放一致(不能在水里/水边,脚下不能被占住),通过后在原地种下 */
  useBush(kind: 'berryBush' | 'shrubBush' | 'grassTuft'): boolean {
    if (this.asleep) return false;
    if (this.inventory.count(kind) <= 0) return false;
    const p = this.player.group.position;
    if (
      this.player.isSwimming ||
      this.terrain.isNearWater(p, 1) ||
      this.terrain.getHeight(p.x, p.z) <= 0 ||
      this.props.isOccupied(p, 1)
    ) {
      this.notify('这里放不下,找个没东西的干地试试');
      return false;
    }
    this.inventory.remove(kind, 1);
    const bushKind = kind === 'berryBush' ? 'berry' : kind === 'grassTuft' ? 'grass' : 'shrub';
    this.props.placeBush(bushKind, p.x, p.z);
    this.afterPlaceDiggable();
    this.audio.play('success');
    const fxPos = p.clone();
    fxPos.y += 0.5;
    this.fx.burst(fxPos, kind === 'berryBush' ? '#5d8a3a' : kind === 'grassTuft' ? '#a4c46a' : '#6b8f4e', 10);
    return true;
  }

  /** 捡回附近掉落物(点「捡回」卡片),背包放不下则提示 */
  pickupDrop(): boolean {
    if (this.asleep) return false;
    const near = this.drops.getNearby();
    if (!near) return false;
    if (!this.inventory.canFit(near.kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    return this.drops.pickupNearby();
  }

  /** 通用临时提示(由 UI 自动消失) */
  notify(text: string): void {
    this.notice = { id: ++this.noticeId, text };
    this.hudTimer = 1; // 跳过节流立即推送
    this.pushHud(0);
  }

  /** 发起定时搭建火堆(站定敲打,进度走头顶圆环),返回是否成功开始 */
  craftCampfire(): boolean {
    if (this.asleep) return false;
    return this.campfire.start();
  }

  /** 把背包里该种类全部道具存入身旁木箱(整格),失败时给出提示 */
  crateStore(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    if (!this.crates.store(kind)) {
      this.notify('木箱装不下了');
      return false;
    }
    return true;
  }

  /** 把身旁木箱里该种类全部道具取回背包(整格),失败时给出提示 */
  crateTake(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    if (!this.crates.take(kind)) {
      this.notify('背包满了,装不下更多东西');
      return false;
    }
    return true;
  }

  /** 向身旁火堆添加 1 个可燃物,返回是否成功 */
  campfireAddFuel(kind: ResourceKind): boolean {
    if (this.asleep) return false;
    return this.campfire.addFuel(kind) > 0;
  }

  /** 在身旁燃烧的火堆上发起烹饪(可选份数,同工作台),返回是否成功开始 */
  campfireCook(kind: ResourceKind, count: number): boolean {
    if (this.asleep) return false;
    return this.campfire.startCooking(kind, count);
  }

  /** 丢弃道具到玩家附近的地上(可指定数量,超出持有数按实际丢弃) */
  dropItem(kind: ResourceKind, count = 1): boolean {
    if (this.asleep) return false;
    const n = Math.min(count, this.inventory.count(kind));
    if (n <= 0) return false;
    this.inventory.remove(kind, n);
    this.drops.drop(kind, n);
    return true;
  }

  /** 背包格之间移动道具(拖拽交换/合并),返回是否成功 */
  moveItem(from: number, to: number): boolean {
    return this.inventory.move(from, to);
  }

  /** 从背包装备一件道具(物品详情点击「装备」),返回是否成功 */
  equipItem(kind: ResourceKind): boolean {
    return isEquipKind(kind) ? this.equipment.equip(kind, this.inventory, true) : false;
  }

  /** 卸下某栏位的装备放回背包,背包放不下则失败 */
  unequipItem(slot: EquipSlot): boolean {
    return this.equipment.unequip(slot, this.inventory);
  }

  /** 发起定时合成(站定敲打,进度走头顶圆环),返回是否成功开始 */
  craftTool(id: CraftId): boolean {
    if (this.asleep || this.workbench.isWorking || this.workbench.isDigging) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe && recipe.station === 'hand' ? this.crafting.start(recipe) : false;
  }

  /** 在工作台发起制作(可选个数,逐个完成),玩家须在的工作范围内,返回是否成功开始 */
  craftAtWorkbench(id: CraftId, count: number): boolean {
    if (this.asleep || this.workbench.isWorking || this.workbench.isDigging || !this.workbench.isNear) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe &&
      recipe.station === 'workbench' &&
      (recipe.minBenchLevel ?? 1) <= this.workbench.level
      ? this.crafting.start(recipe, count)
      : false;
  }

  /** 发起工作台制作(完成后在原位放置),返回是否成功开始 */
  craftWorkbench(): boolean {
    if (this.asleep || this.crafting.isWorking || this.eating.isWorking) return false;
    return this.workbench.start();
  }

  /** 发起工作台升级(站定敲打,完成后换更高等级模型),返回是否成功开始 */
  upgradeWorkbench(): boolean {
    if (this.asleep || this.crafting.isWorking || this.eating.isWorking) return false;
    return this.workbench.upgrade();
  }

  start(): void {
    // 音频须在用户手势(点击开始)后启动,这里由 GameplayUI 在手势链路中调用
    this.audio.start();
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    // 退出前再存一次,保证最近进度不丢;已死亡则存档已清
    if (!this.survival.state.dead) SaveSystem.save(this.collectSave());
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    this.player.dispose();
    this.drops.dispose();
    this.rain.dispose();
    this.windFx.dispose();
    this.footprints.dispose();
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
    this.onHud({
      ...this.survival.state,
      wood: this.inventory.count('wood'),
      stone: this.inventory.count('stone'),
      berry: this.inventory.count('berry'),
      fiber: this.inventory.count('fiber'),
      fur: this.inventory.count('fur'),
      crabMeat: this.inventory.count('crabMeat'),
      birdMeat: this.inventory.count('birdMeat'),
      gameMeat: this.inventory.count('gameMeat'),
      rope: this.inventory.count('rope'),
      arrow: this.inventory.count('arrow'),
      bait: this.inventory.count('bait'),
      bed1: this.inventory.count('bed1'),
      heldFenceCount:
        this.player.currentTool === 'fence'
          ? this.inventory.count('fenceWood') + this.inventory.count('fenceStone')
          : this.player.currentTool === 'fenceGate'
            ? this.inventory.count('fenceGate')
            : 0,
      slots: this.inventory.snapshot(),
      capacity: this.inventory.capacity,
      hasAxe: !!this.tools.axe,
      hasPickaxe: !!this.tools.pickaxe,
      hasHoe: !!this.tools.hoe,
      hasFishingrod: !!this.tools.fishingrod,
      hasBow: !!this.tools.bow,
      toolTiers: { ...this.tools },
      nearCrate: !!this.crates.nearby,
      nearBed: !!this.beds.nearby,
      bedSleeping: this.beds.isSleeping,
      bedSleepProgress: this.beds.getSleepProgress() ?? 0,
      crateSlots: this.crates.nearbySlots(),
      equipped: this.equipment.snapshot(),
      tool: this.player.currentTool,
      craftId: this.crafting.currentRecipe?.id ?? null,
      craftProgress: this.crafting.getProgress() ?? 0,
      canCraftWorkbench: this.workbench.canStart(),
      workbenchCrafting: this.workbench.isWorking,
      workbenchProgress: this.workbench.getProgress() ?? 0,
      workbenchLevel: this.workbench.level,
      nearWorkbench: this.workbench.isNear,
      canCraftCampfire: this.campfire.canStart(),
      canBuildCampfire: this.campfire.canBuild(),
      campfireCrafting: this.campfire.isBusy,
      campfireProgress: this.campfire.getProgress() ?? 0,
      nearCampfire: !!this.campfire.nearby,
      campfireInfo: this.campfire.getCampfireInfo(),
      eatName: this.eating.currentFood?.name ?? null,
      eatProgress: this.eating.getProgress() ?? 0,
      autoEquipProgress: this.autoEquipTimer > 0 ? this.autoEquipTimer / AUTO_EQUIP_DELAY : 0,
      canFish: this.fishing.canStart(),
      fishingState: this.fishing.currentState,
      fishingProgress: this.fishing.getProgress() ?? 0,
      biteActive: this.fishing.currentState === 'bite',
      biteClicks: this.fishing.biteClicks,
      biteNeed: this.fishing.biteNeed,
      nearDrop: this.drops.getNearby(),
      notice: this.notice,
      day: this.dayNight.day,
      busy,
    });
  }

  /** 玩家正在移动或处于任一交互进行中:闲置满 5s 后据此淡出设置/地图/背包/工具按钮与弹出卡片
   * 各交互(采集/制作/挖除/吃喝/钓鱼/拉弓等)都会设置玩家的作业动画,统一用 isActing 判定 */
  private get isPlayerBusy(): boolean {
    return (
      this.player.isMoving ||
      this.player.isActing ||
      this.beds.isBusy ||
      this.fishing.currentState !== null
    );
  }

  /** 玩家头顶的作业提示文字(投影到屏幕坐标,由 React UI 渲染)与进度圆环 */
  private updateIndicator(delta: number): void {
    const nearby = this.collect.getNearby();
    let label: string | null = null;
    let progress: number | null = null;
    if (this.survival.state.dead) {
      // 死亡时不显示
    } else if (this.crafting.isWorking) {
      const { total, current } = this.crafting.queueInfo;
      label = `制作中:${this.crafting.currentRecipe!.name}${total > 1 ? ` ${current}/${total}` : ''}`;
      progress = this.crafting.getProgress();
    } else if (this.workbench.isWorking) {
      label = this.workbench.isUpgrading ? '升级中:工作台' : '制作中:工作台';
      progress = this.workbench.getProgress();
    } else if (this.workbench.isDigging) {
      label = '挖工作台…';
      progress = this.workbench.getDigProgress();
    } else if (this.crates.isDigging) {
      label = '挖木箱…';
      progress = this.crates.getDigProgress();
    } else if (this.fences.isPlacing) {
      label = this.player.currentTool === 'fenceGate' ? '装围栏门…' : '立围栏…';
      progress = this.fences.getPlaceProgress();
    } else if (this.fences.isDigging) {
      label = '拆围栏…';
      progress = this.fences.getDigProgress();
    } else if (this.beds.isSleeping) {
      label = '睡觉中…';
      progress = this.beds.getSleepProgress();
    } else if (this.beds.isDigging) {
      label = '挖床…';
      progress = this.beds.getDigProgress();
    } else if (this.campfire.isDigging) {
      label = '挖火堆…';
      progress = this.campfire.getDigProgress();
    } else if (this.campfire.isCooking) {
      const { total, current } = this.campfire.cookInfo;
      const food = ITEMS[this.campfire.cookingKind!];
      label = `烹饪中:${food.icon} ${food.name} ${current}/${total}`;
      progress = this.campfire.getProgress();
    } else if (this.campfire.isWorking) {
      label = '搭建中:小火堆';
      progress = this.campfire.getProgress();
    } else if (this.eating.isWorking) {
      label = `${this.eating.currentFood!.icon} 吃${this.eating.currentFood!.name}`;
      progress = this.eating.getProgress();
    } else if (this.fishing.isWorking) {
      const s = this.fishing.currentState!;
      const tease = this.fishing.getTease();
      label =
        s === 'casting'
          ? '抛竿…'
          : s === 'waiting'
            ? tease?.text ?? '等待上钩…'
            : s === 'bite'
              ? this.fishing.biteNeed > 1
                ? `咬钩了!快连点屏幕!${this.fishing.biteClicks}/${this.fishing.biteNeed}`
                : '咬钩了!快点击屏幕!'
              : '收竿!';
      progress = this.fishing.getProgress();
    } else if (nearby && this.collect.canCollect(nearby)) {
      progress = this.collect.getHarvestInfo()?.progress ?? null;
      const digging = this.player.currentTool === 'hoe';
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
    } else if (this.water.isActive) {
      label = '喝水';
      progress = this.water.getProgress();
    } else if (this.autoEquipTimer > 0 && !nearby) {
      label = '切换鱼竿…';
      progress = this.autoEquipTimer / AUTO_EQUIP_DELAY;
    } else if (nearby) {
      const switching = this.autoEquipTimer > 0;
      label =
        nearby.kind === 'tree'
          ? switching
            ? '切换斧子…'
            : this.tools.axe
              ? '需要手持斧子'
              : '需要斧子'
          : nearby.kind === 'rock' || nearby.kind === 'meteor'
            ? switching
              ? '切换镐子…'
              : this.tools.pickaxe
                ? '需要手持镐子'
                : '需要镐子'
            : nearby.kind === 'worm'
              ? switching
                ? '切换锄头…'
                : this.tools.hoe
                  ? '需要手持锄头'
                  : '需要锄头'
              : null;
      if (switching) progress = this.autoEquipTimer / AUTO_EQUIP_DELAY;
    }
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
      this.fishing.getTease()?.color
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
}
