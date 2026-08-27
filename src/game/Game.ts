import * as THREE from 'three';
import { GameLoop } from './core/GameLoop';
import { Player } from './entities/Player';
import { CollectSystem } from './systems/CollectSystem';
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
};

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private loop = new GameLoop();
  private terrain: IslandTerrain;
  private props: Props;
  private player: Player;
  private survival = new SurvivalSystem();
  private inventory = new Inventory();
  private collect: CollectSystem;
  private onHud: (snap: HudSnapshot) => void;
  private hudTimer = 0;

  constructor(container: HTMLElement, onHud: (snap: HudSnapshot) => void) {
    this.onHud = onHud;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // 正交相机从斜上方观察,2.5D 视角
    const aspect = container.clientWidth / container.clientHeight;
    const viewSize = 18;
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      -100,
      200
    );
    this.camera.position.set(20, 24, 20);
    this.camera.lookAt(0, 0, 0);

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
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);

    this.terrain = new IslandTerrain();
    this.scene.add(this.terrain.mesh);
    this.scene.add(new Ocean().mesh);
    this.props = new Props(this.scene, this.terrain);

    this.player = new Player(this.terrain);
    this.scene.add(this.player.group);

    this.collect = new CollectSystem(
      this.player,
      this.props.list,
      this.inventory,
      this.survival
    );

    this.loop.add({
      update: (delta, elapsed) => {
        this.player.update(delta, elapsed);
        this.survival.update(delta);
        this.collect.update();
        this.renderer.render(this.scene, this.camera);
        this.pushHud(delta);
      },
    });
  }

  start(): void {
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
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
          ? '按 E 砍树'
          : nearby.kind === 'rock'
            ? '按 E 采石'
            : '按 E 采浆果(食用)'
        : null;
    this.onHud({
      ...this.survival.state,
      wood: this.inventory.state.wood,
      stone: this.inventory.state.stone,
      berry: this.inventory.state.berry,
      prompt,
    });
  }
}
