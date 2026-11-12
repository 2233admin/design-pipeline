# 功能详解

README 只列能做什么；这里是每项能力的说明与命令。所有命令也可以用 `designer-pipeline --help` 查看。

## 内置方法

CSS 写作和审查内置 [Good CSS](../skill/references/good-css.md)：完整保留已审核上游的 47 个实践、8 类指南和全部示例素材，逐项说明项目适配与验证条件。[离线示例工具](../skill/tools/good-css/README.md) 只需 Node.js，不依赖额外安装的 skill。

视觉设计内置 [tasteskill v2.1.5](../skill/references/taste-skill.md)：新网站、旧站改造、应用界面（仪表盘、后台、设置）和成品评审四条路线，完整原文随工具发布，无需另装 Taste 技能。附带的 `draw.mjs`、`inspect.mjs`、`lint.mjs`、`assets.mjs` 可由 Agent 在目标项目中按需运行；其中关于审美的检查结果只作参考，不是本流程的门禁。经典风格与生图技能已移出上游，不再随包发布。

设计方向参考库（[design-direction-library](../skill/references/design-direction-library.md)）收录已审核的 MIT 上游：84 种风格库、84 张 HTML 样张、三方向方法、品牌资产协议、评审指南和内容准则。文本与 HTML 随包发布，样张图片、音频等二进制按需用 `designer-pipeline sources fetch --bundle design-direction-library` 下载并逐文件校验 SHA-256；上游脚本只作只读参考，从不执行。它只是参考资料，不改变任何流程或门禁，后续由 #154 #155 #156 #157 逐项接入。

品牌设计系统目录（[design-md](../skill/references/design-md.md)）收录 198 个「受真实产品与风格启发」的设计系统：`nexu-io/open-design`（Apache-2.0，152 个）与 `feimacode/open-design-agent-kit`（MIT，46 个，另含对 57 个 open-design 系统的修正）。每个系统有 DESIGN.md、统一 token 结构的 `tokens.css`，多数还有组件样张与 token 报告。包里只带清单和许可证，系统本身用 `designer-pipeline sources fetch --bundle brand-design-systems` 按需下载（9.3 MB，逐文件校验 SHA-256）；之后 `designmd search` 会同时返回这些系统的名称、类别、配色签名和可读路径，`designmd inspect` 给出规整成 Google DESIGN.md front matter 的 token，方便横向比较。它们只作学习参考，绝不当作产品的 DESIGN.md。

界面打磨由项目自己的 [UI 工艺规则](../skill/references/ui-craft-sources.md) 负责：`verify interaction` 的页面审计在渲染后的页面上实测字号、对比度、横向溢出、文字裁切、控件尺寸与间距、对齐、嵌套圆角和动效属性（`transition: all`、给布局属性做动画、无限循环的模糊、屏幕外还在跑的循环动画），网页工作流的 `probe` 阶段必须通过；量不出来的规则（动效手感、焦点与键盘、语义与表单、文案、各种状态）由 `UC-` 编号的复查清单检查。两者结果都记为组件一致性证据，不算视觉验收。规则来源是 emil-design-eng、make-interfaces-feel-better、fixing-accessibility、shadcn 和 playwright-cli 这 5 个锁定版本的只读快照，以及改写自 lintapple 的测量逻辑；需要原文时才读对应来源，项目规则和流水线门禁优先。shadcn、playwright-cli 和 React Doctor（仅引用、不打包）只在项目已在用它们或经你同意时运行，结果只作 QA 参考，不算组件一致性结论或视觉验收。

影片任务内置 [Cinetic 与 Product Film 方法](../skill/references/film-methods.md)：完整锁定来源、真实品牌与组件复用、显式技法选择和可配置帧率的动效实现，沿用既有 HyperFrames 与影片验证。[Prompt Motion 模板库](../skill/references/prompt-motion/README.md)支持离线检索案例与配方，保留替换输入、结构规则、来源及观察限制；[维护指南](prompt-motion-template-maintenance.md)说明候选更新、重复和下架处理。普通 UI/CSS 任务仍按原流程执行。

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

### 对象级 captured runtime review

`runtime-review` 把已选择 Playground prompt、声明源码集与外部 captured observation
绑定成离线对象页；它不是 live client，也不会替代现有 Component Conformance / Visual Acceptance。
页面提供 source/token/evidence、actual/expected/acceptance、复制开发 prompt 和导出对象反馈。

