# 小红书小工具打包

## 背景

小红书小工具以离线 H5 ZIP 形式运行：压缩包根目录必须包含 `index.html`，资源只能使用包内相对路径，并且容器禁止网络请求、内联脚本和多种浏览器能力。项目原有 H5 与 GitHub Pages 构建渠道继续保留，不能被小红书渠道覆盖。

## 需求描述

新增独立的 `npm run build:xiaohongshu` 流程，使用单独的 Next 导出目录和独立的 `dist/xiaohongshu/` 暂存目录。流程需要将 Next 导出中的内联启动脚本外置、移除非入口导出文件、进行容器能力静态审计，并仅在通过审计时生成 ZIP。

## 设计方案

- 默认 `npm run build` 仍以 `/island` 为 GitHub Pages 基路径。
- `npm run build:h5` 改由 Node 包装器设置环境变量，修复 Windows `cmd.exe` 中 `H5_EXPORT=1` 无法执行的问题；其产物仍在 `.next-h5/`。
- `npm run build:xiaohongshu` 设置 `XHS_EXPORT=1`，构建产物放在 `.next-xiaohongshu/`，不复用默认或 H5 构建目录。
- 小红书流程把最终静态文件暂存到 `dist/xiaohongshu/`，保证 `index.html` 位于该目录根部；`dist/island-xiaohongshu.zip` 也以该目录内容作为根压缩，绝不额外包一层目录。
- 打包脚本只允许 HTML、CSS、JS、图片、字体和 JSON；会删除 Next 导出的 `404.html`、`index.txt`，并把 Next 的内联启动脚本拆为 `assets/xhs-bootstrap-*.js`，满足容器的外置经典脚本 CSP。
- 构建期会临时将渠道选择器替换为小红书专用单机入口，构建结束后立即还原源码。该入口只保留本地单机、触屏移动、工具切换和采集/交互；不加载房间、联网、剪贴板、浏览器下载或分享功能。
- 静态审计会拒绝小红书业务代码中的外部 URL、网络请求、WebSocket、WebRTC、Worker、剪贴板、动态执行代码和其他容器禁止能力。Next 运行时中的通用未执行分支不作为业务能力调用处理；HTML 资源引用仍全量检查。审计失败时不输出 ZIP，避免交付不可上传的包。
- ZIP 使用 Node 标准库生成，不新增运行时依赖；包大小超过 10 MiB 时构建失败。

## 迭代记录

- 新增独立小红书小工具构建、静态审计和 ZIP 打包入口。
- 保持 GitHub Pages 与既有 H5 构建目录、命令语义和产物相互隔离。
- 增加小红书专用单机入口，隔离多人联网、剪贴板与浏览器下载/分享能力；审计通过后生成离线 ZIP。
