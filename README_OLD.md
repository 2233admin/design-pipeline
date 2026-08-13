# design-pipeline

用 AI 做前端 UI，但不跳过设计工作。

## 这个项目是干嘛的

你给 `design-pipeline` 一个产品想法、一个现有仓库，或者一个参考网站。它会帮 AI coding agent 决定界面应该长什么样、怎么动，把这些决定写进 `DESIGN.md` 和 `MOTION.md`，然后构建 UI，最后检查结果才算完。

什么时候用它：当你想要**可重复的设计工作**，而不是一次性的生成屏幕。它可以协调设计、动效、前端、浏览器证据和 QA 工具，但不会在你没明确同意的情况下安装可选框架或发布更改。

底层走 OpenSpec 风格的提案、实现、验证、归档生命周期，这样另一个 agent 或开发者以后能接着干。

## 核心功能

- 在写代码之前先创建持久的设计产物
- 每个实现运行都必须有验证过的项目 `DESIGN.md` 作为基础
- 必须有验证过的项目 `MOTION.md`，包括明确声明"静态"姿势（当故意不动效时）
- 从需求、仓库约束和带归属的网站/模板证据合成项目特定的 `DESIGN.md`
- 添加第一-class 动效设计文档
- 支持通过机器可读状态文件进行无头 AI 交接
- 自检可选 companion skill、数据驱动能力配置文件、套件和多根安装
- 把可复用的管线缺口捕获为脱敏、去重的本地 Issue 或 PR 草稿
- 审计上游 companion 证据为 current、stale、changed、untracked 或 unknown
- 通过确定性 Issue/PR 请求和收据桥接显式发布权限
- 把 Anime.js v4.5 路由到布局、文本、SVG、拖拽、滚动、WAAPI、适配器和 Three.js 工作
- 路由官方 PixiJS v8 skill 套件用于正当的交互式 2D 渲染，带显式场景、生命周期、性能、无障碍、减弱动效和回退合同
- 在选库之前先按持久能力族路由图形，带规范 `scene.json` 和人类可读 `scene.md` 投影，覆盖 2D、3D、游戏、GPU、地理空间和持久叙事状态
- 暴露一个稳定的 `designer-pipeline` CLI 用于生命周期状态、证据、动效/组件门禁、token/UI IR、基准、适配器治理、本地反馈和发布诊断
- 为浏览器游戏提供原生 Phaser v4 路由，为 HUD、对话、选择、 backlog、跳过、自动播放、保存/加载、本地化和无障碍提供游戏 UI/Galgame 配置文件
- 与 OpenSpec 的提案 → 应用 → 归档生命周期对齐
- 通过 Browser、Builder 和 Evidence 端口重建授权实时网站，带可测量的保真度门禁
- 在 DOM 和光栅调色板证据、语义角色、关系和实现 token 完成之前，阻止网站克隆实现
- 通过上下文、证据支持的评分卡审查反模板风险，不将可变远程提示安装为全局 agent 指令

## 网站克隆

`design-pipeline` 是网站克隆提示的超集：它捕获参考证据，从完整的组件合同构建，并在声称保真度之前独立比较结果。

```bash
node skill/scripts/init-website-clone.cjs \
  --change-id clone-example \
  --url https://example.com \
  --reference-url https://reference.example \
  --fidelity exact

# 在编写项目 DESIGN.md、项目 MOTION.md 和目标调色板证据之后：
node skill/scripts/check-website-clone-foundations.cjs \
  --change-root openspec/changes/clone-example \
  --json

# 在三个适配器报告了能力且 EvidencePort 已生成 verification-input.json 之后：
node skill/scripts/evaluate-website-clone.cjs \
  --change-root openspec/changes/clone-example \
  --evidence openspec/changes/clone-example/verification-input.json
```

- `--url` 标识实现必须匹配的主要表面。
- `--reference-url` 提供映射的设计或交互参考，不会自动成为像素基线。
- 如果参考故意替换主要行为，使用 `adaptive` 并记录映射；结果是对混合合同的保真度，不是全局 1:1。
- Exact 运行需要协商好的 Browser、Builder 和 Evidence 端口。每个端口记录选定的适配器、实际能力和最新探测结果。
- 缺失端口或测量会产生 `blocked`；完整证据但未达阈值会产生 `fidelity-limited`。
- 只有评估器能将 `website-cloning.json` 标记为完成，且只有在所有必需能力和测量都通过之后。整体更改保持 `needs-review`，直到正常的无障碍、动效、响应式、工程和无头门禁也全部通过。
- 验证按声明的视口和参考映射进行，所以聚合分数不能隐藏一个损坏的断点或交互状态。
- Exact 和 adaptive 运行都需要准备好的项目 DESIGN/MOTION 基础和每个目标的准备好的调色板基础。Adaptive 模式可以改变映射合同，但不能绕过这些门禁。

