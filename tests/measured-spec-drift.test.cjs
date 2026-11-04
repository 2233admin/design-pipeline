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

// Every temporary project is removed when the file finishes, so the suite leaves nothing in tmp.
const created = [];
test.after(() => {
  for (const dir of created) fs.rmSync(dir, { recursive: true, force: true });
});

// A project with DESIGN.md tokens, a built page and a change that has a reference, so the gate applies.
function project(page, { design = fs.readFileSync(path.join(FIXTURES, "design-tokens.md"), "utf8"), font = true } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "measured-drift-")));
  created.push(dir);
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
    lineage: {},
    capturedAt: "2026-11-04T02:00:00Z",
    scope: drift.MEASUREMENT_SCOPE,
    totals: { text: 100, surface: 1000000, border: 0, graphic: 0 },
    colors: [
      { hex: "#ffffff", weights: { surface: 900000 }, samples: ["canvas"] },
      { hex: "#1a1a2e", weights: { text: 100 }, samples: ["p"] },
      { hex: "#3366ff", weights: { surface: 100000 }, samples: ["button.cta"] },
    ],
    fonts: [{ family: "Fixture Display", first: "Fixture Display", stack: "\"Fixture Display\", sans-serif", available: true, rendered: "Fixture Display", chars: 100, samples: ["p"] }],
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
    { index: 3, implemented: "\"DejaVu Serif\", serif" },
  ];
  assert.equal(drift.coveringRow(colour, rows), 2);
  assert.equal(drift.coveringRow(font, rows), 3);
  assert.equal(drift.coveringRow(colour, rows.slice(0, 1)), null);
  assert.equal(drift.coveringRow({ kind: "color", implemented: "#abcdef" }, rows), null);
});

test("a font row covers only a whole family entry, never a substring", () => {
  const rows = [
    { index: 1, implemented: "sans-serif" },
    { index: 2, implemented: "Interstate, Helvetica" },
    { index: 3, implemented: "'Inter', sans-serif" },
  ];
  assert.equal(drift.coveringRow({ kind: "font", implemented: "serif" }, rows), null);
  assert.equal(drift.coveringRow({ kind: "font", implemented: "Inter" }, rows), 3);
  assert.equal(drift.coveringRow({ kind: "font", implemented: "Interstate" }, rows), 2);
  assert.equal(drift.coveringRow({ kind: "font", implemented: "Helvetica Neue" }, rows), null);
  // Hex is compared normalised: #ABC names #aabbcc; #aabbc0 is not covered by #aabbcc.
  assert.equal(drift.coveringRow({ kind: "color", implemented: "#AABBCC" }, [{ index: 4, implemented: "#abc" }]), 4);
  assert.equal(drift.coveringRow({ kind: "color", implemented: "#aabbc0" }, [{ index: 4, implemented: "#aabbcc" }]), null);
});

test("fonts are compared by the family that renders, while a token family that never loads stays drift", () => {
  const tokens = drift.designTokens(fs.readFileSync(path.join(FIXTURES, "design-tokens.md"), "utf8"));
  const base = { totals: { text: 100, surface: 0, border: 0, graphic: 0 }, colors: [] };
  const viaStack = drift.compareBuiltStyles({ ...base, fonts: [{ family: "Fixture Display", first: "Zzqx Sans", available: false, rendered: "Fixture Display", chars: 100 }] }, tokens);
  assert.deepEqual(viaStack.filter((item) => item.kind === "font"), []);
  const unloaded = drift.compareBuiltStyles({ ...base, fonts: [{ family: "DejaVu Sans", first: "Fixture Display", available: false, rendered: "DejaVu Sans", chars: 100 }] }, tokens);
  assert.deepEqual(unloaded.filter((item) => item.severity === "major").map((item) => [item.specified, item.implemented]), [["Fixture Display", "DejaVu Sans"]]);
  // Nothing in the stack confirmed: the first family named stands in.
  const unknown = drift.compareBuiltStyles({ ...base, fonts: [{ family: "Zzqx Sans", first: "Zzqx Sans", available: false, rendered: null, chars: 100 }] }, tokens);
  assert.ok(unknown.some((item) => item.severity === "major" && item.implemented === "Zzqx Sans"));
});

