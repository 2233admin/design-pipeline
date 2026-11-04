"use strict";

// Measured spec drift (OpenSpec change measured-spec-drift): the Spec Reconciliation gate also
// compares what the built page paints with the DESIGN.md front-matter tokens. The pure parts (the
// CIEDE2000 helper, token reading, comparison, coverage) are tested directly; the gate is tested
// with written measurements; the browser tests drive the real CLI on adversarial pages and skip,
// like the page-refs tests, only when no browser or puppeteer-core is found.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const drift = require("../skill/scripts/built-style-drift-core.cjs");
const { checkSpecReconciliation, inferProjectRoot } = require("../skill/scripts/check-spec-reconciliation.cjs");
const { pageDigest } = require("../skill/scripts/workflows/web.cjs");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const FIXTURES = path.join(__dirname, "fixtures", "measured-spec-drift");
const FONT = path.join(repoRoot, "skill/tools/art-motion/fonts/Righteous-400.woff");
const PUPPETEER_MODULE = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE;
const CHANGE = path.join("openspec", "changes", "measured");

function missingTool() {
  for (const probe of [() => resolvePuppeteer(process.cwd(), PUPPETEER_MODULE), () => resolveBrowser()]) {
    try {
      probe();
    } catch (error) {
      if (error.code !== "TOOL_MISSING") throw error;
      return `no browser for measured drift (${error.message})`;
    }
  }
  return false;
}
const skip = missingTool();

function puppeteerPath() {
  return PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json", { paths: [repoRoot] }));
}

const RECONCILIATION = (rows = []) => [
  "# Design",
  "",
  "## Spec Reconciliation",
  "",
  "Graybox: `graybox.png`, captured 2026-11-04T00:00:00Z",
  "Reconciled: 2026-11-04T01:00:00Z",
  "",
  "| Value | Specified | Implemented | Cause |",
  "| --- | --- | --- | --- |",
  ...rows,
  "",
].join("\n");

// A project with DESIGN.md tokens, a built page and a change that has a reference, so the gate applies.
function project(page, { design = fs.readFileSync(path.join(FIXTURES, "design-tokens.md"), "utf8"), font = true } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "measured-drift-")));
  const change = path.join(dir, CHANGE);
  fs.mkdirSync(change, { recursive: true });
  fs.writeFileSync(path.join(dir, "DESIGN.md"), design);
  if (page) fs.copyFileSync(path.join(FIXTURES, page), path.join(dir, "index.html"));
  if (font) fs.copyFileSync(FONT, path.join(dir, "fixture.woff"));
  fs.writeFileSync(path.join(change, "reference.md"), "# Reference\n");
  fs.writeFileSync(path.join(change, "graybox.png"), "png");
  fs.writeFileSync(path.join(change, "design.md"), RECONCILIATION());
  return { dir, change };
}

function run(args) {
  const child = spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true, timeout: 180000 });
  let output = null;
  try { output = JSON.parse(child.stdout); } catch { output = null; }
  return { status: child.status, stdout: child.stdout, stderr: child.stderr, output };
}

const measure = (dir) => run(["reconciliation", "measure", "--root", dir, "--change-root", CHANGE, "--puppeteer-module", puppeteerPath(), "--json"]);
const check = (dir) => run(["reconciliation", "check", "--root", dir, "--change-root", CHANGE, "--json"]);

