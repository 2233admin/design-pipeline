# 三个仓库的快速研究

研究日期：2026-08-15

研究对象：

- [Eridanus117/skill-vault](https://github.com/Eridanus117/skill-vault)
- [Eridanus117/agent-plugins](https://github.com/Eridanus117/agent-plugins/tree/main/plugins)
- [Eridanus117/private-kb](https://github.com/Eridanus117/private-kb)

固定版本：

- `skill-vault`: [`6c3e98597c7880ea41b9038c787e67ced3f0cdde`](https://github.com/Eridanus117/skill-vault/tree/6c3e98597c7880ea41b9038c787e67ced3f0cdde)
- `agent-plugins`: [`0004eb9b0a770273251e0ebb5d77c9d3365d5dbe`](https://github.com/Eridanus117/agent-plugins/tree/0004eb9b0a770273251e0ebb5d77c9d3365d5dbe)
- `private-kb`: [`96d4218552761876791e5d7ca5017f9fd6e429cc`](https://github.com/Eridanus117/private-kb/tree/96d4218552761876791e5d7ca5017f9fd6e429cc)

## 一句话结论

这三个仓库不是同一类资产：

- `skill-vault` 是个人技能的 SSOT 正本仓，更像“技能源代码库”。
- `agent-plugins` 是可安装的插件发行仓和合规验证仓，更像“打包后的分发层 + 规范门”。
- `private-kb` 是私域知识真源仓和迁移器，更像“知识内容仓 + 结构化导出工具”。

如果你要服务 `D:\projects\design-pipeline`，最直接可复用的是：

- `skill-vault` 的技能组织方式、lane/visibility 元数据、以及“正本只保留一份”的仓内纪律。
- `agent-plugins` 的插件清单、双运行端差异、符合性检查写法、以及把“入口、安装、验证、回滚”分层管理的方式。
- `private-kb` 的 `INDEX.md` 导航树、frontmatter 约束、迁移 dry-run 报告结构，以及把派生索引与真源分离的设计。

## 1. `skill-vault`

这是一个个人通用 agent skill 的唯一可写正本仓。README 明确说仓内只保留可跨主机同步的 personal capability，`skills/` 放每个 skill 的完整目录，`skills.json` 记录 repository identity、仓内路径、lane 与 visibility，`docs/` 放长期现状文档，`lefthook.yml` 只校验 `docs/` 中的 KB Markdown。[README](https://github.com/Eridanus117/skill-vault/blob/6c3e98597c7880ea41b9038c787e67ced3f0cdde/README.md#L3-L12)

`skills.json` 进一步证明它是一个“技能索引仓”，而不是单纯文档仓：里面逐项列出技能名、来源仓库、相对路径、lane 和 visibility，当前能看到 browser-playwright、doc-write、kb、work-closeout 等多项技能条目。[skills.json](https://github.com/Eridanus117/skill-vault/blob/6c3e98597c7880ea41b9038c787e67ced3f0cdde/skills.json#L14-L37)

仓库里的 `kb` skill 也把它的角色说得很清楚：跨 session 的耐用知识应落到 rhizome 管理的域目录里，`kb` skill 只负责触发、路由和边界判断，不承载完整 HOW。[skills/kb/SKILL.md](https://github.com/Eridanus117/skill-vault/blob/6c3e98597c7880ea41b9038c787e67ced3f0cdde/skills/kb/SKILL.md#L1-L34)

成熟度判断：

- 结构很完整，已经有清晰的 SSOT 约束和操作纪律。
- 内容偏“运行中系统”的说明，不是一个静态知识样例仓。
- 最近提交日期是 2026-08-05，说明这套技能仓仍在维护中，但当前固定版本没有 release/tag 作为稳定交付边界。
- 本次在固定版本上解析 `skills.json` 并逐项核对路径，24 个清单项都存在对应的 `SKILL.md`；这只能证明清单与文件结构一致，不等于每个 skill 都有行为级测试。

风险与缺口：

- 仓内大量技能是个人/工作双 lane 的，迁入 `design-pipeline` 时要小心不要把个人宿主路径、私有边界或工作-only 内容直接带过去。
- `README` 明确说正式公开前还要过隐私与 release gate，因此它更像内部能力仓，不是天然可公开复用包。

## 2. `agent-plugins`

这是一个把 Agent Plugin 资产做成可安装、可回滚、可验证的发行仓。README 说它保存可跨 Codex 与 Claude 恢复的 Agent Plugin 资产，并且当前先从方法 Skill 开始，建立来源、运行端差异、验证和回滚边界。[README](https://github.com/Eridanus117/agent-plugins/blob/0004eb9b0a770273251e0ebb5d77c9d3365d5dbe/README.md#L1-L3)

README 还直接给出仓库目前包含的七个可安装 Plugin：`grilling`、`self-improvement`、`knowledge-maintenance`、`orchestrated-collaboration`、`adaptive-problem-solving`、`github-collaboration`、`resource-observability`。[README](https://github.com/Eridanus117/agent-plugins/blob/0004eb9b0a770273251e0ebb5d77c9d3365d5dbe/README.md#L23-L23)

它的关键特征不是“只有技能文件”，而是把完整生命周期拆开了：

- `docs/conformance.md` 把来源与许可证、公共格式、Codex 包装、Claude 包装、生命周期、产品行为、投入产出分成不同证据层级，明确说“前一项通过不能自动证明后一项”。[docs/conformance.md](https://github.com/Eridanus117/agent-plugins/blob/0004eb9b0a770273251e0ebb5d77c9d3365d5dbe/docs/conformance.md#L1-L25)
- `README` 中的 `github-collaboration` 部分把插件、入口、自然续接、决定协议、关闭前蒸馏、Project 投影这些事情都分层写清楚，说明它不是单一方法库，而是协作工作流栈。[README](https://github.com/Eridanus117/agent-plugins/blob/0004eb9b0a770273251e0ebb5d77c9d3365d5dbe/README.md#L41-L47)
- 仓库还提供安装/卸载命令、双运行端入口、以及 `tests/workflow-routing.test.ts` 这类验证入口，说明它已经不是草案，而是面向实际安装与校验的发行物。[README](https://github.com/Eridanus117/agent-plugins/blob/0004eb9b0a770273251e0ebb5d77c9d3365d5dbe/README.md#L61-L136)

成熟度判断：

- 三个仓里它最“产品化”：有清晰的安装路径、版本声明、符合性检查和测试入口。
- README 提供了足够多的发布约束，但同时也暴露出这是一个频繁更新、并且高度依赖上游协作约定的仓。
- 最近提交日期是 2026-08-14，说明它是三者里最新活跃的一个。
- 本次在 Windows、Node `26.3.1` 上直接执行 README 所列 `node tests/workflow-routing.test.ts` 等命令时，三个 TypeScript 测试入口都因 ESM 识别失败而退出；仓库根目录缺少声明 `"type": "module"` 的 `package.json`。只在临时浅克隆中补上该元数据后，三个测试全部通过，其中主测试报告 `12` 个 Skill、`7` 个 Plugin、`71` 个验收场景通过。这说明测试逻辑当前自洽，但文档承诺的开箱即跑入口在该 Node 环境下不成立。

风险与缺口：

- 版本与运行端语义耦合得很紧，迁移时如果只搬技能正文，不搬符合性检查和两个运行端的发现投影，很容易把“可安装”误当成“可用”。
- README 中大量结论建立在 `agent-control` 的外部事实和规则上，独立拿到 `design-pipeline` 时要检查依赖是否仍然成立。
- 从 `docs/conformance.md` 的表述看，这个仓很在意边界，但也意味着你不能把它当成通用插件模板直接复制，必须按目标运行端重做验证。
- 测试入口缺少明确的 Node/ESM 运行时合同；发布前应补最小 `package.json` 或改为稳定的 `.mjs`/明确 runner，并在 CI 中验证 README 命令。

## 3. `private-kb`

这是一个私域知识 Markdown 真源仓。README 直接说它是“负责人私域知识的 Markdown 真源仓”，组织方式是 `logical source → INDEX 节点链 → note`，词法索引、向量索引和编译投影都属于可重建派生物。[README](https://github.com/Eridanus117/private-kb/blob/96d4218552761876791e5d7ca5017f9fd6e429cc/README.md#L1-L3)

`sources/README.md` 给出了一张清晰的目录导航表：thinking、llm-inference-serving、career、orrery-kb、briefings 等域都通过 `INDEX.md` 作为入口，说明这是一个内容树而不是扁平笔记堆。[sources/README.md](https://github.com/Eridanus117/private-kb/blob/96d4218552761876791e5d7ca5017f9fd6e429cc/sources/README.md#L1-L26)

`migration/README.md` 说明这个仓还承担迁移 dry-run：输入 raw Markdown 与 compiled JSON，输出 target-tree、manifests 和 reports，并用 frontmatter、链接、编码、扩展字段等规则做阻塞判定。[migration/README.md](https://github.com/Eridanus117/private-kb/blob/96d4218552761876791e5d7ca5017f9fd6e429cc/migration/README.md#L1-L16)

成熟度判断：

- 这不是零散笔记，而是已经制度化的知识仓：有目录树、frontmatter 合同、迁移器、报告和测试。
- 它在“内容治理”这件事上比前两个仓更成熟，因为它显式区分了真源、派生索引和迁移产物。
- 最近提交日期是 2026-08-14，说明它也在持续维护。
- 本次在 Python `3.11+` 兼容环境执行 `python -m unittest discover -s migration/tests -v`，13 项测试全部通过，覆盖 dry-run、鲁棒性和压力测试骨架；未执行真实私域批次，也未验证后续写入阶段。

风险与缺口：

- README 写得很明确：仓库维持“私有可见性与最小读者集合”。所以它适合借鉴结构，不适合把内部知识直接外流。
- 迁移器会对 frontmatter、链接、编码和扩展字段设置阻塞条件，说明它的知识质量门槛很严格；直接拿它的内容结构过来，需要做好清洗和域划分。
- 它是私域知识仓，不是技能仓，所以更适合提供信息组织范式，而不是直接提供 agent 行为。

## 三者关系

可以把它们看成同一套能力栈的三个层次：

| 仓库 | 角色 | 产物 |
| --- | --- | --- |
| `skill-vault` | 技能源仓 | 单个 skill 的正本、lane/visibility 元数据 |
| `agent-plugins` | 插件发行与验证仓 | 可安装 plugin、manifest、符合性检查、测试 |
| `private-kb` | 私域知识真源仓 | 结构化 Markdown、INDEX 树、迁移器与报告 |

关系上，`skill-vault` 和 `agent-plugins` 更接近“执行侧”，`private-kb` 更接近“知识侧”。前者关心 agent 怎么做事，后者关心知识怎么存、怎么检索、怎么迁移。`agent-plugins` 还明确把 `knowledge-maintenance`、`issue-workflow` 这类能力和知识回填、GitHub 协作流程连接起来，和 `private-kb` 的知识真源模型天然能形成闭环。[README](https://github.com/Eridanus117/agent-plugins/blob/0004eb9b0a770273251e0ebb5d77c9d3365d5dbe/README.md#L41-L47)

## 对 `D:\projects\design-pipeline` 的潜在价值

1. `skill-vault` 值得借的是“正本 + lane + visibility + 只保留一份可写源”的仓库纪律。对设计管线来说，这能帮助你把能力、参考、输出入口分层，减少把草稿和正式能力混在一起。
2. `agent-plugins` 值得借的是“入口、包装、验证、回滚”的完整链路。对设计管线来说，这很适合做成能力卡/工具卡的发布规范，避免只有内容没有验收。
3. `private-kb` 值得借的是“目录即导航、INDEX 即入口、派生物可重建”的知识组织方式。对设计管线来说，适合把调研、规范、案例、决策和迁移报告分开管理。

如果只选一套最能落到 `design-pipeline` 的结构，我会优先引入 `private-kb` 的目录/INDEX/迁移思路，再吸收 `skill-vault` 的技能 SSOT 规则，最后参考 `agent-plugins` 的符合性与回滚边界。

## 风险总评

- `skill-vault`：可复用性高，但要防个人宿主路径和私有 lane 外溢。
- `agent-plugins`：工程成熟度最高，但依赖外部协作体系最强，移植时要重做验证闭环。
- `private-kb`：最适合做知识组织范式参考，但内容本身私域性很强，不能直接搬运。
- 横向发布面：截至固定版本，三个仓库均为 private、GitHub 元数据均未声明许可证，且都没有 tag、GitHub Release 或 GitHub Actions workflow。内部借鉴没有分发压力，但若要跨组织或公开发布，应先补内容授权/许可证、可复现测试入口和自动化发布门；当前可靠回退锚点是 commit SHA，不是 release 版本。

## 我建议的下一步

如果你要把这三个仓的思路落到 `design-pipeline`，最值得先做的是：

1. 先把 `design-pipeline` 里的知识/技能/输出三类内容分层。
2. 给每类内容建立 SSOT 与派生物边界。
3. 给任何可安装或可复用能力补一层符合性检查。

Open questions: none
