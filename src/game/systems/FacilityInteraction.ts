import type { PlayerSession } from '../mp/PlayerSession';
import type { ResourceKind } from './Inventory';
import { ITEMS } from './Items';

export type FacilityInteraction = {
  label: string;
  progress: number;
};

/** 各系统只暴露实际正在进行的回收动作；提示层不识别具体设施系统。 */
export interface FacilityInteractionSource {
  recoveryInteraction(actor: PlayerSession): FacilityInteraction | null;
}

type DigProgress = { getDigProgress(actor: PlayerSession): number | null };
export function recoveryInteraction(
  source: DigProgress, actor: PlayerSession,
  target: ResourceKind | { name: string } | null, action: '挖' | '拆' | '铲' = '挖'
): FacilityInteraction | null {
  const progress = source.getDigProgress(actor);
  if (progress === null || target === null) return null;
  const name = typeof target === 'string' ? ITEMS[target].name : target.name;
  return { label: `${action}${name}…`, progress };
}

/** 注册顺序仅用于异常重叠时的稳定优先级，正常作业由权威端互斥。 */
export class FacilityInteractions {
  private readonly sources = new Set<FacilityInteractionSource>();

  register(source: FacilityInteractionSource): void { this.sources.add(source); }

  current(actor: PlayerSession): FacilityInteraction | null {
    for (const source of this.sources) {
      const interaction = source.recoveryInteraction(actor);
      if (interaction) return interaction;
    }
    return null;
  }
}
