"use strict";

// The audit probe of `verify interaction`: the contract without a browser, the in-page engine on the
// violating, clean and undeclared fixtures at two viewports, the CLI exit codes, the web probe
// stage's audit requirement, and the interaction gate's rendered-dependency lineage.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const audit = require("../skill/scripts/interaction-audit.cjs");
const { SCHEMA, auditResultFailure, evaluateProbeFile, validateProbeFile } = require("../skill/scripts/interaction-core.cjs");
const { captureInteraction } = require("../skill/scripts/interaction-capture-core.cjs");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { decide, initState, nextAction, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const fixtures = path.join(__dirname, "fixtures", "ui-audit");
const PROBES = JSON.parse(fs.readFileSync(path.join(fixtures, "probes.json"), "utf8"));
// The bundled OFL Inter (proportional default figures, tabular ones on request).
const FONT = path.join(repoRoot, "skill/tools/art-motion/fonts/Inter-var.woff");
const VIEWPORTS = ["1280x800", "390x844"];
const LINEAGE = { files: ["index.html"], tokens: [], absent: [], remote: [] };

// Only a missing tool skips, with the resolver's reason; anything else thrown here is a bug.
function browserTools() {
  try {
    resolvePuppeteer(repoRoot, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [repoRoot] });
    return { chrome: resolveChrome(), puppeteerModule, skip: false };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `no browser for the audit probe (${error.message})` };
  }
}
const tools = browserTools();

const clone = (value) => JSON.parse(JSON.stringify(value));
const probeDoc = (id, ...probes) => ({ schema: SCHEMA, id, url: "index.html", probes });
function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-audit-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// The components decision and manifest the web build stage requires (written from scratch).
function prepareWebComponents(dir) {
  decide(dir, { stage: "components", choice: "scratch", answer: "Write from scratch" });
  fs.writeFileSync(path.join(dir, "component-manifest.json"), JSON.stringify({ fromScratch: true, entries: [] }));
}

// A fixture page staged as a project's index.html with the font beside it.
function stage(t, name, doc, { web = false, html = null } = {}) {
  const dir = tmp(t);
  fs.mkdirSync(path.join(dir, "fonts"));
  fs.copyFileSync(FONT, path.join(dir, "fonts/Inter-var.woff"));
  if (html) fs.writeFileSync(path.join(dir, "index.html"), html);
  else fs.copyFileSync(path.join(fixtures, `${name}.html`), path.join(dir, "index.html"));
  if (name === "clean") fs.copyFileSync(path.join(fixtures, "clean.css"), path.join(dir, "clean.css"));
  if (web) {
    initState(dir, { deliverable: "web", tier: "quick" });
    prepareWebComponents(dir);
  }
  fs.writeFileSync(path.join(dir, "interaction.json"), `${JSON.stringify(doc, null, 2)}\n`);
  return dir;
}

// The real capture layer, in process, evaluated against the staged project.
async function measure(t, name, probes, { html = null } = {}) {
  const doc = probeDoc(`audit-${name}`, ...probes);
  const dir = stage(t, name, doc, { html });
  const recorded = await captureInteraction(path.join(dir, "interaction.json"), { doc: validateProbeFile(doc), chrome: tools.chrome, puppeteerModule: tools.puppeteerModule });
  return evaluateProbeFile(doc, recorded, { project: dir });
}

function run(args) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], { encoding: "utf8", windowsHide: true, timeout: 120000 });
  let output = null;
  try { output = JSON.parse(child.stdout); } catch { output = null; }
  return { status: child.status, output, text: child.stdout + child.stderr };
}
const verify = (dir) => run(["verify", "interaction", "--root", dir, "--project-root", dir, "--probe", "interaction.json", "--chrome", tools.chrome, "--puppeteer-module", tools.puppeteerModule]);
const statuses = (row, viewport) => Object.fromEntries(row.coverage.find((entry) => `${entry.viewport.width}x${entry.viewport.height}` === viewport).checks.map((check) => [check.code, check.status]));

// A standard web project up to its probe stage, with a page that loads one stylesheet.
function webProject(t) {
  const dir = tmp(t);
  initState(dir, { deliverable: "web", tier: "standard" });
  decide(dir, { stage: "intake", answer: "default" });
  decide(dir, { stage: "reference", answer: "none" });
  fs.writeFileSync(path.join(dir, "concepts.md"), "# Concepts\n");
  decide(dir, { stage: "concept", choice: "1" });
  prepareWebComponents(dir);
  fs.writeFileSync(path.join(dir, "index.html"), '<!doctype html><link rel="stylesheet" href="site.css"><p>Page</p>');
  fs.writeFileSync(path.join(dir, "site.css"), "html { background: #fff; }\n");
  return dir;
}

