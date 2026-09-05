# 铁矿与冶炼炉

## 背景

岛屿北半区(纬度 0.5 以北)缺少专属的探索价值,工作台三级以后的材料体系也缺少金属层。需要引入铁矿—铁矿石—铁锭的链条:北岛与陨石提供铁矿石,冶炼炉把矿石炼成铁锭,为后续高级制作打基础。

## 需求描述

- 新增资源点「铁矿」:只分布在**地图后 50% 区域(纬度 ≥ 0.5)**,外观为嵌着锈红铁斑的岩体,需镐子开采,产出与石矿相同的石头(石头 ×2 + 25% 燧石),**另产出铁矿石 ×2-4**。
- 陨石采集在原有产出(石头 ×2 + 25% 燧石)基础上,**新增铁矿石 ×2-4**。
- 新增道具「铁矿石」与「铁锭」。
- 新增可制作放置物「冶炼炉」(🏭):**三级工作台**制作,配方 **石头 ×10 + 燧石 ×3**;放置规则与木箱/饵料桶一致(干地、无遮挡),可被锄头挖走回收(炉内矿石与铁锭一并返还)。
- 靠近冶炼炉接管工具按钮,打开面板:把背包里的铁矿石全部投入炉内(上限 20),**每 5 秒炼出 1 块铁锭**,可随时收取;炉内有矿石时炉门火光闪动。

## 设计方案

- 资源点 `PropKind` 新增 `iron`(`world/Props.ts`):模型 `makeIron()`(十二面体岩体 + 锈红四面体铁斑),阻挡半径 0.6 同岩石,`regrow: 0` 采完即消失;存档按整表持久化,旧档无 iron 条目天然兼容。
- 撒点 `world/PropSpawner.ts`:`Rule` 新增可选 `minT` 硬性纬度下限,落点与候选格双重过滤;铁矿 `density: 10、radius: 1.2、patch: 4、weights: [0.4, 0.6, 1, 1.3]、minT: 0.5`。出生点保底不含铁矿。
- 采集 `systems/CollectSystem.ts`:`HARVEST_CONFIG.iron`(mine、4 击、二级镐 3 击)与 meteor 条目均加 `ironOre 2-4`;iron 与 rock/meteor 同样要求手持镐子(自动换工具、提示文案同步)。
- 道具:`ResourceKind` 新增 `ironOre`(铁矿石 🧲)/`ironIngot`(铁锭 ⚙️)/`smelter`(冶炼炉 🏭),`ITEMS`/`DROP_COLORS`/`BUILDERS`(矿石 = 灰岩嵌锈红斑、铁锭 = 梯形块、炉 = 小石炉带火光)配套。
- 冶炼炉完全镜像饵料桶(`entities/Smelter.ts` + `systems/SmelterSystem.ts`):状态为 `ore/ingot/tickLeft`;摆放校验、锄头挖走、`nearby`、`snapshot/restore/netApply`、`EntityChangeSink` 增量上报一一对齐;冶炼计时只在权威端结算,客人端本地倒数只做表现。面板 `ui/SmelterPanel.tsx`(矿石/铁锭存量、进度条、投入/收取)。
- 配方:`Crafting.ts` 新增 `smelter`(`station: 'workbench' + minBenchLevel: 3`,石头 ×10 + 燧石 ×3)。
- 存档:`SaveData` 新增可选字段 `smelters`(落点 + ore/ingot/tickLeft),旧档缺省视为无炉,`SAVE_VERSION` 保持不变。
- 联机:动作 `useSmelter/smelterFeed/smelterCollect` 上行房主结算,世界段 `smelters` 增量回流(同 `baitBarrels`);采集走既有 collectFx/掉落事件通道,无新增同步。

## 迭代记录

### 初版(2026-09)

- 铁矿(纬度 ≥ 0.5)、铁矿石/铁锭道具、陨石额外产铁矿石 ×2-4、冶炼炉(三级工作台,石头 ×10 + 燧石 ×3,每 5 秒炼 1 块铁锭,可挖走)。
