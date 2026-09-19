# 自有联机信令

本目录与 `server/` 同级，独立管理联机信令；`server/` 继续管理云存档 API、HTTPS 入口与发布编排。

- `mosquitto.conf`：独立 Mosquitto 容器配置，仅保留内存会话，禁止 retained 消息。
- `acl`：只允许游戏房间的上行和下行主题。
- `verify.ts`：通过公网 WSS 建连并检查 MQTT CONNACK，供部署验收使用。

客户端优先连接 `wss://43.110.116.98/signaling`，首次连接/订阅或查房失败后使用免费 `wss://broker.emqx.io:8084/mqtt` 保底；房主在两端监听同一房间码，握手回复沿进入的节点返回。Nginx 复用现有 IP 证书和 443 端口，将 WebSocket 转给 Docker 私网的 9001；不向公网开放 MQTT 端口。容器独立限额 128 MiB、0.5 CPU、512 个 WebSocket 连接；单条消息体最多 32 KiB。

仅转发房间查找、ready、SDP 与 ICE。游戏动作、存档欢迎包、世界快照和事件仍经玩家之间的 WebRTC DataChannel 传输，服务器不承担游戏计算或 TURN 数据中继。房主保留信令连接用于新加入和重连，因此仍有少量心跳流量。

沿用匿名五位房间码机制；ACL 限制主题范围，不提供房间身份认证或内容鉴别。房间码不是秘密凭证。此服务不是通用公共 MQTT 平台，不应在其中传输云存档凭证或业务敏感信息。

启动与更新由 `server/compose.yml`、`server/deploy.ts` 统一管理。回滚使用上一个版本的配置。建议双方都刷新到新版本，以获得相同的自有优先与公共节点保底行为。

详见 [设计与验证](../docs/signaling.md)。配置参考 [Mosquitto](https://mosquitto.org/man/mosquitto-conf-5.html) 与 [Nginx WebSocket 代理](https://nginx.org/en/docs/http/websocket.html)。
