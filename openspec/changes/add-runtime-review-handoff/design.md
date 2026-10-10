---
status: in-review
---

# Design：薄对象 review / handoff

## 决策与证据

读者：审批者、core/CLI 实施 agent、六个月后的维护者。动作：按已批准单一行为合同实施、审查与验收。用户已在 CHECKPOINT 1 明确 Approve，主控据此放行；以下详细接口仍是唯一合同，人类 CHECKPOINT 2 尚待，不因实现或核验记录自动接受。

实现前基线观察：`cli-core.cjs:1716–1820` 没有 `runtime-review` namespace；dispatch/execute 同步、使用现行 `design-pipeline.cli-result.v1`。`playground-core.cjs:437–518` 的 selection 检查核验实际 HTML、blueprint、browser report、canonical selected state 和 prompt；waiver 不是 accepted selection。`interoperability-core.cjs:128–144` 只验证 code-map shape。`artifact-core.cjs:89–119` 可读取单个 metadata.path 的真实字节，但不读取 input_hashes 对应输入。`component-first-v2-core.cjs:108–123,166–207` 保留 target/snapshot/policy/input/parents/expiry；current 比较依赖调用者传入，不能自动发现源码变化。

选择专用 `runtime-review-core.cjs` producer + read-only inspect + record，CLI 只接线。与完整 live 客户端相比，它无需 target 注入、常驻进程或新的信任边界；代价是证据不会自行刷新。与套用 Playground 相比，它不新增 preset/调参状态、不改变原 CSP 或 selection authority；代价是只做对象浏览与反馈。六个月维护目标：一个 core、一个详细字段合同、现行工具复用，没有第二套 gate/receipt 或全局状态。

## Public CLI / core 共享合同

公共入口为 `node skill/scripts/designer-pipeline.cjs`；下列 flags 是各 action 的完整 allowlist（另接受公共 `--help/-h`）：

```text
runtime-review build  --change-root <dir> --manifest <file> [--root <workspace>] [--json]
runtime-review check  --change-root <dir> --artifact <review.json> [--root <workspace>] [--json]
runtime-review record --change-root <dir> --artifact <review.json> --observation <feedback.json> [--root <workspace>] [--json]
```

`--root` 默认 cwd，沿用 rootFrom；changeRoot 必须已存在并包含于 root。上述 file flags 相对 changeRoot 解析，不能直接套用相对 workspace 的 artifact helper。`--observation` 在 record **仅指对象 feedback**，不是运行 capture。没有 `--write`、隐式 action、`--replace`、自动打开浏览器或发布开关。重复、缺失、跨 action 多余参数按现行 CLI error 返回。

core 只导出三个同步函数；CLI 不读取/写入产物内容、不实施业务校验，也不修改全局 dispatcher 同步模型：

```js
buildRuntimeReview(changeRoot, { projectRoot, manifest, now? })
inspectRuntimeReview(changeRoot, { projectRoot, artifact, now? })
recordRuntimeReviewFeedback(changeRoot, { projectRoot, artifact, observation, now? })
```

projectRoot 是 CLI 已解析的 root；manifest/artifact/observation 是 change-relative 字符串；now 仅供确定性测试注入 ISO 时间，public 不暴露。core 返回固定字段 `{status, artifact, html, context, findings, feedbackPath}`：路径是 change-relative 字符串或 null；context 是下述 projection 或 null；findings 为 `{code, path, message}` 数组，不放源码或私有绝对路径。status 为 `built | matched | stale | blocked | recorded`。CLI `{result, exitCode}` 映射 built/matched/recorded→0，stale/blocked→2；非法 schema/参数/路径抛现行 fail→1；由 execute 封装现行 JSON，不新增外层 envelope。`ok:true` 的 stale/blocked 不等于验收通过。

build 写入 `runtime-review/<manifest.id>/review.json` 和 `index.html`，目录存在就拒绝，不覆盖旧 review。预检失败无成功产物；临时构建仅在目标目录的安全兄弟目录，失败移除自身临时文件，不触碰旧文件。check 只读，JSON 结果由使用者自行保存后在页面以本地 file input 导入。record 只写 `runtime-review/feedback/<feedbackHash>.json`，既存相同 feedback 返回原路径、不覆盖；feedbackHash = sha256(canonicalJson(feedback))，不是 receipt。

