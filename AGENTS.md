# AGENTS.md

本文件是 ZCode 在本仓库每次会话开始时自动加载的必读指令。请根据项目实际情况补充和维护。

## 项目简介

本项目是一个 2.5D 荒岛求生游戏,运行在浏览器中:基于 Three.js/WebGL 渲染,自研游戏循环和玩法系统,外层使用 Next.js + React,Vite 用于构建单机 HTML 发行版。

## 技术架构(必读)

### 建模方式:代码程序化建模

直接用 Three.js 基础几何体在代码中拼装,不使用任何建模软件导出的模型文件。

材质使用 `MeshStandardMaterial` 配合 flatShading、高粗糙度和低面数几何体,营造手工黏土、低多边形质感;使用正交相机从斜上方观察真正的 3D 场景,因此呈现为 2.5D。

### 动作方式:运行时程序动画

动作全部在运行时用代码控制关节节点的旋转和位置,不使用骨骼动画文件或 AnimationMixer。

### 引擎与依赖

- Three.js:3D 场景、模型、灯光、阴影、相机和 WebGL 渲染
- Next.js + React:页面和游戏外层界面
- Vite:构建单机 HTML 发行版

**定位:基于 Three.js/WebGL、自研游戏循环和玩法系统的浏览器 2.5D 游戏。**

## 代码规范

<!-- 例如:命名约定、注释语言、禁止的模式、目录结构约定 -->

## Git 约定

- 主分支为 `main`。改完代码后:提交 → push 到 `origin main`,这会自动触发 GitHub Actions 部署到 GitHub Pages。
- push 后应使用 gh CLI(`GH_TOKEN` 取自 `githubtoken.txt`)执行 `gh run watch` 等待部署完成,然后把 Pages 链接(https://870751720.github.io/island/)报告给用户。
- 提交信息使用简洁的中文或英文祈使句均可。

## GitHub 凭证约定

- 本仓库所有 GitHub 操作(gh CLI、API 请求、push/pull 等)的 token 统一存放于仓库根目录的 `githubtoken.txt`。
- 需要认证时,从该文件读取 token 使用,不要向用户另行索要。
- 该文件包含敏感信息,严禁提交到版本库,严禁让 token 内容出现在提交记录、日志、代码或对外输出中。
