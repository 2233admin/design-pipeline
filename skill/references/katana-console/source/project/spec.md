# 规格层：系统边界、数据契约、状态、施工规则

这一页与 tools.md 一起构成 KATANAview 的**规格层**，来源是 2026-10-03 收到的《KATANAview Professional Tool Specs：可直接交付 Claude 的 MVP 规格包》。规格包的目标是"尽可能消除重新定义专业工具范围的自由度"——这正是本设计系统此前缺的一层。三层各管一件事：

| 层 | 页 | 回答 |
|---|---|---|
| 为什么 | product.md | 产品是什么、四个闭环、五层对象、首屏、Agent 团队 |
| **做什么、怎么验收** | **spec.md（本页）+ tools.md** | 系统边界、数据契约、状态、性能预算、12 个 MVP 工具的功能与验收、Agent Artifact |
| 长什么样、怎么摸 | blueprint.md + 组件卡 + motion / sound / gamefeel | 105 张卡、工作区 × 台面、命令表、手感 |
| 怎么建 | engineering.md + stack.md + wheels.md | 分层 DoD、ChartSurface / 自研图表引擎、DataGrid 策略、轮子 |
| 和谁对照 | atas.md + coverage.md | ATAS X 218 项、三家功能矩阵——**长尾范围**，顺序由 tools.md 定 |

## 0. 六处对齐与三处待定（入库前已做 / 需要人定）

规格包不是原样入库。已做的对齐：

1. **组件名映射**：规格里的 `IndicatorManager / DrawingObjectManager / OrderBookStatus / DOMTradingStrip / DataStatusBadge …` 全部映射到本库的卡名（tools.md 每节 Human Representation）。规格规则 1"已有功能扩展，不得仅因命名不同重新造一份"由此成立。
2. **ATAS 长尾挂回**：规格的 MVP 表比 atas.md 矩阵窄（如 Footprint 只列 3 种显示）。tools.md 每节末尾把矩阵对应行按 P 标签挂回。**MVP / P1 / P2 是顺序，"不做为零"是范围**，两者不冲突。
3. **架构边界写进系统边界**（§1）：聚合 / 订单流分析 / 指标在 Katana 或本机引擎算，前端只渲染；图表引擎自研 `@katana/chart`（TradingView / Vela 只参考）；指标脚本若用 PineTS 只跑后端。
4. **Replay 时钟归后端**：统一虚拟时钟驱动所有工具 + 模拟撮合在 Katana；回放流发出与 live 完全相同的消息，前端不写第二套组件（样机已按此做：图不知道自己在回放，只从 `mode` 标 REPLAY）（tools.md §7）。
5. **chart MVP 项逐条标明由引擎的哪一段承担**（tools.md §1 "引擎"列）：Compare、Order / Fill / Position overlay、Link group（四层 context）、非时间柱横轴全部在自研范围内。
6. **清掉来源工具的引用标记**；Source Feature ID 约定保留（§7）。

待人定的冲突：

| # | 冲突 | 两边 | 建议 |
|---|---|---|---|
| 1 | Factor Workbench 的公式编辑器 | 规格 MVP 要求应用内 Formula / DSL 编辑器（高亮、补全、错误定位、Quick Test）；research.md 定"没有脚本编辑器，代码在用户的 Python 仓库里由 Claude Code 写，研究逻辑永远不在前端" | 折中：表达式级（因子公式 DSL）在应用内编辑并版本化，代码级（Python 策略）仍在仓库；两者都只是提交给后端的输入。需要确认 |
| 2 | workflow-editor（P2 节点图） | 规格列为 P2；research.md "不造画布" | 维持不造，P2 行保留为"不做"，除非 OpenAlice 侧出现需求 |
| 3 | KATANAview 许可证 | 规格 PRODUCT.md 写"目前未指定，正式开源前必须完成 license audit"；此前口径是 GPL 类 | 必须定：决定 AGPL 依赖（PineTS、Fincept 代码）能否进入（§8） |

## 1. 系统边界

