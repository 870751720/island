import * as THREE from 'three';

/** 将美术用 sRGB 色值转为材质 shader 使用的线性颜色。 */
function linearColor(hex: string): string {
  const color = new THREE.Color(hex);
  return `vec3(${color.r.toFixed(5)}, ${color.g.toFixed(5)}, ${color.b.toFixed(5)})`;
}

/** 从原始颜色提取层次，兼容普通材质与合并模型的顶点色。 */
export function seasonalPaletteShader(kind: 'plain' | 'foliage' | 'terrain'): string {
  if (kind === 'plain') return '';
  const foliage = kind === 'foliage';
  return `
    vec3 base = diffuseColor.rgb;
    float greenMask = smoothstep(0.015, 0.09, base.g - max(base.r, base.b));
    float tone = smoothstep(0.08, 0.48, base.g);
    vec3 summerColor = mix(${linearColor('#286c46')}, ${linearColor('#78b84c')}, tone);
    vec3 autumnColor = mix(${linearColor('#b95b3e')}, ${linearColor('#e5b853')}, tone);
    ${foliage ? '' : `autumnColor = mix(${linearColor('#827947')}, ${linearColor('#b7ad68')}, tone);`}
    diffuseColor.rgb = mix(diffuseColor.rgb, summerColor, uDry * greenMask * ${foliage ? '0.64' : '0.38'});
    diffuseColor.rgb = mix(diffuseColor.rgb, autumnColor, uAutumn * greenMask * ${foliage ? '0.88' : '0.48'});
  `;
}
