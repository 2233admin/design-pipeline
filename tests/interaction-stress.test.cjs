"use strict";

// The long-content stress pass of the `verify interaction` audit probe: the `stress` contract
// without a browser, the summary against hand-built measurements, native completion, and the real
// pass on the fragile and robust fixtures at two viewports, in process and through the CLI.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const audit = require("../skill/scripts/interaction-audit.cjs");
const stress = require("../skill/scripts/interaction-stress.cjs");
const { APPLICABLE_STATES } = require("../skill/scripts/gate-core.cjs");
const { SCHEMA, auditResultFailure, evaluateProbeFile, validateProbeFile } = require("../skill/scripts/interaction-core.cjs");
const { captureInteraction } = require("../skill/scripts/interaction-capture-core.cjs");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { decide, initState, readState } = require("../skill/scripts/workflow-core.cjs");
const { toComponents } = require("./helpers/web-flow.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const fixtures = path.join(__dirname, "fixtures", "ui-stress");
const FONT = path.join(repoRoot, "skill/tools/art-motion/fonts/Inter-var.woff");
const VIEWPORTS = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];

function browserTools() {
  try {
    resolvePuppeteer(repoRoot, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [repoRoot] });
    return { chrome: resolveBrowser(), puppeteerModule, skip: false };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `no browser for the stress pass (${error.message})` };
  }
}
const tools = browserTools();

const clone = (value) => JSON.parse(JSON.stringify(value));
const probeDoc = (id, ...probes) => ({ schema: SCHEMA, id, url: "index.html", probes });
const auditProbe = (extra = {}) => ({ id: "page-audit", kind: "audit", viewports: clone(VIEWPORTS), thresholds: { fonts: ["Inter"] }, stress: {}, ...extra });
function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-stress-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function stage(t, name, doc, { web = false } = {}) {
  const dir = tmp(t);
  fs.mkdirSync(path.join(dir, "fonts"));
  fs.copyFileSync(FONT, path.join(dir, "fonts/Inter-var.woff"));
  fs.copyFileSync(path.join(fixtures, `${name}.html`), path.join(dir, "index.html"));
  if (web) {
    initState(dir, { deliverable: "web", tier: "quick" });
    toComponents(dir);
    decide(dir, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
    fs.writeFileSync(path.join(dir, "component-manifest.json"), JSON.stringify({ fromScratch: true, entries: [] }));
  }
  fs.writeFileSync(path.join(dir, "interaction.json"), `${JSON.stringify(doc, null, 2)}\n`);
  return dir;
}

async function measure(t, name, probe) {
  const doc = probeDoc(`stress-${name}`, probe);
  const dir = stage(t, name, doc);
  const recorded = await captureInteraction(path.join(dir, "interaction.json"), { doc: validateProbeFile(doc), chrome: tools.chrome, puppeteerModule: tools.puppeteerModule });
  return { row: evaluateProbeFile(doc, recorded, { project: dir }).probes[0], recorded };
}

function run(args) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], { encoding: "utf8", windowsHide: true, timeout: 120000 });
  let output = null;
  try { output = JSON.parse(child.stdout); } catch { output = null; }
  return { status: child.status, output, text: child.stdout + child.stderr };
}
const verify = (dir) => run(["verify", "interaction", "--root", dir, "--project-root", dir, "--probe", "interaction.json", "--chrome", tools.chrome, "--puppeteer-module", tools.puppeteerModule]);

test("the stress pass is evidence for the gate's existing long-content and overflow states, read through the audit's overflow codes", () => {
  assert.deepEqual([...stress.STRESS_STATES], ["long-content", "overflow"]);
  assert.ok(stress.STRESS_STATES.every((state) => APPLICABLE_STATES.includes(state)), "no new state id");
  assert.ok(stress.STRESS_CODES.every((code) => audit.AUDIT_CODES.includes(code)), "no new audit code");
  assert.equal(stress.STRESS_DEFAULTS.textScale, 2.5);
  assert.match(stress.UNBROKEN, /^[A-Za-z]{50,}$/, "the unbroken word has no break opportunity");
});

