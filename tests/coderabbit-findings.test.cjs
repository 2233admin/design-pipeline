"use strict";

// Regression coverage for the round-three review findings that produced a real behaviour change.
//
// Each block names the finding id it pins and states the pre-fix behaviour, because that is the
// thing a future reader cannot recover from the code: every one of these defects was a *quiet*
// wrong answer, not a crash, so the assertion that matters is usually "not the reason it used to
// give" rather than "blocked at all".
//
// Doc-only and artifact-only findings are deliberately absent; see the notes at the foot of this
// file for which ones and why.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  checkGraybox,
  checkReconstruction,
} = require("../skill/scripts/reconstruction-core.cjs");
const {
  checkReferenceEvidence,
  validateComposition,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");
const {
  exactReconstruction,
  readyRoot,
} = require("./fixtures/reconstruction-fixture.cjs");
const fixtures = require("./helpers/reference-fixtures.cjs");

const {
  matchingRegions,
  planarReference,
  tempRoot,
  writeArtifact,
  writeJson,
} = fixtures;

const repoRoot = path.resolve(__dirname, "..");
const initializer = path.join(repoRoot, "skill", "scripts", "init-website-clone.cjs");
const schemaFile = path.join(
  repoRoot,
  "skill",
  "references",
  "reference-evidence.schema.json",
);

const CAPTURED_AT = "2026-02-11T09:00:00.000Z";
const cleanup = new Set();

test.after(() => {
  for (const root of cleanup) fs.rmSync(root, { recursive: true, force: true });
});

function track(root) {
  cleanup.add(root);
  return root;
}

function schema() {
  return JSON.parse(fs.readFileSync(schemaFile, "utf8"));
}

// A graybox block whose comparison addresses exactly the two regions the shared planar composition
// declares, so nothing here is under test except the thing each case names.
function grayboxBlock(regionIds = ["board", "register"], overrides = {}) {
  return fixtures.grayboxBlock({
    capturedAt: CAPTURED_AT,
    comparison: {
      mode: "qualitative",
      regions: matchingRegions(
        regionIds,
        (id) => `${id} occupies the same share of the frame as the reference.`,
      ),
    },
    ...overrides,
  });
}

// --- 3691418003: an uncontained carrier path is reported as itself ------------------------------
//
// `readCarrier` used to wrap `resolveInside` in `catch { return { state: "absent" } }`, so a path
// the containment check refused was reported with the vocabulary of a document nobody wrote. The
// containment was always real; the report was the defect, and it sent a reader looking for a
// missing file instead of at the argument that named a place outside the change root.
//
// The change root is nested one level inside its own temp directory so that `../outside.json`
// lands in a directory this file owns. It must not land in `%TEMP%` itself: `capability-audit`
// asserts no `outside.json` exists there, and a stray one would fail a test in another file.

function containmentRoot(carrierDocuments) {
  const outer = track(tempRoot("design-pipeline-coderabbit-containment-"));
  const change = path.join(outer, "change");
  fs.mkdirSync(change);
  for (const [relative, document] of Object.entries(carrierDocuments)) {
    writeJson(change, relative, document);
  }
  writeArtifact(change, "graybox.png");
  // The refused path is not a dangling one. A real, readable document carrying a *valid* graybox
  // block sits exactly where `../outside.json` points, so a stage that reported `graybox-missing`
  // was describing a file that was right there — the block was refused, never absent.
  writeJson(outer, "outside.json", { graybox: grayboxBlock() });
  return { outer, change };
}

test("3691418003: an uncontained --artifact reports containment, not a missing graybox", () => {
  const { outer, change } = containmentRoot({
    "reconstruction.json": exactReconstruction({ graybox: grayboxBlock() }),
    "reference-evidence.json": planarReference(),
  });
  assert.equal(fs.existsSync(path.join(outer, "outside.json")), true);

  // The same root with the default carrier is ready, so the block below is the containment failure
  // and not a defect in the fixture.
  assert.equal(checkReconstruction(change, { stage: "graybox" }).status, "ready");

  const result = checkReconstruction(change, { stage: "graybox", artifact: "../outside.json" });
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "graybox-carrier-uncontained");
  // The pre-fix report. `graybox-missing` still appears, because after the refused carrier is
  // discounted no block was found — but it is no longer the reason the stage leads with, and it is
  // no longer the only thing said.
  assert.notEqual(result.reasons[0], "graybox-missing");
  assert.match(
    result.blockers.join("\n"),
    /graybox carrier path \.\.\/outside\.json does not resolve inside the change root/,
  );
  // Containment is still enforced: the block sitting in the refused document is never adopted.
  assert.equal(result.graybox, null);
  assert.equal(result.carrier, null);
});

