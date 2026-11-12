# HypothesisLedger

假设账：研究的起点与"Research Inbox"。每条假设有 ID、一句话、owner（人或 Agent）、依据与反例计数、测试范围（宇宙 · 频率 · 区间）、状态（PROPOSED / TESTING / SUPPORTED / REFUTED / ARCHIVED）与指向的 run 或因子。它是对象链 `Hypothesis → Dataset → Factor → Run → …` 的第一环，也是探索通道（Exploration Lane）的入口。

## 结构

- 顶部 Inbox：≤ 3 条新线索（Research Agent 从文献 / 新闻 / 异动 / 事件市场提出，或人从 Notes 带入），`HYPO` 蓝标 + 一句 + 来源小字；点"初筛"→ RunLauncher（factor 类型，低成本）。
- 表：ID · 假设（`sans`）+ owner 与日期 · 依据 / 反例计数（反例 amber）· 范围 · 状态点阵标 + 下游（run 蓝标 / 因子名 / 决策队列）。
- 状态：TESTING 橙、SUPPORTED 绿、REFUTED / ARCHIVED 灰；REFUTED 必须写一句原因。
- 页脚：100% 完整性声明 · 新建入口。

## 交互

- 点击假设 → 展开证据列表（每条带来源与时间：论文 / 新闻 / EventStudy / 异动 / Notes）与反例；点击证据跳源。
- 「初筛」/「测试」→ RunLauncher 预填（对象 = 假设，类型 factor / backtest）；run 完成后状态自动 TESTING → 待人判定。
- 判定 SUPPORTED / REFUTED 是人的动作（研究命令，无确认），写 DecisionJournal。
- 从 EventStudy「做成因子」、NewsFeed「加入笔记」、Notes `@` 都能生成假设。

## 规则

- Agent 可以提出和测试假设，不能判定 SUPPORTED。
- 假设与因子 / 策略一对多；因子退役不删假设。
- 没有范围的假设不能进 TESTING。
- 五层语法：假设永远 `HYPO` 蓝标，不与事实（证据）混排。

## 谁提供什么

- 组件：hypotheses[]（id、text、owner、createdAt、evidence[]、counter[]、scope、state、links）、inbox[]、onTest、onJudge。
- 调用方：OpenAlice Research Agent + Notes + 事件源。
