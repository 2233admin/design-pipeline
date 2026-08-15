"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { checkComponentFirstGate } = require("../skill/scripts/component-first-core.cjs");
const { decodePng } = require("../skill/scripts/component-first/adapters/evidence-loader.cjs");
const { createComponentFirstFixture, rgbaPng, sha256 } = require("./fixtures/component-first-fixture.cjs");

const repoRoot = path.resolve(__dirname, "..");
const gatesRoot = path.join(repoRoot, "skill", "scripts", "component-first", "gates");

test("gate modules have no filesystem, browser, process, existing-core, or cross-gate imports", () => {
  const gateFiles = fs.readdirSync(gatesRoot).filter((name) => name.endsWith("-gate.cjs"));
  for (const name of gateFiles) {
    const source = fs.readFileSync(path.join(gatesRoot, name), "utf8");
    assert.doesNotMatch(source, /node:(?:fs|child_process)|\bprocess\b|playwright|puppeteer/i, name);
    assert.doesNotMatch(source, /(?:frontend-stack|component-capability|playground)-core/, name);
    for (const other of gateFiles.filter((entry) => entry !== name)) assert.equal(source.includes(`./${other}`), false, `${name} imports ${other}`);
  }
});

test("facade stays thin and delegates without domain constants", () => {
  const source = fs.readFileSync(path.join(repoRoot, "skill", "scripts", "component-first-core.cjs"), "utf8");
  assert.ok(source.split(/\r?\n/).length < 30);
  assert.doesNotMatch(source, /baselineComponentRoles|node:fs|playground-core|frontend-stack-core|component-capability-core/);
});

test("PNG adapter fully decodes scanlines and rejects corrupt, truncated, tiny, transparent, and mislabeled evidence", (t) => {
  assert.deepEqual(decodePng(rgbaPng(96, 64)), {
    width: 96, height: 64, bitDepth: 8, colorType: 6, interlaced: false, hasTransparency: false, allTransparent: false,
  });
  const corrupt = Buffer.from(rgbaPng(96, 64));
  corrupt[corrupt.length - 5] ^= 0xff;
  assert.throws(() => decodePng(corrupt), /CRC|IEND/);
  assert.throws(() => decodePng(rgbaPng(96, 64).subarray(0, 40)), /truncated|missing/);
  assert.throws(() => decodePng(Buffer.from("not a png")), /signature/);

  const tiny = createComponentFirstFixture(t, { width: 1, height: 1 });
  const tinyResult = checkComponentFirstGate(tiny.input, { projectRoot: tiny.projectRoot });
  assert.equal(tinyResult.status, "invalid");
  assert.ok(tinyResult.reasonCodes.includes("CF_EVIDENCE_PNG_DIMENSIONS_INVALID"));

  const transparent = createComponentFirstFixture(t, { transparent: true });
  const transparentResult = checkComponentFirstGate(transparent.input, { projectRoot: transparent.projectRoot });
  assert.ok(transparentResult.reasonCodes.includes("CF_EVIDENCE_PNG_TRANSPARENCY_INVALID"));

  const fake = createComponentFirstFixture(t);
  const fakeFile = path.join(fake.projectRoot, "evidence", "fake.png");
  fs.writeFileSync(fakeFile, "png suffix only");
  fake.input.evidence.screenshots[0].path = "evidence/fake.png";
  fake.input.evidence.screenshots[0].sha256 = sha256(Buffer.from("png suffix only"));
  assert.ok(checkComponentFirstGate(fake.input, { projectRoot: fake.projectRoot }).reasonCodes.includes("CF_EVIDENCE_PNG_INVALID"));
});

