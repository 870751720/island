# GM 面板

## 背景

调试与体验需要:有时需要观察夜晚/白天场景或测试长时间生存,不希望角色死亡或等昼夜轮转。后续又加入钓鱼概率调节与物品发放等需求,单一列表不再够用,改为分模块 tab。

## 需求描述

- 连续点击 5 次左上角 HUD 的红心图标(2 秒内)弹出 GM 面板。
- 面板分四个 tab:
  - 玩家:性别选择（男孩/女孩，仅当前玩家）、无敌模式开关(饥饿/口渴不掉、生命与体力回满)、允许死亡开关、状态回满(复活)。
  - 世界:显示帧率/网络流量/本机性能诊断开关;锁定时刻(正午/黄昏/午夜/清晨四选一,点选即跳转并停在该时刻,再点一次解除);强制天气(晴/雨/雪);风表现三态(自动/强制风/无风)。
  - 钓鱼:发放鱼竿;钓鱼四档概率权重(杂物/普通鱼/大鱼/珍宝,±5 步进)。
  - 物品:全部道具按二级分类 tab 归类(材料/工具/装备/食物/设施/道具,可按名称筛选);普通道具发放数量档按分类区分——装备仅 +1,材料/食物为 +1/+5/+50,其余 +1/+5;工具每项按 基础/二级/三级 发放。
  - 特殊事件:立即触发一次喝水出鳄鱼;喝水出鳄鱼概率 %(±10 步进,保留一位小数,默认 0.5%);树生长间隔秒数(±10 步进,默认 60,每次判定有 1/2 概率升阶,作用于房主侧生长判定)。
- 性别属于玩家外观进度，写入存档；其他 GM 开关为运行时内存态,不写入存档,新对局重置为默认(允许死亡、不无敌、不锁定时刻、默认钓鱼权重、默认鳄鱼概率与生长节奏)。

## 设计方案

- 性别由 `Game.gmSetGender('boy' | 'girl')` 设置，使用独立个人动作，不放入全房间共用的 `GmConfig`。客人经 `NetGuest.action` 上行，`Actions.ts` 校验参数并将连接的玩家会话交给房主结算，再由玩家及 HUD 快照回流确认。
- GM 玩家页提供两个至少 44px 高的选择按钮，选中态由 HUD 性别驱动；弹窗限制视口高度并支持滚动，兼容手机横屏。设置成功立即存档，关闭面板、重连和读档后保留，新角色与旧档默认男孩。

- `src/game/systems/GmSystem.ts`:模块级单例导出 `GmSystem = { allowDeath, godMode, lockTime, fishingTierWeights }`,各系统直接读取。
- `SurvivalSystem.update`:`godMode === true` 时四项状态回满并跳过消耗;生命归零时若 `allowDeath === false`,把生命钳制为 1 而不置 `dead`。
- `DayNightSystem.update`:`lockTime !== null` 时把 `t` 停在锁定值并每帧重放 `apply()`(防天气调制复利衰减光强);为 null 时正常流逝。
- `WeatherSystem.force(type)`:公开的强制切天气方法,立即生效并重置轮换计时。
- `Game.ts` GM 门面方法:`gmRestoreStatus()`、`gmSetWeather(type)`、`gmGiveItem(kind, count)`,UI 不直接触碰内部系统。
- `src/game/systems/Items.ts`:导出 `ITEM_CATEGORIES`(材料/工具/装备/食物/设施/道具,顺序即 tab 顺序)与 `itemCategory(kind)` 查询函数;分类成员表为纯展示层数据,不参与存档。
- `src/ui/gm/`:
  - `GmPanel.tsx`:模态弹窗外壳与 tab 切换,导出 `GmActions` 回调接口,由 GameplayUI 注入并转发到 Game 实例。
  - `PlayerTab.tsx` / `WorldTab.tsx` / `FishingTab.tsx` / `ItemsTab.tsx`:各 tab 内容。
  - `controls.tsx`:可复用的 ToggleRow / ActionButton / StepperRow 控件。
- `src/ui/Hud.tsx`:红心图标可点击,点击回调 `onHeartTap` 上抛。
- `src/ui/GameplayUI.tsx`:维护 2 秒滑动窗口内的点击计数,满 5 次打开面板。

### 迭代 2026-09-07

- 世界 tab 新增「设置当前天数」:数字输入 + 应用,经 `Game.gmSetDay(day)` 生效;联机时客人端经 `gmSetDay` 动作上行房主结算,天数随快照回流。

## 迭代 2026-09-11

- 移除「显示水体判定」GM 开关及 `WaterDebugOverlay` 覆盖层(判定可视化需求已结束,代码整体删除)。
- 取消「性能」tab:本机性能诊断开关移到世界 tab「显示网络流量」下方;tab 内的说明文字、复制按钮与报告文本框删除,只保留开关 + 右上角实时报告浮层(组件更名 `PerformanceOverlay.tsx`)。
- 移除「锁定白天/锁定夜晚」开关,「跳转时刻」改为「锁定时刻」:`GmSystem.lockDaytime/lockNighttime` 合并为 `lockTime: number | null`,四个时刻按钮点选即跳转并停在该时刻(再次点击解除),经 `gmConfig` 动作全房间同步,原 `gmSetTime` 动作链路删除。
- 修复锁定白天/夜晚时场景可能逐渐变黑:`WeatherSystem.modulate` 每帧对 `sun.intensity`/`hemi.intensity` 做乘法调制,而锁定分支原先只在拉回时刻的瞬间调用 `apply()` 重置光强,之后逐帧复利衰减。现锁定分支每帧重放 `apply()` 重置基础光强后再由天气调制。

## 本机性能诊断
- GM 面板 → 世界 → 本机性能诊断开关。开启后右上角浮层实时显示报告，关闭开关停止采样。
- 每约一秒汇总实际游戏循环 FPS、平均/P95/最慢帧间隔、逻辑 CPU 与渲染提交 CPU 毫秒数、每帧平均绘制次数/三角形、已分配几何体/纹理数、画布像素与 DPR。P95 是 95% 帧间隔不超过的值。
- 渲染提交计时不是 GPU 计时；几何体/纹理计数不是显存字节数或设施数量。逻辑计时包含循环内除 renderer.render 外的工作。网络事件回调等循环外开销不单独计时，可配合世界页网络流量排查。
- 在相同地点、视角、天气分别采集物品较少/较多时的报告。报告可复制，剪贴板不可用时长按文本框手动复制。
- 关闭时不进行逐帧统计；每个 Game 实例独立，新对局默认关闭；后台及超过一秒的恢复间隔丢弃。