// A measurement written by hand, bound to the files on disk, for gate tests that need no browser.
function writeMeasurement({ dir, change }, measurement) {
  const record = {
    schema: drift.BUILT_STYLES_SCHEMA,
    page: pageDigest(dir),
    designFile: "DESIGN.md",
    designSha256: drift.designSha(path.join(dir, "DESIGN.md")),
    capturedAt: "2026-11-04T02:00:00Z",
    totals: { text: 100, surface: 1000000, border: 0, graphic: 0 },
    colors: [
      { hex: "#ffffff", weights: { surface: 900000 }, samples: ["canvas"] },
      { hex: "#1a1a2e", weights: { text: 100 }, samples: ["p"] },
      { hex: "#3366ff", weights: { surface: 100000 }, samples: ["button.cta"] },
    ],
    fonts: [{ family: "Fixture Display", stack: "\"Fixture Display\", sans-serif", available: true, rendered: "Fixture Display", chars: 100, samples: ["p"] }],
    ...measurement,
  };
  fs.writeFileSync(path.join(change, drift.BUILT_STYLES_FILE), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

// --- pure parts ----------------------------------------------------------------------------------

test("CIEDE2000 reproduces the Sharma, Wu and Dalal reference pairs", () => {
  const pairs = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ];
  for (const [a, b, expected] of pairs) {
    assert.equal(Number(drift.deltaE2000Lab(a, b).toFixed(4)), expected);
    assert.equal(Number(drift.deltaE2000Lab(b, a).toFixed(4)), expected);
  }
  assert.equal(drift.deltaE2000([51, 102, 255], [51, 102, 255]), 0);
  // White is L* 100 under D65.
  assert.ok(Math.abs(drift.toLab([255, 255, 255])[0] - 100) < 1e-3);
});

test("DESIGN.md tokens resolve aliases, read font stacks and report what they cannot compare", () => {
  const tokens = drift.designTokens([
    "---",
    "colors:",
    "  primary: \"#36F\"",
    "  accent: \"{colors.primary}\"",
    "  loop: \"{colors.loop}\"",
    "  muted: rgb(1 2 3)",
    "typography:",
    "  display:",
    "    fontFamily: \"'Fixture Display', serif\"",
    "  body:",
    "    fontFamily: Fixture Display",
    "  mono:",
    "    fontFamily: Fixture Mono, monospace",
    "---",
  ].join("\n"));
  assert.deepEqual(tokens.colors.map((token) => [token.name, token.hex]), [["primary", "#3366ff"], ["accent", "#3366ff"]]);
  assert.deepEqual(tokens.unreadable.map((item) => item.name), ["loop", "muted"]);
  assert.deepEqual(tokens.fonts.map((font) => [font.family, font.tokens]), [
    ["Fixture Display", ["typography.display", "typography.body"]],
    ["Fixture Mono", ["typography.mono"]],
  ]);
  assert.deepEqual(drift.baselineGaps(tokens), []);
  assert.equal(drift.baselineGaps(drift.designTokens("---\nname: x\n---\n")).length, 2);
});

test("comparison weighs drift by share and names a concrete fix for every finding", () => {
  const tokens = drift.designTokens(fs.readFileSync(path.join(FIXTURES, "design-tokens.md"), "utf8"));
  const findings = drift.compareBuiltStyles({
    totals: { text: 200, surface: 1000000, border: 20, graphic: 0 },
    colors: [
      { hex: "#ffffff", weights: { surface: 900000 } },
      { hex: "#1a1a2e", weights: { text: 199 } },
      // within tolerance of primary: matched, not drift
      { hex: "#3467ff", weights: { surface: 50000 } },
      // past tolerance and 5% of the painted area: major
      { hex: "#3a6df0", weights: { surface: 50000 } },
      // one character and a hairline: minor
      { hex: "#ff00aa", weights: { text: 1, border: 20 } },
    ],
    fonts: [
      { family: "Fixture Display", available: true, chars: 150 },
      { family: "serif", available: true, chars: 50 },
    ],
  }, tokens);
  const major = findings.filter((item) => item.severity === "major");
  assert.deepEqual(major.map((item) => [item.kind, item.implemented]), [["color", "#3a6df0"], ["font", "serif"]]);
  assert.equal(major[0].specified, "#3366ff");
  assert.ok(major[0].deltaE > drift.DELTA_E_TOLERANCE && major[0].deltaE < 3);
  const stray = findings.find((item) => item.implemented === "#ff00aa");
  assert.equal(stray.severity, "minor");
  assert.ok(findings.every((item) => typeof item.fix === "string" && item.fix.length > 20), "every finding carries a fix");
  // Aliases count as used when their target colour is painted.
  assert.ok(!findings.some((item) => item.value === "colors.accent"));
});

test("a reconciliation row covers a drift only when its Implemented cell names the measured value", () => {
  const colour = { kind: "color", implemented: "#aabbcc" };
  const font = { kind: "font", implemented: "DejaVu Serif" };
  const rows = [
    { index: 1, implemented: "button fill measured darker on render" },
    { index: 2, implemented: "#ABC on the CTA" },
    { index: 3, implemented: "dejavu serif fallback" },
  ];
  assert.equal(drift.coveringRow(colour, rows), 2);
  assert.equal(drift.coveringRow(font, rows), 3);
  assert.equal(drift.coveringRow(colour, rows.slice(0, 1)), null);
  assert.equal(drift.coveringRow({ kind: "color", implemented: "#abcdef" }, rows), null);
});

test("the project root of an OpenSpec change is inferred from its path", () => {
  const base = path.join(os.tmpdir(), "p");
  assert.equal(inferProjectRoot(path.join(base, "openspec", "changes", "x")), base);
  assert.equal(inferProjectRoot(path.join(base, "elsewhere")), path.join(base, "elsewhere"));
});

// --- gate, with written measurements -------------------------------------------------------------

test("a current on-token measurement keeps the gate ready and lands in specDrift", () => {
  const fixture = project("on-token.html");
  writeMeasurement(fixture);
  const result = checkSpecReconciliation(fixture.change);
  assert.equal(result.status, "ready", result.blockers.join("\n"));
  assert.equal(result.specDrift.measured.current, true);
  assert.equal(result.specDrift.measured.major, 0);
  assert.equal(result.specDrift.measured.tolerance, drift.DELTA_E_TOLERANCE);
  assert.equal(result.measured, result.specDrift.measured);
});

test("a measurement goes stale when the page or DESIGN.md changes", () => {
  const fixture = project("on-token.html");
  writeMeasurement(fixture);
  fs.appendFileSync(path.join(fixture.dir, "index.html"), "<!-- edited -->\n");
  const page = checkSpecReconciliation(fixture.change);
  assert.equal(page.reason, "reconciliation-measurement-stale");
  assert.match(page.blockers[0], /built page .* changed .* reconciliation measure/);
  assert.equal(page.measured.current, false);

  const other = project("on-token.html");
  writeMeasurement(other);
  fs.appendFileSync(path.join(other.dir, "DESIGN.md"), "\nMore prose.\n");
  assert.equal(checkSpecReconciliation(other.change).reason, "reconciliation-measurement-stale");
});

test("a malformed or empty measurement is refused, never read as a clean page", () => {
  const broken = project("on-token.html");
  fs.writeFileSync(path.join(broken.change, drift.BUILT_STYLES_FILE), "{ nope");
  assert.equal(checkSpecReconciliation(broken.change).reason, "reconciliation-measurement-malformed");

  const empty = project("on-token.html");
  writeMeasurement(empty, { colors: [], fonts: [] });
  const result = checkSpecReconciliation(empty.change);
  assert.equal(result.reason, "reconciliation-measurement-malformed");
  assert.match(result.blockers[0], /empty capture/);

  const escaping = project("on-token.html");
  writeMeasurement(escaping, { designFile: "../../etc/DESIGN.md" });
  assert.equal(checkSpecReconciliation(escaping.change).reason, "reconciliation-measurement-malformed");
});

test("a DESIGN.md without colour or font tokens blocks instead of passing every page", () => {
  const fixture = project("on-token.html", { design: "---\nname: No tokens\n---\n\n# No tokens\n" });
  writeMeasurement(fixture);
  const result = checkSpecReconciliation(fixture.change);
  assert.equal(result.reason, "reconciliation-baseline-empty");
  assert.match(result.blockers[0], /no hex colour token .* no `fontFamily`/);
});

test("measured drift blocks only an applicable change and warns otherwise", () => {
  const fixture = project("on-token.html");
  writeMeasurement(fixture, { colors: [{ hex: "#ff0000", weights: { surface: 1000000 }, samples: ["body"] }] });
  assert.equal(checkSpecReconciliation(fixture.change).reason, "reconciliation-measured-drift");
  fs.rmSync(path.join(fixture.change, "reference.md"));
  const loose = checkSpecReconciliation(fixture.change);
  assert.equal(loose.status, "ready");
  assert.ok(loose.warnings.some((item) => item.code === "reconciliation-measured-drift"));
});

test("an applicable change with a built page and tokens but no measurement is warned with the command", () => {
  const fixture = project("on-token.html");
  const result = checkSpecReconciliation(fixture.change);
  assert.equal(result.status, "ready");
  const warning = result.warnings.find((item) => item.code === "reconciliation-unmeasured");
  assert.ok(warning);
  assert.match(warning.message, /reconciliation measure --change-root openspec\/changes\/measured/);
  // No built page: nothing to measure, nothing to warn about.
  const unbuilt = project(null);
  assert.ok(!checkSpecReconciliation(unbuilt.change).warnings.some((item) => item.code === "reconciliation-unmeasured"));
});

// --- real pages in headless Chromium -------------------------------------------------------------

test("an on-token page measures clean through color(), named colours and hidden off-token text", { skip }, () => {
  const fixture = project("on-token.html");
  const measured = measure(fixture.dir);
  assert.equal(measured.status, 0, measured.stderr || measured.stdout);
  assert.equal(measured.output.status, "measured");
  const record = JSON.parse(fs.readFileSync(path.join(fixture.change, drift.BUILT_STYLES_FILE), "utf8"));
  assert.equal(record.schema, drift.BUILT_STYLES_SCHEMA);
  assert.equal(record.page, pageDigest(fixture.dir));
  assert.deepEqual(record.colors.map((item) => item.hex).sort(), ["#1a1a2e", "#3366ff", "#ffffff"]);
  assert.ok(!record.colors.some((item) => ["#ff0000", "#00ff00"].includes(item.hex)), "hidden and transparent text does not paint");
  assert.deepEqual(record.fonts.map((font) => [font.family, font.available]), [["Fixture Display", true]]);
  const result = check(fixture.dir);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.output.status, "ready");
  assert.equal(result.output.specDrift.measured.major, 0);
});

