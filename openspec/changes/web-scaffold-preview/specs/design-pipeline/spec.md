## ADDED Requirements

### Requirement: web 路线可脚手架并本地预览

`web scaffold` SHALL 从 frontend-stack 决策写出可安装、可构建的最小工程，`web preview` SHALL 在本机起静态服务并在退出时关闭。两者 SHALL 沿用既有退出码：0 成功，2 被拒绝，1 契约或用法错误。

#### Scenario: 按决策写出工程

- **WHEN** 对 ready 的 react + tailwindcss 决策运行 `web scaffold --output <dir> --decision <file>`
- **THEN** 输出目录 SHALL 含 `package.json`（固定版本的 react、vite、tailwindcss 依赖）、`index.html`、`src/` 入口、空的 `component-manifest.json` 与 `WEB.md`，`index.html` SHALL 含 `data-section` 标记

#### Scenario: 拒绝覆盖

- **WHEN** 输出目录已有 `index.html` 且未传 `--replace`
- **THEN** 命令 SHALL 以 `OUTPUT_EXISTS` 退出 1 且不写任何文件；传 `--replace` 时 SHALL 覆盖并保留既有 `package.json` 的其他字段

#### Scenario: 被阻塞或不支持的决策

- **WHEN** 决策 `status` 为 `blocked`
- **THEN** 命令 SHALL 退出 2 且不写文件
- **WHEN** 决策框架为 `reflex` 或决策不符合 schema
- **THEN** 命令 SHALL 退出 1 并说明原因

#### Scenario: 预览静态服务

- **WHEN** 运行 `web preview --root <dir>` 且 `<dir>/index.html` 存在
- **THEN** SHALL 在 127.0.0.1 监听并在 stderr 打印地址，GET `/` SHALL 返回 `index.html`；收到终止信号或到达 `--timeout-ms` 时 SHALL 关闭服务并退出 0

#### Scenario: 预览拒绝越界与缺失入口

- **WHEN** 请求路径含 `..` 或指向服务根之外
- **THEN** 服务 SHALL 返回 403 或 404 而不读取该文件
- **WHEN** 服务根没有 `index.html`
- **THEN** 命令 SHALL 以 `INPUT_MISSING` 退出 1
