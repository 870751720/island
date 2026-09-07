import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Wildlife } from '../entities/Wildlife';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Inventory } from './Inventory';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import { AimGuide } from './AimGuide';

/** 投掷范围:范围内有可套的羊才会进入瞄准状态(比羊的警觉半径远,能隔着安全距离出手) */
const RANGE = 6;
/** 甩索瞄准时间(秒):移动瞄准满这段时间后,松手才会掷出 */
const DRAW_TIME = 0.45;
/** 掷出动作时长(秒) */
const THROW_TIME = 0.35;
/** 绳圈飞行速度 */
const ROPE_SPEED = 14;
/** 扫掠命中半径:绳圈飞过路径上距羊不超过该值即套中 */
const HIT_RANGE = 0.9;
/** 瞄准虚线点数与起点间距 */
const AIM_DOTS = 7;
const AIM_START = 1;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 绳圈:环形绳套 + 拖尾绳带,环的轴向朝 +Y,便于用 quaternion 对准飞行方向(环面迎着飞行方向) */
function makeLassoRingModel(): THREE.Group {
  const g = new THREE.Group();
  const mat = clayMaterial('#c9b588');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 5, 12), mat);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.03), mat);
  tail.position.y = -0.45;
  g.add(tail);
  return g;
}

type Rope = {
  group: THREE.Group;
  pos: THREE.Vector3;
  /** 飞行方向(单位向量,XZ 平面) */
  dir: THREE.Vector3;
  /** 剩余射程 */
  left: number;
  /** 上一帧位置,扫掠判定用 */
  prev: THREE.Vector3;
  /** 纯视觉绳圈(他人掷出的表现复现):只飞行,不做命中判定 */
  visual: boolean;
  /** 自转累计角:绳圈边飞边转 */
  spin: number;
};

/**
 * 套索:持套索且范围内有可套的羊时,移动即瞄准——沿摇杆方向显示瞄准虚线,
 * 持续瞄准片刻拉满后松手(松开摇杆/停止移动)掷出绳圈;绳圈沿飞行路径扫掠判定,
 * 套中绵羊即由持绳玩家牵着走(打桩拴住/解开放羊由外层结算)。
 */