test("the audit contract has 17 codes, six optional checks and the documented defaults", () => {
  assert.equal(audit.AUDIT_CODES.length, 17);
  assert.deepEqual([audit.AUDIT_CODES[0], audit.AUDIT_CODES[5], audit.AUDIT_CODES[11], audit.AUDIT_CODES[16]], ["audit.font-family", "audit.text-contrast", "audit.target-size", "audit.nested-radius"]);
  assert.deepEqual(audit.OPTIONAL_CODES, ["audit.tabular-numbers", "audit.content-overflow", "audit.control-inset", "audit.layout-gap", "audit.layout-alignment", "audit.nested-radius"]);
  const { minFontPx, minTargetPx, minControlGapPx, minControlInsetPx, minLayoutGapPx, contrastNormal, contrastLarge, fontSizes, tolerances } = audit.AUDIT_DEFAULTS;
  assert.deepEqual([minFontPx, minTargetPx, minControlGapPx, minControlInsetPx, minLayoutGapPx, contrastNormal, contrastLarge], [12, 24, 8, 8, 8, 4.5, 3]);
  assert.deepEqual([...fontSizes], []);
  assert.deepEqual({ ...tolerances }, { alignmentPx: 1, radiusPx: 1, boundsPx: 1, fontSizePx: 0.1, digitWidthPx: 0.5 });
});

test("audit options are plain JSON with defaults applied, lists replaced and the file viewport as default", () => {
  const options = audit.auditOptions({ id: "a", kind: "audit", thresholds: { fonts: ["Inter"], minTargetPx: 44, fontSizes: [14, 18] }, declare: { stacks: [".list"] } });
  assert.deepEqual(Object.keys(options), ["thresholds", "declare"], "nothing in the options can skip or waive a result");
  assert.equal(options.thresholds.minTargetPx, 44);
  assert.equal(options.thresholds.minFontPx, 12);
  assert.deepEqual(options.thresholds.fontSizes, [14, 18]);
  assert.deepEqual(options.thresholds.fonts, ["Inter"]);
  assert.deepEqual(options.declare, { numbers: [], stacks: [".list"], controlContainers: [], contentBoxes: [], alignGroups: [], radiusPairs: [] });
  assert.deepEqual(clone(options), options, "page.evaluate receives plain JSON");
  assert.deepEqual(validateProbeFile(probeDoc("defaults", { id: "page-audit", kind: "audit", thresholds: { fonts: ["Inter"] } })).probes[0].viewports, [{ width: 1280, height: 800 }]);
  assert.deepEqual(audit.auditViewports(PROBES.clean, { width: 1, height: 1 }), PROBES.clean.viewports);
});

