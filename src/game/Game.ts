import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { Player, type HandTool } from './entities/Player';
import { CollectSystem } from './systems/CollectSystem';
import { DayNightSystem } from './systems/DayNightSystem';
import { WeatherSystem } from './systems/WeatherSystem';
import { RECIPES, type CraftId, type Tools } from './systems/Crafting';
import { CraftingSystem } from './systems/CraftingSystem';
import { DropSystem, type DropInfo } from './systems/DropSystem';
import { WorkbenchSystem } from './systems/WorkbenchSystem';
import { EatingSystem } from './systems/EatingSystem';
import { FOODS, type Food } from './systems/Food';
import { WaterSystem } from './systems/WaterSystem';
import { FishingSystem, type FishingState } from './systems/FishingSystem';
import { Particles } from './fx/Particles';
import { GameAudio } from './audio/GameAudio';
import { WaterFx } from './fx/WaterFx';
import { Rain } from './fx/Rain';
import { RainImpact } from './fx/RainImpact';
import { Footprints } from './fx/Footprints';
import { PlayerIndicator } from './ui3d/PlayerIndicator';
import { Inventory, type InventorySlot, type ResourceKind } from './systems/Inventory';
import { SurvivalSystem } from './systems/SurvivalSystem';
import { IslandTerrain } from './world/IslandTerrain';
import { Ocean } from './world/Ocean';
import { Clouds } from './world/Clouds';
import { Props } from './world/Props';

export type HudSnapshot = {
  hunger: number;
  thirst: number;
  health: number;
  dead: boolean;
  wood: number;
  gravel: number;
  stone: number;
  berry: number;
  fiber: number;
  rope: number;
  /** 背包格子快照(空格为 null)与容量 */
  slots: InventorySlot[];
  capacity: number;
  axe: boolean;
  pickaxe: boolean;
  fishingrod: boolean;
  tool: HandTool;
  craftId: CraftId | null;
  craftProgress: number;
  canCraftWorkbench: boolean;
  workbenchCrafting: boolean;
  workbenchProgress: number;
  eatName: string | null;
  eatProgress: number;
  /** 空手站定等待自动切换工具的进度(0~1,0 表示未在等待) */
  autoEquipProgress: number;
  /** 站在可钓点且手持鱼竿时出现钓鱼按钮 */
  canFish: boolean;
  /** 钓鱼进行中的阶段,空闲为 null */
  fishingState: FishingState | null;
  fishingProgress: number;
  /** 咬钩反应窗口进行中(点屏幕任意处收竿) */
  biteActive: boolean;
  /** 玩家附近可捡回的掉落物,无时为 null */
  nearDrop: DropInfo | null;
};

