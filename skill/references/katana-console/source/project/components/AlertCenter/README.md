# AlertCenter

警报中心：左列规则、右列今日命中。规则就是一条带触发条件的命令（CommandSpec + `when`），所以能存、能导出、能被 CLI / MCP / OpenAlice 建立；命中按 states.md 告警阶梯走，同类合并计数。TradingView 的 13 类警报在这里是 5 种条件源 × 4 级动作。

## 规则（左列）

- 行：启用拨杆（Toggle 小号）· 条件（一行，运算符 `signal-orange`）· 动作小字 · 等级点阵标 L1–L4。行高 `row-base`。
- **条件源**（≤ 5）：价格 / 指标（本地指标注册表）/ 订单流（CVD、大单、失衡、速度）/ 账户与风险（保证金、回撤、集中度）/ 研究（OpenAlice run 完成、门通过）。
- 作用域：单品种 / 自选列表 / 账户 / 策略。
- 多条件：且 / 或，≤ 3 条（TV 允许 5，但 §7 工作记忆说 3）。
- **等级决定动作**（和 states.md 阶梯一一对应，不可自定义成"L1 占屏"）：
  - L1 灯 + `radar-ping`，可附加「加入观察」
  - L2 常亮 LED + 可附加 Webhook / 推送
  - L3 面板边框 amber + 中部大字 + 可附加「OpenAlice 评估」
  - L4 占屏确认，**只允许账户 / 执行类条件源**
- 新建 = 一个小表单（TanStack Form）：源 → 对象 → 条件 → 等级 → 动作，五步各一行，Enter 逐步下移。
- 停用的规则整行 `ink-300`，小字写停用时间与原因（手动 / 命中后一次性 / 失效）。

## 今日命中（右列）

- 行：时间 · 内容（≤ 20 字符）· 计数点阵标；最新一条左 2px 橙描边。
- **合并**：20 分钟内同规则同级 > 5 次自动合并成一行 `×n`，点击展开；合并行计数 `signal-orange`。
- 点击命中 → LinkContext 写入品种，ReplayBar 定到那一刻（如果 Desk 开着）。
- 命中日志永不自动清空；「清除」只是视觉折叠。

## 规则

- 不用颜色区分规则类型；等级用点阵标，命中用亮度（§16）。
- 同屏发光体预算仍然成立：命中灯在 Watchlist / StatusLED 矩阵上亮，AlertCenter 本身只有描边。
- Webhook 出站与 OpenAlice 调用是写副作用，建立规则时走一次确认；触发时不再确认。
- 研究类命中无音效。

## 谁提供什么

- 组件：rules[]（id、enabled、source、scope、conds[]、level、actions[]）、hits[]（ts、ruleId、text、count）、onToggle、onCreate(cmd)。
- 调用方：规则引擎在 Worker / 服务端跑；组件只显示与建立。

## ATAS 对照补齐（2026-10-03，atas.md §2.6）

- 新增三类规则源：**绘图源**（DrawingToolbar 的 Horizontal Line 接近告警）、**订单流源**（Cluster Statistics 14 项、ClusterSearch 五个检测器、SmartTape 6 种 Filtration Mode、MBOTrackers 三 Tracker、Big Trades）、**风控源**（LossLimits 限额触发）。
- 渠道：声音 · 告警阶梯 · Telegram · **Webhook（多条件在时间窗内合并为一条）**；不做 Email（ATAS 也已停）。
- 规则离线不触发的问题由后端评估器解决（账户 / 研究类规则跑在 OpenAlice task），面板显示"离线时由服务端评估"标记。
