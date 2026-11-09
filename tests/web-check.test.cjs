"use strict";

// 已知 bug 语料库的回归测试（模板）：每个坏页面必须被对应检查以预期 code 报出，干净页面零发现。
// 实现前这里是红的（web-check-core.cjs 还不存在）；拿到 listChecks/runChecks 后逐项补全。

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { listChecks, runChecks } = require("../skill/scripts/web-check-core.cjs");

const fixtures = path.join(__dirname, "fixtures/web-check");
const expected = JSON.parse(fs.readFileSync(path.join(fixtures, "expected.json"), "utf8"));

test("the registry discloses every check with a status and a reason, without running anything", async () => {
  const listed = await listChecks(path.join(fixtures, "clean"));
  for (const id of ["page-load", "page-layout", "manifest", "architecture", "react-doctor", "vite-devtools"]) assert.ok(listed.checks.some((check) => check.id === id), id);
  for (const check of listed.checks) assert.ok(["applicable", "skipped", "needs-approval"].includes(check.status), `${check.id} ${check.status}`);
  assert.equal(listed.checks.find((check) => check.id === "react-doctor").status, "needs-approval");
});

test("a clean page has no findings", async () => {
  const result = await runChecks(path.join(fixtures, "clean"));
  assert.deepEqual(result.findings, []);
  assert.equal(result.status, "passed");
});

for (const [bug, { check, code }] of Object.entries(expected.bugs)) {
  test(`corpus: ${bug} is reported as ${code}`, async () => {
    const result = await runChecks(path.join(fixtures, "bugs", bug), { only: [check] });
    const found = result.findings.find((finding) => finding.code === code);
    assert.ok(found, `${code} not reported; got ${result.findings.map((finding) => finding.code).join(", ") || "nothing"}`);
    assert.equal(found.check, check);
    assert.ok(found.fix, "a finding carries its fix");
    assert.equal(result.status, "failed");
  });
}

test("an unknown --only check id is a usage error that lists the available ids", async () => {
  await assert.rejects(runChecks(path.join(fixtures, "clean"), { only: ["nope"] }), (error) => error.code === "UNKNOWN_CHECK" && /page-load/.test(error.message));
});

test("faults still waiting for a corpus page are listed, so the gap stays visible", () => {
  assert.ok(Array.isArray(expected.pending) && expected.pending.length > 0);
});
