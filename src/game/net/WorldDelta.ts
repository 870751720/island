import type { WorldPatch } from './Protocol';

export type WorldSection = keyof WorldPatch;
export type WorldEntity = Record<string, unknown>;

export type WorldDeltaOp =
  | { section: WorldSection; key: string; op: 'add'; value: unknown }
  | { section: WorldSection; key: string; op: 'remove' }
  | { section: WorldSection; key: string; op: 'set'; fields: Record<string, unknown> };

const SCALAR_SECTIONS = new Set<WorldSection>(['workbenchCrafted']);

function n(value: unknown): string {
  return typeof value === 'number' ? value.toFixed(4) : String(value ?? '');
}

/** 坐标是现有存档实体的稳定身份；类型/方向用于区分可能共点的实体。 */
export function worldEntityKey(section: WorldSection, raw: unknown): string {
  const value = raw as WorldEntity;
  if (typeof value.id === 'string' && value.id) return value.id;
  switch (section) {
    case 'props':
      return `${value.kind}:${n(value.x)}:${n(value.z)}`;
    case 'fences':
      return `${n(value.x)}:${n(value.z)}`;
    case 'fenceGates':
      return `${n(value.x)}:${n(value.z)}:${value.dir}`;
    case 'drops':
      return `${value.kind}:${value.source}:${n(value.x)}:${n(value.z)}`;
    default:
      return `${n(value.x)}:${n(value.y)}:${n(value.z)}`;
  }
}

function setFieldPath(target: WorldEntity, path: string, value: unknown): void {
  const parts = path.split('.');
  let cursor: Record<string, unknown> | unknown[] = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = Array.isArray(cursor) ? cursor[Number(part)] : cursor[part];
    if (!next || typeof next !== 'object') return;
    cursor = next as Record<string, unknown> | unknown[];
  }
  const last = parts.at(-1)!;
  if (Array.isArray(cursor)) cursor[Number(last)] = value;
  else cursor[last] = value;
}

function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 对两份世界状态做实体/字段级比较。只有真正改变的字段进入网络包。 */
export function diffWorld(previous: WorldPatch, current: WorldPatch): WorldDeltaOp[] {
  const ops: WorldDeltaOp[] = [];
  for (const section of Object.keys(current) as WorldSection[]) {
    const before = previous[section];
    const after = current[section];
    if (SCALAR_SECTIONS.has(section)) {
      if (!equal(before, after)) ops.push({ section, key: '', op: 'set', fields: { value: after } });
      continue;
    }
    const oldMap = new Map((before as unknown[] | undefined ?? []).map((item) => [worldEntityKey(section, item), item]));
    const newMap = new Map((after as unknown[] | undefined ?? []).map((item) => [worldEntityKey(section, item), item]));
    for (const [key, oldValue] of oldMap) {
      if (!newMap.has(key)) ops.push({ section, key, op: 'remove' });
      else {
        const nextValue = newMap.get(key) as WorldEntity;
        const fields: Record<string, unknown> = {};
        for (const field of Object.keys(nextValue)) {
          if (!equal((oldValue as WorldEntity)[field], nextValue[field])) fields[field] = nextValue[field];
        }
        if (Object.keys(fields).length) ops.push({ section, key, op: 'set', fields });
      }
    }
    for (const [key, value] of newMap) {
      if (!oldMap.has(key)) ops.push({ section, key, op: 'add', value });
    }
  }
  return ops;
}

/** 客人维护一份轻量镜像；应用增量后再交给现有场景系统更新。 */
export function applyWorldDelta(state: WorldPatch, ops: readonly WorldDeltaOp[]): Set<WorldSection> {
  const changed = new Set<WorldSection>();
  for (const item of ops) {
    changed.add(item.section);
    if (SCALAR_SECTIONS.has(item.section)) {
      if (item.op === 'set') Object.assign(state, { [item.section]: item.fields.value });
      continue;
    }
    const list = [...((state[item.section] as unknown[] | undefined) ?? [])];
    const index = list.findIndex((value) => worldEntityKey(item.section, value) === item.key);
    if (item.op === 'remove') {
      if (index >= 0) list.splice(index, 1);
    } else if (item.op === 'add') {
      if (index < 0) list.push(item.value);
    } else if (index >= 0) {
      const entity = { ...(list[index] as WorldEntity) };
      for (const [path, value] of Object.entries(item.fields)) setFieldPath(entity, path, value);
      list[index] = entity;
    }
    Object.assign(state, { [item.section]: list });
  }
  return changed;
}
