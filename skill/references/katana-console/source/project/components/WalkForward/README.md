# WalkForward

滚动前推验证：每个窗口的训练期（灰条）和评估期（橙纹理）排成甘特，右侧每窗样本外收益零轴条，再右是样本内 / 样本外 Sharpe 对照。一眼回答两件事：样本外还行吗、衰减了吗。

## 结构

- 顶行：run 蓝标 · 配置（训练 / 评估长度、滚动 / 锚定）· 右侧总样本外 Sharpe LCD、样本内 Sharpe、两者之比（< 0.5 amber——过拟合信号）。
- 甘特：每窗一行 22px，训练期 `line-200` 实条、评估期 `series-1` 点阵纹理；时间轴顶部年份。
- 零轴条：每窗样本外收益，方向用位置，`ink-200` 纹理；不用红绿。
- IS / OOS 列：样本内 Sharpe `ink-100`，样本外小字；样本外为负的 amber。
- 窗口 > 16 行时每行压到 14px 并隐藏 IS 列，悬停显示。

## 交互

- 点击一窗 → EquityCurve 只显示该窗（样本内灰、样本外彩），TradeStats 过滤到该窗；再点取消。
- 悬停 → tooltip：训练 / 评估日期、OOS 收益、Sharpe、换手、参数（如每窗重优化则显示该窗参数）。
- 切 run（同策略不同配置）→ 条 `gentle` 到新值，行数变化用 opacity。
- 「拼接样本外净值」按钮 → EquityCurve 画出所有评估期拼接的净值线（这才是能信的回测）。

## 规则

- 样本内与样本外视觉上必须不同（灰 vs 彩），任何地方都不许把两者画成一条线而不区分。
- 每窗重优化的参数变化在 ParamScatter 看，这里只标"参数变了"的小点。
- 不做"过拟合分数"；只给 IS/OOS 比值和颗粒数据。

## 谁提供什么

- 组件：windows[]（trainFrom、trainTo、testFrom、testTo、oosReturn、isSharpe、oosSharpe、params?）、run、onSelectWindow、onStitch。
- 调用方：walkforward run 产物（Query）。
