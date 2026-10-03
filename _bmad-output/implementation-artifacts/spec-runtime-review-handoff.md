---
title: '对象级 captured runtime review 与开发交接'
type: 'feature'
created: '2026-10-04'
status: 'done'
baseline_commit: '8ed5dc7c5c5181ac156b10dbf0261269bbecb80b'
review_loop_iteration: 0
context:
  - 'openspec/project.md'
  - 'openspec/changes/add-runtime-review-handoff/design.md'
  - 'openspec/changes/add-runtime-review-handoff/specs/runtime-review/spec.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** code-map 仅验证 shape，现有 selection 与运行证据没有对象级反馈交接页；源码/hash/receipt 的存在不能代表当前实现已验收。

**Approach:** public `runtime-review build/check/record` 从已选择 Playground、声明源码集和外部 captured observation 生成离线对象页，供用户查看 source/token/evidence、写 actual/expected/acceptance、copy 开发 prompt/export feedback，再显式 CLI 本地记录。开发 agent 读取同一上下文修改授权 target，重建并走原核验。

## Boundaries & Constraints

**Always:** acceptedDesign 仅 `playground-selection`，复用 checkPlayground selection；designIntent 同 selection.prompt path/hash。UI IR/tokens/code-map 逐份读 bytes/相互匹配，但不继承 accepted。三身份 design/sourceSet/observation 分开；原 target/snapshot/policy/receipt bytes 与 lineage 完整保留。Component Conformance ≠ Visual Acceptance。声明 source 集不代表整个 repo；hash匹配不证明进程读了当前 disk，也不认证 producer。containment/realpath/link检查、转义/CSP、私有数据不落本工具 repo。

**Ask First:** CHECKPOINT 1 用户明确 **Approve** 后才实施；新增输入入口、live/采集机制、改变共享合同须重新批准。

**Never:** 自动改 target、发布、network/iframe、套 Playground 3–5 preset、pipeline issue recorder 存对象反馈、新 gate/receipt/global state；record 不标 resolved。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| build | 已选择 prompt、可读声明bytes、绑定capture | HTML + Bundle；captured/未核验当前磁盘 | 非法/未接受拒绝，无成功产物 |
| mapping | 未声明/位置或token不确定 | 明示 unknown/missing，不猜 | 不可读 source blocked |
| check | design/source/evidence/lineage变化 | 只读 stale/blocked；旧pass不作为当前结果 | 报告只说明checkedAt时点 |
| record | 显式完整对象反馈 | change-local recorded + Projection | 错identity/空字段/unsafe path不写 |

</frozen-after-approval>

## Code Map

- `skill/scripts/cli-core.cjs` -- 现行同步dispatch/envelope；仅薄接线，保护dirty。
- `skill/scripts/playground-core.cjs` -- selection字节/浏览器报告authority。
- `skill/scripts/interoperability-core.cjs` -- 复用shape；core补实际declared读取。
- `skill/scripts/component-first-v2-core.cjs`、`evidence-core.cjs`、`contract-utils.cjs` -- lineage、既有receipt、containment/hash。
- 新 `skill/scripts/runtime-review-core.cjs` -- producer/只读inspect/local record；新两schema/reference由core拥有。详细flags、exports、return/严格JSON与路径定义**唯一以 OpenSpec design.md 为准**。

## Tasks & Acceptance

**Execution:**

- [x] core + schema/reference + `tests/runtime-review.test.cjs` -- 完整离线对象链；新增永久测试只consumer-visible负例。
- [x] CLI/help + package/test manifests + SKILL/README/CHANGELOG -- 最小public接线，保留用户改动。
- [x] main -- QA与临时真实target/browser smoke；不建永久E2E。

**Acceptance Criteria:**