详见 `skill/references/website-cloning.md`。

## 需求驱动的 DESIGN.md

像 `awesome-design-md` 这样的模板集合是有用的证据库，但它们无法推断目标产品的用户、工作流、约束或组件架构。这个管线用它们作为灵感输入，同时生成新的项目设计合同。

文件是强制的，但内容绝不是强制的模板复制：

```powershell
node skill/scripts/check-design-foundation.cjs --project-root . --json
```

`ready` 解锁实现。`synthesis-required` 路由到下面的初始化器。`invalid` 需要修复或重新合成。

```powershell
node skill/scripts/init-design-synthesis.cjs `
  --change-id create-product-design-system `
  --problem "Design an operations console for support leads handling urgent escalations" `
  --reference-url https://example.com `
  --template "awesome-design-md:linear" `
  --framework nextjs
```

运行流程：

1. 请求 `/grill-with-docs <problem>` 并记录其决策证据；
2. 对照显式预算测量范围；
3. 仅在测量范围过大时请求 `/wayfinder 为此制作一张地图`；
4. 合成并验证项目 `DESIGN.md`；
5. 继续进入 token、组件、实现和正常 design-pipeline QA。

Issue 跟踪器拥有真实的 Wayfinder 地图。捆绑的本地脚本从不伪造一个或远程发布。

详见 `skill/references/design-synthesis.md`。

## 项目 MOTION.md

每个项目都在根目录的 `MOTION.md` 中声明其动效姿势。基础描述动效原则、时序、缓动、编排、交互状态、减弱动效行为、性能预算和源决策。它使用 clean-room 原语词汇，这样 agent 可以推理动效而不复制画廊代码或把一个动画库当作设计语言。

```powershell
node skill/scripts/check-motion-foundation.cjs --project-root . --json
```

`ready` 解锁实现。`synthesis-required` 表示文件缺失。`invalid` 表示基础必须修复。更改级 `motion.md` 文件专门化项目基础并记录其哈希；它们不替换它。

PixiJS 作为可选的 2D 渲染路由可用，不是动画的默认答案。当精灵字段、粒子、滤镜、着色器、画布编辑器或高对象计数证明其合理性时，管线通过官方 `pixijs` skill 套件路由，并要求更改 `motion.md` 加 `scene.md` 命名时间语义、渲染器、场景图、ticker、资产、性能预算、无障碍策略、减弱动效替代和清理。详见 `skill/references/pixijs-rendering.md`。

## 图形、游戏 UI 和场景运行时

稳定的抽象是能力合同，不是最喜欢的库。管线首先将表面分类为语义 UI、数据/矢量图形、2D 编辑器画布、2D 场景渲染器、2D 游戏引擎、3D 渲染器、3D 游戏引擎、地理空间 3D、GPU/着色器工作或叙事游戏 UI。然后保留目标项目已接受的运行时或选择最小的合适适配器。

持久空间或引擎拥有的工作添加规范更改 `scene.json` 和匹配的 `scene.md` 投影。Sidecar 以机器可检查的合同记录坐标、生命周期、资产、输入、UI/无障碍边界、适配器/版本、性能预算、确定性证据、降级和清理。Markdown 文件解释相同的决策，必须与 sidecar 身份和基础哈希匹配。`DESIGN.md` 保持视觉系统，`MOTION.md` 保持可复用的动效语言。

Phaser v4 是完整浏览器 2D 游戏运行时的内置路由。PixiJS 保持专门的 2D 渲染器路由。Three.js 和 React Three Fiber 覆盖聚焦的 3D 渲染；Babylon.js 和 PlayCanvas 覆盖更完整的 3D 引擎需求。数据、地理空间、WebGPU/WGSL 和叙事适配器有目录，但不使每个库成为强制依赖。

官方 Phaser Game Agent MCP 是可选的，因为它是凭据且计量的。未授权的社区 Phaser skill 包仅作为策展候选跟踪，从不自动安装。详见 `skill/references/graphics-runtime-routing.md`、`skill/references/graphics-runtime-catalog.json`、`skill/references/adapter-registry.json`、`skill/references/scene-runtime-spec.md`、`skill/references/phaser-v4.md` 和 `skill/references/game-ui-and-narrative.md`。

