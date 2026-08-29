import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Crabs } from '../entities/Crab';
import type { Birds } from '../entities/Birds';
import type { Wildlife } from '../entities/Wildlife';
import type { IslandTerrain } from '../world/IslandTerrain';
import type { Inventory } from './Inventory';
import type { Particles } from '../fx/Particles';
import type { GameAudio } from '../audio/GameAudio';

/** 攻击范围:玩家到目标不超过这个距离才会开弓 */
const RANGE = 9;
/** 每次射箭的冷却(秒) */
const COOLDOWN = 3;
/** 开弓瞄准时间(秒),期间播拉弓动作 */
const DRAW_TIME = 0.45;
/** 箭矢飞行速度 */
const ARROW_SPEED = 18;
/** 箭矢到达后判定命中的范围 */
const HIT_RANGE = 0.9;
/** 命中箭插在地上多久后消失(秒) */
const STICK_TIME = 6;

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
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), clayMaterial('#8a8a8a'));
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

type Arrow = {
  group: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
  /** 上一帧位置,末帧用于取真实运动方向 */
  prev: THREE.Vector3;
  /** 命中目标未杀死(生物已移动)时插在地上等消失 */
  stuck: number;
};

/**
 * 弓箭:手持弓且背包有箭时,攻击范围内的螃蟹/小鸟/野生动物(蝴蝶除外)会被自动瞄准,
 * 拉弓片刻后放箭,箭飞到目标点判定命中;每次射击 3 秒冷却。
 */
export class BowSystem {
  private cooldown = 0;
  private drawLeft = 0;
  private arrows: Arrow[] = [];
  private from = new THREE.Vector3();
  private target = new THREE.Vector3();
  private dir = new THREE.Vector3();
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
    /** 击杀掉落战利品(在击杀位置掉落对应肉类) */
    private onLoot: (
      kind: 'crabMeat' | 'birdMeat' | 'gameMeat',
      count: number,
      x: number,
      z: number
    ) => void
  ) {}

  /** 拉弓期间占用双手(其他系统让位用) */
  get isWorking(): boolean {
    return this.drawLeft > 0;
  }

  update(delta: number, busy: boolean): void {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.updateArrows(delta);

    if (this.drawLeft > 0) {
      this.player.setAction('shoot');
      // 持续面朝目标开弓
      const p = this.player.group.position;
      this.player.group.rotation.y = Math.atan2(
        this.target.x - p.x,
        this.target.z - p.z
      );
      this.drawLeft -= delta;
      if (this.drawLeft <= 0) this.launch();
      return;
    }

    if (
      this.cooldown > 0 ||
      busy ||
      this.player.isSwimming ||
      this.player.currentTool !== 'bow' ||
      this.inventory.count('arrow') <= 0
    ) {
      return;
    }
    const target = this.findTarget();
    if (!target) return;
    this.target.copy(target);
    this.drawLeft = DRAW_TIME;
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

  /** 放箭:扣一支箭,生成飞行箭矢,进入冷却 */
  private launch(): void {
    if (!this.inventory.remove('arrow', 1)) return;
    this.cooldown = COOLDOWN;
    this.audio.play('shoot');
    const group = makeArrowModel();
    this.from.copy(this.player.group.position);
    this.from.y += 1.1;
    const to = this.target.clone();
    const duration = Math.max(this.from.distanceTo(to) / ARROW_SPEED, 0.05);
    group.position.copy(this.from);
    this.scene.add(group);
    this.arrows.push({
      group,
      from: this.from.clone(),
      to,
      t: 0,
      duration,
      prev: this.from.clone(),
      stuck: 0,
    });
  }

  /** 箭矢飞行:直线略带下坠的弧线,到达后判定命中,未命中插地保留片刻 */
  private updateArrows(delta: number): void {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (arrow.stuck > 0) {
        arrow.stuck -= delta;
        if (arrow.stuck <= 0) this.removeArrow(arrow, i);
        continue;
      }
      arrow.t += delta;
      const t = Math.min(arrow.t / arrow.duration, 1);
      arrow.group.position.lerpVectors(arrow.from, arrow.to, t);
      // 轻微抛物线:飞行中段略抬高,姿态对准实际运动方向
      arrow.group.position.y += Math.sin(t * Math.PI) * 0.15;
      this.dir.copy(arrow.group.position).sub(arrow.prev);
      if (this.dir.lengthSq() > 0.0001) {
        arrow.group.quaternion.setFromUnitVectors(this.up, this.dir.normalize());
      }
      arrow.prev.copy(arrow.group.position);
      if (t >= 1) {
        this.resolveHit(arrow, i);
      }
    }
  }

  /** 到达目标点:命中范围内的螃蟹/小鸟/野生动物即结算;未命中则插在地上 */
  private resolveHit(arrow: Arrow, index: number): void {
    const p = arrow.group.position;
    const beast = this.wildlife.damageNearby(p, HIT_RANGE);
    const hitCrab = !beast && this.crabs.killNearby(p, HIT_RANGE);
    const hitBird = !beast && !hitCrab && this.birds.killNearby(p, HIT_RANGE);
    if (beast || hitCrab || hitBird) {
      this.audio.play('arrowHit');
      this.fx.burst(p, '#c0392d', 10);
      // 野生动物可中数箭:受伤未死不掉肉,箭留在身上消失
      if (beast !== 'hit') {
        this.onLoot(
          beast ? 'gameMeat' : hitCrab ? 'crabMeat' : 'birdMeat',
          beast ? this.wildlife.lootOf(beast.species) : 1,
          p.x,
          p.z
        );
      }
      this.removeArrow(arrow, index);
    } else {
      arrow.stuck = STICK_TIME;
      arrow.group.position.y = this.terrain.getHeight(p.x, p.z) + 0.2;
      arrow.group.quaternion.setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI
      );
    }
  }

  private removeArrow(arrow: Arrow, index: number): void {
    this.scene.remove(arrow.group);
    this.arrows.splice(index, 1);
  }
}
