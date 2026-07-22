"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateIntake } = require("../skill/scripts/adapter-core.cjs");

function intake() {
  return {
    schema: "design-pipeline.adapter-intake.v1",
    adapterId: "candidate-skill",
    source: { url: "https://github.com/example/candidate", revision: "a".repeat(40), sha256: "b".repeat(64) },
    license: { state: "verified", id: "MIT", evidence: ["LICENSE@aaaaaaaa"] },
    maintenance: { status: "active", evidence: ["release:1.2.3", "commit:aaaaaaaa"] },
    security: { permissions: ["read-project"], network: "none", executableRemotePrompts: false, evidence: ["manual-review:security.md"] },
    adoption: { mode: "principle", updatePolicy: "re-review pinned revisions", removalPolicy: "remove on license or security regression" },
    score: { value: 8.2, source: "https://scorecard.example/report", revision: "report-42", timestamp: "2026-07-23T00:00:00.000Z" },
    decision: { requestedSupport: "companion" },
  };
}

test("pinned, licensed, reviewed intake is admissible", () => {
  assert.equal(evaluateIntake(intake()).status, "admissible");
});

test("mutable revisions reject before popularity can affect admission", () => {
  const value = intake();
  value.source.revision = "main";
  value.score.value = 10;
  assert.throws(() => evaluateIntake(value), /immutable commit or version/);
});

test("unsafe license, executable remote prompts, excessive permissions, and missing security evidence block", () => {
  const value = intake();
  value.license.state = "unsafe";
  value.security.executableRemotePrompts = true;
  value.security.permissions.push("shell-unrestricted");
  value.security.evidence = [];
  const result = evaluateIntake(value);
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("license:unsafe"));
  assert.ok(result.blockers.includes("security:remote-prompts"));
  assert.ok(result.blockers.includes("security:excessive-permissions"));
  assert.ok(result.blockers.includes("security:evidence-missing"));
});

test("optional score data requires source, revision, and timestamp", () => {
  const value = intake();
  delete value.score.revision;
  assert.throws(() => evaluateIntake(value), /missing revision/);
});
