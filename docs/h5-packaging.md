# H5 游戏包构建

## 背景

TapTap H5 包以压缩包内的 `index.html` 为入口，并要求解压后仅有一个包含入口文件的目录。

## 需求描述

提供不依赖 GitHub Pages `/island` 子路径的静态 H5 构建命令，产物可直接封装为 TapTap H5 游戏包。

## 设计方案

- 默认 `npm run build` 保留 `/island` 基路径，用于 GitHub Pages 发布。
- `npm run build:h5` 设置 `H5_EXPORT=1`，输出相对路径资源引用，适用于 H5 容器从包目录启动的场景。
- H5 构建写入 `.next-h5/`，避免复用或干扰常规构建目录。
- `npm run build:h5` 构建成功后自动生成 `dist/island-h5.zip`，与小红书共用 `scripts/zip.mts`，采用 Deflate 等级 6 压缩。构建环境使用 Node 22.18+。
- `npm run build:packages` 依次构建 H5 和小红书包，前一渠道失败即停止。
- 发布压缩包的根目录仅放置 `island/`，并包含 `island/index.html` 与完整 `_next/` 静态资源，符合 TapTap 对单一游戏根目录的要求。

## TapTap 手动云存档

H5 构建独占 `NEXT_PUBLIC_TAPTAP_H5=1`，在开始主界面增加手动上传/下载入口，覆盖本地前展示云档摘要并确认，备份包含全局配置与传承。自动存档及启动流程保持不变，GitHub Pages、小红书构建均关闭此标记。详见 [TapTap H5 手动云存档](./taptap-manual-save.md)。

## 迭代记录

- 新增 TapTap H5 静态构建与打包约定。
- 修复 H5 包入口引用站点根路径资源导致客户端脚本无法加载、启动页持续显示加载文案的问题。
- 保留压缩包内部的 `island/` 游戏根目录，保证解压后只有一个包含入口文件的文件夹。
