import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { MoveInput } from '../core/MoveInput';
import { IslandTerrain } from '../world/IslandTerrain';
import type { WaterFx } from '../fx/WaterFx';
import type { Footprints } from '../fx/Footprints';
import type { EquipKind, EquipSlot } from '../systems/Equipment';

const MOVE_SPEED = 5;
/** 每走多远留一枚脚印(约一步) */
const STEP_DISTANCE = 0.55;
const SWIM_SPEED = 2.6;
/** 水深超过该值才进入游泳(更浅处涉水,水可漫过裤腿);裤腿高约 0.55 */
const SWIM_DEPTH = 0.6;
const HURT_FLASH_TIME = 0.35;
/** 游泳时身体没入水面的深度 */
const FLOAT_DEPTH = 0.55;
/** 玩家碰撞半径(与树、大石等静态阻挡做圆形推挤) */
const PLAYER_RADIUS = 0.35;

/** 静态阻挡解算器:把实体位置推出有阻挡的物件 */
export interface ObstacleSolver {
  resolveCollision(p: THREE.Vector3, radius: number): void;
}

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

/** 作业动画类型:砍树/凿石/拾取/喝水/钓鱼(抛竿/持竿) */
export type ActionType =
  | 'chop'
  | 'mine'
  | 'pick'
  | 'drink'
  | 'craft'
  | 'cook'
  | 'eat_berry'
  | 'eat_fish'
  | 'cast'
  | 'fish'
  | 'shoot'
  | 'sleep';

/** 手持工具:空手/斧子/镐子/锄头/鱼竿/弓/种子(用于播种) */
export type HandTool =
  | 'hand'
  | 'axe'
  | 'pickaxe'
  | 'hoe'
  | 'fishingrod'
  | 'bow'
  | 'seed';

function makeFishingRodModel(): THREE.Group {
  // 鱼竿:细长树枝;竿梢挂一个空锚点,钓鱼时钓线从竿梢连到浮漂
  const g = new THREE.Group();
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 0.85, 5),
    clayMaterial('#8a6239')
  );
  const tip = new THREE.Object3D();
  tip.position.y = 0.42;
  g.add(rod, tip);
  g.userData.tip = tip;
  g.rotation.x = Math.PI / 2.4;
  return g;
}

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

function makeBowModel(): THREE.Group {
  // 弓:细杆弯成弓形(用弧形排布的短柱近似)+ 一根弓弦
  const g = new THREE.Group();
  const wood = clayMaterial('#8a6239');
  const segments = 7;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 4), wood);
    seg.position.set(0, (t - 0.5) * 0.78, Math.sin(t * Math.PI) * 0.1 - 0.1);
    seg.rotation.x = -Math.cos(t * Math.PI) * 0.5;
    g.add(seg);
  }
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.78, 3),
    new THREE.MeshBasicMaterial({ color: '#f5f2e8' })
  );
  string.position.set(0, 0, -0.1);
  g.add(string);
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

/** 锄头:木柄 + 宽扁石刃,握在右手 */
function makeHoeModel(): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.62, 5),
    clayMaterial('#8a6239')
  );
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.14), clayMaterial('#8a8266'));
  blade.position.set(0.05, 0.28, 0.08);
  blade.rotation.z = 0.35;
  g.add(handle, blade);
  g.rotation.x = Math.PI / 2.4;
  return g;
}

/** 种子袋:小布袋装着几粒种子,握在右手 */
function makeSeedPouchModel(): THREE.Group {
  const g = new THREE.Group();
  const pouch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.05, 0.14, 6),
    clayMaterial('#c9a15c')
  );
  const seedMat = clayMaterial('#8a6b45');
  const seed1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), seedMat);
  seed1.position.set(0.04, 0.09, 0.02);
  const seed2 = seed1.clone();
  seed2.position.set(-0.03, 0.09, -0.02);
  g.add(pouch, seed1, seed2);
  return g;
}

const SKIN_COLOR = '#e8b88a';
/** 未穿裤子时的腿部颜色:深棕色平角裤,避免整条腿都是肤色显得发黄 */
const BARE_LEG_COLOR = '#5b4632';

