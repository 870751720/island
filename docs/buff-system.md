# Buff 系统与钓鱼珍宝(复活石 / 波塞冬的祝福)

## 背景

钓鱼四档(稀世珍宝)此前只有黄金鱼一种,珍宝缺少被动价值;同时游戏里已有两类「临时生效的状态效果」(波塞冬神像的全岛祝福、被熊扑中的 3 秒减速)但没有统一的展示入口。本次新增两个钓鱼珍宝道具,并建立通用的 Buff 展示系统。

## 需求描述

1. **复活石**(四档珍宝):放在背包即生效。玩家死亡瞬间碎裂一颗,立即从出生点复活,无任何死亡惩罚(单机不清档、联机不清背包/装备/工具),并有对应表现。
2. **波塞冬的祝福**(四档珍宝):可放置在岛上的神像。放置期间**全岛所有玩家**钓鱼钓到杂物的概率降低 1%(全局 buff,所有玩家生效、所有玩家的 buff 栏都显示)。
3. **Buff 系统**:玩家左上角状态栏右侧紧挨着显示当前生效的 buff 图标,点击图标弹出该 buff 的效果 tip。被熊攻击的 3 秒减速也纳入 buff 展示(减益,仅被扑玩家自己可见)。

## 设计方案

### Buff 系统(`src/game/systems/BuffSystem.ts`)

- 只承载展示用的静态定义(`BUFFS`:id/名称/图标/描述/增益减益)与快照结构 `HudBuff = BuffDef & { remain: number | null }`;**生效判定不在 Buff 系统**,由各自来源系统驱动:
  - `poseidon`(全局):`ShrineSystem.blessed`(岛上放有任意神像),对全部玩家生效,`remain: null`;
  - `bearSlow`(个人):`Player.slowSeconds > 0`(熊扑减速,移动减半 3 秒),`remain` 为剩余秒数向上取整。
- `Game.buffsFor(session)` 汇总两个来源生成 `HudBuff[]`,经 `HudSnapshot.buffs` 下发:单机/房主走 `pushHud`,客人由房主按各会话算好后随 HUD 快照回流(房主侧远程会话的减速也由房主权威结算,数据同源)。
- UI(`src/ui/Hud.tsx`):状态栏右侧纵向排布 buff 图标,增益绿框/减益红框,限时 buff 带剩余秒数角标;点击图标弹出锚定 tip(名称 + 增益/减益标签 + 效果描述),再点图标或点空白处关闭。

### 复活石(`reviveStone`)

- 四档奖池新增(`FishTable.TIER_LOOT[4]`:黄金鱼 2 / 复活石 1 / 波塞冬的祝福 1)。
- 结算在房主/单机权威端死亡瞬间(`Game.tryReviveWithStone`):死亡触发的同一帧检测背包,`inventory.remove('reviveStone', 1)` 成功则:
  - `dead` 置回 false、血量回半(≥50)、饥渴保持,背包/装备/工具全部保留(无死亡惩罚);
  - `player.respawn(出生点)` 立即传回出生点站起;
  - 单机不再执行死亡清档、联机不进入 3 秒复活倒计时与清空惩罚;
  - 表现:出生点青蓝光粒子迸溅 + 成功音效 + 本人提示「复活石发出微光碎裂了,你在出生点苏醒」。
- 联机:复活由房主权威结算;`NetEvent` 新增 `reviveFx { target }` 补播表现——客人本人在快照里根本不会进入 `dead`(房主当帧已复活),提示与音效靠该事件补上,其他玩家看到其出生点光效。

### 波塞冬的祝福(`poseidonBlessing`)

- 道具可「使用」:校验与床/工作台一致(不能在水里/水边、脚下没被资源点/其他神像占住),通过后原地立起神像(`entities/Shrine.ts`:双层石基座 + 发光海蓝宝石 + 三叉戟,宝石缓慢旋转起伏)。
- `systems/ShrineSystem.ts`(世界单实例、按 actor 结算,模式同床):可放置多个、效果不叠加;手持锄头靠近站定可整座挖走变回道具(精致石锄 1 次,普通 2 次);挖/放期间头顶有进度提示(「拆神像…」)。
- 效果:`FishingSystem` 构造注入 `junkCut: () => number` 回调(取 `ShrineSystem.junkCut`,放置期间为 1),`rollTier(baited, junkCut)` 从一档(杂物)权重中扣下 1 个百分点转给二档,总权重不变;与无鱼饵的八折惩罚叠加生效。
- 联机:神像走既有世界摆件同步管线——`WorldPatch` 新增 `shrines` section,放置/挖除经 `setChangeSink` 广播增量,客人端 `netApply` 重放;客人放置动作上行 `useShrine`(`Actions.ts`)由房主权威结算。

### 存档与协议

- `SaveData` 新增可选字段 `shrines?: PlacementSave[]`,旧档缺省视为没有神像,`SAVE_VERSION` 保持 28 不变(向后兼容);新道具种类只是 `ResourceKind` 新值,旧档不含即无影响。
- `NET_PROTOCOL_VERSION` 12→13(世界状态新增 `shrines` section 与 `reviveFx` 事件)。

## 迭代记录

- 2026-09-05:初版。四档奖池新增复活石与波塞冬的祝福;复活石死亡免惩罚原地复活;神像可放置/挖走、全岛钓鱼杂物概率 -1%;新增 Buff 展示系统(全局祝福 + 个人熊扑减速),HUD 状态栏右侧图标 + 点击 tip;联机走 `shrines` section + `reviveFx` 事件 + `useShrine` 动作。

### 蜂巢神龛(`beehiveShrine`)/ 治愈水晶(`healCrystal`)/ 雨神祭坛(`rainAltar`)

- 三件均为四档可放置神龛珍宝,与波塞冬的祝福共用 `ShrineSystem`(放置校验/锄头挖走/世界同步管线一致);`Shrine` 按 `ShrineKind` 程序化拼装各自造型(琥珀蜂巢+小蜜蜂/粉晶簇/蓝陶钵悬浮水滴宝石)。
- 效果:
  - 蜂巢神龛(全局,多座不叠加):`CollectSystem` 构造注入 `berryBlessed` 回调,采集浆果丛结算时 10% 概率额外 `add('berry', 1)`;
  - 治愈水晶(30 米光环):权威端生存循环内累计 `PlayerSession.healTick`,满 10 秒 +1 血(上限 100,死亡不回);
  - 雨神祭坛(30 米光环):光环内 `survival.drainMultiplier` 乘 0,饥饿与口渴冻结(夜间的 1.5 倍与雨具修正同乘归零)。
- 光环类效果只在房主/单机权威端结算:血量/饥渴本就随玩家姿态快照回流客人,客人无需本地模拟;HUD 的 buff 图标两端各自按同步后的神龛位置判定(全局两项 + 光环两项 + 熊扑减速)。
- 存档:`shrines` 条目新增可选 `kind`(`ShrineSave`),旧档缺省按波塞冬解释,`SAVE_VERSION` 保持 28;`useShrine` 动作带 `kind` 参数上行。

## 迭代记录(追加)

- 2026-09-05:新增蜂巢神龛(全岛浆果丛 10% 概率 +1)、治愈水晶(30 米每 10 秒回 1 血)、雨神祭坛(30 米饥渴冻结);`Shrine`/`ShrineSystem` 泛化为多类型神龛;HUD buff 列表补三项祝福图标。
