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

### 可视化方向预览与中文排版

开放式整页设计在选方向前先生成同内容、同状态、同视口的迷你 mockup 对比页，并由
`direction check` 校验候选差异、文件与哈希；窄范围或唯一参考则显式豁免。含中文、日文或
韩文的界面默认使用系统字体栈，并记录 CJK 行高、标点规则以及装饰字体的最小字形子集与
fallback，避免用数 MB 的完整字体掩盖排版问题。

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

### 网站克隆

捕获参考证据，从完整组件合同构建，独立比较结果后才声称保真度。

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
node skill/scripts/designer-pipeline.cjs toolchain resolve --root . --artifact toolchain-request.json --json
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
