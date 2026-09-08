import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Vec3 = [number, number, number];

/** 每个关节内按颜色合并装饰；不跨角色共享材质，兼容受击闪红。 */
export class ClayParts {
  private parts = new Map<string, THREE.BufferGeometry[]>();

  add(color: string, geometry: THREE.BufferGeometry, position: Vec3,
    scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0]): void {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    geometry.applyMatrix4(matrix);
    const list = this.parts.get(color) ?? [];
    list.push(geometry);
    this.parts.set(color, list);
  }

  oval(color: string, position: Vec3, scale: Vec3, rotation?: Vec3): void {
    this.add(color, new THREE.SphereGeometry(1, 12, 8), position, scale, rotation);
  }

  box(color: string, position: Vec3, scale: Vec3, rotation?: Vec3): void {
    // 倒角盒保持布包、口袋和扣件的平整表面，同时柔化边缘。
    const shape = new THREE.Shape();
    const r = Math.min(...scale) * 0.22;
    const w = scale[0] / 2 - r;
    const h = scale[1] / 2 - r;
    shape.moveTo(-w, -h);
    shape.lineTo(w, -h);
    shape.lineTo(w, h);
    shape.lineTo(-w, h);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: scale[2] - 2 * r, bevelEnabled: true, bevelSegments: 1,
      steps: 1, bevelSize: r, bevelThickness: r, curveSegments: 1,
    });
    geo.translate(0, 0, -(scale[2] - 2 * r) / 2);
    // ExtrudeGeometry 为非索引，统一索引形态后才能与球体合并。
    geo.setIndex(Array.from({ length: geo.attributes.position.count }, (_, i) => i));
    this.add(color, geo, position, [1, 1, 1], rotation);
  }

  ring(color: string, position: Vec3, radius: number, tube: number,
    scale: Vec3 = [1, 1, 1], rotation: Vec3 = [Math.PI / 2, 0, 0]): void {
    this.add(color, new THREE.TorusGeometry(radius, tube, 4, 16), position, scale, rotation);
  }

  finish(): THREE.Group {
    const group = new THREE.Group();
    for (const [color, parts] of this.parts) {
      const merged = mergeGeometries(parts);
      if (!merged) throw new Error('装备几何体合并失败');
      const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({
        color, roughness: 0.92, flatShading: true,
      }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      for (const part of parts) part.dispose();
    }
    this.parts.clear();
    return group;
  }
}
