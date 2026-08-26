# Epic 1 Story 1.1–1.4 测试覆盖审查

## 审查范围

对照以下输入审查：

- `D:/projects/design-pipeline/_bmad-output/planning-artifacts/epics.md`：Epic 1、Story 1.1–1.4
- `D:/projects/design-pipeline/_bmad-output/specs/spec-design-pipeline/SPEC.md`：CAP-1、CAP-2、CAP-8 及 Constraints
- `D:/projects/design-pipeline/_bmad-output/specs/spec-design-pipeline/implementation-contract.md`
- FR1、FR2、FR3、FR4、FR9、FR10
- 现有 `tests/`、`scripts/test-manifest.json`、`scripts/qa.cjs`、DesignMD CLI/core 实现

未修改业务代码或 `epics.md`。

## Verdict

**NEEDS REVISION BEFORE TEST DISPATCH**

Epic 1 的用户价值和四个 Story 划分基本合理，但当前 AC 还不能作为完整的自动化验收合同：Story 1.1–1.3 只有少量 happy-path/局部安全测试，Story 1.4 对应的 CAP-8 diff、stale、disappeared 和 route admission 目前没有实现或测试证据。直接派发会让多个 agent 各自解释状态、字段和 stale 规则，容易产生不兼容实现。

## 执行过的只读检查

- `node --test tests/designmd-ingestion.test.cjs tests/designer-pipeline-cli.test.cjs`
  - 15 tests passed, 0 failed, 0 skipped。
- `tests/designmd-ingestion.test.cjs` 是 `scripts/test-manifest.json` 中的第 33 个测试文件，并由 `scripts/qa.cjs` 第 131–133 行的统一测试入口执行。
- 全仓库搜索 DesignMD、`contentPath`、`contentSha256`、`previousSnapshotHash`、`diff`、`stale`、`disappeared`、`robots`、`resourceEntryIds`、`admissionStatuses` 等符号。
- `code-intel` 尝试失败，原因是仓库自身 architecture gate/doctor failure；未将该工具失败作为产品覆盖结论，随后改用限定范围的本地检查。

## 覆盖盘点

| Story | AC 自动可验证性 | 现有证据 | 结论 |
| --- | --- | --- | --- |
| 1.1 首次同步 | 大部分可验证，但字段、发现入口、预算和 inert 观察点未定义完整 | 仅覆盖五类、重复后的数量间接结果、reference-only、搜索和 llms-full fixture | 不足 |
| 1.2 验证与准入 | 可验证，但 `invalid/blocked` 的精确状态和 remote-execution 判定规则不明确 | 仅覆盖成功 verify 和 `..` contentPath | 不足 |
| 1.3 恢复与状态 | 可验证，但 partial/blocked、失败 envelope、中断注入方式未冻结 | 仅覆盖单 URL error 后保留原 catalog 字节 | 不足 |
| 1.4 diff 与 stale | 可验证，但需要前后快照输入、revision/stale 规则和 admission 接口 | 未发现 DesignMD diff/stale 实现或测试 | 缺失 |

## 关键发现

### V-01：Resource Entry 字段契约无法被现有测试验证，且名称存在漂移

- **位置：** `epics.md:113–116`；`implementation-contract.md:7–20`；`skill/scripts/designmd-core.cjs:103–123, 216–242`
- **触发条件：** Story 1.1 要求每个条目有 `contentPath`、`contentHash`、`license/status` 和 `provenance`，但现有同步对象使用 `contentSha256`，持久化对象虽然补充 `contentPath`，仍未生成 `provenance`，而测试只检查 kind、数量、license、status 和搜索结果。
- **证据：** `tests/designmd-ingestion.test.cjs:31–38` 没有逐条检查字段；`tests/designmd-ingestion.test.cjs:40–53` 只检查持久化文件存在、搜索和成功退出；`designmd-core.cjs:111–123` 生成 `contentSha256`，没有 `provenance`；`designmd-core.cjs:241` 只补 `contentPath`。
- **后果：** 实现可以通过现有测试却不满足 CAP-1/FR3 的持久化字段合同；后续 route、verify 或 diff agent 可能分别采用 `contentHash` 和 `contentSha256`。
- **建议：** 在 dispatch 前冻结一个版本化 Resource Entry 示例/schema，明确 `contentHash` 与 `contentSha256` 的唯一名称，以及 `provenance` 的最小字段；增加逐条字段、schema、hash 与 source binding 断言。