/** 衣服/裤子装备对应的身体颜色(帽子/背包用真实模型,不在此列) */
const EQUIP_COLORS: Partial<Record<EquipKind, string>> = {
  grassShirt: '#5a8a3a',
  furShirt: '#8a6239',
  grassPants: '#4a7a3a',
  furPants: '#75512c',
};

/** 草帽:宽檐圆顶帽 */
function makeStrawHatModel(): THREE.Group {
  const g = new THREE.Group();
  const mat = clayMaterial('#d9c27a');
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.04, 8), mat);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.14, 8), mat);
  top.position.y = 0.09;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 4, 8), clayMaterial('#a8823c'));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.05;
  g.add(brim, top, band);
  return g;
}

/** 皮帽:一圈圈盘出的无檐圆帽 */
function makeFurHatModel(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2 - i * 0.05, 0.045, 4, 8),
      clayMaterial(i % 2 === 0 ? '#9a7448' : '#b08a5a')
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03 + i * 0.055;
    g.add(ring);
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), clayMaterial('#9a7448'));
  dome.position.y = 0.19;
  g.add(dome);
  return g;
}

/** 草编背包:圆筒草筐 + 两根背带 */
function makeStrawBackpackModel(): THREE.Group {
  const g = new THREE.Group();
  const mat = clayMaterial('#c9a56a');
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 7), mat);
  for (const y of [-0.12, 0, 0.12, 0.24]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.185 - Math.max(0, y) * 0.2, 0.02, 4, 7), clayMaterial('#a8823c'));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  const strapMat = clayMaterial('#8a6b45');
  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.03), strapMat);
  strapL.position.set(-0.1, 0.1, 0.2);
  const strapR = strapL.clone();
  strapR.position.x = 0.1;
  g.add(basket, strapL, strapR);
  return g;
}

/** 皮包:木框上架一个皮料背囊 */
function makeFurBackpackModel(): THREE.Group {
  const g = new THREE.Group();
  const wood = clayMaterial('#8a6239');
  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), wood);
  railL.position.set(-0.16, 0.05, 0.02);
  const railR = railL.clone();
  railR.position.x = 0.16;
  const crossTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.04), wood);
  crossTop.position.y = 0.3;
  const crossBottom = crossTop.clone();
  crossBottom.position.y = -0.2;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.16), clayMaterial('#9a7448'));
  pack.position.set(0, 0.05, -0.06);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.36, 6), clayMaterial('#c9a877'));
  roll.rotation.z = Math.PI / 2;
  roll.position.y = 0.33;
  g.add(railL, railR, crossTop, crossBottom, pack, roll);
  return g;
}

/** 程序拼装的低多边形小人 + 运行时走路/作业动画 */
export class Player implements Updatable {
  readonly group = new THREE.Group();
  readonly input = new MoveInput();
  private terrain: IslandTerrain;
  private limbs: { mesh: THREE.Mesh; phase: number }[] = [];
  private arms: THREE.Mesh[] = [];
  private legs: THREE.Mesh[] = [];
  private moveVec = new THREE.Vector2();
  private moving = false;
  private stepDistance = 0;
  private stepLeft = false;
  private swimming = false;
  private wading = false;
  private action: ActionType | null = null;
  private hurtFlash = 0;
  private handTool: HandTool = 'hand';
  private toolModels: Partial<Record<Exclude<HandTool, 'hand'>, THREE.Group>> = {};
  private obstacles: ObstacleSolver[] = [];
  /** 躺床睡觉的目标姿态(非空表示睡着:位置/朝向由睡眠姿态接管) */
  private sleepPose: { pos: THREE.Vector3; rotY: number; returnPos: THREE.Vector3 } | null = null;
  /** 衣服/裤子各占一个独立材质,装备时改色 */
  private torsoMaterial!: THREE.MeshStandardMaterial;
  private legMaterial!: THREE.MeshStandardMaterial;
  private hatModels: Partial<Record<EquipKind, THREE.Group>> = {};
  private backpackModels: Partial<Record<EquipKind, THREE.Group>> = {};

  /** 注入静态阻挡(树、大石、围栏等),移动时被推出不可穿越的物件 */
  setObstacles(...obstacles: ObstacleSolver[]): void {
    this.obstacles = obstacles;
  }

