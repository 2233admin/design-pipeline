# 隐式状态机盘点，并把最危险的几个改成声明转换表加可恢复

## Why

工具里有不少生命周期靠散落的状态字符串、文件是否存在、哈希匹配、两步改名顺序来表达，没有合法转换表。崩溃或改文案后，它们的行为取决于实现细节。已实测的后果：

- `pipeline-state` 的 state.json 与 events.jsonl 两文件提交，在两次改名之间崩溃后，主文件缺失、写者锁残留，`advance`/`repair` 都以 `writer lock exists` 拒绝，`clearStaleLock` 又要求读到 state.json，无出路。
- `designmd` 发布目录快照时，旧目录改名成 `.backup-<pid>` 之后崩溃，目标目录消失，下一次发布把它当作"没有旧快照"，备份目录无人认领、无人清理。
- 阶段与候选的状态赋值散在二十多处，漏掉一处就可能出现非法状态而无人发现。

## What Changes

- 新增 `skill/scripts/state-machine-core.cjs`：`defineMachine`、`assertTransition`、`moveStatus`、`analyzeMachine`、残留扫描与随机后缀。报错带当前状态与合法下一步（`ILLEGAL_TRANSITION`）。
- 给 adaptation 候选/晋升、pipeline-state 两文件提交、designmd 快照发布补声明转换表，赋值走 `moveStatus`/`assertTransition`。
- pipeline-state：暂存/备份文件名改随机后缀；写者锁持有者进程已死时回收；持锁后先 `recoverTransaction`（前滚或回滚），删除原先的 `STALE_TRANSACTION` 硬失败（仅同一文件多份备份这种歧义仍报）。
- designmd：随机后缀；每次发布前 `recoverPublish`，目标缺失则从备份还原，其余残留清理。
- 三处靠文案/子串的判断改读枚举：`control-runtime-core` 的 `dependencyStatus`、`runtime-review-core` 的 `BLOCKING_FINDING_CODES`、`workflows/shared` 的 `CHECKED_GATES`。
- 盘点表见 `design.md`；其中没改的机器与原因也在里面。

不新增 gate、receipt、schema；不留旧路径别名。

## Impact

- 受影响能力：`design-pipeline` 的状态持久化与恢复。公共命令与退出码不变；崩溃后再次运行同一命令由失败变成自动恢复。
- 复用：`pipeline-state-core` 既有 `failpoint`、`inspectConsistency`；`adaptation-core` 既有 prepare/recover 日志。
