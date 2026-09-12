import * as THREE from 'three';
import type { WaterArea } from './IslandTerrain';

/** 单层淡水材质:初始化采样洼底,运行时仅更新波纹时间和结冰淡出。 */
export class PondMaterial {
  readonly material: THREE.MeshStandardMaterial;
  private readonly depth: THREE.DataTexture;
  private readonly time = { value: 0 };

  constructor(area: WaterArea, heightAt: (x: number, z: number) => number) {
    const size = 64;
    const data = new Uint8Array(size * size);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = area.x + ((i + 0.5) / size * 2 - 1) * area.radius;
        const z = area.z + ((j + 0.5) / size * 2 - 1) * area.radius;
        data[j * size + i] = Math.round(THREE.MathUtils.clamp(
          (area.waterY - heightAt(x, z)) / 2, 0, 1
        ) * 255);
      }
    }
    this.depth = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    this.depth.minFilter = this.depth.magFilter = THREE.LinearFilter;
    this.depth.needsUpdate = true;
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.28, metalness: 0, transparent: true, depthWrite: false,
    });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uPondTime = this.time;
      shader.uniforms.uPondDepth = { value: this.depth };
      shader.uniforms.uPondBounds = { value: new THREE.Vector3(area.x, area.z, area.radius) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec2 vPondWorld;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vPondWorld = (modelMatrix * vec4(position, 1.0)).xz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uPondTime;
          uniform sampler2D uPondDepth;
          uniform vec3 uPondBounds;
          varying vec2 vPondWorld;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            vec2 p = vPondWorld;
            float d = texture2D(uPondDepth,
              (p - uPondBounds.xy) / (2.0 * uPondBounds.z) + 0.5).r * 2.0;
            float wave = sin(dot(p, vec2(0.85, 0.55)) - uPondTime * 0.65);
            float crossWave = sin(dot(p, vec2(-0.6, 1.1)) - uPondTime * 0.48);
            vec3 water = mix(vec3(0.30, 0.66, 0.49), vec3(0.055, 0.38, 0.34),
              smoothstep(0.04, 0.75, d));
            water = mix(water, vec3(0.025, 0.21, 0.25), smoothstep(0.65, 1.6, d));
            water *= 1.0 + wave * 0.025 + crossWave * 0.018;
            float detail = 1.0 - smoothstep(0.25, 0.85, length(fwidth(p)));
            float lattice = sin(p.x * 2.8 + crossWave * 0.6 + uPondTime * 0.3)
              * sin(p.y * 2.5 + wave * 0.6 - uPondTime * 0.24);
            float light = smoothstep(0.65, 0.95, lattice) * detail
              * smoothstep(0.04, 0.18, d) * (1.0 - smoothstep(0.65, 1.3, d));
            water += vec3(0.10, 0.15, 0.10) * light;
            diffuseColor.rgb = water;
            diffuseColor.a *= smoothstep(0.0, 0.12, d)
              * mix(0.32, 0.82, smoothstep(0.06, 1.2, d));
          }`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          {
            vec2 p = vPondWorld;
            vec2 slope = vec2(0.85, 0.55) * 0.045
              * cos(dot(p, vec2(0.85, 0.55)) - uPondTime * 0.65);
            slope += vec2(-0.6, 1.1) * 0.028
              * cos(dot(p, vec2(-0.6, 1.1)) - uPondTime * 0.48);
            normal = normalize(mat3(viewMatrix) * vec3(-slope.x, 1.0, -slope.y));
          }`);
    };
    this.material.customProgramCacheKey = () => 'pond-water-v1';
  }

  update(elapsed: number, frozen: number): void {
    this.time.value = elapsed;
    this.material.opacity = 1 - frozen;
  }

  dispose(): void {
    this.depth.dispose();
    this.material.dispose();
  }
}