## 输入 JSON、路径与 ownership

所有新形状采用 draft-2020-12、`additionalProperties:false`（每层），下表所有字段 required，除明确 `?`；非空字符串、时间 date-time、SHA 为 64 位 lowercase hex。Ref = `{path,sha256}`；path 是非空 forward-slash literal relative file path，拒绝绝对路径、drive/UNC、`..`/`.`/空段、NUL、glob。文中 `snapshotDigest` 保留现行 `sha256:<hex>` 格式，不能改成新的 sourceSet digest。

参考 schema 文件为 `skill/references/runtime-review.schema.json`，以 `$defs` 定义以下 Manifest/Observation/Bundle/Projection/Record；`runtime-review-feedback.schema.json` 定义 Feedback，复用前者 `$defs`。不在 CLI 再定义简化 schema。

| 形状 / owner | 精确字段与语义 |
| --- | --- |
| Manifest / 开发 agent 或用户 | `schema:"design-pipeline.runtime-review-input.v1", id, acceptedDesign, designIntent, uiIr, catalog, tokens, codeMap, componentFirst, sourceFiles, runtimeObservation`。id 为 `[a-z0-9][a-z0-9-]{0,63}`。acceptedDesign = `{kind:"playground-selection", artifact:Ref}`；其余 designIntent/uiIr/catalog/tokens/codeMap/componentFirst/runtimeObservation 为 Ref，均相对 changeRoot。sourceFiles 为非空、path 唯一的 Ref 数组，**仅此数组相对 componentFirst.target.root**。 |
| Observation / 外部运行采集者 | `schema:"design-pipeline.runtime-review-observation.v1", mode:"captured", dataMode, capturedAt, targetIdentityDigest, snapshotDigest, policyDigest, designIdentitySha256, sourceSetSha256, evidenceReceipt:Ref, objects`。dataMode 必需，enum `fixture | live | static | unknown`，仅为采集者声明，不证明 live 数据或运行真实性。evidenceReceipt.path 相对 changeRoot；指向现行 evidence receipt，绝不创建另一种 runtime receipt。objects 非空、renderedId 唯一，每项 `{renderedId,state,actual,evidenceKeys}`；state/actual 为非空文本；evidenceKeys 是非空唯一数组，只允许现行 ARTIFACT_KEYS 中在该 receipt 非 null 的项。全体对象沿用 receipt 的 viewport；route 上下文仅展示 receipt.target.url 中已有信息，不新增 route 字段。 |
| Feedback / 页面用户 | `schema:"design-pipeline.runtime-review-feedback.v1", bundleSha256, objectId, designIdentitySha256, sourceSetSha256, observationSha256, targetIdentityDigest, snapshotDigest, policyDigest, category, actual, expected, acceptance`。objectId 是所选 renderedId；category 仅 `component-conformance | visual-acceptance`；actual/expected 非空；acceptance 是非空非空字符串数组。不得有 resolved/pass/status、任意路径或命令执行字段。 |

### 三类身份不能混淆

