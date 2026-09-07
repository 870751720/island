import * as THREE from 'three';

const WOUND_COLOR = '#6e1a10';
const DROP_COLOR = '#b0231a';
/** 血滴生成间隔(秒) */
const DROP_INTERVAL = 0.22;
/** 血滴存活时长(秒),短命避免随肢体摆动明显漂移 */
const DROP_LIFETIME = 0.45;
const DROP_POOL = 10;

/** 单个伤口:贴在某个身体部位表面的暗红贴片,记录挂点供血滴出生 */
interface Wound {
  mesh: THREE.Mesh;
  parent: THREE.Mesh;
  localPos: THREE.Vector3;
}

interface Drop {
  mesh: THREE.Mesh;
  parent: THREE.Mesh | null;
  vel: THREE.Vector3;
  life: number;
}

/** 按血量分档的伤口数量:<50 开始带伤,<35 加重,<20 全开并渗血滴落 */
function woundCount(health: number): number {
  if (health >= 50) return 0;
  if (health >= 35) return 3;
  if (health >= 20) return 4;
  return 5;
}

/** 玩家持续受伤外观:身上伤口贴片随伤势浮现,濒死(<20)时伤口滴落血滴 */
export class InjuryFx {
  private wounds: Wound[] = [];
  private drops: Drop[] = [];
  private dropTimer = 0;

  constructor(parts: { torso: THREE.Mesh; armL: THREE.Mesh; legL: THREE.Mesh }) {
    const mat = new THREE.MeshStandardMaterial({
      color: WOUND_COLOR,
      flatShading: true,
      roughness: 1,
    });
    const dropMat = new THREE.MeshStandardMaterial({
      color: DROP_COLOR,
      flatShading: true,
      roughness: 1,
    });

    // 伤口贴片:薄盒贴在躯干/手臂/大腿表面,略凸出避免被身体面穿插吞掉
    const placements: Array<{
      parent: THREE.Mesh;
      pos: [number, number, number];
      size: [number, number, number];
    }> = [
      { parent: parts.torso, pos: [0.1, 0.08, 0.15], size: [0.1, 0.16, 0.03] },
      { parent: parts.torso, pos: [0.23, -0.1, 0.02], size: [0.03, 0.14, 0.08] },
      { parent: parts.torso, pos: [-0.08, 0.12, -0.15], size: [0.08, 0.1, 0.03] },
      { parent: parts.armL, pos: [-0.07, 0.05, 0.02], size: [0.03, 0.12, 0.06] },
      { parent: parts.legL, pos: [0.03, 0.05, 0.08], size: [0.06, 0.14, 0.03] },
    ];
    for (const p of placements) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...p.size), mat);
      mesh.position.set(...p.pos);
      mesh.visible = false;
      p.parent.add(mesh);
      this.wounds.push({ mesh, parent: p.parent, localPos: mesh.position.clone() });
    }

    // 血滴对象池:懒挂到出血伤口所在部位,落完隐藏复用
    const dropGeo = new THREE.IcosahedronGeometry(0.035, 0);
    for (let i = 0; i < DROP_POOL; i++) {
      const mesh = new THREE.Mesh(dropGeo, dropMat);
      mesh.visible = false;
      this.drops.push({ mesh, parent: null, vel: new THREE.Vector3(), life: 0 });
    }
  }

  update(delta: number, health: number): void {
    const count = woundCount(health);
    for (let i = 0; i < this.wounds.length; i++) this.wounds[i].mesh.visible = i < count;

    // 濒死渗血:从已显现的伤口随机滴落
    if (count === this.wounds.length) {
      this.dropTimer -= delta;
      if (this.dropTimer <= 0) {
        this.dropTimer = DROP_INTERVAL;
        this.spawnDrop(this.wounds[Math.floor(Math.random() * this.wounds.length)]);
      }
    }
    for (const d of this.drops) {
      if (d.life <= 0) continue;
      d.life -= delta;
      if (d.life <= 0) {
        d.mesh.visible = false;
        d.parent = null;
        continue;
      }
      d.vel.y -= 9 * delta;
      d.mesh.position.addScaledVector(d.vel, delta);
    }
  }

  private spawnDrop(wound: Wound): void {
    const drop = this.drops.find((d) => d.life <= 0);
    if (!drop) return;
    drop.parent = wound.parent;
    drop.mesh.position.copy(wound.localPos);
    drop.vel.set((Math.random() - 0.5) * 0.4, -0.3, (Math.random() - 0.5) * 0.4);
    drop.life = DROP_LIFETIME;
    drop.mesh.scale.setScalar(1);
    drop.mesh.visible = true;
    if (drop.mesh.parent !== wound.parent) {
      drop.mesh.parent?.remove(drop.mesh);
      wound.parent.add(drop.mesh);
    }
  }
}
