import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Crabs } from '../entities/Crab';
import type { Birds } from '../entities/Birds';
import type { Wildlife } from '../entities/Wildlife';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Inventory, ResourceKind } from './Inventory';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';
import type { Tools } from './Crafting';

/** 攻击范围:范围内有猎物才会进入瞄准状态 */
const RANGE = 9;
/** 每支箭对野生动物的伤害(精致弓更高) */
const ARROW_DAMAGE = 1;
const REFINED_ARROW_DAMAGE = 2;
/** 开弓瞄准时间(秒):移动瞄准满这段时间后,松手才会放箭 */
const DRAW_TIME = 0.45;
/** 放箭动作时长(秒):播完即可重新开弓,没有额外冷却 */
const SHOT_TIME = 0.35;
/** 箭矢飞行速度 */
const ARROW_SPEED = 18;
/** 扫掠命中半径:箭矢飞过路径上距目标不超过该值即命中 */
const HIT_RANGE = 0.9;
/** 命中箭插在地上多久后消失(秒) */
const STICK_TIME = 6;
/** 瞄准虚线的点数与起点间距 */
const AIM_DOTS = 9;
const AIM_START = 1;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

/** 箭:细木杆 + 石箭头 + 尾羽,箭尖朝 +Y 便于用 quaternion 对准飞行方向 */
function makeArrowModel(): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.55, 4),
    clayMaterial('#a97c50')
  );
  g.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), clayMaterial('#8a8a95'));
  head.position.y = 0.3;
  g.add(head);
  const feather = clayMaterial('#e8e2d4');
  for (const side of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.06), feather);
    f.position.set(side * 0.02, -0.22, 0);
    f.rotation.z = side * 0.3;
    g.add(f);
  }
  return g;
}

/** 一次命中判定结果:客人端上行给房主权威结算用 */
export type ArrowHit =
  | { kind: 'wildlife'; animalId: number }
  | { kind: 'crab' }
  | { kind: 'bird' };

/** 瞄准虚线:沿瞄准方向的一串圆点,随拉弓进度逐渐向外延伸 */
class AimGuide {
  readonly group = new THREE.Group();
  private dots: THREE.Mesh[] = [];

  constructor(private terrain: IslandTerrain) {
    const geo = new THREE.SphereGeometry(0.09, 6, 4);
    const mat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.85 });
    for (let i = 0; i < AIM_DOTS; i++) {
      const dot = new THREE.Mesh(geo, mat);
      dot.visible = false;
      this.dots.push(dot);
      this.group.add(dot);
    }
    this.group.visible = false;
  }

  /** 显示:origin 为射手位置,progress∈(0,1] 为拉弓进度,决定点数 */
  show(origin: THREE.Vector3, dirX: number, dirZ: number, progress: number): void {
    this.group.visible = true;
    const count = Math.max(1, Math.round(progress * AIM_DOTS));
    const step = (RANGE - AIM_START) / (AIM_DOTS - 1);
    for (let i = 0; i < AIM_DOTS; i++) {
      const dot = this.dots[i];
      if (i >= count) {
        dot.visible = false;
        continue;
      }
      const d = AIM_START + step * i;
      const x = origin.x + dirX * d;
      const z = origin.z + dirZ * d;
      dot.visible = true;
      dot.position.set(x, this.terrain.getHeight(x, z) + 0.3, z);
      // 越靠前(越接近拉满)的点越亮越大
      const k = (i + 1) / AIM_DOTS;
      dot.scale.setScalar(0.7 + k * 0.6);
    }
  }

  hide(): void {
    this.group.visible = false;
  }
}

type Arrow = {
  group: THREE.Group;
  pos: THREE.Vector3;
  /** 飞行方向(单位向量,XZ 平面) */
  dir: THREE.Vector3;
  /** 剩余射程 */
  left: number;
  /** 上一帧位置,扫掠判定用 */
  prev: THREE.Vector3;
  /** 纯视觉箭(他人射出的表现复现):只飞行插地,不做命中判定 */
  visual: boolean;
  /** 命中目标未杀死(生物已移动)时插在地上等消失 */
  stuck: number;
};

/**
 * 弓箭:持弓且攻击范围内有猎物时,移动即开弓——沿摇杆方向显示瞄准虚线,
 * 持续瞄准片刻拉满后松手(松开摇杆/停止移动)放箭;箭沿飞行路径扫掠判定命中。
 * 站定不瞄、没有目标不开弓,误射风险由玩家持弓自行承担。
 */
