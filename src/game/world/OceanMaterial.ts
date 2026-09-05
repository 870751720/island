import * as THREE from 'three';
import type { OceanDepth } from './OceanDepth';

/**
 * 海水材质:在 MeshStandardMaterial 基础上按世界坐标采样深度,
 * 浅水偏青透底、深水完全遮蔽海底边缘;叠加缓慢的低频波纹扰动法线,
 * 借助场景光照自然产生克制的波光,不移动实际水位。
 */
export class OceanMaterial {
  readonly material: THREE.MeshStandardMaterial;
  private readonly uniforms = {
    uTime: { value: 0 },
    uDepth: { value: null as THREE.DataTexture | null },
    uHalfExtent: { value: 1 },
  };

  constructor(depth: OceanDepth) {
    this.uniforms.uDepth.value = depth.texture;
    this.uniforms.uHalfExtent.value = depth.halfExtent;
    this.material = new THREE.MeshStandardMaterial({
      color: '#3d97b8',
      roughness: 0.5,
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
           uniform float uHalfExtent;
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
             // 浅滩透出沙底,近岸偏青,远处过渡到深蓝
             vec3 shallow = vec3(0.46, 0.78, 0.78);
             vec3 deep = vec3(0.10, 0.38, 0.56);
             diffuseColor.rgb = mix(shallow, deep, smoothstep(0.08, 0.62, d));
             // 边缘水深约 0.67(1.75/2.6),过渡在其之前完成,遮住方形海底终止线
             diffuseColor.a = mix(0.55, 1.0, smoothstep(0.22, 0.55, d));
           }`
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
           {
             // 两组缓慢低频波纹的解析梯度,轻微倾斜法线让光照带出稀疏波光
             vec2 p = vOceanWorld;
             float a = sin(p.x * 0.35 + uTime * 0.6);
             float b = sin(p.z * 0.28 - uTime * 0.45);
             float c = sin((p.x + p.z) * 0.15 + uTime * 0.3);
             float dx = (0.35 * cos(p.x * 0.35 + uTime * 0.6) + 0.15 * cos((p.x + p.z) * 0.15 + uTime * 0.3)) * 0.05;
             float dz = (0.28 * cos(p.z * 0.28 - uTime * 0.45) + 0.15 * cos((p.x + p.z) * 0.15 + uTime * 0.3)) * 0.05;
             normal = normalize(normal + vec3(-dx, 0.0, -dz));
             diffuseColor.rgb *= 1.0 + (a + b + c) * 0.012;
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