- Given 确定对象，when 选择并反馈/copy/export，then prompt/JSON保留同一对象、三身份/lineage及可执行验收要求；无runtime不填pass。
- Given 外部capture，when 浏览/copy prompt，then capturedAt/state/viewport、「声明数据模式」dataMode（fixture/live/static/unknown）与原 evidence target.url 可见，不新增route；即使声明live也仍captured/非认证，source/hash匹配不认证receipt producer。
- Given 旧通过，when 导入同bundle/tuple的public check --json现行envelope（顶层context），then 漂移使两类别stale/current-not-verified；裸Projection拒绝，离线页不假装自动观察disk或报告已认证。
- Given 实际临时target与browser capture，when 页面反馈/record→消费者读同条Record改target→旧check→重启新capture/build/check，then 旧bundle stale、新身份绑定新观察，hash改变不等于反馈resolved。
- Given 任一action，when 执行，then 不写target/ledger/receipt；只有build产物与显式record写入，原执行SSOT不变。

## Spec Change Log

## Design Notes

薄review优于live client：一个core/共享schema即可维护，接受离线证据须手动刷新。页面导入同bundle check报告只显示未认证时点结论；copy失败仍提供可选文本。

## Verification

**Commands:**

- main在批准实施并合并slice后运行 `node scripts/qa.cjs`，按声明manifest全通过，不使用裸node --test。

**Manual checks:**

- 已在独立合成临时 target 实测完整链：真实 Playground 选择与既有六项浏览检查；初始 browser capture→public build/check matched→review 页选对象/类别、拒绝裸或异身份报告并清除旧结论、真实 clipboard 与 Feedback 下载→public record→独立开发者读取同一 Record 后仅改该目标的 HTML/CSS→旧 check stale（exit 2）→实际重启→1280×900 新 capture（DPR 1）、390×844 无水平溢出、Tab/Enter 保存次数 0→1→新 build/check matched→真实本地 file 页面自包含渲染，data PNG 加载、无外部 scripts/resources。未使用私有项目内容。
- 初始 sourceSet 为 `f0c8a79c6be4bab27b36110454501f1a9dc6d299ac631a3f02df4e30ae1a1125`，修改后为 `dde43212c8b4109816493ef6b557971089060e7cb41a5b7efdc71637c97e1b39`；新 captureAt 为 `2026-10-03T20:48:50.572Z`，observation 为 `7246370fa51176b97715db97281a1f6e71f16996152c696baf8ed0a69b3228d3`。原 Bundle、CF artifact、Record、app.js SHA-256 前后相同；Record 仍 recorded、contextAtRecord 仍原 matched；新 hash 不代表 resolved 或验收通过。新报告保持 Component Conformance blocked、Visual Acceptance not-evaluated，证据为 partial/captured，producer 未认证。
- C 盘 ENOSPC 后仅只读复制自建临时验收树至 `D:/Temp/runtime-review-XEIZSP-relocated-20261003`；29 文件逐一 hash 一致、原 C 未改。D 基线 public check 同 tuple matched，后续 Record/消费者/服务与新 capture 全部使用 D；原 capture 保留为历史，不冒充迁移后新 capture。下载原件与 D 输入 hash 一致；失败留下的 0-byte 文件未作为反馈输入。
- 实测 Windows clipboard 与 prompt 经仅 CRLF→LF 比较相同（215 个换行差异）；未放宽实现。未验证 copy 失败分支，不以 SDK 限制冒充失败。
- 最终 `node scripts/qa.cjs` 通过（仅进程 TEMP/TMP 指向 D 的 PowerShell 包装）：727/727 源测试、85 文件，11/11 安装包 public CLI smoke，reproducible tgz/zip，仓库状态 byte-identical；耗时 41.54 秒。已删除一条源码/文案/VM 断言测试，最终计数以删除后本次运行为准。
- 证据：`D:/Temp/runtime-review-main-20261003-1845/qa-final.log`、`D:/Temp/runtime-review-XEIZSP-relocated-20261003/change/runtime-review/feedback/80bee78f085fe24c7c6dbabde55d4c1a58833390ddeb4cf5d14f08984ad9eecc.json`、该目录 `captures/initial/` 与 `captures/after-feedback/`、`runtime-review/initial/` 与 `runtime-review/after-feedback/`，以及 `D:/Temp/runtime-review-main-20261003-1845/review-after-feedback-offline.png`。真实 UI 与 CLI 验证已完成；代码审查和人类 CHECKPOINT 2 尚待。

