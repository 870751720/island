# 游戏数据中转

与 `server/`、`signaling/` 同级的独立 WebSocket 服务。只管理房间、人数与路由，不读取游戏消息内容、不运行玩法、不持久化世界。房主客户端仍承担权威计算与分发。

- `service.ts`：原子占位、房间内定向转发、心跳回收、载荷与缓冲限制。
- `config.ts`：`RELAY_MAX_ROOMS` 默认 2，`RELAY_MAX_PLAYERS` 默认 4（含房主）。
- `main.ts` / `Dockerfile`：Node 22.18+、独立 `ws` 依赖、3002 私网端口。
- `verify.ts`：HTTP revision 与 WebSocket ping/pong 验收，不占开房名额。

由 `server/compose.yml` 启动独立容器，经 Nginx `wss://43.110.116.98/relay` 转发；`GET /relay/status` 提供当前占用与配置，不暴露房间码、昵称或游戏内容。无需新增公网端口。状态接口允许跨站 GET，兼容 Pages 和本地 H5 的 `null` 来源。

客户端构建可用 `NEXT_PUBLIC_RELAY_URL` 覆盖服务地址。房间码为邀请入口，不是账户凭证；连接在服务端绑定房间、角色与 peer ID，客人不能伪造发送身份或向其他客人/房间发包。服务不记录消息正文。

默认单消息最多 8 MiB，每连接发送缓冲最多 16 MiB。超限断开并释放名额，可靠增量不丢弃。单进程维护全部房间，不可通过横向复制容器绕过全局容量。重启/发布会解散中转房间；游戏进度仍在房主本机。

验证：仓库根目录 `node scripts/test-relay.mts`。具体交互与边界见 [服务器中转与连接方式](../docs/relay.md)。WebSocket 接口参照 [ws 官方文档](https://github.com/websockets/ws/blob/master/doc/ws.md)。
