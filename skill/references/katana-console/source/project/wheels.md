# 开源轮子：吸收什么、怎么用、不用什么

原则（AGENTS.md）：成熟且维护良好的库能降低复杂度或提高可靠性时优先采用；先查现有依赖的能力再新增；每个新依赖须人工批准（hook 拦 `pnpm add`）。三档：**采用** = 进 stack；**候选** = 第 1 周 spike 比较后定；**参考** = 只学模式与视觉，不引代码。许可证全部可随 GPL 项目分发（MIT / Apache-2.0 / ISC / OFL / BSD）；GPL 自身的项目只参考不引入（除非我们同为 GPL）。

## 1. 表格与高频数据

| 轮子 | 许可 | 解决什么 | 档 |
|---|---|---|---|
| TanStack Table + Virtual | MIT | headless 列模型 + 行虚拟化（已定） | 采用 |
| **Glide Data Grid** | MIT | Canvas 绘制的表格，十万行、每帧改格不卡；自带列拖拽 / 冻结 / 编辑 | **候选**——Spike C 把它和"TanStack + 自建 transactions.ts"并排测：若自建 DOM 表 p95 帧时过不了 8ms，DataGrid 内核换成它，皮肤与 README 不变 |
| **uPlot** | MIT | 极小极快的时间序列图（10 万点 < 10ms） | **采用**——IntradayPnL / SeriesBrowser / ExposureTimeline / SystemHealth 迷你线 / SparkTile 用它，不用 lightweight-charts 画非 K 线的序列 |
| **Apache Arrow JS** | Apache-2.0 | 列式内存格式：Worker ↔ 主线程零拷贝传表、与 Parquet 产物同格式 | 采用——run 产物（nav / trades / positions.parquet）直接读；DataGrid 的 rows 可接 Arrow Table |
| **DuckDB-WASM** | MIT | 浏览器内 SQL 分析引擎，直接查 Parquet / Arrow | **采用**——Screener 本地筛选、SeriesBrowser 变换、TradeStats round-trip 配对、Trial Ledger 查询都在它里跑，Worker 不用手写聚合 |
| Comlink | Apache-2.0 | Worker RPC，把 `MarketAPI` / 聚合器暴露成普通 async 函数 | 采用 |
| PartySocket / reconnecting-websocket | MIT | WS 自动重连、退避、心跳 | 采用（Quote Hub 连接层） |

## 2. 状态与交互

| 轮子 | 许可 | 解决什么 | 档 |
|---|---|---|---|
| **XState v5** | MIT | 状态机 + statechart：订单生命周期、run 生命周期、ConsensusBlock 五态、ChartTrader 三种线、L4 阶梯——"动画只是状态的投影"需要真正的状态机 | **采用**——所有 engineering.md §4 §5 里的状态机用它写，并自动导出状态图进 README |
| Zustand / TanStack Store | MIT | 外壳状态 | 二选一（第 1 周） |
| **react-resizable-panels** | MIT | split 树的分割线实现参考：键盘、最小尺寸、持久化、WAI-ARIA Splitter 模式 | 参考——Spike A 读它的源码再决定自写还是直接用（它不做 docking，与我们模型一致，可直接用） |
| cmdk | MIT | 命令面板（已定） | 采用 |
| Motion | MIT | 弹簧（已定） | 采用 |
| **@number-flow/react** | MIT | 数字滚动动画，按位滚、支持货币与千分位 | 采用——LCDReadout 的"展示性汇总"数字滚动用它；engineering.md §5 的"可执行数字不插值"规则不变 |
| Base UI | MIT | 无样式基元（已定） | 采用 |
| react-hotkeys-hook / tinykeys | MIT | 快捷键注册与冲突检测 | 候选（tinykeys 1KB 够用） |
| dnd-kit | MIT | 面板交换、篓子排序、RebalanceDesk 拖目标 | 采用 |

## 3. 终端与控制台视觉

