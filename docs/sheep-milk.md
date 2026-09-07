# 羊奶

## 背景

拴养系统(见 `lasso.md`)已经让玩家可以套住绵羊并打桩固定。拴住的羊目前只有圈养观赏价值,缺少持续产出,本需求让拴养绵羊成为可循环的生存资源点。

## 需求描述

- 新增食物道具「羊奶」(🥛):不可烤制、不可煮汤、不可做鱼饵;食用恢复生命 +5、饥饿 +10、饥渴 +35。
- 绵羊被套索拴住且打桩后,每 3 分钟产出一批羊奶;空手走近即可自动挤奶(交互方式同采集浆果/捉蚯蚓)。
- 羊处于有奶状态时,头顶冒出奶瓶图标(透明无背景,轻微起伏),提示可交互。

## 设计方案

- 道具:`milk` 加入 `ResourceKind`、`ITEMS`(`Items.ts`,归入「食物」分类)与 `FOODS`(`Food.ts`,hunger 10 / thirst 35 / health 5);不加入 `COOKABLE` / `BOILABLE` / `BAIT_YIELD` 即天然不可烹饪烤制与做饵。
- 产奶计时(房主权威):`Wildlife` 的羊新增 `milkLeft`(初始 180 秒)与 `hasMilk`;仅在 `updateLeashed` 的「拴桩」分支累计,归零置 `hasMilk`。解开拴绳(`releaseLeash`)时清零重计;读档不保留进度(读档后重新计时 3 分钟)。
- 头顶图标:`src/game/ui3d/MilkIcon.ts` 用 canvas 画 🥛 生成共享纹理,`THREE.Sprite` 挂在羊模型组头顶,`animate` 中按 `hasMilk` 控制可见性并轻微起伏。
- 挤奶交互:`src/game/systems/SheepMilkSystem.ts`(每会话一份,`PlayerSession.milk`),站定在 2.2 米内有奶的羊旁自动播放 `pick` 动作(与采浆果一致,不要求特定工具),0.6 秒完成一次挤奶,移动或双手被占用即中断;完成后经 `Game.milkSheep` 结算(入包 + 入包飞行 + 粒子,音效由入包飞行统一播放),`InteractionKind` 增加 `'milk'` 参与让位互斥,进度指示环显示「挤羊奶…」。
- 掉落物模型:`DropModels.ts` 新增 `makeMilkBottle`(奶白瓶身 + 木瓶塞)。

## 联机

- 羊奶状态走动物姿态快照:`netPoses` 携带 `milk: boolean`,`Protocol.AnimalPose` 增加可选 `milk`,客人 `netApply` 镜像到 `hasMilk` 驱动头顶图标。
- 挤奶动作:客人在本地判定(空手站定、有奶),完成后上行 `milkSheep` 动作(`Actions.ts`),房主权威 `takeMilk` 结算(有奶才成功,天然防重复)并把羊奶入客人背包,奶量/图标变化随快照回流。

## 迭代记录

### 2026-09-07:首版

按上述方案实现羊奶道具、拴养产奶计时、头顶奶瓶图标与空手自动挤奶;工具按钮不新增模式。

### 2026-09-07:修复房主不能挤奶与客人完成音效重复

- 房主打完桩后手里常还拿着套索,首版要求空手(`currentTool === 'hand'`)导致房主端看似无法交互;放宽为与采浆果一致,不检查手持工具(牵着羊时仍被让位互斥挡住)。
- 客人端完成音效播两次:`milkSheep` 里直接播的 `pickup` 经 feedback 事件补播给客人一次,HUD 快照回流入包又触发 `flushPickups` 播一次;删除直接播放,统一走拾取飞行的完成音,并为远程挤奶补播 `collectFx` 粒子。
