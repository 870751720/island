import { LEGACY_PIECES, type Piece, type MusicGroup } from './MusicPieces';
export type { Bar, Piece } from './MusicPieces';

// 调内三和弦保留各季节的明暗色彩;旋律按小节手写,每曲含前后两个乐句。
const SCALE = [0, 2, 4, 5, 7, 9, 11];
function score(name: string, title: string, group: MusicGroup, bpm: number,
  beatsPerBar: number, waltz: boolean, tonic: number, roots: number[], melody: string, sparse = false): Piece {
  return {
    name, title, group, bpm, beatsPerBar, waltz, sparse,
    bars: melody.split('|').map((phrase, index) => {
      const degree = SCALE.indexOf(roots[index % roots.length]);
      const chord = [0, 2, 4].map((step) => {
        const d = degree + step;
        return tonic + SCALE[d % 7] + Math.floor(d / 7) * 12;
      });
      const notes = phrase.split(' ').map(Number);
      const durations = notes.length === 1 ? [beatsPerBar]
        : notes.length === 2 ? [beatsPerBar - 1, 1]
        : [beatsPerBar - 2, 1, 1];
      let beat = 0;
      return {
        root: tonic + roots[index % roots.length] - 12, chord,
        melody: notes.map((midi, i) => {
          const note = { beat, midi, dur: durations[i] };
          beat += durations[i];
          return note;
        }),
      };
    }),
  };
}

export const MUSIC_GROUP_LABELS: Record<MusicGroup, string> = {
  spring: '春日', summer: '盛夏', autumn: '金秋', winter: '冬雪', fishing: '钓鱼', classic: '原有曲目', wind: '刮风', rain: '下雨', snow: '下雪',
};

export const MUSIC_PIECES: Piece[] = [
  score('spring-dew', '春芽晨露', 'spring', 68, 4, false, 60, [0, 5, 2, 7, 0, 9, 5, 7],
    '76 79 81|79 76|74 77 79|74 72|76 79 84|81 79|77 76 74|74 72|79 81 84|83 79|81 77 74|79 74|76 74 72|76 81 79|77 74|72'),
  score('spring-letter', '樱雨来信', 'spring', 62, 3, true, 65, [0, 9, 5, 7, 2, 5, 7, 0],
    '81 79|77 81 84|82 81|79|77 79 81|82 86|84 79|77|84 81|81 79 77|82 81 77|79 84|86 84 81|82 79|79 76|77'),
  score('summer-shade', '树荫午睡', 'summer', 52, 4, false, 67, [0, 2, 5, 0, 9, 5, 7, 0],
    '79|81 79|79 76|79|76|79 76|78|79|83 81|81|79 76|79|76 79|81|78 76|79', true),
  score('summer-tide', '蓝湾晚风', 'summer', 50, 4, false, 60, [0, 9, 5, 7, 0, 2, 7, 0],
    '76|76 72|77|74 72|76|77 74|74|72|79 76|76|77 76|74|76 72|74|74 71|72', true),
  score('autumn-leaf', '落叶书签', 'autumn', 60, 4, false, 60, [9, 5, 0, 7, 2, 9, 5, 7],
    '76 72 69|77 76|79 76 72|74|77 74 72|76 72|77 81 79|74 71|81 79 76|77 72|76 79 84|83 79|81 77 74|76 72 69|77 74|71'),
  score('autumn-path', '金色归途', 'autumn', 66, 3, true, 65, [0, 5, 9, 2, 5, 0, 7, 0],
    '77 81|82 81 77|81 84|86|82 79|81 77|79 76|77|84 81|86 82|84 81 79|81 77|82 86 84|81 79|79 76|77'),
  score('winter-snow', '初雪无声', 'winter', 54, 4, false, 62, [0, 5, 9, 2, 0, 5, 7, 0],
    '78 81|79|78 74 73|76|74 78 81|83 79|81 76|74|81 85|83 81|78 76 73|78|81 78 74|79 76|76 73|74'),
  score('winter-lamp', '雪夜灯火', 'winter', 56, 3, false, 60, [9, 5, 0, 7, 2, 5, 7, 9],
    '72 76|77|76 79|74 71|74 77|76 72|71|69|81 76|81 77|79 76 72|74|77 74|77 72|74 71|69'),
  score('fishing-ripple', '浮漂微光', 'fishing', 58, 4, false, 60, [0, 5, 2, 7, 9, 5, 7, 0],
    '76 79|77|74 77|79 74|76 72|77 81|74|72|79 84|81 77|77 74|79|81 76|77 74|74 71|72'),
  score('fishing-cloud', '云影慢渡', 'fishing', 60, 3, false, 65, [0, 2, 5, 0, 9, 5, 7, 0],
    '81 84|86 81|82|81 77|81 79|82 79|79|77|84 81|81 77|86 82|84|81 77|82 79|79 76|77'),
  score('fishing-moon', '一竿月色', 'fishing', 52, 4, false, 67, [9, 5, 0, 2, 9, 5, 7, 0],
    '79 83|84|83 79|81 78|79 76|81 84|81|79|83 86|88 84|86 83|81|83 79|84 81|81 78|79'),
  score('wind-leaves', '风过树梢', 'wind', 54, 4, false, 65, [0, 5, 2, 7, 9, 5, 7, 0],
    '77 81|82|81 77|79|81 79|77|79 76|77|84|82 81|81 77|79 77|81|82 79|79 76|77', true),
  score('wind-letter', '远风来信', 'wind', 52, 4, false, 60, [0, 9, 5, 2, 0, 5, 7, 0],
    '72|76 79|77 76|74|76 72|77|74 71|72|79 76|76|81 77|77 74|76|77 74|71|72', true),
  score('rain-window', '檐下听雨', 'rain', 50, 4, false, 60, [9, 5, 0, 7, 2, 5, 7, 9],
    '72 76|77|76 72|74|77 74|72|71 74|69|76|77 76|79 76|74 71|74|77 72|71|69', true),
  score('rain-clear', '雨后的微光', 'rain', 54, 4, false, 65, [0, 2, 5, 7, 9, 5, 7, 0],
    '77|81 77|82 81|79|81|82 77|79 76|77|81 84|81|82 79|79|81 77|82|79 76|77', true),
  score('snow-feather', '雪落如羽', 'snow', 48, 4, false, 62, [0, 5, 9, 2, 5, 0, 7, 0],
    '78|79 78|78 74|76|79|78 74|76 73|74|81|83 79|78|76 74|79 76|78|73|74', true),
  score('snow-home', '围炉等雪', 'snow', 50, 4, false, 60, [0, 9, 5, 7, 2, 5, 7, 0],
    '72 76|76|77 72|74|74 77|77|71 74|72|79 76|76 72|77|74 71|77 74|72|71|72', true),
  ...LEGACY_PIECES,
];
