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