test("malformed audit probes are rejected before any browser starts; motion and journey probes keep their contract", (t) => {
  const designExample = { id: "page-audit", kind: "audit", viewports: [{ width: 1280, height: 800 }, { width: 390, height: 844 }], thresholds: { fonts: ["Inter", "system-ui"], fontSizes: [12, 14, 16, 20, 24, 32, 48] }, declare: { numbers: [".price"], stacks: [".card-list"], controlContainers: [".toolbar"], alignGroups: [{ selector: ".hero", items: ".hero > *", edge: "start" }], radiusPairs: [{ outer: ".card", inner: ".card > img" }], contentBoxes: [".card"] } };
  assert.deepEqual(audit.validateAuditProbe(designExample), [], "the design example is a valid probe");
  const noWaiver = /unsupported properties: (exclude|exceptions).*No probe field can skip or waive a result/;
  for (const [label, mutate, pattern] of [
    ["unknown field", (probe) => { probe.colour = "red"; }, /unsupported properties: colour/],
    ["exceptions", (probe) => { probe.exceptions = [{ selector: ".card", codes: ["audit.text-contrast"], reason: "Checked by hand" }]; }, noWaiver],
    ["exclude", (probe) => { probe.exclude = [".chat-widget"]; }, noWaiver],
    ["missing fonts", (probe) => { delete probe.thresholds.fonts; }, /thresholds\.fonts is missing/],
    ["missing thresholds", (probe) => { delete probe.thresholds; }, /thresholds\.fonts is missing/],
    ["empty fonts", (probe) => { probe.thresholds.fonts = []; }, /thresholds\.fonts must be a non-empty list of font family names/],
    ["empty selector", (probe) => { probe.declare.stacks = [" "]; }, /declare\.stacks\[0\] must be a non-empty selector/],
    ["non-positive threshold", (probe) => { probe.thresholds.minTargetPx = 0; }, /minTargetPx must be a positive number/],
    ["duplicate viewport", (probe) => { probe.viewports.push({ width: 390, height: 844 }); }, /duplicates viewport 390x844/],
  ]) {
    const probe = clone(PROBES.clean);
    mutate(probe);
    assert.ok(audit.validateAuditProbe(probe).some((error) => pattern.test(error)), label);
    assert.throws(() => validateProbeFile(probeDoc("bad", probe)), pattern, label);
  }
  // The canonical motion probe is unchanged by normalization, and a stray kind is still refused.
  const motion = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "interaction-samples.json"), "utf8")).document;
  const normalized = validateProbeFile(motion);
  assert.equal(Object.hasOwn(normalized.probes[0], "viewports"), false);
  assert.throws(() => validateProbeFile({ ...motion, probes: [{ ...motion.probes[0], kind: "motion" }] }), /kind has invalid value motion/);

  // Through the CLI: each contract error exits 1 although the browser given could never start,
  // and leaves no gate and no evidence behind.
  const unreachable = ["--chrome", process.execPath, "--puppeteer-module", path.join(os.tmpdir(), "no-puppeteer-core-here")];
  const rejectedBeforeBrowser = (label, doc, pattern, code = null) => {
    const dir = tmp(t);
    initState(dir, { deliverable: "web", tier: "quick" });
    fs.writeFileSync(path.join(dir, "index.html"), "<p>page</p>");
    fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify(doc));
    const rejected = run(["verify", "interaction", "--root", dir, "--project-root", dir, "--probe", "interaction.json", ...unreachable]);
    assert.equal(rejected.status, 1, `${label}: ${rejected.text}`);
    assert.match(rejected.output.error.message, pattern, label);
    if (code) assert.equal(rejected.output.error.code, code, label);
    assert.equal(readState(dir).gates?.interaction, undefined, `${label}: no gate is recorded`);
    assert.equal(fs.existsSync(path.join(dir, "evidence")), false, `${label}: no evidence is written`);
  };
  const broken = clone(PROBES.clean);
  broken.viewports.push({ width: 1280, height: 800 });
  rejectedBeforeBrowser("duplicate viewport", probeDoc("bad", broken), /^interaction probe: .*duplicates viewport 1280x800/);
  rejectedBeforeBrowser("exceptions", probeDoc("bad", { ...clone(PROBES.clean), exceptions: [{ codes: ["audit.nested-radius"], reason: "No nested surfaces" }] }), /^interaction probe: .*unsupported properties: exceptions/);
  rejectedBeforeBrowser("exclude", probeDoc("bad", { ...clone(PROBES.clean), exclude: [".chat-widget"] }), /^interaction probe: .*unsupported properties: exclude/);
  const fontless = clone(PROBES.clean);
  delete fontless.thresholds.fonts;
  rejectedBeforeBrowser("no fonts", probeDoc("bad", fontless), /^interaction probe: .*thresholds\.fonts is missing/);
  rejectedBeforeBrowser("remote page", { ...probeDoc("remote", clone(PROBES.clean)), url: "http://127.0.0.1:8080/index.html" }, /audit probe measures a local page inside the project.*Fix: set "url" to the project's local index\.html/, "AUDIT_PAGE_NOT_LOCAL");

  // A local page outside the project cannot be named at all: the probe sits in the project and its
  // url may not escape the probe's directory.
  const dir = tmp(t);
  fs.mkdirSync(path.join(dir, "project"));
  fs.writeFileSync(path.join(dir, "index.html"), "<p>page</p>");
  fs.writeFileSync(path.join(dir, "project", "interaction.json"), JSON.stringify({ ...probeDoc("outside", clone(PROBES.clean)), url: "../index.html" }));
  const outside = run(["verify", "interaction", "--root", dir, "--project-root", "project", "--probe", "project/interaction.json", ...unreachable]);
  assert.equal(outside.status, 1, outside.text);
  assert.match(outside.output.error.message, /url must not escape the probe file's directory/);
  assert.equal(fs.existsSync(path.join(dir, "project", "evidence")), false);
  // The gate's project must contain the probe file; that is checked before the browser too.
  fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify(probeDoc("escaped", clone(PROBES.clean))));
  const escaped = run(["verify", "interaction", "--root", dir, "--project-root", "project", "--probe", "interaction.json", ...unreachable]);
  assert.equal(escaped.status, 1, escaped.text);
  assert.equal(escaped.output.error.code, "PATH_ESCAPE");
});

