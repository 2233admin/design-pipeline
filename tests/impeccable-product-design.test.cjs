const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { parseHeadings } = require("../skill/scripts/guide-core.cjs");

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
  "delight", "overdrive", "clarify", "adapt", "optimize", "live", "generate",
];

test("maps the complete Impeccable product-design command surface", () => {
  assert.equal(map.schema, "design-pipeline.impeccable-product-design.v1");
  // Counted at pbakaus/impeccable 9fadc41: 24 rows in the SKILL.md command table, `craft` a deprecated alias.
  assert.equal(map.coverage.upstreamListedCommandCount, 24);
  assert.equal(map.coverage.upstreamCoreCommandCount, 23);
  assert.deepEqual(map.aliases.filter((alias) => alias.deprecated).map((alias) => alias.id).sort(), ["craft", "teach"]);
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
    ["comp-round", "doctor", "hooks", "native-platform", "pin", "routing"],
  );
});

const references = path.join(repoRoot, "skill", "references");

// Heading anchors come from the one rule the guide reader uses (skill/scripts/guide-core.cjs).
function headingAnchors(file) {
  return new Set(parseHeadings(fs.readFileSync(file, "utf8")).map((heading) => heading.anchor));
}

function section(text, heading) {
  const start = text.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `refine-intents.md has ## ${heading}`);
  const end = text.indexOf("\n## ", start + 1);
  return text.slice(start, end === -1 ? text.length : end);
}

function flat(value) {
  return value.replace(/\s+/g, " ");
}

