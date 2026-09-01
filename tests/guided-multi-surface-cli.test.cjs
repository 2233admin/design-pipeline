"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { execute, publicHelp } = require("../skill/scripts/cli-core.cjs");
const { confirmDesignBrief, createDesignBrief } = require("../skill/scripts/guided-design-intake-core.cjs");
const { decomposeReferenceRegions, normalizeReferenceSource } = require("../skill/scripts/region-template-core.cjs");
const { buildComponentFitMatrix, createDirectionLock } = require("../skill/scripts/component-fit-core.cjs");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { canonicalJson } = require("../skill/scripts/contract-utils.cjs");
const repoRoot = path.resolve(__dirname, "..");
const componentCatalog = normalizeSnapshot(JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/component-source-catalog.json"), "utf8")));
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/region-template-catalog.json"), "utf8"));

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "guided-cli-"));
}

function put(root, name, value) {
  const file = path.join(root, name);
  fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
  return file;
}

function completeBrief() {
  return confirmDesignBrief(createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "Team knowledge base",
    audience: { value: "team-members", source: "user" },
    primaryActions: { value: ["search knowledge"], source: "user" },
    surface: { value: { platform: "web", framework: "react", profileVersion: "1" }, source: "user" },
    successCriteria: { value: ["keyboard navigation works"], source: "user" },
  }));
}

function runConfirmedIntake(root, surfaceId, surface) {
  const inputFile = `${surfaceId}-input.json`;
  const briefFile = `${surfaceId}-brief.json`;
  put(root, inputFile, { projectId: "p1", surfaceId, input: "Help teams manage knowledge" });
  let current = execute(["intake", "start", "--root", root, "--artifact", inputFile, "--json"]);
  assert.equal(current.exitCode, 0);
  assert.equal(current.output.brief.status, "inferred");
  put(root, briefFile, current.output.brief);

  for (const answer of [
    { field: "audience", value: "team-members", source: "user" },
    { field: "primaryActions", value: "search-and-browse", source: "user" },
    { field: "surface", value: surface, source: "user" },
    { field: "successCriteria", value: "findability", source: "user" },
  ]) {
    const expectedField = answer.field === "audience"
      ? "primaryActions"
      : answer.field === "primaryActions"
        ? "surface"
        : answer.field === "surface"
          ? "successCriteria"
          : null;
    put(root, "answer.json", answer);
    current = execute(["intake", "answer", "--root", root, "--artifact", briefFile, "--answer", "answer.json", "--json"]);
    assert.equal(current.exitCode, 0);
    if (expectedField) assert.equal(current.output.question.field, expectedField);
    else assert.equal(current.output.question, null);
    put(root, briefFile, current.output.brief);
  }

  current = execute(["intake", "confirm", "--root", root, "--artifact", briefFile, "--json"]);
  assert.equal(current.exitCode, 0);
  assert.equal(current.output.brief.status, "user_confirmed");
  put(root, briefFile, current.output.brief);
  return { brief: current.output.brief, briefFile };
}

function makeDirectionLock() {
  return createDirectionLock({
    directionId: "signal",
    selectionReceiptHash: "a".repeat(64),
    previewArtifactSha256: "b".repeat(64),
    constraints: { era: "futurist", density: "dense" },
    visualKeywords: ["smoothui"],
  });
}

