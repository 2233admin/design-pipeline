"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  checkReferenceEvidence,
  validateComposition,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");

const repoRoot = path.resolve(__dirname, "..");

function readText(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(readText(relative));
}

function baseReference(overrides = {}) {
  return {
    schema: "design-pipeline.reference-evidence.v1",
    id: "jst-hud-clock",
    source: {
      path: "reference.png",
      kind: "image",
      width: 723,
      height: 405,
      sha256: "b".repeat(64),
    },
    classification: {
      objectDimensionality: "3d",
      cameraModel: "fixed-perspective",
      interactionModel: "none",
      outputSurface: "locked-cinematic-frame",
      runtimeFamily: "fixed-camera-cinematic-3d",
    },
    spatialCues: {
      thickness: { present: true, evidence: "Visible right rail and slab side wall." },
      occlusion: { present: true, evidence: "Raised digits overlap the recessed field." },
      contactShadows: { present: true, evidence: "Digits cast short shadows onto the substrate." },
      bevelHighlights: { present: true, evidence: "Rails and glyph rims carry directional highlights." },
      perspectiveConvergence: { present: true, evidence: "Horizontal rails converge toward frame left." },
      depthOfField: { present: true, evidence: "Near right rail and distant left labels soften differently." },
    },
    route: "3d",
    confidence: 0.97,
    requiredArtifacts: ["reference.md", "scene.json", "3d.md", "graybox.png"],
    approval: {
      status: "approved",
      evidence: "User confirmed the medium and the register readings.",
    },
    ...overrides,
  };
}

