# GM 面板

## 背景

调试与体验需要:有时需要观察夜晚/白天场景或测试长时间生存,不希望角色死亡或等昼夜轮转。

## 需求描述

- 连续点击 5 次左上角 HUD 的红心图标(2 秒内)弹出 GM 面板。
- 面板提供开关:
  - 允许死亡:关闭后生命耗尽也不会死亡(生命被钳制在 1)。
  - 锁定白天:开启后昼夜时间停止在正午;若开启时处于夜晚,立即拉回白天。
- GM 开关为运行时内存态,不写入存档,新对局重置为默认(允许死亡、不锁定白天)。

## 设计方案

- `src/game/systems/GmSystem.ts`:模块级单例导出 `GmSystem = { allowDeath, lockDaytime }`,各系统直接读取。
- `SurvivalSystem.update`:生命归零时,若 `allowDeath === false`,把生命钳制为 1 而不置 `dead`。
- `DayNightSystem.update`:`lockDaytime === true` 时不推进时间;太阳高度不足白天时把 `t` 置为 0.25(正午)并立即应用。
- `src/ui/Hud.tsx`:红心图标可点击,点击回调 `onHeartTap` 上抛。
- `src/ui/GameplayUI.tsx`:维护 2 秒滑动窗口内的点击计数,满 5 次打开面板。
- `src/ui/GmPanel.tsx`:居中模态弹窗,两个触控友好的开关行(≥44px),点击遮罩或「关闭」按钮关闭;开关直接写 `GmSystem`。

## 迭代记录

- 2026-08-29:初版,支持「允许死亡」「锁定白天」两个开关与红心 5 连击入口。
