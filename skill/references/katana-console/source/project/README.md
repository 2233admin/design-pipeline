# KATANA Console

KATANAview 的设计系统：**工业控制台的材质，Apple 式的物理交互。** 开源量化工作台，让盯盘、研究、持仓和系统运行像在操作一台真实机器，而不是在翻网页。

> 一句话：每个像素都是硬件，每次操作都有手感，每个事实都可追溯。

**规格层在 spec.md + tools.md**（2026-10-03）：系统边界、数据契约、状态、12 个 MVP 工具的功能与验收、Agent Artifact、施工规则——施工一个工具只读这两页 + 对应卡 README + 仓库。**总账在 blueprint.md**：工作区 × 台面 × 面板、105 张卡、数据模型、命令表、七个后端服务、人工提供物、四个阶段。**加任何东西前先读 readability.md**：可读性是生理与认知的预算，所有视觉决定都从那里推出来。

## 1. 原则

0. **顺手是裁判。** 发光、工业材质、点阵、签名元素都是手段；任何一处视觉如果让盯盘、下单、查账、看 run 多一步、多一眼、多一次犹豫，就去掉它。该亮的亮（活的东西：灯、游标、末点），该硬的硬（壳、确认框、警示带），其余让路给数据。
1. **材质先于装饰。** 分层靠亮度（bg-000 凹陷 → bg-100 地面 → bg-300 面板 → bg-400 浮起），边框是第二手段，阴影只表达材质（金属板 / 凹陷 / 发光），不表达"高度"。没有渐变、没有毛玻璃式的随意模糊、没有大圆角卡片。
2. **一个强调色。** `signal-orange` 是唯一的交互强调：LED 亮、拨杆开、焦点环、当前标签。语义色（amber / green / red / blue）只说状态，不说"重要"。涨跌单独走 `pnl-up` / `pnl-down`，**约定不是设计的一部分**：默认国际（绿涨红跌），由 Market Profile（markets.md）按市场 / 账户切到 `cn`（红涨绿跌）或 `cvd`（橙 / 蓝），组件永远只写 token 名。
3. **数字永远等宽。** 所有数值用 `mono` 家族 + `font-variant-numeric: tabular-nums`。LCD 窗（bg-000 凹陷 + orange 或 ink-100 文字 + 字距 0.08–0.12em）是所有"读数"的统一容器。
4. **物理交互。** 位移和缩放只用弹簧，可打断、可接管；拖拽跟手、越界回弹、松手按速度投影落点。见 motion.md。
5. **反馈成对出现。** 重要事件 = 微动效 + 短音效 + 指示灯变化三件套，不单靠 toast。见 sound.md。
6. **交易动作只加反馈，不加花哨。** 下单确认、风险提示、账户模式切换的界面由核心控制，不被皮肤化；juice 只能出现在"动作已发生"的反馈上。
7. **安静模式。** 8 小时盯盘必须能把动效降到最低、把声音关掉；`prefers-reduced-motion` 时弹簧退化为 120ms 线性。

## 2. 视觉基础

两套主题 **Console（暗）/ Paper（亮）** 同一套 token 名（themes.md）；下表是 Console 值，Paper 值在 tokens.json。LCD 窗在两套主题下都是深色岛（`lcd-bg`）。

### 颜色

| 层 | token | 用途 |
|---|---|---|
| 凹陷 | `bg-000` | LCD、仪表底、输入框 |
| 地面 | `bg-100` | 窗口底、面板缝 |
| 单元格 | `bg-200` | 面板内条目 |
| 面板 | `bg-300` | plate、顶栏、底栏 |
| 浮起 | `bg-400` | hover、popover、拖起 |

文字：`ink-100` 主 / `ink-200` 次 / `ink-300` 辅（bg-300 上 ≈ 5:1）/ `ink-400` 只给刻度与禁用，不给正文。

信号：`signal-orange` 强调；`signal-amber` 警告；`signal-green` 正常；`signal-red` 危险；`signal-blue` 信息。LinkGroup 四色 `link-a…d` 直接别名到这四个信号色。

### 字体

六个角色，全部 OFL 开源，拉丁与中文在同一个栈里按字符回退（规则、来源、分片见 typography.md）：

