import * as THREE from 'three';
import type { AnimalModel } from './WildlifeModels';

export const CROC_CALM_TIME = 20;
const DURATION = 2;

/** 无战利品的退场表现；权威端结束后删除实体，客人等待快照移除。 */
export class CrocodileDeparture {
  elapsed = 0;
  private startY: number;
  private materials = new Set<THREE.Material>();
  private geometries = new Set<THREE.BufferGeometry>();

  constructor(private model: AnimalModel) {
    this.startY = model.group.position.y;
    model.group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      this.geometries.add(object.geometry);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        this.materials.add(material);
        material.transparent = true;
        material.depthWrite = false;
        material.needsUpdate = true;
      }
    });
  }

  update(delta: number): boolean {
    this.elapsed = Math.min(DURATION, this.elapsed + delta);
    const progress = this.elapsed / DURATION;
    const smooth = progress * progress * (3 - 2 * progress);
    this.model.group.position.y = this.startY - smooth * 0.8;
    this.model.group.rotation.x = smooth * 0.18;
    this.model.tail.rotation.y = Math.sin(this.elapsed * 8) * 0.3 * (1 - progress);
    for (const leg of this.model.legs) leg.rotation.x = -smooth * 0.6;
    for (const material of this.materials) material.opacity = 1 - smooth;
    return progress >= 1;
  }

  /** 鳄鱼模型独享几何体和材质，退场后释放 GPU 资源。 */
  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear();
    this.materials.clear();
  }
}
