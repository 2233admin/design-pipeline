# 文档

- [项目视觉规范](../DESIGN.md)：遵循 [Google DESIGN.md](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)，描述视觉语言与设计理由。
- [项目动效规范](../MOTION.md)：本仓库的静态呈现，以及目标项目的动效边界。
- [安装与升级](../skill/references/installation.md)、[工具索引](../skill/tools/README.md)：安装 skill 后按需阅读。
- [术语表](glossary.md)：项目术语及其含义。
- [OpenSpec 配置](../openspec/config.yaml)、[贡献流程](../CONTRIBUTING.md)：项目上下文、行为规范和变更验收。
- [历史文档](archive/README.md)：保留旧稿，仅供追溯。

维护中的指南、研究和合同放在 `docs/` 对应子目录；每次变更的文档放在
`openspec/changes/<change-id>/`；本机截图、渲染输出、日志和临时验证文件放在已忽略的
`.design-pipeline/`。根目录只保留项目入口、DESIGN/MOTION、开源治理与发布文件。

BMAD 安装及输出、本机 agent skills、工具状态和根目录 `skills-lock.json` 只留本地。
根目录隐藏路径默认不入库；公开例外为 `.github/`、`.gitignore` 和 `.gitattributes`。
共享的 agent 入口使用根目录 `AGENTS.md`、`CLAUDE.md` 与 `skill/SKILL.md`，不依赖本机安装目录。

## 目录职责

| 目录 | 内容 |
| --- | --- |
| `skill/references/` | 按任务读取的方法和工作流；现有 schema、目录数据保留兼容路径 |
| `skill/tools/` | 已适配的小工具、使用说明和可运行示例 |
| `skill/vendor/` | 原始上游快照、版本、许可和完整性清单；经能力指南选择后读取 |
| `skill/scripts/` | 随 skill 安装的 CLI、执行与检查实现 |
| 根目录 `scripts/`、`tools/` | 维护仓库、打包和开发验证用的工具，不随 skill 安装 |
| 根目录 `package.json`、`package-lock.json` | Node.js 22+ private npm workspace 与维护工具锁文件；不随 skill 或下游项目安装 |
| `tests/`、`evals/` | 程序回归，以及作品/模型比较；分别报告技术结果和创作评价 |
| `experiments/` | 已入库的实验案例；新的临时截图和运行输出进入 `.design-pipeline/` |
| `openspec/specs/`、`openspec/changes/` | 当前行为规范与逐次变更；勾完任务不等于已审阅或已归档 |

装到其他项目的是 `skill/`。维护者通过根目录 `npm ci` 安装仓库 workspace，再用 `npm test` 跑仓库 QA 与浏览器工具自测；这些维护依赖不进入 skill 或目标项目。维护者的 OpenSpec、仓库工具和本地 agent 配置不是使用单个工具的前置条件。