test("every command names a guide heading that exists", () => {
  const anchorsByFile = new Map();
  for (const command of map.commands) {
    assert.match(command.guide ?? "", /^[a-z0-9-]+\.md#[a-z0-9-]+$/, `${command.id} guide`);
    const [file, anchor] = command.guide.split("#");
    const target = path.join(references, file);
    assert.ok(fs.existsSync(target), `${command.id}: references/${file} exists`);
    if (!anchorsByFile.has(file)) anchorsByFile.set(file, headingAnchors(target));
    assert.ok(anchorsByFile.get(file).has(anchor), `${command.id}: references/${file} has heading #${anchor}`);
  }
  for (const id of ["critique", "polish", "distill", "quieter"]) {
    assert.equal(map.commands.find((command) => command.id === id).guide, `refine-intents.md#${id}`);
  }
  // The check can fail: a heading that is not in the file is not an anchor.
  assert.equal(headingAnchors(path.join(references, "refine-intents.md")).has("louder"), false);
});

test("the refine guide carries each intent's steps and the rules that must not be lost", () => {
  const text = fs.readFileSync(path.join(references, "refine-intents.md"), "utf8").replace(/\r\n/g, "\n");
  for (const heading of ["Critique", "Polish", "Distill", "Quieter"]) {
    const body = section(text, heading);
    for (const part of ["Before you start", "Steps", "Do not", "Done when", "Hand-off"]) {
      assert.ok(body.includes(`\n### ${part}\n`), `${heading} has ### ${part}`);
    }
  }

  const quieter = flat(section(text, "Quieter"));
  // Two meanings, by visitor mode.
  assert.match(quieter, /\| `Persuade`, `Experience` \|[^|]*Drama is reduced, not removed/);
  assert.match(quieter, /\| `Operate`, `Read` \|[^|]*Less visual noise/);
  // The six intensity sources, then the measured moves.
  for (const source of ["saturation", "contrast", "weight", "motion", "complexity", "scale"]) {
    assert.ok(quieter.includes(`${source} (`), `quieter names the ${source} source`);
  }
  assert.match(quieter, /70-85% saturation/);
  assert.match(quieter, /accent color to about 10%/);
  assert.match(quieter, /900 to 600, 700 to 500/);
  assert.match(quieter, /travel to 10-20px/);
  assert.match(quieter, /never bounce or elastic/);
  assert.match(quieter, /Never put gray text on a colored ground: use a darker shade of that same color/);
  assert.match(quieter, /opacity is not a substitute/);
  assert.match(quieter, /Restraint still needs a point of view/);
  assert.match(flat(section(text, "Quieter").split("### Hand-off")[1]), /\[polish\]\(#polish\)/);

  const distill = flat(section(text, "Distill"));
  assert.match(distill, /Keep the semantic colors \(success, warning, error\) and give each a non-color cue/);
  assert.match(distill, /one primary goal/);
  assert.match(distill, /a single primary action/);
  assert.match(distill, /Make the layout linear/);
  assert.match(distill, /smart defaults/);
  assert.match(distill, /Clean the code/);
  assert.match(distill, /Write the removal record/);
  assert.match(distill, /removed, hidden or merged: what it was, why it went, where it can still be reached/);
  assert.match(flat(section(text, "Distill").split("### Hand-off")[1]), /\[polish\]\(#polish\)/);

  // Critique routes to the existing review guides and defines no scale of its own.
  const critique = flat(section(text, "Critique"));
  assert.ok(critique.includes("(web-direction.md#critique-on-request)"));
  assert.ok(critique.includes("(design-review-dimensions.md#dimensions)"));
  assert.doesNotMatch(text, /Nielsen|cognitive load|persona walk/i);
});

test("every upstream reference file has a recorded disposition and a real target", () => {
  const expected = [
    "component-review", "craft-floor", "doctor", "hooks", "mode-operate", "mode-persuade",
    "mode-read", "region-map", "routing", "visualize",
  ];
  assert.deepEqual(map.upstreamReferences.map((item) => item.id).sort(), expected);
  assert.equal(map.coverage.upstreamReferenceCount, expected.length);
  const capabilities = new Set(map.supportingCapabilities.map((item) => item.id));
  for (const item of map.upstreamReferences) {
    assert.ok(["adopted", "partly-adopted", "mapped", "not-adopted"].includes(item.disposition), item.id);
    assert.ok(item.reason && item.reason.length > 20, `${item.id} has a reason`);
    if (item.disposition === "not-adopted") {
      assert.equal(item.target, undefined, `${item.id} names no target`);
    } else if (item.target.includes("#")) {
      const [file, anchor] = item.target.split("#");
      assert.ok(headingAnchors(path.join(references, file)).has(anchor), `${item.id}: ${item.target}`);
    } else {
      assert.ok(capabilities.has(item.target), `${item.id}: capability ${item.target}`);
    }
  }
  const ids = map.notAdopted.map((item) => item.id);
  for (const id of ["agents-engine", "rule-packs", "login-logout-whoami", "critique-history-upload", "design-md-viewer-sync", "loop"]) {
    assert.ok(ids.includes(id), `${id} recorded as not adopted`);
  }
  assert.ok(map.notAdopted.every((item) => item.reason));
});

test("the 4.8.2 behaviors and mode rules are in the packaged guides", () => {
  const read = (file) => flat(fs.readFileSync(path.join(references, file), "utf8"));
  const audit = read("ui-craft-sources.md");
  assert.match(audit, /### Keep the report/);
  assert.match(audit, /Saving never replaces delivering/);
  assert.match(audit, /says not to keep audit reports, keep nothing/);
  assert.match(audit, /### Right-to-left pages/);
  assert.match(audit, /only when the page declares `dir="rtl"`/);
  assert.match(audit, /`lang` alone does not set direction/);
  assert.match(audit, /Take one point off the responsive score/);

  const contract = read("impeccable-contract.md");
  assert.match(contract, /Propose no visual direction while intake is open/);
  assert.match(contract, /sets the craft bar, not the world/);
  assert.match(contract, /a ban that no brief earns back/);
  assert.match(contract, /## Mode rules/);
  for (const mode of ["Operate", "Read", "Persuade", "Experience"]) {
    assert.ok(contract.includes(`| \`${mode}\` |`), `${mode} row`);
  }
  assert.match(contract, /never a favorable verdict of your own/);
  assert.match(read("stages.md"), /Propose no visual direction at this stage unless the owner pinned one/);
});
