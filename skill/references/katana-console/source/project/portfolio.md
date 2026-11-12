# 组合与账户：多账户 · 多品种

持仓管理从第一天就不是"一个账户一个品种"。一个人同时有：两三家券商的实盘账户、一个期货账户、若干模拟/回测账户、OpenAlice 跑出来的策略子账本；品种跨股票、ETF、可转债、期货、期权、基金、加密。这一页定数据模型、聚合规则和四个组合面板之间的分工。

## 1. 模型

```
Book                      整本账：用户看到的全部
 └ Account[]              账户 = 一个券商/交易所连接下的一个资金账号
    ├ id, broker, label   显示用短码：A / B / C…（不用颜色，颜色留给 LinkGroup）
    ├ kind                live | paper | sim | research
    ├ baseCurrency        CNY / USD / USDT…
    ├ cash, margin        可用、冻结、保证金占用、风险度
    └ Position[]
       ├ symbol, assetClass   stock | etf | cbond | future | option | fund | crypto
       ├ qty, availQty        可卖量由 Market Profile 的结算规则算（CN-A T+1、可转债 T+0、港股 T+0…）
       ├ avgCost, mark, mv
       ├ upnl, rpnlDay
       ├ multiplier, margin   期货/期权
       ├ greeks               期权，按标的聚合
       ├ currency
       └ strategyId?          哪条策略/哪个 OpenAlice run 开的仓
Strategy[]                横切维度：一条策略可能在多个账户持仓
```

权威在账户服务；前端拿到的是快照（TanStack Query），行情（mark）走流。`mv / upnl` 由前端用最新 mark 实时算，这是允许的"投影"，但显示必须标 `估算` 直到账户服务下一次对账回来。

## 2. 五种视角

同一份 Position 列表，PositionBook 用 TanStack Table 的 grouping 切出五种视角，列顺序不变（readability §9）：

| 视角 | 分组键 | 聚合行显示 | 用在 |
|---|---|---|---|
| **按品种** | symbol | 总量、加权均价、合计盈亏、`×3 账户` | 默认；盯一只票的总敞口 |
| **按账户** | account | 账户净值、现金、风险度、持仓数 | 对账、调仓 |
| **按策略** | strategyId | 策略盈亏、持仓数、`×2 账户` | Lab ↔ 组合 对照 |
| **按资产类别** | assetClass | 类别市值、权重 | 大类配置 |
| **品种 × 账户** | symbol → account | 两级折叠 | 跨账户同一票的分布 |

聚合行规则：
- 数量、市值、盈亏求和；均价按数量加权；涨跌幅按市值加权。
- 跨币种求和前换算到 Book 基础货币，换算值带 `估算` 角标并悬停显示汇率与时间。
- 期权不和股票直接相加：按标的聚合出 Delta 等效敞口，单独一行 `Δ-eq`。
- 聚合行比明细行亮一档（`ink-100` vs `ink-200`），子行缩进 16，不用树线。
- 折叠的实体用计数显示（`×3 账户`），不堆名字（工作记忆 4±1，§7）。

## 3. 账户的可见性规则

- **PAPER / SIM 永远带标。** 账户短码后缀点阵 `PAPER`，面板 PanelFrame 标题行左侧 2px `signal-blue` 竖条；实盘无竖条。这是防"在模拟账户里以为自己在实盘"的唯一硬手段，不可皮肤化。
- **当前账户集合**是 Workspace 级状态（和 LinkGroup 平级）：AccountRail 选中哪些账户，所有组合面板、OrderBlotter、FillLog 同时过滤。切集合不动画，数据直接换；只有 LCD 数字滚动。
- 下单面板默认账户 = AccountRail 当前**唯一**选中的账户；多选时下单必须显式选账户，确认框第一行就是账户短码 + 种类。
- 账户断连：该账户所有行 `ink-400` + 顶部 red 条，聚合行重新算并标 `缺 B`。

## 4. 风险的位置

风险不散落在各表。RiskBoard 一个面板集中：保证金占用、总敞口/净值、Top-1 / Top-5 集中度、行业集中度、1 日 VaR、日内回撤 vs 限额。限额来自账户权威（只读），越线走 states.md 告警阶梯；RiskBoard 自己不发交易锁，锁由执行网关下发，面板只显示。

## 5. 和 Lab 的关系

研究产物（回测持仓、因子分层持仓）是 `kind = research` 的账本，可以进 PositionBook 对照，但：永不进 OrderBlotter、永不参与 RiskBoard 合计、行末标 `RUN 2c91`。研究 → 实盘的唯一通道是同源命令 + 确认 + 执行网关。

## 6. 面板分工

| 面板 | 回答什么 | 站在什么上 |
|---|---|---|
| AccountRail | 看哪些账户、各自状态与净值 | Toggle + LCDReadout + StatusLED |
| PositionBook | 持了什么、分布在哪、赚亏多少 | DataGrid（grouping / pivot） |
| OrderBlotter | 在路上的单：挂、部分成、待确认 | DataGrid + 命令表 |
| FillLog | 今天成了什么 | DataGrid（append-only，同 SmartTape 滚动） |
| RiskBoard | 离限额多远 | Meter + LCDReadout |
| PnLAttribution | 钱从哪来 | 零轴条形（自研 Canvas 2D） |

不做：饼图配置、仪表盘式"健康分"、按颜色区分账户、一个面板里切多页签（面板级没有 tab，见 layout.md）。
