import type { DogCombatSave } from './DogCombat';

export const DOG_STAGES = [
  { stage: 1, name: '小小护卫', xp: 0, interval: 3, range: 8, reach: 1.5, reaction: 0.6, skill: '扑咬护主' },
  { stage: 2, name: '默契伙伴', xp: 120, interval: 3, range: 11, reach: 1.5, reaction: 0.3, skill: '更快响应，支援更远' },
  { stage: 3, name: '熟练猎手', xp: 360, interval: 2.5, range: 11, reach: 2, reaction: 0.3, skill: '扑咬更快、更远' },
  { stage: 4, name: '可靠护卫', xp: 800, interval: 2.5, range: 12, reach: 2, reaction: 0.2, skill: '每 10 秒可击退一次' },
  { stage: 5, name: '忠诚守护者', xp: 1500, interval: 2.5, range: 14, reach: 2.5, reaction: 0.15, skill: '低血量救场，冷却 45 秒' },
] as const;

export type DogGrowthSave = { xp?: number; companionSeconds?: number; protectCooldown?: number };
export type DogSave = DogGrowthSave & DogCombatSave & { x: number; z: number; eatCooldown?: number };
export type DogGmCommand = 'stage' | 'xp' | 'cooldowns' | 'recall' | 'foods' | 'threat' | 'rescue' | 'companion' | 'protect';
export const DOG_GM_COMMANDS: readonly DogGmCommand[] = ['stage', 'xp', 'cooldowns', 'recall', 'foods', 'threat', 'rescue', 'companion', 'protect'];

function finite(value: number | undefined, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
}

/** 唯一成长进度；所有经验与计时只由权威端推进。 */
export class DogGrowth {
  xp = 0;
  companionSeconds = 0;
  protectCooldown = 0;
  onStage: (stage: number) => void = () => {};

  get config() {
    let current: (typeof DOG_STAGES)[number] = DOG_STAGES[0];
    for (const stage of DOG_STAGES) if (this.xp >= stage.xp) current = stage;
    return current;
  }

  add(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const before = this.config.stage;
    this.xp = finite(this.xp + amount, 1500);
    if (this.config.stage > before) this.onStage(this.config.stage);
  }

  setStage(stage: number): void {
    const config = DOG_STAGES.find(item => item.stage === stage);
    if (!config) return;
    const before = this.config.stage;
    this.xp = config.xp;
    if (stage > before) this.onStage(stage);
  }

  update(delta: number, accompanying: boolean): void {
    this.protectCooldown = Math.max(0, this.protectCooldown - delta);
    if (!accompanying || this.xp >= 1500) return;
    this.companionSeconds += delta;
    if (this.companionSeconds >= 60) {
      const amount = Math.floor(this.companionSeconds / 60);
      this.companionSeconds %= 60;
      this.add(amount);
    }
  }

  protectedPlayer(): void {
    if (this.protectCooldown > 0) return;
    this.protectCooldown = 60;
    this.add(12);
  }

  restore(save: DogGrowthSave): void {
    this.xp = finite(save.xp, 1500);
    this.companionSeconds = finite(save.companionSeconds, 59.999);
    this.protectCooldown = finite(save.protectCooldown, 60);
  }

  snapshot(): DogGrowthSave {
    return { xp: this.xp, companionSeconds: this.companionSeconds, protectCooldown: this.protectCooldown };
  }
}