test("the stress field is validated with the audit probe before any browser starts", () => {
  assert.deepEqual(audit.validateAuditProbe(auditProbe()), []);
  assert.deepEqual(audit.validateAuditProbe(auditProbe({ stress: { textScale: 1.4, scope: [".orders", "main li"] } })), []);
  for (const [label, value, pattern] of [
    ["boolean", true, /stress must be an object/],
    ["unknown key", { exclude: [".logo"] }, /stress has unsupported properties: exclude; allowed: textScale, scope/],
    ["scale of 1", { textScale: 1 }, /stress\.textScale must be a number above 1 and at most 10/],
    ["scale above the cap", { textScale: 11 }, /stress\.textScale must be a number above 1/],
    ["string scale", { textScale: "2.5" }, /stress\.textScale must be a number/],
    ["empty scope", { scope: [] }, /stress\.scope must be a non-empty list of selectors/],
    ["blank scope selector", { scope: [" "] }, /stress\.scope\[0\] must be a non-empty selector/],
  ]) {
    assert.ok(audit.validateAuditProbe(auditProbe({ stress: value })).some((error) => pattern.test(error)), label);
    assert.throws(() => validateProbeFile(probeDoc("bad", auditProbe({ stress: value }))), pattern, label);
  }
  assert.equal(stress.stressOptions({ kind: "audit" }), null, "no stress declared, no stress pass");
  assert.deepEqual(stress.stressOptions(auditProbe()), { textScale: 2.5, scope: ["body"], unbroken: stress.UNBROKEN, hugeNumber: stress.HUGE_NUMBER });
  assert.deepEqual(audit.auditOptions(auditProbe()).declare.contentBoxes, [], "the audit options are unchanged by stress");
});

// Hand-built measurements: every audit check, with the given overflow items.
const check = (extra = {}) => ({ declared: true, checked: 3, failedCount: 0, indeterminateCount: 0, failed: [], indeterminate: [], ...extra });
const measurement = (items = {}) => ({
  elements: 10,
  checks: Object.fromEntries(audit.AUDIT_CODES.map((code) => {
    const failed = items[code] || [];
    const optional = audit.OPTIONAL_CODES.includes(code);
    return [code, optional ? check({ declared: false, checked: 0 }) : check({ failed, failedCount: failed.length })];
  })),
});
const item = (code, selector, extra = {}) => ({ code, selector, expected: "inside", actual: "right text clipped 40px", message: "text is cut off by an overflow: hidden or clip container", fix: "Let the text wrap.", ...extra });
const applied = (extra = {}) => ({ contractErrors: [], textScale: 2.5, changed: 4, lengthened: 2, unbroken: 1, numbers: 1, ...extra });

test("the summary reports only what the stress newly breaks, passes reachable truncation and fails the row", (t) => {
  const project = tmp(t);
  const clip = "audit.content-clipping";
  const baseline = measurement({ [clip]: [item(clip, "#already")] });
  const stressed = measurement({ [clip]: [item(clip, "#already"), item(clip, "#name"), item(clip, "#role", { related: "#role" }), item(clip, "#titled")], "audit.horizontal-overflow": [item("audit.horizontal-overflow", "html", { message: "the page scrolls sideways" })] });
  const viewport = { viewport: VIEWPORTS[0], requests: [], result: baseline, stress: { applied: applied(), result: stressed, truncation: [
    { selector: "#name", truncation: false, wayBack: false },
    { selector: "#role", truncation: true, wayBack: false },
    { selector: "#titled", truncation: true, wayBack: true },
  ] } };
  const summary = audit.summarizeAudit("page-audit", [viewport], project, [], { stress: true });
  assert.equal(summary.status, "failed");
  const findings = summary.findings.filter((finding) => finding.pass === "stress");
  assert.deepEqual(findings.map((finding) => [finding.code, finding.selector]), [["audit.horizontal-overflow", "html"], [clip, "#name"], [clip, "#role"]], "#already stays with the normal audit and #titled can be read in full");
  assert.ok(findings.every((finding) => finding.severity === "error" && finding.viewport === "1280x800" && finding.message.startsWith("1280x800 with 2.5x text: ") && finding.fix.length > 20));
  assert.match(findings[2].message, /truncated with no way to read the full value/);
  assert.match(findings[2].fix, /title attribute with the full text/);
  assert.match(findings[1].fix, /^Let the text wrap\. Real content is longer than the mock-up/);
  const coverage = summary.coverage[0].stress;
  assert.deepEqual(coverage.states, ["long-content", "overflow"]);
  assert.deepEqual(coverage.checks.map((entry) => [entry.code, entry.status]), [["audit.horizontal-overflow", "failed"], ["audit.viewport-bounds", "passed"], [clip, "failed"], ["audit.content-overflow", "not-declared"]]);
  const clipping = coverage.checks[2];
  assert.deepEqual([clipping.failed, clipping.truncatedWithWayBack, clipping.alreadyReported], [2, 1, 1]);

  // Without the stress declaration the same capture summarizes exactly as before.
  const plain = audit.summarizeAudit("page-audit", [viewport], project, []);
  assert.equal(plain.coverage[0].stress, undefined);
  assert.equal(plain.findings.some((finding) => finding.pass), false);
});

