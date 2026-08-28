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
  /** 左右翅组,绕身体纵轴(z 轴)扑动 */
  wings: THREE.Group[];
};

/** 用平面轮廓生成一片蝶翅:shape 在 XY 平面定义(x 向外、y 沿身体纵轴),再放平到 XZ */
function wingGeometry(outline: THREE.Shape): THREE.BufferGeometry {
  const geo = new THREE.ShapeGeometry(outline, 6);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** 前翅:大而前掠,外缘圆润,是蝴蝶轮廓的主体 */
function forewingShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.05);
  s.quadraticCurveTo(0.16, 0.14, 0.3, 0.16);
  s.quadraticCurveTo(0.42, 0.16, 0.38, 0.05);
  s.quadraticCurveTo(0.32, -0.02, 0.08, -0.02);
  return s;
}

/** 后翅:较小,接在前翅根部后方,外缘略收 */
function hindwingShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.02, -0.02);
  s.quadraticCurveTo(0.18, -0.03, 0.26, -0.12);
  s.quadraticCurveTo(0.28, -0.22, 0.14, -0.22);
  s.quadraticCurveTo(0.04, -0.16, 0.02, -0.06);
  return s;
}

/** 低多边形蝴蝶:极细的针状身体 + 两对大面积圆轮廓翅膀(每侧前后翅一组,绕身体轴对拍) */
function makeButterflyModel(color: string): ButterflyModel {
  const group = new THREE.Group();
  const dark = clayMaterial('#3a3230');

  // 身体:细针状,只在头尾稍粗
  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.22, 5), dark);
  abdomen.rotation.x = Math.PI / 2;
  group.add(abdomen);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), dark);
  head.position.z = 0.13;
  group.add(head);
  // 触角:两根前伸的细丝
  for (const side of [-1, 1]) {
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 3), dark);
    antenna.geometry.translate(0, 0.05, 0);
    antenna.position.set(0, 0.012, 0.14);
    antenna.rotation.set(-0.9, 0, side * 0.5);
    group.add(antenna);
  }

  // 翅膀:左右各一组(前翅+后翅),挂在同一个 pivot 上绕身体纵轴(z 轴)扑动
  const wingMat = clayMaterial(color);
  wingMat.side = THREE.DoubleSide;
  const fore = wingGeometry(forewingShape());
  const hind = wingGeometry(hindwingShape());
  const wings: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    const foreMesh = new THREE.Mesh(fore, wingMat);
    const hindMesh = new THREE.Mesh(hind, wingMat);
    foreMesh.castShadow = true;
    hindMesh.castShadow = true;
    pivot.add(foreMesh, hindMesh);
    pivot.scale.x = side;
    group.add(pivot);
    wings.push(pivot);
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

    // 扑翼:两侧 pivot 镜像(scale.x=-1),同角绕 z 轴旋转即为对称对拍;惊飞后频率更高
    const flap = bf.fleeTime > 0 ? 26 : 14;
    const angle = Math.abs(Math.sin(elapsed * flap + bf.phase)) * 1.1 + 0.15;
    for (const wing of bf.model.wings) wing.rotation.z = angle;
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
