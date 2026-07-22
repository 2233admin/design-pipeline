"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { checkComponentMatrix } = require("../skill/scripts/motion-evidence-core.cjs");

function matrix(evidence = ["button.json"]) {
  return {
    schema: "design-pipeline.component-state-matrix.v1",
    id: "core-components",
    entries: [{
      component: "button",
      variant: "primary",
      states: ["hover", "focus", "pressed", "disabled", "loading", "empty", "error"],
      inputs: ["keyboard", "touch", "pointer"],
      viewports: ["mobile", "desktop"],
      reducedMotion: "instant state substitution",
      evidence,
    }],
  };
}

test("component matrices require full state, input, viewport, motion, and evidence coverage", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-components-"));
  fs.writeFileSync(path.join(root, "button.json"), "{}\n");
  assert.equal(checkComponentMatrix(matrix(), { evidenceRoot: root, requireFiles: true }).status, "passed");
});

test("focus/error, keyboard/touch, responsive, and reduced-motion omissions fail", () => {
  const cases = [
    (entry) => entry.states.splice(entry.states.indexOf("focus"), 1),
    (entry) => entry.states.splice(entry.states.indexOf("error"), 1),
    (entry) => entry.inputs.splice(entry.inputs.indexOf("keyboard"), 1),
    (entry) => entry.inputs.splice(entry.inputs.indexOf("touch"), 1),
    (entry) => entry.viewports.splice(entry.viewports.indexOf("mobile"), 1),
    (entry) => { entry.reducedMotion = "missing"; },
  ];
  for (const mutate of cases) {
    const value = matrix();
    mutate(value.entries[0]);
    assert.throws(() => checkComponentMatrix(value), /missing|requires a substitute/);
  }
});

test("dangling or escaping evidence links fail", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-components-"));
  assert.throws(() => checkComponentMatrix(matrix(["missing.json"]), { evidenceRoot: root, requireFiles: true }), /dangling evidence/);
  assert.throws(() => checkComponentMatrix(matrix(["../outside.json"]), { evidenceRoot: root }), /dangling evidence/);
});
