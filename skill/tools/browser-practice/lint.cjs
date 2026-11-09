#!/usr/bin/env node
"use strict";

// 浏览器脚本做法检查：静态扫描 Playwright / Puppeteer 风格的测试与取证脚本。
// 规则思路取自 currents-dev/playwright-best-practices-skill（MIT，Copyright © 2026 Currents Software Inc.，
// 读取于 2026-11-09，提交 0b75b5835a87de1fdd202ba965f3bc5a27738fdf）的 core/assertions-waiting.md、
// core/locators.md、debugging/flaky-tests.md；检测代码为本仓库原创，未搬运上游文字。
// 上游许可证为 MIT，与本仓库 AGPL-3.0 兼容；MIT 版权声明见 THIRD_PARTY_NOTICES.md。
//
// 只做静态检查，不启动浏览器，不判定视觉验收。
// 例外写法：同一行或上一行写 browser-practice-allow、规则 id、冒号、理由（理由必填，见 references/browser-practices.md）。

const fs = require("node:fs");
const path = require("node:path");

const RULES = {
  "fixed-wait": "固定时长等待（waitForTimeout）会在慢机器上漏判、在快机器上白等；改为等待具体条件（可重试断言、waitForFunction、waitForResponse）。",
  "one-shot-read": "把一次性读到的状态放进 expect(...)（isVisible/textContent/getAttribute/inputValue/count/evaluate 等）不会重试，读到过渡态就误报；改用 await expect(locator).toXxx() 或 expect.poll()。",
  "brittle-locator": "按结构位置或 XPath 定位（nth-child、nth-of-type、xpath、// 开头）在布局改动时失效；改用 getByRole / getByLabel / getByText / getByTestId。",
  "screenshot-baseline": "截图基线断言（toHaveScreenshot / toMatchSnapshot）把视觉验收绑进测试；仅在 forbidBaseline 开启时报告，是否允许由项目规则决定。",
};

const ONE_SHOT = /\bexpect\(\s*await\s+[^;\n]*?\.(isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|textContent|innerText|innerHTML|inputValue|getAttribute|count|evaluate|evaluateAll|\$eval|\$\$eval)\s*\(/;
const FIXED_WAIT = /\.waitForTimeout\s*\(/;
const BROWSER_FILE = /\b(page|browser|context)\.(goto|locator|evaluate|click|screenshot|newPage)\b|require\(["'](playwright|puppeteer)|from ["']@?playwright|\bchromium\b/;
const LOCATOR_CALL = /\.(?:locator|\$|\$\$|waitForSelector|click|fill)\(\s*(["'`])((?:\.|(?!\1).)*)\1/g;
const BASELINE = /\.(toHaveScreenshot|toMatchSnapshot)\s*\(/;
const ALLOW = /browser-practice-allow\s+([a-z-]+)\s*:\s*(\S.*)$/;

function isBrittleSelector(selector) {
  return /:nth-(child|of-type|last-child)\b/.test(selector) || /^\s*xpath=/.test(selector) || /^\s*\/\//.test(selector);
}

// 返回 [{ rule, line, text }]；text 为命中行去首尾空白。
function lintSource(source, options = {}) {
  const lines = source.split(/\r?\n/);
  const allowed = (index, rule) => {
    for (const probe of [index, index - 1]) {
      const match = probe >= 0 && lines[probe].match(ALLOW);
      if (match && match[1] === rule) return true;
    }
    return false;
  };
  const findings = [];
  const add = (rule, index) => { if (!allowed(index, rule)) findings.push({ rule, line: index + 1, text: lines[index].trim().slice(0, 160) }); };
  lines.forEach((line, index) => {
    const code = line;
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    if (FIXED_WAIT.test(code)) add("fixed-wait", index);
    if (ONE_SHOT.test(code)) add("one-shot-read", index);
    let match;
    LOCATOR_CALL.lastIndex = 0;
    while ((match = LOCATOR_CALL.exec(code))) { if (isBrittleSelector(match[2])) { add("brittle-locator", index); break; } }
    if (options.forbidBaseline && BASELINE.test(code)) add("screenshot-baseline", index);
  });
  return findings;
}

// 缺理由或未知规则的 allow 注释本身算违规，避免用空注释绕过。
function lintAllowComments(source) {
  const problems = [];
  source.split(/\r?\n/).forEach((line, index) => {
    const marker = line.match(/browser-practice-allow\s+([^\s:]*)\s*:?\s*(.*)$/);
    if (!marker) return;
    if (!RULES[marker[1]]) problems.push({ rule: "allow-invalid", line: index + 1, text: `未知规则 ${marker[1] || "(空)"}` });
    else if (!/\S/.test(marker[2])) problems.push({ rule: "allow-invalid", line: index + 1, text: `allow ${marker[1]} 缺理由` });
  });
  return problems;
}

const SOURCE_EXT = /\.(cjs|mjs|js|ts)$/;
const SKIP_DIR = new Set(["node_modules", ".git", "vendor", ".design-pipeline", "fixtures"]);

function collectFiles(root) {
  const out = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) { if (!SKIP_DIR.has(entry.name)) visit(path.join(directory, entry.name)); }
      else if (SOURCE_EXT.test(entry.name)) out.push(path.join(directory, entry.name));
    }
  };
  const stat = fs.statSync(root);
  if (stat.isDirectory()) visit(root); else out.push(root);
  return out;
}

function lintPaths(paths, options = {}) {
  const results = [];
  for (const target of paths) {
    for (const file of collectFiles(target)) {
      const source = fs.readFileSync(file, "utf8");
      const findings = [...lintSource(source, options), ...lintAllowComments(source)];
      for (const finding of findings) results.push({ file, ...finding });
    }
  }
  return results;
}

function main(argv) {
  const forbidBaseline = argv.includes("--forbid-baseline");
  const json = argv.includes("--json");
  const paths = argv.filter((arg) => !arg.startsWith("--"));
  if (!paths.length) { process.stderr.write("用法: node lint.cjs <文件或目录>... [--json] [--forbid-baseline]\n"); return 1; }
  const results = lintPaths(paths, { forbidBaseline });
  if (json) process.stdout.write(`${JSON.stringify({ schema: "design-pipeline.browser-practice-lint.v1", ok: results.length === 0, findings: results })}\n`);
  else for (const r of results) process.stdout.write(`${r.file}:${r.line} [${r.rule}] ${r.text}\n  ${RULES[r.rule] || ""}\n`);
  return results.length ? 2 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { RULES, lintSource, lintAllowComments, lintPaths };