| 轮子 | 许可 | 解决什么 | 档 |
|---|---|---|---|
| oh-my-posh | MIT | 终端提示符的分段模型：segment 类型 / 模板 / 颜色 / 连接符，主题 JSON | 参考——StatusBar 的分段模型来源（注意：这不是 OMP；OMP = Oh My Pi，见 §7a） |
| Starship | ISC | 同类，Rust；模块按上下文出现 / 隐藏的规则 | 参考（"段落只在有事时出现"= 我们的 LED 默认灭） |
| **xterm.js** | MIT | 浏览器终端 | 采用——CommandLine 的"CLI 模式"与 RunQueue 的 run 日志视图用它，不自写终端 |
| Nerd Fonts | MIT（字形 OFL） | 终端图标字形 | 不引入（图标统一 Lucide；点阵字已够） |
| **cool-retro-term** | GPL-3 | CRT 着色器：扫描线、辉光、曲率、闪烁 | 参考——只学 `scanline` 的参数感（我们 2% 亮度、3px 周期），不做曲率与闪烁（readability） |
| Textual（Python TUI） | MIT | 高密度终端 UI 的布局与组件模式：DataTable、Sparkline、Digits、Log、Tree、Footer 快捷键条 | 参考——Textual 的 `Footer` 快捷键条、`Digits` 七段数字、`Sparkline` 都是我们 CommandLine / LCDReadout / SparkTile 的同类，看它怎么处理焦点与键盘 |
| ratatui / lazygit | MIT | Rust / Go TUI 的面板分割与键盘导航 | 参考（split 树键盘导航 vim 式 h/j/k/l 切面板） |
| **ogl / three.js**（轻量 WebGL） | MIT | 大屏模式的 GPU 后处理（扫描线、轻微色散**不要**、hex 灯阵 1 万格） | 候选——只在 rendering.md 的 WebGPU/WebGL 后端里，Canvas 2D 够用就不加 |

## 4. 图表与可视化

| 轮子 | 许可 | 解决什么 | 档 |
|---|---|---|---|
| **Vela**（LuxAlgo，@luxalgo/vela） | Apache-2.0（NOTICE：界面可见 Vela 标记） | K 线底盘：headless core + WebGL2 / Canvas2D 原生渲染器、75 种绘图、多 pane、回放、设置对话框、插件接缝（chart type / renderer layer / data provider / scripting engine 端口） | **参考**（2026-10-03 定稿）——样机验证过其 chart type / renderer layer / provider 接缝；最终图表引擎自研 `@katana/chart`，只学它的坐标模型、layer 栈、设置行与绘图架构，不引代码、无署名（engineering §2.2） |
| lightweight-charts | Apache-2.0 | K 线 | 不用（自研取代，不双轨） |
| TradingView（产品） | 闭源 | 图表交互与绘图语义、同步、回放、Order Ticket 的成熟基线 | 参考（功能与操作模式；Charting Library 不引） |
| **PineTS**（LuxAlgo） | **AGPL-3.0 / 商业双许可** | Pine Script 转译 + 运行时，Node / Deno / Bun / 浏览器；60+ ta 函数、arrays / matrices / maps、request.security、strategy 命名空间、v6 标 experimental | **候选**——只作后端 Node sidecar 跑经典指标语料与用户自带 TradingView 脚本，经 RemoteEngine 端口上图；订单流指标走 Python SDK；许可证未定前只参考（spec.md §0 冲突 3） |
| vela-pinets | AGPL-3.0 | Vela 的 Pine 引擎插件：PineEngine（主线程）/ PineWorkerEngine（Web Worker） | 不用——两种模式都在浏览器执行，违反「算在后端」边界 |
| uPlot | MIT | 序列图（上） | 采用 |
| **d3-scale / d3-format / d3-time / d3-array** | ISC | 刻度、格式、时间分桶、分位数——只引子包，不引 d3 整包 | 采用——所有自研 Canvas 图共用；千分位 / 小数位规则集中在 `format.ts` 用 d3-format |
| **regl-scatterplot** | MIT | WebGL 散点，百万点可交互 | 候选——ParamScatter 超过 5,000 组、TCA 逐单超 2 万时换它 |
| visx | MIT | React + d3 的低层图元 | 不引（我们自研 Canvas，不走 SVG React 树） |
| Observable Plot | ISC | 快速探索图 | 参考（SeriesBrowser 的变换语法） |
| **@tanstack/react-virtual + Canvas 热力** | — | Heatmap 大矩阵 | 自研（已定） |

## 5. 字体与排版

| 轮子 | 许可 | 解决什么 | 档 |
|---|---|---|---|
| **cn-font-split** | MIT | 中文字体按 unicode-range 分片 + CSS 生成 | 采用（typography.md 已定） |
| fontaine / capsize | MIT | 字体回退时的度量匹配，避免中文点阵未载入时跳版 | 采用——`size-adjust` / `ascent-override` 自动算 |
| subfont | MIT | 按页面实际用字子集化 Google Fonts 六个点阵字 | 采用（生产构建） |
| Maple Mono / 方舟像素 / 缝合像素 / 得意黑 / DSEG | OFL | 已定 | 采用 |
| Iosevka | OFL | 可定制等宽（备选 mono，若 Maple 中文宽度在某些字重不严格 2:1） | 候选 |

## 6. 开发与质量