export class BowSystem {
  /** 拉弓剩余时间(0 表示已拉满) */
  private drawLeft = DRAW_TIME;
  /** 已获得瞄准方向(移动瞄准过) */
  private aimed = false;
  private aimDir = new THREE.Vector2();
  private shotLock = 0;
  private arrows: Arrow[] = [];
  private guide: AimGuide;
  private inputVec = new THREE.Vector2();
  private tmpV = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private terrain: IslandTerrain,
    private inventory: Inventory,
    private crabs: Crabs,
    private birds: Birds,
    private wildlife: Wildlife,
    private fx: Particles,
    private audio: GameAudio,
    private tools: Tools,
    /** 击杀掉落战利品(在击杀位置附近散落多种道具) */
    private onLoot: (
      items: { kind: ResourceKind; count: number }[],
      x: number,
      z: number
    ) => void,
    /** 客人端注入:本地判定命中后上行房主权威结算(扣箭/伤害/掉落) */
    private onNetHit?: (hit: ArrowHit, x: number, z: number) => void,
    /** 放箭瞬间回调(联机广播用):参数为瞄准方向与出手点 */
    private onShot?: (dirX: number, dirZ: number) => void
  ) {
    this.guide = new AimGuide(terrain);
    this.scene.add(this.guide.group);
  }

  /** 纯表现更新(他人端):只推进箭矢飞行与插地消失,不跑本地瞄准/命中逻辑 */
  updateVisuals(delta: number): void {
    this.updateArrows(delta);
  }

  /** 放箭动作期间占用双手(其他系统让位用) */
  get isWorking(): boolean {
    return this.shotLock > 0;
  }

  /** 当前是否处于瞄准状态(虚线可见) */
  get isAiming(): boolean {
    return this.guide.group.visible;
  }

  update(delta: number, busy: boolean): void {
    this.updateArrows(delta);

    if (this.shotLock > 0) {
      this.player.setAction('shoot');
      this.shotLock -= delta;
      if (this.shotLock <= 0) this.player.setAction(null);
      return;
    }

    const canAim =
      !busy &&
      !this.player.isSwimming &&
      this.player.currentTool === 'bow' &&
      this.inventory.count('arrow') > 0 &&
      this.findTarget() !== null;
    if (!canAim) {
      this.cancelAim();
      return;
    }

    this.player.input.getVector(this.inputVec);
    const moving = this.inputVec.lengthSq() > 0.001;
    if (moving) {
      // 移动即瞄准:虚线沿摇杆方向(360° 自由),持续瞄准逐渐拉满
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
    // 站定即收弓:拉满松手放箭,没拉满视为取消
    this.guide.hide();
    if (this.aimed && this.drawLeft <= 0) this.release();
    else this.drawLeft = DRAW_TIME;
  }

  /** 攻击范围内最近的活螃蟹/活鸟/野生动物(蝴蝶不可射) */
  private findTarget(): THREE.Vector3 | null {
    const p = this.player.group.position;
    const candidates = [
      this.crabs.nearestAlive(p, RANGE),
      this.birds.nearestAlive(p, RANGE),
      this.wildlife.nearestAlive(p, RANGE),
    ].filter((v): v is THREE.Vector3 => !!v);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, v) => (v.distanceToSquared(p) < best.distanceToSquared(p) ? v : best));
  }

  private cancelAim(): void {
    this.guide.hide();
    this.drawLeft = DRAW_TIME;
    this.aimed = false;
  }

  /** 放箭:扣一支箭,沿瞄准方向生成飞行箭矢,播放箭动作 */
  private release(): void {
    if (!this.inventory.remove('arrow', 1)) {
      this.cancelAim();
      return;
    }
    this.shotLock = SHOT_TIME;
    this.drawLeft = DRAW_TIME;
    this.aimed = false;
    this.audio.play('shoot');
    const group = makeArrowModel();
    const p = this.player.group.position;
    this.tmpV.set(p.x, p.y + 1.1, p.z);
    group.position.copy(this.tmpV);
    this.scene.add(group);
    this.arrows.push({
      group,
      pos: this.tmpV.clone(),
      dir: new THREE.Vector3(this.aimDir.x, 0, this.aimDir.y),
      left: RANGE + 0.8,
      prev: this.tmpV.clone(),
      visual: false,
      stuck: 0,
    });
    this.onShot?.(this.aimDir.x, this.aimDir.y);
  }

  /** 复现他人射出的箭:纯视觉飞行插地,不做命中判定(命中已在射手端判定、房主结算) */
  netPlayShot(dirX: number, dirZ: number): void {
    const len = Math.hypot(dirX, dirZ);
    if (len < 0.001) return;
    const group = makeArrowModel();
    const p = this.player.group.position;
    this.tmpV.set(p.x, p.y + 1.1, p.z);
    group.position.copy(this.tmpV);
    this.scene.add(group);
    this.arrows.push({
      group,
      pos: this.tmpV.clone(),
      dir: new THREE.Vector3(dirX / len, 0, dirZ / len),
      left: RANGE + 0.8,
      prev: this.tmpV.clone(),
      visual: true,
      stuck: 0,
    });
  }

  /** 箭矢飞行:直线平飞,逐帧对飞行路径做扫掠命中,未命中插地保留片刻 */
  private updateArrows(delta: number): void {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (arrow.stuck > 0) {
        arrow.stuck -= delta;
        if (arrow.stuck <= 0) this.removeArrow(arrow, i);
        continue;
      }
      const step = Math.min(ARROW_SPEED * delta, arrow.left);
      arrow.prev.copy(arrow.pos);
      arrow.pos.addScaledVector(arrow.dir, step);
      arrow.left -= step;
      arrow.group.position.copy(arrow.pos);
      arrow.group.quaternion.setFromUnitVectors(this.up, arrow.dir);

      const hit = arrow.visual ? null : this.sweepHit(arrow);
      if (hit) {
        this.resolveHit(hit, arrow, i);
        continue;
      }
      const ground = this.terrain.getHeight(arrow.pos.x, arrow.pos.z);
      if (arrow.left <= 0 || arrow.pos.y <= ground) this.stick(arrow);
    }
  }

  /** 扫掠判定:箭矢本帧扫过的线段附近(平面距离)第一只猎物,命中优先级 野兽>螃蟹>鸟 */
  private sweepHit(arrow: Arrow): ArrowHit | null {
    const beast = this.wildlife.hitSegment(arrow.prev, arrow.pos, HIT_RANGE);
    if (beast) return { kind: 'wildlife', animalId: beast.id };
    const crab = this.crabs.hitSegment(arrow.prev, arrow.pos, HIT_RANGE);
    if (crab) return { kind: 'crab' };
    const bird = this.birds.hitSegment(arrow.prev, arrow.pos, HIT_RANGE);
    if (bird) return { kind: 'bird' };
    return null;
  }

  /** 命中结算:客人端只做本地表现并上行,房主/单机端权威扣血与掉落 */
  private resolveHit(hit: ArrowHit, arrow: Arrow, index: number): void {
    const p = arrow.pos;
    this.audio.play('arrowHit');
    this.fx.burst(p, '#c0392d', 10);
    if (this.onNetHit) {
      this.onNetHit(hit, p.x, p.z);
    } else {
      this.applyHit(hit, p.x, p.z);
    }
    this.removeArrow(arrow, index);
  }

  /** 权威结算一次命中:扣目标血量/击杀并掉落战利品 */
  private applyHit(hit: ArrowHit, x: number, z: number): void {
    const damage = this.tools.bow >= 2 ? REFINED_ARROW_DAMAGE : ARROW_DAMAGE;
    if (hit.kind === 'wildlife') {
      const beast = this.wildlife.damage(hit.animalId, damage);
      // 野生动物可中数箭:受伤未死不掉肉
      if (beast && beast !== 'hit') this.onLoot(this.wildlife.lootOf(beast.species), x, z);
      return;
    }
    const point = this.tmpV.set(x, 0, z);
    if (hit.kind === 'crab' && this.crabs.killNearby(point, HIT_RANGE)) {
      this.onLoot([{ kind: 'crabMeat', count: 1 }], x, z);
    } else if (hit.kind === 'bird' && this.birds.killNearby(point, HIT_RANGE)) {
      this.onLoot([{ kind: 'birdMeat', count: 1 }], x, z);
    }
  }

  /** 房主收到客人上行命中后的权威结算:结算伤害/掉落(表现已在客人端播过;箭在放箭瞬间经 arrowShot 扣除) */
  settleNetHit(hit: ArrowHit, x: number, z: number): void {
    this.applyHit(hit, x, z);
  }

  /** 未命中:箭插在地上,朝下竖直保留片刻后消失 */
  private stick(arrow: Arrow): void {
    arrow.stuck = STICK_TIME;
    arrow.group.position.y = this.terrain.getHeight(arrow.pos.x, arrow.pos.z) + 0.2;
    arrow.group.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  }

  private removeArrow(arrow: Arrow, index: number): void {
    this.scene.remove(arrow.group);
    this.arrows.splice(index, 1);
  }
}
