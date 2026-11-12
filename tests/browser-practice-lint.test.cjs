"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { lintSource, lintAllowComments, lintPaths } = require("../skill/tools/browser-practice/lint.cjs");

const root = path.resolve(__dirname, "..");
const rules = (source, options) => lintSource(source, options).map((f) => f.rule);

test("固定等待被拒，条件等待放行", () => {
  assert.deepEqual(rules("await page.waitForTimeout(500);"), ["fixed-wait"]);
  assert.deepEqual(rules("await page.waitForFunction(() => window.__ready === true);"), []);
});

test("一次性读状态放进 expect 被拒，可重试断言放行", () => {
  assert.deepEqual(rules("expect(await page.locator('#a').isVisible()).toBe(true);"), ["one-shot-read"]);
  assert.deepEqual(rules("expect(await page.evaluate(() => getComputedStyle(el).opacity)).toBe('1');"), ["one-shot-read"]);
  assert.deepEqual(rules("await expect(page.getByRole('button')).toBeVisible();"), []);
  assert.deepEqual(rules("await expect.poll(() => page.locator('li').count()).toBe(3);"), []);
});

test("结构位置与 XPath 定位被拒，语义定位放行", () => {
  assert.deepEqual(rules("page.locator('ul > li:nth-child(2)')"), ["brittle-locator"]);
  assert.deepEqual(rules("page.locator('xpath=//div')"), ["brittle-locator"]);
  assert.deepEqual(rules("page.locator('//div[@id=\"a\"]')"), ["brittle-locator"]);
  assert.deepEqual(rules("page.getByRole('button', { name: '提交' })"), []);
  assert.deepEqual(rules("page.locator('#panel')"), []);
});

test("截图基线只在 forbidBaseline 开启时报告", () => {
  const source = "await expect(page).toHaveScreenshot('a.png');";
  assert.deepEqual(rules(source), []);
  assert.deepEqual(rules(source, { forbidBaseline: true }), ["screenshot-baseline"]);
});

test("注释行不报；带理由的 allow 放行；缺理由或未知规则本身违规", () => {
  assert.deepEqual(rules("// await page.waitForTimeout(1)"), []);
  assert.deepEqual(rules("// browser-practice-allow fixed-wait: 录屏需要固定节奏\nawait page.waitForTimeout(1500);"), []);
  assert.deepEqual(rules("await page.waitForTimeout(9); // browser-practice-allow fixed-wait: 同行理由"), []);
  assert.deepEqual(lintAllowComments("// browser-practice-allow fixed-wait:").map((f) => f.rule), ["allow-invalid"]);
  assert.deepEqual(lintAllowComments("// browser-practice-allow nope: x").map((f) => f.rule), ["allow-invalid"]);
  assert.deepEqual(rules("// browser-practice-allow brittle-locator: x\nawait page.waitForTimeout(1);"), ["fixed-wait"]);
});

test("本仓库的浏览器脚本自身遵守这些做法", () => {
  const targets = ["scripts", "tools", "evals", "skill/scripts", "skill/tools", "skill/adapters"].map((p) => path.join(root, p));
  const findings = lintPaths(targets);
  assert.deepEqual(findings.map((f) => `${path.relative(root, f.file)}:${f.line} ${f.rule}`), []);
});

test("CLI 命中返回退出码 2，干净返回 0", () => {
  const cli = path.join(root, "skill/tools/browser-practice/lint.cjs");
  const dir = require("node:fs").mkdtempSync(path.join(require("node:os").tmpdir(), "bp-lint-"));
  const bad = path.join(dir, "bad.cjs"), good = path.join(dir, "good.cjs");
  require("node:fs").writeFileSync(bad, "await page.waitForTimeout(100);\n");
  require("node:fs").writeFileSync(good, "await expect(page.getByText('a')).toBeVisible();\n");
  assert.equal(spawnSync(process.execPath, [cli, bad, "--json"]).status, 2);
  assert.equal(spawnSync(process.execPath, [cli, good]).status, 0);
});

test("跨行写法同样命中，并报表达式起始行", () => {
  const one = lintSource("expect(\n  await page.locator('#s').isVisible()\n).toBe(true);");
  assert.deepEqual(one.map((f) => [f.rule, f.line]), [["one-shot-read", 1]]);
  const loc = lintSource("const a = 1;\npage.locator(\n  'li:nth-child(2)'\n);");
  assert.deepEqual(loc.map((f) => [f.rule, f.line]), [["brittle-locator", 2]]);
});

test("注释与字符串里的文字不算调用", () => {
  assert.deepEqual(rules("await page.waitForFunction(() => 1); // 替代 page.waitForTimeout(500)"), []);
  assert.deepEqual(rules("/*\n page.waitForTimeout(5)\n*/\nconst t = 'x.waitForTimeout(1)';"), []);
  assert.deepEqual(rules("const m = \"expect(await a.isVisible())\";"), []);
  assert.deepEqual(rules("// page.locator('li:nth-child(2)')"), []);
});
