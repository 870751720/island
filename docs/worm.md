# 蚯蚓窝资源点

## 背景

最初蚯蚓以「蚯蚓土坑」资源点呈现,后改为水边静止的蚯蚓生物(靠近自动钻土掉落)。本次再迭代:生物形态被移除,回归并升级为「蚯蚓窝」采集点——强调「窝」的概念,窝上有蚯蚓/无蚯蚓两种状态,交互走统一的资源点采集体系。

## 需求描述

- 移除蚯蚓生物(`Worms` 实体)及其联机 ambient 同步通道。
- 新增蚯蚓窝资源点(`PropKind: 'wormNest'`):分布在水域周边 18 米内的干地上,密度沿用旧蚯蚓生物(每万㎡ 7 个,下限 4)。
- 窝的造型为湿土小丘 + 顶部洞口;有蚯蚓状态时洞口只趴着**一只**蚯蚓模型,被捉走后只剩空窝。
- 采集叫「捉蚯蚓」:**空手**即可(1 次命中),每次获得蚯蚓 ×1~3;之后进入 240 秒再生周期,蚯蚓重新回到窝上。
- 手持锄头可以把整窝挖走,获得「蚯蚓窝」道具(🪹,作物类);在背包点击使用直接落在就近最优格放回(详见 autoplace.md),放回后需等一个再生周期才有蚯蚓。
- 蚯蚓道具(🪱)本身不变:仍可投喂饵料桶兑换鱼饵、参与饵料桶配方。

## 设计方案

- `src/game/world/Props.ts`:`PropKind` 加 `'wormNest'`,`PROP_CONFIG` 配 240 秒再生;`makeWormNest()` 程序化建模(土丘 + 洞口 + 单只蚯蚓,蚯蚓模型单独返回用于显隐);`nestWorms` Map 管理各窝的蚯蚓模型,`syncAppearance` 按 `ready` 切换蚯蚓可见性;`placeWormNest` 支持玩家放回;`seedWildWormNests` 为旧档补撒野生窝(旧档里蚯蚓是不入档的环境生物,没有窝资源点)。
- `src/game/world/PropSpawner.ts`:撒点规则加 `waterBand` 字段,蚯蚓窝只在干地且水域半径 +18 米带内落点。
- `src/game/systems/CollectSystem.ts`:`HARVEST_CONFIG.wormNest` 为空手 `pick` ×1 次、产出蚯蚓 1~3;`isDigging`/`DIG_YIELD` 纳入 wormNest(锄头整窝挖走得 `wormNest` 道具)。
- 道具:`wormNest` 加入 `ResourceKind`/`ITEMS`(作物类)与 `DropModels`(带洞湿土 + 探出的蚯蚓);`Game.useBush` 扩展支持放回蚯蚓窝,客人经 `useBush` 动作上行。
- 联机:蚯蚓窝作为普通资源点走 props 快照/世界增量(`WorldDelta`),采集与再生由房主权威结算;`AmbientState.worms` 及 Protocol/NetHost/NetGuest 的 worms 通道整体移除。
- 存档兼容:`PropSave.kind` 为 `PropKind` 自动兼容新种类,旧档无窝时由 `seedWildWormNests` 补撒,`SAVE_VERSION` 保持不变。

## 迭代记录

- 2026-09-07:移除蚯蚓生物,新增蚯蚓窝资源点(捉蚯蚓采集 + 锄头挖窝 + 道具放回),详见上文。
- 2026-09-07:窝体再缩小压矮(土丘半径 0.32→0.2),洞口蚯蚓对应缩小并明确横躺姿态;作业进度标签区分「捉蚯蚓 / 挖蚯蚓窝」(此前误显示为采浆果/挖浆果丛)。
