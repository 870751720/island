# AGENTS.md

本文件是 ZCode 在本仓库每次会话开始时自动加载的必读指令。请根据项目实际情况补充和维护。

## 项目简介

本项目是一个 2.5D 荒岛求生游戏,运行在浏览器中:基于 Three.js/WebGL 渲染,自研游戏循环和玩法系统,外层使用 Next.js + React,Vite 用于构建单机 HTML 发行版。

**本项目是手机版游戏:所有操作交互、UI 布局和视觉设计都以手机(竖屏优先,兼顾横屏)为第一适配目标。** 详见「手机适配(必读)」。

## 手机适配(必读)

- 目标设备为手机浏览器,界面与交互必须为触屏设计,不做键鼠优先的设计。
- 操作:使用虚拟摇杆(左侧移动)+ 触屏按钮(右侧动作键,如采集/交互)等触控方案;不依赖键盘(WASD/方向键/E 等)作为主要操作方式,键鼠支持只可作为桌面端的补充。
- UI:采用响应式布局,以小屏(约 375px 宽)为基准设计;按钮和可点击区域足够大(建议 ≥ 44px),HUD 元素不遮挡核心画面。
- 渲染性能:面向手机 GPU,控制面数与 drawcall,`setPixelRatio` 需设上限,阴影分辨率取低档;新增视觉特性前先考虑移动端帧率。
- 相关需求与设计需同步更新 `docs/` 对应文档，不记录迭代记录。

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

## 联机玩法(必读)

- 本游戏支持房主/客人联机(WebRTC P2P,房主为权威端,代码在 `src/game/net/`)。**后续所有新需求在设计与实现时都必须考虑联机情况**:新系统/新交互要明确房主端权威结算与客人端表现两端各自怎么跑、状态如何同步(动作上行、快照回流、事件补播),不能只做单机实现。
- 现有同步约定:客人动作经 `NetGuest.action` 上行,由房主 `Actions.ts` 权威结算;玩家/动物姿态快照周期下发;连续数值(位置、天气强度等)客人本地模拟/插值 + 柔和对账,离散变化走快照增量。
- 涉及联机的改动需同步更新 `docs/multiplayer.md`。

## 代码规范(必读)

- **设计模式与模块化**:尽可能遵循设计模式;能模块化的尽可能模块化,能复用的功能抽成可复用模块。代码质量优先,不允许为完成需求而堆砌代码。
- **文件拆分**:不要把代码都写到一个文件里,按职责合理拆分文件和目录。
- **不留旧代码**:代码中不保留过时代码、注释掉的旧代码、废弃实现;需求迭代过程也不在代码中留痕。旧逻辑直接删除,依赖 git 历史追溯。
- **文档记录与迭代**:每个需求都要有文档记录,并在迭代时同步更新文档(放在 `docs/` 目录,按需求/模块拆分文档)。

### 技术选型

- 新代码一律使用 TypeScript。
- 包管理器统一使用 npm,Node 版本使用当前 LTS。
- 3D 渲染只用 Three.js,不引入其他渲染/游戏引擎。

### 目录结构(预留)

以下为规划结构,目录按需创建;只是预留位置,不要求现在有对应内容,没有内容时不建空目录:

- `src/game/` — 核心玩法(游戏循环、状态机、各系统)
- `src/game/entities/` — 角色与怪物
- `src/ui/` — React 外层界面
- `docs/` — 需求与设计文档
- `standalone/` — 单机版入口

### 需求文档模板

每个需求在 `docs/` 下建一份文档,包含以下四个部分;迭代时更新同一份文档(在「迭代记录」追加小节),不要每次新建:

```markdown
# 需求名
## 背景
## 需求描述
## 设计方案
## 迭代记录
```


## Git 约定

- **存档兼容约定**:存档设计以向后兼容为优先,正常内容迭代不应让旧档失效。新增道具、资源、配方、建筑类型,或新增能提供合理默认值的可选字段时,保持 `SAVE_VERSION` 不变;读取旧档时通过缺省值恢复新字段。已有道具/资源等持久化 ID 应保持稳定,不要仅因显示名称或玩法调整而改 ID。只有发生无法安全解释旧数据的破坏性变化(例如删除/重命名持久化 ID、改变已有字段语义、修改坐标体系或对核心结构做不兼容重构)时,才把 `SAVE_VERSION` +1。版本不一致的旧存档会被丢弃,玩家从新档开始;不编写跨破坏性版本的迁移代码。

- 主分支为 `main`。改完代码后:提交 → push 到 `origin main`,这会自动触发 GitHub Actions 部署到 GitHub Pages。
- **严禁只触发部署就向用户报告「部署成功」**:push 只是开始部署,必须在同一个命令/流程里真正等完整个部署过程并验证通过后才能说成功。完整验收标准(缺一不可):
  1. 等待本次 push 对应的 Actions run 结束并确认 `conclusion=success`(失败则停下排查并报告,不得谎称成功);
  2. 用 curl 确认 https://870751720.github.io/island/ 返回 200。
  两步全部通过后,才把该链接连同本次变更摘要一起交给用户。若超时或任一步失败,如实报告当前状态。
- **标准验收命令(本机未装 gh,统一用 Python 轮询 GitHub API,按 commit SHA 定位 run、纯 JSON 解析,不要用 grep 解析 JSON、不要重复拉全量列表)**:push 后在仓库根目录执行(一条命令完成等待+验证,总超时约 5 分钟):

  ```bash
  cd D:/island && export SHA=$(git rev-parse HEAD) TOKEN=$(cat githubtoken.txt) && python - <<'EOF'
  import json, os, sys, time, urllib.request

  sha, token = os.environ["SHA"], os.environ["TOKEN"]
  url = f"https://api.github.com/repos/870751720/island/actions/runs?head_sha={sha}&per_page=1"
  deadline = time.time() + 300
  while time.time() < deadline:
      with urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": f"token {token}"})) as r:
          runs = json.load(r)["workflow_runs"]
      if runs and runs[0]["status"] == "completed":
          print("conclusion:", runs[0]["conclusion"])
          sys.exit(0 if runs[0]["conclusion"] == "success" else 1)
      time.sleep(10)
  print("timeout waiting for run of", sha); sys.exit(2)
  EOF
  curl -s -o /dev/null -w "http=%{http_code}" https://870751720.github.io/island/
  ```

  退出码非 0(部署失败或超时)时停下排查,不得继续报告成功。
- 提交信息使用简洁的中文或英文祈使句均可。
- **测试分工:改完代码不需要 ZCode 做运行时测试(不起 dev 服务器、不做浏览器冒烟测试),只需通过类型检查/构建即可。** 流程为:改码 → 类型检查/构建 → 提交 → push → 等 CI/CD 部署完成 → 把线上链接和变更摘要给用户,由用户自行测试。

## GitHub 凭证约定

- 本仓库所有 GitHub 操作(gh CLI、API 请求、push/pull 等)的 token 统一存放于仓库根目录的 `githubtoken.txt`。
- 需要认证时,从该文件读取 token 使用,不要向用户另行索要。
- 该文件包含敏感信息,严禁提交到版本库,严禁让 token 内容出现在提交记录、日志、代码或对外输出中。
