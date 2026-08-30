import { midiToFreq, noiseBurst, tone, pianoTone } from './synth';

/** 玩法音效种类:按动作语义命名 */
export type SfxName =
  | 'chop' // 砍树命中
  | 'mine' // 采石命中
  | 'pick' // 采集草果枝命中
  | 'pickStone' // 拨拾碎石命中
  | 'knock' // 手搓/工作台敲打
  | 'stoke' // 添柴:木柴落火与火焰腾起
  | 'sizzle' // 烹饪:食材下锅的滋滋油响
  | 'munch' // 进食
  | 'drink' // 喝下一轮水
  | 'whoosh' // 抛竿挥动
  | 'shoot' // 放箭:弦弹与箭矢破空
  | 'arrowHit' // 箭矢命中猎物
  | 'splash' // 落水/拉鱼水花
  | 'bite' // 咬钩提示
  | 'pickup' // 获得物品(采集收获/捡回/钓到鱼,统一)
  | 'drop' // 丢弃落地
  | 'success' // 制作完成
  | 'hurt' // 受伤闷哼
  | 'snore' // 睡觉打呼
  | 'death'; // 死亡

const VOL: Record<SfxName, number> = {
  chop: 0.5,
  mine: 0.45,
  pick: 0.5,
  pickStone: 0.5,
  knock: 0.4,
  stoke: 0.55,
  sizzle: 0.4,
  munch: 0.5,
  drink: 0.55,
  whoosh: 0.4,
  shoot: 0.45,
  arrowHit: 0.5,
  splash: 0.45,
  bite: 0.6,
  pickup: 0.4,
  drop: 0.5,
  success: 0.45,
  hurt: 0.5,
  snore: 0.75,
  death: 0.5,
};

/** 程序化音效:全部用振荡器与噪声实时合成,每次播放带随机音高抖动避免机械感 */
export class Sfx {
  /** 长音效的专属输出通道,交互中断时立即静音切断 */
  private cuts = new Map<SfxName, GainNode>();

  constructor(private ctx: AudioContext, private dest: AudioNode) {}

  /** 中途切断仍在播的长音效(喝水、进食等随交互持续的循环声) */
  stop(name: SfxName): void {
    const cut = this.cuts.get(name);
    if (!cut) return;
    this.cuts.delete(name);
    cut.gain.cancelScheduledValues(this.ctx.currentTime);
    cut.gain.setValueAtTime(cut.gain.value, this.ctx.currentTime);
    cut.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
  }

