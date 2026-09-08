# 季节系统

## 背景

游戏目前没有季节概念,当前视为春季。计划引入季节(春/夏/秋/冬),冬季为核心目标:换季变色、积雪、植被休眠、雪天气、体温取暖等。

## 需求描述

- 以现有天数系统(`DayNightSystem.dayCount`)为基础,按天数划分季节,当前默认春季。
- 第一期先落地「雪季视觉预览」:地形与植被在雪量系数驱动下平滑覆雪,供效果验证。

## 设计方案

- `src/game/world/SeasonSnow.ts`:季节积雪表现层。
  - 全场材质共享一个 shader uniform `uSnowAmount`(0~1),通过 `onBeforeCompile` 注入 `MeshStandardMaterial`,在法线计算后按表面朝向(`normal.y`)把 diffuse 颜色向雪色(略偏蓝的白)混合——朝上的面覆雪,侧面颜色变淡;不新增模型与 drawcall,移动端友好。
  - `updateSeasonSnow(delta)`:雪量向 GM 目标值平滑过渡(过渡速度 0.08/秒)。
- 材质接入:`Props.ts` 的 `clayMaterial` 与 `IslandTerrain.ts` 的地表材质(顶点色)统一注入;水面不注入。
- 驱动入口:GM 面板「世界」tab 的「雪季预览」开关(`GmSystem.snowPreview`),走 `gmSnapshot/gmApply`,联机时全房间同步,主机与客人各自本地执行过渡表现。
- 存档:本期纯表现层,不落盘,`SAVE_VERSION` 不变。

## 迭代记录

- 2026-09-08 第一期:雪季变色与积雪视觉预览(shader uniform 方案)+ GM 开关。后续计划:季节状态机(按天数推进)、雪天气与雪粒子、植被冬季休眠、体温/取暖玩法。
