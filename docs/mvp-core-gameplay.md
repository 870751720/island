# MVP 核心玩法

## 背景

项目是从零开始的 2.5D 荒岛求生游戏。MVP 的目标是跑通最小可玩闭环:在浏览器中看到一座程序化生成的低多边形荒岛,角色可在岛上移动,并能采集资源维持生存数值,玩家能存活并游玩约 5 分钟。

## 需求描述

MVP 范围(砍到最小):

1. **程序化岛屿地形**:代码生成低多边形岛屿(顶点噪声 + 圆形衰减),flatShading 黏土质感,包含海面。
2. **2.5D 视角**:正交相机从斜上方观察,平行光 + 阴影。
3. **游戏循环**:自研 GameLoop(delta-based),驱动渲染与后续系统。
4. **角色移动**:程序拼装的低多边形小人,WASD/方向键移动,运行时代码驱动走路摆动动画。
5. **资源采集**:岛上散布树木与石块,靠近后按键采集,进入背包。
6. **生存数值**:饥饿、口渴随时间下降,吃到食物(浆果丛)恢复;数值归零扣血,血量归零游戏结束。
7. **HUD**:React 层显示生存数值条与背包计数、操作提示。

不在 MVP 范围(后续迭代):合成建造、昼夜天气、怪物战斗、存档、Vite 单机发行版。

## 设计方案

- `src/game/Game.ts`:游戏入口,负责创建 renderer/scene/camera、组装各模块、启动 GameLoop。
- `src/game/core/GameLoop.ts`:requestAnimationFrame 封装,按 delta 调用各系统 update。
- `src/game/world/IslandTerrain.ts`:程序化地形生成(噪声高度 + 圆形衰减 + 按高度着色)。
- `src/game/world/Props.ts`:树木、石块、浆果丛等散布物。
- `src/game/world/Ocean.ts`:海面。
- `src/game/entities/Player.ts`:程序拼装小人 + 运行时走路动画 + 移动控制。
- `src/game/systems/SurvivalSystem.ts`:生存数值(饥饿/口渴/血量)。
- `src/game/systems/Inventory.ts`:背包(资源计数)。
- `src/game/systems/CollectSystem.ts`:靠近资源点采集。
- `src/ui/GameCanvas.tsx`:React 客户端组件,挂载 canvas 并桥接游戏状态到 HUD。
- 发布:Next.js `output: 'export'` + `basePath: '/island'`,CI 将 `out/` 发布至 GitHub Pages。

## 迭代记录

- 2026-08-28:建立文档,确定 MVP 范围与模块划分。首期实现:工程骨架 + 程序化岛屿地形 + 2.5D 渲染(对应需求 1/2/3),角色与生存系统留待下期。
- 2026-08-28:一期完成:角色移动(键盘)、采集、生存数值、HUD。二期移动端适配:虚拟摇杆(`src/ui/VirtualJoystick.tsx`)+ 触屏动作按钮(`src/ui/ActionButton.tsx`)取代键盘为主要操作(键盘保留为桌面端补充);输入抽象层 `src/game/core/MoveInput.ts` 合并摇杆与键盘;相机平滑跟随角色;HUD 响应式适配小屏与安全区;禁用页面缩放与滚动;阴影降至 1024、像素比上限 1.75 面向手机 GPU。
- 2026-08-28:三期昼夜循环:`src/game/systems/DayNightSystem.ts` 驱动太阳绕岛旋转,白天/黄昏(黎明)/夜晚平滑过渡光照与天空色,夜晚切换为淡蓝月光且生存消耗 ×1.5(SurvivalSystem 新增 drainMultiplier);整轮 240 秒,HUD 显示时段图标与时刻。
- 2026-08-28:四期背包系统:`src/ui/Backpack.tsx`,右上角 🎒 按钮开关背包面板,展示木材/石块/浆果数量;浆果改为采集入包、在背包中点击「吃」食用(Game.eatBerry);资源计数从 HUD 移入背包面板,HUD 仅保留状态条与时刻。
- 2026-08-28:五期资源分层与合成:资源改为木材/碎石/石头/浆果;石头资源点拆为碎石堆(空手,碎石×2)与大石块(需镐子,石头×2);树木需斧子才能砍(木材×3);灌木丛给浆果×1 并 40% 概率附赠木材×1。合成系统 `src/game/systems/Crafting.ts`:斧子=木材2+碎石2,镐子=木材2+碎石3,入口在背包面板;动作按钮在工具不满足时置灰并提示「需要斧子/镐子」。
- 2026-08-28:六期可再生资源:Props 改为 Updatable,统一管理采集外观变化与再生(`PROP_CONFIG` 配置 regrow 秒数)。浆果丛只产浆果,采后保留丛体、藏起果子,60 秒后长回;新增灌木丛(12 处,空手可采,产木材×1/次,采后缩成小桩 90 秒长回);移除浆果丛附赠木材的设定。树/大石块/碎石堆仍为一次性。
