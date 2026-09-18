import * as THREE from 'three';
import { FlameGroundGlow } from './FlameGroundGlow';
import type { IslandTerrain } from './IslandTerrain';

/** 火光类点光源的统一参数口径:颜色由各摆件自定,这里只管池 */
type FlameLightSpec = {
  color: string;
  intensity: number;
  distance: number;
  decay: number;
};

/** 不加入场景的逻辑火源，数量不受 GPU 灯位限制。 */
export type FlameLight = Omit<FlameLightSpec, 'color'> & { color: THREE.Color; position: THREE.Vector3 };

/**
 * 固定大小点光源池:所有池灯常驻场景(闲置时强度 0、距离 0 不影响画面),
 * 火把/火堆/烹饪台/冶炼炉注册逻辑火源，按视野与距离动态分配灯位。场景光源总数恒定,
 * 避免运行时增删光源触发全材质着色器重编译造成的一次性卡顿
 * (放置/挖走火把、点燃/燃尽火堆的瞬间)。
 */
export class LightPool {
  private groundGlow?: FlameGroundGlow;
  private readonly sources = new Set<FlameLight>();
  private readonly slots: { light: THREE.PointLight; source: FlameLight | null }[] = [];
  private readonly frustum = new THREE.Frustum();
  private readonly matrix = new THREE.Matrix4();
  private readonly sphere = new THREE.Sphere();
  private readonly candidates: { source: FlameLight; score: number }[] = [];

  constructor(scene: THREE.Scene, size: number) {
    for (let i = 0; i < size; i++) {
      const light = new THREE.PointLight('#ff9d2e', 0, 0, 1.5);
      scene.add(light);
      this.slots.push({ light, source: null });
    }
  }

  /** 所有火源都注册，距离和闪烁始终由实体更新。 */
  claim(position: THREE.Vector3, y: number, spec: FlameLightSpec, groundGlow = false): FlameLight {
    const source = { ...spec, color: new THREE.Color(spec.color), position: position.clone() };
    source.position.y += y;
    this.sources.add(source);
    if (groundGlow) this.groundGlow?.add(source, position);
    return source;
  }

  release(source: FlameLight): void {
    this.sources.delete(source);
    this.groundGlow?.remove(source);
  }

  /** 在任何实体注册前，绑定当前世界的地形。 */
  setGround(scene: THREE.Scene, terrain: IslandTerrain): void {
    this.groundGlow?.dispose();
    this.groundGlow = new FlameGroundGlow(scene, terrain);
  }

  update(camera: THREE.Camera, focus: THREE.Vector3, delta: number): void {
    this.groundGlow?.flush();
    camera.updateMatrixWorld();
    this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
    this.candidates.length = 0;
    for (const source of this.sources) {
      this.sphere.set(source.position, source.distance);
      if (source.intensity <= 0 || !this.frustum.intersectsSphere(this.sphere)) continue;
      const held = this.slots.some(slot => slot.source === source);
      // 已分配火源稍有优先，避免相近距离的灯位来回切换。
      const score = source.position.distanceToSquared(focus) * (held ? 0.8 : 1);
      const at = this.candidates.findIndex(candidate => score < candidate.score);
      this.candidates.splice(at < 0 ? this.candidates.length : at, 0, { source, score });
      if (this.candidates.length > this.slots.length) this.candidates.pop();
    }
    for (const slot of this.slots) {
      if (!this.candidates.some(candidate => candidate.source === slot.source)) slot.source = null;
    }
    for (const { source } of this.candidates) {
      if (this.slots.some(slot => slot.source === source)) continue;
      const slot = this.slots.find(slot => !slot.source);
      if (slot) { slot.source = source; slot.light.intensity = 0; }
    }
    for (const { light, source } of this.slots) {
      if (!source) { light.intensity = 0; continue; }
      light.position.copy(source.position);
      light.color.copy(source.color);
      light.distance = source.distance;
      light.decay = source.decay;
      light.intensity = THREE.MathUtils.lerp(light.intensity, source.intensity, 1 - Math.exp(-delta * 12));
    }
  }

  dispose(): void {
    this.groundGlow?.dispose();
    this.sources.clear();
    for (const slot of this.slots) { slot.light.removeFromParent(); slot.light.dispose(); }
    this.slots.length = 0;
  }
}