function makeDirectionPreview() {
  const artifact = {
    schema: "design-pipeline.direction-preview.v1",
    changeId: "guided-selection",
    applicability: { status: "required", reason: "visual-redesign" },
    comparison: {
      brief: { path: "brief.md", sha256: "b".repeat(64) },
      index: { path: "index.html", sha256: "b".repeat(64) },
      viewport: { width: 1440, height: 900 },
      contentFixtureSha256: "c".repeat(64),
      stateCoverage: ["default", "error"],
    },
    directions: [
      {
        id: "quiet", name: "Quiet", thesis: "Quiet thesis", signature: "Quiet signature",
        axes: { luminance: "light", typeFamily: "serif", color: "monochrome", layout: "editorial", density: "airy", era: "classic", material: "paper" },
        screenshot: { path: "quiet.png", sha256: "d".repeat(64) },
      },
      {
        id: "signal", name: "Signal", thesis: "Signal thesis", signature: "Signal signature",
        axes: { luminance: "dark", typeFamily: "sans", color: "duotone", layout: "grid", density: "dense", era: "futurist", material: "glass" },
        screenshot: { path: "signal.png", sha256: "e".repeat(64) },
      },
    ],
    decision: { status: "selected", selectedDirectionId: "signal", rationale: "Signal is the selected product direction." },
  };
  return {
    artifact,
    artifactSha256: "b".repeat(64),
    contentHash: crypto.createHash("sha256").update(canonicalJson(artifact)).digest("hex"),
    directionLockSnapshot: makeDirectionLock(),
  };
}

function adaptationContext(surface, catalogArtifact, candidate, referenceHash, directionLock, brief, componentCandidateVersions = ["table:1.0.0", "filter-sheet:1.0.0"]) {
  const matrix = buildComponentFitMatrix({
    framework: surface.framework,
    platform: surface.platform,
    capabilities: ["button"],
    directionLock,
    catalog: componentCatalog,
  });
  return {
    brief,
    surface,
    catalog: catalogArtifact,
    candidate: {
      id: candidate.templateId,
      version: candidate.templateVersion,
      platform: candidate.platform,
      framework: candidate.framework,
    },
    referenceHash,
    directionLock,
    componentCandidateVersions,
    componentFitMatrix: matrix,
    componentFitBinding: { region: candidate.templateId, matrixHash: matrix.matrixHash },
  };
}

