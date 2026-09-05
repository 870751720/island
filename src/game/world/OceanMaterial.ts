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
      roughness: 0.36,
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

           // 静态哈希噪声,用来打散泡沫边缘
           float oceanHash(vec2 p) {
             return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
           }

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
             vec3 deep = vec3(0.03, 0.24, 0.44);
             diffuseColor.rgb = mix(shallow, deep, smoothstep(0.06, 0.6, d));
             // 边缘水深约 0.67(1.75/2.6),过渡在其之前完成,遮住方形海底终止线
             diffuseColor.a = mix(0.55, 1.0, smoothstep(0.22, 0.55, d));

             // 岸边泡沫线:近岸窄带内一条随时间向岸推进再退去的湿边,
             // 噪声既错开各处相位也打散轮廓,避免一条均匀的死白线
             float n = oceanHash(floor(vOceanWorld * 6.0));
             float band = 1.0 - smoothstep(0.012, 0.07 + n * 0.03, d);
             float sweep = sin(d * 70.0 - uTime * 0.8 + n * 6.283) * 0.5 + 0.5;
             float edge = band * smoothstep(0.35, 0.9, sweep);
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 0.97), edge * 0.65);
           }`
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
           {
             // 两组缓慢低频波纹的解析梯度,轻微倾斜法线让光照带出稀疏波光
             vec2 p = vOceanWorld;
             float a = sin(p.x * 0.35 + uTime * 0.6);
             float b = sin(p.y * 0.28 - uTime * 0.45);
             float c = sin((p.x + p.y) * 0.15 + uTime * 0.3);
             float dx = (0.35 * cos(p.x * 0.35 + uTime * 0.6) + 0.15 * cos((p.x + p.y) * 0.15 + uTime * 0.3)) * 0.05;
             float dz = (0.28 * cos(p.y * 0.28 - uTime * 0.45) + 0.15 * cos((p.x + p.y) * 0.15 + uTime * 0.3)) * 0.05;
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
