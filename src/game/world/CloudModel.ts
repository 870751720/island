import * as THREE from 'three';

type Lobe = readonly [x: number, y: number, rx: number, ry: number];
const SHAPES: readonly (readonly Lobe[])[] = [
  [[0.3, 0.54, 0.2, 0.25], [0.49, 0.43, 0.22, 0.32], [0.68, 0.54, 0.21, 0.24], [0.48, 0.64, 0.3, 0.16]],
  [[0.25, 0.56, 0.17, 0.22], [0.43, 0.49, 0.21, 0.26], [0.63, 0.55, 0.25, 0.22], [0.76, 0.61, 0.14, 0.16]],
  [[0.32, 0.56, 0.22, 0.23], [0.47, 0.4, 0.18, 0.29], [0.64, 0.51, 0.22, 0.28], [0.5, 0.64, 0.28, 0.16]],
];

/** 将相交的柔软云瓣烘焙为一张纹理，避免多层透明粒子叠加开销。 */
export function createCloudTexture(seed: number): THREE.DataTexture {
  const width = 256;
  const height = 128;
  const pixels = new Uint8Array(width * height * 4);
  const lobes = SHAPES[seed % SHAPES.length];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      // 低频扰动保留轻微絮状轮廓，不形成颗粒或分离碎片。
      const warp = Math.sin(u * 37 + v * 19 + seed) * Math.sin(v * 29 - u * 13) * 0.018;
      let density = 0;
      for (const [cx, cy, rx, ry] of lobes) {
        const d = ((u - cx + warp) / rx) ** 2 + ((v - cy + warp) / ry) ** 2;
        const falloff = Math.max(0, 1 - d);
        density += falloff * falloff;
      }
      const alpha = 1 - Math.exp(-density * 1.65);
      const index = (y * width + x) * 4;
      const shade = Math.round(255 - Math.max(0, v - 0.35) * 24);
      pixels[index] = shade;
      pixels[index + 1] = Math.min(255, shade + 2);
      pixels[index + 2] = Math.min(255, shade + 4);
      pixels[index + 3] = Math.round(alpha * 225);
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}
