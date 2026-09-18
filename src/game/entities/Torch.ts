import * as THREE from 'three';
import { Facility } from './Facility';
import { clayMaterial } from '../world/ClayMaterial';
import type { FlameLight, LightPool } from '../world/LightPool';

export const TORCH_COLOR = '#ff9d2e';
const TORCH_LIGHT_SPEC = { color: TORCH_COLOR, intensity: 1.2, distance: 4.5, decay: 1.5 };

/** 火把:插地的树枝顶着永不熄灭的火苗,小范围照亮四周 */
function makeTorchMesh() {
  const group = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.5, 5), clayMaterial('#8a6239'));
  stick.position.y = 0.25;
  stick.castShadow = true;
  group.add(stick);
  // 缠在顶端的浸油布头
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.18, 5), clayMaterial('#6b4a26'));
  wrap.position.y = 0.48;
  group.add(wrap);
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: '#ffb84d', emissive: '#ff7b1c', flatShading: true, roughness: 0.4 }));
  flame.scale.y = 1.7;
  flame.position.y = 0.68;
  group.add(flame);
  return {
    group,
    flame,
    flameY: 0.68,
    update: (delta: number, elapsed: number, flame: THREE.Mesh, flameY: number) => {
      const flicker = 1 + Math.sin(elapsed * 11) * 0.08 + Math.sin(elapsed * 23) * 0.05;
      flame.scale.set(flicker, 1 / flicker, flicker);
      flame.rotation.y += delta * 3;
      flame.position.y = flameY + Math.sin(elapsed * 9) * 0.02;
    },
  };
}

/** 照明设施，与神龛平级；预览不领取世界光源。 */
export class Torch extends Facility<'torch'> {
  private readonly mesh = makeTorchMesh();
  private light: FlameLight | null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, private readonly lights?: LightPool) {
    super(scene, position, 'torch');
    this.group.add(this.mesh.group);
    this.light = lights?.claim(this.group.position, 0.7, TORCH_LIGHT_SPEC, true) ?? null;
  }

  update(delta: number, elapsed: number): void {
    this.mesh.update(delta, elapsed, this.mesh.flame, this.mesh.flameY);
    if (this.light) this.light.intensity = 1.2 * (1 + Math.sin(elapsed * 11) * 0.08 + Math.sin(elapsed * 23) * 0.05);
  }

  dispose(): void {
    if (this.light) this.lights?.release(this.light);
    this.light = null;
  }
}
