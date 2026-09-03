import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { AmbientPose } from '../net/Protocol';
import { IslandTerrain } from '../world/IslandTerrain';

/** 沙滩高度带:低于该值为海/湿沙,高于该值为草地;螃蟹只在带内活动 */
const SAND_MIN = 0.02;
const SAND_MAX = 0.14;
/** 平时游荡速度与被玩家靠近时的逃跑速度 */
const WALK_SPEED = 0.9;
const FLEE_SPEED = 2.6;
/** 玩家靠到这个距离内,螃蟹会横着溜走 */
const FLEE_RANGE = 2.2;
/** 螃蟹被击杀后,延迟多久在海岸其他位置重新刷新 */
const RESPAWN_TIME = 25;

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

type CrabModel = {
  group: THREE.Group;
  legs: THREE.Mesh[];
  claws: THREE.Mesh[];
  body: THREE.Mesh;
};

/** 低多边形螃蟹:极扁的圆壳 + 眼柄 + 8 条横向摊开的粗腿 + 2 只大钳。
 * 配色参考业内低多边形螃蟹资产:饱和橙壳、深红橙腿、奶油腹、近黑眼。 */
function makeCrabModel(): CrabModel {
  const group = new THREE.Group();
  group.scale.setScalar(1 / 3);
  const shell = clayMaterial('#e87a3e');
  const limb = clayMaterial('#b8442c');
  const belly = clayMaterial('#f2e3c9');

  // 壳:扁盘状,长轴横跨左右,高度压到直径的三成以下
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), shell);
  body.scale.set(1.05, 0.3, 1.35);
  body.position.y = 0.09;
  body.castShadow = true;
  group.add(body);

  // 腹甲:略小的奶油色扁盘,从壳下露出边缘
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 5), belly);
  under.scale.set(1, 0.28, 1.3);
  under.position.y = 0.07;
  group.add(under);

  // 眼柄:壳前缘两根短杆顶近黑圆珠
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.1, 4), limb);
    stalk.position.set(0.26, 0.16, side * 0.07);
    group.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), clayMaterial('#241f1c'));
    eye.position.set(0.26, 0.22, side * 0.07);
    group.add(eye);
  }

  // 8 条腿:左右各 4,粗锥形杆几乎水平向外摊开,走路时绕根部摆动
  const legs: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.3, 4), limb);
      // 杆体重心在几何中心,先平移使根部落到一端
      leg.geometry.translate(0, -0.15, 0);
      leg.position.set(0.16 - i * 0.11, 0.1, side * 0.26);
      leg.rotation.z = -side * 0.3;
      leg.castShadow = true;
      group.add(leg);
      legs.push(leg);
    }
  }

  // 2 只钳子:粗臂 + 大钳身,是螃蟹最有辨识度的部位,做得比腿更夸张
  const claws: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.034, 0.16, 4), limb);
    arm.geometry.translate(0, -0.08, 0);
    arm.position.set(0.22, 0.11, side * 0.3);
    arm.rotation.z = -side * 1.0;
    group.add(arm);
    const pincer = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), shell);
    pincer.scale.set(1.25, 0.7, 0.85);
    pincer.position.set(0.32, 0.08, side * 0.4);
    pincer.castShadow = true;
    group.add(pincer);
    claws.push(arm, pincer);
  }

  return { group, legs, claws, body };
}

type Crab = {
  model: CrabModel;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  heading: number;
  /** 当前段已走时间,超过时限强制换目标,防止在带边缘卡住 */
  walkTime: number;
  idleTime: number;
  phase: number;
  alive: boolean;
  respawnLeft: number;
};

