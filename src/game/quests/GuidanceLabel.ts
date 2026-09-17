import { Vector3, type Camera } from 'three';
import type { IslandTerrain } from '../world/IslandTerrain';

/** 本地屏幕文字：跟随目标，超出视野时沿方向收至安全边缘。 */
export class GuidanceLabel {
  private readonly element = document.createElement('div');
  private readonly anchor = new Vector3();

  constructor(private readonly container: HTMLElement) {
    this.element.style.cssText = 'position:absolute;inset:var(--game-safe-top,0px) var(--game-safe-right,0px) var(--game-safe-bottom,0px) var(--game-safe-left,0px);pointer-events:none;z-index:24;visibility:hidden;';
    this.element.innerHTML = '<span style="position:absolute;display:block;width:max-content;max-width:100%;font:600 13px/1.4 Arial,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;color:#fff2ce;text-shadow:0 1px 2px #302819cc,1px 0 1px #30281988,-1px 0 1px #30281988;text-align:center;transform:translate(-50%,-50%)"></span>';
    container.appendChild(this.element);
  }

  update(target: { x: number; z: number } | null, text: string, camera: Camera, terrain: IslandTerrain): void {
    if (!target || !text) { this.element.style.visibility = 'hidden'; return; }
    const label = this.element.firstElementChild as HTMLSpanElement;
    if (label.textContent !== text) label.textContent = text;
    const width = this.element.clientWidth, height = this.element.clientHeight;
    if (!width || !height) return;
    this.anchor.set(target.x, terrain.getHeight(target.x, target.z) + 0.8, target.z).project(camera);
    const dx = (this.anchor.x + 1) * this.container.clientWidth / 2 - this.element.offsetLeft - width / 2;
    const dy = (1 - this.anchor.y) * this.container.clientHeight / 2 - this.element.offsetTop - height / 2;
    const limitX = Math.max(0, width / 2 - label.offsetWidth / 2 - 12);
    const limitY = Math.max(0, height / 2 - label.offsetHeight / 2 - 12);
    const scale = Math.min(1, dx === 0 ? 1 : limitX / Math.abs(dx), dy === 0 ? 1 : limitY / Math.abs(dy));
    label.style.left = `${width / 2 + dx * scale}px`;
    label.style.top = `${height / 2 + dy * scale}px`;
    this.element.style.visibility = 'visible';
  }

  dispose(): void { this.element.remove(); }
}
