## Decisions

1. **登记表即框架**：`skill/scripts/web-check-core.cjs` 导出 `CHECKS`，每项 `{ id, layer, applies(project), approval, run }`。
   `layer` 为 `static`（毫秒，不开浏览器）、`browser`（秒，按页面哈希缓存）、`full`（全部页面全部断点，CI 用）。
   新增检查只是往表里加一项，`--list` 自动披露。
2. **披露先于运行**：`--list` 与运行结果都带每项的 `status`：`ran`、`skipped`（附原因，如"项目没有 dist"）、
   `needs-approval`（附手动命令）。不静默跳过。
3. **发现形状统一**：`{ check, severity, file, selector?, message, fix }`；任何 `severity: error` 使整体退出 2。
4. **语料库先于检查**：`tests/fixtures/web-check/bugs/<code>/index.html` 每类一个坏页面，`tests/web-check.test.cjs`
   断言对应检查必报且报出预期的 code；另有一个干净页面必须零发现。检查器改动必须仍过全部语料。
5. **架构规则是静态层**：只读文件，不开浏览器。规则集写在 core 内的表里，每条规则有 id 与修法。
6. **缓存**：键为页面文件哈希加检查器版本，存在忽略目录 `.design-pipeline/web-check-cache.json`；`--fast` 命中缓存的页面不重跑。
7. **需批准的工具**：`approval: true` 的项永不自动执行，只在输出中给出命令。

## Compatibility

纯新增命令；`web preview` 与 `web scaffold` 不变。
