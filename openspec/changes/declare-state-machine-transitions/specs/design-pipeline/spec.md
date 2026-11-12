## ADDED Requirements

### Requirement: 有生命周期的状态由声明的转换表管辖

adaptation 候选、adaptation 晋升、pipeline-state 两文件提交、designmd 快照发布 SHALL 各自声明 `{from: [to...]}` 转换表并在写状态前断言。非法转换 SHALL 抛 `ILLEGAL_TRANSITION`，消息含当前状态与合法下一步。

#### Scenario: 非法转换

- **WHEN** 已拒绝（`rejected`）的候选被要求变为 `promoted`
- **THEN** 调用 SHALL 以 `ILLEGAL_TRANSITION` 失败，消息含 `current state rejected` 与 `legal next`，记录状态不变。

#### Scenario: 转换表自洽

- **WHEN** 遍历全部已登记的机器
- **THEN** 每个声明状态 SHALL 自初始状态可达，且没有转换指向未声明状态。

### Requirement: 两步提交崩溃后下一次运行自动收敛

pipeline-state 的 state.json 与 events.jsonl 提交，以及 designmd 目录快照发布，SHALL 使用随机后缀的暂存与备份路径。下一次写入 SHALL 先回收已死进程的写者锁，再前滚（新的一对文件一致）或回滚到备份，并清除残留。

#### Scenario: 在两次改名之间崩溃

- **WHEN** 进程在 state/events 备份之后、安装之前被杀，随后再次执行 `advance`
- **THEN** 命令 SHALL 成功，state 与 events 一致，目录中无 `.tmp-`、`.backup-` 与 `.lock` 残留。

#### Scenario: 存活写者的锁

- **WHEN** 锁文件记录的进程仍存活
- **THEN** 写入 SHALL 以 `writer lock exists` 拒绝，锁不被回收。

#### Scenario: 快照目录在改名间隙丢失

- **WHEN** designmd 发布在旧目录改名成备份之后崩溃，随后再次发布
- **THEN** 备份 SHALL 先还原为目标目录，新快照的 `previousSnapshotHash` 等于旧快照哈希，父目录只剩目标目录。

### Requirement: 状态判断读枚举字段，不读文案或子串

phase 因依赖变 `stale` SHALL 读 blocker 的 `dependencyStatus`；runtime review 的新鲜度 SHALL 读登记的阻断码集合；检查型 gate 的失效 SHALL 读 deliverable 到 gate 的同一张表。

#### Scenario: 改文案不改状态

- **WHEN** 依赖阻断消息的措辞被改动
- **THEN** phase 状态 SHALL 不变。