KATANAview 是 **Autonomous Quant System 的 Human Interface**，也是 product.md 定义的 Capital & Alpha Operating System 的人机面——两句话说的是同一个东西的两面。系统里任何需要让人类看见、理解、判断、监督、操作或批准的东西，都应该能通过 KATANAview 被准确表达。它不是 Dashboard，不是 Katana 的皮肤，不是 Bloomberg / TradingView / ATAS / Bookmap 的复刻。

```
Market / Data Provider / Broker
        ↓
      Katana（量化后端能力边界：market data · history · research · backtest · portfolio · risk · accounts · orders · fills · execution · run/task artifacts · permissions · audit）
        ↓
Structured Source of Truth
        ↓
 ┌──────────────┬──────────────┐
Agent / OpenAlice           KATANAview
 Machine Representation      Human Representation
 ┌──────────────┴──────────────┐
 Hypothesis / Run / Proposal / OrderIntent      Human Action / Approval
        ↓                                              ↓
      Katana                                         Katana
```

- Agent 消费 structured objects、APIs、events、metrics、artifacts、evidence references、account / order / run state；人消费 Chart、DOM、Footprint、Tape、Heatmap、表、Run 视图、组合 / 风险视图、证据视图、Agent 活动、Approval、Incident 与 Data Quality 视图。**两者必须来自同一个 source of truth**：不能 Agent 看到 `BTC position = 3.0` 而 UI 自己算出 `2.7`；不能 Agent 说 `Order submitted` 而 UI 显示 `✓ Filled`。
- OpenAlice / Agent Team 负责 7×24 observation、hypothesis、research、experiments、monitoring、paper / shadow decisions、proposals、recurring tasks、artifacts、evidence、iteration。KATANAview 负责把这些事实和过程变成人可使用的专业工具。
- Katana 当前实现到什么程度以 Katana 仓库为准；规格不得用未来设计冒充已有能力。

### 计算与渲染的边界（对齐 3）

| 在哪算 | 什么 |
|---|---|
| Katana / 本机引擎 | 逐笔聚合（bar × price）、失衡 / 堆叠 / POC / VA、本地订单簿 reducer 与序列状态、Heatmap tile、非时间柱构建（bars/builder）、所有指标（Python 指标 SDK；经典语料可经 PineTS 跑在 Node sidecar）、回放时钟与模拟撮合、风险检查 |
| 前端 | 渲染、交互、状态投影、命令发出、Agent Artifact 组装（引用后端对象，不重算） |

前端不做"web 包干一切"：浏览器里不跑指标脚本、不重建订单簿、不从逐笔自己聚合。样机阶段用 Web Worker 代替本机引擎，消息结构与正式后端一致，并标 FIXTURE。

图表底盘：自研 `@katana/chart`（engineering.md §2.2）——序号轴坐标系、多 pane、系列、layer 栈、绘图、回放画面；TradingView 与 Vela 只作交互语义与架构参考，不引代码，无第三方署名。DOMLadder / DOMHeatmap / ChartTrader 与它共用 `ChartSurface`。

### Autonomous Quant Loop

Observe → Hypothesis → Experiment → Evidence → Candidate → Paper / Shadow → Evaluation → Retain / Modify / Reject → Knowledge → Next Observation。"系统自我进步"不能由 Agent 自己声称，必须通过可复现事实证明（hypothesis version · experiment inputs · data version · code / model version · metrics · evidence · paper / shadow performance · risk · decision · reason · retained knowledge），每一阶段都能由人从 KATANAview 打开和检查（research.md 的 Run 对象模型承载）。

### 执行模式

| 模式 | 含义 | Agent | UI |
|---|---|---|---|
| Read | 只读取市场、账户和研究结果 | — | — |
| Paper | 模拟账户与模拟成交 | 可高度自治 | 永久显示 PAPER（AccountRail 蓝条） |
| Shadow | 基于真实市场 / 账户状态生成并执行影子决策，不对真实 Broker 产生 side effect | 可自治 | 永久显示 SHADOW，允许 actual vs shadow 比较 |
| Live | 对真实账户产生 side effect | 受 Policy / Risk 约束 | 所有 Live OrderIntent 经 Katana 的 Instrument / Venue validation · account capability · risk · policy · execution gateway · audit |