### V-02：发现入口、去重确定性和抓取预算没有形成可重复验证矩阵

- **位置：** `epics.md:113–124, 118–120`；`implementation-contract.md:18, 91`；`skill/scripts/designmd-core.cjs:181–213`
- **触发条件：** Story 1.1 同时要求 HTML、sitemap、llms/llms-full、重复链接去重、稳定排序/hash，以及 robots、超时、5xx、响应大小超限处理；现有 fixture 只提供普通 HTML 和 `/llms-full.txt`，没有 sitemap/llms 独立 fixture，也没有两次同步对比稳定 hash、页数上限、并发、超时、响应大小或重试断言。
- **证据：** `tests/designmd-ingestion.test.cjs:12–29` 只有 HTML 页面与一个 `llms-full.txt` 文本入口；`tests/designmd-ingestion.test.cjs:31–38` 只断言条目数量和搜索；`designmd-core.cjs:186` 初始化三类 discovery URL，但 `tests` 没有分别证明其被消费；`designmd-core.cjs:184–185` 的 `maxPages/concurrency` 没有测试；`fetchText` 在 `designmd-core.cjs:165–179` 的重试/超时路径也没有测试。
- **后果：** 入口漏抓、重复顺序漂移、预算失效、5xx 重试次数错误或超大响应未阻断，都可能在统一测试中保持绿色。
- **建议：** 建立一张受控 fetcher 矩阵：每个 discovery 入口至少一个可发现资源；重复 URL/同 id；连续两次相同输入比较 canonical catalog hash；分别验证 page、concurrency、timeout、5xx retry 和 response-byte cap。robots deny/unavailable、redirect re-check、userinfo/private target 也应作为 CAP-1/CAP-2 的独立 fixture。

### V-03：inert 与 FR4 admission 的测试只观察了标签，没有证明“不可执行/不可成为 ready 输入”

- **位置：** `epics.md:126–128, 150–152`；`SPEC.md:25–27, 55–60`；`implementation-contract.md:91, 96`
- **触发条件：** Story 1.1/1.2 要求保存脚本、命令、prompt 后不执行，并要求未知许可证、来源不完整或远程执行提示只能是 `reference-only/review/blocked`；现有测试仅断言所有 entry 的 status 是 `reference-only`，没有执行隔离、依赖/文件副作用或后续 route admission 断言。
- **证据：** `tests/designmd-ingestion.test.cjs:31–38` 只断言 `entry.status`；全仓库搜索没有找到 DesignMD entry 进入 `resourceEntryIds`/`admissionStatuses` 的测试消费者；`designmd-core.cjs:103–123` 只提取文本和许可证字符串，没有 remote-execution 判定/准入函数。
- **后果：** 资源可以带有危险内容但仍以普通 reference-only 条目进入下游，或者不同实现者用不同规则判断“远程执行提示”；现有测试不会失败。
- **建议：** 把“识别”和“准入”拆成确定性合同：提供带脚本/命令/远程安装提示的 fixture，断言无子进程、无依赖修改、无网络副作用，并断言对应状态不能进入 ready route。若 v1 只做 inert 保存而不做内容判定，应在 AC 中明确“检测范围”和 `review/blocked` 的负责边界。

### V-04：verify/inspect 的失败状态、篡改检测和下游 ready 阻断没有验证；CLI 存在可被测试捕获的状态不一致

- **位置：** `epics.md:138–152, 174–176`；`skill/scripts/cli-core.cjs:694–702`
- **触发条件：** Story 1.2 要求本地内容被修改、删除或 hash 不匹配时标记 `invalid/blocked`，verify/inspect 不得作为 ready 输入；Story 1.3 要求 JSON status 与退出码一致。现有测试只覆盖合法 catalog 的 verify 成功，未覆盖篡改、删除、未知许可证、inspect 失败或 downstream route admission。
- **证据：** `tests/designmd-ingestion.test.cjs:40–56` 只断言成功退出和 `entries: 9`；`readPersistedCatalog` 的越界测试在 `tests/designmd-ingestion.test.cjs:76–103` 只覆盖 `..`；`cli-core.cjs:700–702` 在 `catalog.errors.length` 非零时返回 `exitCode: 2`，但 JSON `result.status` 仍固定为 `ready`；`cli-core.cjs:694–698` 的 inspect 返回 entry，不定义 per-entry invalid/blocked 结果。
- **后果：** 发生抓取缺口或内容损坏时，调用方可能看到 JSON `ready` 但进程失败；修改/删除本地内容、或 inspect 不可验证的条目也没有稳定的自动化合同。
- **建议：** 增加 tamper、missing、bad source、unknown license、inspect 和 CLI exit-class 测试，断言精确 status、error code、entry status 与 route admission；先冻结 `ready/partial/blocked/invalid/recovered` 到退出码的映射，避免用 `invalid or blocked` 这种无法唯一验收的 AC。

