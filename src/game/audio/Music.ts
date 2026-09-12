import { midiToFreq, pianoTone, tone } from './synth';
import { MUSIC_PIECES, type Bar, type Piece } from './MusicLibrary';
import type { Season } from '../systems/SeasonSystem';

/** 每首曲子连续播放的遍数,听熟一点再换 */
const REPEATS_BEFORE_SWITCH = 2;

const LOOKAHEAD = 0.6; // 提前排程秒数
const TICK_MS = 200;

export class Music {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private barCounter = 0;
  private playlist = MUSIC_PIECES.filter((p) => p.group === 'spring');
  private pieceIndex = 0;
  private selection: string | null = null;
  private context = 'spring';
  private cursors = new Map<string, { pieceIndex: number; barCounter: number }>();
  private season: Season = 'spring';
  private fishing = false;
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

  /** 本机表现状态;手动选曲不广播、不写入存档。 */
  get status() {
    return { id: this.piece.name, title: this.piece.title, selection: this.selection };
  }

  setContext(season: Season, fishing: boolean): void {
    this.season = season;
    this.fishing = fishing;
    this.refreshPlaylist();
  }

  select(id: string | null): void {
    if (id !== null && !MUSIC_PIECES.some((p) => p.name === id)) return;
    this.selection = id;
    this.refreshPlaylist();
  }

  private refreshPlaylist(): void {
    const key = this.selection ? `track:${this.selection}` : (this.fishing ? 'fishing' : this.season);
    if (key === this.context) return;
    this.cursors.set(this.context, { pieceIndex: this.pieceIndex, barCounter: this.barCounter });
    this.context = key;
    this.playlist = MUSIC_PIECES.filter((p) => this.selection ? p.name === this.selection : p.group === key);
    const cursor = this.selection ? undefined : this.cursors.get(key);
    this.pieceIndex = cursor?.pieceIndex ?? 0;
    this.barCounter = cursor?.barCounter ?? 0;
    // 已排程的小节自然收尾,下一小节进入新曲,避免截断与叠加整首音乐。
  }

  private get piece(): Piece {
    return this.playlist[this.pieceIndex];
  }

  private get bpm(): number {
    return this.night ? Math.round(this.piece.bpm * 0.8) : this.piece.bpm;
  }

  private schedule(): void {
    if (this.disposed) return;
    // 手机后台恢复时跳过过期排程,防止集中补播大量音符。
    if (this.nextBarTime < this.ctx.currentTime) this.nextBarTime = this.ctx.currentTime + 0.05;
    while (this.nextBarTime < this.ctx.currentTime + LOOKAHEAD) {
      const piece = this.piece;
      const barDur = (60 / this.bpm) * piece.beatsPerBar;
      this.scheduleBar(piece.bars[this.barCounter % piece.bars.length], this.nextBarTime, barDur, piece);
      this.nextBarTime += barDur;
      this.barCounter++;
      // 一首弹完几遍换下一首
      if (this.barCounter >= piece.bars.length * REPEATS_BEFORE_SWITCH) {
        this.barCounter = 0;
        this.pieceIndex = (this.pieceIndex + 1) % this.playlist.length;
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
        pianoTone(this.ctx, this.dest, midiToFreq(bar.chord[idx]), t, 1.6, 0.05);
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
