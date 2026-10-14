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
const { acceptSections, toBuild, toComponents } = require("./helpers/web-flow.cjs");

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

// Everything before the components decision, then the decision and manifest the web build stage
// requires (written from scratch).
function prepareWebComponents(dir) {
  toComponents(dir);
  decide(dir, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
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

// A standard web project up to its probe stage, with a page that loads one stylesheet and whose
// approved section the owner accepted.
function webProject(t) {
  const dir = tmp(t);
  initState(dir, { deliverable: "web", tier: "standard" });
  prepareWebComponents(dir);
  toBuild(dir);
  fs.writeFileSync(path.join(dir, "index.html"), '<!doctype html><link rel="stylesheet" href="site.css"><p>Page</p>');
  fs.writeFileSync(path.join(dir, "site.css"), "html { background: #fff; }\n");
  assert.equal(acceptSections(dir).stage, "probe");
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
  // The probe's whole log counts too: a file the page loaded while the viewport was restored, after
  // the last viewport's measurement, is in no viewport log.
  const restored = audit.summarizeAudit("page-audit", [entry(passing())], project, [fileUrl(project, "index.html"), fileUrl(outsider, "wide.css")]);
  assert.equal(restored.status, "failed");
  assert.deepEqual(restored.findings.map((finding) => [finding.code, finding.urls]), [["external-request", [fileUrl(outsider, "wide.css")]]]);

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

test("spacing measures the hit areas target-size counts and diagonal neighbours of controls and stacks", { skip: tools.skip }, async (t) => {
  // 16px icons whose ::after widens the target to 32px sit 8px apart by layout, but their targets
  // overlap by 8px; two 24px buttons, and two tiles of a declared grid stack, offset 2px on each
  // axis are 2.83px apart along the diagonal. A 16px button whose 2px ::after over-constrains its
  // -8px insets is not widened, since CSS drops an inset and pins it to a corner; an inline link
  // whose ::after reaches 4px past each edge is widened past 24px.
  const html = `<!doctype html><html lang="en" style="background:#fff;color:#18181b;font:16px/1.5 sans-serif"><head>
<style>button{padding:0;border:0;background:#1d4ed8}.hit::after{content:"";position:absolute;top:-8px;right:-8px;bottom:-8px;left:-8px}.pin::after{width:2px;height:2px}.near::after{content:"";position:absolute;top:-4px;right:-4px;bottom:-4px;left:-4px}#tiles{display:grid;grid-template-columns:24px 24px;grid-template-rows:24px 24px;gap:2px}#tiles span{background:#e4e4e7;font-size:16px;line-height:24px}</style>
</head><body style="margin:0;padding:32px">
<div style="position:relative;height:48px"><button id="icon-a" class="hit" aria-label="Back" style="position:absolute;left:8px;top:8px;width:16px;height:16px"></button><button id="icon-b" class="hit" aria-label="Next" style="position:absolute;left:32px;top:8px;width:16px;height:16px"></button></div>
<div style="position:relative;height:64px"><button id="corner-a" aria-label="Up" style="position:absolute;left:0;top:0;width:24px;height:24px"></button><button id="corner-b" aria-label="Down" style="position:absolute;left:26px;top:26px;width:24px;height:24px"></button></div>
<div id="tiles"><span id="tile-a" style="grid-area:1/1">A</span><span id="tile-b" style="grid-area:2/2">B</span></div>
<div style="position:relative;height:40px"><button id="pinned" class="hit pin" aria-label="Close" style="position:absolute;left:0;top:8px;width:16px;height:16px"></button></div>
<p><a id="inline-near" class="near" href="#more" style="position:relative">Go</a></p>
</body></html>`;
  const probe = { id: "spacing", kind: "audit", thresholds: { fonts: ["sans-serif"] }, declare: { stacks: ["#tiles"] } };
  const result = await measure(t, "spacing", [probe], { html });
  const gaps = (code) => result.findings.filter((finding) => finding.code === code).map((finding) => [finding.selector, finding.actual]);
  assert.deepEqual(gaps("audit.control-gap"), [["#icon-a", "overlapping it by 8px"], ["#corner-a", "2.83px from it"]]);
  assert.deepEqual(gaps("audit.layout-gap"), [["#tile-a", "2.83px from it"]]);
  assert.deepEqual(result.findings.filter((finding) => finding.code === "audit.target-size").map((finding) => finding.selector), ["#pinned"], "the widened icons and inline link meet the 24px floor; the pinned button does not");
});

test("generated text is measured for contrast on its own background or the one behind its box", { skip: tools.skip }, async (t) => {
  // A pale required marker in flow, a badge whose text barely differs from its own fill, readable
  // generated text, generated text fixed to the viewport with no background of its own, generated
  // text moved off its box by a transform, translucent generated text, white generated text that a
  // relative offset moves off its dark host onto the white page, sticky generated text, which
  // scrolling can move even at top: 0, white generated text that its margins move off its dark host,
  // measured where they put it, a badge under a translucent veil, a transformed badge, a badge under
  // a positioned child of its host or under its host's other pseudo-element and, measured as usual,
  // badges over an in-flow child or over a ::before layer. The badge hosts have no text, which their
  // painted pseudo-elements would leave indeterminate.
  const html = `<!doctype html><html lang="en" style="background:#fff;color:#18181b;font:16px/1.5 sans-serif"><head>
<style>#email::after{content:" *";color:#d4d4d8}#inbox{position:relative}#inbox::after{content:"New";position:absolute;top:-8px;left:56px;padding:0 4px;background:#fef08a;color:#fde047}#note::before{content:"Note: ";color:#3f3f46}#draft::after{content:"Saved";position:fixed;bottom:0;left:0;color:#3f3f46}#lift{position:relative;height:24px}#lift::after{content:"Up";position:absolute;top:0;right:0;bottom:0;left:0;color:#3f3f46;transform:translateY(-200%)}#soft::after{content:" soft";color:#3f3f46;opacity:.8}#shift{background:#18181b;color:#fff;padding:4px 8px;margin-bottom:96px}#shift::after{content:" moved";color:#fff;position:relative;top:64px}#stick::after{content:" pinned";color:#3f3f46;position:sticky;top:0}#slip{position:relative;width:120px;height:32px;margin-left:240px;background:#18181b}#slip::after{content:"Out";color:#fff;position:absolute;top:0;right:0;bottom:0;left:0;margin-left:-200px;margin-right:200px}#mail{position:relative;height:24px}#mail::after{content:"9";position:absolute;top:0;left:0;padding:0 4px;background:#18181b;color:#fff}#tag{position:relative;height:24px;margin-top:24px}#tag::after{content:"Hot";position:absolute;top:0;left:0;padding:0 4px;background:#18181b;color:#fff;transform:translate(50%,-50%)}</style>
<style>#bell,#ring,#chip,#pill{position:relative;height:24px}#bell::before,#chip::before,#ring::after,#pill::after{position:absolute;top:0;left:0;padding:0 4px;background:#18181b;color:#fff}#bell::before{content:"5"}#ring::after{content:"7"}#chip::before{content:"8"}#chip::after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(255,255,255,.8)}#pill::before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;background:#e4e4e7}#pill::after{content:"9"}</style>
</head><body style="margin:0;padding:32px">
<p id="email">Email</p>
<div id="inbox" style="height:24px"></div>
<p id="note">Read this first</p>
<p id="draft">Draft</p>
<div id="lift"></div>
<p id="soft">Text</p>
<p id="shift">Dark</p>
<p id="stick">Stick</p>
<div id="slip"></div>
<div style="position:relative"><div id="mail"></div><div id="veil" style="position:absolute;top:0;left:0;width:48px;height:24px;background:rgba(255,255,255,.8)"></div></div>
<div id="tag"></div>
<div id="bell"><span id="bell-veil" style="position:absolute;top:0;left:0;width:48px;height:24px;background:rgba(255,255,255,.8)"></span></div>
<div id="ring"><span style="display:inline-block;width:48px;height:24px;background:#e4e4e7"></span></div>
<div id="chip"></div>
<div id="pill"></div>
</body></html>`;
  const result = await measure(t, "generated", [{ id: "generated", kind: "audit", thresholds: { fonts: ["sans-serif"] } }], { html });
  assert.deepEqual(result.findings.filter((finding) => finding.code === "audit.text-contrast").map((finding) => [finding.selector, finding.actual]), [
    ["#email::after", "1.47:1 (#d4d4d8 on #ffffff)"],
    ["#inbox::after", "1.13:1 (#fde047 on #fef08a)"],
    ["#slip::after", "1:1 (#ffffff on #ffffff)"],
    ["#draft::after", "not measurable: the box of #draft::after cannot be located"],
    ["#lift::after", "not measurable: #lift::after is transformed"],
    ["#soft::after", "not measurable: #soft::after is translucent (opacity 0.8)"],
    ["#shift::after", "not measurable: #shift::after is relatively positioned"],
    ["#stick::after", "not measurable: #stick::after is sticky"],
    ["#mail::after", "not measurable: #veil paints over or under the text"],
    ["#tag::after", "not measurable: #tag::after is transformed"],
    ["#bell::before", "not measurable: #bell-veil paints over or under the text"],
    ["#chip::before", "not measurable: #chip::after paints over or under the text"],
  ]);
});

test("opacity above the text or its background leaves contrast indeterminate", { skip: tools.skip }, async (t) => {
  // A badge on a half-transparent host, and text on an opaque card inside a half-transparent
  // wrapper: both read 17:1 or more against their own backgrounds, but neither is rendered that way.
  const html = `<!doctype html><html lang="en" style="background:#fff;color:#18181b;font:16px/1.5 sans-serif"><head>
<style>#beta{position:relative;height:24px;opacity:.5}#beta::after{content:"Beta";background:#18181b;color:#fff;padding:0 4px}</style>
</head><body style="margin:0;padding:32px">
<div id="beta"></div>
<div id="fade" style="opacity:.5"><p id="dim" style="background:#fff;color:#000">Dim</p></div>
</body></html>`;
  const result = await measure(t, "translucent", [{ id: "translucent", kind: "audit", thresholds: { fonts: ["sans-serif"] } }], { html });
  assert.deepEqual(result.findings.filter((finding) => finding.code === "audit.text-contrast").map((finding) => [finding.selector, finding.actual]), [
    ["#beta::after", "not measurable: #beta is translucent (opacity 0.5)"],
    ["#dim", "not measurable: #fade is translucent (opacity 0.5)"],
  ]);
});

test("an inline link is exempt from target size only beside text in its own inline formatting context", { skip: tools.skip }, async (t) => {
  // A link after a paragraph, a link after a line break, and links beside text that is not
  // displayed, invisible, transparent, clipped away, drawn in a transparent color (with or without a
  // transparent shadow), or transparent over a background that covers its ancestor's gradient clipped
  // to text, stand alone. A link inside a sentence, even one whose words are hidden only from
  // assistive technology, outlined by a stroke, drawn by a shadow, painted by an ancestor's
  // background clipped to text, or on the line after a break, is constrained by the line around it.
  const html = `<!doctype html><html lang="en" style="background:#fff;color:#18181b;font:16px/1.5 sans-serif"><body style="margin:0;padding:32px">
<div><p>Read the release notes before you upgrade.</p><a id="after-paragraph" href="#next">Next</a></div>
<div><span style="display:none">Hidden words</span><a id="beside-hidden" href="#more">More</a></div>
<div><span style="visibility:hidden">Invisible words</span><a id="beside-invisible" href="#a">Go</a></div>
<div><span style="opacity:0">Transparent words</span><a id="beside-transparent" href="#b">Go</a></div>
<div><span style="clip-path:inset(50%)">Screen reader words</span><a id="beside-clipped" href="#c">Go</a></div>
<div><span style="color:transparent">Clear words</span><a id="beside-clear" href="#e">Go</a></div>
<div style="background:linear-gradient(#18181b,#3f3f46);-webkit-background-clip:text;background-clip:text;color:transparent"><div style="background:#fff"><span>Covered words</span><a id="beside-covered" href="#g">Go</a></div></div>
<div><span style="color:transparent;text-shadow:0 0 transparent">Shadowless words</span><a id="beside-shadowless" href="#i">Go</a></div>
<p>Read the notes<br><a id="after-break" href="#k">Go</a></p>
<p>Read the <a id="in-sentence" href="#terms">terms</a> first.</p>
<p><span aria-hidden="true">Read the</span> <a id="beside-decorative" href="#d">notes</a></p>
<p style="background:linear-gradient(#18181b,#3f3f46);-webkit-background-clip:text;background-clip:text;color:transparent"><span>Read the</span> <a id="beside-gradient" href="#f">guide</a></p>
<p><span style="color:transparent;-webkit-text-stroke:1px #18181b">Read the</span> <a id="beside-outlined" href="#h">notes</a></p>
<p><span style="color:transparent;text-shadow:0 0 2px #18181b">Read the</span> <a id="beside-shadowed" href="#j">notes</a></p>
<p>Read the notes<br>then the <a id="on-next-line" href="#l">guide</a></p>
</body></html>`;
  const result = await measure(t, "sentence", [{ id: "sentence", kind: "audit", thresholds: { fonts: ["sans-serif"] } }], { html });
  assert.deepEqual(result.findings.filter((finding) => finding.code === "audit.target-size").map((finding) => finding.selector), ["#after-paragraph", "#beside-hidden", "#beside-invisible", "#beside-transparent", "#beside-clipped", "#beside-clear", "#beside-covered", "#beside-shadowless", "#after-break"]);
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
  // The journey's own origin check alone accepts any file: request; the project bound it carries
  // fails the probe whose click loaded a file the gate could neither hash nor watch.
  const html = `<!doctype html><html lang="en"><body><div id="wrapper"><button id="load" type="button">Load</button><p id="status">idle</p></div>
<script>document.getElementById("load").addEventListener("click", () => { const link = document.createElement("link"); link.rel = "stylesheet"; link.href = ${JSON.stringify(brand)}; document.head.appendChild(link); document.getElementById("status").textContent = "loaded"; });</script></body></html>`;
  const journey = { id: "load", target: "#wrapper", steps: [
    { id: "initial", timeoutMs: 200, assertions: [{ selector: "#status", kind: "text", equals: "idle" }] },
    { id: "click", input: { kind: "click", selector: "#load" }, timeoutMs: 1000, assertions: [{ selector: "#status", kind: "text", equals: "loaded" }] },
  ] };
  const dir = stage(t, "journey", probeDoc("journey-outside", journey), { web: true, html });
  const result = verify(dir);
  assert.equal(result.status, 2, result.text);
  assert.deepEqual(result.output.probes.map((probe) => probe.status), ["failed"], "the journey that loaded the file fails");
  const gate = readState(dir).gates.interaction;
  assert.equal(gate.status, "failed");
  assert.equal(gate.lineage, undefined, "a failed run binds no lineage");
  assert.deepEqual(gate.findings.map((finding) => [finding.code, finding.probeId, finding.actual]), [["external-request", "load", brand]]);
  assert.match(gate.findings[0].message, /went outside the project/);
  assert.match(gate.findings[0].fix, /^Copy every listed resource into the project/);
});

test("verify interaction refuses a report destination the page loaded and leaves it unchanged", { skip: tools.skip }, (t) => {
  const loaded = '<link rel="stylesheet" href="evidence/interaction.json">';
  const html = fs.readFileSync(path.join(fixtures, "clean.html"), "utf8").replace('<link rel="stylesheet" href="clean.css">', `<link rel="stylesheet" href="clean.css">\n${loaded}`);
  assert.ok(html.includes(loaded));
  const dir = stage(t, "clean", probeDoc("audit-report-loaded", PROBES.clean), { web: true, html });
  const report = path.join(dir, "evidence/interaction.json");
  fs.mkdirSync(path.dirname(report));
  fs.writeFileSync(report, "{}\n");
  const result = verify(dir);
  assert.equal(result.status, 1, result.text);
  assert.equal(result.output.error.code, "OUTPUT_COLLISION");
  assert.match(result.output.error.message, /evidence\/interaction\.json, which the page loaded/);
  assert.equal(fs.readFileSync(report, "utf8"), "{}\n", "the loaded bytes stay as they were measured");
  assert.equal(readState(dir).gates?.interaction, undefined, "no gate is recorded");
});

test("a request that resolves to the report only once it is written stays absent and is refused on the next run", { skip: tools.skip }, (t) => {
  const html = fs.readFileSync(path.join(fixtures, "clean.html"), "utf8").replace('<link rel="stylesheet" href="clean.css">', '<link rel="stylesheet" href="clean.css">\n<link rel="stylesheet" href="ev/interaction.json">');
  assert.ok(html.includes('href="ev/interaction.json"'));
  const dir = stage(t, "clean", probeDoc("audit-report-link", PROBES.clean), { web: true, html });
  // ev links to the report's directory: nothing is there at capture, and the report lands behind it.
  fs.mkdirSync(path.join(dir, "evidence"));
  fs.symlinkSync(path.join(dir, "evidence"), path.join(dir, "ev"), process.platform === "win32" ? "junction" : "dir");
  const first = verify(dir);
  assert.equal(first.status, 0, first.text);
  const lineage = readState(dir).gates.interaction.lineage;
  assert.deepEqual(lineage.absent, ["ev/interaction.json"], "the request found nothing at capture");
  assert.ok(!lineage.files.includes("ev/interaction.json"), "the report is not bound as something the page loaded");
  assert.equal(nextAction(dir).stage, "probe", "the report arriving behind the link reopens the gate");
  const rerun = verify(dir);
  assert.equal(rerun.status, 1, rerun.text);
  assert.equal(rerun.output.error.code, "OUTPUT_COLLISION");
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
  assert.throws(() => decide(dir, { by: "owner", stage: "review", verdict: "accept" }), /Cannot record review while probe is unfinished/);
  assert.throws(() => decide(dir, { by: "owner", stage: "deliver", answer: "https://example.test" }), /Cannot record delivery while probe is unfinished/);
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
  decide(dir, { by: "owner", stage: "review", verdict: "accept" });
  decide(dir, { by: "owner", stage: "deliver", answer: "https://example.test" });
  assert.equal(nextAction(dir).type, "done");
  fs.writeFileSync(path.join(dir, "site.css"), "html { background: #000; }\n");
  assert.equal(nextAction(dir).stage, "probe", "a changed stylesheet reopens probe");
  pass();
  assert.equal(nextAction(dir).stage, "review", "the re-verified page needs a new review");
  decide(dir, { by: "owner", stage: "review", verdict: "accept" });
  assert.equal(nextAction(dir).stage, "deliver", "and a new delivery");
  decide(dir, { by: "owner", stage: "deliver", answer: "https://example.test" });
  assert.equal(nextAction(dir).type, "done");
  fs.writeFileSync(path.join(dir, "hero.webp"), "image");
  const pending = nextAction(dir);
  assert.equal(pending.stage, "probe", "a file the page asked for that has since appeared reopens probe");
  assert.ok(pending.verification.findings.some((finding) => finding.code === "workflow-input-unbound" && finding.path === "hero.webp"));
});