- **Display**：Barlow Condensed + 得意黑 Smiley Sans——面板标题、工作区名。
- **Mono**：Maple Mono CN——所有表格；汉字宽恰好是拉丁的 2 倍，中英混排能对齐。
- **LCD**：DM Mono——读数窗，只放数字与大写。**Seg**：DSEG7——七段数码管，可选。
- **Dot / LED（签名）**：Doto、Sixtyfour（BLED / SCAN 轴）、Workbench、Tiny5、Micro 5、Jersey + 方舟像素 10/12/16、缝合像素 8/10/12——标签、时钟、跑马、矩阵、刻度、大屏标题。整数倍、关抗锯齿，见 pixel.md。
- **Text**：Noto Sans SC（备选 LXGW Neo XiHei）——中文正文。

字号只有这些档：28 / 17 / 14（Display），12 / 13 / 11（Text），12 / 11（Data），26 / 16（LCD），5 / 9 / 10 / 12 / 16 / 40（Dot）、16 / 20 / 32（LED）。汉字最小 11px，点阵中文 12 / 16。

### 密度

三档行高由面板声明，不由组件各自定：`row-tight` 24（盘口、逐笔、自选）、`row-base` 28（持仓、研究结果）、`row-loose` 36（设置、参数）。

### 材质三件

- `shadow.plate`：面板 = 上 1px 高光 + 下 1px 阴影 + 底部 2px 厚度。四角 5px 铆钉（`bg-000` 圆点 + 1px 高光）。
- `shadow.recess`：所有"窗"和"槽"。
- `shadow.glow-orange`：只给发光体——LED、拨杆开态滑块、仪表指针。

## 3. 组件

工作台专有的 8 个组件在 Components 页，每个都有四态（hover / focus-visible / active / disabled）和一段"谁提供什么"。通用基元（Dialog、Popover、Select、Tabs、Tooltip、Menu）由 Base UI 提供交互与无障碍，本系统只定皮肤和弹簧。

| 组件 | 一句话 |
|---|---|
| PanelFrame | 面板外框：标题、当前对象、LinkGroup 色标、局部工具条、最大化、关闭 |
| WorkspaceTabs | 顶层工作区标签，当前项 orange 下划线 + bg-000 凹陷 |
| Splitter | 分割线：8px 命中区、1px 可见线、拖动时 orange、越界橡皮筋 |
| Toggle | 拨杆开关：跟手拖动、松手按速度落位、到位有"咔哒" |
| LCDReadout | 读数窗：标签 + 数值 + 单位，数值变化时数字滚动 |
| Meter | 条形/刻度仪表：填充用点阵纹理，指针发光，越界变 amber |
| StatusLED | 指示灯：off / on / ok / warn / danger，亮态有 glow |
| CommandLine | 底栏命令行：LCD 风格输入，⌘K 唤起，回车执行同源命令 |
| Preferences | 偏好页（Codex 式左目录）：外观 / 字体 / 密度 / 涨跌与市场 / 动效 / 声音 / 快捷键 / 渲染 / 账户显示；安全项锁定可见；卡片以 Paper 主题渲染 |
| StatusBar | 顶栏 / 底栏分段模型（参考 oh-my-posh）：segments[] 主题 JSON，斜切连接，无事则隐藏，实盘段 amber 框不可关 |

### 图表（dataviz.md）

量化产物各有一种图，颜色按"类别 / 大小 / 正负 / 状态"四种工作分配：序列色 `series-1..7`（比信号色暗一档，已过色觉校验）、顺序色阶 `seq-100..600`、发散 `div-neg / mid / pos`（跟随 Market Profile 的涨跌约定，可切色觉友好）、订单流专用 `bid` 蓝 / `ask` 橙。签名细节：面用点阵纹理填充，末点发光，基准永远灰。

| 组件 | 一句话 |
|---|---|
| EquityCurve | 净值 + 镜像回撤 |
| FactorIC | IC 柱 + 累计线 + 五道门 LED + KPI 行 |
| QuantileLayers | 分层净值，序数用顺序色阶 |
| Heatmap | 行业×时间 / 相关矩阵 / DOM 历史 |
| Footprint | Bid×Ask 足迹，失衡反白，POC |
| SparkTile | KPI 瓦片：点阵标签 + LCD + 迷你线 |

