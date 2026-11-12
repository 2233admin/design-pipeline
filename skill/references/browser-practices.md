# 浏览器脚本做法

写或改 Playwright / Puppeteer 风格的取证、测试、评测脚本时读这页。做法取自
[currents-dev/playwright-best-practices-skill](https://github.com/currents-dev/playwright-best-practices-skill)
（MIT，Copyright © 2026 Currents Software Inc.，读取于 2026-11-09，提交
`0b75b5835a87de1fdd202ba965f3bc5a27738fdf`）；只收下面四条，检测代码原创。

## 自动检查

```bash
node skill/tools/browser-practice/lint.cjs <文件或目录>... [--json] [--forbid-baseline]
```

退出码：0 干净，2 有违规，1 用法错误。`npm test` 里的 `tests/browser-practice-lint.test.cjs` 对
`scripts/ tools/ evals/ skill/scripts/ skill/tools/ skill/adapters/` 跑同一检查，新增违规会让测试变红。

| 规则 id | 拒绝 | 改成 | 为什么 |
| --- | --- | --- | --- |
| `fixed-wait` | `page.waitForTimeout(n)` | `waitForFunction`、`waitForResponse`、可重试断言 | 固定时长在慢机器上漏判，在快机器上白等 |
| `one-shot-read` | `expect(await loc.isVisible())`、`textContent/getAttribute/inputValue/count/evaluate` 等放进 `expect` | `await expect(loc).toBeVisible()`、`expect.poll(...)` | 一次性读不重试，读到过渡态（淡入中的不透明度、尚未渲染的文案）就误报 |
| `brittle-locator` | `:nth-child`、`:nth-of-type`、`xpath=`、`//` 开头 | `getByRole`、`getByLabel`、`getByText`、`getByTestId` | 结构位置在布局改动后失效；用户看到的文案/角色才是契约 |
| `screenshot-baseline` | `toHaveScreenshot`、`toMatchSnapshot`（仅 `--forbid-baseline`） | 断言用户可见的值；画布用像素断言 | 本管线把 Component Conformance 与 Visual Acceptance 分开报告；基线断言把视觉验收绑进测试。是否禁止由项目决定，默认不报 |

## 例外

确需保留时，在同一行或上一行写 `browser-practice-allow <规则 id>: <理由>`（放进 `//` 注释）。
理由必填；缺理由或规则 id 未知，检查本身报 `allow-invalid`。

## 没收的

- `networkidle`：上游不推荐，但本管线证据适配器协议把它写成契约（`web-evidence-adapter.md`），改动要走独立 OpenSpec。
- 睡眠式 `setTimeout` 等待：取证脚本里多数是录屏/逐帧节奏，不是等条件，静态规则分不清，会误报，故不查。
- 定位器优先级里的 CSS 类名链：项目级取舍，无法静态判断，不查。
- Fixtures、POM、CI 分片、网络 mock、Docker/CI 配置、Electron/扩展/GraphQL 等专题：本仓库不维护 Playwright 测试套件，用不上。
- 失败重试与 `trace: on-first-retry`：证据适配器已固定 trace/screenshot 产物，重试策略属使用方项目。
