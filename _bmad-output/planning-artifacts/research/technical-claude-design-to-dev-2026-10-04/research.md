---
title: 'Claude 设计到前端开发流程增强研究'
type: technical
topic: Claude design-to-dev workflow
decision: 将窄对象级运行观察与交接候选送规格审批，不复刻客户端
source: native-luna-research-with-lead-original-source-corrections
status: complete
preset: deep
validation: high
verified_claims: 0
unverified_claims: 7
claims_total: 7
claim_counts_source: recon_kit.py tally .memlog.md
created: '2026-10-04'
updated: '2026-10-04'
implementation_approval: pending-checkpoint-1
---

# Claude 设计到前端开发流程增强研究

## 执行摘要：提交窄对象级运行观察与交接规格，等待批准

**主控已选定的建议是离线对象级review投影，而非完整设计客户端或自动同步引擎。** 它把既有设计ui-ir/tokens/code-map、明确声明的实际源文件字节，以及外部捕获的运行观察和证据放进同一可审阅入口；用户定位对象、写actual/expected、复制开发prompt或导出feedback，再显式CLI record持久化change-local对象反馈。该Record不调用原pipeline issue recorder或advance/state写入；执行进展与验收引用仍走既有ledger/state。目标是让设计意图、被审源码和被观察运行状态可定位、可追溯，不把预览或记录反馈当作验收通过。[INFERENCE] 本建议待真实smoke验证；本轮没有软件实现、用户采用或提效结果。

驱动判断的三项发现：

1. **Claude已经有设计→局部反馈→代码交接路径，不应以“只是静态预览”为竞争前提。** 当前官方帮助把Design列为Artifact template，支持设计系统导入、canvas编辑、/design-sync、/design与live prototype；历史公告描述handoff bundle。能力来自第一方声明，不是本轮实测。[1][5]
2. **“可交接”不等于本工具需要的源字节与运行状态证据。** 本轮官方资料未公布固定handoff manifest或原型与独立target runtime一致性合同；当前Design帮助明确没有version history。legacy Artifact的代码查看/复制/下载不可当作当前Design版本能力；Anthropic托管AI app也不是目标本地/部署运行验证。[1][2]
3. **本地已有gate、receipt、feedback/state/ledger，可以复用但不能夸大其证明能力。** code-map只验shape；source adapter验文件存在/contained而非内容hash；已有artifact gate可读声明source文件自身bytes检漂移；snapshot freshness要求显式current输入，不自动扫描。这里应补可见对象关联，不能再造权威receipt或把canonical hash说成producer认证。[11]

**最强反对意见：** 若团队已经维护Figma Code Connect/MCP、Storybook或PR preview，现有工具可能足够，新投影会增加重复维护。反证资料只有能力说明，没有同条件比较、采用率或收益数据，不能宣称本建议普遍更有效。[3][4][8][10][7]

**请用户决定是否批准下游规格；本轮停在BMAD Checkpoint1。** 研究完成不等于实现获批、软件优化完成或真实闭环已通过。批准对象见下游绑定，效果判断仍是推断。

## 决策与证据契约

- 读者动作：评审并决定是否批准实现；阶段：决策前研究综合，非ADR或上线验收。
- Driver：主控；approver：用户；contributors：官方资料Luna、独立反证Luna、本地接点worker与本轮原文综合；审批时点：Checkpoint1，未设承诺交付日期。
- 范围与批准依据：[brief.md](brief.md)、[plan.md](plan.md)保持原样；没有扩大新研究。
- 语域：中性技术〔待用户确认语域〕；文档结构采用decision型研究报告，方法记录见[综合计划](digests/synthesis-method.md)。
- 外部事实只来自本轮source digests；本地接点单列；匿名体验不作Anthropic事实或公开用户研究。没有纳入可识别private target的名称、路径、URL、截图或摘录。
- Luna先经搜索取摘要，浏览器直接导航timeout；lead随后原文read成功，本综合worker再次读取native或.md全文。取得原文纠正了摘要覆盖范围，但仍同发布者，不是high要求的独立交叉验证。
- frontmatter counts来自本次更正后的脚本tally：8条claim entries按相同numeric ref最后状态生效，得到7个有效ledger claims，均unverified，verified为0；ref=7的新日期记录取代旧日期，不增加有效claim。这不是独立来源数或所有正文句子数。**原文措辞有支持、跨来源验证未完成、产品未实测可以同时成立。** 不升级关键版本/兼容/性能状态。