test("a drifted page blocks until each measured drift is reconciled by value", { skip }, () => {
  const fixture = project("drifted.html");
  assert.equal(measure(fixture.dir).status, 0);
  const blocked = check(fixture.dir);
  assert.equal(blocked.status, 2);
  assert.equal(blocked.output.reason, "reconciliation-measured-drift");
  const major = blocked.output.specDrift.measured.findings.filter((item) => item.severity === "major");
  assert.deepEqual(major.map((item) => item.implemented).sort(), ["#3a6df0", "#767682", "DejaVu Serif"].sort());
  // The translucent ink is composited over white, not read as its opaque token.
  assert.ok(major.some((item) => item.implemented === "#767682" && item.samples.includes("p.muted")));
  // The 1px off-token rule is a stray: a warning, not a blocker.
  assert.ok(blocked.output.warnings.some((item) => item.code === "reconciliation-measured-minor" && /#ff00aa/.test(item.message)));
  assert.ok(blocked.output.blockers.every((item) => /Fix: /.test(item)));

  // Prose that never names the measured value does not account for it.
  fs.writeFileSync(path.join(fixture.change, "design.md"), RECONCILIATION([
    "| colors.primary | #3366ff | button fill shifted on render | render showed the CTA slightly greener |",
  ]));
  assert.equal(check(fixture.dir).output.specDrift.measured.uncovered, 3);

  fs.writeFileSync(path.join(fixture.change, "design.md"), RECONCILIATION([
    "| colors.primary | #3366ff | #3a6df0 | render showed the CTA fill measured at #3a6df0 |",
    "| colors.ink muted | #1a1a2e | rgba ink, composited #767682 | render showed helper text at 60% ink |",
    "| typography.body | Fixture Display | DejaVu Serif | render showed the note paragraph in the fallback serif |",
  ]));
  const reconciled = check(fixture.dir);
  assert.equal(reconciled.status, 0, reconciled.stdout);
  assert.deepEqual(reconciled.output.specDrift.measured.findings.filter((item) => item.severity === "major").map((item) => item.coveredBy).sort(), [1, 2, 3]);

  // A page edited after measuring is stale, whatever the table says.
  fs.appendFileSync(path.join(fixture.dir, "index.html"), "<!-- edited after measuring -->\n");
  const stale = check(fixture.dir);
  assert.equal(stale.output.reason, "reconciliation-measurement-stale");
});

test("a token family the page names but never loads is drift, not a match", { skip }, () => {
  const fixture = project("missing-font.html", { font: false });
  assert.equal(measure(fixture.dir).status, 0);
  const record = JSON.parse(fs.readFileSync(path.join(fixture.change, drift.BUILT_STYLES_FILE), "utf8"));
  const display = record.fonts.find((font) => font.family === "Fixture Display");
  assert.equal(display.available, false);
  assert.notEqual(display.rendered, "Fixture Display");
  const result = check(fixture.dir);
  assert.equal(result.output.reason, "reconciliation-measured-drift");
  assert.ok(result.output.blockers.some((item) => /names Fixture Display .* has no such font/.test(item)));
});

test("measure refuses a DESIGN.md with no tokens and a project with no page, writing nothing", { skip }, () => {
  const noTokens = project("on-token.html", { design: "---\nname: No tokens\n---\n" });
  const refused = measure(noTokens.dir);
  assert.equal(refused.status, 1);
  assert.equal(refused.output.error.code, "BASELINE_EMPTY");
  assert.ok(!fs.existsSync(path.join(noTokens.change, drift.BUILT_STYLES_FILE)));

  const unbuilt = project(null);
  const missing = measure(unbuilt.dir);
  assert.equal(missing.status, 1);
  assert.equal(missing.output.error.code, "PAGE_MISSING");
  assert.ok(!fs.existsSync(path.join(unbuilt.change, drift.BUILT_STYLES_FILE)));
});
