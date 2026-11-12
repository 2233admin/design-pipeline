# TradeStats

交易统计：按已平仓交易（round trip）算的统计——胜率、盈亏比、期望、持仓时长、MAE / MFE、连亏；按策略 / 品种 / 时段 / 账户分布。ATAS Statistics 与 TradingView 策略报表的对应，但不打分、不给"评级"。

## 结构

- KPI 行 6 格：交易数 · 胜率（多 / 空拆）· 盈亏比 · 期望（费后）· 平均持仓（含中位）· 最大单笔亏损（含最长连亏）。只有期望与最大亏损用 `pnl-*`。
- 左框：分布条（Segmented ≤ 4：策略 / 品种 / 时段 / 账户），条 `ink-200` 纹理，亏损项 amber 纹理 + 数字 `pnl-down`；底部持仓时长直方 7 桶。
- 右框：MAE / MFE 散点——横轴 MAE（最大不利），纵轴 MFE（最大有利），盈利实心 `ink-200`、亏损空心 `ink-300`、最差一笔橙圈。看出"止损该设在哪"。
- 区间跟 LinkContext.range；账户跟 AccountSet。

## 交互

- 点击分布条一行 → 右侧散点只显示该子集，KPI 重算；再点取消。
- 点击散点 → FillLog 高亮该交易的开平成交，PriceChart 打开当时的 K 线并画 MAE / MFE 标记（"Trade Viz"）。
- 时段模式：按开仓小时 / 星期 / 月份切换。
- 导出 CSV（逐笔 round trip）与「加入报告」。

## 规则

- round trip 配对规则固定（FIFO），页脚写明；加仓减仓按比例拆分。
- 费后口径，与 PerformanceReport 一致（同一函数库）。
- 样本 < 30 笔时 KPI 旁标 `样本少`（`ink-300`），不隐藏。
- 不做雷达图、不做"交易员评分"、不做热力日历（那是 Calendar）。
- 研究账本的回测交易可以进来对照，标 `RUN`，不与实盘混算。

## 谁提供什么

- 组件：trips[]（open、close、symbol、account、strategy、pnl、pnlPct、mae、mfe、holdSec、fees）、range、accounts、groupBy、onSelectTrip。
- 调用方：FillLog 成交流 → `book/roundtrips` Worker 配对。

## ATAS 对照补齐（2026-10-03，atas.md §2.8）

- 指标补齐：Recovery factor、Profit days / Loss days、Commission 列（费后口径已有）。
- 来源三分：LIVE / RUN / REPLAY。
- Trading Journal 维度：交易日历（Calendar 变体）、按品种表现、setup 标签（playbook）；Notes 可引用 trip。
- 历史订单 / 成交子页走 Lab DataGrid 预设（OrderBlotter 只管在途、FillLog 只管今日）；FillLog 允许来源 `手工补录` 的 append 行（不改史）。
