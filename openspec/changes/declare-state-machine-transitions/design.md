# Design

## 盘点范围与方法

扫描目录：`skill/scripts`（含 `workflows/`、`component-first/`）、`skill/adapters`、`skill/tools/*`、`scripts/*`、`tools/browser-automation`、`evals/*`、`tests/`。方法：对 `renameSync`、`process.pid` 临时名、`.status =`、锁文件、`rmSync(... recursive)` 全量 grep（`skill/scripts` 99 个文件有命中，其余目录的命中见下），再逐个读被点名的函数。**读过并核实**的才写结论；只 grep 过、没读全的标「待核对」。`tests/` 里没有独立的生命周期，被测代码就是下表的实现。

## 全量表

状态列：本 change 的处理。「改」= 声明转换表/加恢复并有测试；「未复现」= 读过代码，线索描述不成立或不可达；「未改」= 核实存在，但风险低于选中项，原因写明。

| # | 名称 | 文件:行 | 状态集合 | 谁触发 | 非法/未保护转换、崩溃窗口 | 测试 | 处理 |
|---|---|---|---|---|---|---|---|
| 1 | adaptation 候选 | `adaptation-core.cjs` CANDIDATE_MACHINE | task-shadow, proposed, evaluated, rejected, promoted, superseded, rolled-back | propose/evaluate/promote/reject/rollback/recoverPrepared | 原先 8 处直接赋值，无表。`reject` 对 rolled-back 与已 rejected 的候选都放行 | `adaptation.test.cjs`（9 项） | 改 |
| 2 | adaptation 晋升 | 同上 PROMOTION_MACHINE；`recoverPrepared` 259，`rollback` 623 | prepared, promoted, superseded, rollback-prepared, rolled-back | promote/rollback/加载时恢复 | 两阶段提交已有 prepare 日志与按哈希恢复。线索说 `recoverPrepared` 的 `candidate` 没判空：`loadState` 的校验已要求 prepared/rollback-prepared 必有候选，**不可达，未复现**。漂移时 `STATE_INTEGRITY` 的信息缺出路，已补当前状态与处理办法 | 同上 `prepared promotion and rollback journals recover…` | 改（表与报错）；空判断未复现 |
| 3 | pipeline-state 两文件提交 | `pipeline-state-core.cjs` `commitStateAndEvents` 547，`writeNewChange`，`withWriterLock` 520 | idle→staged→backed-up→events-installed→state-installed→committed / rolled-back | advance/repair/change init | 崩溃在改名间隙：主文件缺失 + 锁残留 + PID 命名残留 → `LOCKED`/`STALE_TRANSACTION`，`clearStaleLock` 先读 state.json 所以连它都用不了。**已复现**（HEAD 上 3 项崩溃测试失败） | `pipeline-state.test.cjs` 的进程内 failpoint；新增 `state-recovery.test.cjs` 的真实崩溃 | 改 |
| 4 | designmd 快照发布 | `designmd-core.cjs` `writeCatalog` 545，`recoverPublish` 534 | idle→staged→backed-up→installed→committed / restored | `designmd sync` | 旧目录改名后崩溃 → 目标缺失，下一次视为无旧快照，`.backup-<pid>` 永不清。**已复现**。线索里的 `rmSync` 后 `renameSync` 窗口：该窗口只在已发生错误的回滚路径里，现在由 `recoverPublish` 兜底。无锁（并发 sync）**未改** | `designmd-ingestion.test.cjs`；新增崩溃测试 | 改（恢复）；锁未改 |
| 5 | control 阶段状态 | `control-runtime-core.cjs` `runTo` 约 200 | ready, blocked, stale, inconclusive, complete… | `run`/`status` | `/stale/i.test(item.message)` 读文案。读过后发现：stale 的阶段本身先于其依赖者被选中并 break，依赖者带 stale 依赖的分支**几乎不可达**，误判**未复现**。仍改成读 `dependencyStatus`，因为读文案是隐患 | `design-control-runtime.test.cjs` | 改（低风险） |
| 6 | runtime review 新鲜度 | `runtime-review-core.cjs:162` | blocked, stale, matched | `runtime-review` | `code.includes("BLOCKED")`；现有两个阻断码恰好含该子串，新增阻断码漏写就变 stale | `runtime-review.test.cjs` | 改（低风险） |
| 7 | 检查型 gate 失效 | `workflows/shared.cjs` `CHECKED_GATES` | film, edit, interaction | 工作流重检 | 同一份 gate 清单硬编码两处。现统一一张表 | `workflow-*.test.cjs` | 改（低风险） |
| 8 | 反馈观察/索引成对提交 | `reconcile-publication.cjs` `commitPair` 219；`record-feedback.cjs:512` | observation.status 只写过 `open`；publication 有/无 | reconcile/record | `commitPair` 在加锁前读原值；第二个改名失败时用"再写一份原值"回滚，非原子；两次改名间崩溃留下 observation 已发布而 index 未更新。status 枚举实际只有 `open`，没有可声明的转换 | `publication-bridge.test.cjs`、`record-feedback.test.cjs` | 未改，**窗口真实存在**：observation 已写、index 未写时崩溃，重跑 reconcile 因 `observation.publication` 已存在直接返回 `reconciled:false`，index 不会补齐。数据不丢（只是索引缺 remoteUrl），故排在 3、4 之后；建议后续 change 让重跑时补写 index |
| 9 | design-synthesis 清单 | `advance-design-synthesis.cjs:124` `requireStage`，`init-design-synthesis.cjs:244` | status: awaiting-input, in-progress, ready-for-synthesis, needs-review, ready-to-implement, complete, archived | advance/init | 已有 `requireStage` 约束 stage；status 与 stage 成对赋值；init 对 complete/archived 拒绝。线索说 re-init 会盖掉进行中清单：本次未读 merge 路径，**待核对** | 有 CLI 测试 | 未改 |
| 10 | film-project 步骤 | `film-project-core.cjs:280-320` | step.status + 布尔 `stale` | film check | `stale` 与 status 并存，由 `skipped||stale` 汇总 | `film-*.test.cjs` | 未改：读过，汇总处两者一并判断，不会漏 |
| 11 | playground 回执 | `playground-core.cjs:372,454` | verification.status pending/passed；applicability required/waived | playground check | 用 `assertEnum` 校验的是回执字段，没有进程内生命周期 | `playground-*.test.cjs` | 不属于状态机 |
| 12 | web 证据采集暂存 | `capture-web-evidence.cjs:103,148` | stage 目录 → outputRoot | capture | `.tmp-<pid>` 暂存目录，正常与异常路径的 `finally` 会清；硬崩溃才残留，且只是孤儿目录，不影响输出目录 | `capture-web-evidence` 相关测试 | 未改：只残留孤儿目录 |
| 13 | pipeline-state 迁移写 | `pipeline-state-core.cjs` `writeCrashSafe` 767 | temp/backup 改名 | `migrate` | 仍用 `.tmp-<pid>`/`.backup-<pid>` 命名，有 `expectedSha256`，一次迁移一个文件 | `pipeline-state.test.cjs` | 未改 |
| 14 | 维护脚本的目录换新 | `scripts/import-*.cjs`（design-md、brand-design-systems、film-sources、gepa、good-css、iart、mengto、scoped-snapshot、direction-library、answer-me-with-html）`destination.backup-<pid>` | stage→backup→install | `npm run sources:update` 等 | 同一"改名两步"模式，十处。目标在 git 里，崩溃后 `git checkout` 即可恢复 | 各 import 的测试 | 未改：开发期、可由 git 恢复 |
| 15 | art-motion 渲染 | `skill/tools/art-motion/render.cjs:200` | temporary → render.mp4/mov | render | 单文件改名 | — | 未改（待核对整体流程） |
| 16 | 组件评估锁 | `scripts/component-eval.cjs:111` | lock 文件 `{pid}` | 评估 | 只写 pid，未读后回收 | — | 待核对 |
| 17 | agent-browser 适配器会话 | `skill/adapters/agent-browser.cjs:146` | session 名含随机后缀 | 浏览器适配 | 会话名随机，不是状态机 | `agent-browser-adapter.test.cjs` | 不属于 |
| 18 | visual 完成记录（缺 status 当 ready） | `skill/scripts/workflows/web.cjs`、`check-*` | — | — | 线索未定位到具体代码 | — | 待核对 |

