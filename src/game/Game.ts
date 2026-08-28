import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { Player, type HandTool } from './entities/Player';
import { CollectSystem } from './systems/CollectSystem';
import { DayNightSystem } from './systems/DayNightSystem';
import { RECIPES, craft, type Tools } from './systems/Crafting';
import { Particles } from './fx/Particles';
import { PlayerIndicator } from './ui3d/PlayerIndicator';
import { Inventory } from './systems/Inventory';
import { SurvivalSystem } from './systems/SurvivalSystem';
import { IslandTerrain } from './world/IslandTerrain';
import { Ocean } from './world/Ocean';
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
  axe: boolean;
  pickaxe: boolean;
  tool: HandTool;
  clock: string;
  isNight: boolean;
};

const VIEW_SIZE = 18;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private loop = new GameLoop();
  private player: Player;
  private collect: CollectSystem;
  private props: Props;
  private fx: Particles;
  private survival = new SurvivalSystem();
  private inventory = new Inventory();
  private tools: Tools = { axe: false, pickaxe: false };
  private dayNight: DayNightSystem;
  private indicator: PlayerIndicator;
  private sun: THREE.DirectionalLight;
  private onHud: (snap: HudSnapshot) => void;
  private onLabel: (label: string | null, x: number, y: number) => void;
  private hudTimer = 0;
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
    this.scene.add(terrain.mesh);
    this.scene.add(new Ocean(Math.max(500, terrain.size * 3)).mesh);
    this.props = new Props(this.scene, terrain);
    this.fx = new Particles(this.scene);

    this.player = new Player(terrain, terrain.findSpawnPoint());
    this.scene.add(this.player.group);
    this.indicator = new PlayerIndicator(this.camera, this.scene);

    // Q 键作为桌面端补充的工具切换
    window.addEventListener('keydown', this.onKeyDown);

    this.collect = new CollectSystem(
      this.player,
      this.props,
      this.inventory,
      this.fx
    );

    this.dayNight = new DayNightSystem(sun, hemi, this.scene);

    this.loop.add({
      update: (delta, elapsed) => {
        this.player.update(delta, elapsed);
        this.dayNight.update(delta);
        this.props.update(delta);
        this.fx.update(delta);
        this.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;
        this.survival.update(delta);
        this.collect.update(delta);
        this.updateIndicator();
        this.updateCamera(delta);
        this.renderer.render(this.scene, this.camera);
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
    const order: HandTool[] = ['hand', 'axe', 'pickaxe'];
    const owned: HandTool[] = order.filter((t) => t === 'hand' || this.tools[t]);
    const next = owned[(owned.indexOf(this.player.currentTool) + 1) % owned.length];
    this.player.setTool(next);
  }

  /** 从背包食用浆果,返回是否成功 */
  eatBerry(): boolean {
    if (!this.inventory.remove('berry')) return false;
    this.survival.eatBerry();
    return true;
  }

  /** 合成工具,返回是否成功 */
  craftTool(id: keyof Tools): boolean {
    const recipe = RECIPES.find((r) => r.id === id);
    return recipe ? craft(recipe, this.inventory, this.tools) : false;
  }

  start(): void {
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    this.player.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private pushHud(delta: number): void {
    this.hudTimer += delta;
    if (this.hudTimer < 0.25) return;
    this.hudTimer = 0;
    this.onHud({
      ...this.survival.state,
      wood: this.inventory.state.wood,
      gravel: this.inventory.state.gravel,
      stone: this.inventory.state.stone,
      berry: this.inventory.state.berry,
      axe: this.tools.axe,
      pickaxe: this.tools.pickaxe,
      tool: this.player.currentTool,
      clock: this.dayNight.state.clock,
      isNight: this.dayNight.isNight,
    });
  }

  /** 玩家头顶的作业提示文字(投影到屏幕坐标,由 React UI 渲染)与进度圆环 */
  private updateIndicator(): void {
    const nearby = this.collect.getNearby();
    let label: string | null = null;
    let progress: number | null = null;
    if (!this.survival.state.dead && nearby) {
      const canAct = this.collect.canCollect();
      label =
        nearby.kind === 'tree'
          ? canAct
            ? '砍树'
            : this.tools.axe
              ? '需要手持斧子'
              : '需要斧子'
          : nearby.kind === 'rock'
            ? canAct
              ? '采石'
              : this.tools.pickaxe
                ? '需要手持镐子'
                : '需要镐子'
            : nearby.kind === 'gravel'
              ? '捡碎石'
              : nearby.kind === 'shrub'
                ? '捡树枝'
                : '采浆果';
      if (canAct) progress = this.collect.getHarvestInfo()?.progress ?? null;
    }
    const p = this.player.group.position;
    this.indicator.group.position.set(p.x, p.y + 2.1, p.z);
    this.indicator.setProgress(progress);

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