渲染设置面板（GPU / 后端 / 抗锯齿 / DPR / 帧率 / 色觉友好 / 安静模式）见 rendering.md。

### 数据与订单流（stack.md）

| 组件 | 一句话 | 站在什么上 |
|---|---|---|
| DataGrid | 所有表格的基础：三档密度、列配置、选中、涨跌闪、五态 | TanStack Table + Virtual |
| DOMLadder | 盘口梯子：价格居中、买卖量、深度变化、点击下单、自己的单 amber | DataGrid |
| SmartTape | 逐笔：自动滚动、大单高亮、同向聚合、速度条 | Virtual + Pacer |
| DOMHeatmap | 盘口历史热力：挂单亮度 + 成交气泡 + 撤单留痕 | Canvas 2D |
| VolumeProfile | 成交量轮廓：POC、价值区、买卖拆分 | 共享聚合器 |
| ReplayBar | 回放控制：回放时钟与实时分离、事件跳转 | Router |

订单流色：买 `bid` 蓝、卖 `ask` 橙，各三档；自己的挂单 `order-own` amber；POC / 现价 `poc`。永远不用涨跌色表示买卖。

### 组合与账户（portfolio.md · coverage.md）

持仓管理不是一个账户一个品种：Book → Account[]（live / paper / sim / research）→ Position[]（股票 / ETF / 可转债 / 期货 / 期权 / 基金 / 加密）。账户用短码不用颜色，PAPER 必带蓝条；账户集合是 Workspace 级过滤器；研究账本只对照、不计入；限额只读、锁由执行网关下发。

| 组件 | 一句话 | 站在什么上 |
|---|---|---|
| AccountRail | 账户轨：选哪些账户，所有组合面板同步过滤；每账户净值 LCD + 状态灯 | Toggle + LCDReadout + StatusLED |
| PositionBook | 持仓簿：按品种 / 账户 / 策略 / 资产类别 / 品种×账户 五视角，聚合行 + 子行 | DataGrid（grouping） |
| OrderBlotter | 在途订单：挂单 / 部分成交 / 算法 / 待确认 / 拒单；操作全是写命令 | DataGrid + 命令表 |
| FillLog | 今日成交 append-only：账户、滑点、来源（手动 / 策略 / OpenAlice run） | DataGrid + SmartTape 滚动 |
| RiskBoard | 限额板：六根 Meter + LCD，预警线 / 硬限，交易锁只显示 | Meter + LCDReadout |
| PnLAttribution | 零轴条形归因：方向用位置，数字才用涨跌色，>7 项折「其他」 | Canvas 2D / DOM |

coverage.md 把 ATAS X、FinceptTerminal、TradingView 的功能逐条映射到组件；第 3 批（发现与交易）见下。

### 发现与交易（第 3 批）

| 组件 | 一句话 | 站在什么上 |
|---|---|---|
| PriceChart | K 线主图：lightweight-charts 皮肤——涨空心跌实心、量柱 ink 不按涨跌上色、副图分隔不叠轴、attribution 不可关 | lightweight-charts |
| ChartTrader | 图上交易：自己的单 amber 贴右轴、拖柄改价、括号 TP/SL、持仓线 + 平；Primitives 画，不进 React | PriceChart + 命令表 |
| OrderTicket | 下单票（核心界面）：账户第一行、方向订单流色、预估块、风控预检灯、hash 与确认框绑定 | Controls + 执行网关 |
| Watchlist | 自选：多列表 Segmented、分组行、异动灯列、30m 迷你柱、持有账户短码；LinkGroup 写入端 | DataGrid |
| Screener | 筛选：条件胶囊 + 表头迷你直方 + 结果表；一套条件 = 一条可存命令 | TanStack Form + DataGrid |
| AlertCenter | 警报：规则即命令，5 种条件源 × 4 级动作对应告警阶梯；命中同类合并计数 | 命令表 + states.md |

### 资产管理层（asset-management.md）

组合工作区六个台面：监控 · 构建 · 执行 · 绩效 · 风险 · 账务，共享一个 `book/` 聚合器。核心视觉是"目标 vs 当前"的双条（实心当前 + 空心目标）与零轴条；没有饼图、没有评分。