test("v1 matrix covers none, baseline, Playground, hash, freshness, and prototype/production semantics", (t) => {
  const none = createComponentFirstFixture(t, { uiLibrary: "none" });
  assert.ok(checkComponentFirstGate(none.input, { projectRoot: none.projectRoot }).reasonCodes.includes("CF_STACK_UI_LIBRARY_NONE"));

  const baseline = createComponentFirstFixture(t);
  baseline.input.components.declarations = baseline.input.components.declarations.filter(({ role }) => role !== "feedback");
  assert.ok(checkComponentFirstGate(baseline.input, { projectRoot: baseline.projectRoot }).reasonCodes.includes("CF_COMPONENT_BASELINE_ROLE_MISSING"));

  const playground = createComponentFirstFixture(t);
  playground.input.playground.changeRoot = "openspec/changes/missing";
  assert.ok(checkComponentFirstGate(playground.input, { projectRoot: playground.projectRoot }).reasonCodes.includes("CF_PLAYGROUND_RECEIPT_MISSING"));

  const playgroundHash = createComponentFirstFixture(t);
  const htmlFile = path.join(playgroundHash.projectRoot, playgroundHash.input.playground.changeRoot, "playground", "index.html");
  fs.appendFileSync(htmlFile, "\n<!-- drift -->\n");
  assert.ok(checkComponentFirstGate(playgroundHash.input, { projectRoot: playgroundHash.projectRoot }).reasonCodes.includes("CF_PLAYGROUND_RECEIPT_BLOCKED"));

  const mismatch = createComponentFirstFixture(t, { evidenceSha256: "0".repeat(64) });
  assert.ok(checkComponentFirstGate(mismatch.input, { projectRoot: mismatch.projectRoot }).reasonCodes.includes("CF_EVIDENCE_HASH_MISMATCH"));

  const stale = createComponentFirstFixture(t);
  const receiptFile = path.join(stale.projectRoot, stale.input.playground.changeRoot, "playground.json");
  const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
  receipt.verification.checkedAt = "2020-01-01T00:00:00.000Z";
  const reportFile = path.join(stale.projectRoot, stale.input.playground.changeRoot, receipt.verification.evidence.path);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  report.checkedAt = receipt.verification.checkedAt;
  const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(reportFile, reportBytes);
  receipt.verification.evidence.sha256 = sha256(reportBytes);
  fs.writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
  assert.equal(checkComponentFirstGate(stale.input, { projectRoot: stale.projectRoot }).status, "passed", "freshness is intentionally deferred to Change B");

  const prototype = createComponentFirstFixture(t, { targetKind: "sandbox", readinessScope: "prototype" });
  assert.equal(checkComponentFirstGate(prototype.input, { projectRoot: prototype.projectRoot }).status, "passed");
  const production = createComponentFirstFixture(t, { targetKind: "production", readinessScope: "prototype" });
  assert.ok(checkComponentFirstGate(production.input, { projectRoot: production.projectRoot }).reasonCodes.includes("CF_PAGE_READINESS_SCOPE_MISMATCH"));
});

test("origin is independent from runtime stack and Windows/escape path behavior is deterministic", (t) => {
  const fixture = createComponentFirstFixture(t);
  fixture.input.components.declarations[0].componentOrigin = "installed-package";
  fixture.input.components.declarations[1].componentOrigin = "workspace-package";
  fixture.input.components.declarations[2].componentOrigin = "generated";
  for (const component of fixture.input.components.declarations.slice(0, 3)) {
    component.tokenEvidence = [];
    component.keyboardEvidence = [];
    component.focusEvidence = [];
    component.stateEvidence = {};
    component.playgroundEvidence = [];
    component.pageUsageEvidence = [];
  }
  assert.equal(checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot }).status, "passed");

  const modeledWrong = createComponentFirstFixture(t);
  modeledWrong.input.components.declarations[0].runtimeStack = "project-owned";
  assert.ok(checkComponentFirstGate(modeledWrong.input, { projectRoot: modeledWrong.projectRoot }).reasonCodes.includes("CF_COMPONENT_ORIGIN_INVALID"));

  const slash = createComponentFirstFixture(t);
  slash.input.components.declarations[0].sourcePath = slash.input.components.declarations[0].sourcePath.replaceAll("/", "\\");
  slash.input.pageUsage.routes[0].uses[0].sourceIdentity = slash.input.components.declarations[0].sourcePath.replaceAll("\\", "/");
  assert.equal(checkComponentFirstGate(slash.input, { projectRoot: slash.projectRoot }).status, "passed");

  const escape = createComponentFirstFixture(t);
  escape.input.components.declarations[0].sourcePath = "../outside.tsx";
  assert.equal(checkComponentFirstGate(escape.input, { projectRoot: escape.projectRoot }).status, "invalid");
  assert.ok(checkComponentFirstGate(escape.input, { projectRoot: escape.projectRoot }).reasonCodes.includes("CF_COMPONENT_INPUT_INVALID"));
});

