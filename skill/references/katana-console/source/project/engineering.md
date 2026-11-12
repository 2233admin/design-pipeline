# 工程契约：卡片之外必须成立的东西

一份外部评审指出了两句说松了的话："其余全是列定义和 token"低估了业务交互，"props 就是接口"低估了扩展契约。这一页是修正，优先级高于各组件 README 里与之冲突的措辞。

> 大部分展示复用少数视觉形态；每个领域仍然拥有自己的数据语义、交互状态和验收。

## 1. 四个层级，四套完成标准

85 个条目共用一个目录，不共用一个 DoD。

| 层级 | 例子 | 交付什么 | 额外 DoD |
|---|---|---|---|
| **基元** | Controls、Overlays、Toggle、Splitter、StatusLED、LCDReadout、Meter | 输入、焦点、键盘、可访问性、视觉反馈 | WAI-ARIA 模式对照（Splitter 要方向键、尺寸范围、可访问名）；指针中断、浏览器缩放下的行为 |
| **绘制部件** | DataGrid、PriceChart、EquityCurve、Heatmap、Footprint（flow 层）、DOMHeatmap、DrawingToolbar、MBOTrackers 渲染器 | 数据映射、绘制、缩放、命中检测、性能、资源释放 | 10 万行 / 10 万根 / 1 万格的帧时；卸载后无订阅、无 rAF、无 canvas 泄漏；DPR 变化重建 |
| **业务工具** | OrderTicket、FactorLibrary、RunInspector、TCA、TaxLots | 完整的输入、动作、状态、结果、错误语义 | 第 3 节六项契约齐全；每个动作有 pending / 拒绝 / 超时 / 结果未知四个故事 |
| **复合流程** | RebalanceDesk、OrderBasket、DeploymentBoard、ReportBuilder、ChartTrader | 多对象关联、过程状态、权限、恢复、后续操作 | 刷新 / 断线 / 切账户 / 切工作区中途的恢复用例；哪些动作已执行、哪些未执行永远可见 |

**基元不注册成面板**：Toggle、StatusLED 不出现在"添加工具"里。工具贡献面板，面板使用基元。

## 2. 两项必须显式的技术决策

### 2.1 DataGrid 的增量更新是自建模块，不是现成能力

`applyTransaction` 是 AG Grid 的 API；TanStack Table 的数据引用变化会触发行模型与排序 / 过滤重算，Virtual 只管可见区域。所以：

- 模块归属：`src/ui/components/DataGrid/transactions.ts`，自建；第 1 周 Spike C 验证的就是它。
- 以**稳定行 ID** 更新（`rowKey`），按 ID 定位行并原地改单元格；重复事件幂等（seq 去重）；乱序按 seq 丢弃旧的；删除标记后下一帧移除。
- **不触发全表排序**：tick 更新不改排序键时不重排；改了排序键的行标 `dirty`，排序在用户停止交互 300ms 后或手动"重排"时进行；用户正在悬停 / 选中 / 拖动的行**绝不**在交互中换位。
- 四种表四种策略，不混用：

| 表 | 数据性质 | 更新策略 |
|---|---|---|
| Watchlist / PositionBook | 频繁变化的快照 | 按 ID 原地改格；排序延迟；行集变化（加减票）走整表 diff |
| FillLog / SignalMonitor / NewsFeed | append-only 事件 | 只在头部插入，永不改旧行；Virtual 顶部锚定 |
| OrderBlotter / RunQueue | 状态机对象 | 按 ID 改状态列；状态终结后延迟移出 |
| OptionsChain / DOMLadder | 结构化矩阵 | 行 = 价格档固定，只改格；档位变化整表重建 |

- 两笔性能账分开测：**渲染多少行**（Virtual）与**后台算多少行**（排序 / 过滤 / 聚合，在 Worker）。

### 2.2 图表底盘：自研 `@katana/chart`；算在后端，前端只画

**2026-10-03 第三次修订（定稿）。** 选型走过三步：lightweight-charts + 自写 Primitives → Vela（LuxAlgo，Apache-2.0）样机 → **自研**。Vela 样机证明了接缝（chart type / renderer layer / provider）正是我们要的，但只用它的核心、不用它的壳，还要背 NOTICE 署名和 0.8.x 的 API 变动，不划算；而且三处结构性需求它给不了。决定：**图表引擎自研，TradingView 与 Vela 只作参考（交互与绘图语义、坐标模型、layer 栈、设置行），不引一行代码，无第三方署名。**