| 轮子 | 许可 | 解决什么 | 档 |
|---|---|---|---|
| **Storybook 9** + test-runner + addon-a11y | MIT | 每张卡的四态 / 五态 story、交互测试、无障碍 | 采用（DoD 依赖） |
| **Lost Pixel** 或 Argos（OSS 模式） | MIT | 截图回归：story 对照 `design/components/X/preview.html` | 采用——DoD 第 1 条"视觉对照"由它跑；容差 1% |
| Playwright | Apache-2.0 | 样机 A/B/C 的端到端 + 性能计时（PerformanceObserver 注入） | 采用 |
| Vitest（browser mode） | MIT | 单测 + Worker 测试 | 采用 |
| **Biome** | MIT | lint + format 一体，比 eslint+prettier 快 20× | 采用（eslint 只留 token 规则插件） |
| stylelint + 自定义规则 | MIT | 禁裸色值 / 字号 / 间距 | 采用（ui.md） |
| **Knip** | ISC | 找未用的导出、依赖、文件——85 组件项目最容易长死代码 | 采用 |
| size-limit | MIT | 包体预算：首屏 JS、字体字节 | 采用（Spike D 的 300KB 字体预算写进 CI） |
| Changesets | MIT | 版本与 changelog | 采用 |
| **Terrazzo**（原 Cobalt）或 Style Dictionary | MIT / Apache-2.0 | tokens.json（DTCG 格式）→ tokens.css / TS 类型 / 文档 | 采用——`sync-design` skill 用它生成，不手写转换脚本 |
| Ladle | MIT | 更轻的 story 环境 | 不引（Storybook 已够） |
| web-vitals | Apache-2.0 | INP / LCP 实测上报 | 采用（product.md 性能验收） |

## 7. Agent 与扩展运行时

| 轮子 | 许可 | 解决什么 | 档 |
|---|---|---|---|
| MCP TypeScript SDK | MIT | KATANA 命令表暴露为 MCP 服务器（`katana-commands`） | 采用 |
| **Zod** | MIT | CommandSpec.input / Capability input_schema 的运行时校验 + JSON Schema 导出 | 采用 |
| **json-schema-form / @rjsf** | Apache-2.0 | `settingsSchema` → 设置面板自动生成 | 候选（TanStack Form 手写也行；若设置项 > 30 用它） |
| MLflow JS 客户端 / REST | Apache-2.0 | run 存储适配器 | 采用（adapters/research） |
| Beancount（外部进程） | GPL-2 | 现金流账 | 外部服务，不引代码 |
| Claude Code Mods / DeepSeek Harness / **Oh My Pi** | — / MIT | 事件拦截、能力 seam、durable events、扩展与内建同 API、子代理 typed results、rpc-ui 帧 | 参考 + OMP 候选内核（§7a） |

## 7a. Oh My Pi（OMP）——重点吸收

