import type { HudSnapshot } from '@/game/GameContracts';
import { EAT_PROMPT_HUNGER, firstFoodEntryIn } from '@/game/systems/Food';

type PromptSnapshot = Pick<
  HudSnapshot,
  'nearDrop' | 'dead' | 'moving' | 'eatName' | 'hunger' | 'slots'
>;

export interface PromptVisibility {
  dropActive: boolean;
  eatActive: boolean;
}

/** 计算左侧提示卡互斥优先级:捡回 > 进食 > 手搓。 */
export function getPromptVisibility(
  hud: PromptSnapshot,
  backpackOpen: boolean,
): PromptVisibility {
  const dropActive = !!hud.nearDrop && !hud.dead && !hud.moving && !backpackOpen;
  const eatActive =
    !dropActive &&
    hud.eatName === null &&
    hud.hunger < EAT_PROMPT_HUNGER &&
    !hud.dead &&
    !hud.moving &&
    !!firstFoodEntryIn(hud.slots);

  return { dropActive, eatActive };
}
