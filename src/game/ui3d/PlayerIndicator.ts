import * as THREE from 'three';
import { ArcRing, makeRingBackdrop, type RingSize } from './ProgressRing';

const PROGRESS_SIZE: RingSize = { inner: 0.32, outer: 0.48 };
const PROGRESS_COLOR = '#4caf50';
const STAMINA_SIZE: RingSize = { inner: 0.62, outer: 0.78 };
const STAMINA_COLOR = '#f1c40f';

/** 玩家身边的圆环指示:头顶作业进度环(始终朝向相机)+ 脚边水面上的体力环(游泳时);提示文字由 React UI 层渲染 */
export class PlayerIndicator {
  /** 锚定在玩家脚部位置 */
  readonly group = new THREE.Group();
  private head = new THREE.Group();
  private stamina = new THREE.Group();
  private headProgress: ArcRing;
  private staminaProgress: ArcRing;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.head.position.y = 2.1;
    this.head.add(makeRingBackdrop(PROGRESS_SIZE));
    this.headProgress = new ArcRing(PROGRESS_SIZE, PROGRESS_COLOR, 0.95);
    this.headProgress.mesh.position.z = 0.01; // 抬高一丁点避免与底环共面 z-fighting
    this.head.add(this.headProgress.mesh);
    this.group.add(this.head);

    // 体力环平铺在水面,环绕玩家
    this.stamina.rotation.x = -Math.PI / 2;
    this.stamina.position.y = 0.06;
    this.stamina.add(makeRingBackdrop(STAMINA_SIZE));
    this.staminaProgress = new ArcRing(STAMINA_SIZE, STAMINA_COLOR, 0.85);
    this.staminaProgress.mesh.position.z = 0.01;
    this.stamina.add(this.staminaProgress.mesh);
    this.group.add(this.stamina);

    this.headProgress.setArc(null);
    this.staminaProgress.setArc(null);
    scene.add(this.group);
  }

  /** 头顶作业进度(0-1 或 null),并同步朝向相机 */
  setProgress(progress: number | null): void {
    this.head.visible = progress !== null;
    this.head.quaternion.copy(this.camera.quaternion);
    this.headProgress.setArc(progress);
  }

  /** 脚边体力环(0-1 或 null),仅在游泳时显示 */
  setStamina(stamina: number | null): void {
    this.stamina.visible = stamina !== null;
    this.staminaProgress.setArc(stamina);
  }
}
