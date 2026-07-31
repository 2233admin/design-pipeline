"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  checkReferenceEvidence,
  validateComposition,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");
const fixtures = require("./helpers/reference-fixtures.cjs");

const {
  matchingRegions,
  tempRoot,
  writeArtifact,
  writeReference,
} = fixtures;

const repoRoot = path.resolve(__dirname, "..");

function readText(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(readText(relative));
}

function baseReference(overrides = {}) {
  return fixtures.fixedCameraReference({
    id: "jst-hud-clock",
    confidence: 0.97,
    approval: {
      status: "approved",
      evidence: "User confirmed the medium and the register readings.",
    },
    ...overrides,
  });
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
  return fixtures.grayboxBlock({
    capturedAt: "2026-07-30T12:00:00.000Z",
    viewport: { width: 1280, height: 720 },
    comparison: {
      mode: "measured",
      regions: matchingRegions(
        regionIds,
        (id) => `${id} matches the recorded row and column structure.`,
      ),
    },
    approval: {
      status: "approved",
      evidence: "User approved the layout-only capture against the reference.",
    },
  });
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

  const root = tempRoot("design-pipeline-composition-");

  // A valid composition does not release the change: structural proof precedes optical treatment
  // on every route. This assertion previously read `ready` for a change with no graybox at all,
  // which is exactly the behaviour the unconditional graybox gate exists to end.
  writeReference(root, baseReference({ composition }));
  const withoutGraybox = checkReferenceEvidence(root);
  assert.equal(withoutGraybox.status, "blocked");
  assert.equal(withoutGraybox.reason, "graybox-missing");

  // With the layout-only capture recorded against the same three region ids - and the source
  // raster the document names actually on disk, so the measured claim is measurable - the change
  // is ready and the composition is what the comparison was checked against.
  writeArtifact(root, "graybox.png", "layout-only capture");
  writeArtifact(root, "reference.png", "source raster");
  writeReference(root, baseReference({ composition, graybox: grayboxFor(ids) }));
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

  const root = tempRoot("design-pipeline-composition-legacy-");

  // The absent composition block is not what holds a legacy document back - the graybox gate is,
  // and it holds every route. This assertion previously read `ready` on a change with no graybox.
  writeReference(root, reference);
  const withoutGraybox = checkReferenceEvidence(root);
  assert.equal(withoutGraybox.status, "blocked");
  assert.equal(withoutGraybox.reason, "graybox-missing");

  // With no composition recorded there is nothing to bind the comparison to, so the legacy
  // document reaches ready on the strength of the capture alone.
  writeArtifact(root, "graybox.png", "layout-only capture");
  writeArtifact(root, "reference.png", "source raster");
  writeReference(root, { ...reference, graybox: grayboxFor(["slab", "readout"]) });
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
