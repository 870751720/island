import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { MoveInput } from '../core/MoveInput';
import { IslandTerrain } from '../world/IslandTerrain';

const MOVE_SPEED = 5;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

/** 作业动画类型:砍树/凿石/拾取/喝水 */
export type ActionType = 'chop' | 'mine' | 'pick' | 'drink';

/** 手持工具:空手/斧子/镐子 */
export type HandTool = 'hand' | 'axe' | 'pickaxe';

function makeAxeModel(): THREE.Group {
  // 斧柄 + 斧刃,握在右手
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5),
    clayMaterial('#8a6239')
  );
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.16), clayMaterial('#9a9a9a'));
  blade.position.set(0, 0.26, 0.1);
  g.add(handle, blade);
  g.rotation.x = Math.PI / 2.4;
  return g;
}

function makePickaxeModel(): THREE.Group {
  // 镐柄 + 弧形镐尖
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5),
    clayMaterial('#8a6239')
  );
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.5), clayMaterial('#8a8a8a'));
  head.position.y = 0.27;
  const tipL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), clayMaterial('#8a8a8a'));
  tipL.rotation.z = Math.PI / 2;
  tipL.position.set(0, 0.27, -0.3);
  const tipR = tipL.clone();
  tipR.rotation.z = -Math.PI / 2;
  tipR.position.z = 0.3;
  g.add(handle, head, tipL, tipR);
  g.rotation.x = Math.PI / 2.4;
  return g;
}

/** 程序拼装的低多边形小人 + 运行时走路/作业动画 */
export class Player implements Updatable {
  readonly group = new THREE.Group();
  readonly input = new MoveInput();
  private terrain: IslandTerrain;
  private limbs: { mesh: THREE.Mesh; phase: number }[] = [];
  private arms: THREE.Mesh[] = [];
  private moveVec = new THREE.Vector2();
  private moving = false;
  private action: ActionType | null = null;
  private handTool: HandTool = 'hand';
  private toolModels: Partial<Record<Exclude<HandTool, 'hand'>, THREE.Group>> = {};

  constructor(terrain: IslandTerrain, spawn: THREE.Vector3) {
    this.terrain = terrain;

    const skin = clayMaterial('#e8b88a');
    const shirt = clayMaterial('#4a7fb5');
    const pants = clayMaterial('#5b4632');

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.28), shirt);
    torso.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.32), skin);
    head.position.y = 1.32;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), clayMaterial('#4a3220'));
    hair.position.y = 1.5;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.13), skin);
    armL.position.set(-0.31, 0.85, 0);
    const armR = armL.clone();
    armR.position.x = 0.31;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), pants);
    legL.position.set(-0.12, 0.3, 0);
    const legR = legL.clone();
    legR.position.x = 0.12;

    for (const m of [torso, head, armL, armR, legL, legR]) {
      m.castShadow = true;
      this.group.add(m);
    }
    this.limbs = [
      { mesh: armL, phase: 0 },
      { mesh: armR, phase: Math.PI },
      { mesh: legL, phase: Math.PI },
      { mesh: legR, phase: 0 },
    ];
    this.arms = [armL, armR];

    // 工具握在右手(armR)末端
    const axe = makeAxeModel();
    const pickaxe = makePickaxeModel();
    axe.position.set(0, -0.3, 0.05);
    pickaxe.position.set(0, -0.3, 0.05);
    axe.visible = false;
    pickaxe.visible = false;
    armR.add(axe, pickaxe);
    this.toolModels = { axe, pickaxe };

    this.group.position.copy(spawn);
  }

  get isMoving(): boolean {
    return this.moving;
  }

  get currentTool(): HandTool {
    return this.handTool;
  }

  /** 切换手持工具(仅视觉,不影响采集资格) */
  setTool(tool: HandTool): void {
    this.handTool = tool;
    for (const [name, model] of Object.entries(this.toolModels)) {
      model!.visible = name === tool;
    }
  }

  setAction(action: ActionType | null): void {
    this.action = action;
  }

  update(delta: number, elapsed: number): void {
    this.input.getVector(this.moveVec);
    this.moving = this.moveVec.lengthSq() > 0.001;
    if (this.moving) {
      const len = this.moveVec.length();
      const p = this.group.position;
      p.x += (this.moveVec.x / len) * MOVE_SPEED * delta;
      p.z += (this.moveVec.y / len) * MOVE_SPEED * delta;
      const half = this.terrain.size / 2 - 1;
      p.x = THREE.MathUtils.clamp(p.x, -half, half);
      p.z = THREE.MathUtils.clamp(p.z, -half, half);
      p.y = this.terrain.getHeight(p.x, p.z);
      this.group.rotation.y = Math.atan2(this.moveVec.x, this.moveVec.y);
    }

    if (this.action && !this.moving) {
      this.animateAction(elapsed);
    } else {
      this.group.rotation.x = 0;
      // 运行时走路动画:四肢绕根关节摆动
      const swing = this.moving ? 0.7 : 0;
      for (const limb of this.limbs) {
        limb.mesh.rotation.x = Math.sin(elapsed * 10 + limb.phase) * swing;
      }
    }
  }

  /** 作业动画:砍树双臂抡、凿石单臂凿、拾取弯腰快速扒 */
  private animateAction(elapsed: number): void {
    const t = elapsed * 8;
    switch (this.action) {
      case 'chop': {
        // 双臂同步高举下劈
        const angle = Math.sin(t) * 1.4 - 1.8;
        for (const arm of this.arms) arm.rotation.x = angle;
        break;
      }
      case 'mine': {
        // 右臂高频短促凿击
        this.arms[1].rotation.x = Math.sin(t * 1.5) * 0.9 - 0.6;
        this.arms[0].rotation.x = -0.3;
        break;
      }
      case 'pick': {
        // 身体前倾小幅上下扒动
        this.group.rotation.x = Math.sin(t * 2) * 0.08;
        for (const arm of this.arms) arm.rotation.x = -1.2 + Math.sin(t * 2) * 0.4;
        break;
      }
      case 'drink': {
        // 双手捧到嘴边,身体微微后仰
        this.group.rotation.x = -0.05;
        for (const arm of this.arms) arm.rotation.x = -2.2 + Math.sin(t) * 0.1;
        break;
      }
    }
  }

  dispose(): void {
    this.input.dispose();
  }
}
