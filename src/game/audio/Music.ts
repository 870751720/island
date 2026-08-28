import { midiToFreq, pianoTone, tone } from './synth';

/**
 * 生成式配乐:三首久石让风格骨架的原创小曲轮换播放。
 * 参考其代表作的技术语汇(不受版权保护的部分)——调性、和声进行、拍号与织体:
 *  1. 「夏日之风」《One Summer's Day》式:C 大调 4/4 慢速流动,五声性旋律 + 分解和弦
 *  2. 「海边圆舞曲」《人生的旋转木马》式:A 小调 3/4,低音-和弦-和弦圆舞曲织体
 *  3. 「森林絮语」《风之甬道》式:F 大调田园风,长气息旋律
 * 旋律为原创谱面数据;每次播放带轻微随机留白与音量呼吸,夜晚自动低八度、放慢、留白更多。
 */

/** 单个旋律音:在小节内的拍偏移、MIDI 音高、时长(拍) */
type Note = { beat: number; midi: number; dur: number };

type Bar = {
  /** 和弦根音 MIDI(低音区) */
  root: number;
  /** 和弦音 MIDI(中音区,铺底用) */
  chord: number[];
  melody: Note[];
};

type Piece = {
  name: string;
  bpm: number;
  beatsPerBar: number;
  /** 圆舞曲等「低音-和弦」织体用;false 时为波浪形分解和弦 */
  waltz: boolean;
  bars: Bar[];
};

const PIECES: Piece[] = [
  {
    // 夏日之风:C 大调,如歌的级进旋律
    name: 'summer',
    bpm: 72,
    beatsPerBar: 4,
    waltz: false,
    bars: [
      { root: 48, chord: [60, 64, 67], melody: [{ beat: 0, midi: 76, dur: 2 }, { beat: 2, midi: 79, dur: 1 }, { beat: 3, midi: 81, dur: 1 }] },
      { root: 43, chord: [59, 62, 67], melody: [{ beat: 0, midi: 79, dur: 2 }, { beat: 2, midi: 74, dur: 1 }, { beat: 3, midi: 76, dur: 1 }] },
      { root: 45, chord: [57, 60, 64], melody: [{ beat: 0, midi: 76, dur: 2 }, { beat: 2, midi: 74, dur: 1 }, { beat: 3, midi: 72, dur: 1 }] },
      { root: 40, chord: [55, 59, 64], melody: [{ beat: 0, midi: 71, dur: 2 }, { beat: 2, midi: 74, dur: 2 }] },
      { root: 41, chord: [57, 60, 65], melody: [{ beat: 0, midi: 72, dur: 1 }, { beat: 1, midi: 77, dur: 1 }, { beat: 2, midi: 76, dur: 2 }] },
      { root: 48, chord: [60, 64, 67], melody: [{ beat: 0, midi: 79, dur: 2 }, { beat: 2, midi: 76, dur: 1 }, { beat: 3, midi: 74, dur: 1 }] },
      { root: 41, chord: [57, 60, 65], melody: [{ beat: 0, midi: 81, dur: 2 }, { beat: 2, midi: 79, dur: 1 }, { beat: 3, midi: 77, dur: 1 }] },
      { root: 43, chord: [59, 62, 67], melody: [{ beat: 0, midi: 74, dur: 4 }] },
    ],
  },
  {
    // 海边圆舞曲:A 小调 3/4,旋转木马式的摇曳
    name: 'waltz',
    bpm: 88,
    beatsPerBar: 3,
    waltz: true,
    bars: [
      { root: 45, chord: [57, 60, 64], melody: [{ beat: 0, midi: 76, dur: 2 }, { beat: 2, midi: 72, dur: 1 }] },
      { root: 41, chord: [57, 60, 65], melody: [{ beat: 0, midi: 77, dur: 2 }, { beat: 2, midi: 76, dur: 1 }] },
      { root: 48, chord: [60, 64, 67], melody: [{ beat: 0, midi: 72, dur: 1 }, { beat: 1, midi: 76, dur: 1 }, { beat: 2, midi: 79, dur: 1 }] },
      { root: 43, chord: [59, 62, 67], melody: [{ beat: 0, midi: 74, dur: 3 }] },
      { root: 45, chord: [57, 60, 64], melody: [{ beat: 0, midi: 81, dur: 2 }, { beat: 2, midi: 79, dur: 1 }] },
      { root: 50, chord: [62, 65, 69], melody: [{ beat: 0, midi: 77, dur: 1 }, { beat: 1, midi: 76, dur: 1 }, { beat: 2, midi: 74, dur: 1 }] },
      { root: 44, chord: [56, 59, 64], melody: [{ beat: 0, midi: 71, dur: 2 }, { beat: 2, midi: 68, dur: 1 }] },
      { root: 45, chord: [57, 60, 64], melody: [{ beat: 0, midi: 69, dur: 3 }] },
    ],
  },
  {
    // 森林絮语:F 大调田园风,长气息
    name: 'forest',
    bpm: 66,
    beatsPerBar: 4,
    waltz: false,
    bars: [
      { root: 41, chord: [53, 57, 60], melody: [{ beat: 0, midi: 77, dur: 2 }, { beat: 2, midi: 76, dur: 1 }, { beat: 3, midi: 72, dur: 1 }] },
      { root: 48, chord: [60, 64, 67], melody: [{ beat: 0, midi: 76, dur: 2 }, { beat: 2, midi: 74, dur: 1 }, { beat: 3, midi: 72, dur: 1 }] },
      { root: 50, chord: [62, 65, 69], melody: [{ beat: 0, midi: 74, dur: 4 }] },
      { root: 46, chord: [58, 62, 65], melody: [{ beat: 0, midi: 74, dur: 2 }, { beat: 2, midi: 76, dur: 1 }, { beat: 3, midi: 77, dur: 1 }] },
      { root: 41, chord: [53, 57, 60], melody: [{ beat: 0, midi: 79, dur: 2 }, { beat: 2, midi: 77, dur: 1 }, { beat: 3, midi: 76, dur: 1 }] },
      { root: 48, chord: [60, 64, 67], melody: [{ beat: 0, midi: 72, dur: 1 }, { beat: 1, midi: 76, dur: 1 }, { beat: 2, midi: 79, dur: 2 }] },
      { root: 46, chord: [58, 62, 65], melody: [{ beat: 0, midi: 77, dur: 1 }, { beat: 1, midi: 76, dur: 1 }, { beat: 2, midi: 74, dur: 2 }] },
      { root: 48, chord: [60, 64, 67], melody: [{ beat: 0, midi: 72, dur: 4 }] },
    ],
  },
];

