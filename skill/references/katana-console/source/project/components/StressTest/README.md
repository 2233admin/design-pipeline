# StressTest

压力测试：把当前持仓放到历史情景（2015 去杠杆、2018、2020-02、2024-02 微盘……）、因子冲击（利率、动量、汇率）和自定义冲击下，看组合与各账户的损益。计算是 Lab / OpenAlice 的 run（Fincept Risk 那类库），前端只显示和下发"重跑"。

## 结构

- 顶行：情景类型 Segmented（历史 / 因子冲击 / 自定义）· 相关性压力拨杆（压力期相关性替代历史相关性）· run 蓝标 · 右侧限额与净值。
- 列：情景（名 + 一行说明：幅度 · 时长）· 零轴条（零线靠右，因为大多是亏；红 2px 为限额线）· 合计% · 各账户%（随 AccountSet，≤ 5 列，更多折叠）。
- 条 `ink-200` 纹理；超过限额转 amber；数字同。账户列里盈利的（对冲账户）用 `pnl-up` 只上数字。
- 最后一行「+ 自定义」：凹陷行，点击展开表单（按行业 / 因子 / 单票设冲击，TanStack Form，≤ 5 条冲击）。
- 页脚：情景数 · 越限数 · 最差情景 · 是否含流动性折价 · 加入报告 · 重跑。

## 交互

- 点击情景 → PositionBook 切到"该情景下损益"列（LinkContext 扩展 `scenario`），看哪些票最伤；再点取消。
- 悬停 → tooltip：情景定义、持仓日期、前三贡献票。
- 「重跑」= `risk.stress` 命令（研究类，无确认）；跑完 `run-done` 一次，行值 `gentle` 到新值。
- 自定义情景可保存为命名情景，进历史列表并可被 AlertCenter 引用（"情景 X 损失 > 限额"作为 L2 规则）。

## 规则

- 情景损益是估算（线性 / 因子近似），页脚 run 标注方法；不显示到小数点后两位以上。
- 限额来自 RiskBoard 同源。
- 研究账本不计入；期权持仓用 Greeks 近似时标 `Δ-Γ 近似`。
- 不做瀑布图、不做 3D 曲面。

## 谁提供什么

- 组件：scenarios[]（id、name、desc、pnlTotal、pnlByAccount、limitHit）、accounts、limit、run、onRerun、onSaveScenario。
- 调用方：压力 run（Query）、限额、Profile（流动性折价参数）。
