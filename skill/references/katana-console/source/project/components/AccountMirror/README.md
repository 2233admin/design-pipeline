# AccountMirror

ATAS Following Manager 的对应：一个 Provider 账户 / 策略，若干 Follower 账户按规则镜像。规则：**Positions 模式**（镜像目标持仓）或 **Orders 模式**（镜像每笔订单）、Ratio、Reverse（反向）、Manual Confirmation（每笔进确认框）、Notifications（偏差阈值）。

## 结构

- 顶部 Provider 行；表格每行一个 Follower：模式、Ratio、Reverse、人工确认、状态灯、偏差（目标 − 实际，按市值）。
- 等人工确认的订单显示在 DecisionQueue（"批准"类），不在这里单独做队列。

## 交互

- 改规则 = 命令（`mirror.set`）+ 确认；停止镜像是高风险动作，走确认框 + 冷却。
- 点 Follower → PositionBook 按该账户过滤；点偏差 → BreakWorkbench 式并排对照。

## 规则

- **镜像在执行网关执行**，前端只配置与显示；网关返回 accepted 才算规则生效。
- Reverse 与 Ratio 的结果必须经过 Follower 账户自己的 pre-trade 风控（限额按账户层级），不绕过。
- 偏差超过阈值 → AlertCenter；连续失败 → 自动暂停并通知。

## 谁提供什么

- 组件：provider、followers[]、rules、deviation。
- 后端：执行网关镜像引擎；账户服务 Query。

## ATAS 对照

承接 Following Manager（Positions / Orders · Ratio · Reverse · Manual Confirmation · Notifications）。P2。