```bash
node skill/scripts/designer-pipeline.cjs runtime-review build --root ../my-project --change-root openspec/changes/example --manifest review-input.json --json
node skill/scripts/designer-pipeline.cjs runtime-review check --root ../my-project --change-root openspec/changes/example --artifact runtime-review/example/review.json --json
node skill/scripts/designer-pipeline.cjs runtime-review record --root ../my-project --change-root openspec/changes/example --artifact runtime-review/example/review.json --observation object-feedback.json --json
node skill/scripts/designer-pipeline.cjs runtime-review --help
```

`--root` 默认 cwd；changeRoot 必须是 root 内既存目录。manifest/artifact/observation 都相对
changeRoot，record 的 observation 是页面导出的反馈，不是运行 capture。必须显式指定 action；
公共 `--help/-h` 可查用法。重复、未知或跨 action 参数会拒绝，没有 `--write`、`--replace`
或公开的时间注入参数。build 生成 `runtime-review/<manifest.id>/review.json` 与 `index.html`，
已有目录不覆盖；上例 manifest 的 id 为 example。输入字段见
[运行 review 合同](../skill/references/runtime-review.md) 与对应的两份 schema。

页面默认未核验当前磁盘。将 public check `--json` 的完整 stdout 自行保存，再以本地文件导入；
要求同 Bundle/identity tuple、`design-pipeline.cli-result.v1`、`ok:true` 和顶层 `context`，
不接受裸 Projection。built/matched/recorded 退出 0，stale/blocked 退出 2，无效输入退出 1；
`ok:true` 的 stale/blocked 不是验收通过。check 只读且仅覆盖 checkedAt 时点的声明文件集，
hash 匹配不证明运行进程使用当前磁盘、也不认证 producer；“声明数据模式”即使为 live，观察仍是 captured。

record 仅保存 `runtime-review/feedback/<feedbackHash>.json` 的本地 Record，不标 resolved/pass，
不写 target、ledger 或 receipts，不调用 pipeline issue feedback recorder。开发者先读同条 Record/Bundle
并 check；不匹配先 refresh/rebind，再修改授权 target、重新采集、build/check 并走原核验。
三身份 design/sourceSet/observation、target/snapshot/policy 和原 receipt lineage 保持独立；新 hash
不等于问题解决。真实私有内容留在外部 workspace/changeRoot，不提交本工具 repo 的 docs/fixtures。
页面不联网、自动执行或发布。


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

### Component-first 一致性检查

`component-first` 把明确的 target、stack 决定、组件 resolution/verification、组件声明、Playground、
页面使用和截图证据组合成一次只读一致性检查，结果是一份 receipt 链 artifact：target、snapshot、
policy 与 stack → components / playground → page → evidence 五个阶段的 receipt 互相绑定，上游变化会让
下游变成 stale。它不会启动浏览器、运行目标项目或安装依赖。

```bash
# 评估请求并输出 receipt 链；0=passed，1=invalid，2=blocked
node skill/scripts/designer-pipeline.cjs component-first check \
  --root ../my-project --artifact component-first.json --write --output component-first-receipts.json --json

# 只跑一个阶段
node skill/scripts/designer-pipeline.cjs component-first page --root ../my-project --artifact component-first.json --json

# 复核已有 receipt 链是否仍然有效（target、policy 或上游 receipt 变化会返回 stale）
node skill/scripts/designer-pipeline.cjs component-first verify \
  --root ../my-project --artifact component-first-receipts.json --json
```

项目自有组件使用 `componentOrigin: "project-owned"`，仍需源码、symbol、contract、token、键盘、焦点、
状态、Playground 与页面实际使用证据。`page-ready` 同时声明 `scope: prototype | production`，prototype
证据不能满足 production target。截图必须是能完整解码且字节 hash 匹配的 PNG。hash 绑定只能发现
artifact 不匹配、过期或串用，不能证明 receipt 没有被伪造。

原型选择与上线分两步：`component-first select` 记录用户选中的原型，`component-first promote --approve`
在组件一致性通过后生成上线 handoff；视觉验收（Visual Acceptance）始终单独记录。

### Design Skill 与设计系统来源路由

```bash
node skill/scripts/designer-pipeline.cjs design-skill route --root . --query "make three prototype directions" --json
node skill/scripts/designer-pipeline.cjs design-skill manifest --root . --skill design.prototype --json
```

