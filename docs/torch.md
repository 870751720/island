# 火把
## 背景
夜间/阴暗环境下玩家缺乏可携带的照明手段(营火需燃料且不可移动),需要一种低成本、可回收的插地照明摆件。
## 需求描述
- 手搓配方:1 树枝 + 1 燧石,无需工作台。
- 背包里点击「使用」插到脚下;不能在水里,脚下不能被其他资源点/摆件占住。
- 放置后在小范围(约 4.5 米)发出暖色火光,火苗摇曳,永不熄灭、无燃料与耐久。
- 手持锄头靠近站定可挖走,整支变回火把道具入包(精致锄 1 次,普通锄 2 次)。
## 设计方案
火把完全复用神龛(Shrine)体系,只是无祝福效果:
- `Inventory.ts` 新增 `ResourceKind: 'torch'`;`Items.ts` 注册道具(🔥)。
- `Crafting.ts` 新增手搓配方 `{ wood: 1, flint: 1 }`,`hidePrompt` 避免与常见材料频繁弹出快捷卡片(与石锄同策略)。
- `entities/Shrine.ts`:`ShrineKind` 加 `'torch'`,`BUILDERS` 注册 `makeTorchMesh()`(木杆 + 浸油布头 + 自发光火苗 + `PointLight('#ff9d2e', 1.2, 4.5)`);`ShrineMesh.update` 支持覆盖默认宝石表现,火把用它做火苗缩放/抖动与光强闪烁。
- 放置、锄头挖掘回收、存档(`shrines` 快照带 kind)、联机同步(place 走 `useShrine` action、增删走 `shrines` 世界增量快照)全部沿用 `ShrineSystem`,零新增协议。
- `DropModels.ts` 补火把掉落物造型(横躺树枝 + 布头),`Backpack.tsx`/`GameplayUI.tsx` 加入可使用神龛道具列表。
- 存档兼容:沿用 `shrines` 数组与缺省 kind 解释规则,`SAVE_VERSION` 不变。
## 迭代记录
- 2026-09-05:首个版本,手搓火把(1 树枝 + 1 燧石),插地小范围永久照明,锄头可挖走回收。
