"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { applyPatch, checkCounter, checkGolden, listCases, loadCase, validateCase } = require("../evals/cases/cases.cjs");

const repoRoot = path.resolve(__dirname, "..");
const casesRoot = path.join(repoRoot, "evals/cases");
const cases = listCases(casesRoot).map(loadCase);

test("the library has golden cases for product PV and logo sting", () => {
  const types = new Set(cases.map((entry) => entry.spec.deliverableType));
  for (const type of ["product-pv", "logo-sting"]) assert.ok(types.has(type), type);
});

test("every golden passes the storyboard, score and timeline gates", () => {
  for (const entry of cases) {
    const result = checkGolden(entry);
    assert.ok(result.passed, `${entry.spec.id}: ${result.codes.join(", ")}`);
  }
});

test("every storyboard and timeline counter-example is caught with the codes it names, which the golden does not have", () => {
  let checked = 0;
  for (const entry of cases) {
    const golden = checkGolden(entry);
    for (const counter of entry.spec.counterExamples.filter((item) => item.target !== "render")) {
      const result = checkCounter(entry, counter);
      assert.deepEqual(result.missing, [], `${entry.spec.id}/${counter.id} got ${result.codes.join(", ")}`);
      assert.deepEqual(counter.expect.filter((code) => golden.codes.includes(code)), [], `${entry.spec.id}/${counter.id} expects a code the golden already has`);
      checked += 1;
    }
  }
  assert.ok(checked >= 8, `only ${checked} counter-examples checked`);
});

test("counter-examples cover every failure class across the library", () => {
  const classes = new Set(cases.flatMap((entry) => entry.spec.counterExamples.map((counter) => counter.failureClass)));
  for (const failureClass of ["workflow", "tool-misuse", "generic-concept", "rough-execution", "taste-gap"]) assert.ok(classes.has(failureClass), failureClass);
});

test("the golden cases stay out of the shipped package", () => {
  const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
  assert.equal(resources.packageRoot, "skill");
  assert.ok(path.relative(path.join(repoRoot, resources.packageRoot), casesRoot).startsWith(".."), "evals/cases must live outside the package root");
  assert.ok(!resources.required.some((file) => /golden|evals\/cases/.test(file)));
});

test("case validation rejects approvals without a watched render, and gate rules without a counter-example", () => {
  const entry = cases[0];
  const spec = structuredClone(entry.spec);
  spec.status = "approved";
  spec.approval = { verdict: "accept", by: "user", date: "2026-09-29", note: "ok" };
  assert.throws(() => validateCase(spec, entry.dir), /renderSha256/);
  const orphan = structuredClone(entry.spec);
  orphan.rules.push({ id: "orphan", choice: "c", rule: "r", fix: "f", enforcedBy: { kind: "gate", gate: "timeline", codes: ["layout-tween"] } });
  assert.throws(() => validateCase(orphan, entry.dir), /no counter-example exercises it/);
});

test("patch operations select tweens by value and refuse stale selectors", () => {
  const timeline = { tweens: [{ targets: ["#a"], startSec: 1, props: ["x"] }, { targets: ["#b"], startSec: 2, props: ["y"] }] };
  const updated = applyPatch(timeline, [{ op: "update-where", path: "/tweens", match: { targets: ["#b"], startSec: 2.0001 }, set: { props: ["width"] } }]);
  assert.deepEqual(updated.tweens[1].props, ["width"]);
  assert.deepEqual(timeline.tweens[1].props, ["y"], "the golden is not mutated");
  assert.equal(applyPatch(timeline, [{ op: "remove-where", path: "/tweens", match: { targets: ["#a"] } }]).tweens.length, 1);
  assert.throws(() => applyPatch(timeline, [{ op: "remove-where", path: "/tweens", match: { targets: ["#c"] } }]), /matched nothing/);
  assert.throws(() => applyPatch(timeline, [{ op: "replace", path: "/missing", value: 1 }]), /nothing to replace/);
});
