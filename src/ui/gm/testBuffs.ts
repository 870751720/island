import type { HudBuff } from '@/game/systems/BuffSystem';

export type DisplayBuff = Omit<HudBuff, 'id'> & { id: string };

const THEMES = [
  ['🌟', '星光护佑'], ['🔥', '热力充盈'], ['🍀', '幸运草'],
  ['🧊', '寒霜缠身'], ['🦋', '轻盈步伐'], ['💎', '晶石守护'],
  ['🌙', '月色祝福'], ['🕸️', '蛛网束缚'], ['🌸', '花香环绕'],
  ['⚡', '雷电亲和'], ['🪶', '羽毛庇护'], ['💀', '疲惫诅咒'],
] as const;

/** 本机 HUD 压力测试数据，不进入玩法状态、网络快照或存档。 */
export function createTestBuffs(count: number): DisplayBuff[] {
  const size = Number.isFinite(count) ? Math.max(0, Math.min(100, Math.floor(count))) : 0;
  return Array.from({ length: size }, (_, index) => {
    const [icon, name] = THEMES[index % THEMES.length];
    return {
      id: `gm-test-${index}`, icon, name: `${name} ${index + 1}`,
      description: 'GM 布局测试效果，仅用于检查图标、换行和详情，不影响角色属性。时间数字为固定展示样例。',
      good: index % 4 !== 3,
      remain: index % 3 === 0 ? null : (index + 1) * 15,
    };
  });
}
