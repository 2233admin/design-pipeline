# BMAD 盘点入口

**HEAD：** `84b838e`（`feat: internalize DesignMD examples and iart motion skills`）
**QA：** `node scripts/qa.cjs` 已在该提交前通过（exit 0）。
**语言：** 中文。

## 现有 BMAD 工件已过期

`_bmad-output/` 是 2026-08-23 那一轮 PRD / Architecture / Epic 1。它们覆盖 DesignMD **目录爬虫**，**不覆盖**这次落地的：

- 钉死的 `dimabraven/design-md` 离线 example（`designmd search|inspect|verify` 无 `--catalog`）
- 钉死的 iart-ai 15 pack / 50 skill，以及 **`iart route` 先选型再实施**
- `motion-graphics` job；领域 brief 足够，不要求 skill id
- HTML 视频运行时仍是 HyperFrames，除非 brief 点名 Remotion / Manim / After Effects
- `generative-illustration-skills` 无 LICENSE，未进包
- `designmd-cli install` 故意未包，避免覆盖产品 `DESIGN.md`

盘点时把 `_bmad-output/planning-artifacts/` 当历史，不要当当前合同。

## 当前权威

| 层 | 路径 |
|---|---|
| OpenSpec | `openspec/specs/design-pipeline/spec.md` |
| 本轮 change | `openspec/changes/archive/2026-08-26-internalize-designmd-source-and-iart-motion/` |
| Job 路由 | `skill/references/job-registry.json` |
| 目录协议 | `skill/references/design-md.md`、`skill/scripts/designmd-core.cjs` |
| iart 选型 | `skill/references/iart-motion-skills.md`、`skill/scripts/iart-motion-skills-core.cjs` |
| 产品边界 | `openspec/project.md`、`skill/references/curation-policy.md` |

## 建议怎么盘

新开会话。先 `bmad-help` 看 BMM 位置，再决定是 **刷新 PRD/架构** 还是 **只补 spec / epic 增量**。

不要从零重写整个产品；这次增量是「两个钉死知识源 + 选型门」，Kernel 没变。

## 不要带进 BMAD 的本地脏文件

未提交、与本轮无关：`.gsd/`（已 ignore）、`docs/contracts/`、`internal/`。