/** 每首曲子连续播放的遍数,听熟一点再换 */
const REPEATS_BEFORE_SWITCH = 2;

const LOOKAHEAD = 0.6; // 提前排程秒数
const TICK_MS = 200;

export class Music {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private barCounter = 0;
  private pieceIndex = 0;
  private repeatCount = 0;
  private night = false;
  private disposed = false;

  constructor(private ctx: AudioContext, private dest: AudioNode) {}

  start(): void {
    if (this.timer) return;
    this.nextBarTime = this.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  /** 昼夜切换:夜晚更慢、更低、更稀疏 */
  setNight(night: boolean): void {
    this.night = night;
  }

  private get piece(): Piece {
    return PIECES[this.pieceIndex];
  }

  private get bpm(): number {
    return this.night ? Math.round(this.piece.bpm * 0.8) : this.piece.bpm;
  }

  private schedule(): void {
    if (this.disposed) return;
    const barDur = (60 / this.bpm) * this.piece.beatsPerBar;
    while (this.nextBarTime < this.ctx.currentTime + LOOKAHEAD) {
      const piece = this.piece;
      this.scheduleBar(piece.bars[this.barCounter % piece.bars.length], this.nextBarTime, barDur, piece);
      this.nextBarTime += barDur;
      this.barCounter++;
      // 一首弹完几遍换下一首
      if (this.barCounter >= piece.bars.length * REPEATS_BEFORE_SWITCH) {
        this.barCounter = 0;
        this.pieceIndex = (this.pieceIndex + 1) % PIECES.length;
      }
    }
  }

  private scheduleBar(bar: Bar, barTime: number, barDur: number, piece: Piece): void {
    const beat = barDur / piece.beatsPerBar;
    const melodyOctave = this.night ? -12 : 0;

    // 伴奏
    if (piece.waltz) {
      // 圆舞曲织体:第 1 拍低音,其余拍和弦
      pianoTone(this.ctx, this.dest, midiToFreq(bar.root), barTime, 1.2, 0.08);
      for (let b = 1; b < piece.beatsPerBar; b++) {
        bar.chord.forEach((n) => pianoTone(this.ctx, this.dest, midiToFreq(n), barTime + b * beat, 0.8, 0.035));
      }
    } else {
      // 波浪形分解和弦
      const arp = this.night ? [0, 2, 1] : [0, 1, 2, 1, 0, 2, 1, 2];
      arp.forEach((idx, i) => {
        const t = barTime + (i * barDur) / arp.length;
        pianoTone(this.ctx, this.dest, midiToFreq(bar.root + 12 + [0, 4, 7][idx]), t, 1.6, 0.05);
      });
    }

    // 铺底:整小节持续和弦,极轻的三角波群(夜晚只留外声部)
    const padNotes = this.night ? [bar.chord[0], bar.chord[bar.chord.length - 1]] : bar.chord;
    padNotes.forEach((n) => {
      tone(
        this.ctx,
        this.dest,
        midiToFreq(n - 12),
        barTime,
        { attack: barDur * 0.4, decay: barDur * 0.8, peak: 0.016 },
        'triangle'
      );
    });

    // 旋律:夜晚更稀疏的留白,白天偶尔呼吸
    const restChance = this.night ? 0.25 : 0.06;
    for (const { beat: b, midi, dur } of bar.melody) {
      if (Math.random() < restChance) continue;
      const t = barTime + b * beat;
      pianoTone(this.ctx, this.dest, midiToFreq(midi + melodyOctave), t, dur * beat + 0.8, 0.1);
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
