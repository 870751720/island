# 四人联机(WebRTC 房主权威)

## 背景

游戏目前是纯单机:一个 `Game` 实例绑定唯一 `Player`,玩法判定、存档、HUD 全部围绕单玩家。目标是支持最多四人联机共玩同一座岛,且不引入任何游戏服务器、保持 GitHub Pages 纯静态部署。

## 需求描述

- 四人(2–4 人,2 人即可开玩)在同一个种子生成的岛上共同生存。
- 传输:WebRTC DataChannel 玩家直连(房主星形拓扑),无第三方服务器。
- 信令:手动房间码——房主为每个朋友生成加入码,朋友粘贴后回传应答码完成握手。
- 权威模型:房主客户端跑完整玩法模拟;客人只跑表现层 + 自身移动预测。
- 存档:联机时房主持档;单机模式保持现状;存档结构变化时 SAVE_VERSION +1。
- 断线:房主退出即全房解散;客人断线由房主按超时移除该会话。

## 设计方案

### 模块划分

- `src/game/net/`:消息协议(`Protocol`)、WebRTC 连接(`PeerNet`)、房间码编解码(`RoomCode`)、联机会话总管(`NetSession`)。
- `src/game/mp/`:每玩家会话(`PlayerSession`:player + survival + inventory + equipment + tools)、远程玩家驱动(`RemoteDriver`)、世界状态同步(`WorldSync`)。

### 权威与同步

- 房主侧为每名客人建一个 `PlayerSession`(复用本地 Player 物理与动画,输入由网络摇杆写入 `player.input.setJoystick`,保证与本地移动完全一致的判定)。
- 客人侧:收到种子后重建相同地图;远程玩家用 Player 的「遥控模式」(`setNetPose` 插值)表现;权威状态(资源点/掉落物/放置物/动物/昼夜/天气)由 `WorldSync` 增量应用。
- 消息:客人→房主 `input`(摇杆)与 `action`(按钮语义,即 Game 公共方法参数化);房主→客人 `welcome`(种子+初始状态)、`snapshot`(10–15Hz)、`event`(音效/特效/拾取/死亡)。

### 里程碑

- M1 多玩家抽象:Player 遥控模式、PlayerSession、Game 会话化、动物按最近玩家结算(单机行为不变)。
- M2 状态收拢与实体 id:按会话结算的交互系统(采集/制作/火堆/木箱/钓鱼等)、掉落物与动物 id、SAVE_VERSION=26、权威随机收敛。
- M3 网络层:PeerNet/RoomCode/NetSession、房主权威模拟、客人 guest 模式。
- M4 联机 UI:房间创建/加入、lobby、断线处理。
- M5 打磨:名字标签、事件同步、死亡规则联机化。

## 迭代记录

### M1 多玩家抽象(2026-08-31)

- `MoveInput` 支持 `attach=false`(远程玩家实例不挂键盘监听);`Player` 构造增加 `{ remote }` 选项:遥控模式下不读本地输入,位置/朝向由 `setNetPose` 写入的目标姿态插值,移动感由剩余距离推出以驱动走路动画;水面/游泳/作业动画复用本地逻辑。
- 新增 `src/game/mp/PlayerSession.ts`:每玩家个人状态包(player/survival/inventory/equipment/tools)。
- `Game` 持有 `sessions[]`(下标 0 为 `local`),原 `player/survival/inventory/equipment/tools` 字段改为委托到本地会话的 getter,单机路径全部不变;新增 `addRemoteSession/removeRemoteSession/sessionOf`。
- 帧循环遍历所有会话更新玩家实体;`Wildlife` 改为对最近玩家反应(感知/追击/扑击),熊命中按目标玩家所属会话结算(减伤、掉血、减速),伤害数字仅飘在本地玩家头顶。
- 采集/制作/火堆等交互系统仍绑定本地玩家,按会话结算留待 M2;螃蟹/博美/蝴蝶/鸟仍跟随本地玩家,留待后续里程碑。