[can1357/oh-my-pi](https://github.com/can1357/oh-my-pi)，MIT。Mario Zechner 的 pi 编码代理的重写分支："a coding agent with the IDE wired in"：~80k 行 Rust 核心（搜索 / shell / AST / PTY / 桌面）+ TS，60+ 模型提供方、31 个内置工具、TUI 差分渲染（`@oh-my-pi/pi-tui`）、LSP / DAP 接入、子代理、会话 fork / resume / export、RPC / ACP / SDK 三种嵌入方式。它对 KATANA 有三层用处：

### 作为开发工具（和 Claude Code 并列）

| OMP 能力 | 怎么用 |
|---|---|
| 启动即继承 `.claude` / `.cursor` / `.codex` 等的 rules、skills、MCP，"No migration script" | 我们的 `CLAUDE.md` + `.claude/rules/*.md` + skills 不用改，贡献者没有 Claude 订阅也能用同一套规则开发——**开源项目的关键**：Dev Spec §9 的配置同时服务两个代理 |
| `advisor` 角色：第二个模型在独立上下文读每一轮，注入 amber 关切 / red 阻断 | 等价于我们的 spec-reviewer / ds-reviewer，但是实时的；可配成"读 design/ 和 engineering.md 的审阅者" |
| Time-Traveling Stream Rules：正则命中即中断流、注入规则、从同点重试，不占上下文 | 把 ui.md / markets.md 的禁令（裸色值、`'CN-A'` 字面量、`setRows`）写成 TTSR 规则，比 hook 事后拦更早 |
| `task` 子代理在隔离 worktree 跑，返回 schema 校验的对象，`agent://<id>/findings.0.path` 取字段 | 四个 spike 并行 + 结构化结论回写，正是 Dev Spec 第 1 周的形态 |
| 预览后接受（`xd://resolve` → Accept 卡）、hashline 补丁省 61% 输出 | 大仓库里改 92 个组件的成本控制 |
| `--mode rpc` NDJSON、`--mode rpc-ui` 的 `extension_ui_request` 帧、ACP、`@oh-my-pi/pi-coding-agent` SDK | 可被 KATANA 自己的运行中心嵌入（见下） |

档：**采用**（作为 Claude Code 的并列代理，CI 与贡献者用）。

### 作为 OpenAlice / Agent 控制面的架构参考与候选内核

| OMP 概念 | KATANA 对应 |
|---|---|
| "An extension is a TypeScript module. Same tool API, same slash-command registry, same hotkey table, same TUI primitives the built-ins use. Nothing is reserved." | product.md §9 Capability 契约的原则：扩展与内建同一 API，没有保留能力 |
| 十个角色模型槽（`default / smol / slow / plan / commit / vision / designer / task / advisor / tiny`）、fallback 链、路径限定 | AgentsStatus 显示的就是这种路由表；OpenAlice 六个 Agent 的模型分配按角色槽配 |
| Agent Hub（`Alt+A`）：名册、每 worker 成本与时长、注入 steering、唤醒 parked、杀 stuck | **AliceSessions / RunQueue 的功能清单直接对齐**：加"注入指令 / 唤醒 / 终止"三个动作 |
| `ask` 工具：代理在回合中弹出结构化选项选择器 | DecisionQueue 里"等人决定"条目的数据形态（问题 + 选项 + 默认 + 截止） |
| 子代理 typed result schema + `agent://` URI | run 产物与证据的寻址方式（`run://2c91/gates.json`） |
| 会话 fork / resume / export、`/fresh` 重置流不丢 transcript、`/collab` 中继 + QR | AliceSessions 的会话操作；团队模式的协作中继 |
| `rpc-ui` 的 `extension_ui_request` 帧（tool cards、selectors、dialogs） | OpenAlice 向 KATANA 推 UI 请求的协议参考：Agent 要人确认时发一帧，KATANA 渲染成 ConsensusBlock / DecisionQueue 条目，**不是**让 Agent 直接画 UI |
| 记忆工具 `checkpoint / rewind / retain / recall / reflect / learn / manage_skill`，后端 SQLite / Hindsight / Mnemopi | OpenAlice 的研究记忆与 Notes / HypothesisLedger 的接口 |
| 安全：工作树隔离、预览后接受、`session/request_permission`（ACP） | 与我们"Agent 只能提案、写命令走网关"一致；OMP 没有交易级权限，那一层仍是 KATANA 的 |

档：**候选**——OpenAlice 的代理内核如果不是自研，`@oh-my-pi/pi-coding-agent` SDK（`ModelRegistry · SessionManager · createAgentSession`，会话发 typed events）是最接近"可嵌入、多模型、带子代理与会话持久化"的现成 harness；与 DeepSeek Harness、Claude Code Mods 并列评估。

### 视觉与交互参考

- `pi-tui` 差分渲染 + 工具调用渲染成**卡片**（结构化数据，不是日志流）：RunQueue 的 run 日志、AliceSessions 展开的任务树按"卡片"而不是终端文本来做；xterm.js 只给真正的 CLI。
- 顾问注释的两级色（amber 关切 / red 阻断）与我们的 warn / danger 一致。
- 生态：[ohmypi-craft](https://github.com/BRCOO/ohmypi-craft)（Electron / React 的本地优先桌面壳）是"给代理做前端"的同类项目，看它怎么呈现会话、工具卡与权限；[omp-agent](https://github.com/bparlan/omp-agent) 的 spec-driven 工作流与我们 Dev Spec → 设计系统卡 → ds-reviewer 的链条同构。

## 8. 不用的轮子（与规则冲突）

- dockview / FlexLayout / Golden Layout / rc-dock：docking 模型，禁。
- AG Grid Enterprise / Handsontable：许可不兼容或过重；AG Grid Community 只作 `transactions.ts` 的行为参考。
- Ant Design / MUI / Chakra 整套组件库：第二套基元，禁。
- Framer-style 页面动画库、Lottie：装饰性动效，禁。
- 任何 "glitch / CRT 曲率 / 噪点" 效果库：signature.md 不做。
- Tailwind 整套（允许 `cdn.tailwindcss.com` 仅用于样机 HTML）：生产用 tokens.css + CSS Modules，不用 utility 类覆盖 token 纪律。

## 9. 怎么吸收（流程）

1. 第 1 周审计时对本页每一行跑 `pnpm why` / 许可证扫描（`license-checker`），不兼容的删掉。
2. 候选项在对应 spike 里并排测，结论写回本页并改档。
3. 参考项只写进组件 README 的"来源"一行（如 StatusBar README：`段落模型参考 oh-my-posh`），不引代码。
4. 新轮子进入 = 改本页 + hook 放行一次 + ds-reviewer 检查有无绕过 token 纪律。