## 审查分流增补（Main 已决定；修复与自动门禁已完成）

本节记录已实施处置，不修改 frozen intent。按 resolved Step 5 与 Main 授权，SSOT `done` 仅表示实现、代码审查与**已执行且有证据的**自动门禁完成，**不表示人类 CHECKPOINT 2 接受**；OpenSpec 仍 `in-review`。上文 727/727 与安装包 smoke 保留为修复前历史，修复后第一轮通过与后一次证据保存失败分别见下文；不把未取得结果的门禁称为 passed。

### 原始输入与归属

- 基线：`8ed5dc7c5c5181ac156b10dbf0261269bbecb80b`。实际三路原始发现共 **54**：B1–B12（12）、E1–E28（28）、V1–V14（14；12 verification gaps + 2 other findings），不采用旧“13 标题”口径。
- 输入：`D:/Temp/runtime-review-main-20261003-1845/review-input/blind-findings.json`、`agent://对象交接边界审查`（数组顺序 E1–E28）、`D:/Temp/runtime-review-main-20261003-1845/review-input/verification-findings.json`。以下位置均保留原审查快照 path/range，不声称是修复后的行号。
- 本故事 15 个来源 ID：B1/B2、E14/E23–E28、V9–V14。其余 39 个来源 ID 属于 preexisting；B11 拆为两个 action，仅同 claim + 同 action 合并后追加 **31 个** deferred 条目，不比对旧 deferred 内容。

### 本故事处置（生产修复由原 implementation owner 持有）

| 方向 | 来源 / severity | Main 批准且 implementation owner 已落地的 action |
| --- | --- | --- |
| P1 | B1/E25 · high | 合法 legacy evidence uppercase hash 仅在 comparison 规范化；保留原 receipt bytes 与严格新 Ref 合同。 |
| P2 | B2/E27 · high | 修 partial ENOSPC 与同 feedback publication winner EEXIST 两个 consumer 缺陷：same-dir 普通私有 temp、exclusive open 确立 ownership，完整 write/close 后 linkSync 独占发布；合法 winner 复用原历史。unsupported-link 一律 fail closed，无 rename/copy fallback、不删既有 final；commit 后 temp 清理失败不得删 final 或谎称未记录。文档声明硬链接支持，不宣称 hostile-race/power-loss 保证。 |
| P3 | E28/V14 · high | latest report selection wins；成功与 catch 都 guard revision，开始导入即清此前 current。 |
| P5 | E23 · medium | declared source 祖先 lstat EACCES/EPERM 投影 blocked 而非 CLI error 1；unsafe/link 仍 invalid，非法 authority root 不降级。 |
| P6 | E24 · medium | old Playground 漂移为合法 JSON 但缺 surfaceRef/blueprint 时仍 stale、observed design 为 null、可历史 record；每个仍提供的 unsafe path/link 必须拒绝。 |
| P7 | E26 · medium | 当前 Ref 匹配的 intrinsic-invalid UI IR 不得被 catalog missing 掩盖；从同一 interoperability-core authority 提取结构 validator，保留 existing validateUiIr API/callers，不建第二 schema。 |

六个 patch 方向包括七个具体 consumer 缺陷（P2 两个），现已落地。V10 verification patch 已强化现有 drift 负例，独立计算 actual source digest，核对 check/Record observed、旧 identity 保持旧值、missing observed null，不用 source-text/echo 断言。V11 verification patch 已在同一次实际 CLI 同时断言 Component blocked 与独立 Visual passed/waived、各自 scope，不互相升级。Main targeted 与第一轮 final-code QA 已通过，结果见下文。

### Rejected 的新增需求与依据