  play(name: SfxName): void {
    const t = this.ctx.currentTime + 0.01;
    const v = VOL[name];
    const detune = (pitch: number) => pitch * (0.92 + Math.random() * 0.16);

    // 随交互持续的长音效走独立通道,便于 stop 切断
    let dest = this.dest;
    if (name === 'drink' || name === 'munch') {
      this.stop(name);
      const cut = this.ctx.createGain();
      cut.connect(this.dest);
      this.cuts.set(name, cut);
      dest = cut;
    }

    switch (name) {
      case 'chop':
        // 斧刃入木:又短又密的低频闷击,两层贴近的低音叠加避免单薄发空
        tone(this.ctx, dest, detune(130), t, { attack: 0.003, decay: 0.1, peak: v }, 'sine', 65);
        tone(this.ctx, dest, detune(200), t, { attack: 0.003, decay: 0.08, peak: v * 0.8 }, 'triangle', 110);
        noiseBurst(this.ctx, dest, t, { attack: 0.002, decay: 0.05, peak: v * 0.4 }, 'lowpass', 700, 300);
        break;
      case 'mine':
        // 镐击石「叮」:金属感高频振铃(两个失谐泛音)+ 石面崩裂脆声
        tone(this.ctx, dest, detune(2500), t, { attack: 0.001, decay: 0.11, peak: v * 0.5 }, 'triangle');
        tone(this.ctx, dest, detune(4000), t, { attack: 0.001, decay: 0.07, peak: v * 0.35 }, 'triangle');
        noiseBurst(this.ctx, dest, t, { attack: 0.001, decay: 0.035, peak: v * 0.7 }, 'highpass', 4200);
        break;
      case 'pick':
        // 手拨草丛「唰」:多层错位的软噪声叠出起伏,像草叶被拨动后回弹
        noiseBurst(this.ctx, dest, t, { attack: 0.04, decay: 0.14, peak: v * 0.5 }, 'bandpass', detune(1500), 800, 0.8);
        noiseBurst(this.ctx, dest, t + 0.07, { attack: 0.05, decay: 0.18, peak: v * 0.45 }, 'bandpass', detune(2200), 1000, 0.8);
        noiseBurst(this.ctx, dest, t + 0.15, { attack: 0.04, decay: 0.12, peak: v * 0.3 }, 'bandpass', detune(1100), 600, 0.8);
        break;
      case 'pickStone':
        // 拨拾碎石:几颗石子翻动的干硬「咔哒」,极短衰减、无滑频,不带水感
        for (let i = 0; i < 3; i++) {
          tone(
            this.ctx,
            dest,
            detune(1500 + Math.random() * 900),
            t + i * 0.05,
            { attack: 0.001, decay: 0.025, peak: v * (0.55 - i * 0.12) },
            'triangle'
          );
        }
        noiseBurst(this.ctx, dest, t, { attack: 0.001, decay: 0.015, peak: v * 0.35 }, 'highpass', 5000);
        break;
      case 'knock':
        tone(this.ctx, dest, detune(220), t, { attack: 0.003, decay: 0.1, peak: v }, 'triangle', 90);
        noiseBurst(this.ctx, dest, t, { attack: 0.002, decay: 0.05, peak: v * 0.5 }, 'bandpass', 2600, 1200);
        break;
      case 'stoke':
        // 添柴:木头抛落的闷响两声,随后火焰腾起的低频「呼」声
        for (let i = 0; i < 2; i++) {
          const wt = t + i * 0.12;
          tone(this.ctx, dest, detune(170 - i * 30), wt, { attack: 0.002, decay: 0.07, peak: v * 0.7 }, 'sine', 80);
          noiseBurst(this.ctx, dest, wt, { attack: 0.002, decay: 0.04, peak: v * 0.4 }, 'bandpass', 1800, 900);
        }
        noiseBurst(this.ctx, dest, t + 0.2, { attack: 0.05, decay: 0.35, peak: v * 0.8 }, 'lowpass', 900, 400);
        break;
      case 'sizzle':
        // 烤肉滋滋声:一段持续的高频油爆气声垫底 + 几粒随机的爆裂脆响
        noiseBurst(this.ctx, dest, t, { attack: 0.04, decay: 0.55, peak: v * 0.5 }, 'highpass', 3800);
        for (let i = 0; i < 4; i++) {
          const st = t + 0.05 + Math.random() * 0.45;
          tone(this.ctx, dest, detune(2600 + Math.random() * 2400), st, { attack: 0.001, decay: 0.03, peak: v * (0.4 - i * 0.06) }, 'triangle');
          noiseBurst(this.ctx, dest, st, { attack: 0.001, decay: 0.02, peak: v * 0.3 }, 'highpass', 5200);
        }
        break;
      case 'munch':
        // 柔湿咀嚼:每口两层带通挤压音(中低频「mua」),无脆响颗粒;每 0.5s 循环故只咬两口
        for (let i = 0; i < 2; i++) {
          const bt = t + i * (0.22 + Math.random() * 0.05);
          noiseBurst(this.ctx, dest, bt, { attack: 0.02, decay: 0.1, peak: v * 0.5 }, 'bandpass', detune(750), 350, 1.4);
          noiseBurst(this.ctx, dest, bt + 0.02, { attack: 0.02, decay: 0.08, peak: v * 0.35 }, 'bandpass', detune(1300), 600);
        }
        break;
      case 'drink':
        // 「咕咕」吞咽贯穿整轮喝水:八声水泡音由低滑高,间隔铺满约 2 秒的喝水时长
        for (let i = 0; i < 8; i++) {
          tone(
            this.ctx,
            dest,
            detune(220 + i * 22),
            t + i * 0.23,
            { attack: 0.008, decay: 0.06, peak: v * (0.95 - i * 0.08) },
            'sine',
            detune(220 + i * 22) * 1.9
          );
          noiseBurst(this.ctx, dest, t + i * 0.23, { attack: 0.003, decay: 0.04, peak: v * 0.22 }, 'bandpass', 900, 500);
        }
        break;
      case 'whoosh':
        noiseBurst(this.ctx, dest, t, { attack: 0.05, decay: 0.25, peak: v }, 'bandpass', 600, 2400);
        break;
      case 'shoot':
        // 弓弦「崩」的短促弹拨 + 箭矢破空掠过的滑噪声
        tone(this.ctx, dest, detune(320), t, { attack: 0.002, decay: 0.09, peak: v * 0.8 }, 'triangle', 140);
        noiseBurst(this.ctx, dest, t + 0.02, { attack: 0.02, decay: 0.18, peak: v * 0.7 }, 'bandpass', 1800, 3000);
        break;
      case 'arrowHit':
        // 命中闷响:低频穿透 + 短促的羽草炸开声
        tone(this.ctx, dest, detune(160), t, { attack: 0.002, decay: 0.12, peak: v }, 'sine', 70);
        noiseBurst(this.ctx, dest, t, { attack: 0.002, decay: 0.08, peak: v * 0.5 }, 'bandpass', 900, 500);
        break;
      case 'splash':
        noiseBurst(this.ctx, dest, t, { attack: 0.004, decay: 0.28, peak: v }, 'lowpass', 3200, 400);
        tone(this.ctx, dest, detune(500), t, { attack: 0.004, decay: 0.12, peak: v * 0.5 }, 'sine', 180);
        break;
      case 'bite':
        // 浮漂下沉的「咚」+ 提示拨弦
        tone(this.ctx, dest, detune(300), t, { attack: 0.003, decay: 0.15, peak: v }, 'sine', 120);
        pianoTone(this.ctx, dest, midiToFreq(84), t + 0.02, 0.5, v * 0.7);
        break;
      case 'pickup':
        // 清脆双音:两声快速上行,收获的奖励感
        pianoTone(this.ctx, dest, midiToFreq(79), t, 0.35, v);
        pianoTone(this.ctx, dest, midiToFreq(86), t + 0.09, 0.5, v);
        break;
      case 'drop':
        // 落地「嗒」:中频闷响 + 短促接触噪声,避开手机放不出的低频
        tone(this.ctx, dest, detune(420), t, { attack: 0.004, decay: 0.12, peak: v }, 'sine', 200);
        noiseBurst(this.ctx, dest, t, { attack: 0.002, decay: 0.04, peak: v * 0.5 }, 'bandpass', 2000, 900);
        break;
      case 'success':
        // 完成小琶音:do-mi-so-高do
        [72, 76, 79, 84].forEach((m, i) => pianoTone(this.ctx, dest, midiToFreq(m), t + i * 0.09, 1, v));
        break;
      case 'hurt':
        // 受伤闷哼:急速下坠的低频滑音 + 短噪声冲击
        tone(this.ctx, dest, detune(300), t, { attack: 0.003, decay: 0.18, peak: v }, 'sine', 90);
        noiseBurst(this.ctx, dest, t, { attack: 0.002, decay: 0.08, peak: v * 0.45 }, 'bandpass', 1200, 600);
        break;
      case 'snore': {
        // 打呼:带谐波的哼鸣从鼻腔滚出,音高缓降,再垫一层中低频带通气声;
        // 频率刻意保持在手机小喇叭放得出的范围
        for (let i = 0; i < 2; i++) {
          const st = t + i * 0.5;
          const peak = v * (0.9 - i * 0.25);
          tone(this.ctx, dest, detune(190 - i * 20), st, { attack: 0.1, decay: 0.42, peak }, 'sawtooth', 105);
          tone(this.ctx, dest, detune(380 - i * 40), st, { attack: 0.1, decay: 0.38, peak: peak * 0.4 }, 'triangle', 210);
          noiseBurst(this.ctx, dest, st, { attack: 0.09, decay: 0.4, peak: peak * 0.55 }, 'bandpass', 620, 280, 1.2);
        }
        break;
      }
      case 'death':
        // 经典下行轮廓:音符逐个降低、间隔越来越短,像皮球弹跳到静止,末了一声低音落地
        [76, 72, 68, 64, 60].forEach((m, i) => {
          pianoTone(this.ctx, dest, midiToFreq(m), t + [0, 0.28, 0.5, 0.66, 0.78][i], 0.6, v);
        });
        tone(this.ctx, dest, 90, t + 0.85, { attack: 0.005, decay: 0.5, peak: v * 0.7 }, 'sine', 45);
        break;
    }
  }
}
