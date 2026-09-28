# Extend motion-first capability reference

把外部 motion 参考转化为本项目自己的动画工具能力，而不是重写任何 OpenAlice target，也不把上游仓库作为依赖。

## Goal

给 `design-pipeline` 增加一份可路由的 motion-first reference，并在 primitive registry 中补充“有界物理响应”和“共享锚点连续性”两个语义能力，使后续 target 能在 DOM/SVG/Canvas/WebGL/视频之间按需求选材，同时保留可 seek、可 reduced-motion、可验证的既有契约。

## Explicit boundary

- 只改工具参考、路由说明和语义 primitive 注册表。
- 不改 `experiments/openalice-product-animation/index.html` 或其输出，不修改冻结 baseline。
- 不复制参考仓库源码、资产、字体、文案、案例名、提示词、CLI、测试或工作流。
- 不新增动画运行时、依赖、shared gate 或发布入口。
- `codeCopied: false`；参考仓库仅 `reference-only`，其 CC BY-NC 许可不被重新分发为代码或资产。

## Evidence

专门验证 JSON/Markdown contract、motion foundation checker、CLI self-check 和根目录 `node scripts/qa.cjs`。本变更不声称 OpenAlice 新成片或 Visual Acceptance 已变化。