  constructor(
    terrain: IslandTerrain,
    spawn: THREE.Vector3,
    private waterFx: WaterFx,
    private footprints: Footprints
  ) {
    this.terrain = terrain;

    // 默认上身赤裸(肉色躯干),下身是深色平角裤,穿上衣服/裤子后换色
    const skin = clayMaterial(SKIN_COLOR);
    this.torsoMaterial = clayMaterial(SKIN_COLOR);
    this.legMaterial = clayMaterial(BARE_LEG_COLOR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.28), this.torsoMaterial);
    torso.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.32), skin);
    head.position.y = 1.32;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), clayMaterial('#4a3220'));
    hair.position.y = 1.5;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.13), skin);
    armL.position.set(-0.31, 0.85, 0);
    const armR = armL.clone();
    armR.position.x = 0.31;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), this.legMaterial);
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
    this.legs = [legL, legR];

    // 工具握在右手(armR)末端
    const axe = makeAxeModel();
    const pickaxe = makePickaxeModel();
    const hoe = makeHoeModel();
    const fishingrod = makeFishingRodModel();
    const bow = makeBowModel();
    const seed = makeSeedPouchModel();
    for (const t of [axe, pickaxe, hoe, fishingrod, bow, seed]) {
      t.position.set(0, -0.3, 0.05);
      t.visible = false;
    }
    armR.add(axe, pickaxe, hoe, fishingrod, bow, seed);
    this.toolModels = { axe, pickaxe, hoe, fishingrod, bow, seed };

    // 帽子戴在头顶,背包背在背后,装备前不显示
    const strawHat = makeStrawHatModel();
    strawHat.position.y = 0.18;
    strawHat.visible = false;
    const furHat = makeFurHatModel();
    furHat.position.y = 0.18;
    furHat.visible = false;
    head.add(strawHat, furHat);
    this.hatModels = { strawHat, furHat };

    const strawBackpack = makeStrawBackpackModel();
    strawBackpack.position.set(0, 0.82, -0.28);
    strawBackpack.visible = false;
    const furBackpack = makeFurBackpackModel();
    furBackpack.position.set(0, 0.88, -0.34);
    furBackpack.visible = false;
    this.group.add(strawBackpack, furBackpack);
    this.backpackModels = { strawBackpack, furBackpack };

    // 先绕世界 Y 轴朝向,再前倾,游泳时转向才正确
    this.group.rotation.order = 'YXZ';
    this.group.position.copy(spawn);
  }

  get isMoving(): boolean {
    return this.moving;
  }

  get isSwimming(): boolean {
    return this.swimming;
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

  /** 更新装备外观:衣服/裤子换色,帽子/背包显隐对应模型(kind 为空表示卸下) */
  setEquip(slot: EquipSlot, kind: EquipKind | null): void {
    if (slot === 'clothing') {
      this.torsoMaterial.color.set(kind ? EQUIP_COLORS[kind] ?? SKIN_COLOR : SKIN_COLOR);
    } else if (slot === 'pants') {
      this.legMaterial.color.set(kind ? EQUIP_COLORS[kind] ?? BARE_LEG_COLOR : BARE_LEG_COLOR);
    } else {
      const models = slot === 'hat' ? this.hatModels : this.backpackModels;
      for (const [name, model] of Object.entries(models)) {
        model!.visible = name === kind;
      }
    }
  }

  /** 手持鱼竿时取竿梢世界坐标(钓线起点),未持竿返回 false */
  getRodTip(out: THREE.Vector3): boolean {
    const rod = this.toolModels.fishingrod;
    if (!rod || this.handTool !== 'fishingrod') return false;
    (rod.userData.tip as THREE.Object3D).getWorldPosition(out);
    return true;
  }

  setAction(action: ActionType | null): void {
    this.action = action;
  }

  get isSleeping(): boolean {
    return this.sleepPose !== null;
  }

  /** 躺到床上睡(pos 为脚跟落点、rotY 为躺平朝向),起身时回到原位 */
  setSleeping(pos: THREE.Vector3, rotY: number): void {
    this.sleepPose = { pos: pos.clone(), rotY, returnPos: this.group.position.clone() };
    this.action = null;
    this.group.rotation.y = rotY;
    for (const model of Object.values(this.toolModels)) model!.visible = false;
  }

  /** 起床:回到入睡前的站位并站直 */
  wakeUp(): void {
    if (!this.sleepPose) return;
    this.group.position.copy(this.sleepPose.returnPos);
    this.group.rotation.x = 0;
    this.sleepPose = null;
  }

  /** 受击反馈:模型短暂泛红(通过 emissive 衰减实现) */
  hurt(): void {
    this.hurtFlash = HURT_FLASH_TIME;
  }

  update(delta: number, elapsed: number): void {
    // 受击泛红:每帧按剩余时间衰减,结束后归零还原
    if (this.hurtFlash > 0) {
      this.hurtFlash = Math.max(0, this.hurtFlash - delta);
      const k = this.hurtFlash / HURT_FLASH_TIME;
      this.group.traverse((o) => {
        const mat = (o as THREE.Mesh).material;
        if (mat instanceof THREE.MeshStandardMaterial) mat.emissive.setRGB(0.9 * k, 0.05 * k, 0.03 * k);
      });
    }
    if (this.sleepPose) {
      this.updateSleep(delta, elapsed);
      return;
    }
    this.input.getVector(this.moveVec);
    this.moving = this.moveVec.lengthSq() > 0.001;

    const p = this.group.position;
    const groundY = this.terrain.getHeight(p.x, p.z);
    const waterY = this.terrain.getWaterLevel(p.x, p.z);
    const wasSwimming = this.swimming;
    this.swimming = groundY < waterY - SWIM_DEPTH;
    if (this.swimming !== wasSwimming) this.waterFx.splash(p);
    // 涉水:已进到水里但还没到游泳深度
    const wasWading = this.wading;
    this.wading = !this.swimming && groundY < waterY - 0.1;
    if (this.wading !== wasWading) this.waterFx.splash(p);

    if (this.moving) {
      const len = this.moveVec.length();
      const speed = this.swimming ? SWIM_SPEED : MOVE_SPEED;
      const step = speed * delta;
      p.x += (this.moveVec.x / len) * step;
      p.z += (this.moveVec.y / len) * step;
      const half = this.terrain.size / 2 - 1;
      p.x = THREE.MathUtils.clamp(p.x, -half, half);
      p.z = THREE.MathUtils.clamp(p.z, -half, half);
      // 静态阻挡:被推出树、大石等不可穿越的物件(游泳时不管)
      if (!this.swimming) for (const o of this.obstacles) o.resolveCollision(p, PLAYER_RADIUS);
      this.group.rotation.y = Math.atan2(this.moveVec.x, this.moveVec.y);
      // 陆地上行走按步距交替留脚印,水中不留
      if (!this.swimming && !this.wading) {
        this.stepDistance += step;
        if (this.stepDistance >= STEP_DISTANCE) {
          this.stepDistance = 0;
          this.stepLeft = !this.stepLeft;
          this.footprints.step(p.x, p.z, this.group.rotation.y, this.stepLeft);
        }
      }
    } else {
      this.stepDistance = 0;
    }

    // 游泳时贴着水面漂浮,露出上半身;岸上贴地
    p.y = this.swimming ? waterY - FLOAT_DEPTH : this.terrain.getHeight(p.x, p.z);

    if (this.swimming) {
      this.animateSwim(elapsed);
      this.waterFx.updateSwimming(delta, p, 0.4, waterY);
      // 游泳时收起工具,避免抡着斧子划水
      for (const model of Object.values(this.toolModels)) model!.visible = false;
    } else {
      // 涉水移动时脚下泛涟漪
      if (this.wading && this.moving) this.waterFx.updateSwimming(delta, p, 0.55, waterY);
      for (const [name, model] of Object.entries(this.toolModels)) {
        model!.visible = name === this.handTool;
      }
      if (this.action && !this.moving) {
        this.animateAction(elapsed);
      } else {
        this.group.rotation.x = 0;
        // 运行时走路动画:四肢绕根关节摆动
        const swing = this.moving ? 0.7 : 0;
        for (const limb of this.limbs) {
          limb.mesh.rotation.x = Math.sin(elapsed * 10 + limb.phase) * swing;
          limb.mesh.rotation.z = 0;
        }
      }
    }
  }

  /** 睡眠姿态:慢慢挪上床躺平,四肢放松,随呼吸轻微起伏;睡下后输入被忽略,直到睡满 */
  private updateSleep(delta: number, elapsed: number): void {
    this.moving = false;
    const pose = this.sleepPose!;
    const k = 1 - Math.pow(0.002, delta);
    this.group.position.lerp(pose.pos, k);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -Math.PI / 2, k);
    // 放松的躺姿:双臂微张随呼吸轻摆,双腿伸直
    for (const [i, arm] of this.arms.entries()) {
      arm.rotation.x = -0.15 + Math.sin(elapsed * 1.6 + i * Math.PI) * 0.05;
      arm.rotation.z = 0.18 + i * 0.06;
    }
    for (const leg of this.legs) {
      leg.rotation.x = 0;
      leg.rotation.z = 0;
    }
    // 呼吸起伏:身体轻轻抬落
    this.group.position.y = pose.pos.y + Math.sin(elapsed * 1.6) * 0.02;
  }

  /** 游泳动画:身体前倾躺水面,双臂轮转划水,双腿交替打水,随浪轻微起伏 */
  private animateSwim(elapsed: number): void {
    this.group.rotation.x = 1.15 + Math.sin(elapsed * 1.6) * 0.06;
    this.group.position.y += Math.sin(elapsed * 2) * 0.04;
    // 双臂连续轮转划水,相位相反
    this.arms[0].rotation.x = elapsed * 5;
    this.arms[1].rotation.x = elapsed * 5 + Math.PI;
    // 双腿高频小幅打水
    this.legs[0].rotation.x = Math.sin(elapsed * 12) * 0.45;
    this.legs[1].rotation.x = Math.sin(elapsed * 12 + Math.PI) * 0.45;
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
      case 'craft': {
        // 微弯腰,双臂交替上下敲打
        this.group.rotation.x = 0.12;
        const s = Math.sin(t * 1.5);
        this.arms[1].rotation.x = s * 1.1 - 1.1;
        this.arms[0].rotation.x = -s * 0.6 - 0.5;
        break;
      }
      case 'cook': {
        // 面向火堆翻炒:身体前倾,双臂前伸交替画圈拨动
        this.group.rotation.x = 0.22;
        const s = Math.sin(t);
        this.arms[0].rotation.x = -1.5 + s * 0.5;
        this.arms[0].rotation.z = s * 0.3;
        this.arms[1].rotation.x = -1.5 - s * 0.5;
        this.arms[1].rotation.z = -s * 0.3;
        break;
      }
      case 'cast': {
        // 抛竿:右臂从身后高位向前下方挥出,身体随挥动前倾
        this.group.rotation.x = 0.15;
        this.arms[1].rotation.x = -2.6 + (Math.sin(t * 0.9) + 1) * 1.0;
        this.arms[0].rotation.x = -0.3;
        break;
      }
      case 'fish': {
        // 钓鱼:身体微前倾,右臂持竿前伸,竿尖随水轻晃
        this.group.rotation.x = 0.1;
        this.arms[1].rotation.x = -1.5 + Math.sin(t * 0.4) * 0.05;
        this.arms[0].rotation.x = -0.2;
        break;
      }
      case 'shoot': {
        // 开弓放箭:左臂前伸持弓,右臂拉弦到脸颊后猛地松开
        this.group.rotation.x = 0.05;
        this.arms[0].rotation.x = -1.55;
        const draw = Math.sin(t * 6);
        this.arms[1].rotation.x = -1.55 + draw * 0.35;
        this.arms[1].rotation.z = draw * 0.25;
        break;
      }
      case 'eat_berry': {
        // 右手捏着浆果送到嘴边,身体随咀嚼微微起伏
        this.group.rotation.x = 0.05 + Math.sin(t * 3) * 0.04;
        this.arms[1].rotation.x = -2.0 + Math.sin(t * 1.5) * 0.15;
        this.arms[0].rotation.x = -0.3;
        break;
      }
      case 'eat_fish': {
        // 双手捧着鱼大口啃食,身体前倾随咀嚼起伏
        this.group.rotation.x = 0.12 + Math.sin(t * 3) * 0.05;
        this.arms[0].rotation.x = -1.9 + Math.sin(t * 1.5) * 0.2;
        this.arms[1].rotation.x = -1.7 - Math.sin(t * 1.5) * 0.2;
        break;
      }
    }
  }

  dispose(): void {
    this.input.dispose();
  }
}
