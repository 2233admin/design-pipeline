# StrategyCompare

策略对照：把若干 run 放在同一区间、同一成本模型下看——净值叠加、指标表、五门矩阵。Fincept「Alpha Arena」的去游戏化版：没有名次、没有奖杯，每列最好的值标橙，仅此而已。比的是 **run**，不是"策略最新版"。

## 结构

- 顶行：run 数与对齐条件（区间 / 成本模型，不一致时 amber 提示"口径不同"）· 图 Segmented（净值 / 回撤 / 滚动夏普）· 加入 run · 导出。
- 图：各 run `series-1..7` 固定顺序 2px，基准灰虚线；退役或取消勾选的 run 40% 透明；≤ 7 条。
- 表：色块 · run id + 策略名 + 一句参数差异 · 年化 · Sharpe · MaxDD · 换手 · OOS/IS · 五门 LED。每列最好的值 `signal-orange`；越限的值 amber。
- 页脚：基准说明 · "橙 = 该列最好，不是排名" · 右侧动作：推进选中 run 的策略到下一阶段（写命令，走确认）。

## 交互

- 勾选 / 取消 run → 线 opacity 120ms，其余线不重新上色（dataviz §5）。
- 悬停行 → 对应线高亮，其它 40%。
- 列头点击排序表（图不变）。
- 拖入 run（从 RunInspector / FactorLibrary / EquityCurve 标题）= 加入对照；区间不一致时自动裁到交集并提示。
- 「推进 → paper」→ DeploymentBoard 对应卡移动（确认后）。

## 规则

- 不同成本模型或区间的 run 可以放一起看，但表头 amber 标"口径不同"，且不标橙最优。
- 不做综合评分列；不做雷达图。
- 退役 run 允许留在对照里（作为反例），默认 40% 透明。
- 对照集可保存并命名（研究层对象），ReportBuilder 可引用。

## 谁提供什么

- 组件：runs[]（id、strategy、paramsDiff、metrics、gates[5]、nav[]、retired?）、bench、view、aligned{range,costs}、onToggle、onPromote。
- 调用方：run 存储（Query）；对齐裁剪在 Worker。