// The real reference that motivated the change: three registers, of which the first
// is a two-row block while the other two are three-column rows.
function threeRegisterComposition() {
  return {
    uniform: false,
    regions: [
      { id: "register-1", rows: 2, columns: 1, breaksFrom: ["register-2", "register-3"] },
      { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
      { id: "register-3", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
}

function grayboxFor(regionIds) {
  return {
    capture: "graybox.png",
    capturedAt: "2026-07-30T12:00:00.000Z",
    viewport: { width: 1280, height: 720 },
    runtimeMode: {
      mechanism: "root-attribute",
      token: "data-graybox",
      disables: ["emissive", "optical", "texture"],
    },
    suppressed: ["materials", "glow", "bloom", "depth-of-field", "scanlines", "grading"],
    comparison: {
      mode: "measured",
      regions: regionIds.map((id) => ({
        id,
        finding: `${id} matches the recorded row and column structure.`,
        status: "matches",
      })),
    },
    approval: {
      status: "approved",
      evidence: "User approved the layout-only capture against the reference.",
    },
  };
}

test("a composition block with fewer than two regions is rejected", () => {
  const composition = {
    uniform: false,
    regions: [{ id: "register-1", rows: 2, columns: 1, breaksFrom: [] }],
  };
  assert.throws(() => validateComposition(composition), /at least 2 regions/i);
  assert.throws(
    () => validateReferenceEvidence(baseReference({ composition })),
    /at least 2 regions/i,
  );
});

test("uniform true alongside any non-empty breaksFrom fails with a composition contradiction", () => {
  const composition = {
    uniform: true,
    regions: [
      { id: "register-1", rows: 1, columns: 3, breaksFrom: ["register-2"] },
      { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
      { id: "register-3", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
  assert.throws(
    () => validateComposition(composition),
    /composition contradiction/i,
  );
  assert.throws(
    () => validateComposition(composition),
    /register-1/,
  );
  assert.throws(
    () => validateReferenceEvidence(baseReference({ composition })),
    /composition contradiction/i,
  );
});

test("uniform true where regions differ in rows or columns also fails", () => {
  const differentRows = {
    uniform: true,
    regions: [
      { id: "register-1", rows: 2, columns: 1, breaksFrom: [] },
      { id: "register-2", rows: 1, columns: 1, breaksFrom: [] },
    ],
  };
  assert.throws(() => validateComposition(differentRows), /composition contradiction/i);
  assert.throws(() => validateComposition(differentRows), /differ in rows or columns/i);

  const differentColumns = {
    uniform: true,
    regions: [
      { id: "register-1", rows: 1, columns: 1, breaksFrom: [] },
      { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
  assert.throws(() => validateComposition(differentColumns), /differ in rows or columns/i);
  assert.throws(
    () => validateReferenceEvidence(baseReference({ composition: differentColumns })),
    /composition contradiction/i,
  );
});

test("uniform false with every breaksFrom empty fails", () => {
  const composition = {
    uniform: false,
    regions: [
      { id: "register-1", rows: 1, columns: 3, breaksFrom: [] },
      { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
  assert.throws(() => validateComposition(composition), /composition contradiction/i);
  assert.throws(() => validateComposition(composition), /no region records a breaksFrom entry/i);
  assert.throws(
    () => validateReferenceEvidence(baseReference({ composition })),
    /composition contradiction/i,
  );
});

test("a genuinely uniform breakdown is valid when no region breaks from another", () => {
  const composition = {
    uniform: true,
    regions: [
      { id: "register-1", rows: 1, columns: 3, breaksFrom: [] },
      { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
  assert.deepEqual(validateComposition(composition), ["register-1", "register-2"]);
  const result = validateReferenceEvidence(baseReference({ composition }));
  assert.equal(result.composition.uniform, true);
});

test("the three-register non-uniform breakdown passes and keeps the exception named", () => {
  const composition = threeRegisterComposition();
  const ids = composition.regions.map((region) => region.id);
  assert.deepEqual(validateComposition(composition), ["register-1", "register-2", "register-3"]);

  const result = validateReferenceEvidence(baseReference({ composition }));
  assert.equal(result.composition.uniform, false);
  assert.equal(result.composition.regions.length, 3);
  const [first, second, third] = result.composition.regions;
  assert.deepEqual(
    { rows: first.rows, columns: first.columns },
    { rows: 2, columns: 1 },
  );
  assert.deepEqual(first.breaksFrom, ["register-2", "register-3"]);
  assert.deepEqual(
    { rows: second.rows, columns: second.columns },
    { rows: 1, columns: 3 },
  );
  assert.deepEqual(second.breaksFrom, []);
  assert.deepEqual(third.breaksFrom, []);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-composition-"));
  const write = (reference) => fs.writeFileSync(
    path.join(root, "reference-evidence.json"),
    `${JSON.stringify(reference, null, 2)}\n`,
  );

  // A valid composition does not release the change: structural proof precedes optical treatment
  // on every route. This assertion previously read `ready` for a change with no graybox at all,
  // which is exactly the behaviour the unconditional graybox gate exists to end.
  write(baseReference({ composition }));
  const withoutGraybox = checkReferenceEvidence(root);
  assert.equal(withoutGraybox.status, "blocked");
  assert.equal(withoutGraybox.reason, "graybox-missing");

  // With the layout-only capture recorded against the same three region ids - and the source
  // raster the document names actually on disk, so the measured claim is measurable - the change
  // is ready and the composition is what the comparison was checked against.
  fs.writeFileSync(path.join(root, "graybox.png"), "layout-only capture");
  fs.writeFileSync(path.join(root, "reference.png"), "source raster");
  write(baseReference({ composition, graybox: grayboxFor(ids) }));
  const ready = checkReferenceEvidence(root);
  assert.equal(ready.status, "ready", ready.blockers.join("\n"));
  assert.equal(ready.stages.graybox.status, "ready");
});

test("a region cannot break from itself or from an undeclared region", () => {
  assert.throws(
    () => validateComposition({
      uniform: false,
      regions: [
        { id: "register-1", rows: 2, columns: 1, breaksFrom: ["register-1"] },
        { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
      ],
    }),
    /cannot name its own region id/i,
  );
  assert.throws(
    () => validateComposition({
      uniform: false,
      regions: [
        { id: "register-1", rows: 2, columns: 1, breaksFrom: ["register-9"] },
        { id: "register-2", rows: 1, columns: 3, breaksFrom: [] },
      ],
    }),
    /undeclared region id register-9/i,
  );
});

test("the graybox comparison addresses the recorded region ids by name", () => {
  const composition = threeRegisterComposition();
  const ids = composition.regions.map((region) => region.id);

  const matched = baseReference({ composition, graybox: grayboxFor(ids) });
  const result = validateReferenceEvidence(matched);
  assert.deepEqual(
    result.graybox.comparison.regions.map((region) => region.id),
    ids,
  );

  const partial = baseReference({
    composition,
    graybox: grayboxFor(["register-1", "register-2"]),
  });
  assert.throws(
    () => validateReferenceEvidence(partial),
    /must address every composition region id: missing register-3/i,
  );

  const foreign = baseReference({
    composition,
    graybox: grayboxFor([...ids, "register-4"]),
  });
  assert.throws(
    () => validateReferenceEvidence(foreign),
    /undeclared composition region id register-4/i,
  );
});

test("a reference-evidence document with no composition block still validates", () => {
  const reference = baseReference();
  assert.equal(Object.hasOwn(reference, "composition"), false);
  const result = validateReferenceEvidence(reference);
  assert.equal(result.route, "3d");
  assert.equal(Object.hasOwn(result, "composition"), false);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-composition-legacy-"));
  const write = (document) => fs.writeFileSync(
    path.join(root, "reference-evidence.json"),
    `${JSON.stringify(document, null, 2)}\n`,
  );

  // The absent composition block is not what holds a legacy document back - the graybox gate is,
  // and it holds every route. This assertion previously read `ready` on a change with no graybox.
  write(reference);
  const withoutGraybox = checkReferenceEvidence(root);
  assert.equal(withoutGraybox.status, "blocked");
  assert.equal(withoutGraybox.reason, "graybox-missing");

  // With no composition recorded there is nothing to bind the comparison to, so the legacy
  // document reaches ready on the strength of the capture alone.
  fs.writeFileSync(path.join(root, "graybox.png"), "layout-only capture");
  fs.writeFileSync(path.join(root, "reference.png"), "source raster");
  write({ ...reference, graybox: grayboxFor(["slab", "readout"]) });
  const ready = checkReferenceEvidence(root);
  assert.equal(ready.status, "ready", ready.blockers.join("\n"));

  const schema = readJson(path.join("skill", "references", "reference-evidence.schema.json"));
  assert.ok(Object.hasOwn(schema.properties, "composition"));
  assert.equal(schema.required.includes("composition"), false);
});

test("reference-spec requires the per-region table and forbids back-references", () => {
  const spec = readText(path.join("skill", "references", "reference-spec.md"));
  assert.match(spec, /\|\s*Region\s*\|\s*Rows\s*\|\s*Columns\s*\|\s*Contents left to right\s*\|\s*Breaks from\s*\|/i);
  assert.match(spec, /as above/i);
  assert.match(spec, /same as previous/i);
  assert.match(spec, /forbidden/i);
  assert.match(spec, /uniform/i);
  assert.match(spec, /breaksFrom/);
});