`design.prototype` 先消费并验证 `design-pipeline.direction-preview.v1`，只把通过 preview gate 的候选
复制到隔离 prototype；production promotion 只生成显式 handoff，不会直接写入目标项目。

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

# Animate UI：点名来源时返回它的包、安装命令和每个组件的 import
node skill/scripts/designer-pipeline.cjs design-system route \
  --query "animate-ui dialog and sliding number" --platform web --json
```

当前内置的是这些来源元数据：Beautiful UI、`expo-content-transition`、React Bits 免费 Dither、React Bits Pro app UI、React Bits depth carousel、SmoothUI 130 项组件快照，以及 Web DOM 数字过渡回退。SmoothUI 快照会返回组件名、文档 URL、registry 安装命令、依赖和 reduced-motion 信息；组件源码不在本仓库内，其他来源仍按路由结果做许可审查。

Animate UI（`imskyleen/animate-ui`，MIT + Commons Clause）登记为 `animate-ui/components`：99 个条目，包含 Radix UI、Base UI、React Aria 的 drop-in 动效基元、它自带的进场、文字、数字、按钮和指针效果基元，以及从 shadcn registry 安装的背景、按钮、页面转场和动效图标。简报里点名 `animate-ui` 时路由选中它；没点名时原有路由不变，它列在备选里。用法见 `skill/references/animate-ui.md`：shadcn/ui 组件跑上游 CLI，手写组件换 import，和现有组件共存要去掉哪些 CSS 动画类，以及 reduced motion。中文关键词也能搜到，例如 `design-system search --snapshot references/component-source-catalog.json --query "页面转场"`。

### 网站克隆

捕获参考证据，从完整组件合同构建，独立比较结果后才声称保真度。

给出参考页面或截图时，用 `next --deliverable web|ui --mode replicate` 进入：先把参考提取成
`DESIGN.md`、`MOTION.md`（standard/full 另加设计系统包），`next` 自己跑参考检查与基础检查，
再由 owner 确认“借用什么、不借用什么”，之后才建设；确认绑定这些文件的哈希，事后改动会重新
询问。网页项目带有 `website-cloning.json` 时，探测与交付还要求保真评估结果为 `complete`。

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

### 模板库与风格包

模板是带参数的 SVG 版式：KV、视频封面、卡片、活动横幅、UI 面板和字幕卡快切。每个模板有槽位（带字数和行数预算）、在实测范围内可调的参数、配色角色和出处。模板属于风格包；风格包把字体角色、版式语法、素材、动效节奏和检查规则放在一起。现有 14 个风格包、68 个模板：

| 来源 | 风格包（模板数） |
| --- | --- |
| 游戏官网与世界观语法，各配一个原创案例：官网多屏、390 宽手机页、游戏内界面、`?slot=1` 占位模式和出图任务单 | `street-tape`（6，《回放街区》）、`lattice-dossier`（5，《雾航信标》）、`frontier-survey`（5，《远垦导线》）、`celestial-voyage`（4，《长庚航志》）、`megastructure-ink`（5，《穹井》）、`crisis-command`（5，《潮位警报》） |
| README 的六个游戏案例 | `cyanotype-specimen`（2，卡牌）、`xerox-flyer`（3，电竞直播）、`cassandre-litho`（7，Steam 素材）、`citypop-sleeve`（3，抽卡活动）、`acid-print-hud`（1，HUD）、`woodblock-pixel`（2，像素 RPG） |
| 早期研究 | `shinbo`（11，来自《夜想回廊》实验）、`arknights-endfield`（9，从官方宣传图的版式研究里量出来，只作参考，不附带任何图片、描摹、logo 或官方文字） |

新风格包都量自参考截图或实测（参考只留在本地，不进仓库），只带走数字和规则：借语法，不借素材。展示模式一律不放角色，也不用代码画假插画；角色和场景按任务单交给生图模型，再用下面的「生成角色与合成」放进模板。槽位有字符规则（例如页码只收数字、日期只收指定格式），不合规时退出码 1 并给修法。

```bash
node skill/scripts/designer-pipeline.cjs template list --style shinbo
node skill/scripts/designer-pipeline.cjs template render card.onechar-bleed --set char=夜 -o out.svg --png out.png
node skill/scripts/designer-pipeline.cjs template check page.html --browser --size 1920x1080
```

`render` 写出文件后马上检查：文字放不放得下、最小字号、对比度、主体区与裁切区、强调色面积、对齐线。`check --browser` 也能查手写的 SVG 和 HTML：按墨迹算文字重叠、出画、拼贴压字、隐藏文字后看底图算对比度、被遮挡、资源缺失和缺字。每条发现都带修法；退出码 0 通过，2 未通过，需要浏览器却没有浏览器时是 1（`TOOL_MISSING`），不会当作通过。

组件库示例：三套 design-system 包加静态页面模板，结构与 `design-system check`、`foundation check` 一致，页面和预览由各自的 `build/build.cjs` 从同一份组件标记生成（`--check` 报漂移），每个美术位都有出图任务单。

- [`examples/archive-terminal-wiki-kit/`](../examples/archive-terminal-wiki-kit/)：游戏资料站 wiki，亮暗两套主题、22 个组件、七个页面模板（首页、条目、带筛选的列表、物品、活动文章、最近更改、搜索），390 宽可用，键盘操作 47 项通过。
- [`examples/megastructure-ink-kit/`](../examples/megastructure-ink-kit/)：巨构墨线，26 个组件、七屏官网、下潜 HUD、测绘终端，主视觉和立绘带图层契约。
- [`examples/crisis-command-ui-kit/`](../examples/crisis-command-ui-kit/)：危机指挥终端，26 个组件、六屏组织终端站、操作台和同步监视，附 OFL 字体子集。

模板是起点，不是成品：没有合适的模板时不要硬套，手写版式后照样用 `template check` 检查。README 里的卡牌、HUD、Steam 案例就是这样做的。说明见 [模板库指南](../skill/references/template-bank.md)。

### 参考蒸馏

```bash
node skill/scripts/designer-pipeline.cjs template distill provenance.csv --images refs/ -o out/ [--annotations labels.csv] [--compare <style-id>] [--ablate]
```

读一组参考图（只读本地文件，从不复制），不用模型，量出 OKLab 配色、底色彩度与明度、主色和中性色占比、色相离散、重心、对称、留白和纹理；给了标注时再量标题位置、边距、字号比和标题压主体的程度。每个特征用参考的分布定阈值（上限取 p75、下限取 p25），并标出证据是 `measured`、`thin` 还是 `gap`。输出 `style.json` 草稿（`draft: true`）、`distill.json` 和一页 `report.md`，把版式归成原型并指向最近的模板或新骨架，按笔画对比判断字体角色。`--compare` 和手写风格包逐条对比，`--ablate` 去掉每条规则各渲染一次，报告成对的变化。

### 字体目录

```bash
node skill/scripts/designer-pipeline.cjs fonts query --text-file copy.txt --style mincho --weight 700
node skill/scripts/designer-pipeline.cjs fonts measure --path fonts/ --text "要检查的文案"
```

`fonts query` 只返回字形表覆盖全部文案的字体；差几个字的列为候选，并写出缺哪几个字；一个都没有时退出码 2（`font-coverage-none`）。目录收了 98 个家族、169 个文件（Google Fonts 里全部 97 个中日文家族加霞鹜文楷），每个都记录通用规范汉字表、GB 2312、JIS 第一水准、Big5 常用字和拉丁字母的覆盖、字重、风格（明朝、黑体、楷体、圆体、展示、手写、等宽）、笔画对比，以及许可（能否商用、嵌入、修改，保留字体名）和钉住的上游提交。`fonts measure` 量你自己的 TTF、OTF、TTC、WOFF 文件。

### 素材来源与自制素材

```bash
node skill/scripts/designer-pipeline.cjs materials search --query "key,pocket watch,butterfly" --source met
node skill/scripts/designer-pipeline.cjs materials fetch --project-root . --source cleveland --id <object id> --name <stem>
node skill/scripts/designer-pipeline.cjs materials cut --project-root . --file materials/raw/<stem>.png --mode paper --finish sticker,ink
node skill/scripts/designer-pipeline.cjs materials generate --project-root . --generator paper --seed 1
node skill/scripts/designer-pipeline.cjs materials request --project-root . --template kv.tape-hero
node skill/scripts/designer-pipeline.cjs materials composite --project-root . --template kv.tape-hero --set char=materials/cut/<stem>.png --set bg=<...> --set ghost=<...> --set mid=<...>   # 角色、底板和摆放到的图层都要给
node skill/scripts/designer-pipeline.cjs materials check --project-root .
```

- **取图**：`search` / `fetch` 只下载 CC0 和公有领域的记录，其他许可连同证据一起拒绝。克利夫兰、大都会、Rijksmuseum 可以自动查和取；Wikimedia Commons 按确切的 `File:` 名取；需要密钥或被拦截的来源会说明原因和替代做法（`materials sources`、`probe` 重新测可达性）。你自己的字体、扫描和照片用 `materials add` 登记。
- **切图**：`cut` 把图切成贴纸、墨层（黑色加透明度，即墨色密度）、剪纸白边和手剪版画块，并提示渐变背景、碰到画框的物件和可能的投影。背景是渐变、暗角或带投影时用 `--mode grabcut`（颜色模型加图割，去溢色边，记录光晕宽度）；`--finish outline` 加贴纸描边（模切白边、黑线、偏移底板）。
- **生成角色与合成**：展示一律无角色；角色由外部生图模型出。`materials request --template kv.tape-hero` 按模板的图层契约写出图任务单（不低于槽位 2 倍、透明或纯色底、光向和轮廓光、色板、参考名、不写字、只要原创角色）；`materials add --kind generated --tool <工具> --prompt <任务单> --landmarks '{"foot":[x,y],"headTop":y,"face":[...],"hands":[[...]]}'` 登记生成图（不给脸和手的框时，合成只报警告、不查这两处安全区；也可以在 `composite --params` 里给）；`materials composite` 用 `--set` 给齐图层契约里的角色、底板和各尺寸摆放到的图层（纸纹和网点这类材质层可省，缺必需层就报错），用同一套图层出模板声明的每个尺寸（OKLab 调色、光包裹、轮廓光、阴影、贴纸描边、前景遮挡、统一材质），量放大倍数（超过 1.5 倍失败）、黑场差、均值色差和光晕（警告）以及脸手安全区（失败），写出 `composite.json` 收据（输出哈希和可重放的命令）；输入、图层契约或风格包的融入参数一变，`check` 把成品标为过期。任务单和生成图的对应是自报的，同人检测只是关键词启发，最终由你看图把关。
- **自制**：`generate` 用固定种子生成纸纹、网点、油墨平涂、建筑线稿（走廊、拱廊、楼梯、窗墙、棋盘地）和纹样，`process` 把任何已登记的图做成木刻、网点、剪纸、复印或双色效果；同一记录可以原样重放。`measure` 把纹理和真实扫描的校准档比较，量它像不像真的。
- **账目**：所有文件的出处、许可、作者、取用日期、哈希和派生关系写在 `materials/licenses.json`；`check` 拒绝没有记录的文件、出处不全的记录，以及来源已经变了的切图和派生图。采集纸张和网点扫描的方法见 [`material-capture.md`](../skill/references/material-capture.md)。

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
  "toolchainPlanSha256": "<toolchain-plan.json 的 canonical JSON SHA256，64 位小写十六进制>",
  "jobPlanSha256": "<与 toolchain-request 完全相同的 jobPlanSha256>",
  "routeId": "<toolchain-plan.json 的 primaryRouteId>",
  "preferredMode": "auto",
  "isolation": "optional",
  "slices": [{ "id": "ui", "owner": "<同一个 primaryRouteId>", "scope": ["src/"] }]
}
```

绑定字段必须从前面步骤的实际产物复制，不要手写常量：

- `toolchainPlanSha256` 是**解析后**的 toolchain-plan.json 规范 JSON 的 SHA256，不是该文件原始
  字节的哈希：`sha256(canonicalJson(JSON.parse(raw)))`，即按 JSON 解析后再做键排序、2 空格缩进
  并追加换行后计算。
- `jobPlanSha256` 从上面的 toolchain-request.json（`plan.planSha256`）原样复制，与 toolchain plan
  中携带的值必须一致；执行请求与 toolchain plan 缺一即失败。
- `routeId` 取 `toolchain-plan.json` 的 `primaryRouteId`；每个执行片的 `owner` 必须等于同一个
  `primaryRouteId`，否则该路由无权执行。存在 primary route 时 `routeId` 必填。

```bash
node skill/scripts/designer-pipeline.cjs execution route --root . \
  --artifact .design-pipeline/execution-request.json --plan toolchain-plan.json \
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
