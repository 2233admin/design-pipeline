# Market Profile：市场是配置，不是设计

设计系统不内置任何市场的习惯。涨跌颜色、交易时段、价格限制、结算与可卖、最小变动、币种、代码格式——全部来自 **Market Profile**，按品种解析、按账户继承，用户可覆盖。组件只写 token 名和 Profile 字段名，永远不写 "A 股"、"T+1"、"红涨"。

## 1. 模型

```
MarketProfile
 ├ id                    CN-A | CN-STAR | CN-BSE | CN-CB | CN-FUT | CN-OPT | HK | HK-CONNECT | US | CRYPTO | …
 ├ pnl                   'intl' | 'cn' | 'cvd'      涨跌约定 → data-pnl 属性 → pnl-up/down 互换
 ├ calendar              交易日历 + 时段（含午休、夜盘、集合竞价、收盘集合竞价）
 ├ priceLimit            none | pct(10) | pct(20) | pct(30) | 首日无限制 | 熔断规则
 ├ tick(symbol)          最小变动价：0.01 / 0.001（可转债、基金）/ 期货合约规格
 ├ lot(symbol)           100 / 200（科创板申报下限）/ 1 / 合约乘数
 ├ settlement            T+0 | T+1 | T+2  → availQty 计算
 ├ shortable             融券 / 裸空 / 不可
 ├ margin                两融 / 期货保证金 / 期权保证金公式来源（权威在账户服务，这里只标是否存在）
 ├ currency              CNY / HKD / USD / USDT
 ├ symbolFormat          600519.SH · 00700.HK · AAPL · BTCUSDT · IF2510
 ├ sessionsPerDay        用于 VolumeProfile / Footprint 的时段切分（午休不算跨日，夜盘归属下一交易日）
 ├ flags(symbol)         ST / *ST / 停牌 / 新股首日 / 退市整理 / 北交所 30% / 科创板盘后固定价格
 └ dataLevel             L1 / L2 逐笔 / 千档 / 期货五档
```

解析顺序：品种 → 账户默认市场 → 用户全局覆盖。一个 Workspace 里可以同时有 CN-A、HK、CRYPTO 三种 Profile 的面板，各自按自己的规则画。

## 2. 约定如何进入设计

| Profile 字段 | 影响的 token / 组件 | 怎么生效 |
|---|---|---|
| `pnl` | `pnl-up / pnl-down`、`div-pos-* / div-neg-*` | PanelFrame 根节点 `data-pnl="intl|cn|cvd"`，tokens.css 里三组互换；组件零改动 |
| `calendar` | PriceChart 时间轴断口、ReplayBar、VolumeProfile 时段、开盘自检时刻 | 时段边界由 Profile 给，组件不猜 |
| `priceLimit` | DOMLadder 顶/底封板行（`signal-amber` 边框）、PriceChart 限价线、OrderTicket 价格框越限提示 | 到达限制时数字转 amber，不闪 |
| `tick / lot` | OrderTicket 步进、ChartTrader 吸附、DOMLadder 聚合档位默认值 | |
| `settlement` | PositionBook 可卖量、OrderTicket 可卖提示 | T+1 市场当日买入不可卖 |
| `flags` | Watchlist / Screener / PositionBook 名称后点阵标 `ST` `停牌` `新` `退` | 点阵标 `ink-300`，只有停牌 / 退市用 amber |
| `currency` | 所有金额列单位、PnLAttribution 换算、`估算` 角标 | |
| `symbolFormat` | 代码列、GO Bar 解析、粘贴识别 | |
| `dataLevel` | DOMLadder 深度行数、SmartTape 是否有逐笔方向（无则 `估算`） | |

## 3. 中国市场支持清单

这是"能不能用来做中国市场"的硬指标，每项落到一个组件或 Profile 字段，不是一句"支持 A 股"：

| 能力 | 落点 |
|---|---|
| 沪深 A 股 T+1、100 股整手、±10% 涨跌停、9:15–9:25 / 14:57–15:00 集合竞价、午休 | CN-A Profile |
| 科创板 ±20%、200 股起、盘后固定价格 15:05–15:30 | CN-STAR Profile + flags |
| 北交所 ±30%、新股首日无限制 | CN-BSE Profile |
| 可转债 T+0、0.001 tick、10 张整手、临停规则 | CN-CB Profile |
| 期货夜盘、合约乘数、保证金、持仓手数正负、主力合约切换 | CN-FUT Profile；PositionBook 名义市值行；ReplayBar 夜盘归属 |
| ETF 期权 / 股指期权：Greeks 按标的聚合、`Δ-eq` 行 | CN-OPT Profile；PositionBook §2 |
| 港股通：HKD 计价、T+0、额度、汇率换算 `估算` | HK-CONNECT Profile；PnLAttribution 换算 |
| 融资融券：可用保证金、维持担保比例、融券可卖 | AccountRail 风险度、RiskBoard 限额项（来自账户服务） |
| ST / *ST / 停牌 / 退市整理 / 新股 | flags → 点阵标 |
| Level-2 逐笔成交、逐笔委托、千档 | dataLevel → DOMLadder 深度、SmartTape 方向、DOMHeatmap |
| 分红除权前复权 / 后复权 / 不复权 | PriceChart 图例切换，默认前复权 |
| 中文代码 / 名称 / 拼音首字母搜索 | GO Bar、Watchlist 过滤 |
| 中英混排对齐 | Maple Mono CN（typography.md） |
| 国内券商 / 柜台连接（QMT、Ptrade、CTP、恒生 UFT…） | 执行网关适配器，不是前端 |
| 国内数据源（AkShare、Tushare、聚宽、米筐、Wind…） | Quote Hub / 运行中心 DataSources 面板 |

## 4. 规则

- 任何组件 README 出现具体市场名即违规（除本页与 coverage.md）。写 "Profile.settlement"，不写 "T+1"。
- 默认 Profile 只是 `pnl='intl'` + 无限制 + T+0 的最小集，用于 Storybook；真实产品启动时由账户决定。
- Profile 是 Query 拿的服务端配置（可本地缓存），不是前端常量；节假日、临时停牌、规则变更靠更新配置，不发版。
- 一个面板里混合 Profile（如 Watchlist 同时有 A 股和港股）：每行按自己的 Profile 画，页脚显示 `2 市场`。
- 开盘自检（pixel.md §4）的时刻 = 当前账户集合里最早开盘的市场 - 2 分钟。
