import { Ambience } from './Ambience';
import { Music } from './Music';
import { Sfx, type SfxName } from './Sfx';
import { createReverb } from './synth';

/**
 * 游戏音频统一入口:管理 AudioContext 生命周期、总音量与静音,
 * 并对外只暴露三类高层能力——播放音效、设置昼夜(切换配乐情绪)、设置雨声强度。
 * AudioContext 延迟到首次用户手势(开始游戏)时创建,符合浏览器自动播放策略。
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: Sfx | null = null;
  private music: Music | null = null;
  private ambience: Ambience | null = null;
  private muted = false;
  private started = false;

  /** 创建并启动音频(须在用户手势事件中调用) */
  start(): void {
    if (this.started) return;
    this.started = true;
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);
    this.master = master;

    // 音乐/音效共用一条混响,营造海岛空间感
    const reverb = createReverb(ctx);
    reverb.output.connect(master);

    this.sfx = new Sfx(ctx, reverb.input);
    this.music = new Music(ctx, reverb.input);
    this.ambience = new Ambience(ctx, reverb.input);
    this.music.start();
    // 组件挂载后再启动的上下文可能是挂起状态,借下一次触摸/按键唤醒
    if (ctx.state === 'suspended') {
      const resume = () => {
        void ctx.resume();
        window.removeEventListener('pointerdown', resume);
        window.removeEventListener('keydown', resume);
      };
      window.addEventListener('pointerdown', resume);
      window.addEventListener('keydown', resume);
    }
  }

  play(name: SfxName): void {
    this.sfx?.play(name);
  }

  /** 昼夜切换驱动配乐情绪 */
  setNight(night: boolean): void {
    this.music?.setNight(night);
  }

  /** 雨声强度 0~1 */
  setRainIntensity(intensity: number): void {
    this.ambience?.setRainIntensity(intensity);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  dispose(): void {
    this.music?.dispose();
    this.ambience?.dispose();
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}
