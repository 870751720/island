import { META_COSTS, META_MAX_LEVEL, META_TREE, type MetaNodeId } from './MetaTree';

/** 局外养成的持久化状态:与存档无关,死亡清档不影响它 */
type MetaState = {
  points: number;
  levels: Partial<Record<MetaNodeId, number>>;
};

const KEY = 'island.meta.v1';

const ALL_NODE_IDS = META_TREE.flatMap((branch) => branch.nodes.map((node) => node.id));

/** 从 localStorage 读出并归一(未知节点/越界等级一律丢弃,保证旧数据安全) */
function loadState(): MetaState {
  if (typeof window === 'undefined') return { points: 0, levels: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { points: 0, levels: {} };
    const parsed = JSON.parse(raw) as Partial<MetaState>;
    const levels: MetaState['levels'] = {};
    for (const id of ALL_NODE_IDS) {
      const lv = parsed.levels?.[id];
      if (lv !== undefined && Number.isFinite(lv)) {
        levels[id] = Math.min(META_MAX_LEVEL, Math.max(0, Math.floor(lv)));
      }
    }
    return {
      points: Number.isFinite(parsed.points) ? Math.max(0, Math.floor(parsed.points as number)) : 0,
      levels,
    };
  } catch {
    return { points: 0, levels: {} };
  }
}

let state: MetaState | null = null;

function ensure(): MetaState {
  if (!state) state = loadState();
  return state;
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ensure()));
  } catch {
    // 存储不可用(隐私模式等)时只保留内存态
  }
}

/** 生存天数折算传承点:超过 2 天才开始结算,每天 10 点 */
export function legacyPointsForDay(day: number): number {
  return day > 2 ? day * 10 : 0;
}

export const MetaProgress = {
  /** 当前传承点 */
  points(): number {
    return ensure().points;
  },
  /** 直接设置传承点(GM 面板用) */
  setPoints(value: number): void {
    ensure().points = Math.max(0, Math.floor(value));
    persist();
  },
  /** 增加传承点(局结束结算用) */
  grant(amount: number): void {
    if (amount <= 0) return;
    ensure().points += Math.floor(amount);
    persist();
  },
  /** 某节点当前等级(0 未解锁) */
  level(id: MetaNodeId): number {
    return ensure().levels[id] ?? 0;
  },
  /** 升一级:点数不足或已满级返回 false,成功则扣点并持久化 */
  upgrade(id: MetaNodeId): boolean {
    const s = ensure();
    const lv = s.levels[id] ?? 0;
    if (lv >= META_MAX_LEVEL) return false;
    const cost = META_COSTS[lv];
    if (s.points < cost) return false;
    s.points -= cost;
    s.levels[id] = lv + 1;
    persist();
    return true;
  },
};
