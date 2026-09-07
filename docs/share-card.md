# 单机死亡分享战绩卡

## 背景

单机死亡原本只有「你没能活下来…+确认」的纯结束界面,没有结算数据,也没有传播入口。希望死亡时生成一张可分享的战绩图片,让玩家把成绩晒到社交平台,带来自然传播。

## 需求描述

- 单机死亡时展示本局战绩:存活天数、死因、击杀、采集、建造、合成。
- 提供「分享战绩」按钮,生成一张竖版战绩卡片图片:
  - 底图为死亡瞬间的游戏画面截图(带遮罩);
  - 展示游戏标题、天数、死因文案、五项战绩;
  - 底部带游戏线上地址的二维码,扫码即达。
- 分享优先走系统分享面板(`navigator.share` 文件分享,微信/保存图片等);不支持时降级为弹层展示卡片图片(长按/右键保存)+ 一键复制战绩文案(含线上链接)。
- 仅单机触发;联机死亡为 3 秒自动复活,无结算语义,不展示分享。

## 设计方案

### 数据来源

- **死因**:`SurvivalSystem` 记录 `deathCause`(最后一次掉血来源):饥饿/口渴结算、溺水掉血、`damage()` 外力伤害各自写入;死亡时即死因。
- **击杀/采集**:运行时计数,挂在 `PlayerSession.stats`(`RunStats = { kills, collected }`),权威端累计(联机客人操作经房主结算,计数天然在房主)。挂点:
  - 击杀:剑/弓的 `onLoot` 战利品回调(每次击杀调用一次)、兔洞塌方压杀(`killHidden` 返回数);
  - 采集:`CollectSystem` 的 `onYield` 回调(每个资源点采集完成一次)。
- **合成**:直接用已有 `craftedIds.size`,零新增统计。
- **建造**:死亡时从 `collectSave()` 快照的各摆件数组长度求和(火堆/工作台/木箱/饵料桶/净化器/冶炼炉/烹饪台/织机/围栏/围栏门/床/神龛/拴羊桩)。
- **场景截图**:死亡分支与 `renderer.render` 同帧同一任务内 `domElement.toDataURL()` 读回,无需 `preserveDrawingBuffer`。

### 持久化(向后兼容)

- `SaveData`/`SessionSave` 新增可选 `stats?: RunStats`(kills/collected),旧档缺省为 0,`SAVE_VERSION` 不变。
- 死亡顺序:先 `buildDeathReport()` 快照战绩 → 再 `SaveSystem.clear()`。

### 数据流

`Game.deathReport: DeathReport | null`(单机死亡时写入)→ `GameplayUI` 经 `gameRef` 传给 `DeathScreen` 展示与分享。

### 模块

- `src/game/systems/RunStats.ts`:`DeathCause` / `RunStats` / `DeathReport` 类型。
- `src/ui/shareCard.ts`:`renderDeathCard`(离屏 canvas 2D 绘制 750×1200 卡片,qrcode 生成二维码)、`shareDeathCard`(`navigator.share` 文件分享)、`deathReportText`(降级复制的文案)。
- `src/ui/DeathScreen.tsx`:结算页 UI(战绩 chips + 分享/确认按钮 + 降级弹层)。

## 迭代记录

- 2026-09-07 首版:死亡结算数据(死因/五项战绩)+ 战绩卡生成与分享(系统分享 → 图片弹层+复制文案降级)。
