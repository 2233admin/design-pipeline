# Tasks

## 1. 记录与盘点

- [x] 1.1 proposal.md、design.md（全量盘点表）、`design-pipeline` spec delta。
- [x] 1.2 `npm exec -- openspec validate declare-state-machine-transitions --strict` 与 `npm run specs:check`。

## 2. 先复现再改

- [x] 2.1 `tests/state-recovery.test.cjs` 加崩溃注入（`tests/helpers/crash-child.cjs` 在第 N 次 `fs.renameSync` 前 `process.exit(9)`）；在未改动的 HEAD 上 4 项失败，改后全过。
- [x] 2.2 pipeline-state：随机后缀、死锁回收、`recoverTransaction`、提交步骤转换表。
- [x] 2.3 designmd：随机后缀、`recoverPublish`、发布转换表。
- [x] 2.4 adaptation：候选与晋升转换表，赋值改走 `moveStatus`；漂移报错带当前状态与出路。

## 3. 枚举替代文案判断

- [x] 3.1 control-runtime `dependencyStatus`；runtime-review `BLOCKING_FINDING_CODES`；workflows/shared `CHECKED_GATES`。

## 4. 遍历测试与登记

- [x] 4.1 `tests/state-machine-tables.test.cjs`：每台已登记机器的状态可达、无悬空、非法转换报错含当前状态与合法下一步。
- [x] 4.2 两个新测试登记 `scripts/test-manifest.json`；`state-machine-core.cjs` 登记 `skill/references/package-resources.json`。
- [x] 4.3 CHANGELOG 一条。

## 5. 验证

- [x] 5.1 聚焦：`node --test tests/state-recovery.test.cjs tests/state-machine-tables.test.cjs tests/pipeline-state.test.cjs tests/adaptation.test.cjs tests/designmd-ingestion.test.cjs`。
- [x] 5.2 仓库 QA：`npm test`，与未改动 HEAD 的基线逐项对比，差异写进 PR。
