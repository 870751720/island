import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';

const RESOLUTION = 128;
/** 深度归一化上限(米):纹理只存 0-1,边缘水深约 1.75,留出裕量 */
const MAX_DEPTH = 2.6;
/** 纹理覆盖范围在岛界外保留的余量(米),覆盖近岸浅滩即可 */
const MARGIN = 8;

/**
 * 海水深度贴图:初始化时按渲染地形的实际高度采样一次,生成低分辨率单通道纹理。
 * 纹理覆盖范围之外由着色器直接返回深海值(归一化 1),不做边缘无限延伸。
 */
export class OceanDepth {
  readonly texture: THREE.DataTexture;
  /** 纹理覆盖的世界半宽(米),以原点为中心 */
  readonly halfExtent: number;

  constructor(terrain: IslandTerrain) {
    this.halfExtent = terrain.size / 2 + MARGIN;
    const size = RESOLUTION;
    const data = new Uint8Array(size * size);
    for (let j = 0; j < size; j++) {
      const z = ((j / (size - 1)) * 2 - 1) * this.halfExtent;
      for (let i = 0; i < size; i++) {
        const x = ((i / (size - 1)) * 2 - 1) * this.halfExtent;
        const depth = Math.max(0, terrain.seaLevel - terrain.getHeight(x, z));
        data[j * size + i] = Math.round(THREE.MathUtils.clamp(depth / MAX_DEPTH, 0, 1) * 255);
      }
    }
    this.texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