1. **designIdentitySha256** = sha256(canonicalJson({playgroundReceiptSha256, selectionStateSha256, surfaceSha256, surfaceContractSha256, promptSha256, blueprintSha256, verificationReportSha256, uiIrSha256, catalogSha256, tokenSha256, codeMapSha256}))。前七项取实际文件字节/现行 checker 的 canonical state/surface contract；其余四项 UI IR/catalog/tokens/code-map 声明输入另行读取字节。designIntent 必须与 receipt.selection.prompt **同 path/hash**，指 selected prompt，不暗示任意 DESIGN.md 已 accepted。先调用 checkPlayground(changeRoot,{artifact,stage:"selection"})，只接受 ready/applicable true/selected；不能重做选择或写 state。receipt/report/自定义 blueprint 路径都由既有合同解析，builtin blueprint 由包内既有引用解析。
2. **sourceSetSha256** = sha256(canonicalJson(sourceFiles 按 path 排序后的 Ref 数组))；每个 sha256 必须等于当前实际读取 bytes。声明数组就是覆盖范围，不扫描整个 repo，也不声称未声明文件、依赖、构建产物或服务端环境未变化。逐文件读取一次，复用已读字节用于 hash 和显示。
3. **observationSha256** = runtimeObservation 文件实际字节 hash；还需校验现行 evidence receipt 及全部非 null evidence 的实际文件/hash。evidence files 相对 receipt 所在目录。调用现行 validateReceipt 的 requireFiles，同时执行更严格的路径保护。observation.capturedAt 必须与 evidence receipt 的非 null capturedAt 一致，viewport 只取该 receipt。PNG screenshot 使用已有 pngDimensions 验证；其它 evidence 只按转义文本/不可执行附件显示。capture 的 target/snapshot/policy/design/source 集合绑定必须一致；这仍是采集者的声明，不认证真实执行、producer 或运行时使用了当前 disk bytes。

componentFirst Ref 指现行 `component-first-gate.v2` 文件。复用 checkV2Artifact 与 targetDigest/policyDigest；非法或 stale/expired lineage 拒绝新 build。完整保存其原始 UTF-8 bytes 及 Ref，不重签/改写 receipt、parentReceiptHashes、inputDigest、expiry、target/snapshot/policy。conformance blocked/not-evaluated 不阻止生成问题 review，但不得升级为 pass。target.root 相对 projectRoot，必须 contained；现行 snapshotDigest 原样保留，**不把 sourceSetSha256 填回 snapshotDigest**。

code-map 必须先复用 validateDesignCodeMap，再确保 uiIrSha256/tokenSha256 等于读到的 UI IR/token bytes。UI IR 用显式 catalog Ref 调用 validateUiIr；tokens 用 validateTokens。对象集合以 UI IR nodes[].id 为准；observation 未知 renderedId 拒绝，不生成虚构对象。一个 renderedId 没有唯一 mapping、sourcePath 未声明、line/column 超出读到的 UTF-8 文件位置、componentId 与 node 不同、tokenRef 找不到唯一 `$value` token，均显示该对象 `unknown` 和具体原因，不能猜 source/token。tokenRefs 解析为 token 树叶节点的 dotted key（沿用 `color.accent` 示例）；含点 key 导致同名冲突也为 unknown。可显示已经确定的部分，但必须分别标记；componentId 只是声明标识，不声称源码符号已认证。mapping.evidence 保留为声明文本，不自动读取任意路径、不等同于 captured evidenceKeys。

## Bundle / check projection / record

Bundle 的严格字段：`schema:"design-pipeline.runtime-review.v1", id, builtAt, manifest:Ref, inputs:Manifest, identity, componentFirstBytes, observation:Observation, evidenceReceiptBytes, sources, objects, evidence, html:Ref, bundleSha256`。

- identity = `{designIdentitySha256,sourceSetSha256,observationSha256,targetIdentityDigest,snapshotDigest,policyDigest}`。
- sources 每项 `{path,sha256,text}`；UTF-8 不可解码不是可读源码。objects 每项 `{renderedId,componentId,mapping,sourceStatus,tokenStatus,tokenValues,runtime}`：mapping 为原 mapping 或 null；sourceStatus/tokenStatus 均 `{status:"matched"|"unknown",reasons:string[]}`；tokenValues 为 `{ref,value}` 数组；runtime 为原 observation object 或 null。无 runtime 的对象显示 missing，不显示 pass。
- evidence 每项 `{key,path,sha256,mediaType,content}`，PNG 为 base64、mediaType `image/png`；其余 UTF-8 为 `text/plain`；不可解码的二进制为 base64、`application/octet-stream`，仅下载，禁止执行/HTML渲染。path 相对 evidence root，key 为现行 ARTIFACT_KEYS。componentFirstBytes/evidenceReceiptBytes 均保存既有文件原始 UTF-8 字符串，后者提供原 capturedAt/viewport；observation 是原运行观察。inspect 重读并核各 Ref/hash，bundle 的 evidence 不成为新 receipt。
- 定义 ReviewBody = Bundle 去掉 html、bundleSha256；bundleSha256 = sha256(canonicalJson(ReviewBody))。HTML 内嵌 ReviewBody + bundleSha256，可直接选择对象/导出，无额外 JSON 加载。随后计算实际 HTML bytes，写 html Ref（path 是 change-relative index.html）。check 同时重核 body digest、HTML hash及嵌入 body 的一致性；html hash 不纳入 bundleSha256，避免 self-hash 循环。这是内容身份而非签名。