## Findings：能力、交接与运行对象边界

### 1. 当前产品形态不能由历史公告或旧Artifact摘要替代

当前Design帮助称它是Artifact template之一，beta适用Pro/Max/Team/Enterprise；前三者默认启用，Enterprise需owner启用。web/desktop可canvas编辑；Code可使用/design，移动端可请求/查看但canvas编辑和sharing要web/desktop；独立claude.ai/design仍工作且有单独设置。这些是本轮读取的官方声明，当前版本/兼容仍unverified。[1]

2026-04-17公告描述从codebase/design files建立design system，经inline comments、direct edits、custom sliders细化，export与Claude Code handoff bundle；页面modified_time为2026-09-09，不是重新发布日期。这份公告提供历史能力背景，不能当作当前产品总况。[5]

当前Artifacts帮助明确：legacy是2026-09-16前在chat创建的artifacts，不能新建但可继续publish/share；code view/copy/download在文档中明确属于legacy，新templates采用canvas/page与export。新artifacts storage不需publish，旧“开发时storage不成功”只适用legacy。旧摘要的version selector不再支撑当前版本功能。[2]

Design帮助正文允许另存当前方向再探索，但Known limitations明确“Claude Design doesn't have version history yet.” 两者不矛盾：另存方向不是可审计版本历史。不要以legacy version selection证明当前Design有版本历史。[1]

### 2. 交接入口已说明，内部一致性合同没有由本轮资料建立

/design-sync可从GitHub、design files、raw uploads或local codebase带入design system；/design可把design导入codebase、把code导出live prototype或构建实现。帮助还宣称使用真实设计系统组件、检查自己的输出并修正。本轮没有验证其检查与本工具Component Conformance等价，也没有证实导入后所有状态覆盖。[1]

“handoff bundle”“keeping your work synced”和“live prototype”描述交接/工作流能力，**本轮所读资料没有给出**固定manifest、必含文件名、source/version锁定或设计→源码→独立目标runtime一致性证明。[1][5] 这不是“产品绝对没有这些能力”的结论，也不是要求猜造bundle schema。

Artifacts帮助称调用Claude的AI app运行在Anthropic infrastructure；Code artifact可把session output发布为private URL的live interactive page并随session更新。因此当前Claude不能统一概括为static preview；但这些运行对象也不能自动成为用户独立应用的数据、API、权限、路由或部署验证对象。[2]

### 3. live evaluator可作历史方法背景，不支持当前性能结论

Anthropic 2026-03-24工程文章报道给evaluator Playwright MCP，直接导航live page、截图和critique，再反馈generator；作者也报道偏好可能更喜欢中间版本，复杂度会增加。它是一个第一方历史实验，超过本计划AI workflow三个月窗，非当前Design特性承诺、独立复现或性能证据。[6]

[INFERENCE] 可借鉴的是“行为问题要观察相应interactive运行对象”，而不是自动多轮评分必然更好。不得从这篇文章推出本候选降低工时、提升采用或改善缺陷率。

### 4. 本地接点：已有治理，缺口是对象级可审阅关联

以下仅本地实现证据，不推导外部产品事实；详细源码位置与调查实测口径见[local-integration digest](digests/local-integration.md)。[11]

