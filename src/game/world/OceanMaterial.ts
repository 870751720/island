import * as THREE from 'three';
import type { OceanDepth } from './OceanDepth';

/**
 * 海水材质:在 MeshStandardMaterial 基础上按世界坐标采样深度,
 * 浅水透底、深水遮蔽海底边缘;程序波纹、浅滩光纹与沿岸碎浪共用一个绘制批次。
 * 法线在世界空间构造后转换到视图空间,保持镜头移动时的光照一致。
 */
export class OceanMaterial {
  readonly material: THREE.MeshStandardMaterial;
  private readonly uniforms = {
    uTime: { value: 0 },
    uDepth: { value: null as THREE.DataTexture | null },
    uHalfExtent: { value: new THREE.Vector2(1, 1) },
  };

  constructor(depth: OceanDepth) {
    this.uniforms.uDepth.value = depth.texture;
    this.uniforms.uHalfExtent.value.set(depth.halfExtentX, depth.halfExtentZ);
    this.material = new THREE.MeshStandardMaterial({
      color: '#3d97b8',
      roughness: 0.3,
      metalness: 0,
      transparent: true,
    });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec2 vOceanWorld;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vOceanWorld = (modelMatrix * vec4(position, 1.0)).xz;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform sampler2D uDepth;
           uniform vec2 uHalfExtent;
           varying vec2 vOceanWorld;

           // 世界坐标处的归一化深度:纹理覆盖外明确返回深海,不延伸边缘
           float oceanDepth(vec2 p) {
             vec2 uv = p / (2.0 * uHalfExtent) + 0.5;
             if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0;
             return texture2D(uDepth, uv).r;
           }`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           {
             float d = oceanDepth(vOceanWorld);
             vec2 p = vOceanWorld;
             vec3 shallow = vec3(0.32, 0.76, 0.65);
             vec3 lagoon = vec3(0.055, 0.49, 0.56);
             vec3 deep = vec3(0.025, 0.19, 0.34);
             vec3 sea = mix(shallow, lagoon, smoothstep(0.015, 0.24, d));
             sea = mix(sea, deep, smoothstep(0.22, 0.6, d));
             float swell = sin(dot(p, vec2(0.38, 0.22)) - uTime * 0.65);
             float ripple = sin(dot(p, vec2(-0.57, 0.83)) - uTime * 0.85
               + swell * 0.65);
             sea *= 1.0 + swell * 0.035 + ripple * 0.025;

             // 宽而柔和的交错光纹只出现在浅滩,缩远时自然淡出。
             float detail = 1.0 - smoothstep(0.35, 1.2, length(fwidth(p)));
             float lattice = sin(p.x * 2.1 + ripple * 0.6 + uTime * 0.38)
               * sin(p.y * 1.8 + swell * 0.7 - uTime * 0.32);
             float caustic = smoothstep(0.58, 0.94, lattice) * detail
               * smoothstep(0.015, 0.07, d) * (1.0 - smoothstep(0.13, 0.38, d));
             sea += vec3(0.10, 0.15, 0.10) * caustic;

             // 等深线上的浪峰向岸推进,沿岸相位与强度变化打散整齐的白环。
             float breakup = sin(p.x * 0.73 + sin(p.y * 0.51))
               * sin(p.y * 0.91 - uTime * 0.24);
             float surf = sin(d * 65.0 + uTime * 1.15 + swell * 0.65);
             float aa = max(fwidth(surf), 0.045);
             float foam = smoothstep(0.78 - aa, 0.92 + aa, surf)
               * smoothstep(0.008, 0.035, d) * (1.0 - smoothstep(0.12, 0.24, d))
               * smoothstep(-0.65, 0.5, breakup) * 0.75;
             diffuseColor.rgb = mix(sea, vec3(0.82, 0.91, 0.85), foam);
             // 边缘水深约 0.67(1.75/2.6),过渡在其之前完成,遮住方形海底终止线
             diffuseColor.a = mix(0.42, 1.0, smoothstep(0.015, 0.55, d));
             diffuseColor.a = mix(diffuseColor.a, 0.96, foam);
           }`
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
           {
             vec2 p = vOceanWorld;
             vec2 slope = vec2(0.38, 0.22) * 0.16
               * cos(dot(p, vec2(0.38, 0.22)) - uTime * 0.65);
             slope += vec2(-0.57, 0.83) * 0.075
               * cos(dot(p, vec2(-0.57, 0.83)) - uTime * 0.85);
             slope += vec2(1.7, 1.1) * 0.018
               * cos(dot(p, vec2(1.7, 1.1)) - uTime * 1.1);
             normal = normalize(mat3(viewMatrix) * vec3(-slope.x, 1.0, -slope.y));
           }`
        );
    };
  }

  update(elapsed: number): void {
    this.uniforms.uTime.value = elapsed;
  }

  dispose(): void {
    this.material.dispose();
  }
}
