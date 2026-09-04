/** 世界实体的持久化身份。新实体使用短随机 id；旧存档在加载时补齐后随下次保存固化。 */
let sequence = 0;

export function createWorldEntityId(prefix: string): string {
  sequence += 1;
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replaceAll('-', '').slice(0, 12)
    : `${Date.now().toString(36)}${sequence.toString(36)}`;
  return `${prefix}_${random}`;
}

export type EntityChange =
  | { op: 'add'; id: string; value: Record<string, unknown> }
  | { op: 'remove'; id: string }
  | { op: 'set'; id: string; fields: Record<string, unknown> };

export type EntityChangeSink = (change: EntityChange) => void;

/** 给不适合改动模型类的 Three.js 实体附加身份。 */
export class WorldEntityIds<T extends object> {
  private readonly ids = new WeakMap<T, string>();
  constructor(private readonly prefix: string) {}
  get(entity: T): string {
    let id = this.ids.get(entity);
    if (!id) {
      id = createWorldEntityId(this.prefix);
      this.ids.set(entity, id);
    }
    return id;
  }
  set(entity: T, id?: string): string {
    const resolved = id || createWorldEntityId(this.prefix);
    this.ids.set(entity, resolved);
    return resolved;
  }
}