自研的三个结构性好处（都是 Vela 的"边界待验"）：

- **非时间横轴是一等公民**：x 永远按序号，时间只是标签；Range / Renko / Tick / Volume / Delta bars 不在时间轴上打补丁。
- **Chart / DOM / Heatmap 共用一个坐标系**：同一个 `priceToY`，Link Price Axis 不靠 LinkContext 转发，热力图可用 tick 级 x 分辨率。
- **手感是我们的**：弹簧缩放、橡皮筋、动量、锁定括号是引擎的默认交互，不是外挂。

**硬边界（spec.md §1）**：数据源给逐笔 → Katana / 本机引擎建柱、聚合、失衡 / POC / VA、指标、回放时钟 → 前端只收结果画。样机里 Web Worker 代替本机引擎，消息结构与正式后端一致，标 FIXTURE。

**范围：四段**

| 段 | 内容 | 状态 |
|---|---|---|
| **1 核心** | 坐标系（序号轴 + 时间标签）、视口与弹簧、多 pane（比例可拖）+ 轴、K 线（涨空心跌实心）/ 柱 / 线 / 面积 / HA / 足迹（flow 层）、量柱（主图底 20%，ink）、十字线 + LCD 读数（历史 bar 显示历史指标）、历史分页（左移到头自动向引擎要更早的柱，视口不跳）、DPR / resize、layer 栈 | **已通**（PriceChart 卡预览 / 样机「KATANA Chart 引擎」，帧 p95 ≈ 2ms @ 25 根 × 20 档） |
| **2 绘图** | 对象模型（锚点存时间 + 价格，换柱类型不丢）、命中、拖柄 / 整体拖动、磁吸 OHLC、撤销 / 重做、序列化进 Pane.state；第一批 8 种：趋势线 / 水平线（可告警）/ 垂直线 / 矩形 / 斐波那契 / 文本 / 标尺 / 锚定 VWAP（引擎算） | **8 种已通**；剩余 ATAS 33 种中的通道 / 三角 / 椭圆 / 射线 / 十字线 / 位置标记 / 斐波扩展 & 扇 / 艾略特 / 自由画 / TPO 对象 / Dynamic POC 排第二批 |
| **3 数据面** | provider 适配（history · more · tick）、后端指标 plot 协议（SMA / EMA / VWAP / CVD 由引擎算、图只画线）、对照品种 %、非时间柱 `bars/builder`（time / range / tick / vol）、回放 = 同一条流（引擎虚拟时钟，图不知道自己在回放，只从 `mode` 标 REPLAY）、九种状态可注入（loading / live / stale / gap / resyncing / replay / unsupported / disconnected / error） | **已通**（mock 引擎） |
| **4 性能** | Canvas 2D 先过验收；WebGL2 只给 Heatmap 栅格与十万根以上 | Canvas 2D 已过；WebGL2 P2 |

**`ChartSurface`**（引擎的公共面，所有 layer 只针对它写）：`priceToY(p, pane) · yToPrice(y, pane) · xOf(i) · iOf(x) · tOfI(i) · iOfT(t) · pxPerBar() · visible() · hitTest(x, y) · invalidate() · width / height / dpr`。DOMLadder、DOMHeatmap、ChartTrader、MBOTrackers 挂在同一个面上。

**命令即 Agent 调用面**：`window.KChart.run(cmd)` 与 `/` 命令表同源（`style · fp · ind · pane · bars · tool · h · text · magnet · undo · redo · state · replay · stop · order · submit · goto · fit · agent · artifact`）；`KChart.artifact()` 输出 tools.md §1 的 ChartArtifact，与人看到的同源。

**设置对话框不自建**：走 Preferences / PanelSpec.settingsSchema。**指标脚本仍在后端**（Python SDK；PineTS 要不要进等许可证定）。

**不用 / 不再双轨**：TradingView Charting Library（许可）、lightweight-charts、Vela（均不引入）。

**DOMHeatmap**：维持自研 Canvas 2D（WebGPU / WebGL2 栅格 P2），与 PriceChart 共用 `ChartSurface` 与 `priceRange`。