Projection 的严格字段：`bundleSha256, checkedAt, identity, observed, freshness, componentConformance, visualAcceptance, findings`；identity 为 bundle 的 tuple；observed = `{designIdentitySha256,sourceSetSha256,observationSha256}`，不能计算的项为 null；freshness = `matched | stale | blocked`。两个 acceptance 值分别 `{status,scope,reason}`；Component status 为 `passed | blocked | invalid | stale`，Visual status 为 `passed | waived | not-evaluated | stale | blocked`，原值来自既有 checker/visualAcceptance；scope 只能 `captured-lineage | current-not-verified`。
检查顺序：先验证 bundle结构及安全路径，再比较实际bytes与各Ref，再调用现行shape/lineage validators。已引用文件内容漂移优先记stale，不能被下游hash/JSON解析异常改报为通过；缺失/不可读记blocked，危险路径/原始bundle非法为invalid。多个finding时优先级 invalid > blocked > stale > matched。observed.sourceSetSha256用实际重读的source Ref（实际hash）重算，不能复用manifest手填hash；无法解析的改变输入其observed项为null。captured-lineage结果始终仅表示「既有receipt记载的结果，review未重新验收」，新sourceSet/build也不让它自动成为当前验收。
inspect 从 bundle.manifest.path 重读当前 manifest 和全部声明输入，重算上述三身份、html/body hash、原 componentFirst Ref 与 checker。任何字节、路径集合、target/policy/snapshot/parent lineage 或 accepted state 变化为 stale；缺失/不可读为 blocked；非法 schema/path 为 invalid error。旧 acceptance 为 passed/waived 时，若当前不匹配则返回 status stale、scope current-not-verified，原状态仅可作为带旧 hash 的历史展示。匹配时仅投影既有 captured-lineage 结果，不生成新的验收结果。首次 build 的页面显示 captured/未核验当前磁盘；仅导入 public `runtime-review check ... --json` stdout 保存的 `design-pipeline.cli-result.v1` 文件：要求 ok:true、顶层 status 属 matched/stale/blocked、顶层 context 为严格 Projection，并匹配 context.bundleSha256 与完整 identity tuple。dispatch 内部 result.context 经 execute/jsonResult 展开成 public 顶层 context；不得期待另一套嵌套result envelope，也不接受裸 Projection。导入后只显示「CLI 报告：matched/stale/blocked at checkedAt」，报告未经 producer 认证，时间点后可能变化，永不标 live 或无范围 verified。离线页面不能自行发现之后的磁盘变化；必须重新 check/import，不伪造自动 stale。

record 先执行同一 inspect，核 feedback 所有 identity 与 bundle、objectId、非空字段/category；bundle 结构/HTML损坏或缺失、输入路径不安全时拒绝写入。当前上下文 stale/blocked 仍可作为**历史观察**记入，但固定附上最新 projection，绝不标 resolved。Record 的严格字段是 `schema:"design-pipeline.runtime-review-record.v1", feedback, contextAtRecord:Projection, recordedAt, lifecycle:"recorded"`。写入成功仅表示本地反馈保存，不调用 advanceChange，不改 state.json/events.jsonl，不产生 receipt。开发 agent 读取 Record + Bundle，重新 check；如果不匹配先 refresh/rebind，不能按历史源码位置盲改。用户授权的 target 修复完成后，外部重新采集、更新 manifest.id、build/check，再用既有 ledger/receipts 核验；不能复制旧报告当新结果。

## 页面与安全边界

