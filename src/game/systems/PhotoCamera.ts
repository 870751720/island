import * as THREE from 'three';

/** 基础跟随视角的斜俯偏移(与 Game.updateCamera 常规视角一致):仰角约 40°、水平方位 0° */
const BASE_PITCH = Math.atan2(24, Math.hypot(20, 20));
const BASE_DIST = Math.hypot(24, Math.hypot(20, 20));
/** 缩放倍率范围:1 为常规视角 */
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 5;
/** 俯仰角范围(弧度):约 12° 低角度 ~ 85° 接近俯视 */
const PITCH_MIN = (12 * Math.PI) / 180;
const PITCH_MAX = (85 * Math.PI) / 180;
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
  /** 俯仰角(弧度,越大越接近俯视) */
  pitch = BASE_PITCH;

  enter(origin: THREE.Vector3): void {
    this.active = true;
    this.center.copy(origin);
    this.zoom = 1;
    this.yaw = 0;
    this.pitch = BASE_PITCH;
  }

  exit(): void {
    this.active = false;
  }

  /** 相机相对注视点的偏移:固定距离下按 yaw(水平方位)与 pitch(俯仰角)定位 */
  offset(out = new THREE.Vector3()): THREE.Vector3 {
    const h = BASE_DIST * Math.cos(this.pitch);
    return out.set(Math.sin(this.yaw) * h, BASE_DIST * Math.sin(this.pitch), Math.cos(this.yaw) * h);
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

  /** 俯仰(双指上下滑动):上滑抬高视角、下滑压低视角,范围约 12°~85° */
  rotatePitch(delta: number): void {
    this.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.pitch + delta));
  }
}