| 组件 | 一句话 | 站在什么上 |
|---|---|---|
| RebalanceDesk | 目标 vs 当前双条、漂移阈值、交易清单（整手 / 可卖 / 涨跌停来自 Profile）；出口是篓子 | 聚合器 + Lab 优化 run |
| OrderBasket | 篓子单（核心界面）：跨账户一组订单预检、拆批、每批走确认；没有一键全发 | 执行网关预检 + 命令表 |
| PerformanceReport | 体检单：6 格 KPI、净值 vs 基准、滚动副图、月度表、回撤表 | `book/performance` Worker |
| FactorExposure | 风格 / 行业主动暴露零轴条，限额与 RiskBoard 同源 | Lab 因子回归 run |
| StressTest | 历史情景 / 因子冲击 / 自定义，对组合与各账户的损益；可存为 AlertCenter 规则 | Lab 压力 run |
| CashLedger | 现金流账：出入金 / 股息 / 利息 / 费 / 税 / FX / 划转，对账灯 | 账户服务流水 |
| TradeStats | 已平仓交易统计：胜率 / 盈亏比 / 期望 / MAE-MFE 散点 / 持仓时长 | `book/roundtrips` Worker |
| Fundamentals | 三表 + 比率瓦片 + 估值区间 + 同业；报告期来自 Profile | 财务数据源 + Lab 估值 run |

### 研究层（research.md）

研究流水线七个台面：数据 · 因子 · 模型 · 回测 · 验证 · 上线 · 偏离。一切结果挂在不可变的 run 上；门是固定评估器；没有脚本 / 节点编辑器，代码在仓库里由 Claude Code 写，OpenAlice 跑，KATANA 显示。

| 组件 | 一句话 | 形态 |
|---|---|---|
| FactorLibrary | 因子库卡片 / 表：IC · ICIR · 换手 · 衰减迷你柱 · 五门 · 相关最高因子 | 卡片网格 + DataGrid |
| RunInspector | run 证据：快照 hash、数据版本、commit、参数、门、谱系、产物、Alice 评估（标来源） | 键值 LCD + 树 |
| RunLauncher | 五步表单启动 run；研究类无确认；各面板的"重跑 / 合成 / 优化"都是它 | TanStack Form |
| WalkForward | 训练 / 评估甘特 + 每窗 OOS 零轴条 + IS/OOS 比 | 甘特 + 零轴条 |
| ParamScatter | 参数敏感性：散点 + 最优 + **平坦区**；双参数热力 | 散点 / Heatmap |
| StrategyCompare | 多 run 对照：净值叠加 + 指标表 + 门矩阵；橙 = 该列最好，不是排名 | EquityCurve + DataGrid |
| DeploymentBoard | research → paper → live → retired 看板；拖卡推进走核心确认框 | 看板 |
| LiveDivergence | 实盘 vs 影子回测：四 KPI + 双线 + 五层拆解零轴条 | 折线 + 零轴条 |

### 盈亏管理

| 组件 | 一句话 |
|---|---|
| PnLLedger | 盈亏总账：按日 × 账户 / 策略 / 品种拆已实现 / 未实现Δ / 费税 / 股息，期初期末对账灯 |
| IntradayPnL | 日内盈亏曲线：合计粗线 + 账户细线 + 日亏损限额红虚线；午休不压缩；无任何涨跌反馈 |
| PositionHistory | 一个仓位的一生：价格 + 买卖三角 + 均价阶梯 + 数量带 + 事件表 |
| TaxLots | 批次成本：选批规则、可卖、长短期标、预计已实现 → 生成卖单 |
| LossLimits | 亏损限额与动作：日 / 周 / 月，账户 / 策略 / 全局；限额只读，动作由执行网关执行 |
| ExposureTimeline | 总 / 净 / 多空 / 行业敞口随时间 + 限额线 + 超限竖带 |

### 发现 · 衍生品 · 固收 · 研究数据 · 运行中心 · 工具（第 4 批全部到卡）

Calendar · NewsFeed · EventTimeline ｜ BrinsonAttribution · TCA · CorporateActions ｜ OptionsChain · GreeksBoard · VolSurface ｜ YieldCurve · BondCalc ｜ DatasetCatalog · DataQuality · SeriesBrowser · FactorDecay · ModelCard · RegimeStrip · EventStudy · SignalMonitor ｜ RunQueue · AliceSessions · DataSources · SymbolMap · AgentsStatus · SystemHealth ｜ Notes · ReportBuilder。每张卡的规则见各自 README；形态都在五种之内。

