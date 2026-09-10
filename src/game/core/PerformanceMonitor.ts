import type { WebGLRenderer } from 'three';

/** 本机诊断；只在开启时采样，不写存档或网络状态。 */
export class PerformanceMonitor {
  enabled = false;
  report = '等待采样…';
  renderMs = 0;
  private samples: number[] = [];
  private cpu = 0;
  private render = 0;
  private calls = 0;
  private triangles = 0;

  reset(): void {
    this.samples = [];
    this.cpu = this.render = this.calls = this.triangles = 0;
    this.report = '等待采样…';
  }

  record(interval: number, cpu: number, renderer: WebGLRenderer, role: string): void {
    // 切后台或恢复页面后的间隔不计入游戏性能。
    if (document.hidden || interval > 1000) { this.reset(); return; }
    this.samples.push(interval);
    this.cpu += cpu;
    this.render += this.renderMs;
    this.calls += renderer.info.render.calls;
    this.triangles += renderer.info.render.triangles;
    const total = this.samples.reduce((a, b) => a + b, 0);
    if (total < 1000) return;
    const n = this.samples.length;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const report = [
      `本机性能 · ${role} · ${n} 帧采样`,
      `FPS ${(n * 1000 / total).toFixed(1)} | 帧均 ${(total / n).toFixed(1)} ms`,
      `P95 ${sorted[Math.ceil(n * .95) - 1].toFixed(1)} | 最慢 ${sorted[n - 1].toFixed(1)} ms`,
      `逻辑 CPU ${Math.max(0, (this.cpu - this.render) / n).toFixed(1)} ms`,
      `渲染提交 CPU ${(this.render / n).toFixed(1)} ms（非 GPU 耗时）`,
      `绘制 ${Math.round(this.calls / n)} 次 | 三角形 ${Math.round(this.triangles / n)}`,
      `几何体 ${renderer.info.memory.geometries} | 纹理 ${renderer.info.memory.textures}`,
      `画布 ${renderer.domElement.width}×${renderer.domElement.height} | DPR ${renderer.getPixelRatio().toFixed(2)}`,
    ].join('\n');
    this.reset();
    this.report = report;
  }
}
