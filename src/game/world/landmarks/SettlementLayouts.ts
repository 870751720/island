import type { LandmarkKind } from './LandmarkDefinitions';
import type { LandmarkBuilder } from './LandmarkBuilder';

/** 单个居住点搭配职业作业空间；入口与主要设施之间保留通路。 */
export function buildSettlement(kind: LandmarkKind, b: LandmarkBuilder) {
  switch (kind) {
    case 'camp':
      b.bed(-2, -1);
      b.add('fire', 1, 0);
      b.crate(-2, 2, [['wood', 3], ['rope', 1], ['cookedBerry', 2]]);
      b.line(-4, -3, 1, 0, 5); b.line(-4, -2, 0, 1, 3);
      b.add('torch', 3, 2);
      break;
    case 'fishing':
      b.bed(-3, -2, Math.PI / 2);
      b.add('bait', 1, -2); b.add('fire', -2, 2);
      b.crate(3, -2, [['bait', 5], ['sardine', 2], ['cola', 1]]);
      // 后方长栏如晾网架，前侧作业面完全敞开。
      b.line(-5, -4, 1, 0, 11); b.line(5, -3, 0, 1, 3);
      b.add('torch', 4, 1);
      break;
    case 'farm':
      b.bed(-3, -3);
      b.plot(0, -4, 2, 3, 'wheat'); b.plot(3, -4, 2, 3, 'carrot');
      b.add('fire', -3, 1); b.crate(2, 2, [['wheatSeed', 2], ['carrotSeed', 2], ['bread', 1]]);
      b.line(-5, -5, 1, 0, 11); b.line(5, -4, 0, 1, 7);
      b.line(-5, 3, 1, 0, 4); b.add('gate', -1, 3); b.line(2, 3, 1, 0, 3);
      b.add('torch', -2, 2);
      break;
    case 'hunter':
      b.bed(-2, -3, Math.PI / 2); b.add('fire', 0, 0);
      b.crate(2, -3, [['fur', 2], ['arrow', 8], ['cookedGameMeat', 1]],
        b.random() < 0.15 ? [{ kind: 'adventureBook', count: 1 }] : []);
      // 两段错开的挡栏形成折入口，后方留出退路。
      b.line(-4, -4, 0, 1, 8); b.line(-3, 3, 1, 0, 4);
      b.line(4, -2, 0, 1, 7); b.line(2, 4, 1, 0, 2);
      b.add('torch', 3, 2);
      break;
    case 'workshop': {
      b.bed(-3, 2); b.add('bench', -2, -2, { level: 1 });
      const smelt = b.random() < 0.5;
      b.add(smelt ? 'smelter' : 'loom', 2, -2);
      b.crate(3, 1, smelt ? [['ironOre', 3], ['flint', 2]] : [['rope', 3], ['cloth', 1]]);
      b.add('fire', 0, 2);
      b.line(-5, -4, 1, 0, 10, true); b.line(-5, -3, 0, 1, 8, true);
      b.add('torch', 4, 3);
      break;
    }
    case 'brewery':
      b.bed(-3, -2); b.add('brew', 1, -3); b.add('fire', -2, 2);
      b.plot(3, -3, 2, 3, 'wheat');
      b.crate(1, 1, [['fruitFruit', 3], ['berry', 3], ['wineBerry', 1]]);
      b.line(-5, -4, 1, 0, 11); b.line(5, -3, 0, 1, 6);
      b.line(2, 3, 1, 0, 3); b.add('torch', 1, 3);
      break;
    case 'village':
      // 单帐篷作为看守住所，公共作业点围绕弯曲生活街巷。
      b.bed(-4, -4, Math.PI / 2);
      b.add('bench', 0, -4, { level: 1 }); b.add('loom', 3, -4);
      b.add('fire', -1, 0); b.add('brew', -4, 2); b.add('bait', 4, 1);
      b.plot(1, 4, 2, 3, 'wheat'); b.plot(4, 4, 2, 3, 'carrot');
      b.crate(-4, -1, [['wood', 3], ['rope', 2]]);
      b.crate(5, -2, [['bait', 5], ['sardine', 2]]);
      b.line(-6, -6, 1, 0, 11); b.line(-6, -5, 0, 1, 4);
      b.line(-6, 1, 0, 1, 4); b.line(-5, 4, 1, 0, 3);
      b.line(6, 3, 0, 1, 5); b.line(1, 7, 1, 0, 5);
      b.add('torch', -2, 4); b.add('torch', 3, -1);
      break;
    default: throw new Error(`未知聚落类型: ${kind}`);
  }
}