test("a stress pass with nothing to lengthen is not-applicable, a missing record fails and a page-rejected scope is a contract error", (t) => {
  const project = tmp(t);
  const empty = audit.summarizeAudit("page-audit", [{ viewport: VIEWPORTS[0], requests: [], result: measurement(), stress: { applied: applied({ changed: 0, lengthened: 0, unbroken: 0, numbers: 0 }) } }], project, [], { stress: true });
  assert.equal(empty.status, "passed");
  assert.equal(empty.coverage[0].stress.status, "not-applicable");
  assert.match(empty.coverage[0].stress.hint, /no visible text to lengthen/);
  assert.throws(() => audit.summarizeAudit("page-audit", [{ viewport: VIEWPORTS[0], requests: [], result: measurement() }], project, [], { stress: true }), /declares stress but has no stress measurement/);
  const rejected = audit.summarizeAudit("page-audit", [{ viewport: VIEWPORTS[0], requests: [], result: measurement(), stress: { applied: applied({ contractErrors: ["stress.scope[0] \".nope\" matches no element on the page"], changed: 0 }) } }], project, [], { stress: true });
  assert.deepEqual(rejected.contractErrors, ["stress.scope[0] \".nope\" matches no element on the page"]);
  assert.equal(rejected.status, "failed");
});

test("native completion needs a settled stress record at every viewport when the probe declares one", () => {
  const probe = validateProbeFile(probeDoc("done", auditProbe())).probes[0];
  const checks = audit.AUDIT_CODES.map((code) => ({ code, status: audit.OPTIONAL_CODES.includes(code) ? "not-declared" : "passed", checked: audit.OPTIONAL_CODES.includes(code) ? 0 : 3 }));
  const stressed = { textScale: 2.5, changedTexts: 4, states: ["long-content", "overflow"], status: "passed", checks: stress.STRESS_CODES.map((code) => ({ code, status: code === "audit.content-overflow" ? "not-declared" : "passed", checked: code === "audit.content-overflow" ? 0 : 2 })) };
  const row = (entry) => ({ id: "page-audit", kind: "audit", status: "passed", findings: [], coverage: VIEWPORTS.map((viewport) => ({ viewport, checks, ...entry })) });
  assert.equal(auditResultFailure(probe, row({ stress: stressed })), null);
  assert.match(auditResultFailure(probe, row({})), /1280x800 has no passing stress coverage/);
  assert.match(auditResultFailure(probe, row({ stress: { ...stressed, status: "failed" } })), /has no passing stress coverage/);
  assert.match(auditResultFailure(probe, row({ stress: { ...stressed, changedTexts: 0 } })), /lengthened no text/);
  assert.match(auditResultFailure(probe, row({ stress: { ...stressed, checks: stressed.checks.slice(1) } })), /does not cover every stress check/);
  const plain = validateProbeFile(probeDoc("done", auditProbe({ stress: undefined }))).probes[0];
  assert.equal(auditResultFailure(plain, row({})), null, "a probe without stress is completed as before");
});

