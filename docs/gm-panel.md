# GM 面板

## 背景

调试与体验需要:有时需要观察夜晚/白天场景或测试长时间生存,不希望角色死亡或等昼夜轮转。后续又加入钓鱼概率调节与物品发放等需求,单一列表不再够用,改为分模块 tab。

## 需求描述

- 连续点击 5 次左上角 HUD 的红心图标(2 秒内)弹出 GM 面板。
- 面板分四个 tab:
  - 玩家:无敌模式开关(饥饿/口渴不掉、生命与体力回满)、允许死亡开关、状态回满(复活)。
  - 世界:锁定白天开关;跳转时刻(正午/黄昏/午夜/清晨,跳转时自动解除锁定);强制天气(晴/雨);风表现三态(自动/强制风/无风)。
  - 钓鱼:发放鱼竿;钓鱼四档概率权重(杂物/普通鱼/大鱼/珍宝,±5 步进)。
  - 物品:全部道具按二级分类 tab 归类(材料/工具/装备/食物/设施/作物,可按名称筛选);普通道具发放数量档按分类区分——装备仅 +1,材料/食物/作物为 +1/+5/+50,其余 +1/+5;工具每项按 基础/二级/三级 发放。
  - 特殊事件:立即触发一次喝水出鳄鱼;喝水出鳄鱼概率 %(±10 步进,保留一位小数,默认 0.5%);树生长间隔秒数(±10 步进,默认 60,每次判定有 1/2 概率升阶,作用于房主侧生长判定)。
- GM 开关为运行时内存态,不写入存档,新对局重置为默认(允许死亡、不无敌、不锁定白天、默认钓鱼权重、默认鳄鱼概率与生长节奏)。

## 设计方案

- `src/game/systems/GmSystem.ts`:模块级单例导出 `GmSystem = { allowDeath, godMode, lockDaytime, fishingTierWeights }`,各系统直接读取。
- `SurvivalSystem.update`:`godMode === true` 时四项状态回满并跳过消耗;生命归零时若 `allowDeath === false`,把生命钳制为 1 而不置 `dead`。
- `DayNightSystem.update`:`lockDaytime === true` 时不推进时间;太阳高度不足白天时把 `t` 置为 0.25(正午)并立即应用。
- `WeatherSystem.force(type)`:公开的强制切天气方法,立即生效并重置轮换计时。
- `Game.ts` GM 门面方法:`gmRestoreStatus()`、`gmSetTime(t)`、`gmSetWeather(type)`、`gmGiveItem(kind, count)`,UI 不直接触碰内部系统。
- `src/game/systems/Items.ts`:导出 `ITEM_CATEGORIES`(材料/工具/装备/食物/设施/作物,顺序即 tab 顺序)与 `itemCategory(kind)` 查询函数;分类成员表为纯展示层数据,不参与存档。
- `src/ui/gm/`:
  - `GmPanel.tsx`:模态弹窗外壳与 tab 切换,导出 `GmActions` 回调接口,由 GameplayUI 注入并转发到 Game 实例。
  - `PlayerTab.tsx` / `WorldTab.tsx` / `FishingTab.tsx` / `ItemsTab.tsx`:各 tab 内容。
  - `controls.tsx`:可复用的 ToggleRow / ActionButton / StepperRow 控件。
- `src/ui/Hud.tsx`:红心图标可点击,点击回调 `onHeartTap` 上抛。
- `src/ui/GameplayUI.tsx`:维护 2 秒滑动窗口内的点击计数,满 5 次打开面板。

### 迭代 2026-09-07

- 世界 tab 新增「设置当前天数」:数字输入 + 应用,经 `Game.gmSetDay(day)` 生效;联机时客人端经 `gmSetDay` 动作上行房主结算,天数随快照回流。
