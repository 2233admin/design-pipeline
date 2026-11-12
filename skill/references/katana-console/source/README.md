# KATANA Console — 设计系统、规格层与样机（2026-10-03 快照）

这里是 claude.ai 上「KATANA Console」设计系统 artifact（Version 36）的源文件，连同这一轮做出来的样机与调研。**全部是带 provenance 的提案，不是已确认决策**：与仓库现行文档（`docs/design/DESIGN.md`、`docs/ux/RENDERING_DOCTRINE.md`、`docs/architecture/TRADING_PLATFORM_WHEELS.md`）冲突的地方列在 `docs/design/KATANA_CONSOLE.md`，由人裁定后再写进 `docs/ux/UX_DECISION_LEDGER.md`。

## 目录

| 路径 | 是什么 | 怎么用 |
|---|---|---|
| `project/` | 设计系统本体（`project/api/` 是 Design System 类型自动生成的摘要页，只覆盖它登记的 14 张卡；其余卡只有 `components/<Card>/README.md`；token 的事实源是 `tokens.json`，没有 `manifest.json`；CSS 形式且已解析别名的版本见 `prototypes/chart-engine/tokens.css`）：`README.md`（原则 / 视觉基础 / 组件总览）、27 页文档、`tokens.json`（Console / Paper 双主题）、`components/<Card>/`（105 张卡：`README.md` 规格 + `preview.html` 预览，其中 PriceChart / Footprint 的预览是可运行实装）、`design-system.json`（artifact 清单） | 读 `project/README.md` 起步；每张卡的 `preview.html` 可直接在浏览器打开（需要 tokens：卡预览在 artifact 内由宿主注入 `:root` 变量，本地打开请先引入 `prototypes/chart-engine/tokens.css`） |
| `project/spec.md` · `project/tools.md` | **规格层**：系统边界、数据契约、公共状态、性能预算、施工规则；12 个 MVP 工具的功能 / 验收表 / Agent Artifact、规格名 → 卡名映射、ATAS 长尾、组件库补全进度（§16） | 施工一个工具只读 `spec.md` + `tools.md` 对应一节 + 卡 README + 仓库代码 |
| `project/atas.md` · `project/coverage.md` | ATAS X 218 项功能对 94 卡的覆盖矩阵（范围 = 不做为零，顺序看 tools.md）；三家产品功能映射 | 与 `docs/ux/ATAS_COMPATIBILITY_MATRIX.md` 并读：那边是现有代码的做 / 不做状态，这边是目标范围 |
| `project/engineering.md` · `stack.md` · `wheels.md` | 工程契约：四层 DoD、图表引擎选型（§2.2，自研 `@katana/chart`）、DataGrid 增量策略、轮子分档 | 与仓库 `RENDERING_DOCTRINE.md` / `TRADING_PLATFORM_WHEELS.md` 的冲突见 `docs/design/KATANA_CONSOLE.md` |
| `prototypes/chart-engine/` | **`@katana/chart` 自研图表引擎样机（段 1–3 已通）**：`kchart.js` 单文件引擎 + `kc_body.html` / `kc_style.css` + `build_kc.py`（拼出本地测试页 / 卡预览 / artifact 页）+ `test_kc2.js`（Playwright 功能测试）+ `index.html`（已拼好的页） | `python3 build_kc.py local && node test_kc2.js`；页面内 `/` 打开命令表，`window.KChart.run(cmd)` 是 Agent 调用面 |
| `prototypes/dom-ladder/` | **DOMLadder 实装**：`kdom.js` 引擎（Worker：L2 生成 → 可丢包传输 → reducer 序列状态 → 派生列 → PAPER 撮合 FIFO / LIFO）+ 前端（固定行只 patch 变化的格）+ **定制层**（设置 schema → 面板 / `set` 命令；列宽 / 排序 / 显隐；模板九动作；右键菜单；设计模式；localStorage）；`build_kd.py` / `test_engine.js`（引擎单元，Node vm）/ `test_kd2.js`（能力 + 评审回归）/ `test_kd3.js`（定制 + 回归点） | `node test_engine.js && python3 build_kd.py local && node test_kd2.js && node test_kd3.js`；`window.KDOM.run(cmd)` |
| `prototypes/footprint-live/` | Footprint 首版实装（自带 ChartSurface），已合流到 chart-engine | 历史参考；手感与 Agent 解读的模子 |
| `prototypes/hub/` | 像素基地 Hub v2（SVG）：房间、Agent 任务牌、决定队列、自检、进入工作区的过渡 | 待机态 / 屏保 + 决定队列入口；内容按 tools.md §14 Agent Task 最低功能线补 |
| `prototypes/link-proto/` | 四层联动（Ambient / Scope / Focus / Selection）六工具验证样机 | 联动模型的来源，已写进 `project/layout.md` |
| `research/` | 《量化工作台联动模式调研》《ATAS X 功能清单与覆盖对照》、ATAS 能力对照重分类清单（xlsx）、外部规格包原稿（已去引用标记） | 调研依据 |
| `research/evaluations/` | Vela（LuxAlgo）样机：验证过其插件接缝，因署名 + 只用核心不划算 + 三处结构性需求给不了而**未采用** | 选型记录 |

## 状态口径

成熟度只用四个标签（`project/tools.md` §15）：IMPLEMENTED · FIXTURE VERIFIED · BACKEND CONNECTED · PRODUCTION VERIFIED。本目录内所有实装 ≤ IMPLEMENTED；样机数据全部是 Worker 生成的确定性 mock，页面带 FIXTURE 标，不代表任何真实行情或交易能力（遵守仓库 Evidence / PAPER 边界）。

## 来源

- claude.ai artifact「KATANA Console」（设计系统，Version 36）与「KATANA Chart 引擎」「Footprint 实装」「KATANA 基地 v2」「四层联动样机」。
- 参考产品只学功能、工作流、交互与数据语义：ATAS / ATAS X、TradingView、Bookmap、TapeDelta、FinceptTerminal、tick-stock-panel、OpenTerminalUI、NautilusTrader、OpenBB、OpenAlice、Vela。不复制品牌视觉，不引入其代码。
