# 工具升级系统(精致工具)

## 需求结论
- 基础工具改名并按新数值调整配方:石斧=3木棍+2石头(手搓)、石镐=2木棍+3石头(手搓)、树枝鱼竿=1木棍+2绳线(工作台,数值不变)、粗制弓=2木头+2绳线(工作台,由 1木+2绳 调整)。
- 二级工作台(level ≥ 2)解锁"精致工具"配方,材料为基础配方的 2 倍,不引入新资源:精致石斧=6木棍+4石头、精致石镐=4木棍+6石头、精致鱼竿=2木棍+4绳线、精致弓=4木头+4绳线。
- 精致工具是独立合成配方,但要求已拥有对应 1 级工具,合成成功后 1 级工具被替换(消失),体现升级。
- 精致工具数值更强(见下)。

## 实现方案

### 1. 工具等级模型(`src/game/systems/Crafting.ts`、`Inventory.ts`)
- `Tools` 从 `Record<ToolId, boolean>` 改为 `Record<ToolId, number>`(0=未拥有,1=基础,2=精致),`ToolId` 保持 `'axe'|'pickaxe'|'fishingrod'|'bow'` 不变。
- `Recipe` 增加字段:
  - `tier?: 2` — 精致工具配方标记;
  - `requiresTool?: ToolId` — 需已拥有该工具 1 级(即当前 tools[tool] === 1);
  - `minBenchLevel?: number` — 仅二级及以上工作台可见/可做。
- 新增 4 条精致配方,id 用 `'refined-axe'|'refined-pickaxe'|'refined-fishingrod'|'refined-bow'`(加入 `CraftId` 联合类型),`tool` 字段仍指向原 ToolId,`craft()` 完成时 `tools[tool] = 2`。
- 基础 4 个工具配方改名(石斧/石镐/树枝鱼竿/粗制弓)并按上述数值调 cost。
- 工具名按等级映射:新增 `toolName(tool, tier)` 帮助函数,精致版名称「精致石斧 / 精致石镐 / 精致鱼竿 / 精致弓」。

### 2. 二级工作台解锁过滤
- `src/ui/WorkbenchPanel.tsx`:过滤条件增加 `workbenchLevel >= (recipe.minBenchLevel ?? 1)`;不满足等级的精致配方可以灰显+「需二级工作台」提示(或直接隐藏,采用灰显提示,便于玩家知道目标)。
- `CraftingSystem.ts` 排队校验同步加等级与 requiresTool 检查,防止越权提交。

### 3. 精致工具数值增益
- 斧(`CollectSystem.ts` `HARVEST_CONFIG`):树 hits 3→2、树桩 2→1(hits 按 `tools.axe >= 2` 动态计算,配置改为函数或在使用处调整)。
- 镐:石头/陨石 hits 4→3。
- 鱼竿(`FishingSystem.ts`):CAST_TIME 0.7→0.5、CATCH_TIME 0.9→0.6、咬钩窗口时长 ×1.5(降低错过率)。
- 弓(`BowSystem.ts` + `Wildlife.ts damageNearby`):箭伤害 1→2,冷却 3s→2s(伤害由调用处按 `tools.bow` 传入)。
- 持有模型沿用现有程序化模型(不为本期新增造型)。

### 4. UI 与文案
- 工具 tab(`inventory-grid`)与制作面板中,工具名称按 tier 显示精致名;图标沿用原 emoji。
- `RecipeBook.tsx` 同步展示精致配方及其解锁条件。

### 5. 存档
- `SaveSystem.ts`:`SAVE_VERSION` 12→13;`SaveData.tools` 从 `ToolId[]` 改为 `[ToolId, number][]`(或 `Partial<Record<ToolId, number>>`),Game.ts 读写同步调整。不做旧档兼容。

### 6. 文档
- 新增 `docs/tool-upgrade.md`(背景/需求/设计方案/迭代记录,含两级配方表与数值表)。
- 更新 `docs/workbench.md`(二级解锁配方)、`docs/tools-tab.md`(等级模型)、`docs/bow.md` / `docs/fishing.md`(数值)。

## 验收
- `npm run build`(或项目现有类型检查/构建命令)通过。
- 提交 → push → 用标准命令等 GitHub Actions 部署成功并 curl 200 后交付线上链接。
