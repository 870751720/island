import * as THREE from 'three';

/** 单张平面内绘制双层断续细波,软化波峰边缘并随年龄消散。 */
export function createRippleMaterial(): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    color: '#d4ebe4', transparent: true, opacity: 0,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec2 vRipplePoint;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vRipplePoint = position.xy;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vRipplePoint;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 p = vRipplePoint;
          float angle = atan(p.y, p.x);
          float radius = length(p);
          float warp = sin(angle * 3.0 + 0.7) * 0.018
            + sin(angle * 5.0 - 1.2) * 0.009;
          float aa = max(fwidth(radius), 0.004);
          float outer = 1.0 - smoothstep(0.008, 0.022 + aa, abs(radius - 0.83 - warp));
          float inner = 1.0 - smoothstep(0.006, 0.018 + aa, abs(radius - 0.62 - warp * 0.7));
          float arcs = smoothstep(-0.45, 0.65, sin(angle * 3.0 + radius * 5.0));
          float echo = smoothstep(-0.2, 0.75, sin(angle * 2.0 - 1.4));
          diffuseColor.a *= outer * arcs + inner * echo * 0.45;
        }`);
  };
  material.customProgramCacheKey = () => 'soft-ripple-arcs-v1';
  return material;
}
