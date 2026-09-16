import * as THREE from 'three';

/** 世界坐标提示，每帧只更新位置，复用任务完成的字体、描边与淡入上浮动画。 */
export class WorldNoticePresentation {
  private active: { element: HTMLDivElement; position: THREE.Vector3; age: number }[] = [];
  private projected = new THREE.Vector3();

  constructor(private container: HTMLElement, private camera: THREE.Camera) {}

  show(text: string, position: THREE.Vector3): void {
    const element = document.createElement('div');
    element.className = 'quest-feedback-anchor';
    element.style.visibility = 'visible';
    const content = document.createElement('span');
    content.className = 'quest-feedback';
    content.style.display = 'block';
    content.style.color = '#f7d774';
    content.textContent = text;
    content.setAttribute('role', 'status');
    element.append(content);
    this.container.append(element);
    this.active.push({ element, position: position.clone().add(new THREE.Vector3(0, 0.65, 0)), age: 0 });
    this.update(0);
  }

  update(delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const notice = this.active[i];
      notice.age += delta;
      if (notice.age >= 1.6) {
        notice.element.remove();
        this.active.splice(i, 1);
        continue;
      }
      const p = this.projected.copy(notice.position).project(this.camera);
      notice.element.style.visibility = Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && Math.abs(p.z) <= 1 ? 'visible' : 'hidden';
      const x = (p.x + 1) * this.container.clientWidth / 2;
      const y = (1 - p.y) * this.container.clientHeight / 2;
      notice.element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }

  dispose(): void {
    for (const notice of this.active) notice.element.remove();
    this.active = [];
  }
}