### 决策与对账（product.md）

| 组件 | 一句话 |
|---|---|
| DecisionQueue | Cockpit 主区：只放需要人的事，五种裁决（批准 / 停止 / 调整 / 调查 / 继续）；Agent 只能提案 |
| AlphaLedger | Alpha 保全账：Research Edge 减七项损耗到 Realized；每项点进归属组件 |
| DecisionJournal | 人 / Agent / 系统每个关键动作：actor · input · reason · result；append-only |
| BreakWorkbench | 对账差异：缺失 ≠ 0，差异显式，Agent 不能静默修平 |
| HypothesisLedger | 假设账 + Research Inbox：对象链起点，探索通道入口 |
| RobustnessGate | Candidate Quality 十格：OOS / 衰减 / 尝试数 / DSR / PBO / 滚动窗 / 换手 / 成本敏感 / 数据 / 泄漏；样本内收益不进门 |

### 签名（signature.md）

| 组件 | 一句话 |
|---|---|
| DotMatrix | 点阵与签名标本：LED 时钟、六角灯阵、三方表决、同步率条、波形带、斜切 + 密排大字、角括号、L4 警示带 |
| ConsensusBlock | 三方表决块：写命令提交前三方各一灯一句 + 结论 + hash；核心界面 |

### 基元皮肤

| 组件 | 内容 |
|---|---|
| Controls | Button / Input / Select / Slider / Checkbox / Segmented，四态 + 错误态 |
| Overlays | Dialog（交易确认为核心界面，不可皮肤化）/ Popover / Menu / Tooltip，"升起"动效 |

### 其余章节

