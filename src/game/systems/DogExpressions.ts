export const DOG_BATTLE_EMOJIS = ['dog-alert', 'dog-bite', 'dog-guard'] as const;
export type DogBattleEmoji = (typeof DOG_BATTLE_EMOJIS)[number];
export type DogBattleNotice = { glyph: DogBattleEmoji; serial: number };
export const DOG_STAGE_NOTICE_SECONDS = 1.6;
export const DOG_BATTLE_EMOJI_SECONDS = 2;
