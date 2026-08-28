import { midiToFreq, noiseBurst, tone, pianoTone } from './synth';

/** 玩法音效种类:按动作语义命名 */
export type SfxName =
  | 'chop' // 砍树命中
  | 'mine' // 采石命中
  | 'pick' // 采集草果枝命中
  | 'pickStone' // 拨拾碎石命中
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
  pickStone: 0.5,
  knock: 0.4,
  munch: 0.5,
  drink: 0.55,
  whoosh: 0.4,
  splash: 0.45,
  bite: 0.6,
  pickup: 0.4,
  drop: 0.5,
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
        // 斧刃入木:又短又密的低频闷击,两层贴近的低音叠加避免单薄发空
        tone(this.ctx, this.dest, detune(130), t, { attack: 0.003, decay: 0.1, peak: v }, 'sine', 65);
        tone(this.ctx, this.dest, detune(200), t, { attack: 0.003, decay: 0.08, peak: v * 0.8 }, 'triangle', 110);
        noiseBurst(this.ctx, this.dest, t, { attack: 0.002, decay: 0.05, peak: v * 0.4 }, 'lowpass', 700, 300);
        break;
      case 'mine':
        // 镐击石「叮」:金属感高频振铃(两个失谐泛音)+ 石面崩裂脆声
        tone(this.ctx, this.dest, detune(2500), t, { attack: 0.001, decay: 0.11, peak: v * 0.5 }, 'triangle');
        tone(this.ctx, this.dest, detune(4000), t, { attack: 0.001, decay: 0.07, peak: v * 0.35 }, 'triangle');
        noiseBurst(this.ctx, this.dest, t, { attack: 0.001, decay: 0.035, peak: v * 0.7 }, 'highpass', 4200);
        break;
      case 'pick':
        // 手拨草丛「唰」:多层错位的软噪声叠出起伏,像草叶被拨动后回弹
        noiseBurst(this.ctx, this.dest, t, { attack: 0.04, decay: 0.14, peak: v * 0.5 }, 'bandpass', detune(1500), 800, 0.8);
        noiseBurst(this.ctx, this.dest, t + 0.07, { attack: 0.05, decay: 0.18, peak: v * 0.45 }, 'bandpass', detune(2200), 1000, 0.8);
        noiseBurst(this.ctx, this.dest, t + 0.15, { attack: 0.04, decay: 0.12, peak: v * 0.3 }, 'bandpass', detune(1100), 600, 0.8);
        break;
      case 'pickStone':
        // 拨拾碎石:几颗石子翻动的干硬「咔哒」,极短衰减、无滑频,不带水感
        for (let i = 0; i < 3; i++) {
          tone(
            this.ctx,
            this.dest,
            detune(1500 + Math.random() * 900),
            t + i * 0.05,
            { attack: 0.001, decay: 0.025, peak: v * (0.55 - i * 0.12) },
            'triangle'
          );
        }
        noiseBurst(this.ctx, this.dest, t, { attack: 0.001, decay: 0.015, peak: v * 0.35 }, 'highpass', 5000);
        break;
      case 'knock':
        tone(this.ctx, this.dest, detune(220), t, { attack: 0.003, decay: 0.1, peak: v }, 'triangle', 90);
        noiseBurst(this.ctx, this.dest, t, { attack: 0.002, decay: 0.05, peak: v * 0.5 }, 'bandpass', 2600, 1200);
        break;
      case 'munch':
        // 分层咬合:每口 = 脆断瞬态(高频咔嚓)+ 湿软挤压(低频 squish),节奏与音高随机避免机械
        for (let i = 0; i < 4; i++) {
          const bt = t + i * (0.2 + Math.random() * 0.06);
          noiseBurst(this.ctx, this.dest, bt, { attack: 0.001, decay: 0.03, peak: v * (0.7 - i * 0.1) }, 'highpass', detune(4500));
          noiseBurst(this.ctx, this.dest, bt, { attack: 0.008, decay: 0.07, peak: v * (0.5 - i * 0.08) }, 'bandpass', detune(700), 300);
          tone(this.ctx, this.dest, detune(150), bt, { attack: 0.004, decay: 0.06, peak: v * 0.3 }, 'sine', 80);
        }
        break;
      case 'drink':
        // 「咕咕」吞咽贯穿整轮喝水:八声水泡音由低滑高,间隔铺满约 2 秒的喝水时长
        for (let i = 0; i < 8; i++) {
          tone(
            this.ctx,
            this.dest,
            detune(220 + i * 22),
            t + i * 0.23,
            { attack: 0.008, decay: 0.06, peak: v * (0.95 - i * 0.08) },
            'sine',
            detune(220 + i * 22) * 1.9
          );
          noiseBurst(this.ctx, this.dest, t + i * 0.23, { attack: 0.003, decay: 0.04, peak: v * 0.22 }, 'bandpass', 900, 500);
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
        // 落地「嗒」:中频闷响 + 短促接触噪声,避开手机放不出的低频
        tone(this.ctx, this.dest, detune(420), t, { attack: 0.004, decay: 0.12, peak: v }, 'sine', 200);
        noiseBurst(this.ctx, this.dest, t, { attack: 0.002, decay: 0.04, peak: v * 0.5 }, 'bandpass', 2000, 900);
        break;
      case 'success':
        // 完成小琶音:do-mi-so-高do
        [72, 76, 79, 84].forEach((m, i) => pianoTone(this.ctx, this.dest, midiToFreq(m), t + i * 0.09, 1, v));
        break;
      case 'death':
        // 经典下行轮廓:音符逐个降低、间隔越来越短,像皮球弹跳到静止,末了一声低音落地
        [76, 72, 68, 64, 60].forEach((m, i) => {
          pianoTone(this.ctx, this.dest, midiToFreq(m), t + [0, 0.28, 0.5, 0.66, 0.78][i], 0.6, v);
        });
        tone(this.ctx, this.dest, 90, t + 0.85, { attack: 0.005, decay: 0.5, peak: v * 0.7 }, 'sine', 45);
        break;
    }
  }
}