- E14/P4：批准 design 沿现有 rootFrom 接收 effective parsed root，不另加 lexical `--root` gate/CLI special case；无该项 public CLI production changes。
- V9：拒绝本轮新增永久 matched 正例需求；normal matched 已有真实 public CLI smoke，永久测试按批准规范保留 consumer-visible 负例。修复后新 HTML 已由 Main 真实检查，证据见下文。
- V12/V13：拒绝新增永久 E2E/VM 或 source-text/wiring 测试，不恢复删去的 pageConsumer。Main 已真实串行合法后裸/foreign 报告拒绝并清旧 report/prompt；第二对象 settings-status/component-conformance 的实际导出 bytes 与 prompt 绑定同一对象，D 下载成功。此前 C 下载失败仍是历史失败，不回填成功。这些串行证据不替代 P3 并发修复后的真实 smoke。

### 历史红态与修复后门禁

- Main 在 D TEMP 经 public CLI 的实际 red：**21 tests / 15 pass / 6 fail**（测试结果计数，不是 54 发现的分类）。六个失败为 uppercase、partial ENOSPC、publication winner EEXIST、ancestor EACCES、changed Playground missingRef、UIIR invalid + catalog missing。
- P3 真实浏览红态：旧合法 A 延迟读取，最后选择 bare B；B 拒绝后显示 unknown，释放 A 后却回 matched，prompt 亦恢复旧 report。此为 Main 实测，不仅是 E28/V14 静态推断。
- C TEMP 先前 13 fail 受磁盘满污染，不作为产品红态；原 0-byte ui-feedback.json 来自工具 MV 失败，不作为 product record.writer 复现。Main 实际 LSP references 返回 `No language server found`，worker 文本 caller fallback 可用。
- Main 修复后 targeted public CLI 最终 **21 tests / 21 pass / 0 fail，15.68s**；六方向生产修复与 V10/V11 负例强化已落地。此为 targeted 结果，不是全仓 QA 计数。

### Preexisting deferred 映射与执行态留痕

完整 Step 4 `source_spec / summary / evidence` 追加于 `deferred-work.md`，均为 preexisting 静态审查 **[INFERENCE]**，未由 Main 故障注入/浏览复现，不归咎本故事。合并 ID：B3/E13、B5/E19、B6/E17、B7/E16、B8/E15、B9/E6/V4、B10/E8、B11(b)/E4；B11(a) 独立。V3 与 B9/B11、V8 与 E20 原因/action 不同，未合并。其余独立 ID 保留。

执行态 SSOT 是 Multica，项目「舰队运维与基建」（14a68c87）。Main 最新实际 `multica issue list --project 14a68c87`：exit 2，21.13s，`Could not reach server`；此前多次 CLI/TCP 同样失败。未 create/comment、无远程 issue 留痕成功；整体工作值得开票但连接 blocked。本次仅同步该真实失败，不重跑确认失败、不伪造票号。相关上轮时间为 **2026-10-03T22:15:41.491Z**（不是旧 19:21）；另有 session 收尾提醒 `2026-10-03T22:24:13.260Z`，相关未留痕工作仍待连接恢复后一并补记，不把提醒时间冒充 list 时间。

### 修复后新 HTML 的真实证据与限制