### V-05：路径安全只验证了 `..`，没有验证 Story 1.2/contract 要求的 symlink、junction、绝对路径、非文件目标

- **位置：** `epics.md:146–148`；`implementation-contract.md:20, 93`；`tests/designmd-ingestion.test.cjs:76–103`
- **触发条件：** AC 要求 contentPath、artifact、evidence 的绝对路径、traversal、symlink 或 junction 越界均拒绝；当前 DesignMD 测试只构造 `contentPath: ../outside.txt`。
- **证据：** `tests/designmd-ingestion.test.cjs:95–100` 只有 `..` 越界断言；虽然 `tests/designer-pipeline-cli.test.cjs:380–390` 有针对 `change init` 的 directory link 测试，但没有走 DesignMD `readPersistedCatalog` 或 catalog content root；没有发现 DesignMD 对绝对路径、symlink/junction、目录/设备等非 regular file 的测试。
- **后果：** DesignMD 自己的读取边界可能与通用 CLI path helper 不一致，链接逃逸或非文件目标可以在测试覆盖之外。
- **建议：** 以 `readPersistedCatalog` 为边界补齐 absolute、`..`、file symlink、directory junction/symlink、missing、directory target；每个 case 断言不读取 root 外内容并返回统一 `invalid` envelope，而不是只断言抛错文本。

### V-06：last-known-good 的恢复测试没有验证稳定 envelope、previousSnapshotHash、全失败和中断恢复

- **位置：** `epics.md:162–176`；`implementation-contract.md:12–20, 92`
- **触发条件：** Story 1.3 要求 partial/all-page failure、候选写入/解析/校验中断、失败/恢复 envelope 中的失败 URL、原因、重试结果、`preserved`、`previousSnapshotHash` 和建议动作；当前测试只验证单个 URL 出错后 catalog 文件字节不变。
- **证据：** `tests/designmd-ingestion.test.cjs:59–74` 只断言 `errors.length`、`published:false`、`preserved:true` 和旧文件内容相等；没有断言 `previousSnapshotHash`、retry result、next action、status 或 CLI 输出；没有 all-page failure 或 write/parse/validate interruption fixture。`designmd-core.cjs:212` 返回的 catalog 没有 `previousSnapshotHash`，`designmd-core.cjs:223–226` 的 preserve result 也没有该字段；`designmd-sync.cjs:17–21` 只把任意 error 映射成 `blocked`。
- **后果：** 快照虽然暂时保住，但调用方无法可靠判断是 partial、blocked 还是 recovered，也无法把恢复动作与上一份 snapshot 绑定；写入中断可能缺乏可重复测试。
- **建议：** 采用前后 snapshot hash 的固定 fixture，分别覆盖 partial、all-page failure、首次失败无旧快照、已有快照恢复和原子发布 failpoint；对 CLI JSON 与 exit class 做同一组断言。failpoint 可以只存在测试注入层，不必暴露生产开关。

### V-07：Story 1.4 对应的 CAP-8 diff/stale/disappeared 全部缺少可执行实现和测试边界

- **位置：** `epics.md:178–200`；`SPEC.md:49–51`；`implementation-contract.md:15–16, 87–97`
- **触发条件：** Story 1.4 要求生成 added/changed/disappeared/failed/stale diff、前后 snapshot hash、revision/license 变化识别、ready route 阻断和相同输入空 diff；现有 DesignMD core 只返回当前 catalog，没有前一快照输入、diff receipt、revision/stale 状态或 route admission 接口。
- **证据：** `designmd-core.cjs:181–213` 只构造当前 `entries/errors`；`writeCatalog` 在 `designmd-core.cjs:216–260` 只写/保留 catalog，没有 diff；全仓库搜索未发现 DesignMD 的 `previousSnapshotHash`、`disappeared`、`stale` 或 `resourceEntryIds` 的实现/测试；`tests/designmd-ingestion.test.cjs` 四个用例也没有 diff 断言。
- **后果：** Story 1.4 不是“测试补齐”即可派发的成熟 Story，而是至少需要先冻结并实现一个 snapshot comparison/admission contract；否则 agent 会自行决定 revision identity、stale 保留期限、变化优先级和 route 阻断方式。
- **建议：** 在派发前补一个最小 comparison contract：输入为 previous/current snapshot，输出固定 diff schema 和 canonical hash；明确 content/source revision/license 的 changed 判定、disappeared 与 stale 的区别、stale retention，以及 route admission 的调用边界。然后为五类 diff 和空 diff 各建 fixture，并接一条真实 ready-route 阻断测试。

