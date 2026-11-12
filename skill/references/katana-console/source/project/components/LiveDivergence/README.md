# LiveDivergence

实盘偏离：一条 paper / live 策略和它的"影子回测"（用同一信号、同一天重跑的回测）差多少、差在哪。四个 KPI + 双线 + 五层拆解零轴条。它是 paper 阶段第五道门的证据，也是 live 策略每天的体温计。

## 结构

- 顶行：策略 · 阶段标（PAPER 蓝 / LIVE amber）· 账户 · 天数进度 · 影子 run 蓝标 · 偏离门阈值。
- KPI 4 格：偏离%（超门 amber）· 信号一致率 · 成交率 · 成本差（每笔）。
- 双线：影子回测 `ink-300` 虚线、实盘 `series-1` 实线；差距越开越明显，不另画差值线。
- 拆解零轴条（固定顺序）：信号不一致 · 未成交（涨停 / 停牌 / 流动性）· 滑点与冲击 · 费用差 · 时点差 · 未解释。方向用位置，最大一项 amber；未解释 `ink-300` 永远最后，> 30% 时 amber 并提示"影子回测口径可能不对"。

## 交互

- 点击"未成交"→ FillLog 过滤到该策略的放弃 / 拒单；点击"滑点"→ TCA；点击"信号不一致"→ SignalMonitor 对照表（回测信号 vs 实盘信号差异行）。
- 刷选双线一段 → 拆解只算该段。
- 切策略跟 DeploymentBoard 的卡；切影子 run（重新生成）走 RunLauncher。

## 规则

- 影子回测必须与实盘同信号源同日期；不是"策略最新回测"。口径不同时顶行 amber `口径不同`。
- 偏离 = 净值差 / 回测收益，分母过小（< 2%）时标 `样本小` 不报偏离%。
- 不给"健康分"；偏离门是唯一判定，来自固定评估器。
- live 策略的偏离每日更新，不做实时。

## 谁提供什么

- 组件：strategy、stage、accounts、shadowRun、live[]、shadow[]、kpis、decomposition[]、threshold、onDrill(part)。
- 调用方：影子回测 run（Query）+ 实盘净值与成交（book/、FillLog）。
