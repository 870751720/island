import { noiseLoop } from './synth';

/**
 * 环境声层:海浪(常驻,缓慢起伏)+ 雨(随天气强度淡入淡出)。
 * 用循环白噪声经低通/带通滤波再以低频 LFO 调制音量,模拟海浪一阵阵拍岸与雨声的绵密感。
 */
export class Ambience {
  private wavesGain: GainNode;
  private wavesLfo: OscillatorNode;
  private rain: ReturnType<typeof noiseLoop>;
  private wind: ReturnType<typeof noiseLoop>;
  private rainTarget = 0;
  private disposed = false;

  constructor(private ctx: AudioContext, dest: AudioNode) {
    // 海浪:低通白噪声 + 0.08Hz 正弦 LFO 起伏,音量随时间微微随机漂移
    const waves = noiseLoop(ctx, dest, 'lowpass', 420);
    this.wavesGain = waves.gain;
    this.wavesGain.gain.value = 0.05;
    this.wavesLfo = ctx.createOscillator();
    this.wavesLfo.frequency.value = 0.09;
    const lfoAmount = ctx.createGain();
    lfoAmount.gain.value = 0.035;
    this.wavesLfo.connect(lfoAmount).connect(this.wavesGain.gain);
    this.wavesLfo.start();

    // 雨:更亮的带通噪声,由天气强度驱动
    this.rain = noiseLoop(ctx, dest, 'bandpass', 3200);
    this.wind = noiseLoop(ctx, dest, 'bandpass', 850);
  }

  /** 雨声强度 0~1,平滑过渡 */
  setRainIntensity(intensity: number): void {
    if (this.disposed) return;
    this.rainTarget = Math.min(Math.max(intensity, 0), 1) * 0.07;
    this.rain.gain.gain.setTargetAtTime(this.rainTarget, this.ctx.currentTime, 1.5);
  }

  /** 阵风同步驱动音量与音色,中频呼啸在手机扬声器上也可辨认。 */
  setWindIntensity(intensity: number): void {
    if (this.disposed) return;
    const amount = Math.min(Math.max(intensity, 0), 1);
    this.wind.gain.gain.setTargetAtTime(amount * 0.18, this.ctx.currentTime, 0.25);
    this.wind.filter.frequency.setTargetAtTime(650 + amount * 850, this.ctx.currentTime, 0.3);
  }

  dispose(): void {
    this.disposed = true;
    this.wavesLfo.stop();
    this.rain.stop();
    this.wind.stop();
  }
}
