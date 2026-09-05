import * as THREE from 'three';
import type { IslandTerrain } from './IslandTerrain';

/** 纹理单轴分辨率上限(像素):按覆盖范围换算,保持每像素约 3 米 */
const MAX_RESOLUTION = 320;
/** 深度归一化上限(米):纹理只存 0-1,边缘水深约 1.75,留出裕量 */
const MAX_DEPTH = 2.6;
/** 纹理覆盖范围在岛界外保留的余量(米),覆盖近岸浅滩即可 */
const MARGIN = 8;

/**
 * 海水深度贴图:初始化时按渲染地形的实际高度采样一次,生成低分辨率单通道纹理。
 * 覆盖范围是与岛屿长宽一致的矩形;范围之外由着色器直接返回深海值(归一化 1),不做边缘无限延伸。
 */
export class OceanDepth {
  readonly texture: THREE.DataTexture;
  /** 纹理覆盖的世界范围(米):东西半宽与南北半长,以原点为中心 */
  readonly halfExtentX: number;
  readonly halfExtentZ: number;

  constructor(terrain: IslandTerrain) {
    this.halfExtentX = terrain.halfWidth + MARGIN;
    this.halfExtentZ = terrain.halfLength + MARGIN;
    const resX = Math.min(MAX_RESOLUTION, Math.max(8, Math.round((this.halfExtentX * 2) / 3)));
    const resZ = Math.min(MAX_RESOLUTION, Math.max(8, Math.round((this.halfExtentZ * 2) / 3)));
    const data = new Uint8Array(resX * resZ);
    for (let j = 0; j < resZ; j++) {
      const z = ((j / (resZ - 1)) * 2 - 1) * this.halfExtentZ;
      for (let i = 0; i < resX; i++) {
        const x = ((i / (resX - 1)) * 2 - 1) * this.halfExtentX;
        const depth = Math.max(0, terrain.seaLevel - terrain.getHeight(x, z));
        data[j * resX + i] = Math.round(THREE.MathUtils.clamp(depth / MAX_DEPTH, 0, 1) * 255);
      }
    }
    this.texture = new THREE.DataTexture(data, resX, resZ, THREE.RedFormat, THREE.UnsignedByteType);
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
