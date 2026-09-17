/** 页面横屏不依赖方向锁定权限；渲染器跟随逻辑容器尺寸。 */
export class LandscapeController {
  private enabled = false;

  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    window.addEventListener('resize', this.update);
    this.update();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.update();
  }

  private update = (): void => {
    const width = window.innerWidth, height = window.innerHeight;
    const rotated = this.enabled && height > width;
    const logicalWidth = rotated ? height : width;
    const logicalHeight = rotated ? width : height;
    this.root.dataset.rotated = String(rotated);
    this.root.style.width = `${logicalWidth}px`;
    this.root.style.height = `${logicalHeight}px`;
    this.root.style.transform = rotated ? `translateX(${width}px) rotate(90deg)` : 'translateZ(0)';
    this.root.style.setProperty('--game-vw', `${logicalWidth / 100}px`);
    this.root.style.setProperty('--game-vh', `${logicalHeight / 100}px`);
  };

  dispose(): void {
    window.removeEventListener('resize', this.update);
  }
}
