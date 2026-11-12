# 量化研究层（Lab）与运行中心

量化工作台的核心不是盯盘也不是管组合，是**研究流水线**：数据 → 因子 → 模型 → 回测 → 验证 → 上线 → 实盘偏离 → 回到研究。OpenAlice 跑这条流水线（session / task / run），KATANA 是它的仪表盘与控制台：每个环节一个台面，每个产物一种图，每个 run 可追溯到输入快照与证据。

**和 Fincept / TradingView 的根本区别**：没有脚本编辑器、没有节点编辑器。代码在用户的 Python 仓库里由 Claude Code 写；KATANA 显示 run 与结果，并通过同源命令触发 run。研究逻辑永远不在前端。

## 1. 流水线与台面

| 环节 | 台面模板 | 面板 | 回答什么 |
|---|---|---|---|
| **数据** | `1+2` | DatasetCatalog · DataQuality · SeriesBrowser | 有什么数据、覆盖到哪、哪里有洞 |
| **假设** | `1+2` | HypothesisLedger（主，含 Research Inbox）· EventStudy · SeriesBrowser | 有哪些研究优势候选、证据多强、探索通道里有什么新线索 |
| **因子** | `1+3` | FactorLibrary（主）· FactorIC · QuantileLayers · FactorDecay | 哪个因子有效、衰减多快、和已有因子相关吗 |
| **模型** | `1+2` | ModelCard · FeatureImportance · ParamScatter | 模型学到什么、哪些参数敏感 |
| **回测** | `1+3` | RunInspector（主，顶部 RobustnessGate）· EquityCurve · TradeStats · PnLAttribution | 可不可信、赚不赚、怎么赚、输入是什么 |
| **验证** | `2x2` | WalkForward · StrategyCompare · RegimeStrip · EventStudy | 样本外还行吗、分状态行吗、是不是过拟合 |
| **上线** | `T` | DeploymentBoard（主）· RunQueue · SignalMonitor | 哪条策略在哪个阶段、门过了没、今天发了什么信号 |
| **实盘偏离** | `1+2` | LiveDivergence（主）· FillLog · TCA | 实盘和回测差在哪：信号、成交、成本 |

启动任何 run 用 RunLauncher（命令表单），不在各面板里藏按钮。

## 2. 研究对象模型

```
Dataset        id, source, universe, fields[], coverage{from,to,gaps[]}, pointInTime: bool
Factor         id, name, family, expr | code ref, universe, freq, lastRun, stats{ic, icir, turnover, decay[], corrTop[]}, gates[5]
Model          id, kind (linear|tree|nn|rule), features[], target, trainWindow, lastRun, metrics, importance[]
Strategy       id, name, model | factors[], universe, rebalance, costs, stage: research|paper|live|retired, gates[]
Run            id, kind (factor|backtest|walkforward|stress|optimize|train), inputs{snapshotHash, params, dataset@version, code@commit}, status, startedAt, duration, outputs[], evidence[], parent?
Signal         ts, strategy, symbol, side, size, reason (feature contributions), executed?: fillRef
```

- **一切结果挂在 Run 上**：图表标题、KPI、门、瓦片都带 run id；没有 run id 的数字不出现在 Lab。
- **Run 不可变**：重跑产生新 run，旧 run 不消失；StrategyCompare 比的是 run，不是"最新"。
- **门（gates）是固定评估器**：因子五道（覆盖 / IC / 成本后 / 稳定性 / 相关性）、策略五道（样本外 / 容量 / 回撤 / 换手 / 偏离），前端只显示 LED 与证据，不重算。
- Strategy 的 `stage` 推进（research → paper → live）是写命令，走确认；回退（live → paper）也是。

## 3. 组件清单（研究层）

