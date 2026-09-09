# 锄头与土壤

## 背景

为接下来的种植系统做准备:玩家需要能开垦出可种植的「土壤」格子。开垦工具为新增的「锄头」(1-3 级,配方与铲子一致),土壤走设施逻辑(占格、存档、联机同步),但零消耗、由手持锄头自动放置。

## 需求描述

- 新增锄头工具,1/2/3 级配方与铲子完全一致(木锄 branch1+stone2、石锄 wood2+stone1、铁锄 wood2+ironIngot1,对应工作台 1/2/3 级)。
- 新增「土壤」设施:走设施放置逻辑,落点必须是没有其他东西的干地(复用 `dryCellReason`:水里/离水太近/同格被占/被自然物挡住均不可放)。
- 手持锄头时:手里是锄头的工具模型表现,面前出现土壤模型的绿/红放置预览,站定后自动开出土壤(复用站定 2 秒自动放置机制)。放置零消耗。
- 锄头等级影响开出土壤的站定时间:1 级 2 秒、2 级 1.5 秒、3 级 1 秒。
- 铲子可以挖掉土壤还原,挖掘次数与铲子等级对应(3/2/1 下),挖掉后无掉落。
- 为后续种植系统预留:土壤模型表面带播种沟,后续种植直接落在土壤格上。

## 设计方案

### 锄头工具

- `ToolId` 增加 `hoe`(`Tools` 记录随之扩展,存档 `tools` 字段向后兼容,`SAVE_VERSION` 不变)。
- 三级配方 `hoe` / `refined-hoe` / `iron-hoe` 定义在 `Crafting.ts`,材料照抄铲子;`missingLowerTool` 升级链与工作台等级要求自动生效。
- 手持模型 `makeHoeModel(tier)`(`Player.ts`):木柄 + 顶端横向扁刃,三级刃更宽、材质木→石→铁。
- 工具循环顺序:`hand → axe → pickaxe → shovel → hoe → …`。
- 制作完成不自动切到手上(与铲子同规则,`CraftingSystem`),避免站在原地误开出土壤。
- 站定放置时长表 `hoePlaceTime(tier) = [2, 1.5, 1]`(`ToolTiers.ts`)。

### 土壤设施(AutoPlace 的「工具驱动 + 零消耗」设施)

现有 `AutoPlaceSystem` 完全由背包道具驱动(检查背包余量、放置扣道具)。本次扩展出第二条路径:

- `FacilityDef` 新增字段:
  - `free?: boolean` —— 零消耗:不检查/不扣除背包,持有触发工具即可放;
  - `name?: string` —— 展示名(非道具设施如土壤没有 ITEMS 条目,必须提供);
  - `holdTime` 支持函数 `(actor) => number` —— 按发起者动态取时长(锄头等级)。
- `FacilityTool` 增加 `'hoe'`;`FacilityKind = ResourceKind | 'soil'` 作为设施注册键。
- `AutoPlaceSystem.heldKind`:先按当前手持工具匹配 `free` 设施(锄头→土壤,要求 `tools.hoe > 0`),再走原道具选中路径;预览与站定自动放置对 `free` 设施跳过背包检查。
- `Facilities.ts` 中 `def('soil', { tool: 'hoe', free: true, … })` 注册,预览/结算与所有设施共用同一入口(`settleFacility` → `soils.place`)。

### SoilSystem / Soil 实体

- `entities/Soil.ts`:一格深色松土方块(0.92 见方、微沉入地),表面三道播种沟(种植系统沿用)。`SoilSave = { id?, x, y, z }`。
- `systems/SoilSystem.ts`(模板 `ShrineSystem`):
  - `blocksCell`/`canPlaceAt`(复用 `dryCellReason`)接入统一占格 `PlaceOccupancy`;
  - `place`:零消耗落格生成实体,`WorldEntityIds` 分配稳定 id,发 `onChanged` 增量;
  - `updateActor`:持铲子靠近站定(1.6m)可挖,`shovelHits` 次数后移除,无掉落;
  - `snapshot/restore/netApply/clear`:存档与联机重放,与其他设施系统同模式。

### 存档与联机

- `SaveData.soils: SoilSave[]`(向后兼容:旧档缺省视为无,`restore(save.soils ?? [])`,`SAVE_VERSION` 保持 32)。
- 联机:`NET_PROTOCOL_VERSION` 22 → 23;`WorldPatch` 增加 `soils` section,`WorldReplicationController` 的 snapshot/bindChangeSinks/apply 三处接线;客人端放置预览本地驱动(`updatePreviewFor`),真实放置由房主 `autoPlace.updateActor` 权威结算后经 world delta 回流,铲挖同理,无需新增动作协议。
- 锄头工具位加入联机白名单(`ActionProtocol` 的 `HAND_TOOLS`/`TOOL_IDS`),工具等级经 `toolTiers` 快照同步。
- 房主/客人两端表现一致:远程玩家手持锄头时手上是锄头模型(工具快照),土壤出现由 world delta 驱动。

## 迭代记录

- 2026-09-09:首版——锄头三级配方、土壤设施(工具驱动零消耗放置)、铲子挖除、存档与联机同步;为种植系统预留播种沟与土壤格查询。

### 2026-09-09(迭代):土壤观感与锄头图标

- 土壤模型改为整格(1×1)深色翻土:土床、三道通贯土垄(间距 1/3 格,相邻土壤的垄正好接上连片)、按落点伪随机散布的小土坷垃(各格不同,读档/联机重放不漂移)。
- 锄头图标改为自绘 SVG(斜置木柄 + 顶端横向扁刃,`CustomIcons.HoeIcon`),接入 `CUSTOM_ICONS` 表(背包/图鉴等 `ItemIcon` 场景自动生效)与工具按钮、手持选择面板;`ITEMS` 里的 emoji 仅作纯文本回退。

### 2026-09-09(迭代):GM 土壤入口与工具按钮图标修正

- GM 面板「物品 → 设施」页新增「土壤 · 放面前」入口:土壤没有背包道具,GM 直接经新动作 `gmPlaceSoil`(客人上行,房主统一走 `settleFacility('soil')` 在面前就近最优格开出,失败提示落点原因)。
- 工具按钮图标修正:持锄头时优先按工具位显示锄头 SVG,不再因手持土壤(`placeKind='soil'` 非道具)落入 📦 兜底。

### 2026-09-09(迭代):开土壤交互文案

- 持锄头站定开土壤的头顶提示由「安放:土壤…」改为「锄地开垦…」:`FacilityDef` 新增 `placingLabel`(缺省仍为「安放:{name}…」)。土壤确认不进道具表/背包(零消耗、工具驱动),GM 面板保留「放面前」直放入口。

### 2026-09-09(迭代):移除 GM 土壤直放入口

- GM 面板「物品 → 设施」页的「土壤 · 放面前」入口移除(测试土壤改用 GM 发放锄头后正常锄地),连带删除 `gmPlaceSoil` 动作与协议条目(`Actions.ts`/`ActionProtocol.ts`)及 `Game.gmPlaceSoil`。
