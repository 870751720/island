# H5 游戏包构建

## 背景

TapTap H5 包以压缩包内的 `index.html` 为入口，并要求解压后仅有一个包含入口文件的目录。

## 需求描述

提供不依赖 GitHub Pages `/island` 子路径的静态 H5 构建命令，产物可直接封装为 TapTap H5 游戏包。

## 设计方案

- 默认 `npm run build` 保留 `/island` 基路径，用于 GitHub Pages 发布。
- `npm run build:h5` 设置 `H5_EXPORT=1`，输出相对路径资源引用，适用于 H5 容器从包目录启动的场景。
- H5 静态导出写入 `.next-h5/`；Next 仍使用 `.next/` 作为构建中间目录。打包前通过 `scripts/prepare-package-build.mts` 清理这两个目录和旧 H5 ZIP，避免历史资源混入；各渠道构建须串行执行，不能与正式站点构建同时运行。
- `npm run build:h5` 构建成功后自动生成 `dist/island-h5.zip`，与小红书共用 `scripts/zip.mts`，采用 Deflate 等级 6 压缩。构建环境使用 Node 22.18+。
- `npm run build:packages` 依次构建 H5 和小红书包，前一渠道失败即停止。
- 发布压缩包的根目录仅放置 `island/`，并包含 `island/index.html` 与完整 `_next/` 静态资源，符合 TapTap 对单一游戏根目录的要求。

## 手动云存档

H5 包与普通网页版使用自有服务器云存档，不调用 TapTap SDK。小红书构建隐藏入口。用户凭最多 20 位存档码手动上传和下载唯一一份完整游戏本地数据，详见 [手动云存档](cloud-save.md)。H5 默认连接 `https://43.110.116.98`，构建时可用 `NEXT_PUBLIC_CLOUD_API_URL` 指定服务地址。

## 迭代记录

- 新增 TapTap H5 静态构建与打包约定。
- 修复 H5 包入口引用站点根路径资源导致客户端脚本无法加载、启动页持续显示加载文案的问题。
- 保留压缩包内部的 `island/` 游戏根目录，保证解压后只有一个包含入口文件的文件夹。
