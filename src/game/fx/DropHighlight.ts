import * as THREE from 'three';

/** Reuses each item's draw calls: a soft rim and a slow gold sweep, without bloom. */
export class DropHighlight {
  private time = { value: 0 };

  apply(model: THREE.Object3D): void {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.onBeforeCompile = (shader) => {
          shader.uniforms.dropTime = this.time;
          shader.vertexShader = 'varying float dropHeight;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
            '#include <begin_vertex>\ndropHeight = position.y;');
          shader.fragmentShader = 'uniform float dropTime;\nvarying float dropHeight;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
            #include <emissivemap_fragment>
            float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
            float sweep = pow(0.5 + 0.5 * sin(dropHeight * 11.0 - dropTime * 2.2), 10.0);
            float breath = 0.75 + 0.25 * sin(dropTime * 1.7);
            totalEmissiveRadiance += vec3(1.0, 0.78, 0.34) * (0.12 + rim * 0.65 + sweep * 0.4) * breath;
          `);
        };
        material.customProgramCacheKey = () => 'drop-highlight-v1';
        material.needsUpdate = true;
      }
    });
  }

  update(elapsed: number): void {
    this.time.value = elapsed;
  }
}
