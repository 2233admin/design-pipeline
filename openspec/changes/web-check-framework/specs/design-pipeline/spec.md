## ADDED Requirements

### Requirement: web check 披露并运行适用的前端检查

`web check` SHALL 按登记表披露每项检查的适用性并只运行适用且无需批准的检查，发现使用统一形状，退出码 0 通过、2 有 error 发现、1 契约或用法错误。检查器 SHALL 通过已知 bug 语料库的回归证明。

#### Scenario: 披露不运行

- **WHEN** 运行 `web check --list`
- **THEN** 输出 SHALL 列出每项检查的 `status`（适用、跳过并附原因、需批准并附命令），且不启动任何服务或浏览器

#### Scenario: 运行适用检查

- **WHEN** 运行 `web check --root <dir>` 且页面有 console 错误
- **THEN** SHALL 报 `page-load` 的 error 发现并带 `fix`，退出 2；页面干净时 SHALL 退出 0

#### Scenario: 需批准的工具只披露

- **WHEN** 项目含 React 且登记了 `react-doctor`
- **THEN** 它 SHALL 以 `needs-approval` 披露并给出命令，SHALL NOT 被执行

#### Scenario: 语料库

- **WHEN** 检查器代码改动
- **THEN** 每个已知 bug 页面 SHALL 仍被其对应检查以预期 code 报出，干净页面 SHALL 零发现

#### Scenario: 缓存与快速模式

- **WHEN** 以 `--fast` 重复运行且页面文件未改
- **THEN** 浏览器层 SHALL 复用缓存结果而不重跑；页面或检查器版本变化时 SHALL 失效重跑

#### Scenario: 用法错误

- **WHEN** `--only` 指向未登记的检查 id
- **THEN** SHALL 以 `UNKNOWN_CHECK` 退出 1 并列出可用 id
