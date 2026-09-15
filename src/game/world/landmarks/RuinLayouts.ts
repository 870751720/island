import type { ShrineKind } from '../../entities/Shrine';
import type { LandmarkKind } from './LandmarkDefinitions';
import type { LandmarkBuilder } from './LandmarkBuilder';

const shrines: Partial<Record<LandmarkKind, ShrineKind>> = {
  seaRuin: 'poseidonBlessing', harvestRuin: 'beehiveShrine', healingRuin: 'healCrystal',
  rainRuin: 'rainAltar', incenseRuin: 'crocIncense',
};

/** 每处遗迹以一座神龛为中心；不放床，入口始终能步行抵达奖励。 */
export function buildRuin(kind: LandmarkKind, b: LandmarkBuilder): boolean {
  const shrine = shrines[kind];
  if (!shrine) return false;
  switch (kind) {
    case 'seaRuin':
      // 三条石脊与底部横脊形成三叉戟，右侧断开作为入口。
      b.add('shrine', 0, -1, { shrine });
      b.line(-4, -4, 0, 1, 7, true); b.line(4, -4, 0, 1, 5, true);
      b.line(0, -6, 0, 1, 3, true); b.line(-3, 2, 1, 0, 6, true);
      b.line(0, 3, 0, 1, 3, true);
      b.add('torch', -2, -3); b.add('torch', 2, -3);
      b.crate(-2, 0, [['stone', 3], ['flint', 2]]);
      break;
    case 'harvestRuin':
      b.add('shrine', 0, -2, { shrine });
      // 金色后景与矮作物前景围出收获通道。
      b.plot(-4, -4, 2, 4, 'wheat'); b.plot(3, -4, 2, 4, 'wheat');
      b.plot(-4, 2, 2, 2, 'carrot'); b.plot(3, 2, 2, 2, 'potato');
      b.line(-4, -5, 1, 0, 9, true);
      b.line(-5, 1, 0, 1, 4); b.line(5, 1, 0, 1, 4);
      b.add('torch', -1, 3); b.add('torch', 1, 3);
      b.crate(0, -4, [['stone', 3], ['flint', 2]]);
      break;
    case 'healingRuin':
      b.add('shrine', 0, 0, { shrine });
      // 紧凑八边内院，正面开口，断墙使水晶保留完整视线。
      b.line(-2, -4, 1, 0, 5, true);
      b.line(-4, -2, 0, 1, 5, true); b.line(4, -2, 0, 1, 5, true);
      for (const x of [-3, 3]) { b.add('fence', x, -3, { stone: true }); b.add('fence', x, 3, { stone: true }); }
      b.line(-2, 4, 1, 0, 2, true); b.line(1, 4, 1, 0, 2, true);
      b.add('torch', -2, -2); b.add('torch', 2, -2);
      b.crate(2, 1, [['stone', 3], ['flint', 2]]);
      break;
    case 'rainRuin':
      b.add('shrine', 0, -3, { shrine });
      // 短横墙夹出层层收窄的仪式中轴。
      b.line(-2, -5, 1, 0, 5, true);
      for (const side of [-1, 1]) {
        b.line(side * 2, -2, side, 0, 2, true);
        b.line(side * 3, 1, side, 0, 2, true);
        b.line(side * 4, 4, side, 0, 2, true);
      }
      b.add('torch', -2, 3); b.add('torch', 2, 3);
      b.crate(3, -4, [['stone', 3], ['flint', 2]]);
      break;
    case 'incenseRuin':
      b.add('shrine', 0, -2, { shrine });
      // 后侧石龛与前侧双木翼区分内外防线。
      b.line(-2, -4, 1, 0, 5, true); b.line(-3, -3, 0, 1, 3, true); b.line(3, -3, 0, 1, 3, true);
      b.line(-5, 0, 0, 1, 4); b.line(5, 0, 0, 1, 4);
      b.line(-5, 4, 1, 0, 4); b.line(2, 4, 1, 0, 4); b.add('gate', -1, 4);
      b.add('torch', -2, 2); b.add('torch', 2, 2);
      b.crate(-2, -1, [['stone', 3], ['flint', 2]]);
      break;
  }
  return true;
}
