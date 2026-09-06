# 海水净化器

## 背景

海岛四面是海却处处不能喝:口渴只能依赖岛上水洼或雨水,水洼喝水还有惊动鳄鱼的风险,临海扎营的玩家饮水很受地形制约。需要一个能把海水变成饮用水的设施,让玩家可以在海边长期安家。

## 需求描述

- 新增可制作道具「海水净化器」(🚰):四级工作台制作,材料为铁锭 ×10 + 燧石 ×5 + 布料 ×5 + 冒险家的经验书 ×2,单件制作。
- 只能放在湿沙滩上:浅海涉水处(未到游泳深度)或紧邻海线的干沙滩;水洼边不算,不能与资源点或其他净化器重叠。
- 手持锄头靠近站定可自动挖走,变回净化器道具回到背包。
- 玩家靠近净化器站定后自动喝水(复用水洼喝水的动作、音效与恢复数值),口渴满或有其他作业时让位;净化器喝水不触发水洼的鳄鱼事件。

## 设计方案

- 道具与配方:`waterPurifier` 加入 `ResourceKind`/`ITEMS`(设施分类)与 `SINGLE_OUTPUTS`;配方 `station: 'workbench' + minBenchLevel: 4`,成本 `ironIngot 10 + flint 5 + cloth 5 + adventureBook 2`。
- 实体 `entities/WaterPurifier.ts`:程序化铁皮模型(机身 + 顶部漏斗 + 侧面玻璃净水槽 + 斜插进湿沙的汲水管),`update(elapsed)` 只驱动净水槽水面起伏的表现。
- 系统 `systems/WaterPurifierSystem.ts`:对齐饵料桶 `BaitBarrelSystem` 的模式——摆放校验(`onWetBeach`:`getWaterKind === 'sea'` 或 `isNearSea(1.5)` 以内且不在水洼)、锄头站定自动挖走、`nearby` 靠近判定、`snapshot/restore/netApply` 存档与网络重放、`EntityChangeSink` 增量上报。无内部玩法状态,纯摆件。
- 自动喝水:`WaterSystem.update` 新增 `nearPurifier` 参数,与「站在水洼浅水」同条件触发喝水;每轮喝完的 `onDrinkRound` 回调(水洼出鳄鱼)只在真的站在水洼里时触发。`Game.ts` 每帧把 `waterPurifiers.nearby(session)` 传入各会话的 `water.update`。
- 联机:新增世界段 `waterPurifiers`(落点增量回流)与动作 `useWaterPurifier`(放置由客人上行、房主权威结算);挖走与水洼挖箱一致由各端 `updateActor` 表现、房主侧结算上报。喝水本身沿用各端本地模拟 + 生存数值快照回流的既有约定。
- UI:背包道具可「使用」原地放下(`GameplayUI` 路由到 `useWaterPurifier`),失败提示「净化器只能放在湿沙滩上,去海边浅滩试试」;靠近净化器无面板、无工具按钮劫持(纯被动效果)。
- 存档:`SaveData` 新增可选字段 `waterPurifiers`(落点列表),旧档缺省视为无,`SAVE_VERSION` 保持不变。

## 迭代记录

(暂无)