- atas.md：**ATAS X 功能清单与覆盖对照**（2026-10-03）——15 个模块、约 290 个指标、33 个绘图对象、Smart DOM 21 列、Footprint 10×7×9、SL/TP、Replay、Journal、Workspace 三层，对 104 张卡逐项标状态（已覆盖 20% · 部分 32% · 缺失 43% · 不做 5%）；9 张新卡（IndicatorPanel · DrawingToolbar · ClusterSearch · Workspaces · ExitStrategy · FlowGauges · MBOTrackers · OptionsFlow · AccountMirror）、Footprint 改为 PriceChart flow 层 + `ChartSurface` 接口、P0/P1/P2、8 项不做的硬理由、壳层借鉴点。原则：**能力与 ATAS 1:1，操作用我们的方式**（§0 操作翻译表：颜色组 → 四层 context、菜单 → 命令表、C# 策略 → Python + OpenAlice、浮窗 → 弹出新窗口、凭证窗 → 连接向导 + vault）；**ATAS 有的全部要有，不做为零**：3D 热力 → DOMHeatmap 视图模式，Traders Talk → Talk 卡，tier gating → Entitlements 卡。新卡 11 张。
- gamefeel.md：游戏感——舞台（镜头而不是切换）、重量（输入有分量）、生命（空闲呼吸）、光（一个光源）、声音（声像跟位置）、仪式（开机 / 开盘 / 收盘 / 结算）、进程（门是插槽）、取景（HUD 括号）；只作用壳层与输入，不碰盈亏。配套可交互样机「KATANA 壳层手感样机」。
- themes.md：Console / Paper 两套主题——Paper 的材质逻辑（凹陷仍最暗、LCD 深色岛、发光减半、scanline 关）、Paper 信号与序列色（已过校验）、切换规则、强调色四选一。
- wheels.md：**开源轮子**——按用途分档（采用 / 候选 / 参考 / 不用）：Glide Data Grid、uPlot、Arrow、DuckDB-WASM、XState、number-flow、dnd-kit、xterm.js、Oh My Pi（can1357/oh-my-pi：并列开发代理 + OpenAlice 内核候选 + Agent Hub / ask / rpc-ui 参考）、oh-my-posh 分段模型、Textual、Terrazzo、Biome、Knip、Lost Pixel、Storybook、MCP SDK、Zod；许可证全标。
- product.md：**产品定义**——Capital + Alpha + Agents；Alpha 保全账、四个闭环、五层对象视觉语法、Profit & Capital Cockpit 首屏、六个 Agent 与不可绕过的授权路径、决策级数据、Candidate Quality、Capability 契约、对象链、MVP P0-A…I 与九条验收任务。在 blueprint 之上。
- engineering.md：**工程契约**——四层级四套 DoD、DataGrid 增量更新自建、PriceChart 能力边界、六项面板契约、ConsensusBlock 不是投票、ChartTrader 三种线、按动作风险保护、动效边界、仪器预算、未落位职责、共同口径、三场景样机。评审修正，优先级高于冲突措辞。
- signature.md：控制室签名元素——斜切 / 角括号 / 警示条纹 / 六角格 / 扫描线 / 密排大字 / 三方表决 / 同步率条 / 波形带，每个有预算与允许位置；只拿视觉词汇不拿任何作品资产。
- blueprint.md：**总账**——工作区 × 台面 × 面板矩阵、104 组件清单、数据模型、命令表、后端服务、前端基础设施、人工提供物、阶段、不做。
- research.md：研究层——流水线七台面、研究对象模型（Dataset / Factor / Model / Strategy / Run / Signal）、组件清单、运行中心。
- asset-management.md：资产管理层——六个台面、组件清单（含待做：Brinson、TCA、公司行动、批次成本、期权组、固收、宏观序列、ReportBuilder、Notes）、一个聚合器规则。
- markets.md：Market Profile——涨跌约定、交易日历、价格限制、结算与可卖规则、最小变动、币种；中国市场（A 股 / 科创北交 / 可转债 / 期货 / 期权 / 港股通）作为配置而不是默认。
- portfolio.md：多账户多品种的数据模型、五种视角、账户可见性规则、风险的位置、与 Lab 的关系。
- coverage.md：ATAS X / Fincept / TradingView 功能覆盖矩阵，✅ 已有 · 🟧 本批 · ⬜ 下一批 · ✖ 不做；2026-10-03 修正了三张未建卡的虚标，ATAS 部分以 atas.md 为准。
- states.md：空 · 加载 · 错误 · 断线 · 过期 五态的视觉、文案、LED。
- layout.md：外壳尺寸、7 个布局模板、密度与最小尺寸、大屏模式、响应。
- readability.md：可读性第一性原理——感知 / 认知 / 神经科学 / 心理学 30 条，每条带数值与落点。**必读。**
- icons.md：Lucide 基础 + 12 个控制台专用图标。
- pixel.md：点阵体系——字体清单、硬规则、尺寸表、签名时刻（时钟 / 开盘自检 / 跑马）。
- stack.md：每个组件用什么库；TanStack 六个包的分工；"流 vs 问""投影 vs 事实"两条硬边界。


## 4. 怎么用

- Web 前端：加载 `tokens.css`，在 `:root` 上用 `data-theme="console"`。所有组件只引用 `var(--token)`，stylelint 禁止裸色值 / 裸字号 / 裸间距。
- 弹簧与手势参数见 motion.md；音效清单见 sound.md。两者都是"由人调"的部分：Claude Code 实现时只留接口和保守默认，最终值由人在真实面板上调定后写回这里。
- 新组件进入系统前必须回答：属于哪个密度档、用哪个信号色、四态是什么、有没有音效。

## 5. 不做

- 不做第三套"高对比"主题（Console 12:1、Paper 16:1 已够）；不做任意颜色选择器。
- 不做渐变、毛玻璃背景、大圆角卡片、左边框卡片、emoji。
- 不做 CSS transition 的位移动画。
- 不用纯白 `#fff` 和纯黑 `#000`。


---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

