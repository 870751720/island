import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { Props } from '../world/Props';

/** 玩家靠到这个距离内,蝴蝶会振翅飞走并消失 */
const FLEE_RANGE = 2.6;
/** 飞走后多久在别的植被旁重新出现 */
const RESPAWN_TIME = 12;
/** 蝴蝶飞离时的速度与升速 */
const FLEE_SPEED = 3.2;
const FLEE_LIFT = 1.6;
/** 盘旋飞行高度(相对植被根部) */
const HOVER_MIN = 0.9;
const HOVER_MAX = 1.5;

const WING_COLORS = ['#e8b4d8', '#f2d16b', '#8ecae6', '#f4978e', '#cdb4f0'];

function clayMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}

type ButterflyModel = {
  group: THREE.Group;
  wings: [THREE.Mesh, THREE.Mesh];
};

/** 低多边形蝴蝶:细长身体 + 两片绕中轴扑动的三角翅膀 */
function makeButterflyModel(color: string): ButterflyModel {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), clayMaterial('#3a3230'));
  body.scale.set(0.7, 0.7, 2.4);
  group.add(body);

  // 翅膀:压扁的三角面,几何先平移让翼根落在转轴上
  const wingShape = new THREE.BufferGeometry();
  wingShape.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 0, 0.08, 0, 0, -0.1, 0.26, 0, -0.02],
      3
    )
  );
  wingShape.computeVertexNormals();
  const mat = clayMaterial(color);
  mat.side = THREE.DoubleSide;
  const wings: [THREE.Mesh, THREE.Mesh] = [
    new THREE.Mesh(wingShape, mat),
    new THREE.Mesh(wingShape, mat),
  ];
  wings[0].scale.x = 1;
  wings[1].scale.x = -1;
  for (const wing of wings) {
    wing.castShadow = true;
    group.add(wing);
  }
  return { group, wings };
}

type Butterfly = {
  model: ButterflyModel;
  /** 盘旋中心(植被旁一点) */
  anchor: THREE.Vector3;
  pos: THREE.Vector3;
  /** 身体朝向(水平角),由运动方向推得 */
  heading: number;
  /** 逃离方向(水平角),进入逃离状态时确定 */
  fleeHeading: number;
  fleeTime: number;
  phase: number;
  visible: boolean;
  respawnLeft: number;
};

/** 蝴蝶:偶尔出现在浆果丛/树/灌木旁盘旋,被玩家靠近即飞走消失,稍后在别处重现 */
export class Butterflies implements Updatable {
  readonly group = new THREE.Group();
  private butterflies: Butterfly[] = [];

  constructor(
    scene: THREE.Scene,
    private props: Props,
    private player: { group: THREE.Group },
    rng: () => number = Math.random
  ) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const model = makeButterflyModel(WING_COLORS[Math.floor(rng() * WING_COLORS.length)]);
      const anchor = this.pickAnchor(rng) ?? new THREE.Vector3();
      this.group.add(model.group);
      this.butterflies.push({
        model,
        anchor,
        pos: anchor.clone(),
        heading: rng() * Math.PI * 2,
        fleeHeading: 0,
        fleeTime: 0,
        phase: rng() * Math.PI * 2,
        visible: true,
        // 错开出现节奏,避免同批刷新
        respawnLeft: 0,
      });
    }
    scene.add(this.group);
  }

  /** 从植被中随机挑一个浆果丛/树/灌木旁的盘旋点;找不到返回 null */
  private pickAnchor(rng: () => number): THREE.Vector3 | null {
    const hosts = this.props.list.filter((p) => p.kind === 'berry' || p.kind === 'shrub' || p.kind === 'tree');
    if (hosts.length === 0) return null;
    const prop = hosts[Math.floor(rng() * hosts.length)];
    const a = rng() * Math.PI * 2;
    const d = 0.6 + rng() * 0.8;
    return new THREE.Vector3(
      prop.position.x + Math.cos(a) * d,
      prop.position.y + HOVER_MIN + rng() * (HOVER_MAX - HOVER_MIN),
      prop.position.z + Math.sin(a) * d
    );
  }

  update(delta: number, elapsed: number): void {
    const p = this.player.group.position;
    for (const bf of this.butterflies) {
      if (!bf.visible) {
        bf.respawnLeft -= delta;
        if (bf.respawnLeft <= 0) this.respawn(bf);
        continue;
      }

      const prevX = bf.pos.x;
      const prevZ = bf.pos.z;
      const dist = Math.hypot(p.x - bf.pos.x, p.z - bf.pos.z);
      if (bf.fleeTime > 0 || dist < FLEE_RANGE) {
        if (bf.fleeTime <= 0) {
          // 被惊起:背离玩家方向直线飞升
          bf.fleeHeading = Math.atan2(bf.pos.z - p.z, bf.pos.x - p.x);
          bf.fleeTime = 0.001;
        }
        bf.fleeTime += delta;
        bf.pos.x += Math.cos(bf.fleeHeading) * FLEE_SPEED * delta;
        bf.pos.z += Math.sin(bf.fleeHeading) * FLEE_SPEED * delta;
        bf.pos.y += FLEE_LIFT * delta;
        // 飞出足够远后消失,稍后异地重现
        if (bf.fleeTime > 2.5) {
          bf.visible = false;
          bf.model.group.visible = false;
          bf.respawnLeft = RESPAWN_TIME;
          continue;
        }
      } else {
        // 平时绕锚点做平缓的利萨如盘旋
        const t = elapsed * 0.9 + bf.phase;
        bf.pos.x = bf.anchor.x + Math.sin(t) * 0.5 + Math.sin(t * 2.3) * 0.15;
        bf.pos.z = bf.anchor.z + Math.cos(t * 0.8) * 0.5;
        bf.pos.y = bf.anchor.y + Math.sin(t * 1.7) * 0.18;
      }

      // 由水平位移推朝向;盘旋换向平缓,惊飞时直接朝逃向
      if (Math.hypot(bf.pos.x - prevX, bf.pos.z - prevZ) > 1e-4) {
        const target = Math.atan2(bf.pos.x - prevX, bf.pos.z - prevZ);
        let diff = target - bf.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        bf.heading += diff * Math.min(1, delta * 8);
      }

      this.animate(bf, elapsed);
    }
  }

  private animate(bf: Butterfly, elapsed: number): void {
    const g = bf.model.group;
    g.position.copy(bf.pos);
    // 身体纵轴(+z)朝运动方向:rotation.y = θ 时局部 +z 指向 (sinθ, 0, cosθ)
    g.rotation.y = bf.heading;

    // 扑翼:两片翅膀绕身体纵轴对拍,惊飞后频率更高
    const flap = bf.fleeTime > 0 ? 26 : 14;
    const angle = Math.abs(Math.sin(elapsed * flap + bf.phase)) * 1.1 + 0.15;
    bf.model.wings[0].rotation.z = angle;
    bf.model.wings[1].rotation.z = -angle;
  }

  private respawn(bf: Butterfly): void {
    const anchor = this.pickAnchor(Math.random);
    if (!anchor) {
      bf.respawnLeft = RESPAWN_TIME;
      return;
    }
    bf.anchor.copy(anchor);
    bf.pos.copy(anchor);
    bf.fleeTime = 0;
    bf.phase = Math.random() * Math.PI * 2;
    bf.visible = true;
    bf.model.group.visible = true;
  }
}
