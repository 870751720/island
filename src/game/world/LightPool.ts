import * as THREE from 'three';

/** 火光类点光源的统一参数口径:颜色由各摆件自定,这里只管池 */
type FlameLightSpec = {
  color: string;
  intensity: number;
  distance: number;
  decay: number;
};

/**
 * 固定大小点光源池:所有池灯常驻场景(闲置时强度 0、距离 0 不影响画面),
 * 火把/火堆/烹饪台点亮时领取、熄灭或移除时归还。场景光源总数恒定,
 * 避免运行时增删光源触发全材质着色器重编译造成的一次性卡顿
 * (放置/挖走火把、点燃/燃尽火堆的瞬间)。
 */
export class LightPool {
  private free: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene, size: number) {
    for (let i = 0; i < size; i++) {
      const light = new THREE.PointLight('#ff9d2e', 0, 0, 1.5);
      scene.add(light);
      this.free.push(light);
    }
  }

  /** 领一盏灯放在世界坐标 position 上方 y 处;池空返回 null,调用方保持无动态光照表现 */
  claim(position: THREE.Vector3, y: number, spec: FlameLightSpec): THREE.PointLight | null {
    const light = this.free.pop();
    if (!light) return null;
    light.position.set(position.x, position.y + y, position.z);
    light.color.set(spec.color);
    light.intensity = spec.intensity;
    light.distance = spec.distance;
    light.decay = spec.decay;
    return light;
  }

  /** 归还一盏灯:熄灭并回池,等待下一个领用者 */
  release(light: THREE.PointLight): void {
    light.intensity = 0;
    light.distance = 0;
    this.free.push(light);
  }
}