test("a colour far from every token blocks on a control, as the background, or repeated, whatever its share", () => {
  const tokens = drift.designTokens(fs.readFileSync(path.join(FIXTURES, "design-tokens.md"), "utf8"));
  const totals = { text: 1000, surface: 10000000, border: 100, graphic: 0 };
  const severity = (entry) => drift.compareBuiltStyles({ totals, fonts: [], colors: [entry] }, tokens).find((item) => item.implemented === entry.hex)?.severity;
  assert.equal(severity({ hex: "#e0115f", weights: { surface: 7680 }, elements: { surface: 1 }, interactive: 1 }), "major");
  assert.equal(severity({ hex: "#e0115f", weights: { surface: 7680 }, elements: { surface: 1 }, interactive: 0 }), "minor");
  assert.equal(severity({ hex: "#ff00aa", weights: { border: 26 }, elements: { border: 3 }, interactive: 0 }), "major");
  assert.equal(severity({ hex: "#ff00aa", weights: { border: 26 }, elements: { border: 2 }, interactive: 0 }), "minor");
  assert.equal(severity({ hex: "#202020", weights: { canvas: 5000000 }, elements: {}, interactive: 0 }), "major");
  // Near a token (CIEDE2000 2.8, not past 10): a small control stays a stray.
  assert.equal(severity({ hex: "#3a6df0", weights: { surface: 7680 }, elements: { surface: 1 }, interactive: 1 }), "minor");
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
  assert.ok(result.specDrift.measured.scope.notMeasured.some((item) => /dark colour scheme/.test(item)));
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
  assert.deepEqual(Object.keys(record.lineage).sort(), ["fixture.woff", "index.html"]);
  assert.deepEqual(record.scope, drift.MEASUREMENT_SCOPE);
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
  const display = record.fonts.find((font) => font.first === "Fixture Display");
  assert.equal(display.available, false);
  assert.notEqual(display.rendered, "Fixture Display");
  assert.equal(display.family, display.rendered);
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

test("a token family reached through the stack is not drift, and the first family is kept", { skip }, () => {
  const fixture = project("font-stack.html");
  assert.equal(measure(fixture.dir).status, 0);
  const record = JSON.parse(fs.readFileSync(path.join(fixture.change, drift.BUILT_STYLES_FILE), "utf8"));
  assert.deepEqual(record.fonts.map((font) => [font.first, font.available, font.rendered, font.family]), [["Zzqx Sans", false, "Fixture Display", "Fixture Display"]]);
  const result = check(fixture.dir);
  assert.equal(result.status, 0, result.stdout);
  assert.ok(!result.output.specDrift.measured.findings.some((item) => item.kind === "font"));
});

test("an off-token primary CTA blocks though it is a fraction of a percent of the page", { skip }, () => {
  const fixture = project("loud-cta.html");
  assert.equal(measure(fixture.dir).status, 0);
  const result = check(fixture.dir);
  assert.equal(result.output.reason, "reconciliation-measured-drift");
  const cta = result.output.specDrift.measured.findings.find((item) => item.implemented === "#e0115f");
  assert.equal(cta.severity, "major");
  assert.ok(cta.share < drift.MAJOR_SHARE, `share ${cta.share}`);
  assert.ok(cta.deltaE > drift.LOUD_DELTA_E);
  assert.match(cta.loud, /interactive/);
});

test("26 cards with a 1px off-token border block, and partial opacity is composited", { skip }, () => {
  const fixture = project("card-borders.html");
  assert.equal(measure(fixture.dir).status, 0);
  const record = JSON.parse(fs.readFileSync(path.join(fixture.change, drift.BUILT_STYLES_FILE), "utf8"));
  const border = record.colors.find((item) => item.hex === "#ff00aa");
  assert.equal(border.elements.border, 26);
  // Black text under a 50% ancestor composites over white to mid grey.
  const faded = record.colors.find((item) => item.samples.includes("p") && item.weights.text);
  assert.ok(faded && /^#(7f|80)(7f|80)(7f|80)$/.test(faded.hex), JSON.stringify(record.colors));
  const result = check(fixture.dir);
  const finding = result.output.specDrift.measured.findings.find((item) => item.implemented === "#ff00aa");
  assert.equal(finding.severity, "major");
  assert.ok(finding.share < drift.MAJOR_SHARE);
  assert.match(finding.loud, /26 elements/);
  assert.equal(result.output.reason, "reconciliation-measured-drift");
});

test("swapping a font file the page loads makes the measurement stale", { skip }, () => {
  const fixture = project("on-token.html");
  assert.equal(measure(fixture.dir).status, 0);
  // index.html names no font file, so the page digest alone cannot see this swap.
  assert.equal(check(fixture.dir).output.status, "ready");
  fs.copyFileSync(path.join(repoRoot, "skill/tools/art-motion/fonts/LilitaOne-400.woff"), path.join(fixture.dir, "fixture.woff"));
  const stale = check(fixture.dir);
  assert.equal(stale.output.reason, "reconciliation-measurement-stale");
  assert.match(stale.output.blockers[0], /fixture\.woff, which the page loaded, changed/);
});

test("measure on a change without a reference says its drift will only warn", { skip }, () => {
  const fixture = project("drifted.html");
  fs.rmSync(path.join(fixture.change, "reference.md"));
  const result = measure(fixture.dir);
  assert.equal(result.status, 0);
  assert.equal(result.output.applicable, false);
  assert.match(result.output.note, /no reference .* warnings, not blockers/);
  assert.equal(result.output.gate.status, "ready");
  assert.ok(result.output.gate.major > 0);

  const applicable = project("drifted.html");
  const owed = measure(applicable.dir);
  assert.equal(owed.output.applicable, true);
  assert.equal(owed.output.note, undefined);
  assert.equal(owed.output.gate.reason, "reconciliation-measured-drift");
});
