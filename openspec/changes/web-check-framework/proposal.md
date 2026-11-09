## Why

组件库与排版优化时，前端 bug 大量漏检，检出又慢。仓里已有可用的检查（`page-check` 浏览器检查、`motion-verification`、
`visual-diagnostics`、fixing-accessibility、Vite DevTools 适配器），但没有统一入口：`web preview` 只起服务，
agent 每次要自己想起该用哪个检查、怎么调。检查器本身是否真能抓到 bug 也没有固定的回归证据，修好检查器之后
没有可重复的办法重新验证组件库的架构规则。

## What Changes

- 新增 `web check`：一张**检查登记表**，每项登记 id、适用条件（看项目信号）、调用方式、是否需要用户批准。
  `web check --list` 披露每项的适用性与原因，不运行；`web check` 起 `web preview` 服务并只运行适用且无需批准的检查，
  输出统一的发现（检查 id、位置、严重度、修法）；`--only <id>` 指定；`--fast` 只跑静态层与已改动页面。
- 首批登记：`page-load`（console 错误、未捕获异常、失败请求）、`page-layout`（复用 `page-check`，两个断点）、
  `manifest`（`component-manifest.json` 与 `data-section` 一致）、`architecture`（组件只用 token、不写死色值、
  manifest 覆盖每个组件、无循环依赖）。`react-doctor`、`vite-devtools` 登记为"需批准"，只披露命令，不自动执行。
- 新增**已知 bug 语料库**：每类故障一个故意写坏的最小页面，检查器必须全部抓到；作为回归测试，检查器改动后重新证明。
- 浏览器层结果按页面文件哈希缓存，未改动的页面不重跑。

## Capabilities

- `design-pipeline`：ADDED `web check 披露并运行适用的前端检查`。

## Reuse

- `web-project-core.cjs` 的 `startPreview`；`page-check.cjs`、`motion-verification`、`vite-devtools-adapter.cjs`；
  既有 gate 发现形状与退出码（0 通过、2 有发现、1 契约或用法错误）。不新增 gate、receipt、schema 或 policy digest。

## Not In Scope

- 数学意义上的形式化证明（UI 做不到；以不变量检查代替）；状态机转换表（#344）；自动执行需批准的外部工具
  （先只披露命令，开关等框架稳定后另议）；开发服务器热更新。