顺序：PriceChart 从 IMPLEMENTED 推到 FIXTURE VERIFIED（固定 fixture 文件、状态注入测试、验收表）→ 绘图第二批 → DOMLadder（共享坐标系 + L2 reducer 状态机）→ DOMHeatmap → SmartTape → 其余。

## 3. 面板契约：props 之外的六项

每张业务卡的"谁提供什么"之外，`PanelSpec` 配套一份 `contract`，缺一项 ds-reviewer 不通过：

| 契约 | 必须说清楚 | 落在哪 |
|---|---|---|
| **数据身份与时间** | 账户 / 证券 / run / 结果 ID；来源、`asOf`、单位、币种、质量（估算 / 对账中 / 过期） | 每个数据对象带 `source + asOf`（适配器契约）；UI 用 `估算` / `STALE` 角标 |
| **上下文规则** | 跟随 LinkContext 的哪些字段、固定哪些；切 Workspace / AccountSet 影响什么 | `follows[]`、`usesAccounts`、`pinnable` |
| **动作语义** | 只读 / 有副作用；提交、取消、重试各意味着什么；幂等键 | `CommandSpec.sideEffect`、`confirm`、`idempotencyKey` |
| **状态与错误** | 未加载 / 无数据 / 过期 / 断线 / 无权限 / 处理中 / **结果未知** 如何区分 | states.md 五态 + 新增 `unauthorized`、`pending`、`unknown` |
| **生命周期** | 激活、后台停绘、关闭、卸载各清理什么；哪些业务继续（run 不随面板关闭而停） | `PanelSpec.lifecycle`：`onHide` 停 rAF 不退订；`onClose` 退订但不取消 run / 不撤单 |
| **版本与能力** | 数据、适配器、宿主版本不匹配时如何降级；旧布局缺面板时如何占位恢复 | `PanelSpec.requires{host, adapters}`；缺失时渲染"不可用 · 原因"占位，保留 Pane.state |

**结果未知**是交易工具的一等状态：提交超时不等于失败，界面必须显示"已提交 · 结果未知 · 正在查询"，并禁止重下直到网关回答。

OpenAlice 兼容性不是 AliceSessions 能显示会话就算完成，而是三步闭环：从 KATANA 带固定研究范围发起任务 → 返回结果与证据 → 回到原工作现场（Workspace、LinkContext、Pane.state 原样）。这是第 4 周 Headless 验收的一部分。

## 4. 三个交易交互的重新定义

### 4.1 ConsensusBlock 不是投票

"三方表决"这个名字容易误导。它表达的是：**当前意图是什么、哪些必要条件满足、哪个条件阻止执行、最终由谁裁决。**

- 三方是**必要条件**的三个来源，不是三张选票：任一 `blocked` 即不可执行；`warn` 不阻止但进确认框原文；`unknown` / `timeout` / `stale` 视同未满足。
- 每格五种状态：pass · blocked · unknown（未返回）· timeout（超时）· stale（参数或账户 / 风险状态已变，旧结果失效）。
- 失效规则：订单参数、账户、风险状态任一变化 → 全部结果转 stale，hash 变，必须重检；检查结果带 `asOf` 和有效期（默认 30s）。
- 裁决者永远是执行网关与账户服务；前端不合成第四种判断，`core: true` 不是权限机制，只是渲染保护。
- 多个模型同意不等于授权；人的意图、风控、数据有效性不按多数票放行。

### 4.2 ChartTrader 的三种线

| 状态 | 线 | 标签 | 含义 |
|---|---|---|---|
| **已确认** | 实线 amber | 实底 | 执行网关接受的当前订单（含版本号） |
| **草稿 / 拖动中** | 虚线 amber + 拖柄 | 空心，写 `草稿 245.50` | 用户正在改，网关不知道 |
| **已提交未确认** | 虚线 + 点阵流动纹理 | `提交中` | 命令已发，等网关回答 |

- 拖动结束 → 草稿 → 确认框（绑定账户、标的、方向、数量、价格、**订单版本**）→ 提交中 → 网关回答：接受则实线移到新价；拒绝则**显式**：线回原价 + 标签 `拒绝 · 原因` 停留 5s + `cmd-err`，不静默弹回。
- 确认框提交的是确认时的参数快照，不是提交瞬间的界面状态。
- 动画结束不是改单成功；线移过去不是订单已变。

### 4.3 按动作风险保护，不按组件名

