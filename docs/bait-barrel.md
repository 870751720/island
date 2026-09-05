# 饵料桶

## 背景

鱼饵原本只能靠三种手搓配方(蟹肉/鸟肉/兽肉搓饵)获得,配方入口与鱼竿绑定,食物多了以后背包管理麻烦,食物与钓鱼玩法之间也缺少一个"把多余食物转化掉"的出口。

## 需求描述

- 删除全部鱼饵手搓配方(蟹肉→×2、鸟肉→×3、兽肉→×10)。
- 新增可制作道具「饵料桶」(🪣):二级工作台制作(木头 ×4 + 绳线 ×1),可放置、可被锄头挖走回收。
- 靠近饵料桶时按工作台同款逻辑接管工具按钮,点击打开饵料桶 UI:
  - 把背包里的食物丢进桶(整格投喂);
  - 桶内每 5 秒发酵 1 个食物,兑换为该食物对应数量的鱼饵,存放在桶内;
  - 面板显示发酵进度条与桶内鱼饵存量,可「全部收取」;
  - 桶内有食物时桶口出现发光的鱼饵团特效(浮动旋转),空桶时收起。

## 设计方案

- 道具与配方:`baitBarrel` 加入 `ResourceKind`/`ITEMS`;配方 `station: 'workbench' + minBenchLevel: 2`。删除 `baitCrab/baitBird/baitGame` 配方与 `baitPrompt` 字段(连同 CraftPrompt 的弹出条件)。
- 实体 `entities/BaitBarrel.ts`:程序化木桶模型(桶身 + 两道桶箍 + 桶口发光鱼饵团);桶状态为 `foods`(投喂队列,同种合并)、`bait`、`tickLeft`;`update(elapsed)` 只驱动表现。
- 系统 `systems/BaitBarrelSystem.ts`:完全对齐木箱 `CrateSystem` 的模式——摆放校验(干地、无资源点/桶重叠)、锄头站定自动挖走(整桶 + 桶内食物 + 鱼饵回背包/掉落)、`nearby` 靠近判定、`snapshot/restore/netApply` 存档与网络重放、`EntityChangeSink` 增量上报。发酵计时只在权威端结算(`update(delta, elapsed, authority)`),客人端本地倒数只做进度表现,状态由 `baitBarrels` 世界增量回流。
- 兑换表 `BAIT_YIELD`(`systems/Food.ts`):按获取难度定价——基础采集物(橡果/松果/浆果/可乐)1,小鱼/蟹肉 2,鸟肉 3,大鱼/兽肉 5,黄金鱼 20;熟食与对应生食兑换相同。不在表内的食物不可投喂。
- UI `ui/BaitBarrelPanel.tsx`:上半桶内食物队列(每格角标显示单个可换鱼饵数)+ 发酵进度条 + 待收鱼饵与「全部收取」;下半背包可投喂食物格(点击整格投喂)。工具按钮接入 `baitBarrel` 模式(🪣),持锄头时不劫持(可挖走)。
- 桶容量上限 20 个食物,防止无限囤积。
- 存档:`SaveData` 新增可选字段 `baitBarrels`(落点 + foods/bait/tickLeft),旧档缺省视为无桶,`SAVE_VERSION` 保持 29 不变。
