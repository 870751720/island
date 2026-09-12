# 开始界面与死亡返回

## 背景
游戏开始页需要呈现荒岛求生的氛围，并承载单人存档、联机与玩家形象入口。手机竖屏优先，同时适配电脑与手机横屏。

## 需求描述
- 使用「日落漂流手记」视觉：海天背景、奶油色标题、暖橙色主按钮、实时低多边形小岛。
- 保留开始游戏、继续游戏、开新档、重开结算确认、荒岛传承、设置形象、创建房间、加入房间与断线提示。
- 加入入场动画、棕榈摆动、海浪扩散、小船起伏、营火跳动与海鸟漂移。
- 提供海浪环境声和按钮拨弦提示，独立开关持久化；首次触摸后启动声音，遵循浏览器播放限制。

## 设计方案
### 界面与响应式
- `src/ui/StartScreen.tsx` 保留存档和档案流程，只负责菜单状态与入口编排；表现拆分至 `src/ui/start/`。
- `styles.ts` 定义响应式视觉。约 375px 手机纵向排列，电脑宽屏左侧标题与操作、右侧岛屿；低高度横屏使用两列紧凑布局。短屏可纵向滚动，安全区留白，所有按钮触控高度至少 44px。
- 背景由内置 image_gen 生成，最终资源为 `src/ui/start/menu-sunset.webp`（1024×1536，约 72 KB）。图片只包含海天氛围，不含文字、按钮或前景岛屿；使用 cover 裁切兼容电脑宽屏。静态导入交给构建器生成带前缀和哈希的资源地址。
- 标题、入口、图标与 3D 岛屿独立绘制；背景载入前有渐变底色。减少动态效果的系统偏好会关闭 CSS 动画并冻结场景动画。

### 动态场景与声音
- `IslandScene.tsx` 用 Three.js 基础几何、正交相机、粗糙平面着色材质搭建沙岛、棕榈、帐篷、岩石、营火和小船。不使用外部模型或骨骼动画。
- 装饰场景以约 30fps 绘制，像素比上限 1.5，不开启阴影；后台停止绘制。离开开始页时释放动画、观察器、几何、材质与渲染器；WebGL 不可用时保留背景与菜单。
- `useMenuAudio.ts` 独立管理 Web Audio：滤波噪声与缓慢音量调制模拟海浪，两个衰减正弦音构成按钮提示。尊重已有音乐/音效音量，菜单开关用 `island-menu-sound` 单独存储。页面隐藏时暂停，卸载时关闭上下文，避免与游戏音频重叠。

### 游戏和联机流程
- `GameCanvas.tsx` 继续在开始页、房主大厅、客人大厅与游戏之间路由。装饰场景不创建 Game 实例，不读写世界状态，不改变存档版本。
- 房主与客人入口沿用现有大厅与同步链路；菜单动画和音频属于各端本地表现，不上行动作、不发快照、不广播事件。
- `DeathScreen.tsx` 确认后经 `GameplayUI.onExit` 返回开始界面；游戏初始化仍先绘制「正在登上小岛…」遮罩，世界构建和相机落位完成后淡出。

### 背景生成提示词
使用内置 image_gen，未使用 CLI。最终提示词如下：

> Use case: stylized-concept. Asset type: production background art for a mobile portrait island survival game start screen. Create a beautiful refined hand-painted matte low-poly clay-style tropical ocean at sunset, vertical 2:3 composition. Upper 35 percent muted deep teal sky with soft peach clouds only at outer edges, a pale apricot sun at upper right near the horizon at 38 percent height. Bottom 60 percent tranquil jade and turquoise open ocean, subtle broad horizontal brushwork and warm reflected glints. Very distant tiny hazy island silhouettes at far edges of horizon only. Center must be spacious empty water for a separately rendered 3D miniature island, upper center quiet dark teal negative space for cream typography, bottom quarter dark petrol teal subdued water for UI controls. Gentle atmospheric depth, sophisticated illustrated travel journal mood, warm summer evening, restrained textures. No foreground island, no trees in foreground, no boats, no people, no text, no letters, no UI, no borders, no watermark. Not photorealistic. The image is a background layer, not a screenshot.
