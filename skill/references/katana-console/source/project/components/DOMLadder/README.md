# DOMLadder

> **本卡预览是可运行的实装（2026-10-04）**：ATAS Smart DOM / DOM Trader 的能力按 `docs/ux/atas-capture/dom-ladder.md` 与 atas.md §2.4 逐项搬，操作换成我们的方式；**一切可定制，没有写死的**（设置 schema 是唯一事实源，面板 / `set` 命令 / Agent 同一入口，改即生效，localStorage 持久化）。**设置面板（齿轮 / 右键 › 设置 / `settings <tab>`，非模态抽屉，梯子继续跑）**：常规（行高 · 字号 · 量显示 缩写/千分位/按手 · 深度档数 · 聚合 · 自动居中 + 偏差行 · 主网格间隔 · 价差行淡显 · 过滤阈值 · 闪烁 + 时长 · 悬停提示 · 声音 · 引擎帧间隔 · 深度变化窗口 · 当前成交自清窗口 2.5s）· 列（14 列显隐 / 宽度 / 拖排 + Bid/Ask Ladder + 买卖量 / 深度变化 / 成交 / 轮廓 子模式）· 交易（锁定 · One-Click Mode · DAY / GTC · 默认手数 · 快捷手数组 · 盈亏单位 · **FIFO / LIFO** · 仓位边框）· DOM Trader（四模式 · 深度条 · **Liquidity map 参数组**：配色 经典/单色/霓虹/热力 · Upper cutoff % · 对比度 · 平滑 Auto/Manual/None · 动画速度 · 对数刻度 · 不透明度 · 最优买卖线型 / 线宽）· 颜色（Bid · Ask · buyColor · sellColor · 我的单 · 最新价底 · 文字 · 买量列底 · 卖量列底 · 最优线 · 背景，每项「↺」回 token）· 模板。**列**：拖列头主体 = 排序，拖列头右缘 = 改宽（两者互不干扰）；列总宽超出面板时横向可滚不裁列。**模板（ATAS Templates 九动作）**：Load · Save · Add · Delete（确认）· Rename（默认关联跟随改名）· Reset（出厂）· Defaults（新面板默认）· Export（JSON 文本 + 复制）· Import（粘贴 / 选文件；非 JSON 或缺 settings / cols 明确报错且不新增）；未保存改动标 ●，Load 其它模板先确认；三套内置预设 ★ 精简盘口 / ★ 完整分析盘口 / ★ DOM Trader 刮头皮（只能 Load / Defaults）。**红线**：模板 / 存档 / 导入都**不带锁定状态**，启动与 reload 永远锁定；坏存档（含 null 的列数组、非法值）原子拒绝回出厂，price 列不可被存档隐藏；FIXTURE / 状态标在设计模式下不可隐藏。**右键菜单（ATAS Context Menu）**：锁定 / 解锁交易 · 设计模式 · 显示全部元素 · 设置 / 列 / 模板 · 居中 / 自动居中 · 模板快速 Load（Clone window 由工作区外壳负责，不在此出现）。**设计模式**：工具条 / 页脚元素点击隐藏、拖动重排，持久化进模板。**快捷键纪律**：INPUT / SELECT / TEXTAREA / contenteditable 聚焦、IME 合成、Ctrl / ⌘ / Alt 组合一律不触发 L / A / C / `/`。**列（B 节 21 项）**：Price · Bids / Asks（Volume / Number of applications / Average volume）· Bid/Ask Ladder · My Buy / My Sell Orders（× 撤、拖拽改价）· Queue（估算 + ATAS 原话 tooltip）· PNL & Orders · Latest trade quantity · Histogram profile（Histogram / Numbers / Both）· Trades（Volume / 主买 / 主卖 / Delta）· Buy / Sell Current Trades（自清窗口可调，默认 2.5s）· Depth changes（Pulling & Stacking / Stacking / Pulling，窗口可调，默认 2s）· Notes。**工具条（A 节）**：标的 chip · PAPER 账户 chip · TIF（DAY / GTC，随单发送）· 手数预设（可定义）+ 输入 · Exit（预留）· 列 · ⚙ 设置 · 仓位 / 盈亏 LCD · Reverse / Flatten（One-Click 关时确认）/ Cancel All · **Lock trading 默认锁定** · 居中 / 自动。**交易语义**：锁定时点买量 / 卖量只提示「演示模式：交易已锁定」；解锁后点买量 = 买限价**草稿**、点卖量 = 卖限价草稿（越过现价标 STOP）、右键买卖量 = Stop 草稿、↵ 提交到引擎 PAPER 撮合（排队估算 + touch 成交；**一笔成交的量在同档多单间共享**；lots 按 FIFO / LIFO 平；**Stop 单不参与限价撮合，成交价触及即触发为市价**，格子虚线标 S）、右键自己的单 = 撤、拖自己的单 = 改价、`mkt` 市价；**交易闸**：回放 / STALE / GAP / RESYNC / OFFLINE 态前端拒绝，引擎侧同样拒绝（`reject` 消息），确认框在确认那一刻再查一次状态。**数据边界**：L2 快照 + 有序增量 + 序列状态在引擎 reduce；丢的包连同其成交一起丢，gap / resyncing 期间不计当前成交也不撮合；帧里的最优买卖与档位同源（reducer），L1-only 才用源簿；gap → 停算派生列 → 请求快照 → resyncing → 原子替换 → live；stale / disconnected 由前端按心跳**侦测**（阈值随帧间隔缩放）；`state unsupported` 退回 L1-only，不画假深度；回放是同一条流，交易按钮禁用。命令 `/`：`set <key> <value>`（覆盖全部设置，无值 = 布尔切换 / 颜色回 token / 其它回默认）· `get [key]` · `settings [tab|close]` · `template list|load|save|add|delete|rename|reset|defaults|export|import` · `width <col> <px>` · `design [on|off]` · `showall` · `hide <el>` · `reset` · 旧命令 `col · cols · mode · bids · chg · trades · pnl · agg · depth · center · auto · lock · qty` 是 `set` 的语法糖 · `sym · order · submit · mkt · cancel · flatten · reverse · clear · note · state · replay · stop · agent · artifact`。对外 `window.KDOM = {run, settings, schema, defaults, set, cols, templates(), template(), ui, artifact, state, data, view}`；`artifact()` 输出 tools.md §2 的 DOMArtifact（新增 `view`：模板 / 模式 / 聚合 / 列 / 深度 / 盈亏算法 / TIF / 锁定）。帧→绘制 p95 ≈ 16ms。测试：`test_engine.js` 15 项（引擎单元：Node vm 跑 Worker 源——共享成交量 / 排队 / Stop 触发 / FIFO · LIFO / 丢包与 gap / bbo 同源 / 交易闸）+ `test_kd2.js` 27 项（能力 + PR #42 评审回归）+ `test_kd3.js` 71 项（定制：schema / 面板 / 列宽 / 模板九动作 / 设计模式 / 右键 / reload 持久化 / 引擎参数 / 回归点）。预览带 FIXTURE 标；成熟度 **IMPLEMENTED**，未到 FIXTURE VERIFIED。

