/** Browser and server share the transport format, without depending on game runtime. */
export const MAX_BYTES = 10 * 1024 * 1024;
export const CLOUD_CODE_KEY = 'island.cloud.code.v1';
export type SaveBundle = {
  format: 'island-cloud-backup';
  version: 1;
  savedAt: number;
  entries: Record<string, string | null>;
};

export function isGameStorageKey(key: string): boolean {
  return key.startsWith('island.') || key.startsWith('island-');
}

export function normalizeCode(value: string): string {
  const code = value.trim();
  if (!code || code.length > 20 || /[\s\p{C}]/u.test(code)) {
    throw new Error('请输入 1～20 位存档码，不能包含空格或控制字符。');
  }
  return code;
}

export function parseBundle(text: string): SaveBundle {
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new Error('存档超过 10 MiB。');
  let data: SaveBundle;
  try { data = JSON.parse(text); } catch { throw new Error('存档内容损坏，本地数据未改动。'); }
  if (!data || data.format !== 'island-cloud-backup' || data.version !== 1
    || !Number.isFinite(data.savedAt) || data.savedAt <= 0
    || !data.entries || typeof data.entries !== 'object' || Array.isArray(data.entries)
    || Object.keys(data.entries).length > 256
    || Object.entries(data.entries).some(([key, value]) => !isGameStorageKey(key)
      || key.length > 200 || (value !== null && typeof value !== 'string'))) {
    throw new Error('存档格式无法识别，本地数据未改动。');
  }
  if (!Object.entries(data.entries).some(([key, value]) => key !== CLOUD_CODE_KEY && value !== null)) {
    throw new Error('还没有可备份的游戏数据。');
  }
  return data;
}
