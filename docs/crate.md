# 木箱(储物箱)

## 背景

背包格子有限,玩家需要把多余材料与食物存到据点,而不是全部丢在地上。

## 需求描述

- 在工作台用 4 根树枝制作「木箱」,产物进背包。
- 手持木箱(工具按钮循环切换,与种子同一心智)站定空地 2 秒,自动把木箱放到场景中。
- 靠近放好的木箱时,右侧工具按钮变为木箱图标并持续缩放,点击打开储物面板。
- 储物面板:上半为木箱 10 格,点击格子把该格物品整格取回背包;下半为背包,点击格子把该格物品整格存入木箱。
- 木箱内容随存档保存。

## 设计方案

- `src/game/systems/Inventory.ts`:`ResourceKind` 新增 `crate`;木箱复用 `Inventory`(默认 10 格)作为箱内仓储。
- `src/game/systems/Items.ts`:新增木箱道具定义(📦)。
- `src/game/systems/Crafting.ts`:新增工作台配方 `crate`(4 树枝,产物 `crate`)。
- `src/game/entities/Crate.ts`:程序化木箱模型(箱体木板 + 两条封边条),自带 10 格 `Inventory`。
- `src/game/systems/CrateSystem.ts`:
  - 放置:与 `PlantingSystem` 同一心智——手持木箱、不在水里/水边、脚下与周围 1 格内无资源点、与其他木箱距离 ≥0.8,站定 2 秒完成放置,播放敲击音效与木屑特效,头顶圆环走进度。
  - 附近检测:与工作台/火堆一致的 2.2 范围,取最近木箱。
  - 存取:`store/take` 均为按种类整格转移,装不下/背包满时通过 notice 提示。
  - 存档:`snapshot/restore` 保存每个木箱的落点与格子内容。
- `src/game/entities/Player.ts`:`HandTool` 新增 `crate`,右手抱小木箱模型。
- `src/game/Game.ts`:接线 `CrateSystem`(放置与其他双手行为互斥);HUD 快照新增 `hasCrate/nearCrate/crateSlots`;工具循环顺序 空手→斧→镐→鱼竿→弓→种子→木箱;头顶提示「放置木箱…」。
- `src/ui/ToolButton.tsx`:靠近木箱时按钮显示 📦、棕色底、持续缩放(优先级:工作台 > 火堆 > 木箱)。
- `src/ui/CratePanel.tsx`:储物面板,上下两格盘(木箱/背包),点击即整格转移。
- 存档:结构新增 `crates` 字段,`SAVE_VERSION` 升至 11(旧档丢弃)。

## 迭代记录

- 2026-08-30:首版——工作台 4 树枝制作木箱、手持自动放置、靠近打开 10 格储物面板、存档保存木箱与内容。
