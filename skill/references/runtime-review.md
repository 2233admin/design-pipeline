# 对象运行观察与开发交接

`runtime-review` 把已选择 Playground、声明设计输入、外部源码集合和外部 captured observation 组合成离线对象页。它不是 live 客户端、采集器、producer 认证器或新的验收 gate。**Component Conformance 与 Visual Acceptance 分开；源码、hash 或新 Bundle 不代表当前实现已验收。**

本文供页面使用者和开发消费者查阅。字段真相见 [runtime-review.schema.json](./runtime-review.schema.json) 与 [runtime-review-feedback.schema.json](./runtime-review-feedback.schema.json)；实现入口是 `scripts/runtime-review-core.cjs` 的三个同步函数。行为决策与权限边界见仓库 OpenSpec change `add-runtime-review-handoff/design.md`。

## 公共命令与写入范围

```text
node skill/scripts/designer-pipeline.cjs runtime-review build  --root <workspace> --change-root <change> --manifest <manifest.json> --json
node skill/scripts/designer-pipeline.cjs runtime-review check  --root <workspace> --change-root <change> --artifact <review.json> --json
node skill/scripts/designer-pipeline.cjs runtime-review record --root <workspace> --change-root <change> --artifact <review.json> --observation <feedback.json> --json
```

- `--root` 默认当前工作目录；changeRoot 是已存在、包含于该 workspace 的目录。
- `manifest`、`artifact`、`observation` 的文件路径都相对 **changeRoot**。record 中 `--observation` 仅指对象 Feedback，不是运行 capture。
- build 只写 `runtime-review/<manifest.id>/review.json` 与 `index.html`。目录存在就拒绝，不覆盖旧产物；预检失败不生成成功产物。
- check 只读。public JSON 使用现行 `design-pipeline.cli-result.v1`；`context` 是**顶层字段**，不是 `result.context`。
- record 只写 `runtime-review/feedback/<feedbackHash>.json`。同反馈重复记录返回原路径，不覆盖旧记录。
- 无 `--write`、替换、发布、自动打开浏览器、自动修复 target 或自动 record。target、state/events ledger、Playground 和既有 receipts 都是只读输入。

| 返回状态 | Exit | 解释 |
| --- | --- | --- |
| built / matched / recorded | 0 | 产物生成 / 声明上下文匹配 / 本地反馈记录成功；都不等于当前验收通过 |
| stale / blocked | 2 | 引用字节或 lineage 漂移 / 缺失或不可读；`ok:true` 不代表 pass |
| 非法参数、schema、路径或 Bundle | 1 | 现行 CLI error；没有成功写入 |

## 输入与路径所属 root

| 输入 | 绑定与路径范围 |
| --- | --- |
| acceptedDesign | 只有 `kind:playground-selection`；现行 `checkPlayground(...,stage:"selection")` 的 ready、applicable:true、selected 才有效。waived 不是 accepted |
| designIntent | 必须与 receipt.selection.prompt 同 path/hash；不是任意 DESIGN.md 的接受声明 |
| uiIr / catalog / tokens / codeMap | 显式 Ref 相对 changeRoot；实际读取各份 bytes，调用既有 validators，code-map 双 hash 匹配 UI IR/tokens。仍只是声明输入，不继承 selection accepted |
| componentFirst | 现行 `component-first-gate.v2` Ref 相对 changeRoot；原 UTF-8 bytes、target、snapshot、policy、inputDigest、parentReceiptHashes 和 expiry 保留，不重签 |
| sourceFiles | **仅此数组相对 componentFirst.target.root**；target.root 沿用 project-relative 旧合同。这是显式、唯一 path 的外部源码集合，不扫描 repo |
| runtimeObservation | 外部作者提供的 `mode:captured` JSON Ref 相对 changeRoot；必须绑定 design/source/target/snapshot/policy |
| evidenceReceipt | Observation 中 Ref 相对 changeRoot，复用现行 evidence receipt；其非 null evidence 文件相对 receipt 所在目录 |

新 Ref.path 是 forward-slash literal relative file path；绝对路径、drive/UNC、空段、`.`/`..`、NUL、glob 都拒绝。CLI 的有效 workspace 沿用 `rootFrom` 的 canonical root；其内部声明文件、输出及已有祖先仍做 lexical/realpath containment 和 symlink/junction 检查，目录或设备不能冒充普通文件。declared source 的文件或祖先不可读、源码不是可解码 UTF-8 时返回 blocked，不用空源码兜底；危险路径或已发现的 link 仍是 error。

