import * as THREE from 'three';
import type { WaterFx } from '../fx/WaterFx';

/** 贴水影子共用的圆片几何(半径 1,实例各自缩放成主身/尾巴/侧鳍) */
const SHADOW_GEO = new THREE.CircleGeometry(1, 12);
/** 背鳍:从水里露出来的竖直三角面 */
const FIN_GEO = new THREE.BufferGeometry();
FIN_GEO.setAttribute(
  'position',
  new THREE.Float32BufferAttribute([-0.42, 0, 0, 0.42, 0, 0, 0.12, 0.64, 0], 3)
);
FIN_GEO.computeVertexNormals();

/** 出场从深处上浮 / 退场下潜的时长 */
const RISE_TIME = 0.7;
const DIVE_TIME = 0.6;
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
 * 海中巨影:贴着海面的大鱼影子(深色椭圆 + 摆动的尾巴),背鳍露出水面一小截,
 * 绕目标游弋,受召时冲向目标扑咬并在咬点溅起水花。纯表现实体,由 SeaThreatSystem
 * 驱动;update 传 null 目标即下潜离场,潜完 done 置真等待回收。
 */
export class SeaPredator {
  private group = new THREE.Group();
  private shadowMat: THREE.MeshBasicMaterial;
  private finMat: THREE.MeshStandardMaterial;
  private tailPivot = new THREE.Group();
  private fin: THREE.Mesh;
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
    // 影子贴在海面之上一点点,保证深水区(海面不透底)也看得见;涟漪同样画在海面之后
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: '#12262f',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.finMat = new THREE.MeshStandardMaterial({
      color: '#1c3945',
      flatShading: true,
      roughness: 1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });

    const body = this.flatPiece(1.75, 0.7);
    body.position.set(0, 0.03, 0);

    const tail = this.flatPiece(0.85, 0.5);
    tail.position.set(-0.5, 0.03, 0);
    this.tailPivot.position.set(-1.5, 0, 0);
    this.tailPivot.add(tail);

    const finL = this.flatPiece(0.55, 0.28);
    finL.position.set(0.35, 0.03, -0.72);
    finL.rotation.y = 0.5;
    const finR = this.flatPiece(0.55, 0.28);
    finR.position.set(0.35, 0.03, 0.72);
    finR.rotation.y = -0.5;

    this.fin = new THREE.Mesh(FIN_GEO, this.finMat);
    this.fin.position.set(0.45, 0.02, 0);

    this.group.add(body, this.tailPivot, finL, finR, this.fin);
    this.group.position.y = this.seaLevel - 0.5;
    this.scene.add(this.group);
  }

  /** 贴水影子片:放平的深色半透明圆,画在海面之后 */
  private flatPiece(len: number, width: number): THREE.Mesh {
    const mesh = new THREE.Mesh(SHADOW_GEO, this.shadowMat);
    mesh.scale.set(len, width, 1);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 1;
    return mesh;
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
        this.setFade(t);
        if (target) this.circle(delta, target);
        p.y = this.seaLevel - 0.5 * (1 - t);
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
        this.setFade(1 - t);
        p.y = this.seaLevel - t * 0.7;
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
    // 摆尾与背鳍晃动
    this.tailPivot.rotation.y = Math.sin(elapsed * 5) * 0.35;
    this.fin.rotation.z = Math.sin(elapsed * 3.2) * 0.14;
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

  private setFade(f: number): void {
    this.shadowMat.opacity = 0.55 * f;
    this.finMat.opacity = 0.95 * f;
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.shadowMat.dispose();
    this.finMat.dispose();
  }
}
