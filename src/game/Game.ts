import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { Player } from './entities/Player';
import { CollectSystem } from './systems/CollectSystem';
import { DayNightSystem } from './systems/DayNightSystem';
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
  stone: number;
  berry: number;
  prompt: string | null;
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
  private survival = new SurvivalSystem();
  private inventory = new Inventory();
  private dayNight: DayNightSystem;
  private onHud: (snap: HudSnapshot) => void;
  private hudTimer = 0;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;

  constructor(container: HTMLElement, onHud: (snap: HudSnapshot) => void) {
    this.container = container;
    this.onHud = onHud;

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
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);

    const terrain = new IslandTerrain();
    this.scene.add(terrain.mesh);
    this.scene.add(new Ocean().mesh);
    const props = new Props(this.scene, terrain);

    this.player = new Player(terrain);
    this.scene.add(this.player.group);

    this.collect = new CollectSystem(this.player, props.list, this.inventory);

    this.dayNight = new DayNightSystem(sun, hemi, this.scene);

    this.loop.add({
      update: (delta, elapsed) => {
        this.player.update(delta, elapsed);
        this.dayNight.update(delta);
        this.survival.drainMultiplier = this.dayNight.isNight ? 1.5 : 1;
        this.survival.update(delta);
        this.collect.update();
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
  }

  setJoystick(x: number, z: number): void {
    this.player.input.setJoystick(x, z);
  }

  action(): void {
    this.collect.tryCollect();
  }

  /** 从背包食用浆果,返回是否成功 */
  eatBerry(): boolean {
    if (!this.inventory.remove('berry')) return false;
    this.survival.eatBerry();
    return true;
  }

  start(): void {
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.resizeObserver.disconnect();
    this.player.dispose();
    this.collect.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private pushHud(delta: number): void {
    this.hudTimer += delta;
    if (this.hudTimer < 0.25) return;
    this.hudTimer = 0;
    const nearby = this.collect.getNearby();
    const prompt = this.survival.state.dead
      ? null
      : nearby
        ? nearby.kind === 'tree'
          ? '砍树'
          : nearby.kind === 'rock'
            ? '采石'
            : '采浆果'
        : null;
    this.onHud({
      ...this.survival.state,
      wood: this.inventory.state.wood,
      stone: this.inventory.state.stone,
      berry: this.inventory.state.berry,
      prompt,
      clock: this.dayNight.state.clock,
      isNight: this.dayNight.isNight,
    });
  }
}
