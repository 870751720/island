import * as THREE from 'three';
import { modelVisualParts } from '../core/ModelVisualParts';

/** 只重绘当前目标的表面。复用几何体，不改变季节材质或实例批次。 */
export class DigHighlight {
  private readonly group = new THREE.Group();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying float height;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec4 view = viewMatrix * world;
        viewNormal = normalize(normalMatrix * normal);
        viewDirection = -view.xyz;
        height = world.y;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform float time;
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying float height;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(viewNormal), normalize(viewDirection))), 2.0);
        float sweep = pow(0.5 + 0.5 * sin(height * 12.0 - time * 5.0), 8.0);
        float breath = 0.85 + 0.15 * sin(time * 4.0);
        gl_FragColor = vec4(vec3(1.0, 0.67, 0.16), (0.18 + rim * 0.38 + sweep * 0.26) * breath);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  constructor(scene: THREE.Scene) { scene.add(this.group); }

  update(target: THREE.Object3D | null, elapsed: number): void {
    this.material.uniforms.time.value = elapsed;
    let count = 0;
    const add = (geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) => {
      let mesh = this.meshes[count++];
      if (!mesh) {
        mesh = new THREE.Mesh(geometry, this.material);
        mesh.matrixAutoUpdate = false;
        mesh.renderOrder = 5;
        this.meshes.push(mesh);
        this.group.add(mesh);
      }
      mesh.geometry = geometry;
      mesh.matrix.copy(matrix);
      mesh.matrixWorldNeedsUpdate = true;
      mesh.visible = true;
    };
    if (target?.parent && target.visible) {
      target.updateWorldMatrix(true, true);
      target.traverseVisible(object => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (materials.some(material => material instanceof THREE.MeshStandardMaterial && !material.transparent)) {
            add(object.geometry, object.matrixWorld);
          }
        }
        for (const part of modelVisualParts.get(object) ?? []) {
          add(part.geometry, part.worldSpace ? part.matrix : this.matrix.multiplyMatrices(object.matrixWorld, part.matrix));
        }
      });
    }
    for (let i = count; i < this.meshes.length; i++) this.meshes[i].visible = false;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.clear();
    this.meshes.length = 0;
    this.material.dispose();
  }
}