/** 沙滩上的小螃蟹:沿海岸带横行游荡,被玩家靠近会逃,始终不进海也不进草地 */
export class Crabs implements Updatable {
  readonly group = new THREE.Group();
  private crabs: Crab[] = [];

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    /** 所有会威胁螃蟹的玩家位置(联机时含全部玩家,任一靠近都会逃) */
    private playerPositions: () => THREE.Vector3[],
    /** 围栏等静态阻挡:点在阻挡内时螃蟹不可走 */
    private isBlocked: (x: number, z: number) => boolean = () => false,
    rng: () => number = Math.random
  ) {
    const size = terrain.size;
    const count = THREE.MathUtils.clamp(Math.round(size / 22), 5, 9);
    for (let i = 0; i < count; i++) {
      const spawn = this.findBeachSpot(rng);
      if (!spawn) continue;
      const model = makeCrabModel();
      model.group.position.copy(spawn);
      this.group.add(model.group);
      this.crabs.push({
        model,
        pos: spawn.clone(),
        target: spawn.clone(),
        heading: rng() * Math.PI * 2,
        walkTime: 0,
        idleTime: rng() * 4,
        phase: rng() * Math.PI * 2,
        alive: true,
        respawnLeft: 0,
      });
    }
    scene.add(this.group);
  }

  /** 某点是否在沙滩带内(可站立) */
  private isSand(x: number, z: number): boolean {
    if (this.isBlocked(x, z)) return false;
    const y = this.terrain.getHeight(x, z);
    return y >= SAND_MIN && y <= SAND_MAX;
  }

  /** 沿随机方向从岛外向内找第一处沙滩带上的点 */
  private findBeachSpot(rng: () => number): THREE.Vector3 | null {
    const angle = rng() * Math.PI * 2;
    const maxR = this.terrain.size / 2 - 1;
    let prevInside = false;
    for (let r = maxR; r > 1; r -= 0.5) {
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const inside = this.isSand(x, z);
      if (inside && prevInside) {
        // 连续两步都在带内才落脚,避开零星湿沙尖角
        return new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
      }
      prevInside = inside;
    }
    return null;
  }

  /** 在螃蟹附近找下一个游荡目标,只接受沙滩带内的点 */
  private pickTarget(crab: Crab, rng: () => number, range = 3): boolean {
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2;
      const d = 0.8 + rng() * range;
      const x = crab.pos.x + Math.cos(a) * d;
      const z = crab.pos.z + Math.sin(a) * d;
      if (this.isSand(x, z)) {
        crab.target.set(x, this.terrain.getHeight(x, z), z);
        return true;
      }
    }
    return false;
  }

  update(delta: number, elapsed: number): void {
    const players = this.playerPositions();
    for (const crab of this.crabs) {
      if (!crab.alive) {
        crab.respawnLeft -= delta;
        if (crab.respawnLeft <= 0) this.respawn(crab);
        continue;
      }
      // 找出范围内最近的玩家,背其方向逃跑
      let threat: THREE.Vector3 | null = null;
      let threatDist = FLEE_RANGE;
      for (const p of players) {
        const d = Math.hypot(p.x - crab.pos.x, p.z - crab.pos.z);
        if (d < threatDist) {
          threatDist = d;
          threat = p;
        }
      }
      const flee = threat !== null;
      const p = threat!;
      crab.walkTime += delta;

      let moving = false;
      if (flee) {
        // 背着玩家方向逃,且只踏在沙滩带上
        const a = Math.atan2(crab.pos.z - p.z, crab.pos.x - p.x);
        const nx = crab.pos.x + Math.cos(a) * FLEE_SPEED * delta;
        const nz = crab.pos.z + Math.sin(a) * FLEE_SPEED * delta;
        if (this.isSand(nx, nz)) {
          crab.pos.set(nx, this.terrain.getHeight(nx, nz), nz);
          crab.heading = a;
          moving = true;
        } else {
          // 直路被挡,沿切线方向再试
          for (const da of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
            const b = a + da;
            const tx = crab.pos.x + Math.cos(b) * FLEE_SPEED * delta;
            const tz = crab.pos.z + Math.sin(b) * FLEE_SPEED * delta;
            if (this.isSand(tx, tz)) {
              crab.pos.set(tx, this.terrain.getHeight(tx, tz), tz);
              crab.heading = b;
              moving = true;
              break;
            }
          }
        }
      } else if (crab.idleTime > 0) {
        crab.idleTime -= delta;
      } else if (crab.walkTime > 6 || crab.pos.distanceToSquared(crab.target) < 0.02) {
        // 到点或超时:歇一会儿再走下一段
        crab.idleTime = 1 + Math.random() * 3;
        crab.walkTime = 0;
        if (!this.pickTarget(crab, Math.random)) {
          // 周围没有沙滩可去(理论上不会发生),退回海岸上一点
          const spot = this.findBeachSpot(Math.random);
          if (spot) crab.target.copy(spot);
        }
      } else {
        const dirX = crab.target.x - crab.pos.x;
        const dirZ = crab.target.z - crab.pos.z;
        const len = Math.hypot(dirX, dirZ) || 1;
        const nx = crab.pos.x + (dirX / len) * WALK_SPEED * delta;
        const nz = crab.pos.z + (dirZ / len) * WALK_SPEED * delta;
        if (this.isSand(nx, nz)) {
          crab.pos.set(nx, this.terrain.getHeight(nx, nz), nz);
          crab.heading = Math.atan2(dirZ, dirX);
          moving = true;
        } else {
          crab.walkTime = 7; // 前方出带,强制重新选目标
        }
      }

      this.animate(crab, elapsed, moving, flee);
    }
  }

  netPoses(): AmbientPose[] {
    return this.crabs.map((crab, id) => ({
      id,
      x: crab.pos.x,
      y: crab.pos.y,
      z: crab.pos.z,
      h: crab.heading,
      visible: crab.alive,
    }));
  }

  netApply(poses: AmbientPose[], elapsed: number): void {
    for (const pose of poses) {
      const crab = this.crabs[pose.id];
      if (!crab) continue;
      const moving = crab.pos.distanceToSquared(new THREE.Vector3(pose.x, pose.y, pose.z)) > 0.001;
      crab.pos.set(pose.x, pose.y, pose.z);
      crab.heading = pose.h;
      crab.alive = pose.visible;
      crab.model.group.visible = pose.visible;
      if (pose.visible) this.animate(crab, elapsed, moving, false);
    }
  }

  /** 应用位置与朝向;横行:身体朝向与移动方向垂直;移动时摆腿、张合钳子 */
  private animate(crab: Crab, elapsed: number, moving: boolean, excited: boolean): void {
    const g = crab.model.group;
    g.position.copy(crab.pos);
    // 身体头(眼柄一侧)朝移动方向的右侧,呈横行姿态;再随速度轻微转向
    g.rotation.y = -crab.heading + Math.PI / 2;

    const speed = moving ? (excited ? 18 : 9) : 0;
    crab.model.legs.forEach((leg, i) => {
      const side = i < 4 ? 1 : -1;
      const offset = i % 4;
      const swing = Math.sin(elapsed * speed + crab.phase + offset * 1.6 + side) * (moving ? 0.5 : 0.08);
      leg.rotation.x = swing;
    });
    // 钳子:平时轻抬,受惊/移动时快速开合
    const clawWave = excited ? Math.sin(elapsed * 14 + crab.phase) * 0.15 : 0.05;
    crab.model.claws.forEach((part, i) => {
      part.position.y = (i % 2 === 0 ? 0.11 : 0.08) + Math.abs(clawWave) + Math.sin(elapsed * 2 + crab.phase + i) * 0.01;
    });
    // 身体轻微起伏
    crab.model.body.position.y = 0.09 + Math.sin(elapsed * (moving ? 12 : 2) + crab.phase) * (moving ? 0.02 : 0.005);
  }

  /** 返回范围内最近的一只活螃蟹的位置(无则 null),供弓箭索敌 */
  nearestAlive(origin: THREE.Vector3, range: number): THREE.Vector3 | null {
    let best: Crab | null = null;
    let bestDist = range * range;
    for (const crab of this.crabs) {
      if (!crab.alive) continue;
      const d = crab.pos.distanceToSquared(origin);
      if (d < bestDist) {
        best = crab;
        bestDist = d;
      }
    }
    return best ? best.pos.clone() : null;
  }

  /**
   * 击杀某点附近的一只活螃蟹(供后续攻击手段调用),返回是否命中。
   * 螃蟹死后消失,经过 RESPAWN_TIME 在海岸其他位置重新刷新。
   */
  killNearby(pos: THREE.Vector3, range: number): boolean {
    let best: Crab | null = null;
    let bestDist = range * range;
    for (const crab of this.crabs) {
      if (!crab.alive) continue;
      const d = crab.pos.distanceToSquared(pos);
      if (d < bestDist) {
        best = crab;
        bestDist = d;
      }
    }
    if (!best) return false;
    best.alive = false;
    best.respawnLeft = RESPAWN_TIME;
    best.model.group.visible = false;
    return true;
  }

  private respawn(crab: Crab): void {
    const spot = this.findBeachSpot(Math.random);
    if (!spot) {
      crab.respawnLeft = RESPAWN_TIME;
      return;
    }
    crab.pos.copy(spot);
    crab.target.copy(spot);
    crab.idleTime = 0;
    crab.walkTime = 0;
    crab.alive = true;
    crab.model.group.visible = true;
  }
}