test("summaries fail on failed and indeterminate results, report not-declared without passing it and bind every request", (t) => {
  const project = tmp(t);
  const outsider = tmp(t);
  const fileUrl = (...parts) => require("node:url").pathToFileURL(path.join(...parts)).href;
  const check = (extra = {}) => ({ declared: true, checked: 1, failedCount: 0, indeterminateCount: 0, failed: [], indeterminate: [], ...extra });
  const viewport = { width: 1280, height: 800 };
  const entry = (checks, requests = [fileUrl(project, "index.html")]) => ({ viewport, requests, result: { viewport, elements: 10, checks, contractErrors: [] } });
  const passing = () => Object.fromEntries(audit.AUDIT_CODES.map((code) => [code, check()]));
  const statusOf = (summary) => Object.fromEntries(summary.coverage[0].checks.map((item) => [item.code, item.status]));

  // Optional checks left undeclared are listed with a hint; they neither pass nor fail the audit.
  const undeclared = passing();
  for (const code of audit.OPTIONAL_CODES) undeclared[code] = check({ declared: false, checked: 0 });
  undeclared["audit.root-background"] = check({ checked: 0 });
  const quiet = audit.summarizeAudit("page-audit", [entry(undeclared, [fileUrl(project, "index.html"), fileUrl(project, "site.css"), fileUrl(project, "missing.webp")])], project);
  assert.equal(quiet.status, "passed", "files inside the project, present or not, are bindable");
  assert.deepEqual(quiet.findings, []);
  for (const code of audit.OPTIONAL_CODES) {
    const item = quiet.coverage[0].checks.find((entry) => entry.code === code);
    assert.equal(item.status, "not-declared", code);
    assert.match(item.hint, /^Declare /, code);
    assert.doesNotMatch(item.hint, /exception/i, code);
  }
  assert.equal(statusOf(quiet)["audit.root-background"], "not-applicable", "nothing checked is never passed");
  assert.equal(Object.hasOwn(quiet, "exceptions"), false);

  // A required check is never not-declared; an indeterminate result fails with its finding.
  const unresolved = passing();
  unresolved["audit.font-family"] = check({ declared: false, checked: 0 });
  unresolved["audit.text-contrast"] = check({ checked: 2, indeterminateCount: 1, indeterminate: [{ code: "audit.text-contrast", selector: ".hero h1", expected: "at least 4.5:1", actual: "not measurable: .hero has a background image or gradient", message: "the contrast of .hero h1 cannot be measured", fix: "Put the text on a measurable solid surface or scrim: an opaque background color directly behind the text." }] });
  const failed = audit.summarizeAudit("page-audit", [entry(unresolved)], project);
  assert.equal(failed.status, "failed");
  assert.deepEqual([statusOf(failed)["audit.font-family"], statusOf(failed)["audit.text-contrast"]], ["not-declared", "indeterminate"]);
  assert.deepEqual(failed.findings.map((finding) => finding.code), ["audit.text-contrast"]);
  assert.match(failed.findings[0].fix, /measurable solid surface or scrim/);
  assert.ok(failed.findings.every((finding) => finding.severity === "error" && finding.probeId === "page-audit" && finding.viewport === "1280x800" && finding.fix && finding.expected && finding.actual));

  // Remote, dev-server and outside-project resources cannot be hashed by the gate. Each is listed
  // once for the probe, in request order, however many viewports requested it.
  const requests = [fileUrl(project, "index.html"), "https://cdn.example/font.woff2", "http://localhost:5173/app.js", fileUrl(outsider, "brand.css")];
  const unbound = audit.summarizeAudit("page-audit", [entry(passing(), requests), entry(passing(), [...requests].reverse())], project);
  assert.equal(unbound.status, "failed");
  assert.deepEqual(unbound.findings.map((finding) => [finding.code, finding.severity, finding.probeId, finding.urls]), [["external-request", "error", "page-audit", ["https://cdn.example/font.woff2", "http://localhost:5173/app.js", fileUrl(outsider, "brand.css")]]]);
  assert.match(unbound.findings[0].fix, /^Copy every listed resource into the project/);

  assert.throws(() => audit.summarizeAudit("page-audit", [{ viewport, result: { viewport, elements: 1, checks: passing(), contractErrors: [] } }], project), /has no request log/);
  const rejected = audit.summarizeAudit("page-audit", [{ viewport, result: { viewport, contractErrors: ['declare.stacks[0] "[" is not a selector this page accepts'] } }], project);
  assert.equal(rejected.status, "failed");
  assert.equal(rejected.contractErrors.length, 1);
});