test("3691418003: an uncontained --artifact blocks even when another carrier holds the block", () => {
  // With the graybox block on `reference-evidence.json` the refused primary used to be skipped in
  // silence and the stage returned `ready` — a containment failure reported as a pass.
  const { change } = containmentRoot({
    "reconstruction.json": exactReconstruction(),
    "reference-evidence.json": planarReference({ graybox: grayboxBlock() }),
  });
  assert.equal(checkReconstruction(change, { stage: "graybox" }).status, "ready");

  const result = checkReconstruction(change, { stage: "graybox", artifact: "../outside.json" });
  assert.notEqual(result.status, "ready");
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.reasons, ["graybox-carrier-uncontained"]);
});

test("3691418003: an uncontained --reference-artifact is refused, not called unrecorded", () => {
  const { change } = containmentRoot({
    "reconstruction.json": exactReconstruction({ graybox: grayboxBlock() }),
    "reference-evidence.json": planarReference(),
  });

  const result = checkReconstruction(change, {
    stage: "graybox",
    referenceArtifact: "../outside.json",
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "reference-source-uncontained");
  // The pre-fix report said "no reference evidence document records a source", which was false:
  // the path was refused, not absent, and the repair is a different one.
  assert.equal(result.reasons.includes("reference-source-unrecorded"), false);
  assert.equal(result.source.invalid.reason, "reference-source-uncontained");
  assert.equal(result.source.unresolved, undefined);
  assert.equal(result.source.availability, "unknown");
  assert.equal(result.source.resolvable, false);
  // A refused reference carrier is named once. It is not re-reported as a document that recorded
  // no composition, and not re-reported as an uncontained graybox carrier.
  assert.equal(result.reasons.includes("graybox-composition-unrecorded"), false);
  assert.equal(result.reasons.includes("graybox-carrier-uncontained"), false);
});

test("3691418003: the two containment reasons stay distinct from each other and from absence", () => {
  const distinct = [
    "graybox-carrier-uncontained",
    "reference-source-uncontained",
    "graybox-missing",
    "reference-source-unrecorded",
    "graybox-invalid",
  ];
  assert.equal(new Set(distinct).size, distinct.length);
});

// --- 3691418011: the invalid-graybox summary carries a reason -----------------------------------
//
// `grayboxSummary`'s catch branch returned `{ status, reasons, error }` with no `reason`, while
// every other summary in the file carries one and `reference-evidence-core`'s `grayboxStage`
// reports `reason: "graybox-invalid"` for the identical failure. Two summaries of one fault
// disagreed about whether the fault had a name.

function invalidGrayboxRoot() {
  // `foreign` is not a region the composition declares, so `validateGraybox` throws rather than
  // returning a block — the one path that reaches the catch branch under test.
  const root = track(readyRoot(exactReconstruction({
    graybox: grayboxBlock(["board", "register", "foreign"]),
  })));
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", planarReference());
  return root;
}

test("3691418011: an invalid graybox block names its reason in the geometry-stage summary", () => {
  const root = invalidGrayboxRoot();
  const geometry = checkReconstruction(root, { stage: "geometry" });
  const summary = geometry.stages.graybox;

  assert.equal(summary.status, "blocked");
  // The defect: `reason` was absent from this branch alone, so a caller reading `stages.*.reason`
  // uniformly got `undefined` for the one stage that had thrown.
  assert.notEqual(summary.reason, undefined);
  assert.equal(summary.reason, "graybox-invalid");
  assert.deepEqual(summary.reasons, ["graybox-invalid"]);
  // The shape matches every other stage summary: the leading reason is the first of the list.
  assert.equal(summary.reason, summary.reasons[0]);
  assert.match(summary.error, /undeclared composition region id foreign/);
});

test("3691418011: both summaries of an invalid graybox block agree on the value", () => {
  const root = invalidGrayboxRoot();
  const reconstruction = checkReconstruction(root, { stage: "geometry" }).stages.graybox;
  const reference = checkReferenceEvidence(root).stages.graybox;

  // The two modules summarize the same throw from `validateGraybox`. Agreeing is the point.
  assert.equal(reconstruction.reason, reference.reason);
  assert.deepEqual(reconstruction.reasons, reference.reasons);
  assert.throws(() => checkGraybox(root), /undeclared composition region id foreign/);
});

test("3691418011: the final stage carries the same graybox reason as geometry", () => {
  const root = invalidGrayboxRoot();
  const final = checkReconstruction(root, { stage: "final" });
  assert.equal(final.stages.graybox.reason, "graybox-invalid");
});

// --- 3691417958: a pending source cannot carry measurements -------------------------------------
//
// `validatePendingSource` checked the *shape* of `path`, `width`, `height`, and `sha256` but never
// their absence, so a document could say the bytes never arrived while carrying the digest of
// those bytes. A reader had no way to know which half of that sentence to believe.

const PENDING_MEASUREMENTS = [
  ["path", "reference.png"],
  ["width", 723],
  ["height", 405],
  ["sha256", "b".repeat(64)],
];

function pendingReference(sourceOverrides = {}) {
  return planarReference({ source: fixtures.pendingSource(sourceOverrides) });
}

test("3691417958: a pending source is valid only while every measurement is null", () => {
  const baseline = pendingReference();
  for (const [key] of PENDING_MEASUREMENTS) assert.equal(baseline.source[key], null);
  assert.doesNotThrow(() => validateReferenceEvidence(baseline));
});

test("3691417958: any single measurement under pending is a loud contradiction", () => {
  for (const [key, value] of PENDING_MEASUREMENTS) {
    const reference = pendingReference({ [key]: value });
    assert.throws(
      () => validateReferenceEvidence(reference),
      new RegExp(`source contradiction: source\\.availability is pending but ${key} carries a value`),
      `pending source with a ${key} was accepted`,
    );
  }
});

test("3691417958: a fully measured pending source names every offending field at once", () => {
  const reference = pendingReference(Object.fromEntries(PENDING_MEASUREMENTS));
  assert.throws(() => validateReferenceEvidence(reference), (error) => {
    assert.match(error.message, /source contradiction/);
    assert.match(error.message, /path, width, height, sha256 carry a value/);
    return true;
  });
});

test("3691417958: the resolved branch is unchanged by the pending rule", () => {
  // The mirror-image rule already existed and still holds: under `resolved` the same four fields
  // must not be null. Tightening pending must not have loosened this.
  assert.doesNotThrow(() => validateReferenceEvidence(planarReference()));
  for (const [key] of PENDING_MEASUREMENTS) {
    const reference = planarReference({ source: fixtures.resolvedSource({ [key]: null }) });
    assert.throws(() => validateReferenceEvidence(reference), new RegExp(`source\\.${key}`));
  }
});

test("3691417958: the published schema pins the pending measurements to null", () => {
  const source = schema().properties.source;
  const pendingBranch = source.allOf.find(
    (entry) => entry.if?.properties?.availability?.const === "pending",
  );
  assert.ok(pendingBranch, "the schema declares no pending branch");
  for (const [key] of PENDING_MEASUREMENTS) {
    assert.deepEqual(
      pendingBranch.then.properties[key],
      { const: null },
      `the schema does not pin source.${key} to null under pending`,
    );
  }
  // The outer union still permits null so a legacy resolved document is untouched by the branch.
  for (const [key] of PENDING_MEASUREMENTS) {
    assert.ok(source.properties[key].type.includes("null"));
  }
  // The rules that were already there are still there.
  assert.deepEqual(pendingBranch.then.required, ["pendingReason", "requestedFrom"]);
  assert.deepEqual(pendingBranch.then.not, { required: ["resolvedAt"] });
});

// --- 3691417991: region contents may not defer to a neighbour -----------------------------------
//
// `reference-spec.md` and `qa-checklist.md` had forbidden `as above` since the per-region checklist
// landed, and `composition-structure.test.cjs` asserted that the *prose* said so. Nothing checked a
// document: the region schema had nowhere to record a description at all, so the rule was
// unenforceable by construction.

function region(id, overrides = {}) {
  return { id, rows: 1, columns: 3, breaksFrom: [], ...overrides };
}

function composition(regions, uniform = true) {
  return { uniform, regions };
}

test("3691417991: a composition that predates the contents field is untouched", () => {
  // Absent from every region is the legacy default, not a failure. This is the same absent-field
  // rule `source.availability` follows.
  const legacy = composition([region("board"), region("register")]);
  for (const entry of legacy.regions) assert.equal(Object.hasOwn(entry, "contents"), false);
  assert.deepEqual(validateComposition(legacy), ["board", "register"]);
});

test("3691417991: a composition that describes every region is accepted", () => {
  const described = composition([
    region("board", { contents: "Stacked slab over a two-line caption." }),
    region("register", { contents: "Three counters running left to right." }),
  ]);
  assert.deepEqual(validateComposition(described), ["board", "register"]);
});

test("3691417991: contents that defer to another region are rejected", () => {
  const deferrals = [
    "As above",
    "AS ABOVE",
    "same as the board",
    "See above",
    "ditto",
    "idem",
    // Mid-sentence, because the dodge does not have to be the whole cell to be the dodge.
    "Three columns, same as register above",
  ];
  for (const contents of deferrals) {
    const back = composition([
      region("board", { contents: "Stacked slab over a two-line caption." }),
      region("register", { contents }),
    ]);
    assert.throws(
      () => validateComposition(back),
      /composition back-reference: composition\.regions\[1\]\.contents defers to another region/,
      `${JSON.stringify(contents)} was accepted as an independent description`,
    );
  }
});

test("3691417991: two regions that genuinely look alike may say so identically", () => {
  // `reference-spec.md` gives two registers the same description. Identity is not evidence of
  // copying, so the rule catches the words of deferral and nothing else.
  const twins = composition([
    region("register-2", { contents: "Three counters running left to right." }),
    region("register-3", { contents: "Three counters running left to right." }),
  ]);
  assert.deepEqual(validateComposition(twins), ["register-2", "register-3"]);
});

test("3691417991: adopting contents for some regions and not others is a contradiction", () => {
  const partial = composition([
    region("board", { contents: "Stacked slab over a two-line caption." }),
    region("register"),
  ]);
  assert.throws(
    () => validateComposition(partial),
    /composition contradiction: composition\.regions record contents for board but not for register/,
  );

  // The other direction is the same failure, not a different one.
  const reversed = composition([
    region("board"),
    region("register", { contents: "Three counters running left to right." }),
  ]);
  assert.throws(() => validateComposition(reversed), /composition contradiction/);
});

test("3691417991: a blank description fails as an empty string, not as a back-reference", () => {
  for (const contents of ["", "   ", 7, null]) {
    const blank = composition([
      region("board", { contents }),
      region("register", { contents: "Three counters running left to right." }),
    ]);
    assert.throws(
      () => validateComposition(blank),
      /composition\.regions\[0\]\.contents must be a non-empty string/,
      `${JSON.stringify(contents)} produced the wrong diagnosis`,
    );
  }
});

test("3691417991: the back-reference and adoption failures keep separate reason prefixes", () => {
  // Two faults, two greppable prefixes: a description that defers is not the same repair as a
  // description that was never written.
  const back = composition([
    region("board", { contents: "Stacked slab over a two-line caption." }),
    region("register", { contents: "as above" }),
  ]);
  const partial = composition([
    region("board", { contents: "Stacked slab over a two-line caption." }),
    region("register"),
  ]);
  const message = (build) => {
    try {
      validateComposition(build);
      return null;
    } catch (error) {
      return error.message;
    }
  };
  const backMessage = message(back);
  const partialMessage = message(partial);
  assert.match(backMessage, /composition back-reference:/);
  assert.match(partialMessage, /composition contradiction:/);
  assert.notEqual(backMessage, partialMessage);
});

test("3691417991: the published schema mirrors the contents rule", () => {
  const document = schema();
  const contents = document.$defs.regionContents;
  assert.ok(contents, "the schema declares no regionContents definition");
  assert.equal(contents.type, "string");
  assert.equal(contents.minLength, 1);
  assert.ok(contents.not.pattern, "the schema records no back-reference pattern");
  // The pattern carries no case-insensitive flag in JSON Schema, so it is written as letter
  // classes. Checking it against the same strings the core rejects keeps the two readers aligned.
  const pattern = new RegExp(contents.not.pattern);
  for (const text of ["As above", "AS ABOVE", "same as the board", "see above", "ditto", "idem"]) {
    assert.equal(pattern.test(text), true, `the schema pattern misses ${JSON.stringify(text)}`);
  }
  assert.equal(pattern.test("Three counters running left to right."), false);

  const regions = document.properties.composition.properties.regions;
  assert.deepEqual(regions.items.properties.contents, { $ref: "#/$defs/regionContents" });
  // Optional, so a legacy composition validates unchanged.
  assert.equal(regions.items.required.includes("contents"), false);

  // Required once adopted, which is where the partial-adoption contradiction is enforced.
  const adoption = document.properties.composition.allOf.find(
    (entry) => entry.if?.properties?.regions?.contains?.required?.includes("contents"),
  );
  assert.ok(adoption, "the schema declares no once-adopted branch for contents");
  assert.deepEqual(adoption.then.properties.regions.items.required, ["contents"]);
});

// --- 3691417997: the scaffold orders the graybox capture before the spec ------------------------
//
// The scaffolded `tasks.md` was a fixed string with no graybox task at all, so a website-clone
// change with a `primary` target — the clone form of a `primary-target` reference — was told to
// write `design.md` before capturing the graybox it is supposed to be written against.

function scaffold(...args) {
  const projectRoot = track(tempRoot("design-pipeline-coderabbit-clone-"));
  fs.mkdirSync(path.join(projectRoot, "openspec", "changes"), { recursive: true });
  for (const foundation of ["DESIGN.md", "MOTION.md"]) {
    fs.copyFileSync(path.join(repoRoot, foundation), path.join(projectRoot, foundation));
  }
  const result = spawnSync(
    process.execPath,
    [initializer, "--project-root", projectRoot, "--change-id", "clone-x", ...args],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const tasks = fs.readFileSync(
    path.join(projectRoot, "openspec", "changes", "clone-x", "tasks.md"),
    "utf8",
  ).split("\n");
  return tasks;
}

function lineIndex(tasks, pattern) {
  const index = tasks.findIndex((line) => pattern.test(line));
  assert.notEqual(index, -1, `no task line matched ${pattern}`);
  return index;
}

test("3691417997: a primary clone target is told to capture the graybox before the spec", () => {
  const tasks = scaffold("--url", "https://example.com");

  const foundation = lineIndex(tasks, /Establish target-project foundation/);
  const graybox = lineIndex(tasks, /Capture a layout-only graybox/);
  const spec = lineIndex(tasks, /Write one complete spec before each bounded builder slice/);

  // The ordering is the whole finding: the capture the spec is written against has to exist first.
  assert.ok(foundation < graybox, "the graybox capture precedes the foundation task");
  assert.ok(graybox < spec, "the graybox capture does not precede the spec task");
  assert.match(tasks[graybox], /before writing design\.md/);
  assert.match(tasks[graybox], /reconstruction check --stage graybox/);
  assert.match(tasks[graybox], /\(example-com\)/);
});

test("3691417997: the graybox task names the primary targets and only those", () => {
  const tasks = scaffold(
    "--url", "https://example.com",
    "--url", "https://shop.example.com",
    "--reference-url", "https://reference.example.org/about",
  );

  const graybox = tasks[lineIndex(tasks, /Capture a layout-only graybox/)];
  assert.match(graybox, /example-com/);
  assert.match(graybox, /shop-example-com/);
  // A `reference` target is a constraint, not a pixel baseline the implementation is compared back
  // to, so it is not named by the capture task.
  assert.equal(/reference-example-org-about/.test(graybox), false);
});

test("3691417997: the surrounding checklist is otherwise unchanged", () => {
  const tasks = scaffold("--url", "https://example.com");
  const withoutGraybox = tasks.filter((line) => !/Capture a layout-only graybox/.test(line));
  assert.deepEqual(withoutGraybox, [
    "# Tasks",
    "",
    "- [ ] Verify authorization and execution capabilities.",
    "- [ ] Capture reconnaissance and interaction evidence for every target.",
    "- [ ] Establish target-project foundation and assets.",
    "- [ ] Write one complete spec before each bounded builder slice.",
    "- [ ] Assemble and run the target project's build checks.",
    "- [ ] Fill the `Spec Reconciliation` section in design.md: cite the graybox capture the spec was written against, record every value the implementation changed with an observed cause, and pass `designer-pipeline reconciliation check`.",
    "- [ ] Run visual, interaction, accessibility, motion, responsive, and headless QA.",
    "",
  ]);
});