Live 是否要求人工逐单 Approval 是部署 Policy，不是前端固定假设；但 Agent 不得绕过执行边界。**Submit ≠ Accepted ≠ Fill。**

### 市场

跨市场 Human Interface：不为 A股 / 美股 / Futures / Options / Crypto Spot / Crypto Perp 各复制一套工具；工具根据 Instrument / Venue / Account capabilities 改变功能（markets.md 的 Market Profile 承载）。没有 capability 的字段显示 unavailable / not applicable，不伪造 0。

## 2. 核心市场对象

```ts
export type MarketMode = "live" | "paper" | "shadow" | "replay";

export interface InstrumentRef {
  instrumentId: string; symbol: string; venue: string;
  assetClass: "equity" | "future" | "option" | "crypto_spot" | "crypto_perp" | "fund" | "fx" | "other";
  baseCurrency?: string; quoteCurrency: string; settlementCurrency?: string;
  priceTick: number; qtyStep: number; contractMultiplier?: number;
  timezone: string; capabilities: string[];
}

export interface DataQuality {
  source: string; tsEvent?: string; tsRecv?: string; lastEventAt?: string;
  delayed?: boolean; stale: boolean;
  sequenceStatus?: "ok" | "gap" | "resyncing" | "unknown";
  qualityFlags: string[]; mode: MarketMode;
}

export interface QuoteL1 { instrument: InstrumentRef; bidPx?: number; bidQty?: number; askPx?: number; askQty?: number; lastPx?: number; lastQty?: number; markPx?: number; indexPx?: number; quality: DataQuality }

export interface BookSnapshot { instrument: InstrumentRef; seq: string | number; bids: Array<[price: number, qty: number, orderCount?: number]>; asks: Array<[price: number, qty: number, orderCount?: number]>; depth: number; quality: DataQuality }

export interface BookDelta { instrument: InstrumentRef; firstSeq?: string | number; lastSeq: string | number; prevSeq?: string | number; bids: Array<[price: number, qty: number, orderCount?: number]>; asks: Array<[price: number, qty: number, orderCount?: number]>; quality: DataQuality }

export interface TradePrint { instrument: InstrumentRef; tradeId?: string; tsEvent: string; tsRecv?: string; price: number; qty: number; aggressor?: "buy" | "sell" | "unknown"; venue?: string; flags?: string[]; quality: DataQuality }
```

规则：

- **市场规则不写死在组件里。** 可卖数量、价格档位、订单类型、结算、保证金、价格保护、交易时段来自 `InstrumentRules / VenueCapabilities`，不把"一手 100 股"或某个涨跌幅做成全局常量。
- **`0 ≠ null ≠ unsupported ≠ stale ≠ not yet loaded`。** 缺少 Funding 显示 `Funding: — · Not applicable` 或 `unavailable · Provider does not expose this field`，不显示 `0.00%`。
- **L2 从 `snapshot + ordered deltas + sequence state` 建模**，不是"当前五档数组"（Binance diff-depth 的 update ID 即此形态）。默认 snapshot → construct local book → ordered delta → incremental update；序列缺口：live → gap detected → 停止连续性派生计算（imbalance / pulling / heatmap）→ request snapshot → resyncing → atomic local-book replacement → live。不允许"gap → 假装没发生 → 继续算"。
- **aggressor 没有就是 `unknown`**，不默认为 sell；由 quote rule 推断则写 `{ aggressor: "buy", classification: "inferred", method: "quote-rule-v1" }`，UI 带 `估算` 角标（states.md）。

## 3. 公共状态（与 states.md 的对照）

