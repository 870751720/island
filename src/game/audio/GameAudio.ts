import { Ambience } from './Ambience';
import { Music } from './Music';
import { Sfx, type SfxName } from './Sfx';
import { createReverb } from './synth';
import { loadAudioSettings } from './AudioSettings';

/** 音乐总线的基准音量:音乐稳压在音效之下,设置里的滑杆在此之上再调 */
const MUSIC_BASE = 0.55;

/**
 * 游戏音频统一入口:管理 AudioContext 生命周期与「音乐 / 音效」两条独立音量总线,
 * 音量来自开始界面设置区(持久化于 localStorage)。
 * 对外只暴露三类高层能力——播放音效、设置昼夜(切换配乐情绪)、设置雨声强度。
 * AudioContext 延迟到首次用户手势(开始游戏)时创建,符合浏览器自动播放策略。
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private sfx: Sfx | null = null;
  private music: Music | null = null;
  private ambience: Ambience | null = null;
  private started = false;

  /** 创建并启动音频(须在用户手势事件中调用) */
  start(): void {
    if (this.started) return;
    this.started = true;
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.connect(ctx.destination);

    // 音乐/音效共用一条混响,营造海岛空间感
    const reverb = createReverb(ctx);
    reverb.output.connect(master);

    // 音乐与音效各自走独立音量总线,按设置区滑杆取值
    const { music, sfx } = loadAudioSettings();
    const musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_BASE * music;
    musicBus.connect(reverb.input);
    const sfxBus = ctx.createGain();
    sfxBus.gain.value = sfx;
    sfxBus.connect(reverb.input);

    this.sfx = new Sfx(ctx, sfxBus);
    this.music = new Music(ctx, musicBus);
    // 海浪/雨属于背景氛围,归入音乐总线
    this.ambience = new Ambience(ctx, musicBus);
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

  dispose(): void {
    this.music?.dispose();
    this.ambience?.dispose();
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}
