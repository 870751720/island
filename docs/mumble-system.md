# 自言自语系统

## 背景

荒岛求生中玩家(尤其新手)容易陷入"不知道接下来该做什么"的迷茫。希望角色在满足特定条件时"自言自语",用台词自然地引导玩家去吃饭、喝水、砍树、挖矿、合成工具等;同时同一条件准备 20 句台词随机抽取且尽量不重复,保持新鲜感。

## 需求描述

- 特定条件命中时,角色说一句引导性台词,在屏幕下方气泡中显示约 4 秒后自动淡出。
- 每种触发条件配 20 句台词,随机抽取,同一轮内(20 句)不重复。
- 防刷屏:条件独立冷却 + 全局台词间隔 + 同帧多条件命中只说一句(按优先级)。
- 手机优先:气泡不遮挡摇杆与右侧动作按钮,不可点击、不拦截触控。

## 设计方案

### 模块

- `src/game/dialogue/mumbleLines.ts` — 台词数据,`Record<MumbleTrigger, string[]>`,每条件 20 句。
- `src/game/systems/MumbleSystem.ts` — 触发器与节流,实现每帧检查(由 `Game` 主循环调用)。
- `src/ui/MumbleBubble.tsx` — React 气泡组件,`Game` 通过 `onMumble(text)` 回调 → `GameplayUI` state 驱动。

### 触发条件(按优先级从高到低)

| 条件 id | 判定 | 引导方向 | 冷却 |
|---|---|---|---|
| lowThirst | 口渴 < 30(持续 2s) | 找水洼喝水 | 120s |
| lowHunger | 饥饿 < 30(持续 2s) | 摘浆果/钓鱼/进食 | 120s |
| lowHealth | 生命 < 30(持续 2s) | 进食恢复 | 120s |
| nightFall | 昼夜相位进入 night(边沿) | 提醒夜间消耗 ×1.5 | — |
| rainStart | 雨强度上穿 0.5(边沿) | 雨天口渴变慢 | — |
| bagFull | 背包空格 ≤ 1(持续 2s) | 合成消耗材料 | 180s |
| craftAxe | 没有斧子(持续 2s) | 捡树枝+石头手搓斧子 | 240s |
| chopWood | 有斧子且木头 < 2 且未在采集 | 去砍树 | 150s |
| craftPickaxe | 有斧子但没有镐子(持续 2s) | 搓镐子 | 240s |
| mineStone | 有镐子且石头 < 1 且未在采集 | 去挖矿 | 150s |
| craftWorkbench | 有镐子且岛上没有工作台 | 搭工作台(解锁床/熔炉等设施) | 300s |
| craftSmelter | 有工作台和镐子且没有熔炉 | 建熔炉 | 300s |
| ironTools | 有熔炉且斧/镐都未升到铁制(等级 3) | 炼铁锭升级铁器 | 300s |
| craftLoom | 有工作台和镐子且没有纺织机 | 建纺织机织布 | 300s |
| cookFood | 背包有可烹饪生食且没有烹饪台 | 建烹饪台做熟食 | 300s |
| bottleHint | 背包有漂流瓶(持续 2s) | 拔开瓶子看留言 | 240s |
| sleepHint | 夜晚且岛上有床且未在采集(持续 2s) | 回床睡觉跳过黑夜 | 240s |
| windRise | 风强度上穿 0.5(边沿) | 大风注意 | — |
| meteorFall | 陨石开始坠落(边沿) | 关注落点,天亮去采集 | — |
| opening | 开局 15s 后仍两手空空(一次性) | 四处走走收集材料 | 一次性 |

不进上表的例外:`seaPanic`(泡在海里第 8 秒,恐慌)与 `seaDread`(第 13 秒,感觉海里有东西)各 20 句,由 `SeaThreatSystem` 按泡海时长剧本调用 `MumbleSystem.forceSay` 点名触发——绕过持续判定/条件冷却,也不受全局间隔约束,但说完会重置全局计时,避免普通台词插进这条危险序列(见 [sea-threat.md](sea-threat.md))。