**待核对（只 grep 过，没读全）**：`tools/browser-automation/*`、`evals/ablation`、`evals/cases`、`skill/tools/{page-review,film-methods,template-bank,visual-craft,visual-diagnostics,gepa,motion-recipes,prompt-motion}`、`skill/scripts/component-first/*`、`interaction-capture-core`、`film-eval-core`、`film-core`、`toolchain-core`、`material-core`、`component-fit-core`。grep 里的 `.status =` 命中多为一次性结果对象，不是持久生命周期。

## 选择

风险排序依据：崩溃后是否无出路（3）、是否丢数据或孤儿（4）、是否有 ≥8 处散落赋值（1、2）。5、6、7 是改动小、风险低的枚举替换，顺带做。8、9、10、13、14 见表中原因。

## 复用与兼容

- 公共命令、退出码、JSON 形状不变；`STALE_TRANSACTION` 只在同一文件有多份备份时保留。
- `commitStateAndEvents` 与 `writeNewChange` 的 failpoint 参数保留。
- 机器在模块加载时登记，`state-machine-core.cjs` 随 skill 打包，已列入 `package-resources.json`。
- 文件所有权：状态机表归各 `*-core.cjs`；共用的断言、后缀与残留扫描归 `state-machine-core.cjs`。

## 恢复规则（pipeline-state）

持锁后 `recoverTransaction`：若存在备份，且新的一对文件都在并且一致，前滚（删备份）；否则对每个有备份的文件，删现有同名文件并把备份改名回去（回滚）；只有暂存文件则删除；`state.json` 缺失而 `events.jsonl` 为 0 字节（初始化中断）则删除孤儿。写者锁里的 PID 已死才回收，EPERM 视为存活。
