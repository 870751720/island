type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

/** 原生方向锁定与全屏的生命周期；锁定失败交给界面提示物理旋转。 */
export class LandscapeController {
  private enabled = false;
  private disposed = false;
  private busy = false;
  private gestureAttempted = false;
  private ownedFullscreen = false;
  private generation = 0;

  constructor() {
    document.addEventListener('click', this.onGesture, true);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.generation++;
    this.gestureAttempted = false;
    if (enabled) void this.apply(navigator.userActivation?.isActive === true);
    else this.release();
  }

  private onGesture = (): void => {
    if (!this.gestureAttempted) void this.apply(true);
  };

  private onFullscreenChange = (): void => {
    if (document.fullscreenElement) void this.apply(false);
    else {
      this.ownedFullscreen = false;
      // 尊重玩家主动退出全屏；不要在下一次普通点击时又强制进入。
      this.gestureAttempted = true;
    }
  };

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') void this.apply(false);
  };

  private async apply(fromGesture: boolean): Promise<void> {
    if (!this.enabled || this.disposed || this.busy) return;
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (!orientation?.lock) return;
    if (fromGesture) this.gestureAttempted = true;
    const generation = this.generation;
    this.busy = true;
    try {
      if (fromGesture && !document.fullscreenElement && document.fullscreenEnabled) {
        try {
          await document.documentElement.requestFullscreen();
          this.ownedFullscreen = true;
        } catch { /* 全屏被拒绝时，仍尝试宿主可能允许的方向锁定。 */ }
      }
      if (this.disposed || !this.enabled || generation !== this.generation) return;
      await orientation.lock('landscape');
    } catch {
      // 浏览器、宿主容器或系统拒绝时保留偏好，允许玩家自行横置设备。
    } finally {
      this.busy = false;
      if (this.disposed || !this.enabled) this.release();
      else if (generation !== this.generation) void this.apply(false);
    }
  }

  private release(): void {
    try { screen.orientation?.unlock(); } catch { /* 部分宿主禁止方向接口。 */ }
    if (this.ownedFullscreen && document.fullscreenElement === document.documentElement) {
      this.ownedFullscreen = false;
      void document.exitFullscreen().catch(() => {});
    }
  }

  dispose(): void {
    this.disposed = true;
    document.removeEventListener('click', this.onGesture, true);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.release();
  }
}
