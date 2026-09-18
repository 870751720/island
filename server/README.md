# 自有云存档服务

业务规则见 [云存档设计](../docs/cloud-save.md)，部署流程见 [部署文档](../docs/deployment.md)。

| 文件 | 职责 |
| --- | --- |
| `main.ts` | 配置读取和服务生命周期 |
| `http.ts` | 请求校验、跨域、限流、上传下载 |
| `store.ts` | SQLite 原子替换和持久化 |
| `Dockerfile` | Node API 镜像，无前端构建依赖 |
| `compose.yml` / `nginx.conf` | 私网 API、静态页面、HTTPS 与证书续期 |
| `deploy.ts` | 首次初始化、发布验收、失败回滚 |

服务器运行参数：`SAVE_SECRET`（至少 32 字符，初始化时随机生成并永久保存）、`DATA_DIR`（默认 `/data`）、`PORT`（默认 `3001`）、`REVISION`（本次 SHA）。不要更换已经使用的 `SAVE_SECRET`，否则原存档码的数据库映射无法找到。

宿主机持久目录：`/opt/island/shared/data/` 为数据库；`shared/runtime.env` 为服务端秘密；`shared/letsencrypt/` 为 IP 证书与续期配置；`shared/acme/` 为续期挑战文件。`releases/<SHA>/` 为不可变发布内容，`current` 指向通过验收的版本。

首次发布使用 Certbot 5.4 的 standalone 模式申请 `43.110.116.98` 的短期证书，要求公网 80/443 可访问。后续每 12 小时检查续期，改用 nginx 提供的 webroot 验证；nginx 每小时重载证书。证书申请失败会阻止部署，不降级到明文 HTTP。参考 [Let's Encrypt IP 证书说明](https://letsencrypt.org/2026/03/11/shorter-certs-certbot)。

发布使用 Docker socket 的临时管理容器，挂载目录与宿主机保持相同绝对路径，以保证 Compose 的 bind mounts 正确。执行发布会短暂重建服务，但 SQLite 目录不会删除。回滚不回滚用户存档；未来数据库破坏性变更必须另行设计。
