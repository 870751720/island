import * as THREE from 'three';

/** 基础跟随视角的斜俯偏移(与 Game.updateCamera 常规视角一致) */
const BASE_HEIGHT = 24;
const BASE_DIST = Math.hypot(20, 20);
/** 缩放倍率范围:1 为常规视角 */
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;
/** 平移范围:以进入时玩家为圆心限制注视点漂移,防止迷失 */
const PAN_LIMIT = 45;

/**
 * 相机模式(拍照模式)状态:注视点平移、正交缩放与绕注视点的水平旋转。
 * 纯本地表现状态,不参与联机同步;退出后相机平滑回到玩家跟随。
 */
export class PhotoCamera {
  active = false;
  /** 当前注视点(世界坐标) */
  readonly center = new THREE.Vector3();
  /** 正交缩放倍率(越大越放大) */
  zoom = 1;
  /** 绕注视点的水平旋转角(弧度,0 为默认正南俯视) */
  yaw = 0;

  enter(origin: THREE.Vector3): void {
    this.active = true;
    this.center.copy(origin);
    this.zoom = 1;
    this.yaw = 0;
  }

  exit(): void {
    this.active = false;
  }

  /** 相机相对注视点的偏移:基础偏移绕竖轴旋转 yaw */
  offset(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.sin(this.yaw) * BASE_DIST, BASE_HEIGHT, Math.cos(this.yaw) * BASE_DIST);
  }

  /** 单指拖动按屏幕像素平移注视点(画面内容随手移动),以锚点为圆心限制漂移范围 */
  pan(dxPx: number, dyPx: number, worldPerPx: number, anchor: THREE.Vector3): void {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    this.center.x -= (dxPx * c + dyPx * s) * worldPerPx;
    this.center.z -= (-dxPx * s + dyPx * c) * worldPerPx;
    const ex = this.center.x - anchor.x;
    const ez = this.center.z - anchor.z;
    const dist = Math.hypot(ex, ez);
    if (dist > PAN_LIMIT) {
      this.center.x = anchor.x + (ex / dist) * PAN_LIMIT;
      this.center.z = anchor.z + (ez / dist) * PAN_LIMIT;
    }
  }

  zoomBy(factor: number): void {
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * factor));
  }

  rotate(delta: number): void {
    this.yaw += delta;
  }
}
