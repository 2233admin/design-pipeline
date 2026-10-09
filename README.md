# design-pipeline

> 让 Agent 把设计方向落实为可检查的界面、动效和影片。

![License](https://img.shields.io/badge/license-MIT-blue)
![Stars](https://img.shields.io/github/stars/2233admin/design-pipeline)
![Last Commit](https://img.shields.io/github/last-commit/2233admin/design-pipeline)
![Node](https://img.shields.io/badge/Node-22+-339933)

`design-pipeline` 是面向 AI coding agent 的设计技能与可执行设计框架（harness），覆盖 UI、动效网站、产品宣传片和 PV/MAD 剪辑。

- **小任务**：从绘图、排版、图像、构图和诊断工具中选一项，沿用项目现有流程。
- **完整交付**：先明确目标，再分步实现、检查真实输出、修复问题，最后由用户验收。

## 作品案例：珐琅徽章

![珐琅徽章的 WebGL 实时渲染预览](examples/enamel-badge/preview.png)

[在线体验](https://2233admin.github.io/design-pipeline/enamel-badge/) · [源码与运行说明](examples/enamel-badge/)

蓝釉、银色掐丝、虹彩箔片与凸透镜的交互材质研究。由当前会话 Codex 与用户多轮校对完成；运行环境未暴露精确模型 ID。这不是模型一次自动复刻的结果，也不是路径追踪（PT）；用户仍指出玻璃与参考效果存在误差。[制作边界与依赖来源](examples/enamel-badge/README.md)见案例说明。

---

## 定位

design-pipeline 把视觉方法、可调用工具和实际验证放进同一条工作流，让 Agent 在实现前有明确的设计依据，在修改后有可以检查的结果。前端 UI 是第一个落地面，动效、图形与影片使用各自适用的工具和检查。

能力分三层：

- **工具与模板**：复用绘图、排版、构图和动效结构，让 Agent 有具体的方法可用。
- **门禁与反馈**：检查声明的技术约束和交互行为，把失败结果带回下一次修复。
- **评测**：用共同简报和检查条件比较已测任务的产出，评估方法和工具的改动。

Component Conformance 记录技术符合性，Visual Acceptance 记录用户对实际画面、交互与播放效果的验收。技术检查通过后，仍需要用户确认设计是否达到目标。

需要需求拆解、TDD 或代码审查时，可按 [Matt 技能指南](docs/agents/matt-skills.md)单独配置工程技能，与设计流程配合使用。

## 这是什么

完整工作流覆盖四种交付物：影片（`film`）、剪辑（`edit`）、网站（`web`）和界面（`ui`）。入口是 `designer-pipeline next`：它读取
`.design-pipeline/state.json`，每次只返回一个动作；按 `quick` / `standard` / `full` 三档控制流程轻重。

Agent 按返回的动作执行工具与检查，并用 `decide` 记录用户决定。一次完整交付的主线是：

1. **定目标**：明确交付物、参考来源、使用场景和验收条件。
2. **做计划**：按所选工作流拆成可检查的小任务，复用或补齐设计与动效规范。
3. **实现**：按需读取方法、选择工具，完成当前任务。
4. **实际验证**：在浏览器里检查画面与声明的交互；影片和剪辑检查实际输出并播放画面与声音。
5. **修复与验收**：根据失败结果修复并重跑检查；技术符合后展示实际作品，记录用户反馈或验收。

局部任务直接从[工具索引](skill/tools/README.md)开始。完整交付按需使用 `DESIGN.md` 和 `MOTION.md`；下游项目只有 `full` 档要求 OpenSpec。网站克隆、设计系统和动效实现保留来源与运行证据，改动后重新检查受影响的结果。

当前预发布版 `0.12.0-beta.1`（最新正式版仍是 `0.10.0`）把下面这些能力放进同一个可打包、
可安装、可验证的工具架：

- 需求、`DESIGN.md`、`MOTION.md` 与 OpenSpec 变更生命周期；
- 前端框架、样式、15 个 UI 库、组件来源和 127 项设计技能索引的统一选择；
- 网站克隆、方向预览、中文排版、设计系统、动效、组件状态和浏览器证据门禁；
- DOM、SVG/D3、XY、PixiJS、Phaser、Three.js、Babylon.js、PlayCanvas、WebGPU 等图形路线；
- 工具环境探测、哈希绑定的调用计划、标准化 receipt、打包和隔离安装验收；
- 产品宣传片：分镜、GSAP 时间线探针、构图、音频与配乐门禁，Strudel 配乐（AGPL，按需安装、不随包分发）、
  Blender 适配器（GPL 的 Blender 在外部运行）和 HyperFrames 目录桥接；
- PV/MAD 音乐驱动剪辑：`film-edit analyze|auto|render|check`，按节拍切点并检查节奏。

目录中的工具不等于已经安装。管线负责选择、探测和验收；目标项目仍然负责固定并安装
实际运行时。`reflex-xy` 是目前第一个具备完整生命周期合同的外部图形适配器，不代表
系统只支持 XY。

设计依据随项目保存，后续修改可以沿用同一套决定：

- `DESIGN.md` 记录视觉系统：色彩、字体、间距、组件架构。
- `MOTION.md` 记录动效语言：时序、缓动、编排、减弱动效行为。
- `OpenSpec` 管理生命周期：提案、实现、验证、归档，每一步可追溯。

## 适合谁

- 用 Agent 做前端 UI，希望样式、组件状态和后续修改有共同依据。
- 复刻网站或研究视觉参考，需要核对真实来源、画面和交互差异。
- 制作动效网站或产品宣传片，需要把构图、时间线、声音与播放检查串起来。
- 制作 PV/MAD 剪辑，需要按节拍安排切点并检查节奏。
- 管理多个项目，希望重复使用方法和工具，并保留交付依据。

快速探索可以只用一个工具；需要长期维护和多轮校对的作品，可以走完整流程。设计方向和最终效果由你与 Agent 共同判断。

## 一分钟上手

需要 Node.js 22 或更新版本。下面把当前本地版本安装为 Codex skill，再从目标项目调用工具。其他 agent、标准 `skills add` 和升级方法见 [安装与升级](skill/references/installation.md)。

```bash
# 在仓库根目录，将当前版本安装到 ~/.codex/skills/design-pipeline
node scripts/install-local.cjs --source skill --root "$HOME/.codex/skills" --target "$HOME/.codex/skills/design-pipeline"

# 切换到你的项目目录，使用已安装 skill 的绝对路径并明确项目 root
cd /path/to/your-project
node "$HOME/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template visual-craft --output "visual-craft-study"
```

Agent 提示示例：“在当前项目里运行 `composition scaffold --template visual-craft --output visual-craft-study`，用复制出的 Canvas helper 做一个可拖动进度、支持乱序重绘的小型绘画与排版 study；保留 DOM 正文语义，渲染后检查不同尺寸和文本溢出。”轻量脚手架只创建新目录中的 study 文件，不初始化影片或工作流状态。仓库内置其他工具见 [工具索引](skill/tools/README.md)。

CSS 写作和审查内置 [Good CSS](skill/references/good-css.md)：完整保留已审核上游的 47 个实践、8 类指南和全部示例素材，逐项说明项目适配与验证条件。[离线示例工具](skill/tools/good-css/README.md) 只需 Node.js，不依赖额外安装的 skill。

视觉设计内置 [Taste-Skill 的全部 13 项能力](skill/references/taste-skill.md)：前端方向、截图还原、旧项目改造、风格设计、完整交付、Stitch、网页/移动端生图和品牌视觉。根据任务选择对应指南，完整原文随工具发布；无需另装 Taste 技能。生图仍使用宿主提供的图像生成工具。

影片任务内置 [Cinetic 与 Product Film 方法](skill/references/film-methods.md)：完整锁定来源、真实品牌与组件复用、显式技法选择和可配置帧率的动效实现，沿用既有 HyperFrames 与影片验证。[Prompt Motion 模板库](skill/references/prompt-motion/README.md)支持离线检索案例与配方，保留替换输入、结构规则、来源及观察限制；[维护指南](docs/prompt-motion-template-maintenance.md)说明候选更新、重复和下架处理。普通 UI/CSS 任务仍按原流程执行。

## 从 GitHub Release 安装

如果不想克隆仓库，直接下载最新正式版 `v0.10.0` Release 的资产（预发布版资产在发布后见 Releases 页面）。需要 Node.js 22 或更新版本。
Release 包的归档根目录是 `design-pipeline/`，包含 `SKILL.md`、`references/`、`scripts/`、
生成的 `PACKAGE.json` 和安装器；其中包含的参考快照与其他资源解压后约占 **175 MB**。
压缩包的实际下载大小以 GitHub Release 页面为准。

可用资产：

- ZIP（Windows PowerShell）：<https://github.com/2233admin/design-pipeline/releases/download/v0.10.0/design-pipeline-skill.zip>
- TGZ（Git Bash/Unix）：<https://github.com/2233admin/design-pipeline/releases/download/v0.10.0/design-pipeline-skill.tgz>
- 校验文件：<https://github.com/2233admin/design-pipeline/releases/download/v0.10.0/checksums.txt>

### Windows PowerShell（ZIP）

```powershell
$version = "0.10.0"
$base = "https://github.com/2233admin/design-pipeline/releases/download/v$version"
$work = Join-Path $env:TEMP "design-pipeline-v$version"
$archive = Join-Path $work "design-pipeline-skill.zip"
$checksums = Join-Path $work "checksums.txt"
$extract = Join-Path $work "extracted"

New-Item -ItemType Directory -Force -Path $work | Out-Null
Invoke-WebRequest "$base/design-pipeline-skill.zip" -OutFile $archive
Invoke-WebRequest "$base/checksums.txt" -OutFile $checksums

$line = Get-Content $checksums | Where-Object { $_ -match '  design-pipeline-skill\.zip$' }
$expected = ($line -split '\s+')[0].ToUpperInvariant()
$actual = (Get-FileHash $archive -Algorithm SHA256).Hash.ToUpperInvariant()
if ($actual -ne $expected) { throw "SHA-256 mismatch for $archive" }

Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force
$source = Join-Path $extract "design-pipeline"
$target = Join-Path $HOME ".codex\skills\design-pipeline"
$installer = Join-Path $source "scripts\install-local.cjs"

node $installer --root (Split-Path $target) --target $target --source $source
$cli = Join-Path $target "scripts\designer-pipeline.cjs"
node $cli doctor --root . --json
node $cli route --root . --query "design a settings page" --json
```

### Git Bash / Unix（TGZ）

```bash
version=0.10.0
base="https://github.com/2233admin/design-pipeline/releases/download/v${version}"
work="${TMPDIR:-/tmp}/design-pipeline-v${version}"
mkdir -p "$work"

curl -fL "$base/design-pipeline-skill.tgz" -o "$work/design-pipeline-skill.tgz"
curl -fL "$base/checksums.txt" -o "$work/checksums.txt"
(cd "$work" && awk '$2 == "design-pipeline-skill.tgz" { print }' checksums.txt | sha256sum -c -)

tar -xzf "$work/design-pipeline-skill.tgz" -C "$work"
node "$work/design-pipeline/scripts/install-local.cjs" \
  --root "$HOME/.codex/skills" \
  --target "$HOME/.codex/skills/design-pipeline" \
  --source "$work/design-pipeline"

cli="$HOME/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs"
node "$cli" doctor --root . --json
node "$cli" route --root . --query "design a settings page" --json
```

升级现有安装时，在对应的 `node ... install-local.cjs` 命令末尾加 `--replace`；不加该标志时，
安装器会拒绝覆盖已有目标。Release 包不会安装目标项目的 npm、pnpm、Yarn、Bun 或其他运行时
依赖；目标项目仍需自行声明和安装自己的依赖。

可选 companion skill 不会被静默安装。安装后运行 `check-deps.cjs`，缺少或过期的可选能力会明确
报告 `WARN`，同时给出内置流程或官方文档的 fallback；只有必需资源缺失才会失败：

```bash
node "$HOME/.codex/skills/design-pipeline/scripts/check-deps.cjs"
```

PowerShell 对应命令为：

```powershell
node (Join-Path $target "scripts\check-deps.cjs")
```

如果某个 companion 缺失，继续使用内置门禁和 fallback，并按输出提示记录该能力缺口；不要把
`WARN` 当成已自动安装或已验证完整覆盖。

创建第一个设计基础：

```bash
# 初始化设计合成
node skill/scripts/init-design-synthesis.cjs \
  --change-id create-product-design-system \
  --problem "Design an operations console for support leads" \
  --framework nextjs

# 检查设计基础是否就绪
node skill/scripts/check-design-foundation.cjs --project-root . --json
```

`ready` 解锁实现。`synthesis-required` 需要补充设计。`invalid` 需要修复。

## 引导式多 Surface 流程

普通用户可以从一句话开始，并逐个回答四个核心问题（`audience.json`、`primary-actions.json`、
`surface.json`、`success-criteria.json` 各保存一个回答对象）：

```bash
node skill/scripts/designer-pipeline.cjs intake start --artifact input.json --write --output brief-inferred.json --json
node skill/scripts/designer-pipeline.cjs intake answer --artifact brief-inferred.json --answer audience.json --write --output brief-audience.json --json
node skill/scripts/designer-pipeline.cjs intake answer --artifact brief-audience.json --answer primary-actions.json --write --output brief-actions.json --json
node skill/scripts/designer-pipeline.cjs intake answer --artifact brief-actions.json --answer surface.json --write --output brief-surface.json --json
node skill/scripts/designer-pipeline.cjs intake answer --artifact brief-surface.json --answer success-criteria.json --write --output brief-proposed.json --json
node skill/scripts/designer-pipeline.cjs intake confirm --artifact brief-proposed.json --write --output brief.json --json
```

熟悉合同的专家可以走快速路径，先验证 Surface，再检索并审阅模板：

```bash
node skill/scripts/designer-pipeline.cjs surface validate --artifact surface.json --json
node skill/scripts/designer-pipeline.cjs template search --catalog catalog.json --surface surface.json --request request.json --json
node skill/scripts/designer-pipeline.cjs template select --selection selection.json --write --output receipt.json --json
node skill/scripts/designer-pipeline.cjs template adapt --receipt receipt.json --context context.json --write --output plan.json --json
node skill/scripts/designer-pipeline.cjs template review --plan plan.json --review review.json --write --output reviewed-plan.json --json
node skill/scripts/designer-pipeline.cjs template approve --plan reviewed-plan.json --approval approval.json --write --output approved-plan.json --json
```
`template select` 只接受带 `changeRoot` 的方向预览证明，并从该目录重新读取并校验 `direction-preview.json` 及其引用文件；`changeRoot` 必须位于项目根目录内。`approval.json` 必须包含与待审批计划 `contentHash` 相同的 `planContentHash`。

首轮只覆盖项目内的 Web 与 Mobile 证据和元数据，不承诺截图、URL、视觉嵌入或 Game 支持。

## 核心功能

### 可视化方向预览与中文排版

开放式整页设计在选方向前先生成同内容、同状态、同视口的迷你 mockup 对比页，并由
`direction check` 校验候选差异、文件与哈希；窄范围或唯一参考则显式豁免。含中文、日文或
韩文的界面默认使用系统字体栈，并记录 CJK 行高、标点规则以及装饰字体的最小字形子集与
fallback，避免用数 MB 的完整字体掩盖排版问题。

### 交互式 Playground

Playground 是一种适合“文字不够好用”的模型交互介质：它把问题做成无外部依赖的单文件
HTML，通过控件、即时表示、预设和可复制的自然语言提示词来探索结果。它既能调整组件、
布局、色彩、字体与动效，也能可视化代码架构和概念关系、探索数据、评审文档或 diff、
调整游戏平衡。`playground check` 验证构建、浏览器行为、选择和用途路由；接受的结果按
类型进入 `design.md`、`motion.md`、`handoff.md`、`brief.md`、`qa.md` 或 `scene.md`，并由
SHA-256 绑定，防止实现阶段漂移。包内同时提供 code map、concept map、data explorer、
design、diff review、document critique 与 game balance 七份默认蓝图；它们不是封闭分类。
项目可以携带新的 Blueprint，声明自己的交互结构、状态输出、QA 和受允许的集成目标，
Blueprint 哈希变化会自动使旧浏览器验证失效。

### 分层自适应

Design Pipeline 可以从明确纠正和重复使用证据中提出更合适的协作或项目规则，但不会训练
模型权重，也不会自动改写方法论。Methodology Kernel 与质量门禁保持冻结；当前任务策略
只在本次任务有效；项目和用户规则存放在外部、版本化的 JSON Skill 中。每个候选只能做
一次 `add`、`replace` 或 `delete`，默认停留在影子模式。只有不同评估者在互不重叠的 replay
与 held-out 场景中都测得严格提升、所有不变量通过、哈希一致且用户明确批准后，候选才能
晋升。持久规则只能选择有限的协作维度，不接受自由文本行为指令；候选绑定外部 Skill 的
精确路径、版本和内容哈希，晋升与回退通过可恢复的 prepare/commit 日志避免半提交状态。
账本使用进程互斥区分“仍在写入”和“崩溃待恢复”，同一维度只保留 task > project > user >
defaults 的一个有效值；参与者标签与审批/拒绝理由只保存用途隔离的哈希，不保存原文。
`adaptation check|resolve|record|propose|evaluate|promote|reject|rollback|forget` 提供检查、
作用域合并、拒绝、回退和真正移除候选内容的完整生命周期。

### 直接表达

面向用户的提示、错误、公告和恢复说明先写清实际影响或下一步，再解释内部原因。第二遍
逐项核对范围、数量、时限、不确定性、未改变的状态和真实可用操作；更短的句子如果把
局部问题说成整体失败，仍然不合格。

### 设计基础：DESIGN.md

每个项目必须有验证过的 `DESIGN.md`，记录视觉系统决策。不是模板复制，是从需求、仓库约束和参考证据合成的项目特定合同。

```bash
node skill/scripts/check-design-foundation.cjs --project-root . --json
```

### 动效基础：MOTION.md

每个项目必须声明动效姿势，包括明确声明"静态"（当故意不动效时）。记录时序、缓动、编排、减弱动效行为、性能预算。

```bash
node skill/scripts/check-motion-foundation.cjs --project-root . --json
```

### 组件能力路由

组件库不直接变成项目依赖。流水线先把需求拆成稳定的行为能力，再按项目框架、已有依赖、
来源证据、接入方式和许可证选路；没有授权的远程库只会得到 `review`，不会被静默复制。
当前内置的用户策展参考来源包括 `Beautiful UI`、`beUI`、`Rare UI`、`Transitions.dev`、
`shadcn/ui`、`Shadcnblocks`、`Magic UI`、`Aceternity UI` 和 `AI SDK Elements`。
它们记录在 `skill/references/component-source-catalog.json` 中，作为可搜索的灵感与组件来源；
这些条目不是已安装依赖，实际接入前仍需核对源码、许可证、依赖、SSR/客户端边界和无障碍行为。
组件 Fit 不再按全局“最佳组件库”做单次选择。方向选定后先生成 hash-bound `direction-lock.v1`，再生成
`component-fit-matrix.v1`。矩阵以能力为粒度保留全部候选和六项门禁：`behavior`、`accessibility`、
`framework`、`license`、`visualFit`、`provenance`。决策只能是 `reuse`、`adopt`、`substitute`、
`custom` 或 `blocked`；`reference-only` 来源只能作为适配参考，不能直接变成依赖。多个 foundation
候选必须显式锁定同一个系统，目录、Provider registry、项目组件清单和方向锁的 hash 漂移都会使矩阵失效。

```bash
# 从已批准方向和 selection receipt 生成方向锁
node skill/scripts/designer-pipeline.cjs component lock \
  --root ../my-project --artifact direction-lock-request.json \
  --write --output direction-lock.json --json

# 按能力评估全部组件来源，并绑定方向锁、目录和项目组件清单
node skill/scripts/designer-pipeline.cjs component fit \
  --root ../my-project --artifact component-fit-request.json \
  --write --output component-fit-matrix.json --json
```

验证矩阵自身 hash；同时提供 `--direction-lock`、`--catalog`、`--providers`、`--inventory` 时，
CLI 还会对当前输入做绑定校验，发现上游漂移即拒绝。

```bash
node skill/scripts/designer-pipeline.cjs component validate-fit \
  --root ../my-project --artifact component-fit-matrix.json \
  --direction-lock direction-lock.json --catalog component-source-catalog.json \
  --providers component-providers.json --inventory component-inventory.json --json
```


```bash
# 与框架无关地分解表格能力，并自动补齐键盘、焦点、ARIA 和完整状态
node skill/scripts/designer-pipeline.cjs component decompose \
  --query "支持筛选、排序、分页和多选的数据表格" --json

# 只读探测 Vue 项目；不会安装 Vuetify0、Ark UI 或修改 package.json
node skill/scripts/designer-pipeline.cjs component providers \
  --root ../my-vue-project --framework vue --json

# 从请求文件生成逐能力 Provider 路由
node skill/scripts/designer-pipeline.cjs component resolve \
  --root ../my-vue-project --artifact component-request.json \
  --write --output component-resolution.json --json

# 根据 resolution hash 和真实行为证据验收
node skill/scripts/designer-pipeline.cjs component verify \
  --root ../my-vue-project --artifact component-resolution.json \
  --receipt component-receipt.json --json
```

Vuetify0、React Aria 和 Ark UI 是首批可替换 Provider；项目自有 DOM 实现始终是受治理的
回退路径。能力 IR 不包含 Vue composable、React Hook 或其他框架 API。

### Component-first 一致性 Gate

`component-first-gate.v1` 把明确 target、stack request/decision、组件 resolution/verification、
组件声明、Playground、页面使用和外部截图证据组合成一个只读一致性检查。它复用上面的
stack、component capability 和通用 Playground 内核；不会启动浏览器、运行目标项目或安装依赖。

```bash
# 聚合检查；0=passed，1=invalid，2=blocked
node skill/scripts/designer-pipeline.cjs component-first check \
  --root ../my-project --artifact component-first.json --json

# 只运行一个 stage 及必要的上下文解析
node skill/scripts/designer-pipeline.cjs component-first stack --root ../my-project --artifact component-first.json --json
node skill/scripts/designer-pipeline.cjs component-first components --root ../my-project --artifact component-first.json --json
node skill/scripts/designer-pipeline.cjs component-first playground --root ../my-project --artifact component-first.json --json
node skill/scripts/designer-pipeline.cjs component-first page --root ../my-project --artifact component-first.json --json

# v1 兼容别名；这里只委托组件一致性，不代表视觉验收通过
node skill/scripts/designer-pipeline.cjs high-fidelity check \
  --root ../my-project --artifact component-first.json --json
```

项目自有组件使用 `componentOrigin: "project-owned"`，不能把 `project-owned` 写成 runtime
stack；它仍需源码、symbol、contract、token、键盘、焦点、状态、Playground 与页面实际使用证据。
`page-ready` 同时声明 `scope: prototype | production`，prototype 证据不能满足 production target。
截图必须是能完整解码且实际字节 hash 匹配的 PNG。普通 hash binding 只能发现 artifact 不匹配、
过期或串用，不能证明 receipt 没有人为伪造；可信 producer、签名和 CI attestation 留给 artifact v2。

### Component-first Artifact V2 与 Design Skill layer

v1 Gate 通过后，可以用 v2 artifact 把同一个 target、snapshot、policy 和五个阶段 receipt 串起来：

```bash
# 从 v1 aggregate 迁移；必须显式提供 target snapshot digest
node skill/scripts/designer-pipeline.cjs component-first-v2 migrate \
  --root ../my-project --artifact component-first.json \
  --snapshot sha256:<64-hex> --json

# 检查 receipt 链；上游、target 或 policy 变化会返回 blocked/stale
node skill/scripts/designer-pipeline.cjs component-first-v2 check \
  --root ../my-project --artifact component-first-v2.json --json

# 路由和读取单一 Design Skill manifest
node skill/scripts/designer-pipeline.cjs design-skill route \
  --root . --query "make three prototype directions" --json
node skill/scripts/designer-pipeline.cjs design-skill manifest \
  --root . --skill design.prototype --json
```

`design.prototype` 先消费并验证 `design-pipeline.direction-preview.v1`，只把通过 preview gate 的
候选复制到隔离 prototype；selection receipt、Component Conformance 和 Visual Acceptance 必须分开记录。
production promotion 只生成显式 handoff，不会由 Design Skill 直接写入目标项目。

```bash
# Web 应用 UI：优先返回 React Bits Pro，保留许可证审查
node skill/scripts/designer-pipeline.cjs design-system route \
  --query "SaaS dashboard app UI" --platform web --json

# Expo 数字动效：路由到 expo-content-transition
node skill/scripts/designer-pipeline.cjs design-system route \
  --query "animated numeric stat" --platform expo --json

# 深度轮播：返回参考源、接入命令和无授权时的 CSS 降级路径
node skill/scripts/designer-pipeline.cjs design-system route \
  --query "depth carousel" --platform web --json

# SmoothUI：从本地 130 项快照中推荐具体组件
node skill/scripts/designer-pipeline.cjs design-system route \
  --query "SmoothUI animated tabs" --platform web --json
```

当前内置的是这些来源元数据：Beautiful UI、`expo-content-transition`、React Bits 免费 Dither、React Bits Pro app UI、React Bits depth carousel、SmoothUI 130 项组件快照，以及 Web DOM 数字过渡回退。SmoothUI 快照会返回组件名、文档 URL、registry 安装命令、依赖和 reduced-motion 信息；组件源码不在本仓库内，其他来源仍按路由结果做许可审查。

### 网站克隆

捕获参考证据，从完整组件合同构建，独立比较结果后才声称保真度。

整站或登录后页面另有内置的 `deepclonewebsite` 功能切片参考：支持可见浏览器登录门、
同域页面归型、`structure`/显式 `full` 捕获、离线多页链接，以及基于可见证据的产品结构、
数据模型、后端需求和设计系统假设。它是固定版本、哈希校验的被动源码参考，不会安装或
执行 Open Lovable，也不会把推断文档冒充真实后端。

```bash
node skill/scripts/init-website-clone.cjs \
  --change-id clone-example \
  --url https://example.com \
  --reference-url https://reference.example \
  --protected-invariant "component topology" \
  --interaction-environment actual-browser \
  --fidelity exact

# 验证基础
node skill/scripts/check-website-clone-foundations.cjs \
  --change-root openspec/changes/clone-example --json

# 评估保真度
node skill/scripts/evaluate-website-clone.cjs \
  --change-root openspec/changes/clone-example \
  --evidence openspec/changes/clone-example/verification-input.json
```

- `--url` identifies a primary surface that the implementation must match.
- `--reference-url` supplies mapped design or interaction references without becoming an automatic pixel baseline.
- The deterministic lexicographically first primary URL is the default implementation authority; set `--authority-url` explicitly for multi-primary runs, and use repeatable `--allowed-difference`/`--protected-invariant` plus `--interaction-environment actual-browser` when a user-visible browser replay is required.
- If a reference intentionally replaces primary behavior, use `adaptive` and record the mapping; the result is fidelity to a mixed contract, not global 1:1.
- Exact runs require negotiated Browser, Builder, and Evidence ports. Each port records the selected adapter, actual capabilities, and its latest probe result.
- Missing ports, authority contracts, invariant measurements, replay provenance, or the required interaction environment produce `blocked`; complete evidence that violates an invariant, allowed-difference list, or threshold produces `fidelity-limited`.
- Only the evaluator can mark `website-cloning.json` complete, and only after all required capabilities and measurements pass. The overall change remains `needs-review` until the normal accessibility, motion, responsive, engineering, and headless gates also pass.
- Verification is per declared viewport and per reference mapping, so an aggregate score cannot hide one broken breakpoint or interaction state.
- Exact and adaptive runs both require ready project DESIGN/MOTION foundations and a ready palette
  foundation for every target. Adaptive mode may change the mapping contract, but it cannot bypass
  these gates.

### 图形与游戏运行时

按能力合同路由，不按库偏好。支持：

- **数据可视化**：XY（Python、Reflex、Notebook、静态导出与大数据交互）
- **2D 渲染**：PixiJS v8（精灵、粒子、滤镜、着色器）
- **2D 游戏**：Phaser v4（完整浏览器游戏运行时）
- **3D 渲染**：Three.js、React Three Fiber
- **3D 引擎**：Babylon.js、PlayCanvas
- **GPU/着色器**：WebGPU/WGSL

持久空间工作添加 `scene.json` 和 `scene.md` 投影，记录坐标、生命周期、资产、性能预算。

### 统一前端工具链

`toolchain resolve` 将框架、样式、组件库、外部工具和图形运行时合并成一份可执行计划。
管线只负责选择、探测、调用描述和验收契约；依赖仍由目标项目安装和固定版本。

先用原始用户 query 生成 Stage 0 计划，再从实际计划复制绑定字段；不要手填假哈希或把视频改写为页面。
旧的无绑定请求和没有 deliverableForm 的计划必须重新生成，没有兼容旁路。

```bash
node skill/scripts/designer-pipeline.cjs route --root . \
  --query "Reflex analytics page with an XY chart" --write --output job-plan.json --json
```

用 Node.js 从计划生成 toolchain-request.json：

```javascript
const fs = require("node:fs");
const plan = JSON.parse(fs.readFileSync("job-plan.json", "utf8"));
fs.writeFileSync("toolchain-request.json", JSON.stringify({
  schema: "design-pipeline.toolchain-request.v1",
  framework: "reflex",
  brief: plan.query,
  jobId: plan.jobId,
  jobPlanSha256: plan.planSha256,
  jobPlanPath: "job-plan.json",
  deliverableForm: plan.deliverableForm,
  requested: { styling: "tailwindcss", uiLibrary: "none" },
  graphics: { family: "vector-data" }
}, null, 2));
```

resolve 和 probe 都会拒绝缺失/部分绑定、计划读取失败、哈希漂移和交付形态冲突。
执行请求继续携带 toolchain plan 中的同一 jobPlanSha256。

```bash
node skill/scripts/designer-pipeline.cjs toolchain resolve \
  --root . --artifact toolchain-request.json --write --output toolchain-plan.json --json

node skill/scripts/designer-pipeline.cjs toolchain probe \
  --root . --artifact toolchain-request.json --json

node skill/scripts/designer-pipeline.cjs toolchain receipt-check \
  --root . --artifact toolchain-plan.json --receipt evidence/toolchain-receipt.json \
  --evidence-root evidence --require-files --json
```

`resolve` 不执行安装；`probe` 只运行注册表内置的只读可用性检查。完整调用必须留下
`design-pipeline.toolchain-receipt.v1`，绑定计划哈希、实际版本、命令、退出码、产物和哈希。

工具链就绪后，执行目标路由只选择并准备目标，不代替 Builder。请求绑定工具链计划哈希，
并为每个执行片声明 owner 与文件范围：

```json
{
  "schema": "design-pipeline.execution-request.v1",
  "id": "react-settings",
  "toolchainPlanSha256": "<64-hex>",
  "preferredMode": "auto",
  "isolation": "optional",
  "slices": [{ "id": "ui", "owner": "frontend", "scope": ["src/"] }]
}
```

```bash
node skill/scripts/designer-pipeline.cjs execution route --root . \
  --artifact .design-pipeline/execution-request.json --plan .design-pipeline/toolchain-plan.json \
  --write --output .design-pipeline/execution-plan.json --json

node skill/scripts/designer-pipeline.cjs execution prepare --root . \
  --artifact .design-pipeline/execution-plan.json \
  --write --output .design-pipeline/execution-state.json --json

node skill/scripts/designer-pipeline.cjs execution finalize --root . \
  --artifact .design-pipeline/execution-plan.json --state .design-pipeline/execution-state.json \
  --outcome .design-pipeline/execution-outcome.json \
  --write --output .design-pipeline/execution-receipt.json --json
```

`auto` 对单执行片使用 `in-place`，多执行片使用 `sequential`；要求隔离或仓库已脏时使用
`worktree`。worktree 只有在成功、已提交、干净且变更未越界时才移除；失败或不确定状态保留现场。

### 反 Slop 审查

将反模板观察内化为结构化 QA，不是全局口味法则。硬质量失败阻止，上下文发现需要设计推理。

```bash
node skill/scripts/evaluate-anti-slop.cjs \
  --root . \
  --evidence design/changes/example/anti-slop-evidence.json \
  --json
```

### 统一 CLI

`designer-pipeline.cjs` 是稳定生命周期门面：

```bash
node skill/scripts/designer-pipeline.cjs doctor --root . --json
node skill/scripts/designer-pipeline.cjs route --root . --query "clone this landing page" --json
node skill/scripts/designer-pipeline.cjs toolchain resolve --root . --artifact toolchain-request.json --json
node skill/scripts/designer-pipeline.cjs status --root . --change-root openspec/changes/example --json
node skill/scripts/designer-pipeline.cjs playground check --root . --change-root openspec/changes/example --stage integration --json
node skill/scripts/designer-pipeline.cjs adaptation check --root . --json
node skill/scripts/designer-pipeline.cjs scene check --root . --change-root openspec/changes/example --json
```

退出码：`0` 成功，`1` 无效输入，`2` 被阻止或验证失败，`3` 实测保真度不匹配。

## OpenSpec 对齐

长期行为位于 `openspec/specs/`。进行中的更改位于 `openspec/changes/<change-id>/`：

```text
proposal.md      # 提案意图
design.md        # 技术/设计方法
motion.md        # 动效特定设计规范
tasks.md         # 实现清单
qa.md            # 验证证据
scene.json       # 机器场景合同
scene.md         # 可读投影
state.json       # CAS 保护状态
events.jsonl     # 仅追加历史
handoff.md       # 可读恢复说明
```

## 仓库布局

项目 [DESIGN.md](DESIGN.md) 遵循 [Google DESIGN.md 格式](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)；工程决策与验收记录归入 OpenSpec 变更。完整导航见[文档索引](docs/README.md)。

```text
DESIGN.md              # 项目视觉语言
MOTION.md              # 项目动效语言
package.json           # 维护命令与 npm workspaces
package-lock.json      # 维护依赖的唯一锁文件
skill/
  SKILL.md
  references/          # 按需方法、工作流，以及保持兼容路径的 schema/目录数据
  scripts/             # 检查、初始化、评估脚本
  tools/               # 按需使用的绘图与诊断工具
  vendor/              # 带版本、许可和哈希的上游源码；不作为自动加载的指令
openspec/
  config.yaml          # OpenSpec 项目上下文与各产物规则
  specs/               # 长期行为规格
  changes/             # 进行中的更改
docs/                  # 指南、术语、研究；旧稿归入 archive/
scripts/               # 仓库 QA、安装与打包
tests/                 # 程序与合同回归；不代表审美验收
evals/                 # 比较实际作品的评测与案例
.design-pipeline/      # 本机生成证据与临时输出，不入库
```

### 仓库维护工具链

根目录 `package.json` 和 `package-lock.json` 是 Node.js 22.12+ 的 private npm workspace，统一管理
OpenSpec、`evals/cases` 与 `tools/browser-automation` 的维护依赖，不随 skill 打包，也不会给使用 skill
的目标项目加依赖。从仓库根目录统一安装和验证：

```bash
npm ci
npm run browser:install
npm test
npm run deps:check
npm run capabilities:check
npm run sources:check
npm run specs:check
npm run package:skill
```

`npm test` 包装仓库 QA 与浏览器工具 self-test。QA 从忽略的 `.env.local` 读取 `BLENDER_PATH`
（外部环境变量优先），并把共享浏览器解析器找到的 Chrome 传给隔离 QA；本机路径只写在该
文件，例如 `BLENDER_PATH=<path-to-blender.exe>`，不要提交真实机器路径。`browser:install` 准备
Playwright Chromium 与 HyperFrames browser。

`capabilities:check` 审核已有 source-evidence，没有证据会保留 `UNKNOWN`，不会联网刷新能力。
`sources:check` 校验锁定的来源快照；来源导入需明确选择 revision 和本地 checkout，不能通过重算
manifest 哈希伪造更新。当前运行时固定 GSAP 3.15.0、HyperFrames 0.8.137、Playwright 1.63.0；
pixelmatch 已升级到 8.0.0，新比较报告记录版本、OKLab/HyAB 算法与实际选项；旧数值与新算法之间
需重新校准，旧黄金 HTML 和视频不因工具链刷新而重写或重新审批。命令清单以根
`package.json` 为准；OpenSpec CLI 也由 workspace 固定，通过 `npm exec -- openspec ...` 调用。
完整维护流程见 [贡献指南](CONTRIBUTING.md)。

## 反馈和贡献

记录管线或 companion 发现：

```bash
node ~/.codex/skills/design-pipeline/scripts/record-feedback.cjs \
  --kind capability-gap \
  --source runtime \
  --skill animejs \
  --title "Anime.js companion lacks adapter guidance" \
  --summary "The requested Three.js target is supported upstream but missing."
```

重复发现共享确定性观察并递增计数。敏感信息在写入前脱敏。

## 最小可行运行

即使没有安装可选 companion skill：

```bash
node skill/scripts/check-deps.cjs
```

命令应返回 `OK`。缺失可选 skill 报告 `WARN` 并带回退。

## 发布标准

发布前对照验证：

- `CHANGELOG.md`
- `skill/references/open-source-readiness.md`
- `skill/references/qa-checklist.md`
- `openspec/specs/design-pipeline/spec.md`

## 同生态项目

- [repowise](https://github.com/2233admin/repowise) — AI Agent 的代码库智能层
- [performance-patterns-skill](https://github.com/2233admin/performance-patterns-skill) — 性能问题先路由再排查
- [markdown-memory](https://github.com/2233admin/markdown-memory) — 文件驱动的 AI 记忆桥
- [gc-minimal-zine-poster](https://github.com/LiamGvchi/gc-minimal-zine-poster) — 极简 zine 海报生成与参考分析 Skill
- [gc-still-image-motion-director](https://github.com/LiamGvchi/gc-still-image-motion-director) — 静态图片动效判断与 Prompt 约束 Skill

## License

MIT
