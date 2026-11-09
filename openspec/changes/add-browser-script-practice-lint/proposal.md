## Why

本仓库的取证、评测与适配器脚本驱动 Playwright / Puppeteer，但没有任何检查约束写法：`scripts/component-eval.cjs` 用 `waitForTimeout(750)` 等画布推进，固定时长在慢机器上漏判。使用方项目（如 KATANAview）的 e2e 修红时反复遇到同类问题：一次性读状态代替可重试断言、按旧文案或结构位置定位、手写等待。currents-dev/playwright-best-practices-skill（MIT，2026-11-09 读取，提交 `0b75b5835a87de1fdd202ba965f3bc5a27738fdf`）总结了这些做法，但整套为通用测试套件设计，多数专题（CI 分片、Electron、GraphQL、POM）本管线用不上。

## What Changes

- 新增静态检查 `skill/tools/browser-practice/lint.cjs`：`fixed-wait`、`one-shot-read`、`brittle-locator`，以及仅 `--forbid-baseline` 开启的 `screenshot-baseline`；退出码 0/2/1。
- 例外必须写理由（`browser-practice-allow <规则>: <理由>`），缺理由本身违规。
- `tests/browser-practice-lint.test.cjs` 对本仓库浏览器脚本跑同一检查，新增违规即红。
- 修掉现有违规：`scripts/component-eval.cjs` 的 `waitForTimeout(750)` 改为带上限的轮询。
- 文档 `skill/references/browser-practices.md` 写明收了什么、没收什么及原因。

## Capabilities

- `design-pipeline`: ADDED `Browser scripts follow retry-safe practices`.

## Reuse

不新增 gate、receipt 或 CLI 命令；是 `skill/tools/` 下的辅助工具加一个仓库测试。

## Impact

仅影响仓库维护测试与一份 reference；证据适配器协议与回执不变。上游许可证 MIT 与 AGPL-3.0 兼容，只取思路，检测代码原创，声明见 `THIRD_PARTY_NOTICES.md`。
