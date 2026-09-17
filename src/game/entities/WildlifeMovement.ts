type Point = { x: number; z: number };
type Motion = {
  until: number;
  seen: number;
  start: Point;
  duration: number;
  travelled: number;
  side: number;
  sideUntil: number;
};

/** 共用移动受阻记忆；只在权威端使用，不进入存档。 */
export class WildlifeMovement {
  private time = 0;
  private states = new WeakMap<object, Motion>();

  advance(delta: number): void { this.time += delta; }

  waiting(body: object): boolean {
    return this.time < (this.states.get(body)?.until ?? 0);
  }

  step(body: object, position: Point, angle: number, delta: number,
    tryMove: (angle: number) => boolean): boolean {
    let state = this.states.get(body);
    if (!state || (this.time - state.seen > 0.2 && this.time > state.until + 0.2)) {
      state = { until: 0, seen: this.time, start: { ...position }, duration: 0,
        travelled: 0, side: 0, sideUntil: 0 };
      this.states.set(body, state);
    }
    state.seen = this.time;
    if (this.waiting(body)) return false;
    const stop = () => {
      state.until = this.time + 1;
      state.duration = 0;
      state.travelled = 0;
      state.start = { x: position.x, z: position.z };
    };
    if (state.duration === 0) state.start = { x: position.x, z: position.z };
    const x = position.x, z = position.z;
    let moved = tryMove(angle);
    if (!moved) {
      // 已选侧向短期保持，不能走时等待，不在相邻帧左右切换。
      const sides = this.time < state.sideUntil ? [state.side] : [state.side || 1, -(state.side || 1)];
      for (const side of sides) {
        for (const offset of [Math.PI / 4, Math.PI / 2]) {
          if (!tryMove(angle + offset * side)) continue;
          if (state.side !== side || this.time >= state.sideUntil) state.sideUntil = this.time + 0.6;
          state.side = side;
          moved = true;
          break;
        }
        if (moved) break;
      }
    }
    if (!moved) { stop(); return false; }
    state.duration += delta;
    state.travelled += Math.hypot(position.x - x, position.z - z);
    if (state.duration >= 0.5) {
      const progress = Math.hypot(position.x - state.start.x, position.z - state.start.z);
      // 比较净位移和路程，而非到目标的距离，允许正常绕障暂时远离目标。
      if (progress < 0.25 && progress < state.travelled * 0.35) stop();
      else {
        state.duration = 0;
        state.travelled = 0;
      }
    }
    return true;
  }
}
