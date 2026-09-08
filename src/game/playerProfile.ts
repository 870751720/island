import type { PlayerGender } from './entities/PlayerModel';

/** 玩家个人档案:昵称 + 性别,开始游戏前首次设置,之后可在开始界面随时修改。 */
export type PlayerProfile = {
  name: string;
  gender: PlayerGender;
};

const PROFILE_KEY = 'island.profile.v1';
const LEGACY_NICKNAME_KEY = 'island.nickname';

function sanitizeName(raw: string): string {
  return raw.trim().slice(0, 8);
}

function parseGender(raw: unknown): PlayerGender {
  return raw === 'girl' ? 'girl' : 'boy';
}

export function loadProfile(): PlayerProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; gender?: string };
    const name = sanitizeName(parsed.name ?? '');
    if (!name) return null;
    return { name, gender: parseGender(parsed.gender) };
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  const name = sanitizeName(profile.name);
  if (!name) return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, gender: profile.gender }));
  } catch {}
}

/** 只改性别保留昵称(游戏内 GM 改性别时同步回个人档案)。 */
export function saveProfileGender(gender: PlayerGender): void {
  const profile = loadProfile();
  if (profile) saveProfile({ ...profile, gender });
}

/** 旧版本把昵称存在 island.nickname,迁移为设置弹窗的默认昵称。 */
export function legacyNickname(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sanitizeName(window.localStorage.getItem(LEGACY_NICKNAME_KEY) ?? '');
  } catch {
    return '';
  }
}
