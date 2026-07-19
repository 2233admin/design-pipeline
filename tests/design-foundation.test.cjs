const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const checker = path.join(repoRoot, "skill", "scripts", "check-design-foundation.cjs");
const roots = new Set();

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-foundation-"));
  roots.add(root);
  return root;
}

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function run(root, ...args) {
  return spawnSync(
    process.execPath,
    [checker, "--project-root", root, "--json", ...args],
    { encoding: "utf8" },
  );
}

function validDesign() {
  return `---
version: "1.0"
name: Foundation Test
---

# Foundation Test

## Product Context

Operators need a stable design contract.

## Overview

Calm and evidence-forward.

## Colors

Neutral surfaces with one semantic accent.

## Typography

Readable sans and monospace identifiers.

## Layout

One primary workspace with stable rails.

## Components

Every component has explicit states.

## Do's and Don'ts

Do preserve intent. Do not copy a generic template.

## Source Decisions

Adopted a constrained information hierarchy.
Rejected decorative dashboard chrome.
`;
}

test("reports synthesis-required when project DESIGN.md is missing", () => {
  const root = makeRoot();
  const result = run(root);

  assert.equal(result.status, 2, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "synthesis-required");
  assert.equal(report.designFile, "DESIGN.md");
  assert.match(report.nextCommand, /init-design-synthesis\.cjs/);
});

test("accepts a complete project design foundation", () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, "DESIGN.md"), validDesign());

  const result = run(root);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "ready");
  assert.equal(report.name, "Foundation Test");
  assert.match(report.sha256, /^[a-f0-9]{64}$/);
});

test("rejects a template-shaped file without the complete foundation contract", () => {
  const root = makeRoot();
  fs.writeFileSync(
    path.join(root, "DESIGN.md"),
    "---\nname: Generic Template\n---\n\n# Generic Template\n\n## Colors\n\nBlue.\n",
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "invalid");
  assert.match(report.error, /missing required sections/);
});

test("rejects relative and real-path escapes", () => {
  const root = makeRoot();
  const relativeEscape = run(root, "--design-file", "../DESIGN.md");
  assert.equal(relativeEscape.status, 1);
  assert.match(JSON.parse(relativeEscape.stdout).error, /stay inside/);

  const outside = makeRoot();
  fs.writeFileSync(path.join(outside, "DESIGN.md"), validDesign());
  const linked = path.join(root, "linked");
  fs.symlinkSync(outside, linked, process.platform === "win32" ? "junction" : "dir");
  const realEscape = run(root, "--design-file", "linked/DESIGN.md");
  assert.equal(realEscape.status, 1);
  assert.match(JSON.parse(realEscape.stdout).error, /resolves outside/);
});
