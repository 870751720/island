import * as THREE from 'three';
import type { WaterArea } from './IslandTerrain';

/**
 * 水洼水面材质:与 OceanMaterial 同风格的 shader 化水面。
 * 不依赖深度贴图,直接在片元里按水洼的「椭圆 + 角向波动」边界公式
 * 计算归一化距离 d(0 中心、1 岸线),用 d 驱动深浅渐变、
 * 程序波纹、法线扰动与沿岸碎浪,每个水洼一份材质实例(共享同一份编译程序)。
 */
export function createPondMaterial(w: WaterArea): {
  material: THREE.MeshStandardMaterial;
  uniforms: { uTime: { value: number } };
} {
  const uniforms = {
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2(w.x, w.z) },
    uRx: { value: w.rx },
    uRz: { value: w.rz },
    uRot: { value: w.rot },
    uWa2: { value: w.wobA2 },
    uWp2: { value: w.wobP2 },
    uWa3: { value: w.wobA3 },
    uWp3: { value: w.wobP3 },
    uWa4: { value: w.wobA4 },
    uWp4: { value: w.wobP4 },
  };
  const material = new THREE.MeshStandardMaterial({
    color: '#3d97b8',
    roughness: 0.3,
    metalness: 0,
    transparent: true,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec2 vPondWorld;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vPondWorld = (modelMatrix * vec4(position, 1.0)).xz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform vec2 uCenter;
         uniform float uRx, uRz, uRot, uWa2, uWp2, uWa3, uWp3, uWa4, uWp4;
         varying vec2 vPondWorld;

         // 世界坐标处的归一化洼距:0 为洼心、1 为岸线,与地形 carve 用同一套边界公式
         float pondDist(vec2 p) {
           vec2 rel = p - uCenter;
           float ca = cos(uRot), sa = sin(uRot);
           vec2 l = vec2(rel.x * ca + rel.y * sa, -rel.x * sa + rel.y * ca);
           float ang = atan(l.y, l.x);
           float ellipse = 1.0 / sqrt(pow(cos(ang) / uRx, 2.0) + pow(sin(ang) / uRz, 2.0));
           float boundary = ellipse * (
             1.0 + uWa2 * sin(2.0 * ang + uWp2)
                 + uWa3 * sin(3.0 * ang + uWp3)
                 + uWa4 * sin(4.0 * ang + uWp4));
           return length(l) / boundary;
         }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           float d = clamp(pondDist(vPondWorld), 0.0, 1.0);
           vec2 p = vPondWorld;
           // 水洼最深处仅 1.6 米,只用浅滩-潟湖两档渐变,不到深海色
           vec3 shallow = vec3(0.32, 0.76, 0.65);
           vec3 lagoon = vec3(0.055, 0.49, 0.56);
           vec3 water = mix(shallow, lagoon, smoothstep(0.05, 0.75, d));
           // 波纹频率比海面高一档,匹配水洼几米级的尺度
           float swell = sin(dot(p, vec2(0.61, 0.35)) - uTime * 0.65);
           float ripple = sin(dot(p, vec2(-0.91, 1.33)) - uTime * 0.85 + swell * 0.65);
           water *= 1.0 + swell * 0.035 + ripple * 0.025;

           // 岸线附近的碎浪环:等距相位向岸推进,角向扰动打散整齐的白圈
           float breakup = sin(p.x * 0.73 + sin(p.y * 0.51)) * sin(p.y * 0.91 - uTime * 0.24);
           float surf = sin(d * 42.0 + uTime * 1.15 + swell * 0.65);
           float aa = max(fwidth(surf), 0.045);
           float foam = smoothstep(0.72 - aa, 0.9 + aa, surf)
             * smoothstep(0.55, 0.75, d) * (1.0 - smoothstep(0.9, 1.0, d))
             * smoothstep(-0.65, 0.5, breakup) * 0.7;
           diffuseColor.rgb = mix(water, vec3(0.82, 0.91, 0.85), foam);
           diffuseColor.a = mix(0.5, 0.9, smoothstep(0.1, 0.7, d));
           diffuseColor.a = mix(diffuseColor.a, 0.95, foam);
         }`
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
         {
           vec2 p = vPondWorld;
           vec2 slope = vec2(0.61, 0.35) * 0.16
             * cos(dot(p, vec2(0.61, 0.35)) - uTime * 0.65);
           slope += vec2(-0.91, 1.33) * 0.075
             * cos(dot(p, vec2(-0.91, 1.33)) - uTime * 0.85);
           normal = normalize(mat3(viewMatrix) * vec3(-slope.x, 1.0, -slope.y));
         }`
      );
  };
  return { material, uniforms };
}
