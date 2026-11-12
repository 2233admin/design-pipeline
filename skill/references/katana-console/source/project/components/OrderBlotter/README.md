# OrderBlotter

在途订单：跨账户的挂单、部分成交、算法单、待确认单、拒单。它是执行网关状态的投影；每个"操作"都是同源命令（`sideEffect: write`），走确认框。

## 结构

- 列（固定）：账户短码 · 代码·名称 · 方向 · 价格 · 成交/委托 · 进度 · 状态 · 操作。行高 `row-tight` 24。
- 方向用订单流色：BUY `bid` 蓝、SELL `ask` 橙，点阵大写；**永不用涨跌色**。
- 状态点阵标：挂单 green · 部分成交 orange · 待确认 amber（带倒计时）· 算法 `ink-300`（带窗口）· 拒单 red。拒单行整行 `ink-300`，状态写原因（≤ 12 字）。
- 进度 = 成交/委托 的点阵条（橙纹理）；算法单显示时间进度而不是量。
- **待确认行**整行 amber 6% 底 + 倒计时；操作只有 确认 / 放弃；超时自动放弃并进 FillLog 记录。
- 页脚：单数 · 账户数 · 待确认数 · 在途金额 · 执行网关延迟 LED。

## 交互

- 操作按钮 ≥ 28px 命中区（视觉可以小），改价 / 撤 / 暂停 / 重下 全部先弹确认（Overlays 核心确认框，参数哈希绑定）。
- 行点击写 LinkContext `symbol.set`；双击打开该票的 Desk 并在 DOMLadder 高亮这张单（`order-own` amber）。
- 新单到达：从顶部插入，`snappy` 升起，不整表重排；拒单到达 `alarm-low`。
- 成交推进：进度条 `snappy` 延伸，成交数滚动；全部成交后行停留 3s（`ink-300`）再移入 FillLog。
- 筛选：账户（跟 AccountRail）、状态、方向；筛选条件保存在 Pane.state。

## 规则

- 不显示已成交 / 已撤的历史——那是 FillLog 的事。
- 待确认的单只能在这里或确认框里确认，CLI / MCP / OpenAlice 不能跳过。
- 一个账户断线：该账户的行冻结 `ink-400` + `?` 状态，不猜测状态。
- 不做拖动改价（图上改价在 ChartTrader）。

## 谁提供什么

- 组件：orders[]（id、account、symbol、side、price、qty、filled、status、algo?、pendingUntil?、reason?）、onCommand(cmdId, params)。
- 调用方：执行网关订阅（流）+ 命令表；组件不自己发请求。
