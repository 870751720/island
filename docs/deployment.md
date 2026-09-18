# 自有服务器部署

## 背景

正式网站与云存档 API 部署到 `43.110.116.98`，通过 GitHub Actions 自动发布。原 GitHub Pages 工作流被替换，不再更新旧站。

## 需求描述

保留「本地提交 → 用户明确确认验证通过 → 正式构建检查 → 推送部署」流程。仅配置 GitHub 参数或构建成功不代表部署完成；必须等对应 SHA 的 Actions 成功、HTTPS 网站返回 200、云存档 API 的 revision 匹配后才能宣布成功。

## 设计方案

- GitHub Variables：`DEPLOY_HOST=43.110.116.98`、`DEPLOY_PORT=22`、`DEPLOY_USER=root`、`DEPLOY_PATH=/opt/island`、`SITE_URL=https://43.110.116.98`。
- GitHub Secrets：`DEPLOY_SSH_KEY` 为专用部署私钥，`DEPLOY_KNOWN_HOSTS` 来自本机已信任的主机记录；Actions 强制校验主机身份。不使用或上传日常 SSH 私钥。
- 工作流 `deploy.yml` 的 `production` 环境串行部署，禁止中途取消；使用 Node 22、`npm ci`、类型检查和 `SERVER_EXPORT=1` 的正式静态构建，产物网站在根路径。
- 发布包仅包含 `out/`、`server/`、`shared/`，通过 SSH 上传到 `/opt/island/releases/<SHA>/`。不上传仓库 token、开发依赖或本地 SSH 文件。
- 临时管理容器执行 `server/deploy.ts`，初始化服务端密钥、数据库目录和 HTTPS IP 证书，然后构建 API 镜像并启动 Compose 服务。首次发证需 80 端口空闲，公网安全组允许 80/443。
- 公网页面和 API 检查成功后记录 active revision 并更新 `current`；失败时尽可能恢复上次成功版本，工作流仍以失败结束。首次部署没有可回滚的旧版本，失败需排查后重试。
- SQLite、服务端密钥和证书独立放在 `shared/`，不随发布删除。不能删除该目录，也不能在正常升级中重新生成服务端密钥。
- `npm run deploy` 只允许干净的 main 工作区，从 `githubtoken.txt` 读取凭证并推送本次 SHA，按 SHA 等待 Actions（最多 25 分钟），再验收 HTTPS 200 和 API revision。凭证不写入 Git 配置，不输出日志。
- `npm run check` 检查面向服务器的根路径正式构建；普通 `npm run build` 仍支持旧的 `/island` 静态路径，H5、小红书发行流程保持各自规则。

## 使用

修改 → 类型检查与存档专项测试 → H5 打包、ZIP 完整性/结构/Deflate 校验 → 清空并解压固定验证目录 → 本地 commit → 交付验证入口 → 用户明确确认验证通过 → `npm run check` → `npm run deploy` → 等待完整验收。

固定验证入口为 `dist/local-preview/latest/island/index.html`。新服务首次上线前，云端上传下载尚不可用；本地入口可验证存档码和菜单交互。完整云端运行验收在获准发布后进行，不能将尚未上线的后端描述为可用。
