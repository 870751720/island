# 木箱(储物箱)

## 背景

背包格子有限,玩家需要把多余材料与食物存到据点,而不是全部丢在地上。

## 需求描述

- 在工作台用 3 根木头制作「木箱」,产物进背包。
- 手持木箱(工具按钮循环切换,与种子同一心智)站定空地 2 秒,自动把木箱放到场景中。
- 靠近放好的木箱时,右侧工具按钮变为木箱图标并持续缩放,点击打开储物面板。
- 储物面板:上半为木箱 10 格,点击格子把该格物品整格取回背包;下半为背包,点击格子把该格物品整格存入木箱。
- 木箱内容随存档保存。

## 设计方案

- `src/game/systems/Inventory.ts`:`ResourceKind` 新增 `crate`;木箱复用 `Inventory`(默认 10 格)作为箱内仓储。
- `src/game/systems/Items.ts`:新增木箱道具定义(📦)。
- `src/game/systems/Crafting.ts`:新增工作台配方 `crate`(4 树枝,产物 `crate`)。
- `src/game/entities/Crate.ts`:程序化木箱模型(正方形箱体 + 四面对称的横向封边条与四角护柱,任意朝向观感一致),自带 10 格 `Inventory`;顶面会展示箱内第一个格子的道具模型作为内容标识(模型原始大小、缓慢自转,存/取/恢复/联机同步后由 `updateIcon()` 刷新,空箱不显示)。
- `src/game/systems/CrateSystem.ts`:
  - 放置:与 `PlantingSystem` 同一心智——手持木箱、不在水里/水边、脚下与周围 1 格内无资源点、与其他木箱距离 ≥0.8,站定 2 秒完成放置,播放敲击音效与木屑特效,头顶圆环走进度。
  - 附近检测:与工作台/火堆一致的 2.2 范围,取最近木箱。
  - 存取:`store/take` 均为按种类整格转移,装不下/背包满时通过 notice 提示;成功时播放音效(存入 `drop`、取回 `pickup`)。
  - 存档:`snapshot/restore` 保存每个木箱的落点与格子内容。
- `src/game/entities/Player.ts`:`HandTool` 新增 `crate`,右手抱小木箱模型。
- `src/game/Game.ts`:接线 `CrateSystem`(放置与其他双手行为互斥);HUD 快照新增 `hasCrate/nearCrate/crateSlots`;工具循环顺序 空手→斧→镐→鱼竿→弓→种子→木箱;头顶提示「放置木箱…」。
- `src/ui/ToolButton.tsx`:靠近木箱时按钮显示 📦、棕色底、持续缩放(优先级:工作台 > 火堆 > 木箱)。
- `src/ui/CratePanel.tsx`:储物面板,上下两格盘(木箱/背包),点击即整格转移。
- 存档:结构新增 `crates` 字段,`SAVE_VERSION` 升至 11(旧档丢弃)。

## 迭代记录

### 存取支持长按步进

- 储物面板的存入/取出交互改为「点按 = 整格转移,长按 = 连发步进转移」:按住超过 350ms 进入连发,间隔从 160ms 随按住时长加速到 45ms,步进 0.8s 后升到 5、1.6s 后升到 10,松手即停。
- 连发在无可转移时自动停止:某节拍转移失败(源已空或对方装满)即结束连发,静默无提示;点按整格转移失败时仍提示「装不下」。`CratePanel` 的存取回调改为返回成功与否,`holdRepeat` 的 `onRepeat` 返回 `false` 时停止调度;`Game.crateStore/crateTake` 仅在整格转移(`count` 为 `Infinity`)失败时 notify。
- 通用调度抽到 `src/ui/holdRepeat.ts`(`startHoldTap`),背包丢弃数量的 ± 步进按钮复用同一模块。
- 链路:`CrateSystem.store/take` 与 `Game.crateStore/crateTake` 新增 `count` 参数(默认 `Infinity` 表示整格);联机动作 `crateStore/crateTake` 携带数量,`Infinity` 以 `null` 传输、房主端还原。

### 新增铁箱

- 新增「铁箱」道具(`ironCrate`,🧰):逻辑与木箱完全一致(放置/挖掘回收/存取),但收纳扩到 20 格;模型与木箱相同,仅换成铁皮配色(场景模型与掉落物均同款换色)。
- 配方:三级以上工作台制作,材料 1 木箱 + 2 铁锭(`Crafting.ts` 新增 `ironCrate` 配方,`minBenchLevel: 3`)。
- 实现:`Crate.ts` 引入 `CrateKind`(`crate | ironCrate`)与各箱种样式表(格数/配色),构造函数按箱种建仓与上色;`CrateSystem` 的放置 `use`、挖掘返还(`target.kind`)、存档/联机快照(`CrateSave.kind`,缺省木箱兼容旧档)均携带箱种;`SAVE_VERSION` 不变。
- HUD:`HudSnapshot` 新增 `crateCapacity`(身旁箱子的格数),`CratePanel` 按其渲染格盘并区分标题(木箱/铁箱);背包「使用」与联机动作 `useCrate` 均携带箱种参数。

### 铁箱提示按箱种显示

- 头顶进度与失败提示不再写死「木箱」:挖掘时按 `CrateSystem.diggingKind` 显示「挖木箱…/挖铁箱…」;整格存入装满时按 `CrateSystem.nearbyKind` 提示「木箱/铁箱装不下了」。
- 修正代码注释与 `HudSnapshot` 注释中过时的「铁箱 40 格」表述(实际为 20 格)。
