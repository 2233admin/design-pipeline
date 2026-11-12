# DecisionJournal

决策日志：人、Agent、系统的每一个关键动作——时间 · actor（HUMAN 橙 / AGENT 蓝 / SYSTEM 灰）· 动作与理由（含证据或 hash 小字）· 结果（含来源与时间）· 影响范围。append-only，可搜索，按对象或 actor 聚合。它是 Learning 闭环的记忆，也是审计源：关键资金动作 100% 有 actor / input / reason / result。

## 结构

- 顶行：区间 Segmented（今日 / 本周 / 按对象 / 按 actor）· 计数拆分 · 搜索。
- 行 30px：时间 · actor 点阵标 · 动作句（`sans`）+ 理由 / 证据小字 · 结果（失败 / 触发 red 文字）· 影响。
- 系统自动动作（限流退避、限额触发）也记，actor = SYSTEM。
- 理由里的提案采纳关系写明（"采纳 Ops Agent 提案"）。

## 交互

- 点击行 → 展开完整输入（命令参数、hash、ConsensusBlock 快照）、结果链（订单 id → 成交）、相关面板快照。
- 按对象视图：选一只票 / 一条策略 / 一个账户，看它的全部决策时间线。
- 搜索：动作、理由、对象、hash。
- 「加入报告」→ ReportBuilder 的"本周决策"一节。

## 规则

- 不可编辑、不可删除；更正写新行引用旧行。
- 每条 DecisionQueue 裁决、每个 write 命令确认、每次 strategy.promote、每次 break 闭合、每次假设判定自动生成一条。
- Agent 的提案与人的裁决分两行，不合并——谁提的、谁定的要分开可见。
- 不做"决策评分"或"命中率"排名；复盘用 TradeStats 与 AlphaLedger。

## 谁提供什么

- 组件：entries[]（ts、actor、kind、text、reason、evidence[]、result、impact、refs）、filter、onOpen。
- 调用方：命令表（每个 write 命令确认后写）+ OpenAlice 提案流 + 规则引擎 + 对账作业。
