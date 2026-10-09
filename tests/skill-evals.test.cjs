"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { allowedRoutes, allowedStates, knownJobs, loadManifest, validateEvals } = require("../skill/scripts/validate-evals.cjs");

const repoRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(repoRoot, "skill", "evals", "evals.json");
const validatorPath = path.join(repoRoot, "skill", "scripts", "validate-evals.cjs");
const cliPath = path.join(repoRoot, "skill", "scripts", "designer-pipeline.cjs");
const manifest = loadManifest(manifestPath);
const frontDoor = require("./helpers/skill-surface.cjs").readSkillSurface();
const behaviorFixtures = path.join(repoRoot, "evals", "cases", "skill-behavior");

function runCli(root, args, exitCode = 0) {
  const result = spawnSync(process.execPath, [cliPath, ...args, "--root", root, "--json"], {
    cwd: repoRoot, encoding: "utf8", windowsHide: true,
  });
  assert.equal(result.status, exitCode, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function checkOutcome(item, root, outcome) {
  assert.equal(outcome.state, item.expectedState, `${item.id}: state`);
  for (const signal of item.requiredSignals) assert.equal(outcome.signals[signal], true, `${item.id}: ${signal}`);
  for (const artifact of item.requiredArtifacts) {
    const file = path.join(root, artifact);
    assert.ok(fs.existsSync(file) && fs.statSync(file).isFile() && fs.statSync(file).size > 0, `${item.id}: ${artifact}`);
  }
}

function writeJson(root, file, value) {
  fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
}

let browserTools;
try {
  browserTools = { chromium: require("playwright").chromium, chrome: require("../skill/scripts/film-capture-core.cjs").resolveChrome() };
} catch (error) {
  if (error.code !== "TOOL_MISSING" && error.code !== "MODULE_NOT_FOUND") throw error;
  browserTools = { skip: error.message };
}

function runValidator(file) {
  return spawnSync(process.execPath, [validatorPath, file], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function runRoute(query) {
  return spawnSync(process.execPath, [cliPath, "route", "--root", repoRoot, "--query", query, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

test("bundled skill eval manifest is valid and covers the supported routes", () => {
  assert.deepEqual(validateEvals(manifest), []);
  assert.deepEqual(new Set(manifest.cases.map((item) => item.expectedRoute)), allowedRoutes);
  assert.deepEqual(new Set(manifest.cases.map((item) => item.expectedState)), new Set(["ready", "blocked"]));
  assert.ok(allowedStates.has("blocked"));
  assert.ok(manifest.cases.some((item) => item.expectedState === "blocked" && item.requiredSignals.includes("fail-closed")));
  assert.ok(manifest.source.upstream.some((url) => url.includes("frontend-design/SKILL.md")));
  assert.ok(manifest.source.upstream.some((url) => url.includes("skill-creator/SKILL.md")));
  assert.ok(manifest.source.upstream.some((url) => url.includes("webapp-testing/SKILL.md")));
  for (const route of allowedRoutes) {
    assert.match(frontDoor, new RegExp(`\\| \`${route}\` \\|`), `${route} is missing from the front-door map`);
  }
  assert.ok(manifest.cases.every((item) => knownJobs.has(item.expectedJob)));
});

test("representative prompts dispatch to canonical job IDs", () => {
  for (const item of manifest.cases) {
    const result = runRoute(item.prompt);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.job, item.expectedJob, `${item.id} dispatched to ${output.job}`);
  }
});

// Frozen independent-agent outputs test product behavior; they do not generate or assess a fresh agent response.
test("supporting CSS eval observes real focus, motion and preserved layout", { skip: browserTools.skip }, async (t) => {
  const item = manifest.cases.find((entry) => entry.id === "supporting-css-focus-motion");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-eval-css-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.copyFileSync(path.join(behaviorFixtures, "result.css"), path.join(root, "result.css"));
  const browser = await browserTools.chromium.launch({ executablePath: browserTools.chrome, headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: "no-preference" });
    const render = (css) => page.setContent(`<!doctype html><style>${css}</style><button class="save">保存</button>`);
    const snapshot = () => page.locator(".save").evaluate((el) => {
      const css = getComputedStyle(el), box = el.getBoundingClientRect();
      return { paletteLayout: [css.backgroundColor, css.color, css.padding, css.borderWidth, css.borderRadius, box.width, box.height],
        focus: [document.activeElement === el, el.matches(":focus-visible"), css.outlineStyle, css.outlineWidth], duration: css.transitionDuration };
    });
    await render(fs.readFileSync(path.join(behaviorFixtures, "input.css"), "utf8"));
    const baseline = await snapshot();
    await page.keyboard.press("Tab");
    assert.equal((await snapshot()).focus[2], "none", "raw input must reproduce the missing focus ring");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.notEqual((await snapshot()).duration, "0s", "raw input must reproduce unwanted motion");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await render(fs.readFileSync(path.join(root, "result.css"), "utf8"));
    const updated = await snapshot();
    assert.deepEqual(updated.paletteLayout, baseline.paletteLayout);
    await page.keyboard.press("Tab");
    const focused = await snapshot();
    assert.deepEqual(focused.focus, [true, true, "solid", "2px"]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reduced = await snapshot();
    assert.equal(reduced.duration, "0s");
    await page.emulateMedia({ forcedColors: "active" });
    const forced = await snapshot();
    assert.deepEqual(forced.focus, [true, true, "solid", "2px"]);
    writeJson(root, "evidence.json", { browser: browser.version(), baseline, focused, reduced, forced });
    const signals = {
      "css-artifact-footprint": fs.readdirSync(root).length === 2 && !fs.existsSync(path.join(root, ".design-pipeline")),
      "palette-layout-preserved": JSON.stringify(updated.paletteLayout) === JSON.stringify(baseline.paletteLayout),
      "keyboard-focus": focused.focus.every((value, index) => value === [true, true, "solid", "2px"][index]),
      "reduced-motion": reduced.duration === "0s", "forced-colors": forced.focus[2] === "solid" && forced.focus[3] === "2px",
    };
    checkOutcome(item, root, { state: Object.values(signals).every(Boolean) ? "ready" : "blocked", signals });
  } finally { await browser.close(); }
});

test("quick Chinese page eval checks browser behavior and the public workflow", { skip: browserTools.skip }, async (t) => {
  const item = manifest.cases.find((entry) => entry.id === "quick-chinese-profile-page");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-eval-page-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const start = runCli(root, ["next", "--project-root", ".", "--deliverable", "ui", "--tier", "quick", "--mode", "freeform"]);
  assert.equal(start.type, "run");
  assert.equal(start.stage, "work");
  fs.copyFileSync(path.join(behaviorFixtures, "index.html"), path.join(root, "index.html"));
  const browser = await browserTools.chromium.launch({ executablePath: browserTools.chrome, headless: true });
  try {
    const page = await browser.newPage({ locale: "zh-CN", reducedMotion: "reduce" });
    const errors = [], externalRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
    await page.goto(pathToFileURL(path.join(root, "index.html")).href);
    const name = page.getByRole("textbox", { name: "姓名", exact: true });
    const email = page.getByRole("textbox", { name: "邮箱", exact: true });
    const toggle = page.getByRole("switch", { name: "接收通知" });
    const save = page.getByRole("button", { name: "保存资料" });
    await save.click();
    const required = [await name.evaluate((el) => el.validity.valueMissing), await email.evaluate((el) => el.validity.valueMissing)];
    assert.deepEqual(required, [true, true]);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await name.fill("林晓雨");
    await email.fill("not-an-email");
    await save.click();
    const invalidEmail = await email.evaluate((el) => el.validity.typeMismatch);
    assert.equal(invalidEmail, true);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await email.fill("xiaoyu@example.com");
    await name.focus();
    await page.keyboard.press("Tab");
    assert.equal(await email.evaluate((el) => document.activeElement === el), true);
    await page.keyboard.press("Tab");
    assert.equal(await toggle.evaluate((el) => document.activeElement === el), true);
    await page.keyboard.press("Space");
    assert.equal(await toggle.isChecked(), false);
    await page.keyboard.press("Tab");
    assert.equal(await save.evaluate((el) => document.activeElement === el), true);
    await page.keyboard.press("Enter");
    const success = await page.getByRole("status").innerText();
    assert.equal(success, "资料已保存。");
    await page.reload();
    const saved = { name: await name.inputValue(), email: await email.inputValue(), notifications: await toggle.isChecked() };
    assert.deepEqual(saved, { name: "林晓雨", email: "xiaoyu@example.com", notifications: false });
    await page.setViewportSize({ width: 320, height: 900 });
    const size = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert.deepEqual(size, [320, 320]);
    const animationCount = await page.evaluate(() => document.getAnimations().length);
    assert.equal(animationCount, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    writeJson(root, "evidence.json", { browser: browser.version(), required, invalidEmail, success, saved, size, animationCount, errors, externalRequests });
    runCli(root, ["decide", "--project-root", ".", "--stage", "deliver", "--answer", "index.html; evidence.json: browser behavior checked; Visual Acceptance not-evaluated"]);
    const next = runCli(root, ["next", "--project-root", "."]);
    writeJson(root, "next.json", next);
    assert.equal(next.type, "done");
    assert.equal(next.visualAcceptance, "not-evaluated");
    assert.deepEqual(next.evidence.gates, {});
    const state = JSON.parse(fs.readFileSync(path.join(root, ".design-pipeline/state.json"), "utf8"));
    assert.deepEqual([state.deliverable, state.tier, state.mode], ["ui", "quick", "freeform"]);
    checkOutcome(item, root, { state: next.type === "done" ? "ready" : next.type, signals: {
      "quick-workflow": state.deliverable === "ui" && state.tier === "quick" && state.mode === "freeform",
      "required-validation": required.every(Boolean), "email-validation": invalidEmail, "keyboard-save": success === "资料已保存。",
      "reload-persistence": saved.name === "林晓雨" && saved.email === "xiaoyu@example.com" && saved.notifications === false,
      "responsive": size[0] === size[1] && size[1] === 320, "no-animation": animationCount === 0,
      "user-acceptance-separate": next.visualAcceptance === "not-evaluated" && Object.keys(next.evidence.gates).length === 0,
    } });
  } finally { await browser.close(); }
});

test("missing reference eval runs the fail-closed CLI and preserves pending input", (t) => {
  const item = manifest.cases.find((entry) => entry.id === "blocked-reference-source");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-eval-blocked-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const fixtures = require("./helpers/reference-fixtures.cjs");
  fixtures.writeReference(root, fixtures.fixedCameraReference({ source: fixtures.pendingSource({ pendingReason: "No reference file was supplied." }) }));
  const original = fs.readFileSync(path.join(root, "reference-evidence.json"));
  const checked = runCli(root, ["reference", "check", "--change-root", "."], 2);
  writeJson(root, "reference-check.json", checked);
  assert.equal(checked.status, "blocked");
  assert.equal(checked.reason, "source-pending");
  assert.deepEqual([checked.reference.source.path, checked.reference.source.sha256], [null, null]);
  const rejected = runCli(root, ["reference", "resolve", "--change-root", ".", "--path", "missing.png"], 1);
  assert.equal(rejected.error.code, "CONTRACT_INVALID");
  assert.deepEqual(fs.readFileSync(path.join(root, "reference-evidence.json")), original);
  checkOutcome(item, root, { state: checked.status, signals: {
    "source-pending": checked.reference.source.availability === "pending", "blocked": checked.status === "blocked",
    "unlock-action": checked.reference.source.requestedFrom === "the user" && rejected.error.code === "CONTRACT_INVALID",
    "fail-closed": checked.reference.source.path === null && checked.reference.source.sha256 === null
      && fs.readFileSync(path.join(root, "reference-evidence.json")).equals(original),
  } });
  assert.throws(() => checkOutcome({ ...item, expectedState: "ready" }, root, { state: checked.status, signals: {} }));
  assert.throws(() => checkOutcome(item, root, { state: checked.status, signals: {} }));
  assert.throws(() => checkOutcome({ ...item, requiredSignals: [], requiredArtifacts: ["not-generated.json"] }, root, { state: checked.status, signals: {} }));
});

test("validator rejects duplicate cases, unsafe artifacts, unknown routes, and malformed source URLs", () => {
  const invalid = structuredClone(manifest);
  invalid.cases[1].id = invalid.cases[0].id;
  invalid.cases[1].expectedRoute = "unknown-route";
  invalid.cases[1].expectedJob = "unknown-job";
  invalid.cases[1].expectedState = "unknown-state";
  invalid.cases[1].requiredArtifacts = ["../outside.json"];
  invalid.cases[1].fixtures = ["../outside-fixture.json"];
  invalid.source.upstream[0] = "https://";
  const errors = validateEvals(invalid);
  assert.ok(errors.some((error) => error.includes("must be unique")));
  assert.ok(errors.some((error) => error.includes("unsupported")));
  assert.ok(errors.some((error) => error.includes("expectedJob is unknown")));
  assert.ok(errors.some((error) => error.includes("expectedState is unsupported")));
  assert.ok(errors.some((error) => error.includes("is invalid")));
  assert.ok(errors.some((error) => error.includes("source.upstream[0]")));
  const mismatched = structuredClone(manifest);
  mismatched.cases[0].expectedRoute = "dynamic-web-verification";
  assert.ok(validateEvals(mismatched).some((error) => error.includes("not declared by expectedJob")));
  for (const state of ["needs-clarification", "unverified"]) {
    const invalidState = structuredClone(manifest);
    invalidState.cases[0].expectedState = state;
    assert.ok(validateEvals(invalidState).some((error) => error.includes("expectedState is unsupported")));
  }
});

test("fixture paths are contained by the manifest directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-evals-root-"));
  try {
    const valid = structuredClone(manifest);
    valid.cases[0].fixtures = ["fixtures/reference.png"];
    assert.deepEqual(validateEvals(valid, { baseDir: root }), []);
    const invalid = structuredClone(manifest);
    invalid.cases[0].fixtures = ["../../outside.png"];
    assert.ok(validateEvals(invalid, { baseDir: root }).some((error) => error.includes("fixtures[0] is invalid")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("validator CLI reports a machine-readable success envelope", () => {
  const result = runValidator(manifestPath);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.schema, "design-pipeline.skill-eval-result.v1");
  assert.equal(output.ok, true);
  assert.equal(output.caseCount, manifest.cases.length);
  assert.deepEqual(output.errors, []);
});

test("validator CLI rejects malformed JSON without throwing to the caller", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-evals-"));
  const malformed = path.join(root, "evals.json");
  try {
    fs.writeFileSync(malformed, "{ malformed");
    const result = runValidator(malformed);
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.schema, "design-pipeline.skill-eval-result.v1");
    assert.equal(output.ok, false);
    assert.equal(output.caseCount, null);
    assert.equal(output.errors.length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
