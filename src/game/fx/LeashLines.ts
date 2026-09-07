import * as THREE from 'three';

/** 绳子的分段数(足够画出下垂弧线,手机上开销可忽略) */
const SEGMENTS = 10;
/** 绳子颜色 */
const ROPE_COLOR = '#c9b588';
/** 最大下垂量(米):绳子越松垂得越低,绷直时几乎不下垂 */
const MAX_SAG = 0.45;

type RopeLine = {
  line: THREE.Line;
  positions: Float32Array;
};

/**
 * 系绳渲染:玩家↔羊、桩↔羊之间各画一条带下垂弧度的绳子。
 * 每帧由外层喂入当前应显示的绳子列表(键为羊 id),池化复用,离开的绳子自动隐藏。
 */
export class LeashLines {
  private pool = new Map<string, RopeLine>();
  private group = new THREE.Group();

  constructor(private scene: THREE.Scene) {
    this.scene.add(this.group);
  }

  /** 按键对账并更新所有绳子的形状;from/to 为绳子两端的世界坐标 */
  sync(entries: { key: string; from: THREE.Vector3; to: THREE.Vector3 }[]): void {
    const live = new Set(entries.map((e) => e.key));
    for (const [key, rope] of this.pool) {
      if (!live.has(key)) {
        rope.line.visible = false;
      }
    }
    for (const entry of entries) {
      const rope = this.acquire(entry.key);
      this.shape(rope, entry.from, entry.to);
    }
  }

  /** 取(或懒建)一条绳子 */
  private acquire(key: string): RopeLine {
    let rope = this.pool.get(key);
    if (!rope) {
      const positions = new Float32Array((SEGMENTS + 1) * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: ROPE_COLOR })
      );
      line.frustumCulled = false;
      this.group.add(line);
      rope = { line, positions };
      this.pool.set(key, rope);
    }
    rope.line.visible = true;
    return rope;
  }

  /** 用两端点与下垂量重铺绳子顶点 */
  private shape(rope: RopeLine, from: THREE.Vector3, to: THREE.Vector3): void {
    const dist = from.distanceTo(to);
    const sag = Math.min(MAX_SAG, dist * 0.12);
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const o = i * 3;
      rope.positions[o] = from.x + (to.x - from.x) * t;
      rope.positions[o + 1] = from.y + (to.y - from.y) * t - sag * 4 * t * (1 - t);
      rope.positions[o + 2] = from.z + (to.z - from.z) * t;
    }
    (rope.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    for (const rope of this.pool.values()) {
      rope.line.geometry.dispose();
      (rope.line.material as THREE.Material).dispose();
      this.group.remove(rope.line);
    }
    this.pool.clear();
    this.scene.remove(this.group);
  }
}