真实 private target 的源码、截图、prompt 与绝对路径不要落在本工具仓库的 docs/fixtures。为真实项目使用它自己的外部 workspace/changeRoot；这里没有上传或发布。

## 三类身份与证据能说明什么

- **designIdentitySha256** 绑定真实 Playground receipt、canonical selected state、surface、surface contract、prompt、blueprint、verification report 和声明 UI IR/catalog/tokens/code-map 的字节。builtin blueprint 沿用 `playground-blueprints.json` 的 kind/id route；custom blueprint 沿用 change-local Ref。
- **sourceSetSha256** 是按 path 排序的声明 source Ref 数组的 canonical JSON hash。每个 source hash 来自真实读取 bytes，同一次读取复用为展示文本。覆盖范围只到这个集合，不证明未声明文件、依赖、构建输出或服务端环境没有变化。
- **observationSha256** 是外部 runtimeObservation 原文件 bytes 的 hash，不用重新 canonical 序列化冒充原字节。evidence receipt 和全部非 null artifacts 也核实际文件/hash；screenshot 做既有 PNG 尺寸校验。
- 既有 evidence receipt 的 `hashes` 沿用原 validator 的大小写兼容，仅比较时规范化；原 receipt bytes 不重写。新 Ref 与三身份的 SHA-256 仍严格 lowercase。
- **snapshotDigest** 始终保留旧 `sha256:<hex>`，不拿 sourceSetSha256 替换。

Observation 的 `dataMode` 必需且仅为 `fixture | live | static | unknown`。页面及开发 prompt 都显示“声明数据模式”，原 URL/route 上下文只展示 evidence receipt.target.url，viewport 只取该 receipt。即使声明 live，模式仍是 captured。

**捕获不是认证。** 文件与 hash 匹配只说明所读字节匹配，不证明真实运行发生、不认证 capture/receipt/CLI 报告的 producer，也不证明运行进程使用了当前 disk bytes。capturedAt/state/viewport 是采集者提供的时点上下文，不是自动持续验证。

## 对象页与确定性

对象集合来自 UI IR nodes[].id，不从截图猜对象。选择对象后可查 source/token、capturedAt/state/viewport、原 URL 和证据，并分别填写两种反馈类别。

- 唯一 mapping、声明 source、合法 line/column 与相同 componentId 才能确定 source；否则显示 unknown 和具体原因。
- tokenRef 是 token 树 `$value` 叶子的 dotted key；无法唯一定位的项显示 unknown，已经确定的部分可单独显示，不猜 token。
- 一个对象没有 runtime 就显示 missing，不填 pass。mapping.evidence 的文字不是可读取 captured evidence。
- PNG 仅作为图片；DOM/console 等 UTF-8 evidence 按文本转义；其他二进制只下载不可执行附件，不作为 HTML、script 或 iframe 渲染。
- 用户输入仅留本页内存。切换类别不修改既有验收。copy 失败仍保留可选中的完整 prompt；Actual / Expected / Acceptance 缺项不能导出 Feedback。

页面以 hash-bound script/style 的自包含 CSP 禁止 network、iframe、eval 与外部依赖。源码、token、evidence、反馈和 prompt 全部当不可信引用数据；不据其文本执行命令。

## 当前 check 与旧验收

首次打开页面显示“未核验当前磁盘”。将 public `runtime-review check ... --json` 的 stdout 保存为文件，再用页面本地 file input 导入：

- 只接受 `design-pipeline.cli-result.v1`、ok:true、顶层 status matched/stale/blocked 和严格顶层 context Projection。
- bundleSha256 与完整 design/source/observation/target/snapshot/policy tuple 都要匹配。裸 Projection、foreign tuple、错误 status 或非法形状拒绝，并重置当前核验为未知。
- 导入后只显示“CLI 报告：状态 at checkedAt”；报告未经认证，且之后 disk 可以再变。重新选择报告立即清除旧当前结论；异步读取的成功或失败只由最新选择更新页面和 prompt。离线页不会自动观察，也不会假装自动 stale。
- matched 只投影 `captured-lineage`：既有 receipt 记载结果，review 没有重新验收当前实现。
- stale/blocked 时，旧 passed/waived 不再作为当前结果；scope 是 `current-not-verified`，旧状态只能连同旧 hash 作历史显示。