test("the fragile page breaks under 2.5x text at both viewports; the robust page passes", { skip: tools.skip }, async (t) => {
  const fragile = await measure(t, "fragile", auditProbe());
  assert.equal(fragile.row.status, "failed");
  assert.deepEqual(fragile.row.findings.filter((finding) => !finding.pass), [], "the normal audit passes the mock-up copy");
  for (const [index, entry] of fragile.row.coverage.entries()) {
    const where = `${VIEWPORTS[index].width}x${VIEWPORTS[index].height}`;
    assert.deepEqual(entry.checks.filter((c) => c.status === "failed"), [], `${where}: normal audit clean`);
    assert.equal(entry.stress.status, "failed");
    assert.deepEqual([entry.stress.textScale, entry.stress.lengthened, entry.stress.unbroken, entry.stress.numbers], [2.5, 9, 3, 1]);
    const found = fragile.row.findings.filter((finding) => finding.viewport === where).map((finding) => [finding.code, finding.selector, /truncated/.test(finding.message)]);
    const people = "body > main:nth-of-type(1) > ul:nth-of-type(1)";
    assert.deepEqual(found, [
      ["audit.horizontal-overflow", "html", false],
      ["audit.viewport-bounds", "#orders", false],
      ["audit.content-clipping", `${people} > li:nth-of-type(1) > span:nth-of-type(2)`, false],
      ["audit.content-clipping", `${people} > li:nth-of-type(1) > span:nth-of-type(3)`, true],
      ["audit.content-clipping", `${people} > li:nth-of-type(2) > span:nth-of-type(2)`, false],
      ["audit.content-clipping", `${people} > li:nth-of-type(2) > span:nth-of-type(3)`, true],
      // Two clamped lines hold the 2.5x note at 640px; at 390px they cut it off.
      ...(index === 1 ? [["audit.content-clipping", "body > main:nth-of-type(1) > p:nth-of-type(1)", true]] : []),
      ["audit.content-clipping", "body > main:nth-of-type(1) > button:nth-of-type(1)", false],
    ], where);
  }
  // The pass rewrites only the loaded page: the next viewport starts from the file's own text.
  assert.equal(fs.readFileSync(new URL(fragile.recorded.url), "utf8").includes(stress.UNBROKEN), false, "the page file is never touched");

  const robust = await measure(t, "robust", auditProbe());
  assert.equal(robust.row.status, "passed", JSON.stringify(robust.row.findings));
  for (const [index, entry] of robust.row.coverage.entries()) {
    assert.equal(entry.stress.status, "passed");
    const clipping = entry.stress.checks.find((c) => c.code === "audit.content-clipping");
    assert.equal(clipping.truncatedWithWayBack, index === 0 ? 2 : 3, "the titled ellipses, and at 390px the clamped link, are reachable truncations");
  }
});

test("stress.scope limits the rewrite to the declared regions; textScale changes the length", { skip: tools.skip }, async (t) => {
  const table = await measure(t, "fragile", auditProbe({ stress: { scope: ["table"] } }));
  for (const entry of table.row.coverage) assert.deepEqual([entry.stress.lengthened, entry.stress.unbroken, entry.stress.numbers], [3, 2, 1], "headers, cells and the total only");
  const narrow = table.row.findings.filter((finding) => finding.viewport === "390x844").map((finding) => finding.code);
  assert.deepEqual(narrow, ["audit.horizontal-overflow", "audit.viewport-bounds"], "the people list is untouched");
  const mild = await measure(t, "robust", auditProbe({ stress: { textScale: 1.4 } }));
  assert.equal(mild.row.status, "passed");
  assert.equal(mild.row.coverage[0].stress.textScale, 1.4);
});

test("verify interaction exits 2 on the fragile page with stress findings in the gate, 0 on the robust page and 1 on a scope the page lacks", { skip: tools.skip }, (t) => {
  const fragile = stage(t, "fragile", probeDoc("stress-fragile", auditProbe()), { web: true });
  const failed = verify(fragile);
  assert.equal(failed.status, 2, failed.text);
  const gate = readState(fragile).gates.interaction;
  assert.equal(gate.status, "failed");
  assert.equal(gate.findings.length, 15);
  assert.ok(gate.findings.every((finding) => / with 2\.5x text: /.test(finding.message) && finding.fix.length > 0 && typeof finding.viewport === "string"), "the gate record names the stress in each message and keeps the fix");
  assert.ok(failed.output.findings.every((finding) => finding.pass === "stress"), "the report marks each finding as a stress finding");

  const robust = stage(t, "robust", probeDoc("stress-robust", auditProbe()), { web: true });
  const passed = verify(robust);
  assert.equal(passed.status, 0, passed.text);
  const evidence = JSON.parse(fs.readFileSync(path.join(robust, "evidence/interaction.json"), "utf8"));
  assert.deepEqual(evidence.probes[0].coverage.map((entry) => [entry.stress.status, entry.stress.states.join()]), [["passed", "long-content,overflow"], ["passed", "long-content,overflow"]]);
  assert.equal(readState(robust).gates.interaction.status, "passed");

  const missing = stage(t, "robust", probeDoc("stress-missing", auditProbe({ stress: { scope: [".no-such-region"] } })), { web: true });
  const rejected = verify(missing);
  assert.equal(rejected.status, 1, rejected.text);
  assert.equal(rejected.output.error.code, "AUDIT_SELECTOR_INVALID");
  assert.match(rejected.output.error.message, /stress\.scope\[0\] "\.no-such-region" matches no element on the page/);
  assert.equal(readState(missing).gates?.interaction, undefined, "no gate is recorded");
});
