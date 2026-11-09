## Decisions

1. **新文件 `skill/scripts/web-project-core.cjs`**：`scaffoldWeb(dir, decision, options)` 与 `startPreview(root, options)`。
   不改 `frontend-stack-core.cjs`（决策仍只做决策）。`cli-core.cjs` 只加 `web` 命令项、帮助行和两个 flag。
2. **只吃已有决策**：`--decision` 读 `design-pipeline.frontend-stack-decision.v1`；schema 不符是契约错误（exit 1），
   `status: blocked` 拒绝写文件（exit 2，`BLOCKED`），`framework` 为 `reflex`（Python）不支持（exit 1）。
3. **统一 Vite**：所有框架用 Vite 作构建，`agnostic` 不带框架插件。依赖版本在 core 内一张表里固定（与 film scaffold
   固定 gsap/hyperframes 同理），样式 `tailwindcss`→`tailwindcss`+`@tailwindcss/vite`，`scss`→`sass`，`less`→`less`，
   `postcss-only`→`postcss`。
4. **gate 读的是根 `index.html`**：`index.html` 保留静态外壳，`<main data-section="hero">` 内含框架挂载点 `#app`，
   section 标记因此始终在 `index.html`，不被框架渲染吞掉。
5. **UI 库不在脚手架里安装**：shadcn 一类需要交互式 init，命令列入 `next`，由 agent 在装完依赖后执行。
6. **覆盖语义同 film**：任何将写入的文件已存在且无 `--replace` → `OUTPUT_EXISTS`；`package.json` 已存在则保留其字段并合并脚本与依赖。
7. **预览是静态服务**：只绑 127.0.0.1，拒绝越出服务根的路径与符号链接，目录请求回落 `index.html`，`--port` 缺省随机端口。
   CLI 同步入口里 `web preview` 用 `spawnSync` 起同文件的子进程（`node web-project-core.cjs --serve`）阻塞直到退出，
   地址由子进程写到 stderr；`--timeout-ms` 提供有限运行时间（测试与脚本用）。

## Compatibility

纯新增命令与 flag；无路径或产物形状迁移。
