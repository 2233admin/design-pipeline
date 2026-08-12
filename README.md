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

所以它做四件事：

1. 在写代码之前，先创建 `DESIGN.md` 和 `MOTION.md`。
2. 用 OpenSpec 风格的提案 → 实现 → 验证 → 归档生命周期管理变更。
3. 支持网站克隆、设计系统合成、动效设计，每一步都有证据。
4. 通过门禁系统确保设计质量，不达标就拦住。

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

## 核心功能

### 内置接口质量协议

Pipeline 内置了完整的接口质量技能快照：可访问性、布局、字体、颜色、表面与图标、产品文案，以及按变更范围审查 UI 的规则。它随包交付、固定上游版本并由哈希校验，不依赖某台机器是否安装了额外 Agent skill。每次 UI 改动都按 `full` 或受限的 `quick` 范围审查，并在 `qa.md` 区分本次引入、回归和既有问题。

### 内置 MengTo 设计技能库

Pipeline 完整内置了 `MengTo/skills` 的固定快照：127 个技能、867 个受 Git 跟踪文件，包含所有 `SKILL.md`、引用、脚本、资产、demo、OpenAI metadata 和顶层运行时资源。快照保留上游原文，Pipeline 另加本地能力路由、阶段映射、依赖门禁和 QA 覆盖层。

Kage 走同一个 Three.js scroll-world 路由；Pipeline 另带一份干净室案例层，吸收独立 Kage 仓库后续的移动端视口、固定菜单、横向溢出和纵横比修复，但不复制该仓库未授权的源码或素材。

```bash
# 搜索最窄的设计/动效/WebGL/游戏工作流
node skill/scripts/designer-pipeline.cjs mengto search \
  --query "scroll-controlled Three.js world" --json

# 验证完整文件数、字节数和规范化树哈希
node skill/scripts/designer-pipeline.cjs mengto verify --json
```

设计相关 playbook 可以按能力自动候选；账号、发布、社交、声音、TTS、Apple profiling 和浏览器录像类 playbook 仅在用户明确要求时启用。打包不等于获得凭据、付费、隐私数据或外部发布权限。

### 内置 shadcnio React 组件索引

Pipeline 完整保留了 `shadcnio/react-shadcn-components` 已审查版本的 2 个上游文件（MIT
LICENSE 与 README），并离线解析 README 的 75 个 AI、按钮、Hook 和文本组件条目。上游仓库
不含它链接到 `shadcn.io` 页面中的实现代码，因此检索结果只是 `reference-adaptation` 候选，默认
`review`；在复制或实现前必须单独核验页面源码的许可证、依赖、无障碍和项目兼容性。

```bash
# 搜索行为参考，不会安装依赖或复制页面实现
node skill/scripts/designer-pipeline.cjs shadcnio search \
  --query "AI prompt input" --category ai --json

# 验证固定修订、2 个文件、75 条索引和规范化树哈希
node skill/scripts/designer-pipeline.cjs shadcnio verify --json
```

### 内置 Prism System 设计智能层

Pipeline 完整保留了 `appariciojunior/PrismSystem` 已审查版本的 107 个设计技能及其两份
注册表（MIT）。这些技能覆盖 Design DNA、原型、UI 审查、新体验、交付、设计语料蒸馏、
Token 治理、Figma、React 和质量门禁；它们通过现有 Pipeline 阶段执行，不引入第二套组件库、
品牌样例、控制器或构建链。

```bash
# 从完整离线注册表查找最窄技能
node skill/scripts/designer-pipeline.cjs prism search \
  --query "dark mode token contrast" --category foundations --json

# 使用 Prism 的五路入口分类设计请求
node skill/scripts/designer-pipeline.cjs prism route \
  --query "review this settings screen for accessibility" --json

# 验证 127 个固定文件和上游 Git tree/blob
node skill/scripts/designer-pipeline.cjs prism verify --json
```

上游 `autonomy` 字段只描述配方，不授予凭据、付费、破坏性操作、发布、消息发送或其他外部
权限；项目 `DESIGN.md`、`MOTION.md`、现有代码与当前工作区规则始终优先。

### 内置 Holosticker 全息贴纸实现

Pipeline 完整保留了 `jal-co/holosticker` 的 57 个上游文件（MIT），包含真实的 Three.js
全息材质、精确距离场异形切边、指针倾斜、3D 揭膜和 PNG/GIF/视频/GLB/React 导出链路。
能力按 8 个最小源码切片暴露，不会因为需要一个全息材质就把整套 Studio UI、分析脚本、
字体、shadcn 控件或 `gifenc` 带进目标项目。

```bash
# 查看可复用能力及其真实源码、依赖和接入边界
node skill/scripts/designer-pipeline.cjs holosticker inspect \
  --capability holo-material --json

# 验证固定修订、57 个文件和规范化树哈希
node skill/scripts/designer-pipeline.cjs holosticker verify --json
```

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

组件库不直接变成项目依赖。流水线先把需求拆成能力，再按平台、来源证据、接入方式和许可证选路；没有授权的远程库只会得到 `review`，不会被静默复制。

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

- **2D 渲染**：PixiJS v8（精灵、粒子、滤镜、着色器）
- **2D 游戏**：Phaser v4（完整浏览器游戏运行时）
- **3D 渲染**：Three.js、React Three Fiber
- **3D 引擎**：Babylon.js、PlayCanvas
- **GPU/着色器**：WebGPU/WGSL

持久空间工作添加 `scene.json` 和 `scene.md` 投影，记录坐标、生命周期、资产、性能预算。

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
node skill/scripts/designer-pipeline.cjs status --root . --change-root openspec/changes/example --json
node skill/scripts/designer-pipeline.cjs scene check --root . --change-root openspec/changes/example --json
```

退出码：`0` 成功，`1` 无效输入，`2` 被阻止或验证失败。

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

## License

MIT