test("every audit code fires on the violating page at both viewports", { skip: tools.skip }, async (t) => {
  const result = await measure(t, "violating", [PROBES.violating]);
  const row = result.probes[0];
  assert.equal(result.status, "failed");
  for (const viewport of VIEWPORTS) {
    const status = statuses(row, viewport);
    for (const code of audit.AUDIT_CODES) assert.equal(status[code], "failed", `${code} at ${viewport}`);
    assert.deepEqual([...new Set(row.findings.filter((finding) => finding.viewport === viewport).map((finding) => finding.code))].sort(), [...audit.AUDIT_CODES].sort());
  }
  for (const finding of row.findings.filter((finding) => finding.code !== "external-request")) {
    for (const field of ["code", "selector", "expected", "actual", "message", "fix", "viewport"]) assert.equal(typeof finding[field], "string", `${finding.code} ${field}`);
  }
  assert.ok(row.findings.some((finding) => finding.code === "audit.text-contrast" && /^not measurable: .*background image or gradient/.test(finding.actual) && /measurable solid surface or scrim/.test(finding.fix)), "text on a gradient is indeterminate, with the scrim fix");
  assert.ok(row.findings.some((finding) => finding.code === "audit.text-contrast" && /:1 \(#b4b4b4 on #ffffff\)$/.test(finding.actual)));
  assert.ok(row.findings.some((finding) => finding.code === "audit.layout-gap" && finding.selector === ".no-such-stack" && finding.actual === "no element matches"), "a declared selector that matches nothing fails");
  assert.ok(row.findings.some((finding) => finding.code === "audit.font-loading" && /Broken Face/.test(finding.actual)));
  assert.ok(row.findings.some((finding) => finding.code === "audit.tabular-numbers" && /digit widths differ/.test(finding.actual)), "proportional figures are measured, not read from a style flag");
  assert.ok(row.findings.some((finding) => finding.code === "audit.nested-radius" && /^12px inner radius/.test(finding.expected)));
  // The remote stylesheet fails the verifier's external-request finding once for the probe, not
  // once per viewport.
  const external = row.findings.filter((finding) => finding.code === "external-request");
  assert.deepEqual(external.map((finding) => [finding.severity, finding.actual, finding.urls]), [["error", "http://127.0.0.1:9/cdn.css", ["http://127.0.0.1:9/cdn.css"]]]);
  assert.match(external[0].fix, /^Copy every listed resource into the project/);
});

test("an undeclared page passes with its six optional checks reported as not-declared, never passed", { skip: tools.skip }, async (t) => {
  const result = await measure(t, "undeclared", [PROBES.undeclared]);
  const row = result.probes[0];
  assert.equal(row.status, "passed", JSON.stringify(row.findings, null, 2));
  assert.deepEqual(row.findings, []);
  for (const viewport of VIEWPORTS) {
    const entry = row.coverage.find((item) => `${item.viewport.width}x${item.viewport.height}` === viewport);
    for (const code of audit.OPTIONAL_CODES) {
      const check = entry.checks.find((item) => item.code === code);
      assert.equal(check.status, "not-declared", `${code} at ${viewport}`);
      assert.equal(check.checked, 0, `${code} at ${viewport}`);
      assert.match(check.hint, /^Declare .*declare\./, `${code} at ${viewport}`);
    }
    for (const check of entry.checks.filter((item) => !audit.OPTIONAL_CODES.includes(item.code))) assert.ok(["passed", "not-applicable"].includes(check.status), `${check.code} at ${viewport}: ${check.status}`);
  }
  const probe = validateProbeFile(probeDoc("undeclared", PROBES.undeclared)).probes[0];
  assert.equal(auditResultFailure(probe, row), null, "native completion accepts not-declared optional checks");
});

test("the clean page passes every check at both viewports and native completion re-reads its coverage", { skip: tools.skip }, async (t) => {
  const result = await measure(t, "clean", [PROBES.clean]);
  const row = result.probes[0];
  assert.equal(result.status, "passed", JSON.stringify(result.findings, null, 2));
  assert.deepEqual(row.findings, []);
  for (const viewport of VIEWPORTS) for (const [code, status] of Object.entries(statuses(row, viewport))) assert.equal(status, "passed", `${code} at ${viewport}`);
  const probe = validateProbeFile(probeDoc("clean", PROBES.clean)).probes[0];
  assert.equal(auditResultFailure(probe, row), null);
  const failedCheck = clone(row);
  failedCheck.coverage[1].checks[2].status = "failed";
  assert.match(auditResultFailure(probe, failedCheck), /390x844/);
  const unmeasured = clone(row);
  unmeasured.coverage[0].checks[0].checked = 0;
  assert.match(auditResultFailure(probe, unmeasured), /1280x800/);
  const requiredUndeclared = clone(row);
  Object.assign(requiredUndeclared.coverage[0].checks[0], { status: "not-declared", checked: 0 });
  assert.match(auditResultFailure(probe, requiredUndeclared), /1280x800/, "a required check is never not-declared");
  const waived = clone(row);
  waived.coverage[0].checks[5].status = "waived";
  assert.match(auditResultFailure(probe, waived), /1280x800/, "there is no waived status");
  assert.match(auditResultFailure(probe, { ...clone(row), coverage: [row.coverage[0]] }), /failed or incomplete/);
});

test("aria-hidden text, clipped screen-reader text and content parked off screen are not measured", { skip: tools.skip }, async (t) => {
  const html = `<!doctype html><html lang="en" style="background:#fff;color:#18181b;font:16px/1.5 sans-serif"><body style="margin:0;padding:16px">
<p>Main text <span aria-hidden="true" style="font-size:10px">*</span> and <span id="visible-mark" style="font-size:10px">*</span></p>
<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;font-size:10px">Screen reader text</span>
<div id="clipped" style="width:40px;overflow:hidden;white-space:nowrap">Clipped visible text that is long</div>
<div style="position:absolute;left:-9999px;font-size:10px">Parked off screen</div>
<div id="nudged" style="position:relative;left:-40px;font-size:10px">Pushed past the edge</div>
</body></html>`;
  const probe = { id: "guards", kind: "audit", thresholds: { fonts: ["sans-serif"] } };
  const result = await measure(t, "guards", [probe], { html });
  const selectors = (code) => result.findings.filter((finding) => finding.code === code).map((finding) => finding.selector).sort();
  assert.deepEqual(selectors("audit.font-size"), ["#nudged", "#visible-mark"], "only the visible 10px text fails");
  assert.deepEqual(selectors("audit.content-clipping"), ["#clipped"]);
  assert.deepEqual(selectors("audit.viewport-bounds"), ["#nudged"]);
});

test("verify interaction exits 2 on the violating page, 0 on the clean and undeclared pages and 1 on a selector the page rejects", { skip: tools.skip }, (t) => {
  const lineages = {
    clean: { files: ["clean.css", "fonts/Inter-var.woff", "index.html"], tokens: [], absent: [], remote: [] },
    undeclared: { files: ["fonts/Inter-var.woff", "index.html"], tokens: [], absent: [], remote: [] },
  };
  for (const [name, exitCode] of [["violating", 2], ["undeclared", 0], ["clean", 0]]) {
    const dir = stage(t, name, probeDoc(`audit-${name}`, PROBES[name]), { web: true });
    const result = verify(dir);
    assert.equal(result.status, exitCode, result.text);
    assert.equal(result.output.status, exitCode ? "failed" : "passed");
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "evidence/interaction.json"), "utf8")).probes[0].kind, "audit");
    const gate = readState(dir).gates.interaction;
    assert.equal(gate.status, exitCode ? "failed" : "passed");
    if (exitCode) {
      const page = gate.findings.filter((finding) => finding.code !== "external-request");
      assert.ok(page.length > 0 && page.every((finding) => finding.code.startsWith("audit.") && VIEWPORTS.includes(finding.viewport) && typeof finding.expected === "string" && typeof finding.actual === "string"), "recorded findings keep the viewport and the measurement");
      assert.deepEqual(gate.findings.filter((finding) => finding.code === "external-request").map((finding) => finding.actual), ["http://127.0.0.1:9/cdn.css"], "the remote stylesheet is recorded once, with its URL");
      assert.equal(nextAction(dir).stage, "probe");
    } else {
      assert.deepEqual(gate.findings, []);
      assert.deepEqual(gate.lineage, lineages[name]);
      assert.equal(nextAction(dir).type, "done");
    }
  }
  const rejectedProbe = clone(PROBES.clean);
  rejectedProbe.declare.stacks = [".stack", "div[["];
  const dir = stage(t, "clean", probeDoc("audit-rejected", rejectedProbe), { web: true });
  const rejected = verify(dir);
  assert.equal(rejected.status, 1, rejected.text);
  assert.equal(rejected.output.error.code, "AUDIT_SELECTOR_INVALID");
  assert.match(rejected.output.error.message, /declare\.stacks\[1\] "div\[\[" is not a selector this page accepts/);
  assert.equal(readState(dir).gates?.interaction, undefined, "no gate is recorded");
  assert.equal(fs.existsSync(path.join(dir, "evidence")), false, "no evidence is written");
});