盘口梯子（ATAS Smart DOM 的对应）。价格列居中，左买右卖，外侧是自己的挂单列，右侧成交量与深度变化。可直接下单。站在 DataGrid 之上，价格行由 TanStack Virtual 虚拟化。

## 列（可配置、可拖排）

| 列 | 内容 | 颜色 |
|---|---|---|
| 买单 / 卖单 | 自己在该价位的挂单 | `order-own` amber 描边 + 文字，与买卖色都不冲突 |
| 买量 / 卖量 | 挂单量，三档强度 | `bid-100/200/bid`、`ask-100/200/ask`，按分位 |
| 价格 | 居中，`bg-000` 凹陷；最新价行 `poc` 底 + `bg-000` 文字 | |
| 变化 | Pulling（撤）/ Stacking（加）：窗口内净变化 | `signal-green` 加 / `signal-red` 撤 / `ink-300` 0 |
| 成交 | 当日该价位累计成交，背景点阵条（`seq-200`）= 成交量轮廓 | |
| 买卖价差行 | 4px `bg-100` 间隔 | |

## 交互（ATAS 的精华，一条不少）

- **点击买量列 = 在该价位挂买单，点击卖量列 = 挂卖单**（需在页脚开启"点击下单"拨杆，默认关）；自己的挂单出现在外侧列。
- **拖动自己的单到另一价位 = 改价**；拖出梯子 = 撤单；双击 = 撤单。全部走 `order.*` 命令 → 确认（可设"快速模式"跳过确认，但实盘账户下快速模式每次会话重新确认一次）。
- **跟随 / 锁定**：跟随时最新价行保持在视窗中线，有新价用 `snappy` 滚动；锁定后手动滚动，顶部出现"回到现价"按钮。
- 滚轮 = 滚动价格；⌘ + 滚轮 = 改聚合档位（0.01 / 0.05 / 0.10 …），档位变化整表 `gentle` 重排。
- 深度变化列有计算窗口（默认 2s）与重置规则；断线重连后清零，不出现假撤单。
- 悬停一个价位 → 整行高亮 + tooltip（累计买卖、成交、自己的单）。