| 规格状态 | Human 表达 | 行为 | states.md / engineering §3 对应 |
|---|---|---|---|
| `loading` | Skeleton + 标的 / Provider | 不显示伪数据 | 加载 |
| `live` | 正常 | 增量更新 | — |
| `stale` | 明显过期提示 | 显示 last-event time | 过期（`STALE 02:14` 角标） |
| `gap` | 序列缺口 | 暂停连续性派生计算 | 新增：amber 条 "序列缺口 · 重建中"，DOM / Heatmap / Footprint 继承 |
| `resyncing` | 正在重建 | 等新 snapshot | 新增（加载骨架只占派生区，簿本身冻结显示） |
| `replay` | 永久 REPLAY 标记 | 禁止真实 side effect | ReplayBar `REPLAY` 点阵标 + AccountRail |
| `unsupported` | 解释 capability 不存在 | 不用零值代替 | 空态变体："不适用 · Provider 不提供 L2" |
| `degraded` | 部分功能可用 | 逐字段说明 | 过期 / 估算角标按字段 |
| `disconnected` | 连接已断开 | 不显示实时绿灯 | 断线 |
| `error` | 原因 + retry / diagnostics | 不自动称"已恢复" | 错误 |
| `unauthorized` · `pending` · `unknown` | engineering §3 | 结果未知是交易一等状态 | — |

另有样机专用标记 `FIXTURE`（确定性样例驱动，engineering §9）：与 PAPER / REPLAY 一样永久可见，绝不冒充 live。

## 4. 默认性能预算（可调整的工程默认值，不是参考产品的公开承诺）

| 项目 | MVP 默认 |
|---|---:|
| 前端事件接收 → 本地状态应用 p95 | ≤ 5 ms / batch |
| 状态 → 可见 paint p95 | ≤ 50 ms |
| 用户操作 → 本地视觉反馈 p95 | ≤ 100 ms |
| 交互目标 / 可接受持续最低 | 60 FPS / 30 FPS |
| 主线程单个 long task | < 50 ms |
| 默认 L2 depth | 50 levels / side |
| 默认价格聚合 | 1 × `priceTick` |
| DOM > 200 levels | 强制 virtualize |
| Tape 可见 / 历史 rows | virtualization |
| Stream stale 默认 | max(2 s, 3 × expected interval) |
| Replay MVP speed | 0.25× / 0.5× / 1× / 2× / 5× / 10× |

订单流工具不能用"每个市场事件触发 React 全树重渲染"的普通 Dashboard 架构（engineering §2.1 四种表四种策略、§1 绘制部件 DoD）。

## 5. 市场能力基线

`✓` 概念原生适用；`Provider` 取决于数据商；`Venue` 交易所 / 经纪商规则决定；`—` 通常不适用。它不是交易规则数据库。

| Capability | A股 | 美股 | 上市期货 | Crypto Spot | Crypto Perp | 上市期权 |
|---|---|---|---|---|---|---|
| L1 / BBO | Provider | Provider | Provider | ✓ | ✓ | Provider |
| Trades | Provider | Provider | Provider | ✓ | ✓ | Provider |
| L2 | Provider / 授权 | Provider / 授权 | Provider | ✓ | ✓ | Provider |
| 24×7 | — | — | — | ✓ | ✓ | — |
| Funding | — | — | — | — | ✓ | — |
| Open Interest | — | — | Provider | — | ✓ | Provider |
| Mark / Index Price | — | — | 参考 / 结算价 | — | ✓ | Provider |
| Reduce-only | — | — | Venue | — | ✓ | — |
| Post-only | Venue | Venue | Venue | Venue | Venue | Venue |
| Margin / Leverage | Account | Account | ✓ | Product | ✓ | ✓ |
| Sellability | Venue / Account | Venue / Account | Venue | Venue | Venue | Venue |
| Price / Qty Step | InstrumentRules | InstrumentRules | InstrumentRules | InstrumentRules | InstrumentRules | InstrumentRules |
| Session | Venue | Venue | Venue | 24×7 | 24×7 | Venue |

Crypto Perp 的 Funding / OI / Mark / Index 由 Exchange Adapter 决定，不假定所有交易所字段语义相同。

## 6. 施工规则

每次施工只读：**spec.md + tools.md 的一个工具节 + 对应组件卡 README + 当前仓库代码**（规格包的 `PRODUCT.md + TOOLS/<tool>.md + 仓库` 在本库的对应物）。

