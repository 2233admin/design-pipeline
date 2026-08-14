const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const map = JSON.parse(
  fs.readFileSync(
    path.join(repoRoot, "skill", "references", "impeccable-product-design.json"),
    "utf8",
  ),
);

const coreCommands = [
  "shape", "init", "document", "extract", "critique", "audit", "polish", "bolder",
  "quieter", "distill", "harden", "onboard", "animate", "colorize", "typeset", "layout",
  "delight", "overdrive", "clarify", "adapt", "optimize", "live", "visualize",
];

test("maps the complete Impeccable product-design command surface", () => {
  assert.equal(map.schema, "design-pipeline.impeccable-product-design.v1");
  assert.equal(map.coverage.upstreamCoreCommandCount, 23);
  assert.equal(map.coverage.mappedCoreCommandCount, coreCommands.length);
  assert.equal(map.coverage.productDesignOnly, true);
  assert.equal(map.coverage.skinThemeImported, false);
  assert.deepEqual(map.commands.map((command) => command.id).sort(), [...coreCommands].sort());
  assert.equal(new Set(map.commands.map((command) => command.id)).size, coreCommands.length);
  assert.ok(map.commands.every((command) => command.stage && command.route));
  assert.ok(map.commands.every((command) => command.outputs.length > 0 && command.proves.length > 0));

  const stages = new Set(map.pipelineStages.map((stage) => stage.id));
  assert.ok(map.commands.every((command) => stages.has(command.stage)));
  assert.deepEqual(
    map.supportingCapabilities.map((capability) => capability.id).sort(),
    ["doctor", "hooks", "native-platform", "pin", "routing"],
  );
});