- 使用新 `manifest.id=after-review-fixes` public build/check，均 exit 0，新 Bundle `4bb2782c785fa5b7a4333ad83fbdce445215aef3badd557ffb825f680e3144f7`，完整六身份 tuple matched。sourceSet 仍为 `dde43212c8b4109816493ef6b557971089060e7cb41a5b7efdc71637c97e1b39`，observation 仍为 `7246370fa51176b97715db97281a1f6e71f16996152c696baf8ed0a69b3228d3`；design identity 沿原历史值（Main 回报前缀 `e1f45…`，此处不补造完整 digest）。
- 新生成 HTML 沿用真实历史 **capturedAt `2026-10-03T20:48:50.572Z`** 的 capture/PNG/DOM/console，不是 22:30 recapture，也不是新采集或 producer 认证；未复用旧 renderer 冒充修复后 HTML。
- Main 仅通过 `File.prototype.text` 延迟原生 actual file 读取，实测两方向：①早合法 A 晚完成、后 bare B 拒绝；释放 A 后 current 仍 unknown、prompt.cliReport=null；②早 bare A 晚完成、后合法 B matched；释放 A 后仍 matched，prompt 的 bundle/checkAt 未被清除。两方向在新生成 HTML 证明早合法/早非法两选择顺序的最终状态均 latest wins。第二方向原生 File.text 仍 resolve bare JSON，旧 generation 在 JSON parse 前 return；未注入原生 File.text rejection，**不声称 catch 分支运行覆盖**。catch revision guard 存在由 Main 静态读取代码确认。
- 两对象草稿实际切换后，各自 category/expected/acceptance 恢复。第二对象 settings-status 的实际 sourceMapping 是 **`index.html:7` / `status-card`**，不是 app.js；下载反馈与 prompt 绑定该对象。
- 实际导出下载经 **same-D 工具 MV 保持 raw bytes** 于 `D:/Temp/runtime-review-XEIZSP-relocated-20261003/change/ui-feedback-downloaded-review-fixes.json`，SHA-256 `E2960D1330970C8C5459EF8F56B0A86FC5A4B63996F8EE2CDFB476DC3980C712`。public record 两次均 exit 0，保留同一 `runtime-review/feedback/c81eae4c2f50249a9458f5b5bbb66a944cc57b5ee66e0815b70cc0f26ec949f1.json`；Record SHA-256 `82A3FA3B9182755CAC2432BA28482D414290481EF322E7F5FAD45188F683003E` 复测不变，contextAtRecord `2026-10-03T22:40:03.376Z` 原样，lifecycle 仍 recorded。Component blocked / Visual not-evaluated 独立，不称 resolved。
- Main 核对旧 Record（SHA 前缀 `8B97…`）、旧 initial Bundle（`E8B24…`）、原 CF（`FC0B…`）未变；这里仅记录 Main 提供的前缀，不扩写未提供完整 hash。
- 当前 file UI 实际 1280×900 / 390×844、DPR 1，doc/body width 匹配，无外部 scripts/resources，data PNG 真实加载 1280×900；Main 已读取 `D:/Temp/runtime-review-main-20261003-1845/review-fixes-desktop.png` 与 `review-fixes-mobile.png` 视觉验收。Browser 已关闭，临时 target 服务此前已停。
- 当前复制按钮报告 copy 成功，但原生 readback 明确 `NotAllowedError: Read permission denied`，SDK clipboardRead 亦 unavailable；未授权权限、未绕过。**不能声称最新 file 页 clipboard 读回通过**；前次初版 HTTP source=page 读回实证仅作为历史保留。

### Final-code QA 与交接状态

- Main 第一轮 final-code `node scripts/qa.cjs` 实际 exit 0，49.12s：仓库 **735/735**、安装包 public CLI **11/11**、reproducible tgz/zip/checksums 与 repository status byte-identical 均 OK。完整原始输出（1628 行）已由工具 C→D MV 保留至 `D:/Temp/runtime-review-main-20261003-1845/qa-after-fixes-full.log`，不再以旧 artifact alias 作为当前保留文件引用。不把旧历史 727 改写成此次计数。
- Main 已完成 CodeReviewGate：54 原始发现全部 disposition、六方向修复、V10/V11 验证强化、31 preexisting defer 及上述真实 UI/CLI/QA 证据；人类 **CHECKPOINT 2 尚未接受**，OpenSpec status 仍 `in-review`。
- resolved `sync-sprint-status.md` 的 precondition：`story_key` 未设置，故显式 **skip sprint sync**，未创建 story 或改 sprint-status。
- 后一次 QA 的 stdout 因 C ENOSPC 保存失败，进程句柄已不可恢复，**无可恢复 exit/footer，不作为通过证据**。最终文档后门禁由 Main 使用已准备的低输出 `D:/Temp/runtime-review-main-20261003-1845/qa-counted-on-data-drive.ps1` 运行同一 `scripts/qa.cjs`（D TEMP），在最终交付中给出 actual 结果；此处不预填未运行结果。本切片未运行核验、stage/commit 或打开 VS Code；选择性本地 commit 由下一 owner 在最终 green 后负责，不自动 push。Multica 仍按上节真实连接失败 blocked，无 KEY/成功 comment。
- KB 收尾缺少工作知识库的 registry/locator 前提：Main 实际 crux/rhizome 多个 declared discovery 未找到工作定位，亦无已知 locator；候选 note 未落盘，不使用 personal fallback，也不把 PM 状态复制为 KB。

