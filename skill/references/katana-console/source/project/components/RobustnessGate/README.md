# RobustnessGate

稗壮性门：一个候选（因子 / 策略 run）可不可信。十格，每格一个数 + 一盏门灯 + 阈值小字：OOS Sharpe · IS→OOS 衰减 · 搜索中的尝试次数 · Deflated Sharpe · PBO · 最差滚动窗 · 预计换手 · 成本敏感性 · 数据质量 · PIT / 泄漏测试。它取代 RunInspector 顶部的"Sharpe 2.18 · 年化 36%"——**样本内收益是展示性数字，放在页脚小字，不进门，不拥有最大视觉权重。**

## 结构

- 顶行：run 蓝标 · 对象与参数 · 右侧五门汇总（研究策略五道门中的"样本外 / 过拟合"这一道由本组件给出细节）。
- 十格 2 行 × 5，LCD 15px；未过门的数字 amber + warn 灯；未评估 off + `—`。
- 页脚：IS Sharpe 与年化（`ink-300` 小字，标"展示性，不进门"）· 选择过程（采样器、目标、OOS 固定边界）· 方法与"可重算"。

## 交互

- 点击格 → 展开计算：PBO 的 CSCV 分块与 logit 分布图、DSR 的尝试数与收益矩、滚动窗序列、成本敏感曲线、泄漏测试清单。
- 「重算」→ 研究命令（无确认），用 Trial Ledger 全部尝试重算 PBO / DSR。
- 点击 TRIALS → StrategyCompare 加载整个搜索系（Trial Ledger），不只赢家。

## 规则

- 尝试次数来自 Trial Ledger（全部 run，含失败与放弃），不是用户记忆。
- OOS 边界在 RunLauncher 第 4 步固定，事后不可改而不生成新 run。
- 阈值来自策略五门策略（人工提供物），组件只显示。
- 不显示"综合可信度分"；十个数并列。
- 方法引用：Bailey et al.《The Probability of Backtest Overfitting》、Bailey & López de Prado《The Deflated Sharpe Ratio》、Harvey-Liu-Zhu 多重检验——写在 tooltip，不写在格里。

## 谁提供什么

- 组件：run、metrics{oosSharpe, degradation, trials, dsr, pbo, worstRolling, turnover, costSens, dataQuality, leakage}、thresholds、selectionProcess、onDrill、onRecompute。
- 调用方：固定评估器（Lab run）+ Trial Ledger（MLflow 实验下全部 run）。
