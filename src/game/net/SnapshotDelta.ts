/** 按稳定 id 生成实体字段补丁；数字先量化，避免浮点微抖造成无意义流量。 */
export type Id = string | number;
export type EntityPatch<T> = Partial<T> & { id: Id };
export type EntityDelta<T> = { full?: T[]; set?: EntityPatch<T>[]; remove?: Id[] };

export function quantize(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function diffEntities<T extends { id: Id }>(
  current: readonly T[],
  previous: Map<Id, T>,
  full = false,
): EntityDelta<T> | null {
  if (full) {
    previous.clear();
    for (const item of current) previous.set(item.id, { ...item });
    return { full: [...current] };
  }
  const set: EntityPatch<T>[] = [];
  const live = new Set<Id>();
  for (const item of current) {
    live.add(item.id);
    const old = previous.get(item.id);
    const patch: Record<string, unknown> = { id: item.id };
    let changed = !old;
    for (const [key, value] of Object.entries(item)) {
      if (key !== 'id' && (!old || old[key as keyof T] !== value)) {
        patch[key] = value;
        changed = true;
      }
    }
    if (changed) set.push(patch as EntityPatch<T>);
    previous.set(item.id, { ...item });
  }
  const remove: Id[] = [];
  for (const id of previous.keys()) {
    if (!live.has(id)) {
      previous.delete(id);
      remove.push(id);
    }
  }
  return set.length || remove.length ? { set: set.length ? set : undefined, remove: remove.length ? remove : undefined } : null;
}

export function applyEntityDelta<T extends { id: Id }>(delta: EntityDelta<T>, cache: Map<Id, T>): T[] {
  if (delta.full) {
    cache.clear();
    for (const item of delta.full) cache.set(item.id, item);
  }
  for (const patch of delta.set ?? []) {
    const old = cache.get(patch.id);
    if (old) cache.set(patch.id, { ...old, ...patch });
    else cache.set(patch.id, patch as T);
  }
  for (const id of delta.remove ?? []) cache.delete(id);
  return [...cache.values()];
}

/** 顶层字段差分。数组和对象只在内容改变时发送，适合低频 HUD。 */
export function diffObject<T extends object>(current: T, previous: T | null): Partial<T> | null {
  if (!previous) return current;
  const patch: Partial<T> = {};
  let changed = false;
  for (const key of Object.keys(current) as (keyof T)[]) {
    const a = current[key];
    const b = previous[key];
    if (a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b))) continue;
    patch[key] = a;
    changed = true;
  }
  return changed ? patch : null;
}