14 components are documented without a runnable `components/bundle.js`: read each component’s card, and its README where it has one (`components/<Comp>/README.md`), and build to those guidelines. Tokens: the values are on `api/tokens.md`; a Slides deck or Design canvas also takes `tokens.json` by file path.

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` is the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: text, fill, chart, palette, type, spacing, radius, shadow, border. (7.4k)

**Components** (`api/components/<Comp>.md`, 14)

- **工作台**: `CommandLine` — 底栏命令行（GO Bar）。GUI、快捷键、CLI、MCP、OpenAlice 调的是同一张命令表；这里是人的入口。 · `LCDReadout` — 读数窗。所有"一个重要数字"都用它：总资产、时钟、延迟、RS、VaR、状态码。它是系统里唯一允许用 lcd-xl / lcd-md 字号的地方。 · `Meter` — 仪表。两种形态：条（Bar，进度/负载/敞口）和刻度（Gauge，一个 0–100 的读数带指针）。它是"血条"和"刻度盘"的统一实现。 · `PanelFrame` — 面板外框，所有工作台面板的统一壳：标题、当前对象、LinkGroup 色标、局部工具条、设置、最大化、关闭。 · `Splitter` — 分割线。split 树里每条边一个。这是"手感"最集中的组件，参数由人调。 · `StatusLED` — 指示灯。8px 圆点，五种状态：off（led-off，带内阴影）、on（orange + glow）、ok（green + glow）、warn（amber + glow）、danger（red + glow）。也可以排成点阵矩阵（异动灯阵、门序列）。 · `Toggle` — 拨杆开关。所有"启停"用它：策略启停、音效、安静模式、模拟/实盘账户模式、监控规则启用。 · `WorkspaceTabs` — 顶层工作区标签。Workspace 模型里唯一的 tab：切换整个工作现场（总览 / Desk / Lab / 组合 / 运行 / 用户自建）。面板级没有 tab。
- **图表**: `EquityCurve` — 净值曲线 + 镜像回撤。回测、策略实盘、分层对比的主图。 · `FactorIC` — 因子检验主图：IC 序列柱 + 累计 IC 线 + 五道门 LED + 指标 LCD 行。 · `Footprint` — 订单流足迹图。每根 K 线一个 Bid × Ask 格矩阵，按价格档聚合。自研 Canvas 2D，列式数据，rAF 合并绘制。 · `Heatmap` — 热力图。三种用途共用一个组件：行业 × 时间强弱（发散）、相关矩阵（发散，中点 0）、盘口 / DOM 历史热力（顺序 seq）。 · `QuantileLayers` — 因子分层累计收益。Q1…Q5（或 Q10）是序数，所以用顺序色阶 seq-200..600 暗→亮，而不是类别色——一眼看出是否单调。 · `SparkTile` — KPI 瓦片：点阵标签 + LCD 数值 + 24px 迷你折线 + 一行变化说明。总览和面板顶部的"仪表行"。


## 样机与报告索引（2026-10-03）

规格之外，这一轮做出来的东西都在这里，后续卡按同一模子做成实装：

| 物件 | 是什么 | 结论 |
|---|---|---|
| 四层联动样机（六工具） | Ambient / Scope / Focus / Selection 四层 context 的可操作验证 | 模型成立，写进 layout.md；默认一个联动组，第二组才出颜色 |
| 像素基地 Hub v2 | SVG 像素基地：房间、Agent 任务牌、决定队列、自检、进入工作区的过渡 | 待机态 = 屏保 + 决定队列入口；内容按 tools.md §14 Agent Task 最低功能线补 |
| Footprint 实装（首版） | Footprint 卡预览 | 手感与 Agent 表达的模子 |
| Footprint on Vela | 独立样机（历史） | 验证了接缝，但署名 + 只用核心不划算 → 不采用 |
| **KATANA DOM 梯子** | DOMLadder 卡预览 / 独立样机 | ATAS Smart DOM / DOM Trader 1:1 实装，引擎侧 L2 reducer 与纸面撮合，九态侦测，DOMArtifact |
| **KATANA Chart 引擎** | PriceChart 卡预览 / 独立样机 | **自研 `@katana/chart` 段 1–3 已通**：序号轴、多 pane、六种样式、8 种绘图、分页、非时间柱、回放同流、九态、ChartArtifact（engineering §2.2） |
| 《量化工作台联动模式调研》 | ATAS / TradingView / Bookmap / Sierra 等的联动方式 | 四层 context 的来源 |
| 《ATAS X 功能清单与覆盖对照》+ 重分类清单（xlsx） | 218 项对 94 卡的矩阵 | atas.md / coverage.md；长尾范围 |
| 《KATANAview Professional Tool Specs》 | 外部规格包 | 六处对齐后入库为 spec.md + tools.md |

成熟度口径只用四个标签（tools.md §15）：IMPLEMENTED · FIXTURE VERIFIED · BACKEND CONNECTED · PRODUCTION VERIFIED。本库目前所有卡 ≤ IMPLEMENTED；补全进度表在 tools.md §16。
