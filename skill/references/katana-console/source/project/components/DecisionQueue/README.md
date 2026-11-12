# DecisionQueue

决策队列：Cockpit 的主区。只放真正需要人裁决的事，裁决只有五种——批准 / 停止 / 调整 / 调查 / 继续研究。每项带：类型与时间 · 一句话事实 + 一行来源（哪个 Agent、哪些证据、建议）· 影响范围与截止 · 可用动作。它是 Agent 团队和人之间唯一的正式交接面；AlertCenter 的命中、RunQueue 的完成、BreakWorkbench 的 break 只有在需要人时才升到这里。

## 结构

- 顶行：待决数与今日已决 · 排序 Segmented（紧急 / 金额 / 闭环）· 右侧五种裁决提示。
- 行 44px：类型点阵标（STOP? red · APPROVE / ADJUST amber · INVESTIGATE / CONTINUE? `ink-300` · INFO 灰）+ 时间 · 事实句（`sans` `ink-100`）+ 来源小字（Agent · 证据组件 · 建议）· 影响（账户短码 / 金额 / 策略）+ 截止 · 动作按钮（≤ 2）。
- 五层对象语法：事实句是 Fact，建议是 Agent 的 Hypothesis / Forecast，用小字与 `ink-300` 与事实分开。
- INFO 类只需"知悉"，默认折叠。

## 交互

- 点击行 → 展开证据（对应组件的快照：IntradayPnL / LossLimits / RobustnessGate …）和 Agent 的推理文字（标来源）。
- 动作：停 / 采纳 / 看篓子 → 对应写命令（走确认 + ConsensusBlock）；查 → 打开相关面板并把 LinkContext 定位；继续 / 归档 → 研究命令（无确认）；知悉 → 记入 DecisionJournal。
- 每个裁决写一条 DecisionJournal（actor、input、reason、result）。
- 截止临近（≤ 30 分钟）类型标转 amber；过期不消失，标 `过期` 并仍可裁决。

## 规则

- Agent 只能**提案**，不能在队列里替人点"批准"。
- 同一事项不重复出现；升级（L3 → L4）更新原行。
- 队列 ≤ 12 项可见；更多说明阈值太松，不是加滚动。
- "已知悉" ≠ "已解决"：INFO 知悉后消失，STOP? 知悉后仍在，直到停止或调查有结论。

## 谁提供什么

- 组件：items[]（id、kind、ts、fact、proposal{agent, evidence[], suggestion}、impact、deadline、actions[]）、sort、onDecide(id, verdict, cmd)。
- 调用方：OpenAlice 提案流 + 规则引擎升级 + BreakWorkbench；裁决写 DecisionJournal。