## 状态

- 无 L2：梯子显示"无深度数据"空态，不画假深度。
- 深度不足（只有 5 档）：页脚 `深度 5/10`，其余行 `ink-400` 占位。
- 账户模式：页脚始终显示"模拟账户 / 实盘账户"，实盘为 amber 文字 + LED。

## 规则

- 买卖色是 `bid` / `ask`，永远不是 `pnl-up/down`；买在下卖在上符合涨在上的数字直觉（§22）。
- 价格列两侧 16px，买卖量列之间 12px（§3）；点击下单目标行高 ≥ 22 且整行可点。
- 周边提示：大单到达用整行亮度脉冲，不靠颜色（§16）。
- 下单路径：梯子 → `order.place` 命令 → 确认 → 执行网关。梯子不直接连券商。
- 快速模式不能绕过执行网关的风控拒绝。

## 谁提供什么

- 组件：levels[{price,bid,ask,vol,delta}]、last、ownOrders、aggregation、follow、clickToTrade、accountMode、window。
- 数据：MarketAPI 的 L2 快照 + 增量；订单事实来自账户服务，不从本地点击推断。

## ATAS 对照补齐（2026-10-03，atas.md §2.4）

- 列补齐：Common 11（Price · Bids · Asks 三模式 Volume / Number of applications / Average volume · Bid/Ask Ladder · My orders · My buy / sell orders · Queue · PNL & Orders · Latest trade quantity · DOM trader）；Analytical 10（Histogram profile · Trades · Buy Current Trades · Sell Current Sales · Depth changes 三模式 Pulling And Stacking / Stacking / Pulling · Notes · Liquidity map · Order Flow · Footprint · Rolling Footprint）。列可拖序、可隐藏，模板走 Workspaces。
- 交易语义：Simple / Manual Order Entry 两套点击逻辑（左键限价、右键 Stop、本方 / 对手价）、MKT 按钮、拖拽改单、Cancel All / Cancel Bids / Cancel Asks、Flatten、Reverse、SL/TP 放置模式（经 ExitStrategy）、One-Click Mode、Lock trading、TIF；页脚迷你下单条（数量预设 1–5）。
- 设置：Auto-center 间隔与速度、Center Line、Depth Count、Price Digits、Flash、Stop Limit Slippage、Stop as StopLimit、Close Outstanding on flat、Design mode。
- 全局绘图对象（水平线 / 射线 / Highlight Y / 矩形）经 `ChartSurface` 画到梯子上；MBOTrackers 事件按行标记；`priceRange` 槽位与图表 / 热力锁定。
- 热键进 Preferences 的 DOM 组（不预设默认值，用户显式绑定并确认）。
- 优先级：P0 交易语义 + Pulling/Stacking + 页脚；P1 分析列。