test("an audited page that loads a stylesheet from outside the project fails external-request and records no pass", { skip: tools.skip }, (t) => {
  const outside = tmp(t);
  fs.writeFileSync(path.join(outside, "brand.css"), "p { letter-spacing: 0; }\n");
  const brand = require("node:url").pathToFileURL(path.join(outside, "brand.css")).href;
  const html = fs.readFileSync(path.join(fixtures, "clean.html"), "utf8").replace('<link rel="stylesheet" href="clean.css">', `<link rel="stylesheet" href="clean.css">\n<link rel="stylesheet" href="${brand}">`);
  assert.ok(html.includes(brand));
  const dir = stage(t, "clean", probeDoc("audit-outside", PROBES.clean), { web: true, html });
  const result = verify(dir);
  assert.equal(result.status, 2, result.text);
  const gate = readState(dir).gates.interaction;
  assert.equal(gate.status, "failed");
  assert.equal(gate.lineage, undefined, "a failed audit binds no lineage");
  assert.deepEqual(gate.findings.map((finding) => [finding.code, finding.probeId, finding.actual]), [["external-request", "page-audit", brand]]);
  assert.match(gate.findings[0].fix, /^Copy every listed resource into the project/);
  assert.equal(nextAction(dir).stage, "probe");
});

test("a journey that loads a file outside the project on click fails verify interaction and records no pass", { skip: tools.skip }, (t) => {
  const outside = tmp(t);
  fs.writeFileSync(path.join(outside, "brand.css"), "p { letter-spacing: 0; }\n");
  const brand = require("node:url").pathToFileURL(path.join(outside, "brand.css")).href;
  // The journey's own origin check accepts any file: request; only the run-wide project bound sees
  // that the click loaded a file the gate could neither hash nor watch.
  const html = `<!doctype html><html lang="en"><body><div id="wrapper"><button id="load" type="button">Load</button><p id="status">idle</p></div>
<script>document.getElementById("load").addEventListener("click", () => { const link = document.createElement("link"); link.rel = "stylesheet"; link.href = ${JSON.stringify(brand)}; document.head.appendChild(link); document.getElementById("status").textContent = "loaded"; });</script></body></html>`;
  const journey = { id: "load", target: "#wrapper", steps: [
    { id: "initial", timeoutMs: 200, assertions: [{ selector: "#status", kind: "text", equals: "idle" }] },
    { id: "click", input: { kind: "click", selector: "#load" }, timeoutMs: 1000, assertions: [{ selector: "#status", kind: "text", equals: "loaded" }] },
  ] };
  const dir = stage(t, "journey", probeDoc("journey-outside", journey), { web: true, html });
  const result = verify(dir);
  assert.equal(result.status, 2, result.text);
  assert.deepEqual(result.output.probes.map((probe) => probe.status), ["passed"], "the journey's own assertions pass");
  const gate = readState(dir).gates.interaction;
  assert.equal(gate.status, "failed");
  assert.equal(gate.lineage, undefined, "a failed run binds no lineage");
  assert.deepEqual(gate.findings.map((finding) => [finding.code, finding.actual]), [["external-request", brand]]);
  assert.match(gate.findings[0].fix, /^Copy every listed resource into the project/);
});

