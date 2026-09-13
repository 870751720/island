import * as THREE from 'three';
import type { WaterFx } from '../fx/WaterFx';

import { createSeaPredatorModel } from './SeaPredatorModel';

/** 出场从深处上浮 / 退场下潜的时长 */
const RISE_TIME = 0.7;
const DIVE_TIME = 0.6;
/** 超过背鳍最高点,确保整只模型潜入水下后再回收。 */
const SUBMERGE_DEPTH = 1.5;
/** 绕目标游弋的基准半径与角速度(半径随时间轻轻呼吸) */
const ORBIT_RADIUS = 3.1;
const ORBIT_SPEED = 1.15;
/** 扑咬总时长,与其中冲到咬点的瞬间 */
const LUNGE_TIME = 0.8;
const LUNGE_BITE_AT = 0.3;

function shortestAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * 海中巨影:低多边形掠食鱼,具有背鳍、摆尾与活动下颌,
 * 绕目标游弋,受召时冲向目标扑咬并在咬点溅起水花。纯表现实体,由 SeaThreatSystem
 * 驱动;update 传 null 目标即下潜离场,潜完 done 置真等待回收。
 */
export class SeaPredator {
  private group = new THREE.Group();
  private model = createSeaPredatorModel();
  private orbitAngle = Math.random() * Math.PI * 2;
  private state: 'rise' | 'circle' | 'lunge' | 'dive' = 'rise';
  private stateTime = 0;
  private lungeFrom = new THREE.Vector3();
  private biteAt = new THREE.Vector3();
  private bitten = false;
  private wakeTimer = 0;
  private prevPos = new THREE.Vector3();
  private doneFlag = false;

  constructor(
    private scene: THREE.Scene,
    private seaLevel: number,
    private waterFx: WaterFx
  ) {
    this.group.add(this.model.root);
    this.group.position.y = this.seaLevel - SUBMERGE_DEPTH;
    this.scene.add(this.group);
  }

  get done(): boolean {
    return this.doneFlag;
  }

  /** 扑向目标当前的位置咬一口;伤害与受击表现由系统在权威端结算,这里只管画面 */
  attack(target: THREE.Vector3): void {
    if (this.state === 'dive') return;
    this.state = 'lunge';
    this.stateTime = 0;
    this.bitten = false;
    this.lungeFrom.copy(this.group.position);
    this.biteAt.set(target.x, this.seaLevel, target.z);
  }

  update(delta: number, elapsed: number, target: THREE.Vector3 | null): void {
    this.stateTime += delta;
    const p = this.group.position;
    this.prevPos.copy(p);

    switch (this.state) {
      case 'rise': {
        const t = Math.min(1, this.stateTime / RISE_TIME);
        if (target) this.circle(delta, target);
        p.y = this.seaLevel - SUBMERGE_DEPTH * (1 - t);
        if (t >= 1) this.state = 'circle';
        break;
      }
      case 'circle':
        if (!target) this.enterDive();
        else this.circle(delta, target);
        break;
      case 'lunge': {
        const t = this.stateTime / LUNGE_TIME;
        if (!target) {
          this.enterDive();
          break;
        }
        this.orbitAngle += ORBIT_SPEED * delta;
        if (t < LUNGE_BITE_AT / LUNGE_TIME) {
          // 咬合前段:加速冲向玩家当前位置
          const k = Math.pow(t / (LUNGE_BITE_AT / LUNGE_TIME), 2);
          this.biteAt.set(target.x, this.seaLevel, target.z);
          p.lerpVectors(this.lungeFrom, this.biteAt, k);
        } else {
          if (!this.bitten) {
            this.bitten = true;
            this.waterFx.splash(this.biteAt);
          }
          // 后段撤回游弋轨道,转身再来
          const k = (t - LUNGE_BITE_AT / LUNGE_TIME) / (1 - LUNGE_BITE_AT / LUNGE_TIME);
          const orbit = this.orbitPoint(target);
          orbit.y = this.seaLevel;
          p.lerpVectors(this.biteAt, orbit, 1 - Math.pow(1 - k, 2));
          if (t >= 1) this.state = 'circle';
        }
        break;
      }
      case 'dive': {
        const t = Math.min(1, this.stateTime / DIVE_TIME);
        p.y = this.seaLevel - t * SUBMERGE_DEPTH;
        if (t >= 1) this.doneFlag = true;
        break;
      }
    }

    // 朝向沿实际位移方向缓转(本地方向 +x 为头)
    const dx = p.x - this.prevPos.x;
    const dz = p.z - this.prevPos.z;
    if (dx * dx + dz * dz > 1e-6) {
      const want = Math.atan2(-dz, dx);
      this.group.rotation.y += shortestAngle(want - this.group.rotation.y) * (1 - Math.exp(-9 * delta));
    }
    const bite = this.state === 'lunge'
      ? Math.max(0, Math.sin(Math.min(1, this.stateTime / (LUNGE_BITE_AT + 0.16)) * Math.PI))
      : 0;
    this.model.animate(elapsed, bite);
  }

  /** 绕目标游弋:半径缓慢呼吸,身后间隔泛涟漪 */
  private circle(delta: number, target: THREE.Vector3): void {
    this.orbitAngle += ORBIT_SPEED * delta;
    const p = this.group.position;
    p.copy(this.orbitPoint(target));
    p.y = this.seaLevel;
    this.wakeTimer -= delta;
    if (this.wakeTimer <= 0) {
      this.wakeTimer = 0.55;
      this.waterFx.ripple(p.x, this.seaLevel, p.z);
    }
  }

  private orbitPoint(target: THREE.Vector3): THREE.Vector3 {
    const r = ORBIT_RADIUS + Math.sin(this.stateTime * 0.8) * 0.45;
    return new THREE.Vector3(
      target.x + Math.cos(this.orbitAngle) * r,
      0,
      target.z + Math.sin(this.orbitAngle) * r
    );
  }

  private enterDive(): void {
    this.state = 'dive';
    this.stateTime = 0;
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.model.dispose();
  }
}
