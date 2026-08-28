import * as THREE from 'three';

const BAND = 0.2; // 水线附近的浪花带宽(高度差)
const REFRESH = 0.25; // 强度重算间隔(秒)
const RISING_OPACITY = 0.55;
const EBB_OPACITY = 0.06;

/** 贴着水线的白色浪花带:涨潮时明显,退潮时几乎隐去 */
export class Foam {
  readonly mesh: THREE.Mesh;
  private terrainH: Float32Array;
  private intensities: Float32Array;
  private timer = REFRESH;
  private opacity = 0;

  constructor(size: number, heightAt: (x: number, z: number) => number) {
    const segments = 96;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    this.terrainH = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.terrainH[i] = heightAt(pos.getX(i), pos.getZ(i));
    }
    this.intensities = new Float32Array(pos.count * 3);
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.intensities, 3)
    );
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.mesh.position.y = -0.35;
  }

  update(delta: number, waterY: number, rising: boolean): void {
    this.mesh.position.y = waterY + 0.015;
    // 透明度朝目标平滑过渡,潮汐转向时浪花渐显/渐隐
    const target = rising ? RISING_OPACITY : EBB_OPACITY;
    this.opacity += (target - this.opacity) * Math.min(1, delta * 2);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = this.opacity;

    this.timer += delta;
    if (this.timer < REFRESH) return;
    this.timer = 0;
    for (let i = 0; i < this.terrainH.length; i++) {
      const intensity = Math.max(0, 1 - Math.abs(this.terrainH[i] - waterY) / BAND);
      this.intensities[i * 3] = intensity;
      this.intensities[i * 3 + 1] = intensity;
      this.intensities[i * 3 + 2] = intensity;
    }
    (this.mesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}