| 环节 | 可复用事实 | 不能冒充的保证 |
| --- | --- | --- |
| 设计输入 | tokens验证、code-map包含renderedId/sourcePath/坐标/component/tokenRefs；Playground有selection/surface/report/integration hash链 | code-map不读取source/token/evidence实际bytes；既有surface strict keys不原生接受对象反馈新增字段 |
| 实际源文件 | artifact gate对metadata.path指向的contained文件read bytes并比artifact_hash，漂移stale | input_hashes只格式；必须每个声明actual source自身metadata，明确target root，不是摘要hash或自动全仓watcher |
| 实现/运行证据 | source adapter检查exists/isFile/realpath；page使用与screenshot绑定；evidence loader读取PNG/hash/解码；既有component/execution receipts | 源存在、PNG有效、rendered:true、production scope或execution complete都不证明live data或指定route/state已执行 |
| freshness与验收 | v2 target/snapshot/policy/input/parents/expiry lineage，显式current比较，visual维度独立 | 不自动scan源码，不认证producer，不从hash一致推出resolved |
| feedback与state | 已有feedback record、CAS advance、control ledger及package；record不自动advance | 当前feedback无typed对象级target/snapshot字段；package不自动消费external-source检查，须显式链接existing state evidence |

### 5. 匿名体验输入：仅问题形成，不是产品结论

既有匿名桌面观察提示“呈现的设计系统与已导入来源可能不同步”这一审阅问题；它没有证明同步机制、自动刷新或运行一致性，不能外推所有当前Claude为静态。原始私有证据保持会话级，不进入本目录；最终推荐不靠该样本证明市场需求或效率。

## Cross-dimension insights：值得补的是证据语境，不是再做预览

[INFERENCE] 外部能力说明已经覆盖设计生成/上下文传递，本地已有治理合同，反证工具也已有组件/部署预览；三者结合后，本候选的可辩护差异是**对象审阅时能同时看到设计意图、实际声明source bytes和特定运行观察的语境**。[1][2][3][4][7][8][10][11] 这不是已证实的竞争优势。

[INFERENCE] “源hash没变”和“观察仍有效”是不同问题：同样源码可能在不同数据/route/state/viewport呈现不同结果，所以反馈需要显式环境元数据；反过来截图相似也不能证明交互正确或源码对应。canonical lineage解决引用归属的一部分，不解决人类接受与producer可信度。

## Contrary evidence：哪些情况下现有工具已经够用

独立反证见[contrary-evidence.md](digests/contrary-evidence.md)；只用本轮六份官方资料，不读取本地实现或private target。它限缩“runtime handoff普遍优先”而非证明相反选项普遍更有效。

- Figma Dev Mode提供设计检查、代码相关信息、frame版本比较和开发就绪/注释；若问题主要是规格传递，已有流程可能已覆盖。[3]
- Figma MCP提供设计上下文与所述生成/画布工作流；Code Connect在已配置前提下可传实际组件映射、导入与props。没有本团队采用/覆盖证据，不能默认现状已有或已解决runtime差异。[4][8]
- Storybook story描述给定参数下组件状态，可足够回答隔离组件变体问题；Vercel Preview支持分支/PR独立运行URL用于QA/协作，可直接作为实现检查对象，不一定需要另一预览通道。[10][7]
- Playwright说明视觉基线需显式更新/审阅，渲染会受OS、版本、设置、硬件等环境影响。它证明基线有环境约束，不量化维护成本，也不证明快照比较不值得。[9]

| 同一权衡维度 | 维持已有设计/组件/PR预览 | 选定窄对象review投影 | 完整客户端/自动同步 |
| --- | --- | --- | --- |
| 已有能力覆盖 | 文档已有上下文、映射与预览能力，实际采用未知 | 只补对象定位与证据语境，效果待smoke | 本轮无实施必要性证据 |
| 维护面 | 不新增工具；仍要维护映射/状态 | 多维护声明sources、captured observations与stale归属 | 将增加画布/运行/同步等职责，超出本次批准问题 |
| 证据边界 | 预览不天然建立design/source/运行归属 | 可显式呈现归属但不是验收或认证 | 未知完整产品合同，不可假设 |
| 选择与限制 | 若已足够，优先维持 | 主控选为待批候选；收益[INFERENCE] | 本轮不做 |

