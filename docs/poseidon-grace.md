# 波塞冬的庇佑(单机新手宽容机制)

## 背景

新手在开荒期(不会做装备、没有储备)死亡即清档重开,挫败感强。需要一个新手宽容机制,给早期死亡一次「被海神救回」的体验,同时传递游戏的氛围感。

## 需求描述

- 仅**单机模式**(非联机)生效:玩家在**前 20 天**(第 1~20 天)死亡时,有 **20% 概率**触发「波塞冬的庇佑」。
- **单局仅可触发一次**(入档,读档不刷新次数)。
- 触发后:出现类似联机等待复活的倒计时界面,但视觉上明确传达「波塞冬的庇佑触发了、你被复活了」(海洋主题:三叉戟、海蓝光、专属文案)。**3 秒后**在出生点复活。
- 复活时**不掉落任何物品**:单机死亡本就不执行随身掉落,背包/装备/工具/存档全部原样保留,生存状态回满。
- 复活后出生点旁放置一只**赠礼木箱**,内含:二级装备一套(皮帽 `furHat`、皮衣 `furShirt`、皮裤 `furPants`、皮背包 `furBackpack`)与一封**海神的信**(`letter`)。
- 「海神的信」是独立新道具:**钓鱼钓不到**,只通过赠礼木箱投放;打开随机显示 20 句温暖人心台词中的一句。

## 设计方案

### 触发与结算(`src/game/Game.ts`)

- 死亡分支(`!hostRef && !guestMode` 的本地会话):先按原逻辑尝试复活石;失败后判定
  `!poseidonGraceUsed && dayNight.day <= 20 && random() < 0.2` → 触发庇佑,否则维持原逻辑(战绩 + 清档)。
- 触发时置 `poseidonGrace = true`、`poseidonGraceUsed = true`,`respawnLeft = 3` 复用联机倒计时通道(倒计时条件由「房主」放宽为「非客人端」)。
- 倒计时归零走 `poseidonReviveSession()`:状态回满、`player.respawn(findSpawnPoint())`、生成赠礼木箱、播放特效,随身进度一律不动。

### 赠礼木箱(`src/game/systems/CrateSystem.ts`)

- 新增 `spawnGift(x, z, kinds)`:在指定干地直接生成预填内容的普通木箱(绕过背包与 canPlace),走统一的 `onChanged` 增量上报。
- 落点策略:出生点周围 5 个偏移位依次找干地,全部失败则放在出生点本身。木箱就是普通木箱,可正常存取/挖走,自动入档。

### 海神的信(`src/game/systems/PoseidonGrace.ts`)

- 模块常量:`POSEIDON_GRACE_DAYS = 20`、`POSEIDON_GRACE_CHANCE = 0.2`、赠礼清单 `POSEIDON_GIFT_KINDS`。
- `openLetter(inventory)`:消耗一封信念随机返回一句台词(20 句独立文案池,与漂流瓶的 `BottleMessages` 互不相通)。
- 道具 `letter`:注册于 `Inventory` 资源类型、`Items` 定义(材料分类)与 `DropModels` 掉落模型(信纸 + 封蜡);不在 `FishTable` 钓鱼奖池中。
- 使用入口:`Game.useLetter()`(仅单机,无联机动作);UI 复用 `BottleMessage` 信纸弹窗(新增 icon/title/closeLabel 参数)。

### 表现

- 死亡界面(`src/ui/DeathScreen.tsx` 新增 `poseidon` 模式):海洋渐变背景、发光三叉戟 🔱(呼吸光晕动画)、「波塞冬的庇佑」标题与文案、蓝色倒计时「N 秒后在出生点苏醒」。
- 场内特效:复活瞬间出生点海蓝(`#2ec4b6`)光柱三段迸溅 + `success` 音效 + 提示「海浪把你送回了出生点,波塞冬在身旁留下了一只木箱」。

### 存档兼容

- `SaveData` 新增可选字段 `poseidonGraceUsed`(缺省 false,旧档可直接读),`SAVE_VERSION` 不变。

### 联机说明

- 本需求仅单机生效:联机死亡仍走原有的掉落 + 3 秒重生流程,房主/客人端不参与庇佑判定与赠礼生成,无需同步。

## 迭代记录

- 2026-09-08:首次实现。单机前 20 天死亡 20% 概率触发,3 秒后出生点复活,赠礼木箱(二级装备 + 海神的信),信为独立新道具且不可钓得,单局限一次并入档。