## 上下文反 Slop 审查

管线将有用的反模板观察内化为结构化 QA，不是全局口味法则。硬产品质量失败可以阻止。上下文发现需要设计推理。偏好如命名颜色、字体、标点、药丸、渐变或熟悉的布局族保持咨询性。

```powershell
node skill/scripts/evaluate-anti-slop.cjs `
  --root . `
  --evidence design/changes/example/anti-slop-evidence.json `
  --json
```

评估器写入 `.design-pipeline/reviews/anti-slop-review.json`。检索到的源提示按 URL 和内容哈希跟踪，保持惰性证据，从不附加到全局 `CLAUDE.md` 或 `AGENTS.md`。

详见 `skill/references/anti-slop-review.md`。

## 仓库布局

```text
skill/
  SKILL.md
  references/
    companion-capabilities.json
    design-synthesis.md
    design-synthesis.schema.json
    feedback-loop.md
    feedback-observation.schema.json
    upstream-capability-sync.md
    source-evidence.schema.json
    capability-audit.schema.json
    publication-request.schema.json
    publication-receipt.schema.json
    anti-slop-review.md
    anti-slop-rubric.json
    anti-slop-rubric.schema.json
    anti-slop-evidence.schema.json
    anti-slop-review.schema.json
    palette-evidence.schema.json
    motion-foundation.md
    motion-foundation.schema.json
    motion-primitives.json
    graphics-runtime-routing.md
    graphics-runtime-catalog.json
    scene-runtime-spec.md
    phaser-v4.md
    game-ui-and-narrative.md
  scripts/
    check-design-foundation.cjs
    check-motion-foundation.cjs
    check-palette-foundation.cjs
    check-website-clone-foundations.cjs
    init-design-synthesis.cjs
    advance-design-synthesis.cjs
    check-deps.cjs
    record-feedback.cjs
    audit-capabilities.cjs
    prepare-publication.cjs
    reconcile-publication.cjs
    evaluate-anti-slop.cjs
openspec/
  project.md
  specs/
  changes/
docs/
scripts/
```

## 本地安装

需要 Node.js 22 或更新版本。

从本仓库，使用路径包含的安装器：

```bash
node scripts/install-local.cjs --source skill --root ~/.codex/skills --target ~/.codex/skills/design-pipeline
node ~/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs doctor --root .
```

现有目标会被保留，除非显式 `--replace`。安装器暂存副本并原子重命名；符号链接、目录连接点和选定根/目标边界之外的路径会被拒绝。

要立即将过时的安装能力捕获为本地贡献草稿：

```bash
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs --json --record-feedback
```

该命令写入 `.design-pipeline/feedback/`，从不创建远程 Issue 或 PR。

Windows PowerShell 示例：

```powershell
$target = Join-Path $HOME ".codex\skills\design-pipeline"
node scripts\install-local.cjs --source skill --root (Split-Path $target) --target $target
node (Join-Path $target "scripts\designer-pipeline.cjs") doctor --root .
```

要升级现有安装，运行相同命令加 `--replace`。没有该标志，安装器不会碰现有安装。

或者从 GitHub Release 包在 macOS 或 Linux 上安装：

```bash
# 从 Releases 下载 design-pipeline-skill.tgz，然后：
mkdir -p /tmp/design-pipeline-release
tar -xzf design-pipeline-skill.tgz -C /tmp/design-pipeline-release
node /tmp/design-pipeline-release/design-pipeline/scripts/install-local.cjs \
  --root ~/.codex/skills \
  --target ~/.codex/skills/design-pipeline
node ~/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs doctor --root .
```

Windows PowerShell release 安装：

```powershell
# 先从 Releases 下载 design-pipeline-skill.zip。
$extract = Join-Path $env:TEMP ("design-pipeline-release-" + [guid]::NewGuid())
Expand-Archive -LiteralPath .\design-pipeline-skill.zip -DestinationPath $extract
$source = Join-Path $extract "design-pipeline"
$target = Join-Path $HOME ".codex\skills\design-pipeline"

node (Join-Path $source "scripts\install-local.cjs") `
  --root (Split-Path $target) `
  --target $target
