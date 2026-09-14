import type { PlayerSession } from '../mp/PlayerSession';
import type { Prop } from './Props';

const CONTACT = {
  grass: { radius: 0.7, tilt: 0.48 },
  shrub: { radius: 0.85, tilt: 0.26 },
  berry: { radius: 0.85, tilt: 0.23 },
};

type Bend = { x: number; z: number; vx: number; vz: number; tx: number; tz: number };

/** 仅保留移动采样与受触碰植被的弹簧状态，不参与玩法结算和存档。 */
export class VegetationContact {
  private previous = new WeakMap<PlayerSession, { x: number; z: number }>();
  private bends = new Map<Prop, Bend>();

  update(delta: number, sessions: readonly PlayerSession[], nearby: (x: number, z: number) => Prop[]): void {
    if (delta <= 0) return;
    for (const bend of this.bends.values()) {
      bend.tx = 0;
      bend.tz = 0;
    }
    for (const session of sessions) {
      const player = session.player;
      const p = player.group.position;
      const last = this.previous.get(session);
      this.previous.set(session, { x: p.x, z: p.z });
      if (!last || session.survival.state.dead || player.isSwimming || !player.isMoving) continue;
      const dx = p.x - last.x;
      const dz = p.z - last.z;
      const distance = Math.hypot(dx, dz);
      // 忽略静止时的细微对账及传送，不沿传送路线拨动植被。
      if (distance < delta * 0.08 || distance > 1.5) continue;
      const speed = Math.min(1, distance / delta / 3);
      for (const prop of nearby(p.x, p.z)) {
        if (!(prop.kind in CONTACT) || !prop.group.visible) continue;
        const cfg = CONTACT[prop.kind as keyof typeof CONTACT];
        if (Math.abs(p.y - prop.position.y) > 1) continue;
        const radius = cfg.radius * prop.group.scale.x + 0.25;
        const along = Math.max(0, Math.min(1,
          ((prop.position.x - last.x) * dx + (prop.position.z - last.z) * dz) / (distance * distance)));
        const separation = Math.hypot(prop.position.x - last.x - dx * along, prop.position.z - last.z - dz * along);
        if (separation >= radius) continue;
        let bend = this.bends.get(prop);
        if (!bend) {
          bend = { x: 0, z: 0, vx: 0, vz: 0, tx: 0, tz: 0 };
          this.bends.set(prop, bend);
        }
        const strength = cfg.tilt * speed * (1 - separation / radius);
        bend.tx += dz / distance * strength;
        bend.tz -= dx / distance * strength;
      }
    }
    const dt = Math.min(delta, 0.1);
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    for (const [prop, bend] of this.bends) {
      if (!prop.group.parent || !prop.group.visible) {
        this.bends.delete(prop);
        continue;
      }
      const magnitude = Math.hypot(bend.tx, bend.tz);
      if (magnitude > 0.5) {
        bend.tx *= 0.5 / magnitude;
        bend.tz *= 0.5 / magnitude;
      }
      for (let i = 0; i < steps; i++) {
        bend.vx += ((bend.tx - bend.x) * 180 - bend.vx * 18) * h;
        bend.vz += ((bend.tz - bend.z) * 180 - bend.vz * 18) * h;
        bend.x += bend.vx * h;
        bend.z += bend.vz * h;
      }
      if (magnitude === 0 && Math.hypot(bend.x, bend.z, bend.vx, bend.vz) < 0.001) this.bends.delete(prop);
    }
  }

  /** 在风摇/采集旋转重算后叠加，转换到随机朝向下的局部轴。 */
  apply(prop: Prop): void {
    if (!(prop.kind in CONTACT)) return;
    const bend = this.bends.get(prop);
    const rotation = prop.group.rotation;
    const x = rotation.x + (bend?.x ?? 0);
    const z = rotation.z + (bend?.z ?? 0);
    const yaw = rotation.y;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    rotation.set(cos * x + sin * z, yaw, -sin * x + cos * z, 'YXZ');
  }
}