"核心界面不可皮肤化"改为：**不可被插件隐藏、改写或绕开的是安全语义与关键操作关系**——关键对象、金额、方向、账户环境（LIVE / PAPER）、权限提示、确认流程、结果状态。字号、对比度、语言、辅助功能仍可适配。任何含 `sideEffect: write` 命令的面板（OrderTicket、OrderBasket、ChartTrader、RebalanceDesk、LossLimits、DeploymentBoard、PositionBook 右键平仓、DOMLadder 点击下单）都受此保护。最终权限在网关与领域服务。

## 5. 动效边界：什么时候不许动

补在 motion.md 之上。

| 交互 | 保留 | 禁止 / 限定 |
|---|---|---|
| Splitter | 跟手、边界清楚、落点可预期 | 拖动中无弹簧追赶、无惯性；松手不改用户选定的精确尺寸（吸附只在 6px 内且可关）；键盘方向键 8px 步进 |
| Toggle | 短促落位 | 视觉落位 ≠ 后台生效：异步设置显示 `处理中` 纹理，失败弹回 + 原因 |
| 面板交换 | 预览落点，落下轻过渡 | 不重建业务实例、不丢订单草稿、不改联动身份；实例 id 不变 |
| 确认框 | 清楚出现、焦点明确 | 风险内容不逐行等待动画；默认焦点在破坏性最小的选项；焦点约束与返回 |
| StatusLED | 状态变化一次反馈 | 不为"显得在线"闪烁；无业务状态依据不亮绿 |
| L4 占屏 | 异常立即可见，原因和动作清楚 | **不用入场表演延迟风险信息**：三行事实同时出现；只有当三项检查确实先后返回时才按真实时间更新。不遮住仍获准的处置入口（平仓 / 撤单） |
| 数字更新 | 稳定对齐，必要时轻微强调 | **可执行价格、可用资金、订单数量、风险阈值不滚动插值**——它们没有中间值；只有展示性汇总（净值、KPI）允许数字滚动 |
| 音效 | 明确且可关的事件反馈 | 不为重渲染、每条行情、每个 LED 发声；Howler 未解锁时界面必须完整表达状态，解锁后不补播 |
| 布局动画 | — | Motion `layout` 用 transform 缩放，图表 canvas / 价格刻度 / 命中坐标在动画期间会失真：含 canvas 的面板不用 `layout`，改为尺寸终值一次性 resize |
| reduced-motion | 立即切换到无动画 | 功能必须完全一致，是正式状态，不是最后补 |

### L4 的业务含义

必须分别写出：发生了什么 · 影响哪些账户 / 工具 · 系统已采取什么动作 · 用户还能做什么 · 怎样恢复。**已知悉 ≠ 已解决**：关闭告警不解除交易锁；锁的解除是账户服务的事件。

## 6. 仪器预算：别走回钟表铺

LCD、Meter、LED、DotMatrix、拨杆、数字滚动、机械音放在一起会让外壳比数据抢眼。职责约束：

- **LCD** 只给少数稳定的关键摘要（总资产、时钟、延迟、当前对象的一个数）；表格里的数字不是 LCD。
- **Meter** 只表达有明确范围与阈值的量；百分比不自动变仪表。
- **LED** 只表达真实业务状态；布尔字段不自动变灯。
- **DotMatrix / 签名元素** 留给壳层、关键时刻与标本页。
- "同步率"必须有分母、口径与业务解释（paper 第 n / N 日、容量已用 / 上限）；没有口径的百分比不画成同步率条。

辨识度来自稳定的布局、操作、数字和状态语言，不来自仪器数量。

## 7. 尚未落位的产品职责

| 职责 | 落位 |
|---|---|
| 五个默认工作区的整体编排 | layout.md 的 20 个台面是起点；第 2 周外壳验收加"首屏主次、默认组合、下钻 / 返回"三条人工用例 |
| 工具发现、局部上下文、联动控制 | PanelFrame 标题栏右键 + 顶栏「添加工具」目录（分组 = 本页第 1 节的业务工具与复合流程，不含基元）；当前账户 / 标的 / 联动范围常显在顶栏 |
| 因子 / 策略 / 信号的编辑与版本差异 | 编辑在仓库（Claude Code）；KATANA 提供 `DiffView`（两个 run 的参数 / 代码 commit / 数据版本并排 diff），挂在 StrategyCompare 与 RunInspector 下 |
| 工作区管理与扩展管理 | 运行中心新增 `Workspaces`（模板、恢复、缺失面板占位）与 `Extensions`（适配器 / 面板包版本、依赖、启停、配置来源）两个面板；AgentsStatus 不代替 |
| 研究编排与跨工具连接 | OpenAlice session / task 承载；KATANA 的连接是 LinkContext + `run.*` 命令 + AliceSessions 投影；不造画布 |
| 报告生成与排程归属 | ReportBuilder 快照记录结果 ID、数据时点、Pane.state；敏感字段（账户号、金额）按策略脱敏；排程走 OpenAlice 任务系统 |

