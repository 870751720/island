import { midiToFreq, pianoTone, tone } from './synth';

/**
 * 生成式配乐,久石让式调性:
 * C 大调五声音阶的如歌旋律 + I-V-vi-IV 和声进行 + 分解和弦伴奏 + 温暖铺底,
 * 柔和钢琴音色、慢速律动;白天明亮流动,夜晚低回稀疏。
 * 以「动机重复与变奏」组织乐句:先呈示 2 小节动机,再移位变奏,最后收束。
 */

/** 和声进行(8 小节一轮):MIDI 根音与和弦音(大调级数) */
const PROGRESSION: { root: number; chord: number[] }[] = [
  { root: 48, chord: [60, 64, 67] }, // C
  { root: 43, chord: [59, 62, 67] }, // G
  { root: 45, chord: [57, 60, 64] }, // Am
  { root: 41, chord: [57, 60, 65] }, // F
  { root: 48, chord: [60, 64, 67] }, // C
  { root: 43, chord: [59, 62, 67] }, // G
  { root: 45, chord: [57, 60, 65] }, // F
  { root: 43, chord: [59, 62, 67] }, // G
];

/** 五声音阶旋律音域(C 大调五声:C D E G A) */
const PENTATONIC = [0, 2, 4, 7, 9];

/**
 * 旋律动机库:每条是「拍偏移 → 相对根音(根音=0)的音级偏移」的小节片段。
 * -1 表示休止。动机多为级进 + 偶尔四度跳进,是久石让式歌唱性旋律的骨架。
 */
const MOTIFS: { offset: number; degree: number }[][] = [
  [
    { offset: 0, degree: 12 },
    { offset: 1, degree: 14 },
    { offset: 1.5, degree: 16 },
    { offset: 2, degree: 19 },
    { offset: 3, degree: 16 },
  ],
  [
    { offset: 0, degree: 16 },
    { offset: 0.5, degree: 14 },
    { offset: 1, degree: 12 },
    { offset: 2, degree: 9 },
    { offset: 2.5, degree: 12 },
    { offset: 3, degree: 14 },
  ],
  [
    { offset: 0.5, degree: 12 },
    { offset: 1, degree: 16 },
    { offset: 2, degree: 19 },
    { offset: 2.5, degree: 21 },
    { offset: 3, degree: 19 },
  ],
  [
    { offset: 0, degree: 19 },
    { offset: 1, degree: 16 },
    { offset: 1.5, degree: 14 },
    { offset: 2, degree: 12 },
    { offset: 3, degree: -1 },
  ],
  [
    { offset: 0, degree: 7 },
    { offset: 1, degree: 12 },
    { offset: 1.5, degree: 14 },
    { offset: 2, degree: 16 },
    { offset: 3, degree: 19 },
    { offset: 3.5, degree: 21 },
  ],
];

/** 相邻五声音阶索引的步进(用于生成自然音阶级进) */
function pentatonicNote(baseMidi: number, steps: number): number {
  const octave = Math.floor(steps / PENTATONIC.length);
  const idx = ((steps % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length;
  return baseMidi + PENTATONIC[idx] + octave * 12;
}

/** 动机移位:把动机各音按五声音阶级数平移 */
function transposeMotif(
  motif: { offset: number; degree: number }[],
  root: number,
  semitoneShift: number
): { offset: number; note: number; isRest: boolean }[] {
  return motif.map(({ offset, degree }) => {
    if (degree < 0) return { offset, note: 0, isRest: true };
    // 和弦根音为基准取五声音阶最近音,再整体移位
    const steps = Math.round((degree / 12) * PENTATONIC.length);
    return { offset, note: root + 12 + PENTATONIC[steps % 5] + semitoneShift, isRest: false };
  });
}

const LOOKAHEAD = 0.6; // 提前排程秒数
const TICK_MS = 200;

export class Music {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private barIndex = 0;
  /** 当前乐句的旋律安排:8 小节,每小节一组音符(或 null 表示该小节只伴奏) */
  private phrase: { offset: number; note: number; isRest: boolean }[][];
  private night = false;
  private disposed = false;

  constructor(private ctx: AudioContext, private dest: AudioNode) {
    this.phrase = this.newPhrase();
  }

  start(): void {
    if (this.timer) return;
    this.nextBarTime = this.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  /** 昼夜切换:夜晚更慢、更低、更稀疏 */
  setNight(night: boolean): void {
    if (this.night === night) return;
    this.night = night;
    this.phrase = this.newPhrase();
  }

  private get bpm(): number {
    return this.night ? 56 : 72;
  }

  /** 生成一个 8 小节乐句:动机呈示 → 变奏 → 发展 → 收束 */
  private newPhrase(): { offset: number; note: number; isRest: boolean }[][] {
    const motif = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
    const variation = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
    const bars: { offset: number; note: number; isRest: boolean }[][] = [];
    for (let i = 0; i < 8; i++) {
      // 夜晚一半小节留白,只留伴奏呼吸
      if (this.night && i % 2 === 1) {
        bars.push([]);
        continue;
      }
      const source =
        i < 2
          ? motif // 呈示
          : i < 4
            ? motif // 重复巩固
            : i < 6
              ? variation // 换动机发展
              : MOTIFS[Math.floor(Math.random() * MOTIFS.length)]; // 收束
      const shift = i >= 2 && i < 4 ? 5 : 0; // 重复时上移(近似五声四度)
      bars.push(transposeMotif(source, PROGRESSION[i].root, shift));
    }
    return bars;
  }

  private schedule(): void {
    if (this.disposed) return;
    const barDur = (60 / this.bpm) * 4;
    while (this.nextBarTime < this.ctx.currentTime + LOOKAHEAD) {
      this.scheduleBar(this.barIndex, this.nextBarTime, barDur);
      this.nextBarTime += barDur;
      this.barIndex++;
      if (this.barIndex % 8 === 0) this.phrase = this.newPhrase();
    }
  }

  private scheduleBar(bar: number, barTime: number, barDur: number): void {
    const beat = barDur / 4;
    const { root, chord } = PROGRESSION[bar % PROGRESSION.length];
    const melodyOctave = this.night ? 0 : 12;

    // 伴奏:分解和弦,8 分音符,波浪形起伏
    const arpPattern = this.night ? [0, 2, 1] : [0, 1, 2, 1, 0, 2, 1, 2];
    arpPattern.forEach((chordIdx, i) => {
      const t = barTime + (i * barDur) / arpPattern.length;
      const note = root + 12 + [0, 4, 7][chordIdx];
      pianoTone(this.ctx, this.dest, midiToFreq(note), t, 1.6, 0.07);
    });

    // 铺底:整小节持续和弦,极轻的三角波群
    const padNotes = this.night ? [chord[0], chord[2]] : chord;
    padNotes.forEach((note) => {
      tone(
        this.ctx,
        this.dest,
        midiToFreq(note - 12),
        barTime,
        { attack: barDur * 0.4, decay: barDur * 0.8, peak: 0.022 },
        'triangle'
      );
    });

    // 旋律:乐句安排的音符,偶尔留白让伴奏呼吸
    for (const { offset, note, isRest } of this.phrase[bar % this.phrase.length]) {
      if (isRest) continue;
      if (Math.random() < 0.06) continue; // 轻微随机留白,每次听都不同
      const t = barTime + offset * beat;
      const dur = 1.4 + Math.random() * 0.6;
      pianoTone(this.ctx, this.dest, midiToFreq(note + melodyOctave), t, dur, 0.14);
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
