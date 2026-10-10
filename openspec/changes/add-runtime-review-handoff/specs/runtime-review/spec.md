---
status: in-review
---

# Runtime Review

## ADDED Requirements

### Requirement: Single public producer and declared identities

系统 SHALL 提供 `runtime-review build/check/record`，精确 flags、同步 exports、JSON 与路径/ownership 合同见本 change `design.md`。build SHALL 从真实读取的已选择 Playground、声明设计输入、sourceFiles 和外部 captured observation 产出 change-local 离线 HTML/Bundle；SHALL 分开保存 designIdentitySha256、sourceSetSha256、observationSha256 与原 target/snapshot/policy/receipt lineage。

#### Scenario: Accepted selection is byte-bound, not inferred

- GIVEN 已选择 Playground 的 surface/report/blueprint/state/prompt 通过现行 selection checker，designIntent 与 selection.prompt 同 path/hash，声明输入可读且相互匹配
- WHEN public build 接收 manifest
- THEN 生成可浏览页面及 Bundle，保留原 componentFirst/evidence receipt bytes，不修改选择或 ledger
- AND UI IR/tokens/code-map 仍标为声明输入，不因 selection 通过而被宣称已接受

#### Scenario: Missing acceptance or inconsistent declarations

- GIVEN pending/waived selection、prompt 不同、code-map 双hash错配或 capture 的身份绑定不符
- WHEN build
- THEN 非零结果指出具体缺口，不生成成功产物，不伪造 accepted/pass

### Requirement: Object review and concrete handoff

页面 SHALL 以 UI IR node identity 选择对象，显示确定的 source/token、capturedAt/state/viewport 与 captured runtime evidence。Observation SHALL 必需 dataMode（fixture/live/static/unknown）；页面与开发 prompt SHALL 显示「声明数据模式」及既有 evidence receipt.target.url 中的 route 上下文，不新增 route 字段。用户 SHALL 可以分别选择 Component Conformance / Visual Acceptance 反馈类别、填写 actual/expected/acceptance、复制自然语言开发 prompt、下载严格反馈 JSON。页面 SHALL 不写 target、调用 CLI、自动 record 或发布。

#### Scenario: Object-bound feedback reaches a developer

- GIVEN 一个有确定 mapping/token、captured evidence 的对象
- WHEN 用户选择对象、填写具体 actual/expected/acceptance 并 copy/export
- THEN prompt/JSON 包含同一对象、三身份及原 target/lineage，开发者可定位上下文与重核步骤
- AND clipboard 失败保留可选中的完整 prompt，类别切换不改既有验收结果

#### Scenario: Unknown mapping is honest

- GIVEN 对象 mapping 不唯一、源码未声明或位置越界、componentId 不一致、tokenRef 不唯一/不存在，或该对象没有 runtime
- WHEN 浏览对象
- THEN 显示具体 unknown/missing 原因，未确定 source/token 显示不可定位，不猜测路径、符号、token 或 evidence
- AND 无 runtime 的对象不得显示 pass；mapping.evidence 文本不作为可读取 captured evidence

### Requirement: Captured observation is never live or producer authentication

系统 SHALL 复用现行 evidence receipt 的文件/hash校验，将外部 capture 作为作者声明；hash匹配 SHALL 只说明所读字节匹配，不证明运行进程读了该源码、不证明 capture/receipt producer 可信。SHALL 不新建 runtime receipt/gate。

#### Scenario: Bound capture with an old timestamp

- GIVEN 所有 observation/evidence hash 均匹配、现行 receipt 结构合法
- WHEN review/check
- THEN 仍显示 captured 与时间/state/viewport、声明数据模式及原 target.url，不显示 live/自动持续验证；dataMode 即使声明 live 也不证明数据或运行真实性，不把图片有效或 execution complete 外推为实时生产运行

### Requirement: Current check is read-only and scoped

