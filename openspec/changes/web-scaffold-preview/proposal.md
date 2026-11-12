## Why

web 路线的 build 阶段要求手写 `index.html` 与 `component-manifest.json`。film 与 composition 路线有
`scaffold`，web 没有：`frontend-stack` 只产出栈决策（框架、样式、UI 库），选定 react 或 tailwind 之后
装依赖、写入口、配构建仍靠 agent 现编，每个页面从空白开始。section 评审要求"在真实浏览器里打开"，却没有
统一的起服务入口，`evidence refs` 与逐段评审各自临时起服务。

## What Changes

- 新增 `web scaffold --output <dir> --decision <frontend-stack-decision.json> [--replace]`：吃
  `frontend-stack resolve-stack` 写出的决策，写出可 `npm install`、可构建的最小 Vite 工程
  （`package.json`、`vite.config.js`、`index.html`、`src/` 入口与样式、空的 `component-manifest.json`、`WEB.md`），
  UI 库的安装/初始化命令列入 `next`。沿用 `film scaffold` 的 `OUTPUT_EXISTS` 与 `--replace` 语义。
- 新增 `web preview --root <dir> [--path <subdir>] [--port <n>] [--timeout-ms <n>]`：在 127.0.0.1 起静态服务，
  stderr 打印可访问地址，收到 SIGINT/SIGTERM 或到 `--timeout-ms` 时关闭并退出。
- 两个命令的新 flag（`--decision`、`--port`）登记进 `KNOWN_OPTIONS`；退出码沿用 0 成功、2 被拒绝、1 契约或用法错误。

## Capabilities

- `design-pipeline`：ADDED `web 路线可脚手架并本地预览`。

## Reuse

- `frontend-stack-core.cjs` 的 `DECISION_SCHEMA` 与决策形状（不重复解析 registry）；`film-project-core.cjs`
  `scaffoldFilm` 的写入与覆盖语义；`workflows/shared.cjs` 的 `cliCommand`/`shellPath`；`cli-core.cjs` 的
  `COMMANDS` 表、`contained`。不新增 gate、receipt、schema 或 policy digest。

## Not In Scope

- `component-manifest.json` 与 `data-section` 的生成/校验提示（另一缺口）；ui 多屏流程（#214）；开发服务器热更新
  （框架工程先 `npm run build`，再用 `web preview --path dist` 预览构建产物）；Python 的 reflex 栈。
