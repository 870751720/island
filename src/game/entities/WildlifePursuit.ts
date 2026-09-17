type Point = { x: number; z: number };
export type PursuitBody = { id: number; pos: Point; radius: number };
type Body = { id: number; x: number; z: number; radius: number };
type Approach = { target: object; angle: number; seen: number; retry: number };

const CELL = 3;
const APPROACH_RANGE = 5;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** 房主使用的追击转向：帧初邻域快照避免更新顺序影响，接近方向短期保持稳定。 */
export class WildlifePursuit {
  private cells = new Map<string, Body[]>();
  private approaches = new Map<number, Approach>();
  private time = 0;

  begin(bodies: Iterable<PursuitBody>, delta: number): void {
    this.time += delta;
    this.cells.clear();
    for (const body of bodies) {
      const key = this.key(body.pos.x, body.pos.z);
      const cell = this.cells.get(key) ?? [];
      cell.push({ id: body.id, x: body.pos.x, z: body.pos.z, radius: body.radius });
      this.cells.set(key, cell);
    }
    for (const [id, approach] of this.approaches) {
      if (this.time - approach.seen > 0.5) this.approaches.delete(id);
    }
  }

  private key(x: number, z: number): string {
    return `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  }

  steer(body: PursuitBody, target: object, point: Point, attackRange: number,
    canStand: (x: number, z: number) => boolean, settling = false): { angle: number; strength: number } {
    const dx = point.x - body.pos.x, dz = point.z - body.pos.z;
    const distance = Math.hypot(dx, dz);
    const direct = Math.atan2(dz, dx);
    let heading = direct;
    if (!settling && distance < APPROACH_RANGE) {
      const origin = Math.atan2(-dz, -dx);
      let approach = this.approaches.get(body.id);
      const radius = attackRange * 0.85;
      const valid = (angle: number) => canStand(point.x + Math.cos(angle) * radius, point.z + Math.sin(angle) * radius);
      if (!approach || approach.target !== target ||
        (this.time >= approach.retry && (!valid(approach.angle) || Math.abs(wrap(approach.angle - origin)) > 1.2))) {
        let best = origin, bestScore = -Infinity;
        for (const offset of [0, 0.4, -0.4, 0.8, -0.8, 1.1, -1.1]) {
          const angle = origin + offset;
          if (!valid(angle)) continue;
          let clearance = 1.5;
          for (const [id, other] of this.approaches) {
            if (id !== body.id && other.target === target && this.time - other.seen <= 0.5) {
              clearance = Math.min(clearance, Math.abs(wrap(angle - other.angle)));
            }
          }
          const score = clearance - Math.abs(offset) * 0.3;
          if (score > bestScore) { bestScore = score; best = angle; }
        }
        approach = { target, angle: best, seen: this.time, retry: this.time + 0.6 };
        this.approaches.set(body.id, approach);
      }
      approach.seen = this.time;
      if (valid(approach.angle)) {
        const goal = Math.atan2(point.z + Math.sin(approach.angle) * radius - body.pos.z,
          point.x + Math.cos(approach.angle) * radius - body.pos.x);
        heading += wrap(goal - direct) * Math.min(1, (APPROACH_RANGE - distance) / 2);
      }
    } else if (settling) {
      const approach = this.approaches.get(body.id);
      if (approach?.target === target) approach.seen = this.time;
    } else {
      this.approaches.delete(body.id);
    }

    let pushX = 0, pushZ = 0;
    const cx = Math.floor(body.pos.x / CELL), cz = Math.floor(body.pos.z / CELL);
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) {
      for (const other of this.cells.get(`${x},${z}`) ?? []) {
        if (other.id === body.id) continue;
        let ax = body.pos.x - other.x, az = body.pos.z - other.z;
        const d = Math.hypot(ax, az), spacing = body.radius + other.radius;
        if (d >= spacing) continue;
        if (d < 0.001) {
          const angle = (Math.min(body.id, other.id) * 2.399963 + Math.max(body.id, other.id)) % (Math.PI * 2);
          const sign = body.id < other.id ? 1 : -1;
          ax = Math.cos(angle) * sign; az = Math.sin(angle) * sign;
        } else { ax /= d; az /= d; }
        const weight = (1 - d / spacing) ** 2;
        pushX += ax * weight; pushZ += az * weight;
      }
    }
    const magnitude = Math.hypot(pushX, pushZ);
    const limit = settling ? 1 : 0.85;
    if (magnitude > limit) { pushX *= limit / magnitude; pushZ *= limit / magnitude; }
    if (settling) return { angle: Math.atan2(pushZ, pushX), strength: Math.min(1, magnitude) };
    // 保留向前追击分量，避免相互排斥导致整群停在攻击距离之外。
    return { angle: Math.atan2(Math.sin(heading) + pushZ, Math.cos(heading) + pushX), strength: 1 };
  }
}