test("runs one web and mobile project through the complete guided vertical", () => {
  const root = tempRoot();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "guided-cli-outside-"));
  try {
    const webSurface = {
      projectId: "p1",
      surfaceId: "web-admin",
      platform: "web",
      framework: "react",
      profileVersion: "1",
    };
    const mobileSurface = {
      projectId: "p1",
      surfaceId: "mobile-user",
      platform: "mobile",
      framework: "react-native",
      profileVersion: "1",
    };
    const directionLock = makeDirectionLock();
    const fixtureCatalog = {
      ...catalog,
      entries: catalog.entries.filter((entry) => [
        "project-data-table-web-react",
        "project-data-table-mobile-react-native",
      ].includes(entry.templateId)),
    };
    const referenceHtml = "<main data-region=\"data-table\" data-capabilities=\"search,filter,sort\"><table aria-label=\"Knowledge\"></table></main>";
    put(root, "reference.html", referenceHtml);
    const source = normalizeReferenceSource({
      sourceKind: "local_html",
      pathOrProjectRef: "reference.html",
      capturedAt: "2026-09-01T00:00:00.000Z",
      provenance: { source: "task-6-fixture", owner: "design-pipeline" },
      licenseState: "project-owned",
      allowedDerivations: ["reference-only", "adaptation"],
    }, root);
    assert.equal(source.parseStatus, "pending");
    assert.equal(decomposeReferenceRegions(source).length, 1);
    put(root, "reference.json", source);
    put(root, "catalog.json", fixtureCatalog);
    put(root, "request.json", {
      regionKind: "data-table",
      capabilities: ["search", "filter", "sort"],
      accessibilityRequired: true,
      componentFit: {
        status: "ready",
        compatible: true,
        templateIds: ["project-data-table-web-react", "project-data-table-mobile-react-native"],
        componentCandidateVersions: ["table:1.0.0", "filter-sheet:1.0.0"],
      },
      referenceSource: source,
    });
    put(root, "web-surface.json", webSurface);
    put(root, "mobile-surface.json", mobileSurface);

    const webIntake = runConfirmedIntake(root, "web-admin", webSurface);
    const mobileIntake = runConfirmedIntake(root, "mobile-user", mobileSurface);
    const webSearch = execute(["template", "search", "--root", root, "--catalog", "catalog.json", "--surface", "web-surface.json", "--request", "request.json", "--json"]);
    const mobileSearch = execute(["template", "search", "--root", root, "--catalog", "catalog.json", "--surface", "mobile-surface.json", "--request", "request.json", "--json"]);
    assert.equal(webSearch.exitCode, 0);
    assert.equal(mobileSearch.exitCode, 0);
    assert.equal(webSearch.output.status, "ready");
    assert.equal(mobileSearch.output.status, "ready");
    assert.equal(webSearch.output.matches.length, 1);
    assert.equal(mobileSearch.output.matches.length, 1);
    assert.equal(webSearch.output.matches[0].regionKind, "data-table");
    assert.equal(mobileSearch.output.matches[0].regionKind, "data-table");
    assert.equal(webSearch.output.matches[0].platform, "web");
    assert.equal(mobileSearch.output.matches[0].platform, "mobile");

    const evidence = [
      {
        kind: "license",
        value: "project-owned",
        source: "reference.html",
        contentHash: source.contentHash,
        authorization: "project-owned fixture",
      },
      {
        kind: "provenance",
        value: "task-6-fixture",
        source: "reference.html",
        contentHash: source.contentHash,
        attribution: "design-pipeline test fixture",
      },
    ];
    const webSelection = {
      brief: webIntake.brief,
      projectId: "p1",
      surfaceId: "web-admin",
      surface: webSurface,
      sourceAndLicenseEvidence: evidence,
      referenceHash: source.contentHash,
      candidate: {
        id: webSearch.output.matches[0].templateId,
        version: webSearch.output.matches[0].templateVersion,
        platform: webSearch.output.matches[0].platform,
        framework: webSearch.output.matches[0].framework,
      },
      selectionMode: "adopt",
      directionLockSnapshot: directionLock,
      directionPreview: makeDirectionPreview(),
      catalog: fixtureCatalog,
      catalogVersion: fixtureCatalog.version,
      hardGateResults: {
        license: "pass",
        provenance: "pass",
        security: "pass",
        accessibility: "pass",
        surfacePlatform: "web",
      },
      componentCandidateVersions: ["table:1.0.0", "filter-sheet:1.0.0"],
      acceptanceCriteria: ["findability"],
    };
    const mobileSelection = {
      ...webSelection,
      brief: mobileIntake.brief,
      surfaceId: "mobile-user",
      surface: mobileSurface,
      candidate: {
        id: mobileSearch.output.matches[0].templateId,
        version: mobileSearch.output.matches[0].templateVersion,
        platform: mobileSearch.output.matches[0].platform,
        framework: mobileSearch.output.matches[0].framework,
      },
      hardGateResults: { ...webSelection.hardGateResults, surfacePlatform: "mobile", touchTargets: "pass" },
    };
    put(root, "web-selection.json", webSelection);
    put(root, "mobile-selection.json", mobileSelection);
    const webSelected = execute(["template", "select", "--root", root, "--selection", "web-selection.json", "--json"]);
    const mobileSelected = execute(["template", "select", "--root", root, "--selection", "mobile-selection.json", "--json"]);
    assert.equal(webSelected.exitCode, 0);
    assert.equal(mobileSelected.exitCode, 0);
    assert.notDeepEqual(webSelected.output.receipt.hardGateResults, mobileSelected.output.receipt.hardGateResults);
    assert.equal(webSelected.output.receipt.surfaceBindingSnapshot.platform, "web");
    assert.equal(mobileSelected.output.receipt.surfaceBindingSnapshot.platform, "mobile");
    assert.equal(webSelected.output.receipt.surfaceId, "web-admin");
    assert.equal(mobileSelected.output.receipt.surfaceId, "mobile-user");

    put(root, "web-receipt.json", webSelected.output.receipt);
    put(root, "mobile-receipt.json", mobileSelected.output.receipt);
    const webContext = adaptationContext(webSurface, fixtureCatalog, webSearch.output.matches[0], source.contentHash, directionLock, webIntake.brief);
    const mobileContext = adaptationContext(mobileSurface, fixtureCatalog, mobileSearch.output.matches[0], source.contentHash, directionLock, mobileIntake.brief);
    put(root, "web-context.json", webContext);
    put(root, "mobile-context.json", mobileContext);
    const webAdapted = execute(["template", "adapt", "--root", root, "--receipt", "web-receipt.json", "--context", "web-context.json", "--json"]);
    const mobileAdapted = execute(["template", "adapt", "--root", root, "--receipt", "mobile-receipt.json", "--context", "mobile-context.json", "--json"]);
    assert.equal(webAdapted.exitCode, 0);
    assert.equal(mobileAdapted.exitCode, 0);
    assert.equal(webAdapted.output.plan.status, "draft");
    assert.equal(mobileAdapted.output.plan.status, "draft");
    assert.equal(webAdapted.output.taskGate.allowed, false);
    assert.equal(mobileAdapted.output.taskGate.allowed, false);

    put(root, "web-plan.json", webAdapted.output.plan);
    put(root, "review.json", { reviewer: "user", decision: "approve", rationale: "fits the Surface" });
    const reviewed = execute(["template", "review", "--root", root, "--plan", "web-plan.json", "--review", "review.json", "--json"]);
    assert.equal(reviewed.exitCode, 0);
    assert.equal(reviewed.output.plan.status, "awaiting_review");
    assert.equal(reviewed.output.taskGate.allowed, false);
    put(root, "reviewed-plan.json", reviewed.output.plan);
    put(root, "approval.json", { reviewer: "user", rationale: "approved for implementation" });
    const approved = execute(["template", "approve", "--root", root, "--plan", "reviewed-plan.json", "--approval", "approval.json", "--json"]);
    assert.equal(approved.exitCode, 0);
    assert.equal(approved.output.plan.status, "approved");
    assert.equal(approved.output.taskGate.allowed, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("keeps guided retrieval and lifecycle gates fail-closed", () => {
  const root = tempRoot();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "guided-cli-outside-"));
  try {
    const surface = {
      projectId: "p1",
      surfaceId: "web-admin",
      platform: "web",
      framework: "react",
      profileVersion: "1",
    };
    const directionLock = makeDirectionLock();
    const fixtureCatalog = {
      ...catalog,
      entries: catalog.entries.filter((entry) => [
        "project-data-table-web-react",
        "project-data-table-mobile-react-native",
      ].includes(entry.templateId)),
    };
    const sourceHtml = path.join(outsideRoot, "outside.html");
    fs.writeFileSync(sourceHtml, "<main data-region=\"data-table\"></main>");
    const outsideSource = normalizeReferenceSource({
      sourceKind: "local_html",
      pathOrProjectRef: sourceHtml,
      capturedAt: "2026-09-01T00:00:00.000Z",
      provenance: { source: "outside-fixture" },
      licenseState: "project-owned",
      allowedDerivations: ["reference-only"],
    }, root);
    assert.equal(outsideSource.parseStatus, "invalid");
    assert.equal(outsideSource.reason, "source-path-invalid");

    const incompleteBrief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "vague request" });
    const candidate = fixtureCatalog.entries[0];
    const baseSelection = {
      brief: incompleteBrief,
      projectId: "p1",
      surfaceId: "web-admin",
      surface,
      referenceHash: "a".repeat(64),
      candidate: { id: candidate.templateId, version: candidate.templateVersion, platform: candidate.platform, framework: candidate.framework },
      catalog: fixtureCatalog,
      selectionMode: "adopt",
      directionLockSnapshot: directionLock,
      directionPreview: makeDirectionPreview(),
      acceptanceCriteria: ["findability"],
    };
    put(root, "incomplete-selection.json", baseSelection);
    const unresolved = execute(["template", "select", "--root", root, "--selection", "incomplete-selection.json", "--json"]);
    assert.equal(unresolved.exitCode, 2);
    assert.equal(unresolved.output.status, "blocked");
    assert.match(unresolved.output.reason, /DesignBrief is .*confirmation|required/i);

    const referenceSelection = { ...baseSelection, selectionMode: "reference" };
    delete referenceSelection.sourceAndLicenseEvidence;
    referenceSelection.brief = completeBrief();
    put(root, "reference-selection.json", referenceSelection);
    const reference = execute(["template", "select", "--root", root, "--selection", "reference-selection.json", "--json"]);
    assert.equal(reference.exitCode, 0);
    assert.equal(reference.output.receipt.selectionMode, "reference");

    put(root, "adopt-missing-provenance.json", baseSelection);
    const missingProvenance = execute(["template", "select", "--root", root, "--selection", "adopt-missing-provenance.json", "--json"]);
    assert.equal(missingProvenance.exitCode, 2);
    assert.equal(missingProvenance.output.status, "blocked");
    assert.match(missingProvenance.output.reason, /DesignBrief is .*confirmation|required/i);
    const adoptMissingEvidence = { ...baseSelection, brief: completeBrief() };
    put(root, "adopt-missing-evidence.json", adoptMissingEvidence);
    const blockedAdopt = execute(["template", "select", "--root", root, "--selection", "adopt-missing-evidence.json", "--json"]);
    assert.equal(blockedAdopt.exitCode, 1);
    assert.match(blockedAdopt.output.error.message, /adopt requires explicit license and provenance evidence/);

    const referenceHash = "a".repeat(64);
    const evidence = [
      { kind: "license", value: "project-owned", source: "fixture", contentHash: referenceHash, authorization: "fixture" },
      { kind: "provenance", value: "task-6-fixture", source: "fixture", contentHash: referenceHash, attribution: "fixture" },
    ];
    const validSelection = {
      ...adoptMissingEvidence,
      referenceHash,
      sourceAndLicenseEvidence: evidence,
      catalogVersion: "1",
      hardGateResults: { license: "pass", provenance: "pass", security: "pass", accessibility: "pass" },
      componentCandidateVersions: ["table:1.0.0"],
    };
    put(root, "valid-selection.json", validSelection);
    const selected = execute(["template", "select", "--root", root, "--selection", "valid-selection.json", "--json"]);
    assert.equal(selected.exitCode, 0);
    put(root, "receipt.json", selected.output.receipt);
    const context = adaptationContext(surface, fixtureCatalog, candidate, referenceHash, directionLock, completeBrief(), ["table:1.0.0"]);
    put(root, "stale-catalog-context.json", { ...context, catalog: { ...fixtureCatalog, version: "2" } });
    const staleCatalog = execute(["template", "adapt", "--root", root, "--receipt", "receipt.json", "--context", "stale-catalog-context.json", "--json"]);
    assert.equal(staleCatalog.exitCode, 1);
    assert.match(staleCatalog.output.error.message, /catalog version drifted/i);
    put(root, "changed-lock-context.json", { ...context, directionLock: { ...directionLock, hash: "e".repeat(64) } });
    const changedLock = execute(["template", "adapt", "--root", root, "--receipt", "receipt.json", "--context", "changed-lock-context.json", "--json"]);
    assert.equal(changedLock.exitCode, 1);
    assert.match(changedLock.output.error.message, /direction lock/i);

    put(root, "unresolved-context.json", { ...context, brief: incompleteBrief });
    const unresolvedTransition = execute(["template", "adapt", "--root", root, "--receipt", "receipt.json", "--context", "unresolved-context.json", "--json"]);
    assert.equal(unresolvedTransition.exitCode, 2);
    assert.match(unresolvedTransition.output.reason, /DesignBrief is .*confirmation|required/i);

    put(root, "no-candidate-request.json", { regionKind: "data-table", capabilities: ["does-not-exist"], surfaceBinding: surface });
    put(root, "catalog.json", fixtureCatalog);
    put(root, "surface.json", surface);
    const noCandidate = execute(["template", "search", "--root", root, "--catalog", "catalog.json", "--surface", "surface.json", "--request", "no-candidate-request.json", "--json"]);
    assert.equal(noCandidate.exitCode, 0);
    assert.equal(noCandidate.output.status, "no-suitable-candidate");
    assert.equal(noCandidate.output.matches.length, 0);

    const gameCandidate = {
      ...candidate,
      templateId: "game-data-table",
      platform: "game",
      framework: "agnostic",
    };
    const gameCatalog = { ...fixtureCatalog, entries: [...fixtureCatalog.entries, gameCandidate] };
    put(root, "game-catalog.json", gameCatalog);
    put(root, "retrieval-request.json", { regionKind: "data-table", capabilities: ["search", "filter", "sort"] });
    const gameRejectedWeb = execute(["template", "search", "--root", root, "--catalog", "game-catalog.json", "--surface", "surface.json", "--request", "retrieval-request.json", "--json"]);
    assert.equal(gameRejectedWeb.exitCode, 0);
    assert.ok(gameRejectedWeb.output.matches.every((match) => match.platform !== "game"));
    assert.ok(gameRejectedWeb.output.rejected.some((item) => item.templateId === "game-data-table" && item.reasonCode === "surface-platform-mismatch"));
    const mobileSurface = { ...surface, surfaceId: "mobile-user", platform: "mobile", framework: "react-native" };
    put(root, "mobile-surface.json", mobileSurface);
    const gameRejectedMobile = execute(["template", "search", "--root", root, "--catalog", "game-catalog.json", "--surface", "mobile-surface.json", "--request", "retrieval-request.json", "--json"]);
    assert.equal(gameRejectedMobile.exitCode, 0);
    assert.ok(gameRejectedMobile.output.matches.every((match) => match.platform !== "game"));
    assert.ok(gameRejectedMobile.output.rejected.some((item) => item.templateId === "game-data-table" && item.reasonCode === "surface-platform-mismatch"));

    const draftContext = adaptationContext(surface, fixtureCatalog, candidate, referenceHash, directionLock, completeBrief(), ["table:1.0.0"]);
    put(root, "draft-context.json", draftContext);
    const adapted = execute(["template", "adapt", "--root", root, "--receipt", "receipt.json", "--context", "draft-context.json", "--json"]);
    assert.equal(adapted.exitCode, 0);
    put(root, "draft-plan.json", adapted.output.plan);
    put(root, "revision.json", {
      reviewer: "user",
      decision: "revise",
      rationale: "add the platform-specific control treatment",
      revision: {
        platformAdaptations: [
          "respect-surface-platform-constraints",
          "Adapt web layout and interaction behavior without changing the Surface direction lock",
          "Use responsive table controls",
        ],
      },
    });
    const revised = execute(["template", "review", "--root", root, "--plan", "draft-plan.json", "--review", "revision.json", "--json"]);
    assert.equal(revised.exitCode, 0);
    assert.equal(revised.output.plan.status, "awaiting_review");
    assert.equal(revised.output.taskGate.allowed, false);
    put(root, "revised-plan.json", revised.output.plan);
    put(root, "approval.json", { reviewer: "user", rationale: "approved after re-review" });
    const reapproved = execute(["template", "approve", "--root", root, "--plan", "revised-plan.json", "--approval", "approval.json", "--json"]);
    assert.equal(reapproved.exitCode, 0);
    assert.equal(reapproved.output.taskGate.allowed, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("runs intake start and confirms the existing CLI envelope", () => {
  const root = tempRoot();
  put(root, "input.json", { projectId: "p1", surfaceId: "web-admin", input: "Make a team knowledge base" });
  const intake = execute(["intake", "start", "--root", root, "--artifact", "input.json", "--json"]);
  assert.equal(intake.exitCode, 0);
  assert.equal(intake.output.schema, "design-pipeline.cli-result.v1");
  assert.equal(intake.output.ok, true);
  assert.equal(intake.output.brief.status, "inferred");

  put(root, "brief.json", intake.output.brief);
  const blocked = execute(["intake", "confirm", "--root", root, "--artifact", "brief.json", "--json"]);
  assert.equal(blocked.exitCode, 2);
  assert.equal(blocked.output.ok, true);
  assert.equal(blocked.output.status, "blocked");
});

test("validates surfaces and searches templates with Surface platform and framework", () => {
  const root = tempRoot();
  put(root, "surface.json", { projectId: "p1", surfaceId: "web-admin", platform: "web", framework: "react", profileVersion: "1" });
  put(root, "catalog.json", catalog);
  put(root, "request.json", { regionKind: "data-table", capabilities: ["search", "filter"], accessibilityRequired: true });

  const surface = execute(["surface", "validate", "--root", root, "--artifact", "surface.json", "--json"]);
  assert.equal(surface.exitCode, 0);
  assert.equal(surface.output.surface.platform, "web");
  const inventory = execute(["template", "inventory", "--root", root, "--catalog", "catalog.json", "--json"]);
  assert.equal(inventory.exitCode, 0);
  assert.ok(Array.isArray(inventory.output.catalog.entries));
  const search = execute(["template", "search", "--root", root, "--catalog", "catalog.json", "--surface", "surface.json", "--request", "request.json", "--json"]);
  assert.equal(search.exitCode, 0);
  assert.ok(Array.isArray(search.output.matches));
  assert.equal(search.output.query.surfaceBinding.platform, "web");
  assert.equal(search.output.query.surfaceBinding.framework, "react");

  put(root, "game.json", { projectId: "p1", surfaceId: "game", platform: "game", framework: "custom", profileVersion: "1", firstWave: false });
  const game = execute(["template", "search", "--root", root, "--catalog", "catalog.json", "--surface", "game.json", "--request", "request.json", "--json"]);
  assert.equal(game.exitCode, 2);
  assert.equal(game.output.status, "blocked");
});

test("blocks selection until the brief is confirmed and gates approved plans", () => {
  const root = tempRoot();
  const incomplete = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "vague request" });
  put(root, "selection-blocked.json", {
    brief: incomplete,
    projectId: "p1", surfaceId: "web-admin",
    surface: { projectId: "p1", surfaceId: "web-admin", platform: "web", framework: "react", profileVersion: "1" },
    referenceHash: "a".repeat(64),
    candidate: { id: "project-data-table-web-react", version: "1.0.0", platform: "web", framework: "react" },
    selectionMode: "reference", directionLockSnapshot: makeDirectionLock(),
    hardGateResults: { license: "pass", provenance: "pass", accessibility: "pass" },
    acceptanceCriteria: ["keyboard navigation works"],
  });
  const selectionInput = {
    brief: completeBrief(),
    projectId: "p1", surfaceId: "web-admin",
    surface: { projectId: "p1", surfaceId: "web-admin", platform: "web", framework: "react", profileVersion: "1" },
    referenceHash: "a".repeat(64),
    selectionMode: "reference", directionLockSnapshot: makeDirectionLock(),
    directionPreview: makeDirectionPreview(),
    candidate: { id: "project-data-table-web-react", version: "1.0.0", platform: "web", framework: "react" },
    searchedCatalog: { entries: [{ templateId: "project-data-table-web-react", templateVersion: "1.0.0", platform: "web", framework: "react" }] },
    acceptanceCriteria: ["keyboard navigation works"],
  };
  put(root, "selection-alias-mismatch.json", {
    ...selectionInput,
    surface: { projectId: "p1", surfaceId: "web-admin", platform: "web", framework: "react", profileVersion: "1", directionLock: { hash: "c".repeat(64) } },
    directionLock: { hash: "d".repeat(64) },
  });
  const aliasMismatch = execute(["template", "select", "--root", root, "--selection", "selection-alias-mismatch.json", "--json"]);
  assert.equal(aliasMismatch.exitCode, 2);
  put(root, "hash-only-preview.json", {
    ...selectionInput,
    directionPreview: { artifactSha256: "b".repeat(64), contentHash: "c".repeat(64) },
  });
  const hashOnly = execute(["template", "select", "--root", root, "--selection", "hash-only-preview.json", "--json"]);
  assert.equal(hashOnly.exitCode, 1);
  assert.match(hashOnly.output.error.message, /direction preview artifact/i);
  assert.match(aliasMismatch.output.reason, /direction-lock|direction lock/i);

  put(root, "selection-identity-mismatch.json", { ...selectionInput, projectId: "p2" });
  const identityMismatch = execute(["template", "select", "--root", root, "--selection", "selection-identity-mismatch.json", "--json"]);
  assert.equal(identityMismatch.exitCode, 2);
  assert.match(identityMismatch.output.reason, /projectId|DesignBrief/i);

  put(root, "selection.json", selectionInput);
  const selected = execute(["template", "select", "--root", root, "--selection", "selection.json", "--json"]);
  assert.equal(selected.exitCode, 0);
  put(root, "receipt.json", selected.output.receipt);
  put(root, "context.json", {
    surface: { projectId: "p1", surfaceId: "web-admin", platform: "web", framework: "react", profileVersion: "1" },
    componentFitRequest: { platform: "web", framework: "react", capabilities: ["button"], catalog: componentCatalog },
  });
  const adapted = execute(["template", "adapt", "--root", root, "--receipt", "receipt.json", "--context", "context.json", "--json"]);
  assert.equal(adapted.exitCode, 0);
  assert.equal(adapted.output.plan.status, "draft");
  assert.equal(adapted.output.taskGate.allowed, false);

  put(root, "game-context.json", { platform: "game", firstWave: false });
  const gameAdaptation = execute(["template", "adapt", "--root", root, "--receipt", "receipt.json", "--context", "game-context.json", "--json"]);
  assert.equal(gameAdaptation.exitCode, 2);
  assert.equal(gameAdaptation.output.status, "blocked");

  put(root, "plan.json", adapted.output.plan);
  put(root, "review.json", { reviewer: "user", decision: "approve", rationale: "fits the surface" });
  const reviewed = execute(["template", "review", "--root", root, "--plan", "plan.json", "--review", "review.json", "--json"]);
  assert.equal(reviewed.exitCode, 0);
  put(root, "reviewed.json", reviewed.output.plan);
  put(root, "approval.json", { reviewer: "user", rationale: "approved" });
  const approved = execute(["template", "approve", "--root", root, "--plan", "reviewed.json", "--approval", "approval.json", "--json"]);
  assert.equal(approved.exitCode, 0);
  assert.equal(approved.output.taskGate.allowed, true);
});

