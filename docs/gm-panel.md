# GM 面板

## 背景

调试与体验需要:有时需要观察夜晚/白天场景或测试长时间生存,不希望角色死亡或等昼夜轮转。后续又加入钓鱼概率调节与物品发放等需求,单一列表不再够用,改为分模块 tab。

## 需求描述

- 连续点击 5 次左上角 HUD 的红心图标(2 秒内)弹出 GM 面板。
- 面板分四个 tab:
  - 玩家:无敌模式开关(饥饿/口渴不掉、生命与体力回满)、允许死亡开关、状态回满(复活)。
  - 世界:锁定白天开关;跳转时刻(正午/黄昏/午夜/清晨,跳转时自动解除锁定);强制天气(晴/雨);风表现三态(自动/强制风/无风)。
  - 钓鱼:发放鱼竿;钓鱼四档概率权重(杂物/普通鱼/大鱼/珍宝,±5 步进)。
  - 物品:全部道具列表(可按名称筛选),每项 +1/+5 发放进背包。
- GM 开关为运行时内存态,不写入存档,新对局重置为默认(允许死亡、不无敌、不锁定白天、默认钓鱼权重)。

## 设计方案

- `src/game/systems/GmSystem.ts`:模块级单例导出 `GmSystem = { allowDeath, godMode, lockDaytime, fishingTierWeights }`,各系统直接读取。
- `SurvivalSystem.update`:`godMode === true` 时四项状态回满并跳过消耗;生命归零时若 `allowDeath === false`,把生命钳制为 1 而不置 `dead`。
- `DayNightSystem.update`:`lockDaytime === true` 时不推进时间;太阳高度不足白天时把 `t` 置为 0.25(正午)并立即应用。
- `WeatherSystem.force(type)`:公开的强制切天气方法,立即生效并重置轮换计时。
- `Game.ts` GM 门面方法:`gmRestoreStatus()`、`gmSetTime(t)`、`gmSetWeather(type)`、`gmGiveItem(kind, count)`,UI 不直接触碰内部系统。
- `src/ui/gm/`:
  - `GmPanel.tsx`:模态弹窗外壳与 tab 切换,导出 `GmActions` 回调接口,由 GameplayUI 注入并转发到 Game 实例。
  - `PlayerTab.tsx` / `WorldTab.tsx` / `FishingTab.tsx` / `ItemsTab.tsx`:各 tab 内容。
  - `controls.tsx`:可复用的 ToggleRow / ActionButton / StepperRow 控件。
- `src/ui/Hud.tsx`:红心图标可点击,点击回调 `onHeartTap` 上抛。
- `src/ui/GameplayUI.tsx`:维护 2 秒滑动窗口内的点击计数,满 5 次打开面板。

## 迭代记录

- 2026-08-29:初版,支持「允许死亡」「锁定白天」两个开关与红心 5 连击入口。
- 2026-08-29:重构为分模块 tab(玩家/世界/钓鱼/物品),新增无敌模式、状态回满、昼夜时刻跳转、强制天气、全物品发放(可筛选)。
- 2026-08-30:世界 tab 新增风表现三态(自动/强制风/无风),对应 GmSystem.wind。
- 2026-08-31:世界 tab 新增「显示帧率」开关(GmSystem.showFps);`src/ui/FpsOverlay.tsx` 自跑 rAF 统计帧率,每 0.5s 更新屏幕顶部浮层,按帧率着色(≥50 绿 / ≥30 黄 / 其余红),不侵入游戏循环。
- 2026-09-03:GM 开关与时刻/天气调整支持联机全房间生效(含非房主):配置经 `Game.gmSetConfig` 上行房主结算并广播统一(详见 docs/multiplayer.md M7.3);UI 开关不再直改本地 GmSystem。
- 2026-09-04:世界 tab 新增「锁定夜晚」开关(GmSystem.lockNighttime,时间停在午夜),与锁定白天互斥(后设置者生效自动解除另一个);跳转时刻会同时解除两种锁定。
- 2026-09-04:世界 tab 新增「显示网络流量与延迟」开关(GmSystem.showTraffic);`src/ui/TrafficOverlay.tsx` 显示每秒上行/下行速率与 RTT(各通道最大值,着色阈值 100/250ms),数据来自 `src/game/net/NetTraffic.ts`(PeerNet 收发字节累计 + 通道层每秒 ping/pong)。
- 2026-09-05:网络浮层增加按方向、消息类型和 DataChannel 的每秒速率明细，按流量从高到低显示前 8 项；实时状态通道标为蓝色“实时”，可靠控制通道标为黄色“可靠”，可直接定位玩家姿态、动物、环境生物、HUD、世界增量等各自占用。
- 2026-09-05:新增「动物」页(`AnimalsTab.tsx`):一键在玩家附近草地生成 兔子/绵羊/鹿/狼/熊(`Game.gmSpawnAnimal` → `Wildlife.gmSpawnNear`,1.5~5m 内找草地,找不到提示挪位)。联机时客人经 `gmSpawnAnimal` 动作上行房主结算,新动物随动物姿态快照同步(协议 AnimalPose 带 species,客人端按 id 补建)。
- 2026-09-05:玩家 tab 新增「攻击力倍率」步进器(0–1000,默认 1),作用于木剑与弓箭对生物的伤害结算;联机时随 GM 配置事件同步全房间。
- 2026-09-05:世界 tab 新增「显示水体判定」开关；洋红覆盖实际判为海水的区域，亮绿覆盖实际判为水洼的区域，联机时随 GM 配置全房间同步。
- 2026-09-05:动物页生成列表加入鳄鱼(在最近水洼带出场扑咬生成);新增「特殊事件」页(`EventsTab.tsx`):一键「触发一次喝水出鳄鱼」(无视概率,`Game.gmTriggerCrocodile`,客人经 `gmTriggerCrocodile` 动作上行)与「喝水出鳄鱼概率 %」步进器(0–100,写入 GmSystem.crocodileChance,默认 2%,联机随 GM 配置全房间同步)。
- 2026-09-05:「喝水出鳄鱼概率 %」步进器改为每次步进 5%。

## 迭代记录

- 2026-09-05:玩家 tab 新增「移动速度倍率」(`speedMultiplier`,默认 1,步进 0.5,范围 0.1~10),作用于陆地行走与游泳速度;联机时经既有 gmConfig 快照全房间同步,各端各自对自己生效(读同一份配置)。