| 组件 | 一句话 | 形态 | 状态 |
|---|---|---|---|
| EquityCurve / FactorIC / QuantileLayers / Heatmap | 已有 | — | ✅ |
| **FactorLibrary** | 因子库：卡片网格 / 表两种视图，每张卡 IC · ICIR · 换手 · 衰减迷你线 · 五门 LED · 相关最高因子 | DataGrid + SparkTile | ✅ |
| **RunInspector** | run 证据：输入快照 hash、参数、数据版本、代码 commit、门结果、产物、父子 run 树 | 键值 LCD + 树 | ✅ |
| **RunLauncher** | 启动 run 的命令表单：类型 → 对象 → 参数 → 数据版本 → 成本模型，五步各一行 | TanStack Form | ✅ |
| **WalkForward** | 训练 / 评估窗口甘特 + 每窗收益条 + 样本内外对照 | 甘特 + 零轴条 | ✅ |
| **ParamScatter** | 参数敏感性 / Optuna：散点 + 最优点 + 平坦度；二参数时热力 | 散点 / Heatmap | ✅ |
| **StrategyCompare** | 多 run 对照：净值叠加 + 指标表 + 门矩阵；去排行榜化 | EquityCurve + DataGrid | ✅ |
| **DeploymentBoard** | 策略生命周期：research → paper → live → retired 四列，每张卡五门 LED、容量、偏离 | 看板（列是阶段，不是 tab） | ✅ |
| **LiveDivergence** | 实盘 vs 回测：信号一致率、成交率、成本差、净值差三层拆解 | 三条零轴 + 双线 | ✅ |
| DatasetCatalog | 数据集目录：源、宇宙、字段、覆盖条、point-in-time 标 | DataGrid + 覆盖条 | ✅ |
| DataQuality | 缺口 / 异常 / 停牌 / 复权一致性热力（日期 × 字段） | Heatmap | ✅ |
| SeriesBrowser | 任意序列浏览对比、指数化、对数 | PriceChart 多线 | ✅ |
| FactorDecay | IC 随持有期衰减曲线 + 半衰期 LCD | 折线 | ✅ |
| ModelCard | 模型卡：类型、特征、训练窗、指标、特征重要性条（含稳定性）、校准图 | KPI + 零轴条 | ✅ |
| RegimeStrip | 市场状态带（牛 / 熊 / 震荡 / 高波）叠在时间轴下，分状态收益表 | 色带 + DataGrid | ✅ |
| EventStudy | 事件前后 N 日累计超额收益 + 置信带 | 折线 + 点阵带 | ✅ |
| SignalMonitor | 今日信号流：策略、品种、方向、理由（特征贡献）、是否已执行 | DataGrid（SmartTape 滚动） | ✅ |
| RunQueue | 排队 / 运行中 / 完成的 run，进度条，资源占用 | DataGrid + Meter | ✅（运行中心） |
| AliceSessions | OpenAlice 会话与任务投影：在跑什么、等什么、产出什么 | DataGrid | ✅（运行中心） |

## 4. 运行中心

运行中心是机器的"机舱"：RunQueue · AliceSessions · DataSources（连接状态 + 覆盖 Meter）· SymbolMap · AgentsStatus（MCP / 模型 / 额度）· SystemHealth（Quote Hub 延迟、Worker 帧时、内存、磁盘）· RENDER 面板（rendering.md）· ReportBuilder 排程。全部是 StatusLED + Meter + LCDReadout + DataGrid 的组装，没有新基元。这里是开盘自检（pixel.md §4）读数的来源。

## 5. 规则

- 研究产物的动效和音效是系统里唯一允许"结算感"的地方（`bouncy` + `run-done`），因为它是工作完成，不是盈亏（readability §25）。
- Lab 的颜色：策略 / 因子按 `series-1..7` 固定顺序，样本内 `ink-300` 样本外 `series-n`，基准灰；门用 StatusLED 五态。
- 每张图右上角三件：表格视图、导出、「加入报告」。
- 研究账本（`kind=research`）可以进 PositionBook / RebalanceDesk / FactorExposure / StressTest 对照，永不进执行与账务。
- 与 OpenAlice 的边界：KATANA 发 `run.*` 命令、显示 run；OpenAlice 决定怎么跑、在哪跑、跑完写什么。KATANA 不解释结果——解释是 OpenAlice 的文字产物，RunInspector 里以 `评估` 一节显示并标来源。
