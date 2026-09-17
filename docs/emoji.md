# 快捷表情

## 背景

单机和联机都缺少轻量的即时表达方式:玩家之间只能靠走位和动作互动,想要一个不打断操作的「打个招呼 / 表达情绪」渠道。手机端工具按钮已有长按选择面板,适合承载表情入口。

## 需求描述

- 长按工具按钮弹出的选择面板**顶部**展示表情区,点选即在玩家头顶显示该表情。
- 桌面补充快捷键 U/I/O/P 依次发送四个表情,与触屏选择共用 `Game.playEmoji`。
- 表情为常用情绪向,当前固定 4 个:😍 喜爱、😭 大哭、😡 生气、😱 惊吓。
- 一个表情显示 **3 秒**后消失;重复发送时旧的立即被新的替换。
- 联机时所有玩家都能看到彼此的表情(单机同样可用)。

## 设计方案

### 数据与校验

- `src/game/social/Emojis.ts`:`EMOJIS: { glyph, name }[]` 为唯一清单,选择面板、联机白名单校验、头顶气泡绘制三方共用;**字形本身即线上 ID**,按整串精确匹配(❤️ 含变体选择符)。全部为老版本 Unicode,各手机系统字体均可渲染。
- `EMOJI_GLYPHS: ReadonlySet<string>` 供房主侧 `hasValidNetActionArgs('playEmoji')` 白名单校验,客人无法发清单外表情。

### 入口 UI

- `src/ui/PlacePicker.tsx`:新增可选 `emojis` / `onPickEmoji` props;面板改为上下两段——顶部表情区(与工具区同规格 4 列 × 60px 触屏按钮,emoji 直出无名称标签)+ 分隔线 + 下方原有工具/道具网格(逻辑不动)。
- `src/ui/GameplayUI.tsx`:传 `EMOJIS`,`onPickEmoji` 调 `Game.playEmoji(glyph)` 后关闭面板(与点选工具一致)。

### 头顶表现(`src/game/ui3d/EmojiBubbles.ts`)

- 气泡在游戏容器的独立 DOM 层显示内联 SVG，与选择面板共用 `EmojiIcons.ts`，不再栅格化为 WebGL 贴图，不受游戏像素比上限影响。
- 白色药丸底与轻投影，整体高 1.188 个世界单位、宽高比 1.25，按正交相机缩放换算 CSS 尺寸；图标居中显示。
- 每帧在相机更新后将玩家世界坐标 + Y 3.44 投影到容器坐标，支持手机横竖屏、相机移动和缩放；超出相机深度范围隐藏，容器裁剪屏幕外部分。
- 同一玩家重复发送替换旧气泡；0.22 秒弹入、共 3 秒、末尾 0.5 秒淡出。DOM 层不拦截触控，不被场景遮挡。
- 玩家离开立即移除对应气泡，游戏销毁时清理整个气泡层。气泡属于屏幕 UI，不进入 WebGL 画布截图。

### 联机同步(无状态纯表现)

链路仿放箭(`arrowShot`),单向视觉广播、不进任何快照或存档:

| 端 | 行为 |
|---|---|
| 客人发起 | `Game.playEmoji` 本地立即播放(乐观表现)+ `guestNet.action('playEmoji', [glyph])` 上行 |
| 房主收到 | `Actions.ts` → `Game.netPlayEmoji(actor, glyph)`:在该客人头顶补播 + `broadcastEvent({kind:'emoji', actor, glyph})` |
| 各客人收到事件 | `netApplyEvent` case `'emoji'`:跳过本人(已乐观播放),按 actor id 找会话补播 |
| 单机/房主发起 | `Game.playEmoji`:本地播放 + `broadcastEvent`(单机时无广播,仅本地) |

- 协议:`NetEvent` 新增 `{ kind: 'emoji'; actor: string; glyph: string }`,`NET_PROTOCOL_VERSION` 25→26(新增事件 kind 按惯例升版,旧客户端不互通)。
- 玩家会话移除时同步清理头顶气泡。

