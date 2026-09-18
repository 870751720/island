# 部署流程

## 背景

部署到 GitHub Pages 需要同时确认本次提交的 Actions 成功和线上 HTTP 200，统一脚本避免手工漏验收。

## 需求描述

执行 `npm run deploy` 完成推送和部署验收，任何失败或超时均返回非零退出码。提交代码前自行完成类型检查或构建；脚本不自动提交。

## 设计方案

- 使用 Node 22.18+、Git 和 curl；从仓库根目录 `githubtoken.txt` 读取凭证，不输出凭证、不写入 Git 配置。
- 仅允许干净的 `main` 工作区，检查 `origin` 属于本仓库且凭证文件未被跟踪。
- 记录 HEAD SHA，经 HTTPS 推送该 SHA 到 `origin main`，不强制推送；推送最多等待 60 秒。
- 按 SHA、push 事件和 `deploy.yml` 工作流查找 Actions；找到后仅轮询该 run。每 10 秒检查，最多等待 5 分钟，API 单次最多等待 20 秒。
- 只有 `conclusion=success` 后才使用 curl 检查线上返回 200（最多 30 秒），两项通过才输出部署成功。
- 网络异常、推送失败、Actions 失败或超时、站点非 200 均停止并返回非零退出码。推送后的错误不回滚远端；可查看输出的 Actions 链接，或重新执行命令验收同一提交。
- HTTP 200 表示站点可访问；游戏运行时验收仍由用户完成。

## 使用

完成修改 → `npm run typecheck` → `npm run build:h5` → 校验 ZIP 完整性、入口结构及 Deflate 压缩 → 清空并解压到固定目录 `dist/local-preview/latest/` → 交付固定验证入口 `dist/local-preview/latest/island/index.html` → 等用户明确确认本地验证通过 → `npm run check` → `git add` / `git commit` → `npm run deploy`。

本地验证入口固定为 `dist/local-preview/latest/island/index.html`，用户在浏览器保存该地址即可。每次修复后重新打包，删除并重建该固定目录再解压，用户刷新浏览器即可预览最新构建；用户未回复不视为通过。运行时测试由用户完成，ZCode 不启动开发服务器或进行浏览器冒烟测试。
