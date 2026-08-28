import { midiToFreq, noiseBurst, tone, pianoTone } from './synth';

/** 玩法音效种类:按动作语义命名 */
export type SfxName =
  | 'chop' // 砍树命中
  | 'mine' // 采石命中
  | 'pick' // 采集草果枝石命中
  | 'knock' // 手搓/工作台敲打
  | 'munch' // 进食
  | 'drink' // 喝下一轮水
  | 'whoosh' // 抛竿挥动
  | 'splash' // 落水/拉鱼水花
  | 'bite' // 咬钩提示
  | 'pickup' // 获得物品(采集收获/捡回/钓到鱼,统一)
  | 'drop' // 丢弃落地
  | 'success' // 制作完成
  | 'death'; // 死亡

const VOL: Record<SfxName, number> = {
  chop: 0.5,
  mine: 0.45,
  pick: 0.5,
  knock: 0.4,
  munch: 0.35,
  drink: 0.4,
  whoosh: 0.4,
  splash: 0.45,
  bite: 0.6,
  pickup: 0.4,
  drop: 0.35,
  success: 0.45,
  death: 0.5,
};

/** 程序化音效:全部用振荡器与噪声实时合成,每次播放带随机音高抖动避免机械感 */
export class Sfx {
  constructor(private ctx: AudioContext, private dest: AudioNode) {}

  play(name: SfxName): void {
    const t = this.ctx.currentTime + 0.01;
    const v = VOL[name];
    const detune = (pitch: number) => pitch * (0.92 + Math.random() * 0.16);

    switch (name) {
      case 'chop':
        // 低频闷响 + 高频木屑噪声
        tone(this.ctx, this.dest, detune(120), t, { attack: 0.004, decay: 0.12, peak: v }, 'sine', 60);
        noiseBurst(this.ctx, this.dest, t, { attack: 0.002, decay: 0.08, peak: v * 0.7 }, 'bandpass', 1800, 500);
        break;
      case 'mine':
        // 石头:短促高频「叮」+ 碎屑噪声
        tone(this.ctx, this.dest, detune(900), t, { attack: 0.002, decay: 0.09, peak: v * 0.7 }, 'square', 500);
        noiseBurst(this.ctx, this.dest, t, { attack: 0.002, decay: 0.1, peak: v * 0.8 }, 'highpass', 2200);
        break;
      case 'pick':
        // 沙沙声:高频段里一串随机分布的极短「嚓」颗粒,密集微爆裂才是草叶质感
        for (let i = 0; i < 14; i++) {
          const t0 = t + Math.random() * 0.32;
          const f = 1800 + Math.random() * 2400;
          noiseBurst(
            this.ctx,
            this.dest,
            t0,
            { attack: 0.001, decay: 0.015 + Math.random() * 0.03, peak: v * (0.5 + Math.random() * 0.5) },
            'bandpass',
            f
          );
        }
        // 底层一点轻柔的「拢草」身量,避免只剩高频碎点
        noiseBurst(this.ctx, this.dest, t, { attack: 0.02, decay: 0.28, peak: v * 0.35 }, 'lowpass', 1200, 500);
        break;
      case 'knock':
        tone(this.ctx, this.dest, detune(220), t, { attack: 0.003, decay: 0.1, peak: v }, 'triangle', 90);
        noiseBurst(this.ctx, this.dest, t, { attack: 0.002, decay: 0.05, peak: v * 0.5 }, 'bandpass', 2600, 1200);
        break;
      case 'munch':
        // 三连「咔嚓」
        for (let i = 0; i < 3; i++) {
          noiseBurst(
            this.ctx,
            this.dest,
            t + i * 0.09,
            { attack: 0.004, decay: 0.07, peak: v * (1 - i * 0.2) },
            'bandpass',
            detune(1100),
            500
          );
        }
        break;
      case 'drink':
        // 两声「咕咚」:下滑正弦
        for (let i = 0; i < 2; i++) {
          tone(this.ctx, this.dest, detune(340), t + i * 0.16, { attack: 0.01, decay: 0.14, peak: v * 0.8 }, 'sine', 160);
        }
        break;
      case 'whoosh':
        noiseBurst(this.ctx, this.dest, t, { attack: 0.05, decay: 0.25, peak: v }, 'bandpass', 600, 2400);
        break;
      case 'splash':
        noiseBurst(this.ctx, this.dest, t, { attack: 0.004, decay: 0.28, peak: v }, 'lowpass', 3200, 400);
        tone(this.ctx, this.dest, detune(500), t, { attack: 0.004, decay: 0.12, peak: v * 0.5 }, 'sine', 180);
        break;
      case 'bite':
        // 浮漂下沉的「咚」+ 提示拨弦
        tone(this.ctx, this.dest, detune(300), t, { attack: 0.003, decay: 0.15, peak: v }, 'sine', 120);
        pianoTone(this.ctx, this.dest, midiToFreq(84), t + 0.02, 0.5, v * 0.7);
        break;
      case 'pickup':
        // 清脆双音:两声快速上行,收获的奖励感
        pianoTone(this.ctx, this.dest, midiToFreq(79), t, 0.35, v);
        pianoTone(this.ctx, this.dest, midiToFreq(86), t + 0.09, 0.5, v);
        break;
      case 'drop':
        tone(this.ctx, this.dest, detune(160), t, { attack: 0.004, decay: 0.14, peak: v }, 'sine', 70);
        break;
      case 'success':
        // 完成小琶音:do-mi-so-高do
        [72, 76, 79, 84].forEach((m, i) => pianoTone(this.ctx, this.dest, midiToFreq(m), t + i * 0.09, 1, v));
        break;
      case 'death':
        // 下行小二度慢音,低回
        [67, 65, 60].forEach((m, i) => pianoTone(this.ctx, this.dest, midiToFreq(m), t + i * 0.45, 1.8, v));
        break;
    }
  }
}
