# 独立中转运维

服务器 `193.112.25.170`，SSH 用户 `ubuntu`（支持免密 sudo），私钥由操作员在本机指定，不上传或提交。服务源码放在 `/opt/island-relay/app/relay/`，持久证书与 ACME 文件放在 `/opt/island-relay/shared/`。公网只需 SSH、80、443，3002 不发布到宿主网络。

首次部署：创建 shared 下的 `letsencrypt`、`acme` 目录，在 80 端口空闲时运行 `certbot/certbot:v5.4.0 certonly --standalone --preferred-profile shortlived --ip-address 193.112.25.170 --cert-name 193.112.25.170 --non-interactive --agree-tos --register-unsafely-without-email`，将宿主 `shared/letsencrypt` 挂载到容器 `/etc/letsencrypt`，并发布容器 80 端口。

将仓库的 `relay/`（排除 node_modules）上传至 app 目录后，在 app 下执行 `sudo env REVISION=<源码提交SHA> docker compose -p island-relay -f relay/deployment/compose.yml up -d --build --wait --wait-timeout 120`。更新前备份 app 源码和运行的 revision；失败恢复备份并用原 revision 重建。重建中转会关闭现有房间，安排无玩家时更新。首次安装使用其服务代码对应的提交 SHA。

默认 150 房、每房 4 人，256 MiB / 0.5 CPU；可在 compose 调用时传入 `RELAY_MAX_ROOMS`、`RELAY_MAX_PLAYERS`。Certbot 每 12 小时检查续期，Nginx 每小时平滑重载证书；IP 证书为短有效期证书，机器应保持运行。可通过 compose 的 certbot 服务执行 `renew --webroot -w /var/www/acme --dry-run` 验证续期，覆盖其 entrypoint 为 certbot。

从仓库运行 `node --input-type=module -e "import { verifyRelay } from './relay/verify.ts'; await verifyRelay('https://193.112.25.170', '<源码提交SHA>')"` 验证可信 HTTPS、状态版本和真实 WSS 心跳。该探针不占用玩家房间。不要关闭 TLS 校验。

主站、云存档和直连信令继续部署在 `43.110.116.98`。现有 `npm run deploy` / Actions 只发布原主站及 Pages，不会更新独立中转；中转服务变更需另行按本文件发布和验收。旧入口保留支持旧客户端，旧、新入口的房间不互通，联机双方须使用更新后的同版客户端。前端默认使用新 IP，也可通过 `NEXT_PUBLIC_RELAY_URL` 覆盖。