test("editing a loaded stylesheet or DESIGN.md makes the gate stale; a pass without lineage is stale", { skip: tools.skip }, (t) => {
  const dir = stage(t, "clean", probeDoc("audit-clean", PROBES.clean), { web: true });
  assert.equal(verify(dir).status, 0);
  assert.equal(nextAction(dir).type, "done");
  const css = path.join(dir, "clean.css");
  const original = fs.readFileSync(css, "utf8");
  fs.writeFileSync(css, original.replace("gap: 32px", "gap: 4px"));
  let pending = nextAction(dir);
  assert.equal(pending.stage, "probe");
  assert.ok(pending.verification.findings.some((finding) => finding.code === "workflow-input-changed" && finding.path === "clean.css"));
  fs.writeFileSync(css, original);
  assert.equal(nextAction(dir).type, "done", "the verified bytes are current again");
  fs.writeFileSync(path.join(dir, "DESIGN.md"), "# Design\n\nType: Inter at 12, 14, 16, 20, 24 and 32 px.\n");
  pending = nextAction(dir);
  assert.equal(pending.stage, "probe");
  assert.ok(pending.verification.findings.some((finding) => finding.code === "workflow-input-unbound" && finding.path === "DESIGN.md"), "a token source that appeared reopens the gate");
  assert.equal(verify(dir).status, 0);
  assert.deepEqual(readState(dir).gates.interaction.lineage.tokens, ["DESIGN.md"]);
  assert.equal(nextAction(dir).type, "done");
  fs.appendFileSync(path.join(dir, "DESIGN.md"), "Targets: at least 44 px.\n");
  assert.ok(nextAction(dir).verification.findings.some((finding) => finding.code === "workflow-input-changed" && finding.path === "DESIGN.md"));
  const state = readState(dir);
  delete state.gates.interaction.lineage;
  fs.writeFileSync(path.join(dir, ".design-pipeline/state.json"), JSON.stringify(state));
  pending = nextAction(dir);
  assert.equal(pending.stage, "probe");
  assert.deepEqual(pending.verification.findings.map((finding) => finding.code), ["workflow-lineage-missing"]);
});

