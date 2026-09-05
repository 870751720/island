import * as THREE from 'three';

/** 死亡倒地时长(侧翻 90°) */
const FALL_TIME = 0.45;
/** 倒地后尸体停留的时长,之后才开始渐隐 */
export const DEATH_HOLD = 5;
/** 渐隐时长 */
const FADE_TIME = 5;
/** 受击闪红时长 */
const FLASH_TIME = 0.25;
const FLASH_COLOR = new THREE.Color('#c8321e');

type DeathAnim = {
  t: number;
  /** 侧翻方向(随机左右,避免成排尸体同向) */
  dir: number;
  materials: THREE.MeshStandardMaterial[];
  /** 空中生物死亡时坠落到该高度(地面生物不填) */
  fallFromY: number | null;
  fallToY: number;
  /** 尸体完全消失后回调(房主用于移除实体;客人端实体清理由姿态快照缺失驱动,不传) */
  onDone?: () => void;
};

type FlashAnim = {
  left: number;
  /** 闪红期间各材质的原始自发光,用于渐退恢复 */
  saved: Map<THREE.MeshStandardMaterial, THREE.Color>;
};

/**
 * 生物的通用视觉反馈:受击闪红 + 死亡倒地/坠落、停留、渐隐。
 * 每个生物系统各持有一个实例,房主 update 与客人 netUpdate 的入口各调用一次 update。
 */
export class CreatureFx {
  private deaths = new Map<THREE.Group, DeathAnim>();
  private flashes = new Map<THREE.Group, FlashAnim>();

  /** 收集组内全部材质(每个模型的材质都是独立实例,改属性不会污染其他生物) */
  private collectMaterials(group: THREE.Group): THREE.MeshStandardMaterial[] {
    const materials: THREE.MeshStandardMaterial[] = [];
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.isMeshStandardMaterial && !materials.includes(mat)) materials.push(mat);
      }
    });
    return materials;
  }

  /** 播放死亡:先侧翻倒地(空中生物同时坠落),停留 DEATH_HOLD 秒后渐隐,结束由 update 隐藏模型 */
  playDeath(group: THREE.Group, groundY?: number, onDone?: () => void): void {
    if (this.deaths.has(group)) return;
    const fall = groundY !== undefined && group.position.y > groundY + 0.05;
    this.deaths.set(group, {
      t: 0,
      dir: Math.random() < 0.5 ? -1 : 1,
      materials: this.collectMaterials(group),
      fallFromY: fall ? group.position.y : null,
      fallToY: groundY ?? group.position.y,
      onDone,
    });
    // 死亡即进入透明通道并重编译材质:渐隐期间只改 opacity,避免运行时切 transparent 的时序问题
    for (const mat of this.deaths.get(group)!.materials) {
      mat.transparent = true;
      mat.opacity = 1;
      mat.needsUpdate = true;
    }
  }

  /** 受击闪红:材质自发光短暂泛红后恢复 */
  flash(group: THREE.Group): void {
    const saved = new Map<THREE.MeshStandardMaterial, THREE.Color>();
    for (const mat of this.collectMaterials(group)) {
      if (this.deaths.has(group)) break;
      saved.set(mat, mat.emissive.clone());
      mat.emissive.copy(FLASH_COLOR);
    }
    if (saved.size > 0) this.flashes.set(group, { left: FLASH_TIME, saved });
  }

  /** 重生时恢复模型:清除残余死亡状态,还原透明度与侧翻 */
  reset(group: THREE.Group): void {
    this.deaths.delete(group);
    this.flashes.delete(group);
    group.rotation.z = 0;
    for (const mat of this.collectMaterials(group)) {
      mat.transparent = false;
      mat.opacity = 1;
      mat.needsUpdate = true;
    }
  }

  /** 推进死亡与闪红动画;每帧由所属生物系统调用一次(房主与客人端各自驱动) */
  update(delta: number): void {
    for (const [group, death] of this.deaths) {
      death.t += delta;
      const roll = Math.PI / 2;
      if (death.t < FALL_TIME) {
        // 倒地:加速侧翻,空中生物同时下坠
        const k = Math.pow(death.t / FALL_TIME, 2);
        group.rotation.z = death.dir * roll * k;
        if (death.fallFromY !== null) {
          group.position.y = death.fallFromY + (death.fallToY - death.fallFromY) * k;
        }
      } else if (death.fallFromY !== null && group.position.y > death.fallToY) {
        // 倒地已结束但还没落地(坠落距离长于侧翻时间):继续以固定速度下坠
        group.rotation.z = death.dir * roll;
        group.position.y = Math.max(death.fallToY, group.position.y - 9 * delta);
      } else {
        group.rotation.z = death.dir * roll;
        const fade = death.t - FALL_TIME - DEATH_HOLD;
        if (fade > 0) {
          // 渐隐:开方曲线前段掉得快(线性 alpha 在 1→0.6 区间肉眼几乎不可见,会把变化堆到最后一瞬)
          const k = Math.min(1, fade / FADE_TIME);
          const opacity = 1 - Math.sqrt(k);
          for (const mat of death.materials) mat.opacity = opacity;
          if (fade <= delta) {
            // 渐隐开始的瞬间关掉投影:阴影无法随透明度变淡,留到结束会整块突然消失
            group.traverse((obj) => {
              if ((obj as THREE.Mesh).isMesh) obj.castShadow = false;
            });
          }
          if (opacity <= 0) {
            group.visible = false;
            this.deaths.delete(group);
            this.reset(group);
            death.onDone?.();
          }
        }
      }
    }
    for (const [group, flash] of this.flashes) {
      flash.left -= delta;
      if (flash.left <= 0) {
        for (const [mat, color] of flash.saved) mat.emissive.copy(color);
        this.flashes.delete(group);
      } else {
        const k = flash.left / FLASH_TIME;
        for (const [mat, color] of flash.saved) mat.emissive.copy(color).lerp(FLASH_COLOR, k);
      }
    }
  }
}