本轮没有比较工时、成本、缺陷率、采纳率或同条件结果，不能量化哪种更有效、更快或更便宜。批准应基于清晰问题与可验smoke，而非无证据收益。

## Recommendations：冻结窄候选与审批边界

### 选定候选：offline object review + explicit handoff

[INFERENCE] 建议以现有设计对象为索引，离线展示：

1. **Expected**：现有ui-ir、tokens、code-map及design snapshot，不新增第二套设计真相源。
2. **Source**：明确声明集合中的actual implementation source files及其自身bytes/hash；复用既有字节freshness能力，root明确且路径contained。不把code-map shape或input_hashes当已验证source；sourceSet内容身份与原captured acceptance lineage分离，不暗示扫描未声明源码或认证整个target。
3. **Actual**：外部工具captured observations与evidence引用；携带target、dataMode（fixture/live/static/unknown）、route、state、viewport和captured来源/时点。不声称投影自带浏览器、现场运行或receipt producer认证。
4. **用户操作**：定位对象并填写actual/expected；复制开发prompt或export feedback；用户显式CLI record将change-local对象反馈持久化为Record。其严格形状与contextAtRecord由OpenSpec design.md定义；不调用原pipeline issue recorder，不调用advanceChange，不写state.json/events.jsonl，不生成receipt；页面离线操作本身不写回。
5. **陈旧与接受**：source/design变化标stale并要求刷新关联；缺观察/元数据保持unknown，不默认live或resolved。新sourceSet/build不使原captured-lineage验收自动变成当前验收；旧报告不因新hash被倒推通过。Component Conformance与Visual Acceptance继续分别出证据，执行进展/验收引用仍走现有ledger/state。

**信心基础：** 输入/反馈/交接模式有第一方声明与本地接点支持；具体方案适用性是研究推断，当前性能/兼容、采用与效果unverified。[1][5][11] 不依赖未知Anthropic bundle格式，也不要求改其他目标项目。

### 触达资产与下游绑定

| 资产 | 关系与scope | 风险、验证与退出 |
| --- | --- | --- |
| openspec/changes/add-runtime-review-handoff/ | 消费本报告，定义离线对象review、source freshness、显式feedback handoff及独立验收 | 避免另造gate/receipt或声称现有strict schema已接受新字段；只有用户批准后进入实现。规格未批则不改runtime |
| _bmad-output/implementation-artifacts/spec-runtime-review-handoff.md | BMAD实现合同与Checkpoint1批准对象；行为与验收以该规格为准 | 本报告不是批准；Main执行独立semantic review并呈现人审。真实smoke未完成不得宣称闭环 |
| change-local对象Record与既有治理接点 | Record只保存对象反馈及record时projection；Playground/artifact/state/receipt仍承载既有治理与验收引用 | 不调用原pipeline issue recorder或advance/state写入；逐声明source bytes身份与captured acceptance lineage分离，不由projection伪造resolved或重新认证当前验收 |

### 待批准后的成功标准（不是本轮结果）

Owner为获用户批准后的实现负责人；Main负责最终验收。至少一次真实入口smoke应：

- 从指定设计snapshot和声明sources生成/打开离线对象review；能定位ui-ir/token/code-map对应对象。
- 在明确target、route/state/viewport/dataMode捕获实际观察及证据，填写actual/expected，复制prompt/export feedback，并显式CLI record成功持久化change-local对象Record；验证它不调用原pipeline issue recorder、不advance、不改state.json/events.jsonl、不生成receipt。
- 对真实声明source执行一次修改，旧metadata/投影显示stale；design输入变更也不得沿用旧接受。刷新后保留新旧归属，不自动resolved。
- 开发者按该反馈修订实际源码后，在相应运行对象复查；分别完成现有Component Conformance与独立Visual Acceptance，并把已有reports/receipts通过state evidence连到package。
- fixture与live不可混称；缺失证据不能判pass；验证失败保留问题，不借receipt/hash或“record成功”宣称修复完成。

