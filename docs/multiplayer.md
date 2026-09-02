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

### M2 状态收拢与实体 id(2026-08-31)

- 新增 `src/game/mp/Actor.ts`(`Actor` 接口:player/inventory/survival/tools),`PlayerSession` 实现该接口,并挂上每会话独立的玩家侧交互系统实例(采集/制作/进食/钓鱼/弓/喝水,由 Game 的 `attachSessionSystems` 装配);受击音节流、死亡沿等个人计时也移入会话。
- 世界侧系统(掉落物/木箱/床/火堆/工作台/围栏)保持世界单实例,但全部交互方法改为接收发起者 `PlayerSession` 参数,每玩家的搭建/烹饪/挖掘/睡觉/放置进度存系统内 `Map<PlayerSession, State>`;`updateActor` 按会话推进,`update` 只推进世界部分(火堆燃烧、门开合);围栏落点预览改为按会话各持一份;`detach` 在移除会话时清理。
- `Game`:新增统一的 `isSessionBusy(session, exclude)` 占用判定(排除询问方自身);主循环按会话结算生存值/受击/死亡/交互;全部 HUD 按钮方法增加可选 `actor` 参数(默认本地会话),为 M3 房主代客人发起动作铺路;HUD/相机/头顶指示仍绑定本地会话。
- 存档:`SAVE_VERSION` 升至 26(不兼容旧档,遵守无兼容约定);新增 `SessionSave` 结构,`SaveData.others` 保存联机时房主持有的远程玩家会话,恢复时按接入顺序重建远程会话。
- 同步 id:掉落物(`DropSystem` 内 `nextId`)与野生动物(`Wildlife` 内 `nextId`,重生复用同一 id)补短 id;放置物(火堆/工作台/木箱/床/围栏)以落点坐标天然可对应,不加 id。
- `WorldSync` 增量结构与权威随机收敛移至 M3(与 NetSession 消费方一起落地,避免先写无消费者的死代码);螃蟹/博美/蝴蝶/鸟仍跟随本地玩家,留待后续里程碑。

### M3+M4 网络层与房间流程(2026-08-31)

- 新增 `src/game/net/`:`Protocol`(消息判别联合:hello/welcome/start/input/action/players/animals/world/hud)、`RoomCode`(SDP 邀请码/回传码编解码,JSON→base64url)、`PeerNet`(单条 WebRTC DataChannel 直连,Google 公共 STUN,ICE 收集完成或 4s 超时后出码)、`Actions`(客人动作→Game 方法的参数化分发表,以该客人的会话为 actor)、`NetHost`(房主侧:多连接管理、10s 无消息判断线、100ms 一拍广播玩家/动物快照、200ms 一拍按会话下发 HUD、1s 检查世界脏并全量重放)、`NetGuest`(客人侧:20Hz 摇杆上行、动作上行、下行数据交给 Game)。
- `Game` 增加 `GameOptions`(host/guest/seeds/save):房主开新岛(seeds 来自大厅,不读旧档)、客人用欢迎包的种子与全量初始状态重建世界,不读写 localStorage;guest 模式跳过全部权威模拟(生存结算/交互推进/自动换工具/HUD 推送/存档),新增 `netApplyPlayers/netApplyAnimals/netApplyWorld/netApplyHud` 应用下行数据;自己的移动本地预测(完整物理),偏差超 3 格才校正;其他玩家走遥控插值。约 30 个动作方法在 guest 模式下转发给房主(`selectTool` 同步本地预测)。
- `pushHud` 拆出 `snapshotHud(session)`,房主为每个客人各算一份 HUD 下发;世界系统(火堆/工作台/木箱/床/围栏/掉落物)补 `clear()`,客人收到世界快照时清场重放;资源点 `applySave` 原地更新。`Wildlife` 补 `netPoses/netApply`。房主端远程玩家 `keyboard:false`(只吃网络摇杆,屏蔽本机键盘)。
- 新增 `src/ui/RoomLobby.tsx` 大厅:房主逐个朋友「生成邀请码→粘贴回传码」(最多可继续邀请,开始后也可中途加入);客人「粘贴邀请码→回传码发回→等待房主开始」。`StartScreen` 增加「创建房间/加入房间」入口,`GameCanvas` 阶段路由扩展,退出时断开联机会话。
- 修复 M2 引入的两处回归:主循环丢失 `updateAutoEquip` 与 `mumbles.update` 调用。
- 已知留待 M5:客人端无动作音效/特效事件、瓶中信在客人端不可用、围栏门对客人不自动开、死亡规则仍为「本地死亡即清档」(客人不清档)、名字标签未做。

### M4.1 联机稳定性与大厅交互(2026-09-02)

- 修复 DataChannel 打开前 `hello` 被丢弃的问题：网络层缓存待发消息，连接建立后按顺序发送，因此开局前和游戏中途加入都能完成欢迎流程。
- 玩家身份由会随断线变化的数组下标改为稳定 UUID；快照会自动补建新玩家、移除已离开的玩家，前序客人退出不再导致剩余客人身份错位。
- 世界脏快照改为每秒只序列化一次并广播给全部客人，修复三人以上时只有第一名客人收到世界变化的问题，同时减少重复序列化。
- 房间严格限制为房主加三名客人；客人掉线或房主退出后返回开始界面并显示原因。
- 手机大厅改为两步引导，加入系统分享、一键复制、读取剪贴板、等待状态和已连接人数反馈；房主至少连接一名朋友后才能开始。
- 按项目要求，本轮不新增自动化测试；验收仅执行 TypeScript/生产构建。
