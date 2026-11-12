# CorporateActions

公司行动：分红、送转、配股、拆合、回购、解禁、指数调入调出、期货到期移仓——按生效日排，标出对持仓的影响预估（现金、数量、成本调整）和是否需要操作。来源是交易所公告与 Profile 合约表，不是新闻。

## 结构

- 顶行：范围 Segmented（持仓 / 自选 / 全部）· 时间窗与账户 · 右侧"需要操作"计数 amber。
- 列：生效日 · 品种 · 类型点阵标（DIVIDEND / BONUS / RIGHTS / SPLIT / BUYBACK / UNLOCK / INDEX / EXPIRY / HALT）· 内容 + 小字来源与关键日期 · 对持仓影响（现金用 `pnl-up`，数量 / 成本 `ink-100`，`估` 标）· 状态（自动 / 无需操作 / 需决定 · 剩余天 amber / 关注 / 提醒）。
- 需决定的行类型标 amber；T-5 内未决定进入告警阶梯 L2。

## 交互

- 点击行 → PositionBook 高亮该票；配股 / 移仓类 → 「生成操作」预填 OrderTicket 或 RebalanceDesk（移仓 = 平旧开新两笔篓子）。
- 「生成警报」→ AlertCenter 规则：生效日前 N 天 L1。
- 分红生效后自动在 CashLedger 记 DIVIDEND 行、TaxLots 记 ADJ；这里状态变"已入账"。
- 悬停影响 → 计算公式（税率按持有期、送转比例）。

## 规则

- 影响预估按当前持仓与 Profile 税率，标 `估`；入账以账户服务为准。
- 不显示"利好 / 利空"判断。
- 期货到期来自 Profile 合约表，不是公告。
- 解禁 / 指数调整只"关注"，不生成操作。

## 谁提供什么

- 组件：actions[]（effDate、symbol、kind、text、source、keyDates、impact{cash, qty, costAdj}、state、deadline）、scope、range、onAction。
- 调用方：数据平台公告流 + Profile + PositionBook 聚合器。
