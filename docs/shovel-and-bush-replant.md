# 铲子与丛的移植

## 背景

玩家需要把岛上的浆果丛、灌木丛搬到自己家附近集中管理,因此新增铲子工具,可把整棵丛挖走变成道具,再在需要的地方种回。

## 需求描述

- 新增工具「石铲」(基础)与「精致石铲」(精致),配方与斧/镐同模式:基础手搓(树枝 1 + 石头 1),精致需 2 级工作台(树枝 2 + 石头 2)。
- 手持铲子靠近浆果丛/灌木丛时,采集动作变为挖掘:基础 2 下、精致 1 下挖走整棵丛,获得道具「浆果丛」/「灌木丛」;徒手(或其他工具)时仍是原来的采集产出。
- 背包面板点击这两个丛的「使用」直接落在就近最优格种回(详见 autoplace.md),校验与工作台摆放一致:不能在游泳/水里或水边、地面高度需大于 0、落点同格被任何已放置实体占据(`PlaceOccupancy.taken`)即不可放、脚下 1 米内不能有资源点;不满足时给出对应原因提示。
- 挖走的资源点永久消失(不再再生、不再占位、不阻挡);种回的丛与自然生成的行为一致(可采集、可再生、可再挖走),带坐标入档。

## 设计方案

- `Crafting.ts`:`ToolId` 增加 `shovel`,配方/名称/工具 tab 顺序同步(`axe → pickaxe → shovel → fishingrod → bow`)。
- `Player.ts`:`HandTool` 增加 `shovel`,新增程序化铲子模型(木柄 + 宽扁石刃)。
- `CollectSystem.ts`:新增 `isDigging(prop)` 判定(手持铲子且目标是 berry/shrub);挖掘走 `mine` 动作与音效,命中数走独立 `DIG_HITS`(精致 1 下);命中结算改为调用 `Props.removeProp` 并给对应丛道具,不走再生逻辑。
- `Props.ts`:
  - `removeProp` 将资源点从场景和世界列表直接删除，不保留隐藏占位或删除标记；
  - `placeBush(kind, x, z)` 在落点生成完整丛并纳入世界资源列表；
  - 新增 `isOccupied(p, range)` 统一占位判定，工作台/播种/木箱三个放置系统与 `Game.useBush` 共用；
  - 所有资源点都以完整坐标状态入档，玩家放置的 berry/shrub 与自然资源采用同一数据模型。
- `Inventory.ts`/`Items.ts`/`DropModels.ts`:新增道具 `berryBush`、`shrubBush`(名称/图标/描述/掉落模型)与 `shovel` 条目。
- `Game.ts`:`useBush(kind)` 负责校验+扣除+放置+反馈;工具循环顺序加入铲子;HUD 增加 `hasShovel`;头顶提示在持铲挖掘时显示「挖灌木丛/挖浆果丛」。
- UI:`Backpack.isUsable` 放行两个丛;`GameplayUI.onUseItem` 派发到 `useBush`;`ToolButton` 增加铲子图标(⚒️);`RecipeBook` 增加精致石铲增益说明。
- 刻意不做:铲子不加入 `wantedTool` 自动切换(徒手也能采这两种丛,自动切铲会误挖)。
- 种下丛后若手里正拿着铲子,自动切回空手,避免立刻把刚种下的丛挖掉。

### 锄头更名为铲子(2026-09-09)

- 「锄头」全面更名为「铲子」:代码名(`hoe`→`shovel`、`hoeHits`→`shovelHits`、`hasHoe`→`hasShovel`)、配方/道具持久化 ID(`hoe`/`refined-hoe`/`iron-hoe` → `shovel`/`refined-shovel`/`iron-shovel`)、名称文案(木锄/石锄/铁锄 → 木铲/石铲/铁铲)与全部注释、文档同步更新;功能不变。
- 持久化 ID 属破坏性变化,`SAVE_VERSION` 30 → 31,旧存档丢弃。