这些标准验证端到端可用行为，不证明效率提升；尚未执行。新功能tests/QA/真实smoke属于审批后工作；Main报告既有repository QA已通过，不是未实现的runtime-review验收。本slice只执行文档机械验证。

### Non-Goals

不复刻Claude客户端、画布协作或分享；不建renderer、自动watcher/双向同步、评分系统、parallel gate/receipt；不推断resolved或认证producer；不证明生产可用性、完整无障碍或运行等价；不修改/披露private target；不声称市场采用、性能或提效。

## Open questions：批准时必须看见的未知

| 未解项 | 本轮结论与需要的证据 | Owner/时点 |
| --- | --- | --- |
| 实际现有工具是否已足够 | 未核实团队Figma/CodeConnect/MCP/Storybook/PR preview采用与痛点；需真实工作路径举出未覆盖差异 | 用户与Main，批准前/首个smoke范围确认 |
| 当前Design版本/兼容性与内部bundle | 只有第一方帮助声明；无固定manifest和runtime parity证明，不依赖其内部格式 | 若要集成该产品，另需明确兼容与独立来源/实测；本次不扩大 |
| 外部observations语境可靠性 | 指定source bytes和screenshot完整不证明capture现场与live；需保留capture来源、route/state/viewport/dataMode | 规格负责人冻结边界；实现后smoke |
| 对象Record合同（已定义，待人审） | 不再是沿原feedback schema持久化的开放问题：OpenSpec design.md已定义change-local Feedback/Record与contextAtRecord；Record不写原issue recorder/advance/state。实施前按该明确合同Approve，不再猜existing feedback typed字段 | 用户审批下游规格；实现后验证写入边界 |
| 收益与维护成本 | 无比较结果，不能设已经达成提效；真实使用后才有评估依据 | 用户决定是否值得实现；本轮不承诺数字 |

## Source appendix

全部accessed为2026-10-04。编号对应本轮digests；“原文支持”只指声明/措辞，不等于产品实测或high跨发布者验证。不同产品发布者反证不能交叉证明Claude特定版本/性能。第11项只本地实现，不能用于外部产品事实。