### V-08：AC 中存在无法唯一自动验收的开放语义，且与 SPEC open questions 交叉

- **位置：** `epics.md:122–124, 142–152, 162–176, 190–196`；`SPEC.md:82–88`
- **触发条件：** 多处 AC 使用 `invalid 或 blocked`、`partial 或 blocked`、`来源不完整`、`远程执行提示`、`来源 revision`、`无法重新验证`、`旧条目不得继续保持 ready` 等表达，但没有给出状态映射、检测规则、revision 字段、重验证窗口或 route API。
- **证据：** `implementation-contract.md:12` 只列出允许状态，`implementation-contract.md:96` 要求 status/exit mapping，但 `SPEC.md:85–88` 仍将 retry budget、status mapping、stale retention/admission 规则列为 open questions；现有 15 个目标测试没有这些状态矩阵或规则断言。
- **后果：** 测试可以各自选择一个“合理”状态而全部通过，导致同一输入在不同 Story 或 agent 之间产生不兼容结果。
- **建议：** 把开放问题中影响 Epic 1 的最小集合在 Story dispatch 前冻结：状态/退出码表、source/revision identity、partial vs blocked、remote-execution classifier、stale 语义与 retention、ready admission 接口。其余实现细节可留给后续 Story。

## 重复与缺失

### 可合并或共享的验证面

1. Story 1.1 的“URL 级失败不得 full ready”和 Story 1.3 的“partial/all-page failure 返回状态”共享同一个同步状态矩阵；应由一个公共 fixture/contract test 生成，避免两套 status 断言漂移。
2. Story 1.2 的“invalid/blocked 不得 ready”和 Story 1.4 的“disappeared/stale 不得 ready”共享 route admission 边界；应定义一个 admission verifier，分别喂入 invalid、blocked、stale、disappeared。
3. Story 1.1 的 content hash、Story 1.2 的 verify、Story 1.4 的 changed 判定共享同一 canonical hash 规则；当前 AC 没有明确谁拥有该规则。

### 当前缺失的能力/验证

- Resource Entry 持久化 schema：`contentHash`/`contentSha256`、`provenance`、source revision。
- robots、URL 凭据/敏感 query、private/loopback、redirect re-check、response-byte cap。
- sitemap/llms/llms-full 独立发现验证和稳定去重/hash 回放。
- unknown license、remote-execution marker、来源缺失和 route admission。
- absolute/symlink/junction/non-file path 的 DesignMD 专属验证。
- partial/all-failure/recovered envelope、previous snapshot hash、retry/next action。
- atomic write/parse/validation interruption 的可控 failpoint。
- CAP-8 全部 diff 类别、空 diff、前后 snapshot hash 和 stale/disappeared route 阻断。

## 建议的派发前最小修订顺序

1. 先冻结 Resource Snapshot schema 和 status/exit mapping，解决 `contentHash`、`provenance`、`previousSnapshotHash`、`diff` 字段命名。
2. 把 Story 1.1–1.3 的 AC 改成可唯一断言的状态和 envelope，并补 URL/path/inert/admission 的边界 fixture。
3. 先定义并实现最小 snapshot comparison contract，再派发 Story 1.4；不要让 Story 1.4 的实现者自行发明 stale/revision 语义。
4. 派发时要求每个 Story 带一组 hermetic tests，并保留 `scripts/test-manifest.json` 的统一入口；目标测试至少覆盖上述缺失矩阵，而不是只增加 happy-path 数量。

## 结论

Epic 1 可以保留当前四个用户价值 Story，但不应按当前 AC 直接进入多 agent 测试/实现派发。最小阻断项是：统一字段合同、确定状态/退出码、补恢复 envelope、定义 CAP-8 comparison/admission；完成后再派发，测试 agent 才能对每条 AC 给出唯一的自动化通过/失败结论。