### 节流与防重复

- **牌堆抽取(shuffle bag)**:每条件的 20 句打乱成队列逐句弹出;抽空后重新打乱,且避免新堆下一句与上一轮最后一句相同。
- **条件冷却**:上表;边沿型天然不重复。
- **全局间隔**:任意两句台词之间至少 20 秒(开局第一句也在 20 秒左右出现)。冷却期与单条件冷却期间边沿状态仍持续刷新,短事件(如陨石)不会被漏检。
- **持续判定**:电平型条件需连续满足 2 秒才触发,避免瞬时抖动。
- 死亡期间不说话。
- **联机**:自言自语为纯表现层,每个客户端(含客人)各自本地触发,不上行不同步;所依赖的设施数量、昼夜/天数、天气强度、陨石等输入在客人端均有本地表现或快照同步,无需房主权威结算。

### UI 呈现

白色圆角气泡(带小尾巴)跟随角色,挂在头顶作业提示文字的上方:由 `Game` 每帧把角色头顶上方投影为屏幕坐标,经 `onMumble(text, x, y)` 回调直写 DOM(与头顶作业提示同一套投影机制),显示 4 秒后消失;`pointerEvents: none` 不拦截任何触控。台词均为角色第一人称的自言自语口吻,不出现系统腔。


## 迭代记录

### 迭代 2026-09-07:wolfNight / bearNight 触发

- 新增两个天数事件铺垫触发(优先级最高,每事件日当天一句):
  - `wolfNight`(40 句):狼之夜事件日(第 10/20/30 天及之后每 10 天)的白天命中;
  - `bearNight`(40 句):熊之夜事件日(第 55/80/105…天)的白天命中。
  事件日判定由 `DayEventSystem` 导出(`isWolfEventDay` / `isBearEventDay`),与房主端刷怪结算共用同一份日程表(见 `day-events.md`)。
  - `MumbleContext` 新增 `day` 字段;触发规则新增 `oncePerDay`(按天去重)标记。

### 迭代 2026-09-07:中期发展 / 事件反应 / 夜晚行为补全

原触发条件停留在 MVP 时期(斧镐引导),中后期玩家几乎听不到新台词。本次新增 9 个触发条件(每个 20 句),并把边沿检测从 nightFall/rainStart 硬编码重构为通用机制(规则标记 `edge`,系统按上一帧状态判断跳变):

- **中期发展**:`craftWorkbench`(没工作台)→ `craftSmelter`(没熔炉)→ `ironTools`(斧/镐未到铁制,按 `Tools` 等级 3 判定)→ `craftLoom`(没纺织机)、`cookFood`(有生食没烹饪台,生食判定用 `Food.COOKABLE_KINDS`)。设施存在与否用各系统的 `count`(SmelterSystem/LoomSystem/WorkbenchSystem/BedSystem 本次补充,CookingStationSystem 原有)。
- **事件反应**:`windRise`(风强度上穿 0.5,输入 `WeatherSystem.windIntensity`)、`meteorFall`(MeteorSystem 新增 `active`,陨石开始坠落)、`bottleHint`(背包有漂流瓶)。
- **夜晚行为**:`sleepHint`(夜晚 + 岛上有床 + 未采集,引导回床睡觉跳过黑夜)。

### 迭代 2026-09-12:seaPanic / seaDread 与 forceSay

- 新增 `seaPanic` / `seaDread` 两个台词池(各 20 句,泡在海里的恐慌铺垫与「水下有东西」的察觉),不进触发规则表,由 `SeaThreatSystem` 按泡海时长(8 秒 / 13 秒)调用新增的 `MumbleSystem.forceSay` 定点触发;`forceSay` 重置全局间隔,保证危险序列不被普通台词打断、其后普通台词也让路 20 秒。详见 [sea-threat.md](sea-threat.md)。
