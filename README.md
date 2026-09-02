# design-pipeline

> 用 AI 做前端 UI，但不跳过设计工作。

![License](https://img.shields.io/badge/license-MIT-blue)
![Stars](https://img.shields.io/github/stars/2233admin/design-pipeline)
![Last Commit](https://img.shields.io/github/last-commit/2233admin/design-pipeline)
![Node](https://img.shields.io/badge/Node-22+-339933)

- **一句话**：给 AI Agent 用的前端设计管线，先写设计再写代码。
- **适合谁**：你用 AI 做前端 UI，但不想让它每次靠猜做设计决策。
- **不适合谁**：只要快速原型、不想写任何设计文档的。

<p align="center">
  <b>先画图纸，再动工。先写设计，再写代码。</b>
</p>

<p align="center">
  <code>DESIGN.md</code> + <code>MOTION.md</code> + <code>OpenSpec</code> + <code>门禁系统</code>
  <br>
  一条给 AI Agent 用的前端设计管线。
</p>

---

## 这是什么

`design-pipeline` 是一套给 AI coding agent 用的前端设计工作流。

它解决的是一个很具体的问题：Agent 拿到需求以后，经常跳过设计，直接生成代码。界面能跑，但缺乏一致性。下次改动，样式散落各处，动效各自为政，维护变成考古。

所以它做五件事：

1. 用 `designer-pipeline route` 把需求分成一个主任务，再打开对应知识目录。
2. 在写代码之前，先创建 `DESIGN.md` 和 `MOTION.md`。
3. 用 OpenSpec 风格的提案 → 实现 → 验证 → 归档生命周期管理变更。
4. 支持网站克隆、设计系统合成、动效设计，每一步都有证据。
5. 通过门禁系统确保设计质量，不达标就拦住。

当前 `0.10.0` 正式版不是单一图表工具集成。它把下面这些能力放进同一个可打包、
可安装、可验证的前端工具架：

- 需求、`DESIGN.md`、`MOTION.md` 与 OpenSpec 变更生命周期；
- 前端框架、样式、15 个 UI 库、组件来源和 127 项设计技能索引的统一选择；
- 网站克隆、方向预览、中文排版、设计系统、动效、组件状态和浏览器证据门禁；
- DOM、SVG/D3、XY、PixiJS、Phaser、Three.js、Babylon.js、PlayCanvas、WebGPU 等图形路线；
- 工具环境探测、哈希绑定的调用计划、标准化 receipt、打包和隔离安装验收。

目录中的工具不等于已经安装。管线负责选择、探测和验收；目标项目仍然负责固定并安装
实际运行时。`reflex-xy` 是目前第一个具备完整生命周期合同的外部图形适配器，不代表
系统只支持 XY。

有个很小的故事。

你让 Agent 做一个设置页面。它看了一眼需求，十秒后交出代码。能跑，但按钮圆角是 4px 还是 8px？悬停态有没有过渡？暗色模式对比度够吗？没人知道。下次再改，Agent 又猜了一遍，猜得不一样。

好的工具不急着替你表演聪明。它先让沉默的决策变得可见。

design-pipeline 坐在需求与代码之间，不紧不慢。它把用户场景写成设计合同，把动效原则写成时序规范，把组件边界画成能力地图。等图纸亮起来，Agent 才知道哪里能走，哪里别碰，第一行代码该落在哪。

- `DESIGN.md` 记录视觉系统：色彩、字体、间距、组件架构。
- `MOTION.md` 记录动效语言：时序、缓动、编排、减弱动效行为。
- `OpenSpec` 管理生命周期：提案、实现、验证、归档，每一步可追溯。
- 门禁系统拦截不合格的设计：没有证据，不许动工。

## 适合谁

适合这些场景：

- 你用 AI Agent 做前端 UI，但不想每次都靠它猜设计决策。
- 你要做可维护的界面，不是一次性的生成屏幕。
- 你需要网站克隆，但要求像素级保真，不是大概像。
- 你想让动效有设计语言，不是随机加动画。
- 你管理多个项目，需要一致的设计工作流。

不适合这些场景：

- 只要快速原型，不关心长期维护。
- 希望工具自动替你做完所有设计决策。
- 不想写文档，只想直接生成代码。

这套系统的边界很清楚：它负责把设计决策显性化、可追溯、可验证。真正做设计判断，还是人和 Agent 一起做。

## 一分钟上手

需要 Node.js 22 或更新版本。

```bash
# 安装到本地 skill 目录
node scripts/install-local.cjs \
  --source skill \
  --root ~/.codex/skills \
  --target ~/.codex/skills/design-pipeline

# 检查环境
node ~/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs doctor --root .
```

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

```json
{
  "schema": "design-pipeline.toolchain-request.v1",
  "framework": "reflex",
  "brief": "Reflex analytics page with an XY chart",
  "requested": { "styling": "tailwindcss", "uiLibrary": "none" },
  "graphics": { "family": "vector-data" }
}
```

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

```text
skill/
  SKILL.md
  references/          # 设计规范、schema、路由目录
  scripts/             # 检查、初始化、评估脚本
openspec/
  project.md
  specs/               # 长期行为规格
  changes/             # 进行中的更改
docs/
scripts/
```

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