export class LassoSystem {
  /** 拉满剩余时间(0 表示已拉满) */
  private drawLeft = DRAW_TIME;
  private aimed = false;
  private aimDir = new THREE.Vector2();
  private throwLock = 0;
  private ropes: Rope[] = [];
  private guide: AimGuide;
  private inputVec = new THREE.Vector2();
  private tmpV = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private terrain: IslandTerrain,
    private inventory: Inventory,
    private wildlife: Wildlife,
    private fx: Particles,
    private audio: GameAudio,
    /** 未命中:套索掉在落点(客人端由外层转成上行动作) */
    private onMiss: (x: number, z: number) => void,
    /** 客人端注入:本地判定命中后上行房主权威结算(置拴绳状态) */
    private onNetHit?: (animalId: number, x: number, z: number) => void,
    /** 掷出瞬间回调(联机广播视觉用):参数为瞄准方向 */
    private onThrow?: (dirX: number, dirZ: number) => void
  ) {
    this.guide = new AimGuide(terrain, RANGE, AIM_DOTS, AIM_START);
    this.scene.add(this.guide.group);
  }

  /** 纯表现更新(他人端):只推进绳圈飞行,不跑本地瞄准/命中逻辑 */
  updateVisuals(delta: number): void {
    this.updateRopes(delta);
  }

  /** 掷出动作期间占用双手(其他系统让位用) */
  get isWorking(): boolean {
    return this.throwLock > 0;
  }

  /** 当前是否处于瞄准状态(虚线可见) */
  get isAiming(): boolean {
    return this.guide.group.visible;
  }

  update(delta: number, busy: boolean): void {
    this.updateRopes(delta);

    if (this.throwLock > 0) {
      this.player.setAction('shoot');
      this.throwLock -= delta;
      if (this.throwLock <= 0) this.player.setAction(null);
      return;
    }

    const canAim =
      !busy &&
      !this.player.isSwimming &&
      this.player.currentTool === 'lasso' &&
      this.inventory.count('lasso') > 0 &&
      this.wildlife.leashedBy(this.player) === null &&
      this.wildlife.nearestSheep(this.player.group.position, RANGE) !== null;
    if (!canAim) {
      this.cancelAim();
      return;
    }

    this.player.input.getVector(this.inputVec);
    const moving = this.inputVec.lengthSq() > 0.001;
    if (moving) {
      // 移动即瞄准:虚线沿摇杆方向,持续瞄准逐渐拉满(与弓一致)
      this.aimDir.set(this.inputVec.x, this.inputVec.y).normalize();
      this.aimed = true;
      this.drawLeft = Math.max(0, this.drawLeft - delta);
      this.guide.show(
        this.player.group.position,
        this.aimDir.x,
        this.aimDir.y,
        1 - this.drawLeft / DRAW_TIME
      );
      return;
    }
    // 站定即收势:拉满松手掷出,没拉满视为取消
    this.guide.hide();
    if (this.aimed && this.drawLeft <= 0) this.release();
    else this.drawLeft = DRAW_TIME;
  }

  private cancelAim(): void {
    this.guide.hide();
    this.drawLeft = DRAW_TIME;
    this.aimed = false;
  }

  /** 掷出:扣一个套索,沿瞄准方向生成飞行绳圈,播甩索动作 */
  private release(): void {
    if (!this.inventory.remove('lasso', 1)) {
      this.cancelAim();
      return;
    }
    this.throwLock = THROW_TIME;
    this.drawLeft = DRAW_TIME;
    this.aimed = false;
    this.audio.play('lassoThrow');
    const group = makeLassoRingModel();
    const p = this.player.group.position;
    this.tmpV.set(p.x, p.y + 1.1, p.z);
    group.position.copy(this.tmpV);
    this.scene.add(group);
    this.ropes.push({
      group,
      pos: this.tmpV.clone(),
      dir: new THREE.Vector3(this.aimDir.x, 0, this.aimDir.y),
      left: RANGE + 0.8,
      prev: this.tmpV.clone(),
      visual: false,
      spin: 0,
    });
    this.onThrow?.(this.aimDir.x, this.aimDir.y);
  }

  /** 复现他人掷出的绳圈:纯视觉飞行,不做命中判定(命中已在掷出端判定、房主结算) */
  netPlayThrow(dirX: number, dirZ: number): void {
    const len = Math.hypot(dirX, dirZ);
    if (len < 0.001) return;
    const group = makeLassoRingModel();
    const p = this.player.group.position;
    this.tmpV.set(p.x, p.y + 1.1, p.z);
    group.position.copy(this.tmpV);
    this.scene.add(group);
    this.ropes.push({
      group,
      pos: this.tmpV.clone(),
      dir: new THREE.Vector3(dirX / len, 0, dirZ / len),
      left: RANGE + 0.8,
      prev: this.tmpV.clone(),
      visual: true,
      spin: 0,
    });
  }

  /** 绳圈飞行:直线平飞,逐帧扫掠判定,套中进入牵引;未命中套索落在落点 */
  private updateRopes(delta: number): void {
    for (let i = this.ropes.length - 1; i >= 0; i--) {
      const rope = this.ropes[i];
      const step = Math.min(ROPE_SPEED * delta, rope.left);
      rope.prev.copy(rope.pos);
      rope.pos.addScaledVector(rope.dir, step);
      rope.left -= step;
      rope.group.position.copy(rope.pos);
      rope.group.quaternion.setFromUnitVectors(this.up, rope.dir);
      rope.spin += delta * 12;
      rope.group.rotateY(rope.spin); // 绳圈边飞边自转

      const hit = rope.visual ? null : this.wildlife.hitSegmentSheep(rope.prev, rope.pos, HIT_RANGE);
      if (hit) {
        this.resolveHit(hit.id, rope, i);
        continue;
      }
      const ground = this.terrain.getHeight(rope.pos.x, rope.pos.z);
      if (rope.left <= 0 || rope.pos.y <= ground) {
        if (!rope.visual) this.onMiss(rope.pos.x, rope.pos.z);
        this.removeRope(rope, i);
      }
    }
  }

  /** 命中结算:客人端只做本地表现并上行,房主/单机端权威把羊交给持绳玩家 */
  private resolveHit(animalId: number, rope: Rope, index: number): void {
    const p = rope.pos;
    this.audio.play('lassoCatch');
    this.fx.burst(p, '#e8e2d4', 8);
    if (this.onNetHit) {
      this.onNetHit(animalId, p.x, p.z);
    } else {
      this.applyHit(animalId, p.x, p.z);
    }
    this.removeRope(rope, index);
  }

  /** 权威结算一次命中:把羊置为被本玩家牵着;目标已被别人套走时套索落在原地 */
  private applyHit(animalId: number, x: number, z: number): void {
    if (!this.wildlife.lassoSheep(animalId, this.player)) this.onMiss(x, z);
  }

  /** 房主收到客人上行命中后的权威结算(表现已在客人端播过;套索在掷出瞬间经 lassoThrow 扣除) */
  settleNetHit(animalId: number, x: number, z: number): void {
    this.applyHit(animalId, x, z);
  }

  private removeRope(rope: Rope, index: number): void {
    this.scene.remove(rope.group);
    this.ropes.splice(index, 1);
  }
}