**"系统里唯一的 tab"**限定为唯一的工作区标签体系；因子库视角、回测结果分类、并排比较用 Segmented / 侧边目录 / 检查器组织，这不叫 tab。

**"条件即命令、规则即命令"**是同源：筛选控件与命令行生成同一个结构化定义，控件编辑能看到对应命令，命令输入能回显成可读条件；字段单位、股票池、区间、版本保留。命令是高效入口，不是门槛。

## 8. 共同口径：多张卡引用同一份权威结果

前端不多算，只把口径解释清楚。每组一页 `facts/*.md`，第二阶段开工前写完：

| 工具组 | 必须统一或明确区分 |
|---|---|
| PnLLedger · IntradayPnL · PnLAttribution · PerformanceReport | 现金流、已实现 / 未实现、费用、估值时点、汇率、基准；全部来自 `book/performance` 同一函数库 |
| PositionBook · PositionHistory · TaxLots · FillLog | 账户事实 vs 批次分配 vs 历史重建；修正与缺失的表达 |
| RiskBoard · LossLimits · ExposureTimeline | 风险口径、阈值版本、是否已触发、数据是否仍有效 |
| GreeksBoard · VolSurface · BondCalc | 模型、参数、单位、输入价格时点、计算状态；热力缺口不插值 |
| TCA · TradeStats · BrinsonAttribution | 比较基准、区间、样本范围、假设 |
| RunInspector · ModelCard · DeploymentBoard | 运行 / 模型版本 / 研究证据 / 部署资格的区别；被登记 ≠ 获准部署 |

## 9. 样机：真实状态驱动，三组场景

不做"弹簧音效灯光"演示页。样机复用正式组件与状态逻辑，用可重复回放的标记测试数据驱动**真实状态机**，不用 `setTimeout` 串"提交—成功—成交"。

| 场景 | 组件 | 注入 | 检查 |
|---|---|---|---|
| **A 行情更新中调整工作区** | WorkspaceTabs · PanelFrame · Splitter · Watchlist · PriceChart · DOMLadder | 持续 tick 流；拖分割线、交换面板、切标的、固定联动、关闭重开、恢复布局 | 输入跟手；表格不跳行；图表不变形；订阅不重复；焦点与选中保留 |
| **B 研究任务运行与恢复** | FactorLibrary · RunLauncher · RunQueue · RunInspector · StrategyCompare | 提交后切走再回；注入失败、断线、取消请求；比较两次参数 | 任务仍是同一次；取消请求 ≠ 取消成功；输入固定；结果回到对应因子版本 |
| **C 交易草稿、确认与异常** | OrderTicket · ChartTrader · ConsensusBlock · OrderBlotter · L4 | 参数变化、拒绝、超时、部分成交、切账户、状态过期（隔离模拟环境） | 确认的 = 提交的；预览 ≠ 实际订单；结果未知不诱导重下；L4 仍允许获准处置 |

每个场景同时跑：断线、拒绝、结果未知、reduced-motion、无声音、持续数据更新。

### 参数管线

滑杆调试 → 导出候选参数 → 三场景验证 → 审阅差异 → 写入版本化动效 token（`motion.tokens.json`，代码唯一来源）→ 同步 motion.md 的目的、适用状态、禁用条件、reduced-motion 规则。调试面板只改表现，不改业务状态机；不直接覆盖规范。

## 10. 对 blueprint 的修正

- §2 "五种形态覆盖 84 个"保留为视觉复用原则，加注：**不代表工程复杂度**。
- §8 第二阶段开工前置：本页第 2 节两项决策落地、第 3 节契约进 PanelSpec、第 8 节 facts 页写完。
- 第 1 周 Spike C 的验收改为第 2.1 节的四策略各一个用例。