单页对象列表、source/token、captured evidence、category/actual/expected/acceptance 输入、copy prompt、export feedback。选择对象可用键盘；选择变化更新上下文；用户输入只有当前页面内存，无 localStorage、网络请求、服务端写回或自动执行。页面及自然语言开发 prompt 必须显示「声明数据模式：dataMode」，并注明非认证；即使该值 live，review.mode 仍 captured。route 上下文只取已有 evidence receipt.target.url 的原文本，不推断/增设 route 字段。prompt 另包含所选对象、原 target/lineage、三身份、state/viewport/capturedAt、映射确定性、用户三个反馈字段、重核/重建步骤，数据作为引用内容，不作为可执行指令；clipboard 失败保留可选中的完整文本。export 以本地 Blob 下载 JSON，Feedback 以 observationSha256 关联 Bundle 中原 dataMode/URL，不重复新增这些字段。缺 feedback 字段不可导出，类别切换不能更改既有验收结果。

CSP 采用自包含静态资产与 hash-bound script/style；至少 `default-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; img-src data:`，不允许 unsafe-eval、外部依赖或 iframe。所有源码、token、evidence、feedback 与 prompt 按不可信文本处理；textContent/安全 JSON 编码，阻断 `</script>` 注入，不把 DOM evidence 当页面执行。无需 Playground 的 3–5 presets，不注册为新的 Playground kind。

每次读取/写入分别约束 projectRoot、changeRoot、target root、evidence root；复用 resolveInside，且检查现存每级祖先、最终文件及创建前已有父目录，拒绝 symlink/junction/reparse 逃逸或 link traversal，普通 contained 文件才能读取。输出/feedback 不得与任一输入重叠，不改 target source，不跟随输出路径替换。不可读 declared source 返回 blocked，不伪造空字符串/hash或忽略。隐私：真实 private target 的文件、截图、prompt、绝对路径不得落 design-pipeline repo 的 docs/fixtures；用户应选其外部 workspace/changeRoot，提交的测试只有合成数据；没有上传或发布。

## 分工、验证与触达资产

core owner 实施 core + 两 schema + 专用 reference + consumer-visible 负例；CLI owner 只实施 import/allowlist/help/三个 handler、现行 packaging/test manifest 和用户入口文档接线。source/hash helper 属 core，不复制到 CLI。上述 exports/flags 让两 slice 可独立工作；main 最后一次运行 `node scripts/qa.cjs`，不使用裸 node --test。

新永久测试只覆盖消费者可见负例：不匹配/未接受输入、双hash错配、未声明/未知映射、不可读 source、unsafe path/link、输入漂移/旧通过不能继承、capture≠live、feedback身份/空字段/类别错误、record≠resolved、只读 check 与无 target/ledger 写入。成功链复用已有公共 CLI harness；一次临时 UI smoke 必须启动真实临时 target 并取得 browser capture，实际选择对象→copy prompt/export→record→开发消费者读取同条 Record 修改该 target→旧 bundle check stale→重启 target→browser 新 capture→新 manifest/build/check。仅改 hash 或制造 capture JSON 不算此 smoke，真实私有 target 无须进入 repo；不建永久 E2E 套件。

| asset_id | relation / scope | risk | verify / rollback |
| --- | --- | --- | --- |
| runtime-review-core.cjs + schemas/reference | 新 producer/inspect/local record；只写声明产物 | 输入泄漏、错误 freshness | 负例与合成 smoke；撤销新namespace并保留已有产物，不删除用户数据 |
| cli-core.cjs + skill docs + package/test manifests | 薄public入口与分发登记 | 覆盖用户dirty、包遗漏 | main QA；仅回退本change接线，不动quality work |
| 既有 target / ledger / receipts | 只读输入及执行真相引用 | 意外修改/验收混淆 | 断言未写入；无需迁移/回滚其格式 |

已批准范围仅此薄 review；无额外可选功能、无 TBD。没有真实 capture 的 smoke 不能证明真实 target runtime；实现完成不等于当前验收或人类接受，实际验证与剩余门禁见实施交接规格。
