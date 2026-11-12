# ExitStrategy

ATAS "SL/TP (automatic exit strategy)" 的对应：一笔仓位开出来之后怎么出。两种模式——**Simple**（止损 / 止盈，单位 ticks / % / 价；Breakeven 触发 + 偏移；Trailing 距离 + 步长；Stop as StopLimit 与滑点；TIF）与 **Multi-Level**（按 Absolute 或 Percentage 分层，每层独立止盈 / 止损，层间止损上移）。

## 结构

- 它是 OrderTicket 的一块、ChartTrader 括号单与 DOMLadder SL/TP 放置模式的**共同配置源**；三个入口显示同一份默认，下单时可临时覆盖。
- 顶部 `GATEWAY · 服务端执行` 标牌永远可见：追踪与分层出场在执行网关跑，前端关闭仍生效。
- 多层表最多 5 层，总量 = 100% 或等于仓位。

## 交互

- 手动命令：`position.setStop / setTarget / breakeven / trail`，各有热键（Trading 组）。
- 改默认 = 写账户配置（确认）；改当前仓位的出场 = 命令（进确认框，按动作风险保护）。
- ChartTrader 上拖动止损线即 `position.setStop`，同一条命令。

## 规则

- 止损 / 止盈不是前端定时器：前端只配置与显示，网关返回 accepted 才显示为生效；pending 用虚线。
- 市场差异走 MarketProfile：加密有 Reduce Only / Post Only / Close on Trigger 标志，期货有 Stop as StopLimit 建议。
- 任何出场动作写审计（Actor + Action + Object）。

## 谁提供什么

- 组件：mode、simple{}、levels[]、defaults、position。
- 后端：执行网关的出场策略能力（Nautilus / vn.py 的条件单或网关自管）。

## ATAS 对照

承接 SL/TP Simple / Multi-Level、Breakeven、Trailing Stop、Set Stop-Loss / Take-Profit / Breakeven 命令、Automatic Protective Orders、Close Outstanding Orders。P0（Simple + Breakeven + Trailing）。