test("monorepo targets cannot mix component sources and dirty worktrees do not change read-only evaluation", (t) => {
  const fixture = createComponentFirstFixture(t);
  const admin = path.join(fixture.projectRoot, "apps", "admin");
  const store = path.join(fixture.projectRoot, "apps", "store");
  fs.mkdirSync(path.join(admin, "src"), { recursive: true });
  fs.mkdirSync(store, { recursive: true });
  fs.cpSync(path.join(fixture.projectRoot, "src", "components"), path.join(admin, "src", "components"), { recursive: true });
  fs.copyFileSync(path.join(fixture.projectRoot, "package.json"), path.join(admin, "package.json"));
  fs.copyFileSync(path.join(fixture.projectRoot, "package.json"), path.join(store, "package.json"));
  fixture.input.target.root = "apps/admin";
  assert.equal(checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot }).status, "passed");

  const workspaceSource = "packages/ui/action_component.tsx";
  fs.mkdirSync(path.dirname(path.join(fixture.projectRoot, workspaceSource)), { recursive: true });
  fs.writeFileSync(path.join(fixture.projectRoot, workspaceSource), "export function action_component() { return null; }\n");
  fixture.input.components.declarations[0].componentOrigin = "workspace-package";
  fixture.input.components.declarations[0].sourcePath = workspaceSource;
  fixture.input.pageUsage.routes[0].uses[0].sourceIdentity = workspaceSource;
  assert.equal(checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot }).status, "passed", "workspace sources may live outside the target but remain inside the repository");

  fixture.input.target.root = "apps/store";
  const wrongTarget = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  assert.equal(wrongTarget.status, "blocked");
  assert.ok(wrongTarget.reasonCodes.includes("CF_COMPONENT_SOURCE_MISSING"));

  fixture.input.target.root = "apps/admin";
  fs.mkdirSync(path.join(fixture.projectRoot, ".git"), { recursive: true });
  fs.writeFileSync(path.join(fixture.projectRoot, "dirty-untracked.txt"), "dirty\n");
  assert.equal(checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot }).status, "passed");
});

test("case normalization and resolved symlink containment prevent Windows path drift and evidence escape", (t) => {
  const fixture = createComponentFirstFixture(t);
  if (process.platform === "win32") {
    fixture.input.components.declarations[0].sourcePath = fixture.input.components.declarations[0].sourcePath.toUpperCase();
    assert.equal(checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot }).status, "passed");
  }

  const external = path.join(path.dirname(fixture.projectRoot), "external-evidence");
  fs.mkdirSync(external, { recursive: true });
  const externalPng = rgbaPng(96, 64);
  fs.writeFileSync(path.join(external, "outside.png"), externalPng);
  const link = path.join(fixture.projectRoot, "evidence-link");
  try { fs.symlinkSync(external, link, process.platform === "win32" ? "junction" : "dir"); }
  catch { return; }
  fixture.input.evidence.screenshots[0].path = "evidence-link/outside.png";
  fixture.input.evidence.screenshots[0].sha256 = sha256(externalPng);
  const escaped = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  assert.equal(escaped.status, "invalid");
  assert.ok(escaped.reasonCodes.includes("CF_EVIDENCE_PATH_INVALID"));
});
