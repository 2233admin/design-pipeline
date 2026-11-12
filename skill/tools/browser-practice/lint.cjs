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

const ONE_SHOT = /\bexpect\(\s*await\s+[^;]{0,300}?\.(isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|textContent|innerText|innerHTML|inputValue|getAttribute|count|evaluate|evaluateAll|\$eval|\$\$eval)\s*\(/g;
const FIXED_WAIT = /\.waitForTimeout\s*\(/g;
const LOCATOR_CALL = /\.(?:locator|\$|\$\$|waitForSelector|click|fill)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
const BASELINE = /\.(toHaveScreenshot|toMatchSnapshot)\s*\(/g;
const ALLOW = /browser-practice-allow\s+([a-z-]+)\s*:\s*(\S.*)$/;

function isBrittleSelector(selector) {
  return /:nth-(child|of-type|last-child)\b/.test(selector) || /^\s*xpath=/.test(selector) || /^\s*\/\//.test(selector);
}

// 把注释换成空格（保留换行，行号不变）。keepStrings 为 false 时字符串内容也换成空格，只留引号。
function mask(source, keepStrings) {
  let out = "", i = 0;
  const blank = (text) => text.replace(/[^\n]/g, " ");
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//") { const end = source.indexOf("\n", i); const stop = end < 0 ? source.length : end; out += blank(source.slice(i, stop)); i = stop; }
    else if (two === "/*") { const end = source.indexOf("*/", i + 2); const stop = end < 0 ? source.length : end + 2; out += blank(source.slice(i, stop)); i = stop; }
    else if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
      const quote = source[i]; let j = i + 1;
      while (j < source.length && source[j] !== quote && (quote === "`" || source[j] !== "\n")) j += source[j] === "\\" ? 2 : 1;
      const body = source.slice(i + 1, j);
      out += quote + (keepStrings ? body : blank(body)) + (source[j] === quote ? quote : "");
      i = j + 1;
    } else { out += source[i]; i += 1; }
  }
  return out.slice(0, source.length);
}

// 返回 [{ rule, line, text }]；可跨行的表达式取起始行，text 为该行去首尾空白。
function lintSource(source, options = {}) {
  const lines = source.split(/\r?\n/);
  const noStrings = mask(source, false);
  const withStrings = mask(source, true);
  const allowed = (index, rule) => {
    for (const probe of [index, index - 1]) {
      const match = probe >= 0 && lines[probe].match(ALLOW);
      if (match && match[1] === rule) return true;
    }
    return false;
  };
  const lineOf = (text, offset) => text.slice(0, offset).split("\n").length - 1;
  const findings = [];
  const scan = (text, pattern, rule, accept = () => true) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (!accept(match)) continue;
      const index = lineOf(text, match.index);
      if (!allowed(index, rule)) findings.push({ rule, line: index + 1, text: (lines[index] || "").trim().slice(0, 160) });
    }
  };
  scan(noStrings, FIXED_WAIT, "fixed-wait");
  scan(noStrings, ONE_SHOT, "one-shot-read");
  scan(withStrings, LOCATOR_CALL, "brittle-locator", (match) => isBrittleSelector(match[2]));
  if (options.forbidBaseline) scan(noStrings, BASELINE, "screenshot-baseline");
  return findings.sort((x, y) => x.line - y.line);
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
