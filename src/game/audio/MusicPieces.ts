import type { Season } from '../systems/SeasonSystem';

export type MusicGroup = Season | 'fishing' | 'classic';

/** 单个旋律音:在小节内的拍偏移、MIDI 音高、时长(拍) */
export type Note = { beat: number; midi: number; dur: number };

export type Bar = {
  /** 和弦根音 MIDI(低音区) */
  root: number;
  /** 和弦音 MIDI(中音区,铺底用) */
  chord: number[];
  melody: Note[];
};

export type Piece = {
  name: string;
  title: string;
  group: MusicGroup;
  bpm: number;
  beatsPerBar: number;
  /** 圆舞曲等「低音-和弦」织体用;false 时为波浪形分解和弦 */
  waltz: boolean;
  bars: Bar[];
};

export const LEGACY_PIECES: Piece[] = [
  {
    // 夏日之风:C 大调,如歌的级进旋律
    name: 'summer', title: '夏日之风', group: 'classic',
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
    name: 'waltz', title: '海边圆舞曲', group: 'classic',
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
    name: 'forest', title: '森林絮语', group: 'classic',
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

