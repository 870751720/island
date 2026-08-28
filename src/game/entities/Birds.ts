import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { Props } from '../world/Props';
import type { IslandTerrain } from '../world/IslandTerrain';

/** 玩家靠到这个距离内,鸟会被惊飞 */
const FLEE_RANGE = 5;
/** 惊飞后飞远多久恢复巡航 */
const FLEE_TIME = 2.8;
const FLEE_SPEED = 9;
/** 惊飞时的爬升速度 */
const FLEE_LIFT = 3;
/** 巡航速度与转向、爬升能力 */
const CRUISE_SPEED = 6;
const TURN_RATE = 3;
const CLIMB_SPEED = 2.5;
/** 地面踱步速度 */
const WALK_SPEED = 0.7;
/** 巡航目标点选在玩家周围这个环内,保证玩家总能偶尔看到鸟 */
const WANDER_MIN = 8;
const WANDER_MAX = 26;

const BODY_COLORS = ['#5d6d7e', '#8d6e63', '#34495e', '#6d7b5a'];

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
}

type BirdModel = {
  group: THREE.Group;
  /** 左右翅组,绕身体纵轴(z 轴)扑动 */
  wings: THREE.Group[];
  /** 头颈组,踱步啄食时低头 */
  head: THREE.Group;
};

/** 用平面轮廓生成一片翅膀:shape 在 XY 平面定义(x 向外、-y 指向身体前方),再放平到 XZ */
function wingGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.03, -0.12);
  s.quadraticCurveTo(0.22, -0.14, 0.38, -0.02);
  s.quadraticCurveTo(0.3, 0.12, 0.06, 0.12);
  s.quadraticCurveTo(0.0, 0.04, 0.03, -0.12);
  const geo = new THREE.ShapeGeometry(s, 5);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** 低多边形黏土质感的小鸟:椭圆身体 + 头喙 + 扁尾 + 两片长翅 */
function makeBirdModel(color: string): BirdModel {
  const group = new THREE.Group();
  const mat = clayMaterial(color);
  const wingMat = clayMaterial(color);
  wingMat.side = THREE.DoubleSide;

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat);
  body.scale.set(0.9, 0.85, 1.6);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Group();
  head.position.set(0, 0.09, 0.18);
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), mat);
  skull.castShadow = true;
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.14, 4),
    clayMaterial('#d9a441')
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.01, 0.13);
  head.add(skull, beak);
  group.add(head);

  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.26, 3),
    mat
  );
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(1, 1, 0.35);
  tail.position.set(0, 0.02, -0.3);
  tail.castShadow = true;
  group.add(tail);

  const wingGeo = wingGeometry();
  const wings: THREE.Group[] = [];
  for (const side of [1, -1] as const) {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.castShadow = true;
    pivot.add(wing);
    // 镜像放另一侧;记下朝向,扑动时两侧同上同下
    pivot.scale.x = side;
    pivot.userData.side = side;
    group.add(pivot);
    wings.push(pivot);
  }
  return { group, wings, head };
}

type BirdState = 'fly' | 'land' | 'walk' | 'flee';

type Bird = {
  model: BirdModel;
  pos: THREE.Vector3;
  heading: number;
  state: BirdState;
  /** 当前飞行/降落/踱步的目标点 */
  target: THREE.Vector3;
  /** 巡航高度(离地) */
  alt: number;
  /** 处于当前状态的时长 */
  stateTime: number;
  /** 地面停留剩余时间 */
  walkLeft: number;
  /** 踱步中朝向下一个小步点;抵达后原地啄食 */
  stepTarget: THREE.Vector3 | null;
  fleeHeading: number;
  phase: number;
};

/** 海鸥般的小鸟:多数时间在玩家周围盘旋巡航,偶尔落到浆果丛旁、水洼边或空地上踱步啄食,玩家靠近即惊飞 */
export class Birds implements Updatable {
  readonly group = new THREE.Group();
  private birds: Bird[] = [];