check SHALL 重读 Bundle 所引用 manifest、accepted design、声明文件与 evidence、原 lineage 和 HTML，返回时间点 Projection；SHALL 不写 ledger、receipts、review 或 target。匹配只覆盖声明文件集；SHALL 不推断全 repo 未变。页面 SHALL 默认显示未核验当前磁盘，仅导入 public check --json 的现行 design-pipeline.cli-result.v1/ok:true 输出，读取顶层 context（内部 result.context 已被展开），严格核 status/bundle/tuple；裸 Projection 不接受，匹配报告仍带时间点/非认证说明。

#### Scenario: A checked input changes

- GIVEN 旧 Bundle 保留曾经 passed/waived 的两类别结果
- WHEN design、source、declared path set、runtime evidence、target/policy/snapshot/parent lineage 任一变化后运行 check 并导入
- THEN 返回/显示 stale 或缺失/不可读的 blocked，当前作用域不保留旧通过；旧结果只能带旧 hash 作历史显示
- AND 不能读取当前磁盘的离线页面不声称自动发现之后的变化

#### Scenario: A foreign check report is imported

- GIVEN 报告属于另一个 bundle 或 identity tuple
- WHEN 导入页面
- THEN 拒绝将其套用当前对象，保持当前核验未知；即使匹配，也不认证报告 producer

### Requirement: Explicit record means feedback recorded, never resolved

record SHALL 校验用户反馈 identity/object/非空字段/category，调用同一只读 inspect，再保存 change-local Record 与 contextAtRecord。record SHALL 不调用 pipeline issue feedback recorder、不 advanceChange、不生成 receipt，也不把反馈转成验收或实现状态。

#### Scenario: Explicit feedback persistence

- GIVEN 正确对象/三身份/target绑定的完整反馈
- WHEN 显式运行 record
- THEN 仅新增本地 Record，lifecycle 固定 recorded；重复同反馈不覆盖原记录
- AND 当前 stale/blocked 只能附最新 Projection 作为历史反馈，不标 resolved/pass

#### Scenario: Invalid feedback has no side effect

- GIVEN 错 bundle/object/identity、空 actual/expected/acceptance、无效类别、resolved 字段或不安全路径
- WHEN record
- THEN 返回具体错误且不写入 feedback、target、ledger 或 receipt

### Requirement: Contained offline artifact and private data

所有输入与输出 SHALL 使用各自 root 的 lexical/realpath containment、文件与祖先 link 检查；SHALL 拒绝 source/evidence/output 的 symlink/junction 逃逸、不可读声明文件及输入/输出重叠。页面 SHALL 保持自包含 CSP，禁止 network/iframe/eval，转义源码、DOM/evidence、用户反馈。真实 private 内容 SHALL 不进入本工具 repo 的 docs/fixtures。

#### Scenario: Unsafe or unreadable input

- GIVEN 路径穿越/link traversal、非普通文件或不可读 declared source
- WHEN build/check/record
- THEN 明确 invalid/blocked，不跟随读取、伪造空源码/hash、忽略文件或生成可执行 evidence

### Requirement: Existing execution and two acceptance categories remain authoritative

系统 SHALL 将 Component Conformance 与 Visual Acceptance 单独投影，使用现行 ledger/receipts 记录执行进展。开发消费者 SHALL 先读同条 Record/Bundle 并 check，再修改授权 target、重新采集与 build/check；新 hash SHALL 不等于问题已解决。

#### Scenario: Real temporary-target handoff smoke

- GIVEN 实际启动的临时 target、browser capture 和生成的 review 页面
- WHEN 用户选对象/copy/export/record，开发消费者读取同条 Record 修改该 target，check 旧 Bundle，再重启 target 并 browser 新 capture/build/check
- THEN 旧 Bundle stale、新 Bundle 绑定新的观察与声明字节，两个验收类别仍分别来自原核验流程，反馈不自动 resolved
- AND 该 smoke 不以手改hash/假capture替代，不新增永久 E2E 套件；永久新增测试仅 consumer-visible 负例