1. 先检查仓库现有组件和代码；已有功能扩展，不得仅因命名不同重新造一份。
2. 所有 `[MVP]` 项均为本轮必须实现的产品范围；不重新定义该工具需要哪些功能，不重新做产品架构，不因后端尚未接通而删除专业功能。
3. `[P1] / [P2]` 本轮不实现时：保留正确的数据类型和 adapter port；UI 不显示假功能；不放一个永远成功的按钮冒充实现。
4. 后端尚缺时：使用 deterministic fixture；明确显示 FIXTURE / PAPER / REPLAY；typed adapter 必须与未来 Katana 接口可替换。
5. 真实市场、订单、成交、Agent 执行不能用固定成功动画冒充（engineering §9：不用 `setTimeout` 串"提交—成功—成交"）。
6. `loading / live / stale / gap / resyncing / replay / unsupported / error` 必须可以独立触发和测试。
7. 人看到的数据和 Agent artifact 必须来自同一个事实源。
8. 每个 Acceptance 项逐条给出 PASS / FAIL / BLOCKED + 修改文件 + 测试入口 + 尚缺后端接口（tools.md §15）。不只返回计划，实际实现并运行测试。

流程：inspect existing code → reuse existing components → implement all MVP → wire typed adapter → deterministic fixture if backend missing → implement states → implement Agent artifact → run acceptance → report。

## 7. 来源与 Source Feature ID

规格沿用 904 条功能底账的 ID：`FIN-*` FinceptTerminal · `TSP-*` tick-stock-panel · `ATC-*` ATAS Classic · `ATX-*` ATAS X · `TV-*` TradingView · `TD-*` TapeDelta · `OTU-*` / `OTL-*` OpenTerminalUI 分支 · `NTA-*` / `NTW-*` Nautilus 社区前端 · `OBB-*` / `OBW-*` OpenBB · `OA-*` OpenAlice · `TRI-*` triphopp bloomberg-terminal · `DSH-*`。Bookmap、Binance / SSE 官方 API 等后加入证据一律写"未定位（未纳入 904 表）"，不伪造 ID。

**待办**：904 底账本身不在本库；atas.md 的 218 项 ATAS X 矩阵没有编号。拿到底账后把 218 项对上 `ATX-*`，或以矩阵为准补编号。

参考产品（学 functionality / workflow / interaction / data semantics，不复制品牌视觉）：ATAS / ATAS X、TradingView、TapeDelta、Bookmap、FinceptTerminal、tick-stock-panel、OpenTerminalUI 分支、NautilusTrader 与社区 UI、OpenBB、OpenAlice。调研报告：《量化工作台联动模式调研》《ATAS X 功能清单与覆盖对照》（README §样机与报告索引）。

## 8. 开源发行与许可

- 开源发行版不能只是 framework：默认提供可运行的专业工具（tools.md §0 的 MVP 集合 + Research / Portfolio / Agent / Operations 组），后端未配置时允许用 deterministic fixtures、replay datasets、paper mode 运行，但必须标记。
- 社区可新增 Market Adapter、Data Provider、Broker Adapter、Indicator、Factor、Tool、Agent Capability、Research Artifact renderer（blueprint §6 SDK、Extensions 卡），但默认产品必须先有一套强工具。
- **功能参考与代码复用是两回事。** 任何第三方代码进入前：identify source repository · pin commit · record license · preserve notices · check redistribution compatibility · record local modifications。商业产品的功能和操作模式可作研究基线，不假设其 proprietary source / assets 可复制。
- 当前依赖的许可：图表引擎自研，无署名义务；PineTS / vela-pinets / FinceptTerminal / OpenAlice 为 AGPL-3.0——与 GPLv3 可组合（GPLv3 §13），与 GPLv2-only 不可；网络条款约束托管商业版。**冲突 3 未定前，AGPL 代码只参考不引入。**
- KATANAview 自身许可证正式开源前必须完成 third-party / license audit（wheels.md §9 的 `license-checker`）。