check 重读 manifest、历史与当前声明文件、原 lineage、evidence 和 HTML。内容漂移先记 stale，不被下游 parse/hash 错误掩盖；缺失/不可读是 blocked；危险路径、原 Bundle/schema 非法是 error。源码集合的 observed digest 用重读实际 hash 计算，不能沿用手填 hash。HTML hash 与内嵌 body 一起核对，内容身份不是签名。

已漂移 Playground 的下游 Ref/blueprint 缺失仍按历史 stale 处理，不能计算的 design observed digest 为 null；仍提供的路径和 link 不因缺少兄弟字段而免检。当前 Ref 字节匹配的 UI IR 先由既有 interoperability authority 核自身结构，再做 catalog 交叉验证；非法自身结构不被缺 catalog 的 blocked 掩盖。

HTML 还须符合现行工具的 canonical renderer。工具 renderer 变化后，旧 HTML 即使仍匹配旧 html Ref，也可能成为 stale/损坏、不能用于 record；使用新的 manifest.id 重新 build/check，保留旧 Bundle、Record 和 receipt bytes 作历史，不覆盖旧产物。三身份匹配不认证旧 renderer，新 build 也不代表通过。

## Feedback、Record 与开发消费

Feedback 绑定同一 objectId、bundleSha256、三身份与原 target/snapshot/policy；category 只有 `component-conformance` 或 `visual-acceptance`，actual/expected/acceptance 都非空。没有 resolved/pass/status、路径或命令执行字段。dataMode/URL 通过 observationSha256 关联原 Bundle，不重复新增字段。

record 调用同一 inspect，把反馈和最新 `contextAtRecord` Projection 保存为 Record。当前 stale/blocked 可记录为**历史观察**；Bundle/HTML 缺失或损坏、unsafe 输入路径、错误 feedback identity 则拒绝。lifecycle 固定 recorded；不调用 pipeline issue feedback recorder、不 advanceChange、不产生新 receipt。

Record 发布要求反馈目录所在文件系统支持**同目录硬链接（hard link）**：私有普通临时文件完整写入并关闭后，排他发布最终 feedbackHash 路径；不支持硬链接或发布前失败时拒绝发布，不用 copy/rename 覆盖回退，仅清理本次拥有的临时文件。若同反馈的合法 Record 竞争获胜，则保留其原 `contextAtRecord`/`recordedAt`，响应仍携带本次 inspect 的 Projection；非法、不可读或已消失的竞争文件不删除、不覆盖。

发布已完成但私有临时文件清理失败时，完整最终 Record 保持 recorded，私有临时文件可能留存；不回滚已发布 Record 或删除其他历史文件。路径检查不承诺消除恶意并发 pathname 替换，也不承诺断电后的持久性（durability）；实现入口见 `runtime-review-core.cjs#recordRuntimeReviewFeedback`。

开发消费者的顺序：

1. 读取同条 Record 和 Bundle，先运行 check。stale/blocked 先 refresh/rebind，不能按历史源码位置盲改。
2. 确认用户授权的 target，按对象与 Actual / Expected / Acceptance 修复，不合并两类验收。
3. 重启真实 target，由外部重新 browser capture；更新 manifest.id，重新 build/check。
4. 使用原 ledger/receipts 核验实现。新 hash、captured-lineage、recorded 都不等于反馈 resolved。

## 维护与验证入口

- Core：`runtime-review-core.cjs#buildRuntimeReview` / `inspectRuntimeReview` / `recordRuntimeReviewFeedback`，只有这三个同步 exports。CLI 只接线，不复制业务 schema。
- 现有 authority：`playground-core.cjs#checkPlayground`、`component-first-v2-core.cjs#checkV2Artifact`、`evidence-core.cjs#validateReceipt`、`interoperability-core.cjs`。不另造 gate、receipt 或 global state。
- 新永久回归：`tests/runtime-review.test.cjs` 通过 public CLI harness 使用合成输入测试消费者可见负例；不代替真实 browser runtime 观察。
- 仓库验收入口：`node scripts/qa.cjs`，使用声明 test manifest，不用裸 `node --test` discovery。
- 真实运行验收由主控在仓库外临时 target 完成：browser capture → 对象选择/copy/export/record → 消费同条 Record 修改 target → 旧 Bundle stale → 重启、新 capture、新 build/check。手写 capture/hash 变化不能冒充这个 smoke。