## Suggested Review Order

以下为本故事审查路径；baseline tracked diff 与本故事新增文件共同构成范围，既有 quality/OpenAlice 改动不归责本故事。链接以本 spec 目录为基点经 `node:path.relative` 动态生成，行号来自当前源码读取。

**入口与权限边界**

- 薄入口复用现行 root、envelope 与退出码。
  [`cli-core.cjs:651`](../../skill/scripts/cli-core.cjs#L651)
- build 绑定批准输入，不写 target。
  [`runtime-review-core.cjs:401`](../../skill/scripts/runtime-review-core.cjs#L401)

**三身份、路径与实际读取**

- 路径失败分 blocked，unsafe 仍拒绝。
  [`runtime-review-core.cjs:111`](../../skill/scripts/runtime-review-core.cjs#L111)
- 普通文件读取核身份，按 bytes 判漂移。
  [`runtime-review-core.cjs:119`](../../skill/scripts/runtime-review-core.cjs#L119)
- 漂移设计不掩盖仍提供的危险路径。
  [`runtime-review-core.cjs:167`](../../skill/scripts/runtime-review-core.cjs#L167)
- 实读 source refs 独立生成 observed 身份。
  [`runtime-review-core.cjs:211`](../../skill/scripts/runtime-review-core.cjs#L211)
- 结构 authority 独立于 catalog 可读性。
  [`interoperability-core.cjs:105`](../../skill/scripts/interoperability-core.cjs#L105)
- 分轨投影不继承当前未核验的历史 pass。
  [`runtime-review-core.cjs:370`](../../skill/scripts/runtime-review-core.cjs#L370)

**原子 Record 与历史保留**

- tuple 校验先于写入，重复反馈复用原历史。
  [`runtime-review-core.cjs:519`](../../skill/scripts/runtime-review-core.cjs#L519)
- 私有 temp 完整写后独占 link 发布。
  [`runtime-review-core.cjs:543`](../../skill/scripts/runtime-review-core.cjs#L543)

**最新 UI 报告与对象绑定**

- 切换对象保留草稿，导出绑定当前对象。
  [`runtime-review-core.cjs:675`](../../skill/scripts/runtime-review-core.cjs#L675)
- 导入开始清 current，异步结果仅最新生效。
  [`runtime-review-core.cjs:690`](../../skill/scripts/runtime-review-core.cjs#L690)

**合同与验证支撑**

- 六身份严格 shape 保持 lineage 边界。
  [`runtime-review.schema.json:42`](../../skill/references/runtime-review.schema.json#L42)
- Feedback 引用同一 schema，不复制合同。
  [`runtime-review-feedback.schema.json:5`](../../skill/references/runtime-review-feedback.schema.json#L5)
- 负例核实际 observed 与旧 identity 分离。
  [`runtime-review.test.cjs:330`](../../tests/runtime-review.test.cjs#L330)
- fault harness 证明 ENOSPC 不占 final。
  [`runtime-review.test.cjs:459`](../../tests/runtime-review.test.cjs#L459)
- declared manifest 纳入同一 QA 路径。
  [`test-manifest.json:74`](../../scripts/test-manifest.json#L74)
- 使用说明限定 captured 与显式 record。
  [`runtime-review.md:7`](../../skill/references/runtime-review.md#L7)