const VIEW_SIZE = 18;

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
  private footprints: Footprints;
  private survival = new SurvivalSystem();
  private inventory = new Inventory();
  private tools: Tools = { axe: false, pickaxe: false, fishingrod: false };
  private crafting: CraftingSystem;
  private workbench: WorkbenchSystem;
  private eating: EatingSystem;
  private lastFishingState: FishingState | null = null;
  private fishing: FishingSystem;
  private drops: DropSystem;
  private dayNight: DayNightSystem;
  private weather: WeatherSystem;
  private rain: Rain;
  private rainImpact: RainImpact;
  private terrain: IslandTerrain;
  private clouds: Clouds;
  private indicator: PlayerIndicator;
  private sun: THREE.DirectionalLight;
  private onHud: (snap: HudSnapshot) => void;
  private onLabel: (label: string | null, x: number, y: number) => void;
  private hudTimer = 0;
  private autoEquipTimer = 0;
  private lastDead = false;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;

  constructor(
    container: HTMLElement,
    onHud: (snap: HudSnapshot) => void,
    onLabel: (label: string | null, x: number, y: number) => void
  ) {
    this.container = container;
    this.onHud = onHud;
    this.onLabel = onLabel;

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

    const terrain = new IslandTerrain();
    this.terrain = terrain;
    this.scene.add(terrain.mesh);
    this.scene.add(new Ocean(Math.max(500, terrain.size * 3)).mesh);
    this.clouds = new Clouds(terrain.size * 0.95);
    this.scene.add(this.clouds.group);
    this.props = new Props(this.scene, terrain);
    this.fx = new Particles(this.scene);
    this.waterFx = new WaterFx(this.scene, this.fx);

    this.scene.add(terrain.waterGroup);
    this.footprints = new Footprints(this.scene, terrain);
    this.player = new Player(terrain, terrain.findSpawnPoint(), this.waterFx, this.footprints);
    this.scene.add(this.player.group);
    this.water = new WaterSystem(this.player, terrain, this.survival, this.audio);
    this.indicator = new PlayerIndicator(this.camera, this.scene);

    // Q 键作为桌面端补充的工具切换
    window.addEventListener('keydown', this.onKeyDown);

    this.collect = new CollectSystem(
      this.player,
      this.props,
      this.inventory,
      this.fx,
      this.audio,
      // 合成/进食/钓鱼占用双手,期间采集让位
      () =>
        this.crafting.isWorking ||
        this.workbench.isWorking ||
        this.eating.isWorking ||
        this.fishing.isWorking
    );
    this.crafting = new CraftingSystem(this.player, this.inventory, this.tools, this.fx, this.audio);
    this.workbench = new WorkbenchSystem(
      this.scene,
      this.player,
      this.inventory,
      this.terrain,
      this.props,
      this.fx,
      this.audio
    );
    this.eating = new EatingSystem(this.player, this.inventory, this.survival, this.fx, this.audio);
    this.fishing = new FishingSystem(
      this.scene,
      this.player,
      this.terrain,
      this.inventory,
      this.waterFx,
      this.fx,
      this.audio
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
    // 天气在昼夜之后更新,对光照与天空做调制
    this.weather = new WeatherSystem(sun, hemi, this.scene);
    this.rain = new Rain();
    this.scene.add(this.rain.lines);
    this.rainImpact = new RainImpact(terrain, this.waterFx, this.fx);

    this.loop.add({
      update: (delta, elapsed) => {
        this.player.update(delta, elapsed);
        this.dayNight.update(delta);
        this.weather.update(delta);
        this.audio.setNight(this.dayNight.isNight);
        this.audio.setRainIntensity(this.weather.rainIntensity);
        this.rain.update(delta, this.player.group.position, this.weather.rainIntensity);
        this.rainImpact.update(delta, this.player.group.position, this.weather.rainIntensity);
        this.clouds.update(delta);
        this.terrain.updateWater(elapsed);
        this.props.update(delta);
        this.fx.update(delta);
        this.waterFx.update(delta);
        this.footprints.update(delta);
        this.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;
        this.survival.thirstDrainMultiplier = this.weather.thirstDrainMultiplier;
        this.survival.swimming = this.player.isSwimming;
        this.survival.update(delta);
        this.collect.update(delta);
        this.crafting.update(delta);
        this.workbench.update(delta);
        this.eating.update(delta);
        this.fishing.update(
          delta,
          this.collect.isWorking ||
            this.crafting.isWorking ||
            this.workbench.isWorking ||
            this.eating.isWorking ||
            this.water.isActive
        );
        this.drops.update(delta, elapsed);
        this.updateAutoEquip(delta);
        this.water.update(
          delta,
          this.collect.isWorking ||
            this.crafting.isWorking ||
            this.workbench.isWorking ||
            this.eating.isWorking ||
            this.fishing.isWorking
        );
        this.updateIndicator();
        this.updateCamera(delta);
        this.renderer.render(this.scene, this.camera);
        if (this.survival.state.dead && !this.lastDead) this.audio.play('death');
        this.lastDead = this.survival.state.dead;
        this.pushHud(delta);
      },
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

  /** 相机以固定偏移跟随角色 */
  private updateCamera(delta: number): void {
    const target = this.player.group.position;
    const desiredX = target.x + 20;
    const desiredY = target.y + 24;
    const desiredZ = target.z + 20;
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

  setJoystick(x: number, z: number): void {
    this.player.input.setJoystick(x, z);
  }

  /** 循环切换手持工具:空手 → 斧子 → 镐子(仅已拥有的) */
  cycleTool(): void {
    const order: HandTool[] = ['hand', 'axe', 'pickaxe', 'fishingrod'];
    const owned: HandTool[] = order.filter((t) => t === 'hand' || this.tools[t]);
    const next = owned[(owned.indexOf(this.player.currentTool) + 1) % owned.length];
    this.player.setTool(next);
  }

  /** 空手站在需要工具的资源点旁不动 3 秒且已拥有该工具时,自动切换到手上 */
  private updateAutoEquip(delta: number): void {
    const nearby = this.collect.getNearby();
    let need: HandTool | null = null;
    if (
      nearby &&
      !this.player.isMoving &&
      !this.crafting.isWorking &&
      !this.workbench.isWorking &&
      !this.eating.isWorking &&
      !this.survival.state.dead
    ) {
      if (nearby.kind === 'tree' && this.tools.axe && this.player.currentTool !== 'axe') {
        need = 'axe';
      } else if (
        nearby.kind === 'rock' &&
        this.tools.pickaxe &&
        this.player.currentTool !== 'pickaxe'
      ) {
        need = 'pickaxe';
      }
    } else if (
      !nearby &&
      !this.player.isMoving &&
      !this.crafting.isWorking &&
      !this.workbench.isWorking &&
      !this.eating.isWorking &&
      !this.survival.state.dead &&
      this.tools.fishingrod &&
      this.player.currentTool !== 'fishingrod' &&
      this.fishing.canFishHere()
    ) {
      // 站在水洼边或海边滩地不动,自动切换鱼竿
      need = 'fishingrod';
    }
    if (!need) {
      this.autoEquipTimer = 0;
      return;
    }
    this.autoEquipTimer += delta;
    if (this.autoEquipTimer >= 3) {
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
      this.fishing.isWorking
    ) {
      return false;
    }
    const food = kind
      ? FOODS.find((f) => f.kind === kind)
      : FOODS.find((f) => this.inventory.count(f.kind) > 0);
    return food ? this.eating.start(food) : false;
  }

  /** 发起钓鱼(屏幕中心按钮),返回是否成功开始 */
  startFishing(): boolean {
    if (
      this.crafting.isWorking ||
      this.workbench.isWorking ||
      this.eating.isWorking ||
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

  /** 捡回附近掉落物(点「捡回」卡片),背包放不下则失败 */
  pickupDrop(): boolean {
    return this.drops.pickupNearby();
  }

  /** 丢弃一个道具到玩家附近的地上 */
  dropItem(kind: ResourceKind): boolean {
    if (!this.inventory.remove(kind, 1)) return false;
    this.drops.drop(kind, 1);
    return true;
  }

  /** 发起定时合成(站定敲打,进度走头顶圆环),返回是否成功开始 */
  craftTool(id: CraftId): boolean {
    if (this.workbench.isWorking) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe ? this.crafting.start(recipe) : false;
  }

  /** 发起工作台制作(完成后在原位放置),返回是否成功开始 */
  craftWorkbench(): boolean {
    if (this.crafting.isWorking || this.eating.isWorking) return false;
    return this.workbench.start();
  }

  start(): void {
    // 音频须在用户手势(点击开始)后启动,这里由 GameplayUI 在手势链路中调用
    this.audio.start();
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    this.player.dispose();
    this.drops.dispose();
    this.rain.dispose();
    this.footprints.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private pushHud(delta: number): void {
    this.hudTimer += delta;
    // 钓鱼阶段变化(尤其咬钩)立即推送,保证反应窗口反馈及时
    const fishingState = this.fishing.currentState;
    const fishingChanged = fishingState !== this.lastFishingState;
    this.lastFishingState = fishingState;
    if (this.hudTimer < 0.25 && !fishingChanged) return;
    this.hudTimer = 0;
    this.onHud({
      ...this.survival.state,
      wood: this.inventory.count('wood'),
      gravel: this.inventory.count('gravel'),
      stone: this.inventory.count('stone'),
      berry: this.inventory.count('berry'),
      fiber: this.inventory.count('fiber'),
      rope: this.inventory.count('rope'),
      slots: this.inventory.snapshot(),
      capacity: this.inventory.capacity,
      axe: this.tools.axe,
      pickaxe: this.tools.pickaxe,
      fishingrod: this.tools.fishingrod,
      tool: this.player.currentTool,
      craftId: this.crafting.currentRecipe?.id ?? null,
      craftProgress: this.crafting.getProgress() ?? 0,
      canCraftWorkbench: this.workbench.canStart(),
      workbenchCrafting: this.workbench.isWorking,
      workbenchProgress: this.workbench.getProgress() ?? 0,
      eatName: this.eating.currentFood?.name ?? null,
      eatProgress: this.eating.getProgress() ?? 0,
      autoEquipProgress: this.autoEquipTimer > 0 ? this.autoEquipTimer / 3 : 0,
      canFish: this.fishing.canStart(),
      fishingState: this.fishing.currentState,
      fishingProgress: this.fishing.getProgress() ?? 0,
      biteActive: this.fishing.currentState === 'bite',
      nearDrop: this.drops.getNearby(),
    });
  }

  /** 玩家头顶的作业提示文字(投影到屏幕坐标,由 React UI 渲染)与进度圆环 */
  private updateIndicator(): void {
    const nearby = this.collect.getNearby();
    let label: string | null = null;
    let progress: number | null = null;
    if (this.survival.state.dead) {
      // 死亡时不显示
    } else if (this.crafting.isWorking) {
      label = `制作中:${this.crafting.currentRecipe!.name}`;
      progress = this.crafting.getProgress();
    } else if (this.workbench.isWorking) {
      label = '制作中:工作台';
      progress = this.workbench.getProgress();
    } else if (this.eating.isWorking) {
      label = `${this.eating.currentFood!.icon} 吃${this.eating.currentFood!.name}`;
      progress = this.eating.getProgress();
    } else if (this.fishing.isWorking) {
      const s = this.fishing.currentState!;
      label =
        s === 'casting'
          ? '抛竿…'
          : s === 'waiting'
            ? '等待上钩…'
            : s === 'bite'
              ? '咬钩了!快点击屏幕!'
              : '收竿!';
      progress = this.fishing.getProgress();
    } else if (nearby && this.collect.canCollect(nearby)) {
      progress = this.collect.getHarvestInfo()?.progress ?? null;
      label =
        nearby.kind === 'tree'
          ? '砍树'
          : nearby.kind === 'rock'
            ? '采石'
            : nearby.kind === 'gravel'
              ? '捡碎石'
              : nearby.kind === 'shrub'
                ? '捡树枝'
                : nearby.kind === 'grass'
                  ? '采纤维'
                  : '采浆果';
    } else if (this.water.isActive) {
      label = '喝水';
      progress = this.water.getProgress();
    } else if (this.autoEquipTimer > 0 && !nearby) {
      label = '切换鱼竿…';
      progress = this.autoEquipTimer / 3;
    } else if (nearby) {
      const switching = this.autoEquipTimer > 0;
      label =
        nearby.kind === 'tree'
          ? switching
            ? '切换斧子…'
            : this.tools.axe
              ? '需要手持斧子'
              : '需要斧子'
          : nearby.kind === 'rock'
            ? switching
              ? '切换镐子…'
              : this.tools.pickaxe
                ? '需要手持镐子'
                : '需要镐子'
            : null;
      if (switching) progress = this.autoEquipTimer / 3;
    }
    const p = this.player.group.position;
    this.indicator.group.position.copy(p);
    this.indicator.setProgress(progress);
    this.indicator.setStamina(
      this.player.isSwimming ? this.survival.state.stamina / 100 : null
    );

    // 头顶文字投影为屏幕坐标
    const head = new THREE.Vector3(p.x, p.y + 2.75, p.z).project(this.camera);
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    this.onLabel(
      label,
      Math.round(((head.x + 1) / 2) * w),
      Math.round(((1 - head.y) / 2) * h)
    );
  }
}
