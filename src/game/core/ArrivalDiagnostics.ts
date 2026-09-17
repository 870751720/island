/** 登岛期间的有界内存日志，不读取存档内容或联机凭证。 */
class ArrivalDiagnostics {
  private entries: string[] = [];
  private started = 0;
  private active = false;
  failed = false;
  stage = '等待初始化';

  begin(mode: string, hasSave: boolean): void {
    this.entries = [];
    this.started = performance.now();
    this.active = true;
    this.failed = false;
    this.stage = '等待画面绘制';
    this.record('启动', `模式=${mode}, 已有存档=${hasSave}, 时间=${new Date().toISOString()}`);
  }

  record(label: string, detail = ''): void {
    if (!this.active) return;
    this.entries.push(`${Math.round(performance.now() - this.started)}ms ${label} ${detail}`.trim());
    if (this.entries.length > 100) this.entries.splice(1, 1);
  }

  mark(stage: string): void {
    if (!this.active) return;
    this.stage = stage;
    this.record(stage);
  }

  error(label: string, error: unknown): void {
    if (!this.active) return;
    this.failed = true;
    const detail = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}`
      : typeof error === 'string' ? error : '非 Error 异常（未导出对象内容）';
    this.record(label, detail.slice(0, 6000));
  }

  stop(): void { this.active = false; }

  report(): string {
    const clean = (value: string) => value
      .replace(/((?:https?|file):\/\/[^\s?#)]+)[?#][^\s)]*/g, '$1')
      .replace(/(token|password|authorization|roomCode)\s*[:=]\s*[^\s,;]+/gi, '$1=[已隐藏]');
    return clean([
      '荒岛求生 登岛诊断 v1',
      `当前阶段: ${this.stage}; 异常: ${this.failed}; 已等待: ${Math.round((performance.now() - this.started) / 1000)}秒`,
      `浏览器: ${navigator.userAgent}`,
      `屏幕: ${innerWidth}x${innerHeight}; DPR=${devicePixelRatio}; 在线=${navigator.onLine}; 可见性=${document.visibilityState}`,
      `协议: ${location.protocol}; 安全上下文=${isSecureContext}`,
      ...this.entries,
    ].join('\n'));
  }
}

export const arrivalDiagnostics = new ArrivalDiagnostics();

export function listenForArrivalErrors(container: HTMLElement): () => void {
  const error = (event: ErrorEvent) => {
    arrivalDiagnostics.error('未捕获异常', event.error ?? `${event.message} ${event.filename}:${event.lineno}:${event.colno}`);
  };
  const rejection = (event: PromiseRejectionEvent) => arrivalDiagnostics.error('异步异常', event.reason);
  const lost = () => arrivalDiagnostics.error('WebGL 上下文丢失', 'GPU context lost');
  window.addEventListener('error', error);
  window.addEventListener('unhandledrejection', rejection);
  container.addEventListener('webglcontextlost', lost, true);
  return () => {
    window.removeEventListener('error', error);
    window.removeEventListener('unhandledrejection', rejection);
    container.removeEventListener('webglcontextlost', lost, true);
    arrivalDiagnostics.stop();
  };
}
