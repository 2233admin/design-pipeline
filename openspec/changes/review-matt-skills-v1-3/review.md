# Matt v1.3 兼容与使用评估

检查日期：2026-10-08。这里评估 Matt 技能集的 v1.3 系列与本仓库的集成；未改 design-pipeline 的版本号，也未创建发布标签。

## 版本差异

| 对象 | 固定提交 | 本次结论 |
| --- | --- | --- |
| v1.3.0 | `984a2c023c9fb42bb6ea40c70a652284a109dc05` | GLOSSARY 命名；implement-spec、pr、retro 进入正式工程集合；移除专用冲突解决技能；改进跨技能加载 |
| v1.3.1 | `24fe0ef7737efae15c87225755e9f6f5965e4888` | 技能内容相对 v1.3.0 只修正 ask-matt 的调试后复盘建议 |
| 本机已安装 main | `f3fc5632f401156837ee3872f14fe33ccf1024ea` | 38 个技能、103 个技能文件逐一匹配；含 v1.3.1 之后的修改 |

上游标签 v1.3.0 和 v1.3.1 都在 2026-10-04 创建；版本提交时间不能当作发布时间。包与插件字段仍为 1.3.1，但 main 内容已不同于发布标签。依据：[固定 changelog](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/CHANGELOG.md)、[v1.3.1 标签](https://github.com/mattpocock/skills/releases/tag/v1.3.1)。

main 相对 v1.3.1 有 18 个技能文件新增或变化。与本项目有关的内容包括：TDD 明确每个测试边界的覆盖与遗漏；诊断中的人为故障需要证明改动确实落地；审查完整搜集标准并同时收取两条审查结果；implement 显式加载 TDD/review；setup 补充 GitHub/GitLab 标签与查询规则；ask-matt 在给出建议前读取目标技能原文。这些后续改动不应混写成 v1.3.0 的发布内容。[固定比较](https://github.com/mattpocock/skills/compare/24fe0ef7737efae15c87225755e9f6f5965e4888...f3fc5632f401156837ee3872f14fe33ccf1024ea)

官方插件清单为 27 个正式技能；本机 38 个还包含 7 个 in-progress 和 4 个 misc 技能。上游 skills 树的 108 个文件中，另 5 个是分组 README，并非安装遗漏。[固定插件清单](https://github.com/mattpocock/skills/blob/f3fc5632f401156837ee3872f14fe33ccf1024ea/.claude-plugin/plugin.json)

## 本仓库和上游的职责差异

| 环节 | Matt 方法 | 本仓库现有实现和适配 |
| --- | --- | --- |
| 领域语言 | 默认 GLOSSARY 与 ADR | 一份 docs/GLOSSARY.md；工程决定复用相关 OpenSpec |
| 配置 | setup 提供 tracker、labels、domain 三类消费者 | AGENTS 指向 docs/agents；Multica 和现有角色已确定 |
| 小步开发 | TDD 公开测试边界与 RED/GREEN | qa-checklist 已采用；现有 CLI 是观察边界，保留实际执行结果 |
| 失败诊断 | 先建立复现，再最小化和验证原因 | next 返回当前失败、修复指引及已有记录差异；native 完成受真实验证约束 |
| 多任务执行 | implement-spec 按依赖就绪的任务并行 | 仅在任务和文件归属独立时采用；共享状态、注册表和发布文件按依赖集成 |
| 审查 | Standards 与 Spec 分开 | 提供固定比较基点、AGENTS/CONTRIBUTING 与本次 OpenSpec |
| 交付 | 工程检查与 PR 描述 | Component Conformance 与 Visual Acceptance 分开，保留浏览器和播放验收 |

已有 QA 方法已按同一 f3fc 提交适配 TDD、诊断和模块设计，因此没有新增执行器、gate、receipt、resolver 或策略摘要。唯一可执行兼容改动是既有可选 companion group 的两个安装名：`matt-tdd` → `tdd`、`matt-code-review` → `code-review`。旧配置在只有五个官方技能的干净安装中错误地报告 WARN；同一检查在修正后通过。检查只证明名字对应的文件存在，不能确认来源或执行效果。

## 旧分支与同名来源

canonical Codex 安装全部匹配固定 main。compatibility root 中有 23 个同名目录，全部与当前 main 不同，15 个当前名称缺失。兼容目录服务于其他消费者，本次未覆盖或删除。

其中兼容目录的 `tdd`、`code-review`、`domain-modeling` 注册来源是 `Eridanus117/skills`，不能直接归为 Matt。当前 canonical 路径匹配不证明过去的同名路径当时也匹配；会话统计仅使用可确认来源的读取。

`matt-tdd`、`matt-code-review`、`matt-ask-matt` 是原有 `c55ee46073ed923f86ce59a5eb3b6d895095d1b7` 的改名分支。TDD 仍引用 CONTEXT 且缺覆盖说明；review 缺最新的完整标准搜集和同时收取结果要求；ask-matt 缺新的正式路由并有四处旧名称。`grill-me-codex` 是本地组合适配，含 TinySpec 和单问题访谈等刻意差异，不能当作 Matt 原版。本次没有把这些分支更新成 upstream；维护指南解释怎样选定当前来源。

## 最近 25 个会话

范围是本机可读取的 Codex 顶层用户会话，包括归档，排除 subagent。固定截止为本次请求之前的 `2026-10-07T23:22:14.777Z`，按日志在截止前的最后活动排序；最旧样本的最后活动为 `2026-09-27T20:21:25Z`。25/25 日志可读，其中 14 个归档。此范围不覆盖云端或其他产品中不可见的完整调用日志，也不等于所有应用侧最近 25 个聊天。

每个样本扫描其截止前保存的历史；部分技能读取发生于更早的月份。因此这些数字是最近活跃会话中的历史加载分布，不是最近几天的调用频率，也不表示当时使用了今天安装的新版本。

仅将实际读取 SKILL.md 或明确技能工具调用记作加载，按 call_id 和目标去重；系统技能清单、用户仅提到名字、检查目录存在、文件写入、上游网页研究与本次维护的新调用不计入。加载只能证明读取，不能证明遵循了全部步骤或改善了代码。

确认 Matt 原版或有来源记录的改名分支共 **16 次加载，覆盖 4/25 个会话**。

| 技能 | 加载事件 | 覆盖会话 | 观察用途 |
| --- | ---: | ---: | --- |
| setup-matt-pocock-skills | 1 | 1 | 项目 setup |
| triage | 1 | 1 | setup 时读取参考，未确认执行 triage |
| grill-me | 3 | 2 | 2 次维护比较，1 次用户请求后加载 |
| matt-tdd | 2 | 2 | 1 次维护比较，1 次 harness 方法参考 |
| matt-code-review | 2 | 2 | 1 次维护比较，1 次 harness 方法参考 |
| codebase-design | 2 | 2 | 方法参考 |
| ask-matt | 2 | 1 | 1 次用户请求后加载，1 次维护读取 |
| matt-ask-matt | 1 | 1 | 用户请求后加载旧分支 |
| wait-what | 1 | 1 | 用户请求后加载 |
| git-guardrails-claude-code | 1 | 1 | 方法参考 |

会话覆盖数不可逐行相加。另有兼容目录 `tdd` **12 次 / 4 会话**、`code-review` **4 次 / 3 会话**，来源未证实为 Matt，单列而不并入以上统计。其他技能确认 301 次加载、90 个名称、覆盖 21 个会话；不能把读取次数当成完成任务数。

两个会话中有 3 行不符合 JSON 格式；这些行未出现 SKILL.md 或技能读取关键词，已跳过并记录。统计是可确认加载的下限，无法排除损坏日志或未显式加载的方法使用。没有从标题、摘要或修复类词语推断某个技能执行过。

## 对工作流的建议

1. **先选准来源。** 同名兼容技能读取明显多于 Matt 旧分支的工程参考。新会话应核对实际 canonical Matt 文件及版本；不要让一个短名字决定使用哪套方法。无需再次全量安装。
2. **把复现和验证接紧。** 样本文本中 16 个会话有修复信号、11 个有验证信号。这些分类不证明漏用，但与本仓库的工作重点吻合：明确一个实际失败 → diagnosing-bugs 的复现 → TDD 的单个切片 → 既有验证与 native 完成。范围已明确的局部修复无需再走一次完整访谈。
3. **并行时用依赖，结束时修环境。** 样本文本中 14 个会话涉及交付；这些是文本分类。v1.3 的 implement-spec 适合独立任务的依赖图与一个集成分支，避免多个执行者同时改共享状态。用户选择 retro 时，把重复的问题落实为既有测试、检查或导航指针，保留判断性规则和独立视觉验收。未确认本样本加载 implement-spec 或 retro，建议是可尝试的改进，未量化收益。

已有 OpenSpec 是规范与变更来源，已有 Multica 是执行任务来源。使用 to-spec、implement 或 handoff 时先消费现有材料，不额外复制 PRD、任务队列或工作流状态。测试通过后的实际画面、交互和播放仍由用户验收。

## 复现与隐私

上游逐文件 Git blob SHA-1、完整版本 diff、别名 diff、会话选择、去重与分类脚本只保留在忽略目录 `.design-pipeline/matt-v13-review/`。不将原始聊天、会话标识、机器路径或凭证放进仓库。上游 API 限流后通过只读 Git 传输及固定原文核对，没有运行全量更新。

下一节给出逐技能对照，包含 supporting files；“不同”不等于兼容安装错误，“缺失”也不是自动安装理由。

## 逐技能对照

| 技能 | 上游分组 | canonical 文件 | compatibility 状态 |
| --- | --- | --- | --- |
| ask-matt | engineering | 3/3 一致 | 不同 |
| code-review | engineering | 2/2 一致 | 不同 |
| codebase-design | engineering | 4/4 一致 | 不同 |
| diagnosing-bugs | engineering | 3/3 一致 | 不同 |
| domain-modeling | engineering | 4/4 一致 | 不同 |
| grill-with-docs | engineering | 2/2 一致 | 缺失 |
| implement-spec | engineering | 2/2 一致 | 缺失 |
| implement | engineering | 2/2 一致 | 不同 |
| improve-codebase-architecture | engineering | 3/3 一致 | 不同 |
| pr | engineering | 3/3 一致 | 缺失 |
| prototype | engineering | 4/4 一致 | 不同 |
| research | engineering | 2/2 一致 | 不同 |
| retro | engineering | 2/2 一致 | 缺失 |
| setup-matt-pocock-skills | engineering | 7/7 一致 | 不同 |
| tdd | engineering | 4/4 一致 | 不同 |
| to-spec | engineering | 2/2 一致 | 不同 |
| to-tickets | engineering | 2/2 一致 | 不同 |
| triage | engineering | 4/4 一致 | 不同 |
| wayfinder | engineering | 2/2 一致 | 不同 |
| wizard | engineering | 3/3 一致 | 不同 |
| chief-of-staff | in-progress | 2/2 一致 | 缺失 |
| claude-handoff | in-progress | 2/2 一致 | 不同 |
| loop-me | in-progress | 2/2 一致 | 缺失 |
| setup-ts-deep-modules | in-progress | 3/3 一致 | 缺失 |
| writing-beats | in-progress | 2/2 一致 | 缺失 |
| writing-fragments | in-progress | 2/2 一致 | 缺失 |
| writing-shape | in-progress | 2/2 一致 | 缺失 |
| git-guardrails-claude-code | misc | 3/3 一致 | 不同 |
| migrate-to-shoehorn | misc | 2/2 一致 | 缺失 |
| scaffold-exercises | misc | 2/2 一致 | 缺失 |
| setup-pre-commit | misc | 2/2 一致 | 缺失 |
| grill-me | productivity | 2/2 一致 | 缺失 |
| grilling | productivity | 2/2 一致 | 不同 |
| handoff | productivity | 2/2 一致 | 不同 |
| teach | productivity | 6/6 一致 | 不同 |
| to-questionnaire | productivity | 2/2 一致 | 缺失 |
| wait-what | productivity | 2/2 一致 | 不同 |
| writing-for-agents | productivity | 3/3 一致 | 不同 |
