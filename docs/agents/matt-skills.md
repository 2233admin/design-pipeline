# Matt 技能适配

Matt 的技能提供需求澄清、模块设计、TDD、诊断和审查方法；design-pipeline 提供视觉工具、任务状态和真实输出的验证。两者按任务组合使用。Matt 技能是维护者自行安装的可选工程工具，不随设计技能包分发。

## 已核对的版本

2026-10-08 核对了 [v1.3.0](https://github.com/mattpocock/skills/tree/984a2c023c9fb42bb6ea40c70a652284a109dc05)、[v1.3.1](https://github.com/mattpocock/skills/tree/24fe0ef7737efae15c87225755e9f6f5965e4888) 和当前已安装的 [f3fc563](https://github.com/mattpocock/skills/tree/f3fc5632f401156837ee3872f14fe33ccf1024ea)。本机 38 个上游技能、103 个技能文件逐一匹配该提交。它包含 v1.3.1 后续的修改；包内版本字段仍是 1.3.1，不能据此把 main 当作已发布标签。

v1.3 把 `implement-spec`、`pr`、`retro` 纳入正式工程技能，统一 `GLOSSARY.md` 命名，移除专用的合并冲突解决技能，并改进跨技能加载。v1.3.1 修正调试后的建议：修复后用用户选择的 `retro` 检查环境缺口，发现模块边界问题时再考虑架构调查。见固定提交的 [变更记录](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/CHANGELOG.md)。

官方插件当前包含 27 个正式技能；本机全量安装额外包含 7 个 in-progress 和 4 个 misc 技能。全量安装记录不等于本项目承诺支持每个试验技能。发布说明应写所审查的标签或提交，分别说明正式和试验入口。

## Setup 的必要调整

已安装的 `setup-matt-pocock-skills` 与审核的当前上游一致，支持新术语表名称，无需修改上游文件或重复运行。项目配置保留为：

| 配置 | 本仓库选择 |
| --- | --- |
| Agent 入口 | `AGENTS.md`，按主机策略选用 |
| 执行任务 | [Multica 与授权边界](issue-tracker.md) |
| 分类与分诊 | [现有角色映射](triage-labels.md) |
| 领域布局 | 一个产品领域；私有维护 workspaces 不构成多个领域 |
| 术语 | [docs/GLOSSARY.md](../GLOSSARY.md) |
| 工程决定 | 相关 OpenSpec proposal/design/spec；可选已有 ADR |

本仓库没有根目录 `CONTEXT.md`；迁移的是已有 `docs/glossary.md`。不要另建根目录 `GLOSSARY.md`。上游技能使用默认文件名时应遵循 [domain 配置](domain.md) 指向的实际路径。历史变更中的旧名保留用于追溯。

当前 setup 新增的 GitHub/GitLab 标签创建规则不适用于本仓库的 Multica 配置。重跑 setup 只用于用户选择更换配置时，更新现有段落并保留周围内容。

## 同名和旧版的区别

安装名不证明来源。主机的 canonical Codex root 中已核对的 `tdd`、`code-review` 是 Matt 原文；compatibility root 里同名的 `tdd`、`code-review`、`domain-modeling` 来自另一个技能集合。以当前发现路径和实际文件为准，不能把后者的调用自动归为 Matt。安装文件完整也不证明当前会话已发现这些入口；更新后应在新会话核对可见列表及实际加载来源。

| 旧入口 | 与已安装 Matt 原版的主要差异 |
| --- | --- |
| `matt-tdd` | 改了技能名，仍读 `CONTEXT.md`，未包含每个测试边界“能发现什么、遗漏什么”的说明 |
| `matt-code-review` | 改了技能名，缺最新的完整规范搜集及同时收取两条审查结果的明确要求；tracker 说明更固定 |
| `matt-ask-matt` | 保留旧的领域文件及流程路由；目录存在不能证明当前会话能发现这个入口 |
| `grill-me-codex` | 本地 Codex 适配入口仍有旧术语表引用；按项目 domain 配置解释 |

现有可选 companion 检查已改用官方的 `tdd`、`code-review` 安装名，标准安装不再需要本地别名。这个检查只验证文件存在，未验证来源、模型是否执行方法或创作质量。旧入口仍保留给其原有消费者；本次未更新或删除它们。

## 按任务组合

| 当前问题 | 选用的方法 | 在本仓库落点 |
| --- | --- | --- |
| 需求或边界还没说清 | 用户选择 `grill-with-docs`，需要时查 `domain-modeling` | 现有术语表和 OpenSpec 决定 |
| 一个明确的改动 | 使用已有计划，按 `tdd` 的公开边界做小步反馈 | 现有 CLI、测试与 [QA 方法](../../skill/references/qa-checklist.md#engineering-feedback-loop) |
| 难复现或修复后仍失败 | `diagnosing-bugs` | 同一复现命令、实际输入输出与回归检查 |
| 一份规范含独立任务 | 用户选择 `implement-spec` | 先明确依赖和文件归属，在依赖已满足的任务之间并行；集成到一个分支 |
| 交付前检查 | `code-review` 的 Standards / Spec 两条审查 | 固定比较基点，分别提供 CONTRIBUTING/AGENTS 和相关 OpenSpec |
| 同类问题反复出现 | 用户选择 `retro` | 优先补现有自动检查或导航指针；判断性规则保留在文档 |

用户调用的技能不由其他技能偷偷启动。Codex 没有对应 Skill 工具时，按其发现机制显式加载目标 `SKILL.md`；提到名字不等于完成加载。`ask-matt` 适合用户不确定选哪个入口时查询，无需给每个局部任务增加一轮规划。

工程回归通过后，继续检查真实浏览器行为或播放实际影片与声音。Component Conformance 和 Visual Acceptance 分别记录；回归测试或代码审查不替代用户验收。任务多也不代表都能并行，同一份状态、注册表或发布文件的修改应明确归属和集成顺序。

最近 25 个本地用户会话的统计、比较矩阵和针对本次使用的建议见 [版本评估](../../openspec/changes/review-matt-skills-v1-3/review.md)。原始会话和逐文件 diff 仅保留在忽略目录。