| 编号 | 支持的claim/finding与digest | 发布者/来源 | pub date | accessed | confidence / verification |
| --- | --- | --- | --- | --- | --- |
| [1] | 当前Design template、导入/handoff与无version history；digests/claude-design-get-started.md | [Claude Help Center — Get started with Claude Design](https://support.claude.com/en/articles/14604416-get-started-with-claude-design) | 未标注 | 2026-10-04 | 第一方全文支持；当前兼容/效果unverified，非实测 |
| [2] | legacy/new、code/export/storage边界与Anthropic runtime；digests/artifacts-edit-version-runtime.md | [Claude Help Center — Artifacts](https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them) | 未标注；旧索引日期废弃 | 2026-10-04 | 第一方全文支持；跨publisher/current兼容unverified |
| [3] | 现有设计交接替代；contrary-evidence S1 | [Figma Learn — Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode) | 未标注 | 2026-10-04 | 官方能力说明；采用/相对价值未验证 |
| [4] | 设计上下文与MCP工作流；contrary-evidence S2 | [Figma Developer Docs — MCP](https://developers.figma.com/docs/figma-mcp-server/) | 未标注 | 2026-10-04 | 官方能力说明；非runtime parity证明 |
| [5] | 历史design system/feedback/export/bundle；digests/claude-design-announcement.md | [Anthropic — Introducing Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs) | 2026-04-17；modified 2026-09-09 | 2026-10-04 | native原文支持，历史窗外；unverified |
| [6] | 历史live evaluator方法与局限；digests/anthropic-live-frontend-evaluation.md | [Anthropic Engineering — Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps) | 2026-03-24 | 2026-10-04 | 单历史报告；窗外，独立复现/当前效果unverified |
| [7] | 分支/PR Preview替代；contrary-evidence S6及原文更正 | [Vercel — Environments / Preview](https://vercel.com/docs/deployments/environments#preview-environment-pre-production) | publication未标；本次alternate last_updated 2026-09-17，旧获取2026-02-27差异保留于digest | 2026-10-04 | 第一方能力声明；版本/效果unverified，非实测或high交叉验证 |
| [8] | 已配置组件映射；contrary-evidence S3 | [Figma Developer Docs — Code Connect integration](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/) | 未标注 | 2026-10-04 | 依赖已配置Code Connect；采用/覆盖未知 |
| [9] | baseline更新/渲染环境约束；contrary-evidence S4 | [Microsoft Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots) | 未标注 | 2026-10-04 | 文档约束有支持，不量化成本 |
| [10] | 隔离组件状态替代；contrary-evidence S5 | [Storybook — How to write stories v9](https://storybook.js.org/docs/9/writing-stories/index) | 未标注 | 2026-10-04 | 官方版本化文档；当前v9兼容未验证 |
| [11] | 本地CLI/mapping/source/artifact/state/receipt边界；digests/local-integration.md | [本地接点worker与源码引用](digests/local-integration.md) | 不适用：本轮只读实现 | 2026-10-04 | worker源码阅读证据；非运行smoke/外部事实 |

## Staleness map：哪些结论已经过窗，何时再验

从ledger最新dated claims提取，重复历史记录合并；被原文纠正的Artifacts indexed日期排除。输入[staleness-claims.json](digests/staleness-claims.json)，真实脚本输出[staleness-result.json](digests/staleness-result.json)。按technical pack映射：versions/compatibility 1mo、AI landscape 3mo、patterns 24mo；未知pub_date不填访问日。Vercel日期明确是last_updated代理而非publication，结果不证明版本兼容。

| Claim/class | 日期基准 | 脚本re-check | 本轮解释 |
| --- | --- | --- | --- |
| [5] announcement / landscape_ai 3mo | pub 2026-04-17 | 2026-07-17；stale=true | 只历史背景，modified不自动刷新publication窗 |
| [6] evaluator / landscape_ai 3mo | pub 2026-03-24 | **2026-06-24；stale=true** | 最早重验日已过；不得拿作当前性能/功效证据 |
| [7] Preview pattern / patterns 24mo | 本次alternate last_updated 2026-09-17（非publication） | 2028-09-17；stale=false | 取代初始获取2026-02-27日期；只pattern日期代理，非当前运行版本/兼容认证 |
| [1][2] 当前帮助页与版本/兼容 | pub未知，访问2026-10-04 | 无法从pub_date计算 | [INFERENCE] 批准前立即重读；建议访问后7d（2026-10-11）复核；若30d后仍消费，最迟2026-11-03重读，不冒充pack计算 |
| [3][4][8][9][10] 未标日期官方文档 | pub未知 | 无法计算 | 能力/模式按本轮访问快照使用；若依赖版本、权限或适配，先重验；Storybook v9不默认为当前版本 |
| [11] 本地接点 | 本轮源码读态 | 非外部时效计算 | 实现有变化时重查source/contracts；不因本报告complete自动保持fresh |

staleness命令exit=1是发现两条stale的预期结果，不是研究脚本故障；**全表最早re-check为2026-06-24，已过期，当前应立即重验才可用于当前效果判断。** 未标日期帮助页的7/30d建议是审阅判断，不是补造发布日期。需刷新时使用Refresh/Deepen，只刷新需要消费的claim，不扩大本次已完成研究范围。
