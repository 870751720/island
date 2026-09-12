import * as THREE from 'three';
import { ArcRing, makeRingBackdrop, type RingSize } from './ProgressRing';

const PROGRESS_SIZE: RingSize = { inner: 0.32, outer: 0.48 };
const PROGRESS_COLOR = '#4caf50';

/** 玩家头顶的圆环指示(始终朝向相机):作业进度;游泳期间作业被禁用,复用为体力进度(从满递减);提示文字由 React UI 层渲染 */
export class PlayerIndicator {
  /** 锚定在玩家脚部位置 */
  readonly group = new THREE.Group();
  private head = new THREE.Group();
  private headProgress: ArcRing;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.head.position.y = 2.1;
    this.head.add(makeRingBackdrop(PROGRESS_SIZE));
    this.headProgress = new ArcRing(PROGRESS_SIZE, PROGRESS_COLOR, 0.95);
    this.headProgress.mesh.position.z = 0.01; // 抬高一丁点避免与底环共面 z-fighting
    this.head.add(this.headProgress.mesh);
    this.group.add(this.head);

    this.headProgress.setArc(null);
    scene.add(this.group);
  }

  /** 头顶进度(0-1 或 null),并同步朝向相机;raised 时抬高避让屏幕中央的全屏提示 */
  setProgress(progress: number | null, raised = false): void {
    this.head.visible = progress !== null;
    this.head.position.y = raised ? 3.2 : 2.1;
    this.head.quaternion.copy(this.camera.quaternion);
    this.headProgress.setArc(progress);
  }
}
