---
status: in-review
---

# Tasks：已批准实施

前置：main 已确认用户在 CHECKPOINT 1 明确 **Approve**，实施按以下分工执行。详细接口只以 `design.md` 为准，不另起协议；冻结的 intent 保持只读。

## Core slice（owner：core agent）

- [x] `skill/scripts/runtime-review-core.cjs`：实现三个同步 exports；复用 Playground selection、interoperability、component-first-v2、evidence、contract-utils；实际读取 declared bytes，产出自包含 HTML/Bundle、只读 Projection、change-local Record。
- [x] `skill/references/runtime-review.schema.json`、`runtime-review-feedback.schema.json`：实现 design.md 的严格形状、Ref、身份/映射/类别校验与失败语义；不要新增 receipt/gate/global 状态。
- [x] `skill/references/runtime-review.md`：记录 captured、声明覆盖范围、check/import 生命周期、开发消费者重核/重建步骤与安全路径约束。
- [x] `tests/runtime-review.test.cjs`：仅新增 consumer-visible 负例；覆盖未接受/错配、不可读/unknown、escape/link、漂移、旧验收不得继承、反馈身份/字段/类别、record≠resolved、只读/无 target 和 ledger 写入。

## Public integration slice（owner：CLI agent）

- [x] `skill/scripts/cli-core.cjs`：只接 import、COMMANDS 三 actions、现行 flags 的 action allowlist、help 与结果 exit mapping；文件参数 relative changeRoot，保留同步 execute 和 JSON envelope。先重读用户 dirty 文件，禁止整文件覆盖。
- [x] `skill/references/package-resources.json`、`scripts/test-manifest.json`：登记 core/schema/reference/负例；保留已有用户条目，不替换 manifest。
- [x] `skill/SKILL.md`、`README.md`、`CHANGELOG.md`：最小入口/用法/行为变更说明；不改 Playground、pipeline issue feedback 或 quality 能力合同。

## 集成与交接（owner：main）

- [x] 所有 slice 完成后统一运行 `node scripts/qa.cjs`，按声明 test manifest，不使用裸 node --test；修复前历史源测试 727/727、安装包 11/11。修复后第一轮 final-code QA exit 0、49.12s：源测试 735/735、安装包 11/11、reproducible tgz/zip/checksums 与 status byte-identical 均 OK；完整输出保留在原实施机器的本地临时目录，未纳入仓库。后一次 stdout 因磁盘空间不足保存失败，exit/footer 不可恢复，未作为通过证据；文档小修后同一 `scripts/qa.cjs` 再次实际运行 QA_EXIT_CODE=0（48.84s）。
- [x] 临时真实 target/browser UI smoke：build 页面→选对象→copy prompt/export→显式 record→开发消费者读取同条 Record 并修改该临时 target→check 旧 bundle stale（exit 2）→实际重启 target→browser 新 capture→新 manifest/build/check matched。未知 producer authenticity 仍明确；反馈仍 recorded，不自动 resolved。
- [x] 留存 smoke/QA 证据并走原 ledger/receipts 的执行核验；原 CF、Bundle、Record、app.js hashes 未改，CF blocked / Visual not-evaluated 保持分轨。证据路径与实测限制记录在原实施期的本地实施记录（未纳入版本库）；未新增永久 E2E、未把私有内容或临时 fixture 落 repo。

实施完成与验证完成分开记录：core/CLI 的实现任务不代表 QA 或真实运行链已通过；主控完成最后三项后，才可报告端到端验收结果。

## CodeReviewGate 与人类交接

- [x] CodeReviewGate：Main 已完成 54 原始发现 disposition、六修复方向（P2 两缺陷）、V10/V11 验证强化及 31 preexisting deferred 条目；targeted public CLI 21/21、0 fail、15.68s，修复后第一轮全仓 QA 与新 HTML 真实检查通过。
- [x] 新 `after-review-fixes` HTML：沿用真实历史 `capturedAt=2026-10-03T20:48:50.572Z`，不是 recapture；两方向原生 File.text 延迟竞争均 latest wins，两对象草稿恢复，settings-status 实际映射 `index.html:7/status-card`。same-D raw 下载 SHA `E2960D1330970C8C5459EF8F56B0A86FC5A4B63996F8EE2CDFB476DC3980C712` 经 public record 两次 exit 0；Record SHA `82A3FA3B9182755CAC2432BA28482D414290481EF322E7F5FAD45188F683003E` 与原 contextAtRecord 不变，仍 recorded，非 resolved。详细 Bundle/Record 路径及真实桌面/移动证据见 SSOT。
- [x] 如实记录 clipboard 限制：当前 file 页 write 报告 copy 成功，但原生 readback 为 `NotAllowedError: Read permission denied`、SDK read unavailable；没有权限绕过，不称最新 clipboard 读回已证明。
- [x] 按 resolved sync-sprint-status precondition，`story_key` 未设置，显式 skip；未创建 story 或修改 sprint-status。
- [ ] 人类 CHECKPOINT 2 接受：尚待用户明确接受；OpenSpec status 保持 `in-review`。SSOT `done` 仅表示实现与已执行自动门禁完成，不等于人类接受。

最终文档后门禁由 Main 低输出运行同一 `scripts/qa.cjs`，实际 QA_EXIT_CODE=0（48.84s）；后一次被截断的 stdout 不作 passed 证据。Multica 在原实施期因 server 连接失败 blocked；KB 因工作 registry/locator 缺失未落候选 note，不使用 personal fallback。

## 移植到最新 main（port/runtime-review）

- [x] 原分支 `check-project-progress` 落后 main 127 个提交；在最新 `origin/main` 上重新应用 f55fcdd。118ffad 只修改 `_bmad-output/` 本地实施记录，该目录在 main 上被 `.gitignore` 排除且不得提交，故无可移植内容；f55fcdd 中全部 `_bmad-output/` 文件同样排除。
- [x] 冲突按"保留 main 行为 + 接入本功能"解决：`cli-core.cjs` 只加 import、help 五行、runtime-review 选项校验/命令函数、`COMMANDS` 条目与 dispatch 前置校验，所用 flags 均已在 `KNOWN_OPTIONS`/`BOOLEAN_OPTIONS`；`test-manifest.json`、`package-resources.json` 追加登记；main 已将 `SKILL.md` 改为精简英文路由，故只加一条指向 `references/runtime-review.md` 的入口；`CHANGELOG.md` [Unreleased] 以英文 Added 条目记录（原未发布功能自身的 Fixed 条目并入其中）。