test("answers intake questions through contained artifacts", () => {
  const root = tempRoot();
  put(root, "brief.json", createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "Knowledge base" }));
  put(root, "answer.json", { field: "audience", value: "team-members", source: "user" });
  const answer = execute(["intake", "answer", "--root", root, "--artifact", "brief.json", "--answer", "answer.json", "--json"]);
  assert.equal(answer.exitCode, 0);
  assert.equal(answer.output.brief.audience.value, "team-members");
  assert.equal(answer.output.question.field, "primaryActions");

  const outside = execute(["intake", "start", "--root", root, "--artifact", path.resolve(root, "..", "outside.json"), "--json"]);
  assert.equal(outside.exitCode, 1);
  assert.equal(outside.output.ok, false);
});

test("help distinguishes every guided multi-surface command", () => {
  const help = publicHelp();
  for (const command of [
    "surface validate --artifact <file> --json",
    "intake start --artifact <file> --json",
    "intake answer --artifact <file> --answer <file> --json",
    "intake confirm --artifact <file> --json",
    "template inventory --catalog <file> --json",
    "template search --catalog <file> --surface <file> --request <file> --json",
    "template select --selection <file> --json",
    "template adapt --receipt <file> --context <file> --json",
    "template review --plan <file> --review <file> --json",
    "template approve --plan <file> --approval <file> --json",
  ]) assert.ok(help.includes(command), command);
});