test("the web probe stage refuses a probe file without an audit and keeps review and delivery closed", (t) => {
  const dir = webProject(t);
  const legacy = probeDoc("legacy", { id: "tap", target: "#cta", input: { kind: "click", at: [10, 10] }, expect: {} });
  fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify(legacy));
  // Even a pass recorded for that file cannot finish the stage.
  recordGate(dir, "interaction", "passed", ["interaction.json", "index.html"], {}, LINEAGE);
  const action = nextAction(dir);
  assert.equal(action.stage, "probe");
  assert.equal(action.command, undefined, "no verify command until the page audit exists");
  assert.match(action.instruction, /^Add an audit probe to interaction\.json/);
  assert.equal(action.guide, "references/workflow-web.md#probe");
  assert.throws(() => decide(dir, { stage: "review", verdict: "accept" }), /Cannot record review while probe is unfinished/);
  assert.throws(() => decide(dir, { stage: "deliver", answer: "https://example.test" }), /Cannot record delivery while probe is unfinished/);
  legacy.probes.push({ id: "page-audit", kind: "audit", thresholds: { fonts: ["Inter"] } });
  fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify(legacy));
  const verifyAction = nextAction(dir);
  assert.equal(verifyAction.stage, "probe", "the edited probe file must be verified again");
  assert.match(verifyAction.command, / verify interaction --root ("[^"]+"|\S+) --project-root \1 --probe interaction\.json$/);
});

test("rendered-dependency lineage reopens review and delivery and binds files that were missing", (t) => {
  const dir = webProject(t);
  fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify(probeDoc("lineage", { id: "page-audit", kind: "audit", thresholds: { fonts: ["Inter"] } })));
  const pass = () => recordGate(dir, "interaction", "passed", ["interaction.json", "index.html"], {}, { files: ["index.html", "site.css"], tokens: [], absent: ["hero.webp"], remote: ["https://cdn.example/font.woff2"] });
  pass();
  const gate = readState(dir).gates.interaction;
  assert.match(gate.inputHashes["site.css"], /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(gate.lineage.remote, ["https://cdn.example/font.woff2"], "remote URLs are recorded, not hashed");
  assert.equal(Object.keys(gate.inputHashes).some((key) => key.startsWith("http")), false);
  assert.equal(nextAction(dir).stage, "review");
  decide(dir, { stage: "review", verdict: "accept" });
  decide(dir, { stage: "deliver", answer: "https://example.test" });
  assert.equal(nextAction(dir).type, "done");
  fs.writeFileSync(path.join(dir, "site.css"), "html { background: #000; }\n");
  assert.equal(nextAction(dir).stage, "probe", "a changed stylesheet reopens probe");
  pass();
  assert.equal(nextAction(dir).stage, "review", "the re-verified page needs a new review");
  decide(dir, { stage: "review", verdict: "accept" });
  assert.equal(nextAction(dir).stage, "deliver", "and a new delivery");
  decide(dir, { stage: "deliver", answer: "https://example.test" });
  assert.equal(nextAction(dir).type, "done");
  fs.writeFileSync(path.join(dir, "hero.webp"), "image");
  const pending = nextAction(dir);
  assert.equal(pending.stage, "probe", "a file the page asked for that has since appeared reopens probe");
  assert.ok(pending.verification.findings.some((finding) => finding.code === "workflow-input-unbound" && finding.path === "hero.webp"));
});
