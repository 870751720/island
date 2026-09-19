# 自有服务器与 GitHub Pages 双站部署

## 背景

正式网站与云存档 API 部署到 `43.110.116.98`，通过 GitHub Actions 自动发布。同一工作流也发布 GitHub Pages：`https://870751720.github.io/island/`，两个站点共用服务器的云存档 API。

## 需求描述

保留「本地提交 → 用户明确确认验证通过 → 正式构建检查 → 推送部署」流程。仅配置 GitHub 参数或构建成功不代表部署完成；必须等对应 SHA 的 Actions 成功、两个 HTTPS 网站均返回 200、云存档 API 和 Pages `revision.txt` 均与提交 SHA 匹配后才能宣布成功。

## 设计方案

- GitHub Variables：`DEPLOY_HOST=43.110.116.98`、`DEPLOY_PORT=22`、`DEPLOY_USER=root`、`DEPLOY_PATH=/opt/island`、`SITE_URL=https://43.110.116.98`。
- GitHub Secrets：`DEPLOY_SSH_KEY` 为专用部署私钥，`DEPLOY_KNOWN_HOSTS` 来自本机已信任的主机记录；Actions 强制校验主机身份。不使用或上传日常 SSH 私钥。
- 工作流 `deploy.yml` 的 `production` 环境串行部署，禁止中途取消；使用 Node 22、`npm ci`、类型检查和 `SERVER_EXPORT=1` 的正式静态构建，产物网站在根路径。
- Pages 构建作业独立使用 `SERVER_EXPORT=0`，输出 `/island` 资源路径，通过官方 configure/upload/deploy Pages actions 发布（参见 [GitHub 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)）。Pages 发布等待服务器部署和自身构建都成功，使用 `github-pages` 环境，权限限于该发布作业的 `pages:write` 与 `id-token:write`。两份构建都显式使用 `SITE_URL` 作为云存档 API 来源，Pages 不承载数据库或 API。
- Pages 发布包携带本次 SHA 的 `revision.txt`，发布后短暂重试检查 HTTP 200 和版本文件，防止把旧缓存页面误认为发布成功。任一站点验收失败都使整体部署失败；双站不是跨平台原子切换，失败时如实报告各站状态。
- 发布包仅包含 `out/`、`server/`、`shared/`、`signaling/`、`relay/`（排除 `relay/node_modules`），通过 SSH 上传到 `/opt/island/releases/<SHA>/`。不上传仓库 token、开发依赖或本地 SSH 文件。
- 临时管理容器执行 `server/deploy.ts`，初始化服务端密钥、数据库目录和 HTTPS IP 证书，然后构建 API、中转镜像并启动 Compose 服务。首次发证需 80 端口空闲，公网安全组允许 80/443。
- 公网页面、API、信令 WSS 的 MQTT CONNACK、中转状态 revision 和 WSS 心跳检查成功后记录 active revision 并更新 `current`；中转探针不占玩家房间。失败时尽可能恢复上次成功版本，工作流仍以失败结束。首次部署没有可回滚的旧版本，失败需排查后重试。
- SQLite、服务端密钥和证书独立放在 `shared/`，不随发布删除。不能删除该目录，也不能在正常升级中重新生成服务端密钥。
- `npm run deploy` 只允许干净的 main 工作区，从 `githubtoken.txt` 读取凭证并推送本次 SHA，按 SHA 等待 Actions（最多 25 分钟），再验收两个站点的 HTTPS 200、API revision 和 Pages revision.txt。凭证不写入 Git 配置，不输出日志。
- `npm run check` 依次检查服务器根路径构建和 GitHub Pages `/island` 构建，并检查导出 HTML 的脚本路径；普通 `npm run build` 默认构建 Pages，H5、小红书发行流程保持各自规则。

## 使用

修改 → 类型检查与存档专项测试 → H5 打包、ZIP 完整性/结构/Deflate 校验 → 清空并解压固定验证目录 → 本地 commit → 交付验证入口 → 用户明确确认验证通过 → `npm run check` → `npm run deploy` → 等待完整验收。

固定验证入口为 `dist/local-preview/latest/island/index.html`。首次前端验证需要可用的云存档后端：可先从已提交代码准备 `bootstrap/<SHA>/`，仅启用 API、HTTPS 代理和证书续期，不推送仓库、不发布游戏前端。该阶段验证 `/api/health`、本地文件来源的 CORS 预检，以及独立测试码的上传/下载；测试后只删除该测试码记录。前端运行时仍由用户在固定入口验证，确认后按标准流程推送发布。

## 后端联调环境

后端联调与正式发布共用 Compose 项目 `island` 和 `/opt/island/shared/` 持久数据，首次联调的前端目录为空。后续 Actions 发布会使用正式 release 目录接管服务，保留已有云档、服务端密钥及 HTTPS 证书。后端联调成功不等于前端正式发布成功，也不替代用户本地验证确认。

## 跨站存档

服务器站点与 GitHub Pages 的本地存储相互隔离。使用同一个存档码可以访问同一份云档，但本地进度不会跨站自动同步；需在来源站点上传，再在目标站点选择云端版本。

## 自有信令服务

`signaling/` 与 `server/` 同级，由同一个 Compose 项目启动独立 Mosquitto 容器。Nginx 复用 443 和证书代理 `/signaling`，不发布 MQTT 宿主机端口。Actions 运行联机连接专项测试并上传信令配置；服务端发布验收检查公网 WSS，不通过则回滚。详见 [自有联机信令](signaling.md)。首次后端联调仅增加信令容器和代理路由，不发布新游戏前端；正式发布仍须用户明确确认本地验证通过。

## 自有游戏数据中转

`relay/` 为独立 Node WebSocket 服务，Nginx 代理 `/relay` 与 `/relay/status`。默认最多 2 房、每房 4 人（含房主），与直连 MQTT 信令分离；中转不承担权威游戏计算。Compose 容器重建会解散现有中转房间，玩家可由房主重新开房；存档不受影响。可在部署环境配置 `RELAY_MAX_ROOMS` 与 `RELAY_MAX_PLAYERS`，详见 [中转设计与验证](relay.md)。首次发布前本地 H5 的中转服务不可用提示属于服务尚未上线，不能将本地构建通过等同于公网互联验证通过。
