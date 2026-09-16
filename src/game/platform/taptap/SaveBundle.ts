import { SAVE_VERSION } from '../../systems/SaveSystem';

/** 手动备份全部游戏数据与全局偏好；不包含联机凭证或其他站点数据。 */
const KEYS = [
  'island.save.v1', 'island.profile.v1', 'island.meta.v1',
  'island.firstDeathBlessing.v1', 'island-game-mode', 'island.nickname',
  'island-audio-settings', 'island-menu-sound', 'island.quest-guide',
  'island.gameplayZoom.v1', 'island.landmarkChances.v1',
] as const;
type SaveKey = typeof KEYS[number];
export type SaveBundle = {
  format: 'island-taptap-backup';
  version: 1;
  savedAt: number;
  entries: Record<SaveKey, string | null>;
};

const MAX_BYTES = 10 * 1024 * 1024;
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parse(text: string): unknown {
  try { return JSON.parse(text); }
  catch { throw new Error('存档内容损坏，无法读取。本地数据未改动。'); }
}

export function decodeBundle(text: string): SaveBundle {
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new Error('存档超过 10 MiB，无法读取。');
  const data = parse(text);
  if (!object(data) || data.format !== 'island-taptap-backup' || data.version !== 1
    || typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt) || data.savedAt <= 0
    || !object(data.entries)) throw new Error('云存档格式无法识别，本地数据未改动。');
  for (const key of KEYS) {
    if (data.entries[key] !== null && typeof data.entries[key] !== 'string') {
      throw new Error('存档数据不完整，本地数据未改动。');
    }
  }
  const entries = data.entries as SaveBundle['entries'];
  if (KEYS.every(key => entries[key] === null)) throw new Error('还没有可备份的游戏数据。');
  if (entries['island.save.v1'] !== null) {
    const save = parse(entries['island.save.v1']);
    if (!object(save) || save.version !== SAVE_VERSION) throw new Error('存档与当前游戏版本不兼容，本地数据未改动。');
    if (!Array.isArray(save.props) || !Array.isArray(save.slots) || !object(save.player)
      || !object(save.survival) || typeof save.terrainSeed !== 'number' || !Number.isFinite(save.terrainSeed)
      || typeof save.day !== 'number' || !Number.isFinite(save.day)) throw new Error('游戏进度不完整，本地数据未改动。');
  }
  if (entries['island.profile.v1'] !== null) {
    const profile = parse(entries['island.profile.v1']);
    if (!object(profile) || typeof profile.name !== 'string' || !profile.name.trim()
      || !['boy', 'girl'].includes(String(profile.gender))) throw new Error('玩家形象数据损坏，本地数据未改动。');
  }
  if (entries['island.meta.v1'] !== null) {
    const meta = parse(entries['island.meta.v1']);
    if (!object(meta) || typeof meta.points !== 'number' || !Number.isFinite(meta.points) || !object(meta.levels)) {
      throw new Error('传承数据损坏，本地数据未改动。');
    }
  }
  if (![null, 'pending', 'used'].includes(entries['island.firstDeathBlessing.v1'])
    || ![null, 'leisure', 'survival'].includes(entries['island-game-mode'])
    || ![null, 'on', 'off'].includes(entries['island-menu-sound'])
    || ![null, 'on', 'off'].includes(entries['island.quest-guide'])) {
    throw new Error('存档设置数据损坏，本地数据未改动。');
  }
  if (entries['island-audio-settings'] !== null) {
    const audio = parse(entries['island-audio-settings']);
    if (!object(audio) || !['music', 'sfx'].every(key => typeof audio[key] === 'number' && audio[key] >= 0 && audio[key] <= 1)) {
      throw new Error('音量设置损坏，本地数据未改动。');
    }
  }
  if (entries['island.gameplayZoom.v1'] !== null && !Number.isFinite(Number(entries['island.gameplayZoom.v1']))) {
    throw new Error('画面缩放设置损坏，本地数据未改动。');
  }
  if (entries['island.landmarkChances.v1'] !== null) {
    const chances = parse(entries['island.landmarkChances.v1']);
    if (!Array.isArray(chances) || chances.length !== 3 || !chances.every(value => typeof value === 'number' && value >= 0 && value <= 100)) {
      throw new Error('地标生成配置损坏，本地数据未改动。');
    }
  }
  return data as SaveBundle;
}

export function captureBundle(): SaveBundle {
  let entries: SaveBundle['entries'];
  try { entries = Object.fromEntries(KEYS.map(key => [key, localStorage.getItem(key)])) as SaveBundle['entries']; }
  catch { throw new Error('当前环境无法读取本地存档，上传未开始。'); }
  return decodeBundle(JSON.stringify({ format: 'island-taptap-backup', version: 1, savedAt: Date.now(), entries }));
}

export function bundleSummary(bundle: SaveBundle): string {
  const raw = bundle.entries['island.save.v1'];
  const day = raw ? `第 ${(JSON.parse(raw) as { day: number }).day} 天` : '暂无岛屿进度';
  return `${day} · ${new Date(bundle.savedAt).toLocaleString('zh-CN')}`;
}

/** 仅在菜单确认后调用；先完成验证，写入失败时尝试回滚全部白名单项。 */
export function restoreBundle(bundle: SaveBundle): void {
  const verified = decodeBundle(JSON.stringify(bundle));
  let before: (readonly [SaveKey, string | null])[];
  try { before = KEYS.map(key => [key, localStorage.getItem(key)] as const); }
  catch { throw new Error('当前环境无法访问本地存储，尚未覆盖数据。'); }
  const write = (key: SaveKey, value: string | null) => {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    if (localStorage.getItem(key) !== value) throw new Error('本地存储写入未成功');
  };
  try {
    for (const key of KEYS) write(key, verified.entries[key]);
  } catch {
    let rolledBack = true;
    for (const [key, value] of before) {
      try { write(key, value); } catch { rolledBack = false; }
    }
    throw new Error(rolledBack
      ? '本地空间不足或存储不可用，已保留原数据。请清理空间后重试。'
      : '本地写入失败，部分数据未能恢复。云端备份未改动，请保留此页面并稍后重试下载。');
  }
}