  constructor(
    scene: THREE.Scene,
    private terrain: IslandTerrain,
    private props: Props,
    private player: { group: THREE.Group },
    rng: () => number = Math.random
  ) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const model = makeBirdModel(BODY_COLORS[Math.floor(rng() * BODY_COLORS.length)]);
      const p = this.player.group.position;
      const pos = new THREE.Vector3(
        p.x + (rng() * 2 - 1) * WANDER_MAX,
        0,
        p.z + (rng() * 2 - 1) * WANDER_MAX
      );
      const alt = 4 + rng() * 5;
      pos.y = this.terrain.getHeight(pos.x, pos.z) + alt;
      this.group.add(model.group);
      this.birds.push({
        model,
        pos,
        heading: rng() * Math.PI * 2,
        state: 'fly',
        target: this.pickWanderTarget(rng),
        alt,
        stateTime: rng() * 5,
        walkLeft: 0,
        stepTarget: null,
        fleeHeading: 0,
        phase: rng() * Math.PI * 2,
      });
    }
    scene.add(this.group);
  }

  /** 巡航目标:玩家周围环内随机一点的高空 */
  private pickWanderTarget(rng: () => number): THREE.Vector3 {
    const p = this.player.group.position;
    const half = this.terrain.size / 2;
    for (let tries = 0; tries < 10; tries++) {
      const a = rng() * Math.PI * 2;
      const d = WANDER_MIN + rng() * (WANDER_MAX - WANDER_MIN);
      const x = THREE.MathUtils.clamp(p.x + Math.cos(a) * d, -half * 0.9, half * 0.9);
      const z = THREE.MathUtils.clamp(p.z + Math.sin(a) * d, -half * 0.9, half * 0.9);
      if (this.terrain.getHeight(x, z) > 0.3) {
        return new THREE.Vector3(x, this.terrain.getHeight(x, z) + 4 + rng() * 5, z);
      }
    }
    return new THREE.Vector3(p.x, p.y + 6, p.z);
  }

  /** 落脚点:按权重从浆果丛旁 / 水洼边 / 空地中选一个 */
  private pickLandingSpot(rng: () => number): THREE.Vector3 {
    const roll = rng();
    if (roll < 0.4) {
      const bushes = this.props.list.filter((p) => p.kind === 'berry');
      if (bushes.length > 0) {
        const prop = bushes[Math.floor(rng() * bushes.length)];
        const a = rng() * Math.PI * 2;
        const d = 0.8 + rng() * 0.8;
        const x = prop.position.x + Math.cos(a) * d;
        const z = prop.position.z + Math.sin(a) * d;
        return new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
      }
    }
    if (roll < 0.7 && this.terrain.waterAreas.length > 0) {
      const w = this.terrain.waterAreas[Math.floor(rng() * this.terrain.waterAreas.length)];
      const a = rng() * Math.PI * 2;
      const d = w.radius * (1 + rng() * 0.2);
      const x = w.x + Math.cos(a) * d;
      const z = w.z + Math.sin(a) * d;
      return new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
    }
    // 空地:玩家周围环内找一块离水稍远的干地
    const p = this.player.group.position;
    const half = this.terrain.size / 2;
    for (let tries = 0; tries < 12; tries++) {
      const a = rng() * Math.PI * 2;
      const d = WANDER_MIN * 0.5 + rng() * WANDER_MAX * 0.6;
      const x = THREE.MathUtils.clamp(p.x + Math.cos(a) * d, -half * 0.9, half * 0.9);
      const z = THREE.MathUtils.clamp(p.z + Math.sin(a) * d, -half * 0.9, half * 0.9);
      if (
        this.terrain.getHeight(x, z) > 0.3 &&
        !this.terrain.isNearWater(new THREE.Vector3(x, 0, z), 0.5)
      ) {
        return new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
      }
    }
    return this.pickWanderTarget(rng);
  }

  update(delta: number, elapsed: number): void {
    const p = this.player.group.position;
    for (const bird of this.birds) {
      bird.stateTime += delta;
      const dist = Math.hypot(p.x - bird.pos.x, p.z - bird.pos.z);

      if (bird.state !== 'flee' && dist < FLEE_RANGE) {
        // 被惊起:背离玩家方向直线飞升
        bird.fleeHeading = Math.atan2(bird.pos.z - p.z, bird.pos.x - p.x);
        bird.state = 'flee';
        bird.stateTime = 0;
        bird.stepTarget = null;
      }

      switch (bird.state) {
        case 'flee':
          bird.pos.x += Math.cos(bird.fleeHeading) * FLEE_SPEED * delta;
          bird.pos.z += Math.sin(bird.fleeHeading) * FLEE_SPEED * delta;
          bird.pos.y += FLEE_LIFT * delta;
          // fleeHeading 用 atan2(dz,dx) 约定,换算成身体朝向的 atan2(dx,dz) 约定
          bird.heading = Math.PI / 2 - bird.fleeHeading;
          if (bird.stateTime > FLEE_TIME) {
            bird.state = 'fly';
            bird.stateTime = 0;
            bird.target = this.pickWanderTarget(Math.random);
            bird.pos.y = Math.max(bird.pos.y, this.terrain.getHeight(bird.pos.x, bird.pos.z) + bird.alt);
          }
          break;
        case 'fly':
          this.flyToward(bird, bird.target, CRUISE_SPEED, delta);
          // 高度向巡航高度平滑过渡(带爬升速度上限,起飞时也是渐升)
          const desiredY = this.terrain.getHeight(bird.pos.x, bird.pos.z) + bird.alt;
          bird.pos.y += THREE.MathUtils.clamp(desiredY - bird.pos.y, -CLIMB_SPEED * delta, CLIMB_SPEED * delta);
          bird.pos.y += Math.sin(elapsed * 2 + bird.phase) * 0.006;
          if (Math.hypot(bird.target.x - bird.pos.x, bird.target.z - bird.pos.z) < 1.5) {
            if (Math.random() < 0.35) {
              bird.state = 'land';
              bird.stateTime = 0;
              bird.target = this.pickLandingSpot(Math.random);
            } else {
              bird.target = this.pickWanderTarget(Math.random);
            }
          }
          break;
        case 'land':
          this.flyToward(bird, bird.target, CRUISE_SPEED * 0.7, delta);
          // 朝落点滑降
          const drop = bird.target.y + 0.12 - bird.pos.y;
          bird.pos.y += THREE.MathUtils.clamp(drop, -CLIMB_SPEED * delta, CLIMB_SPEED * delta);
          if (bird.pos.distanceTo(bird.target) < 0.35) {
            bird.pos.copy(bird.target);
            bird.state = 'walk';
            bird.stateTime = 0;
            bird.walkLeft = 6 + Math.random() * 12;
            bird.stepTarget = null;
          }
          break;
        case 'walk':
          bird.walkLeft -= delta;
          if (bird.walkLeft <= 0) {
            bird.state = 'fly';
            bird.stateTime = 0;
            bird.target = this.pickWanderTarget(Math.random);
            break;
          }
          if (!bird.stepTarget) {
            if (bird.stateTime > 1 + Math.random() * 2) {
              // 在落脚点周围踱一小步
              const a = Math.random() * Math.PI * 2;
              const d = 0.4 + Math.random() * 0.9;
              const x = bird.target.x + Math.cos(a) * d;
              const z = bird.target.z + Math.sin(a) * d;
              bird.stepTarget = new THREE.Vector3(x, this.terrain.getHeight(x, z), z);
              bird.stateTime = 0;
            }
          } else if (this.flyToward(bird, bird.stepTarget, WALK_SPEED, delta)) {
            bird.pos.y = bird.stepTarget.y;
            bird.stepTarget = null;
            bird.stateTime = 0;
          }
          break;
      }

      this.animate(bird, elapsed);
    }
  }

  /** 沿水平朝目标转向并前进,返回是否已抵达(水平距离) */
  private flyToward(bird: Bird, target: THREE.Vector3, speed: number, delta: number): boolean {
    const dx = target.x - bird.pos.x;
    const dz = target.z - bird.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.06) return true;
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - bird.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = THREE.MathUtils.clamp(diff, -TURN_RATE * delta, TURN_RATE * delta);
    bird.heading += step;
    bird.pos.x += Math.sin(bird.heading) * speed * delta;
    bird.pos.z += Math.cos(bird.heading) * speed * delta;
    return Math.hypot(target.x - bird.pos.x, target.z - bird.pos.z) < 0.06;
  }

  private animate(bird: Bird, elapsed: number): void {
    const g = bird.model.group;
    g.position.copy(bird.pos);
    g.rotation.y = bird.heading;

    if (bird.state === 'walk') {
      // 收翅站立,踱步间隙低头啄食
      for (const wing of bird.model.wings) wing.rotation.z = wing.userData.side * 0.25;
      const peck = Math.sin(elapsed * 3 + bird.phase);
      bird.model.head.rotation.x = peck > 0.75 ? (peck - 0.75) * 2.4 : 0;
      // 身体小幅蹦跳步态
      g.position.y += Math.abs(Math.sin(elapsed * 8 + bird.phase)) * 0.03;
    } else {
      bird.model.head.rotation.x = 0;
      // 扑翼:巡航平缓,降落滑翔更慢,惊飞时急促
      const flap = bird.state === 'flee' ? 14 : bird.state === 'land' ? 5 : 8;
      const amp = bird.state === 'land' ? 0.45 : 0.7;
      const angle = Math.abs(Math.sin(elapsed * flap + bird.phase)) * amp + 0.1;
          for (const wing of bird.model.wings) wing.rotation.z = wing.userData.side * angle;
        }
  }
}
