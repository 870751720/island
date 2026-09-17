type PlainData = undefined | null | boolean | number | string | PlainData[] | { [key: string]: PlainData };

/** 仅复制存档中的普通数据树（含 undefined），不承诺支持循环、类实例或可转移对象。 */
export function clonePlainData<T extends PlainData>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  return copy(value) as T;
}

function copy(value: PlainData): PlainData {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(copy);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
}