node (Join-Path $target "scripts\designer-pipeline.cjs") doctor --root .
```

升级时加 `--replace`。替换是暂存的，验证失败会回滚，所以失败的升级不会破坏工作安装。

## 反馈和贡献

记录管线或 companion 发现：

```powershell
node ~/.codex/skills/design-pipeline/scripts/record-feedback.cjs `
  --kind capability-gap `
  --source runtime `
  --skill animejs `
  --title "Anime.js companion lacks adapter guidance" `
  --summary "The requested Three.js target is supported upstream but missing from the installed companion." `
  --evidence "Self-check missing marker: adapters"
```

重复的发现共享一个确定性观察并递增其出现计数。机器特定路径和常见凭据模式在写入文件前会被脱敏。在交给授权的 GitHub 或 ship 工作流之前先审查草稿。

## 上游能力同步

网络检索属于主机。主机写入模式有效的源证据后，管线执行本地、纯数据比较：

```powershell
node ~/.codex/skills/design-pipeline/scripts/audit-capabilities.cjs `
  --source-evidence .design-pipeline/source-evidence.json `
  --installed-evidence .design-pipeline/check-deps.json `
  --record-feedback `
  --json
```

审计可以准备确定性发布请求，但准备从不发布：

```powershell
node ~/.codex/skills/design-pipeline/scripts/prepare-publication.cjs `
  --observation dpf-0123456789abcdef `
  --repository owner/repository `
  --action issue
```

显式授权后，GitHub/浏览器主机适配器执行远程操作，写入匹配的收据，`reconcile-publication.cjs` 记录返回的 URL。缺失源证据报告为 `UNKNOWN`；环境凭据从不暗示发布权限。

详见 `skill/references/upstream-capability-sync.md`。

## 统一 CLI 和参考提供者

`skill/scripts/designer-pipeline.cjs` 是确定性内核之上的稳定生命周期门面。它发射 `design-pipeline.cli-result.v1`，将每个项目路径包含在 `--root` 下，退出码 `0` 表示成功，`1` 表示无效输入/错误，`2` 表示被阻止或验证失败。

```powershell
node skill/scripts/designer-pipeline.cjs doctor --root . --json
node skill/scripts/designer-pipeline.cjs status --root . --change-root openspec/changes/example --json
node skill/scripts/designer-pipeline.cjs scene check --root . --change-root openspec/changes/example --json
node skill/scripts/designer-pipeline.cjs adapter audit --root . --json
```

CLI 不替换 DESIGN/MOTION 文档语义，也从不远程发布。公共模板集合保持可选的、带归属的参考提供者；它们不能覆盖已验证的项目基础。

详见 `docs/cli-and-reference-providers.md`。

## 包 / CI

```bash
node scripts/qa.cjs
node scripts/package.cjs --output-root dist
```

QA 是密封的：检查清单奇偶校验、语法、所有测试、控制平面冒烟命令、字节可重现归档、归档完整性、失败原子性、隔离安装、已安装包 CLI 行为，以及运行前后字节相同的仓库状态。

GitHub Actions：

- `CI` — 在每个 PR/push 上运行 QA 并上传包产物
- `Release` — 在 `v*` 标签（或手动 dispatch）上发布发布资产

## OpenSpec 对齐

长期行为位于 `openspec/specs/` 下。

进行中的更改位于 `openspec/changes/<change-id>/` 下，包含：

```text
proposal.md
design.md
tasks.md
specs/<capability>/spec.md
```

管线的运行时设计产物映射到 OpenSpec：

| design-pipeline | OpenSpec 角色 |
| --- | --- |
| `brief.md` | 提案意图 |
| `directions.md` | 设计探索 |
| `design.md` | 技术/设计方法 |
| `motion.md` | 动效特定设计规范 |
| `tasks.md` | 实现清单 |
| `qa.md` | 验证证据 |
| `scene.json` / `scene.md` | 机器场景合同 / 可读投影 |
| `state.json` / `events.jsonl` / `handoff.md` | CAS 保护状态 / 仅追加历史 / 可读恢复说明 |

## 最小可行运行

即使没有安装可选 companion skill：

```bash
node skill/scripts/check-deps.cjs
```

命令应返回 `OK`。缺失可选 skill 应报告 `WARN` 并带回退。

## 发布标准

发布前，对照以下验证：

- `CHANGELOG.md`
- `skill/references/open-source-readiness.md`
- `skill/references/qa-checklist.md`
- `openspec/specs/design-pipeline/spec.md`
