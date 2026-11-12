"use strict";

// Exercise an installed skill, not producer internals or repaired inventory fixtures.
// All installation mutations are confined to the temporary full skill copy.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const SKILL = path.resolve(__dirname, "../skill");
const BUNDLE_SOURCE = "references/astryx-design-system-snapshot.json";
const SCRATCH = "Build a new UI from scratch with a project-owned custom design system, not a catalog dependency.";
const SUMMARY = "The bounded static project sources and their exclusions were inspected and reported. No rendered layout, browser behavior, or owner Visual Acceptance is claimed.";
const RUNTIME = { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" };
const LOCAL_IDS = Array.from({ length: 60 }, (_, index) => `shell-${String(index + 1).padStart(2, "0")}`);
const EXPECTED_IDS = LOCAL_IDS.map(id => `public-fixture:template:${id}`);
const sha = bytes => `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
function writeJson(root, name, value) {
  fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2) + "\n");
}
function snapshot() {
  return {
    schema: "design-pipeline.design-system-snapshot.v1", version: "1", namespace: "public-fixture",
    provenance: { source: "https://example.test/public-fixture", license: "MIT" },
    templates: LOCAL_IDS.map(id => ({
      id, name: `App shell ${id}`, description: "App shell for a local UI.", status: "stable", category: "react",
      keywords: ["app shell"], runtime: { react: "^19.0.0", reactDom: "^19.0.0", stylex: "^0.15.0" },
    })),
  };
}
function searchedSelection(mode, ids, actor = mode === "reference" ? "agent" : "owner", source = "request", text = `Use the compared app shell as ${mode}.`) {
  return {
    basis: "capability-search", authority: { actor, source, choice: mode, text },
    rationale: "Compare the actual app-shell search hits for this UI, retaining the intended research or runtime role.",
    compatibility: "React 19, react-dom 19 and StyleX 0.15 remain compatible; reference research adds no dependencies.",
    compared: ids.map(id => ({ id, reason: "Compared this actual hit's app-shell structure and runtime fit." })),
  };
}
function scratchRequest() {
  return {
    schema: "design-pipeline.design-system-decision-request.v1", version: "1", mode: "custom", project: {},
    frontendStackDecisionPath: "frontend-stack-decision.json",
    selection: {
      basis: "owner-scratch", authority: { actor: "owner", source: "request", choice: "custom", text: SCRATCH },
      rationale: "The actual owner request explicitly selects a project-owned scratch system without search.", compared: [],
    },
  };
}

test("public design-system producers and installed frontend consumers retain current evidence", { concurrency: false }, async t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "design-system-public-consumers-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const installed = path.join(fixture, "skill");
  fs.cpSync(SKILL, installed, { recursive: true });
  const script = path.join(installed, "scripts/designer-pipeline.cjs");
  const bundle = path.join(installed, BUNDLE_SOURCE);
  const originalBundle = fs.readFileSync(bundle);
  // Keep this validator loaded across every mutation: fresh CLI processes alone must
  // not conceal a cached-bundle weakness in the shared public validator.
  const { validateDesignSystemDecision } = require(path.join(installed, "scripts/design-system-decision-core.cjs"));
  let projectNumber = 0;
  function project() {
    const root = path.join(fixture, `project-${++projectNumber}`);
    fs.mkdirSync(root);
    fs.mkdirSync(path.join(root, "src"));
    fs.writeFileSync(path.join(root, "src", "index.html"), "<!doctype html><main><h1>Local research UI</h1></main>\n");
    return root;
  }
  function invoke(root, args) {
    const run = spawnSync(process.execPath, [script, ...args, "--root", root, "--project-root", root, "--json"], {
      cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, windowsHide: true,
    });
    assert.ifError(run.error);
    assert.equal(run.signal, null, `CLI terminated: ${run.stderr}`);
    let output;
    try { output = JSON.parse(run.stdout); }
    catch (error) { assert.fail(`CLI did not emit JSON: ${error.message}\n${run.stdout}\n${run.stderr}`); }
    return { code: run.status, output, diagnostic: JSON.stringify({ args, status: run.status, output, stderr: run.stderr }) };
  }
  function cli(root, args, code = 0) {
    const run = invoke(root, args);
    assert.equal(run.code, code, run.diagnostic);
    assert.equal(run.output.ok, true, run.diagnostic);
    return run.output;
  }
  function stack(root) {
    writeJson(root, "frontend-stack-request.json", {
      schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: "Build a local frontend.",
      requested: { styling: "none", uiLibrary: "none" },
    });
    const output = cli(root, ["design-system", "resolve-stack", "--artifact", "frontend-stack-request.json", "--write", "--output", "frontend-stack-decision.json"]);
    assert.equal(output.decision.status, "ready");
  }
  function normalize(root) {
    writeJson(root, "snapshot.json", snapshot());
    const output = cli(root, ["design-system", "normalize", "--snapshot", "snapshot.json", "--write", "--output", "catalog.json"]);
    assert.deepEqual(output.catalog.entries.map(entry => entry.id), EXPECTED_IDS);
    return output.catalog;
  }
  function decompose(root, query, flags = [], name = "inventory.json") {
    const output = cli(root, ["design-system", "decompose", "--query", query, ...flags, "--write", "--output", name]);
    return output;
  }
  function publish(root, request, flags = [], name = "decision.json", code = 0) {
    const requestName = `${name}.request.json`;
    writeJson(root, requestName, request);
    const output = cli(root, ["design-system", "decide", "--artifact", requestName, ...flags, "--write", "--output", name], code);
    assert.equal(validateDesignSystemDecision(output.decision), output.decision);
    return output.decision;
  }
  function prepareFrontend(root, query = SCRATCH) {
    const first = cli(root, ["next", "--deliverable", "ui", "--tier", "quick", "--purpose", "new", "--scope", "src", "--query", query]);
    assert.equal(first.stage, "observe");
    const observation = cli(root, ["decide", "--stage", "observe", "--answer", SUMMARY]);
    assert.equal(observation.status, "recorded");
    const intake = cli(root, ["next"]);
    assert.equal(intake.stage, "intake");
    assert.equal(intake.type, "run");
    assert.equal(intake.questions, undefined);
    cli(root, ["decide", "--stage", "intake", "--choice", "skip", "--answer", query]);
    assert.equal(cli(root, ["next"]).stage, "design-system");
  }
  function consume(root, name = "decision.json", reply) {
    const output = cli(root, ["decide", "--stage", "design-system", "--artifact", name, ...(reply ? ["--answer", reply] : [])]);
    assert.equal(output.status, "recorded");
    return output.next;
  }
  function cannotConsume(root, name = "decision.json") {
    const run = invoke(root, ["decide", "--stage", "design-system", "--artifact", name]);
    assert.notEqual(run.code, 0, run.diagnostic);
    assert.equal(run.output.ok, false, run.diagnostic);
    const next = cli(root, ["next"]);
    assert.equal(next.stage, "design-system");
    assert.notEqual(next.verification.status, "ready");
  }
  function assertInventory(output, ids) {
    const inventory = output.inventory;
    assert.equal(inventory.directQueryResults, ids.length);
    assert.deepEqual(inventory.directMatchedIds, ids);
    assert.deepEqual(inventory.searchedCapabilities, ["app-shell"]);
    assert.deepEqual(Object.keys(inventory.capabilityResults), ["app-shell"]);
    assert.equal(inventory.capabilityResults["app-shell"].count, ids.length);
    assert.deepEqual(inventory.capabilityResults["app-shell"].matchedIds, ids);
    assert.equal(output.totalUniqueEntries, ids.length);
    assert.equal(inventory.zeroResultInconclusive, false);
  }

  await t.test("normalize and unbounded decompose publish all sixty IDs unchanged to decide", () => {
    const root = project();
    stack(root);
    normalize(root);
    const output = decompose(root, "app shell", ["--catalog", "catalog.json"]);
    assertInventory(output, EXPECTED_IDS);
    assert.deepEqual(output.inventory.searchOptions, {});
    const inventoryBytes = fs.readFileSync(path.join(root, "inventory.json"));
    const decision = publish(root, {
      schema: "design-pipeline.design-system-decision-request.v1", version: "1", mode: "reference", project: {},
      frontendStackDecisionPath: "frontend-stack-decision.json", catalogPath: "catalog.json", capabilityInventoryPath: "inventory.json",
      candidateId: EXPECTED_IDS[0], selection: searchedSelection("reference", EXPECTED_IDS),
    });
    assert.equal(decision.status, "ready");
    assert.deepEqual(decision.capabilityInventory, output.inventory);
    assert.deepEqual(decision.request.capabilityInventory, output.inventory);
    assert.deepEqual(fs.readFileSync(path.join(root, "inventory.json")), inventoryBytes);
  });

  await t.test("a bounded capability search limits matching hits, not an unrelated catalog prefix", () => {
    const root = project();
    stack(root);
    const source = snapshot();
    source.templates.unshift(...Array.from({ length: 20 }, (_, index) => ({
      id: `aaa-decoration-${String(index).padStart(2, "0")}`, name: `Decoration ${index}`,
      description: "An ornamental illustration.", status: "stable", category: "react", keywords: ["ornament"],
    })));
    writeJson(root, "snapshot.json", source);
    cli(root, ["design-system", "normalize", "--snapshot", "snapshot.json", "--write", "--output", "catalog.json"]);
    const output = decompose(root, "app shell", ["--catalog", "catalog.json", "--limit", "5"]);
    assertInventory(output, EXPECTED_IDS.slice(0, 5));
    const inventoryBytes = fs.readFileSync(path.join(root, "inventory.json"));
    const decision = publish(root, {
      mode: "reference", project: {}, frontendStackDecisionPath: "frontend-stack-decision.json",
      catalogPath: "catalog.json", capabilityInventoryPath: "inventory.json",
      candidateId: EXPECTED_IDS[0], selection: searchedSelection("reference", EXPECTED_IDS.slice(0, 5)),
    });
    assert.equal(decision.status, "ready");
    assert.deepEqual(decision.capabilityInventory, output.inventory);
    assert.deepEqual(fs.readFileSync(path.join(root, "inventory.json")), inventoryBytes);
  });

  await t.test("bounded replay is truthful for first matching entries but cannot prove complete fallback evidence", () => {
    const root = project();
    stack(root);
    normalize(root);
    const output = decompose(root, "app shell", ["--catalog", "catalog.json", "--limit", "3"]);
    assertInventory(output, EXPECTED_IDS.slice(0, 3));
    assert.deepEqual(output.inventory.searchOptions, { limit: 3 });
    const request = {
      mode: "reference", project: {}, catalogPath: "catalog.json", capabilityInventoryPath: "inventory.json",
      frontendStackDecisionPath: "frontend-stack-decision.json", candidateId: EXPECTED_IDS[0],
      selection: searchedSelection("reference", EXPECTED_IDS.slice(0, 3)),
    };
    assert.equal(publish(root, request, [], "bounded-reference.json").status, "ready");
    const { candidateId, ...fallback } = request;
    const blocked = publish(root, { ...fallback, mode: "custom", selection: searchedSelection("custom", EXPECTED_IDS.slice(0, 3)) }, [], "bounded-fallback.json", 2);
    assert.equal(blocked.status, "blocked");
    assert.match(blocked.rationale.join("\n"), /[Bb]ounded|omit.*relevant/);
    assert.deepEqual(blocked.capabilityInventory, output.inventory);
  });

  await t.test("a product-phrase miss with bundled app-shell, navigation and dialog hits remains valid research", () => {
    const root = project();
    stack(root);
    cli(root, ["design-system", "normalize", "--write", "--output", "catalog.json"]);
    // The capability words describe the real UI need; bare 'research console' has no lexical capability terms.
    const output = decompose(root, "research console with app shell navigation dialog", ["--catalog", "catalog.json"]);
    assert.equal(output.inventory.directQueryResults, 0);
    assert.deepEqual(output.inventory.directMatchedIds, []);
    assert.equal(output.inventory.zeroResultInconclusive, true);
    for (const capability of ["app-shell", "side-nav", "navigation", "dialog"]) {
      assert.ok(output.inventory.searchedCapabilities.includes(capability));
      assert.ok(output.inventory.capabilityResults[capability].count > 0, capability);
    }
    assert.ok(output.inventory.capabilityResults.dialog.matchedIds.includes("astryx:component:Dialog"));
    const ids = [...new Set(Object.values(output.inventory.capabilityResults).flatMap(value => value.matchedIds))];
    const decision = publish(root, {
      mode: "reference", project: {}, catalogPath: "catalog.json", capabilityInventoryPath: "inventory.json",
      frontendStackDecisionPath: "frontend-stack-decision.json", candidateId: "astryx:component:Dialog",
      selection: searchedSelection("reference", ids),
    });
    assert.equal(decision.status, "ready");
    assert.deepEqual(decision.capabilityInventory, output.inventory);
  });

  await t.test("admitted adoption needs actual owner authority; request and reply survive frontend consumption", () => {
    const root = project();
    stack(root);
    normalize(root);
    const output = decompose(root, "app shell", ["--catalog", "catalog.json"]);
    assertInventory(output, EXPECTED_IDS);
    const ownerRequest = "Build a new UI and adopt public-fixture app shell using React 19, react-dom 19 and StyleX 0.15; this is my actual owner request.";
    prepareFrontend(root, ownerRequest);
    const bytes = fs.readFileSync(path.join(root, "inventory.json"));
    const base = {
      mode: "adopt", project: { runtime: RUNTIME }, adapterIntake: { status: "admitted" },
      catalogPath: "catalog.json", capabilityInventoryPath: "inventory.json", frontendStackDecisionPath: "frontend-stack-decision.json",
      candidateId: EXPECTED_IDS[0], selection: searchedSelection("adopt", EXPECTED_IDS, "agent"),
    };
    const blocked = publish(root, base, [], "agent-adoption.json", 2);
    assert.equal(blocked.status, "blocked");
    assert.match(blocked.rationale.join("\n"), /owner|authority/i);
    cannotConsume(root, "agent-adoption.json");
    const reference = publish(root, { ...base, mode: "reference", selection: searchedSelection("reference", EXPECTED_IDS) }, [], "agent-reference.json");
    assert.equal(reference.status, "ready");
    for (const source of ["request", "reply"]) {
      const text = `Build a new UI and adopt public-fixture app shell using React 19, react-dom 19 and StyleX 0.15; this is my actual owner ${source}.`;
      const name = `owner-${source}.json`;
      const request = { ...base, selection: searchedSelection("adopt", EXPECTED_IDS, "owner", source, text) };
      const decision = publish(root, request, [], name);
      assert.equal(decision.status, "ready");
      assert.deepEqual(decision.selection.authority, request.selection.authority);
      assert.deepEqual(decision.capabilityInventory, output.inventory);
      const next = consume(root, name, source === "reply" ? text : undefined);
      assert.equal(next.stage, "work");
      assert.notEqual(next.type, "blocked");
    }
    assert.deepEqual(fs.readFileSync(path.join(root, "inventory.json")), bytes);
  });

  await t.test("preserve-existing records actual project statements without inventory or owner interview", () => {
    const root = project();
    const statement = "# Local system\nUse project-owned components and preserve product content and brand green.\n";
    fs.writeFileSync(path.join(root, "DESIGN.md"), statement);
    stack(root);
    normalize(root);
    const actualStatement = fs.readFileSync(path.join(root, "DESIGN.md"), "utf8");
    const decision = publish(root, {
      mode: "custom", frontendStackDecisionPath: "frontend-stack-decision.json", catalogPath: "catalog.json",
      project: {
        designSystem: { id: "local-system", source: "DESIGN.md", text: actualStatement },
        designSystemSources: [{ path: "DESIGN.md", text: actualStatement }],
      },
      selection: {
        basis: "preserve-existing", authority: { actor: "agent", source: "project", choice: "local-system", text: actualStatement },
        rationale: "Preserve the actual project-owned system and its recorded governing statement.", compared: [],
      },
    });
    assert.equal(decision.status, "ready");
    assert.equal(decision.selected.id, "local-system");
    assert.equal(decision.capabilityInventory, null);
    assert.equal(decision.selection.authority.text, actualStatement);
    assert.equal(decision.sourceBindings.inputHashes["DESIGN.md"], sha(fs.readFileSync(path.join(root, "DESIGN.md"))));
  });

  await t.test("implicit publication binds current installed bytes and catalog, including disappearance and recovery", () => {
    const root = project();
    stack(root);
    prepareFrontend(root);
    const decision = publish(root, scratchRequest());
    assert.equal(decision.status, "ready");
    assert.deepEqual(decision.sourceBindings.bundledCatalog, { source: BUNDLE_SOURCE, sha256: sha(originalBundle) });
    assert.equal(consume(root).stage, "work");
    try {
      fs.writeFileSync(bundle, Buffer.concat([originalBundle, Buffer.from("\n")]));
      assert.throws(() => validateDesignSystemDecision(decision), /bundle|catalog|source|changed|stale|hash/i);
      cannotConsume(root);
      fs.writeFileSync(bundle, originalBundle);
      assert.equal(validateDesignSystemDecision(decision), decision);
      assert.equal(consume(root).stage, "work");

      // Valid installed catalog replacement, not invalid JSON or a producer-repaired inventory.
      const replacement = snapshot();
      replacement.namespace = "changed-installation";
      const replacementBytes = Buffer.from(JSON.stringify(replacement, null, 2) + "\n");
      fs.writeFileSync(bundle, replacementBytes);
      assert.throws(() => validateDesignSystemDecision(decision), /bundle|catalog|source|changed|stale|hash/i);
      cannotConsume(root);
      const relabeled = structuredClone(decision);
      relabeled.sourceBindings.bundledCatalog.sha256 = sha(replacementBytes);
      assert.throws(() => validateDesignSystemDecision(relabeled), /bundle|catalog|source|changed|stale|hash/i);
      writeJson(root, "relabeled.json", relabeled);
      cannotConsume(root, "relabeled.json");

      const current = publish(root, scratchRequest(), [], "current.json");
      assert.equal(current.request.catalog.namespace, "changed-installation");
      assert.deepEqual(current.sourceBindings.bundledCatalog, { source: BUNDLE_SOURCE, sha256: sha(replacementBytes) });
      assert.equal(consume(root, "current.json").stage, "work");
      fs.rmSync(bundle);
      assert.throws(() => validateDesignSystemDecision(current), /bundle|catalog|source|ENOENT|missing/i);
      cannotConsume(root, "current.json");
      fs.writeFileSync(bundle, replacementBytes);
      assert.equal(validateDesignSystemDecision(current), current);
      assert.equal(consume(root, "current.json").stage, "work");
    } finally {
      fs.writeFileSync(bundle, originalBundle);
    }
    assert.equal(validateDesignSystemDecision(decision), decision);
    assert.equal(consume(root).stage, "work");
  });

  await t.test("explicit catalogPath, catalog and snapshot retain project bindings without consulting installed bundle", () => {
    const cases = [];
    for (const source of ["catalogPath", "--catalog", "--snapshot"]) {
      const root = project();
      stack(root);
      normalize(root);
      prepareFrontend(root);
      const request = scratchRequest();
      if (source === "catalogPath") request.catalogPath = "catalog.json";
      const file = source === "--snapshot" ? "snapshot.json" : "catalog.json";
      const flags = source === "catalogPath" ? [] : [source, file];
      const decision = publish(root, request, flags);
      assert.equal(decision.status, "ready");
      assert.equal(decision.sourceBindings.bundledCatalog, undefined);
      assert.equal(decision.sourceBindings.inputHashes[file], sha(fs.readFileSync(path.join(root, file))));
      assert.equal(consume(root).stage, "work");
      cases.push({ root, decision });
    }
    try {
      fs.writeFileSync(bundle, JSON.stringify(snapshot()) + "\n");
      for (const { root, decision } of cases) {
        assert.equal(validateDesignSystemDecision(decision), decision);
        assert.equal(consume(root).stage, "work");
      }
      fs.rmSync(bundle);
      for (const { root, decision } of cases) {
        assert.equal(validateDesignSystemDecision(decision), decision);
        assert.equal(consume(root).stage, "work");
        // Republish while the installed default is absent, not merely consume an old ready flag.
        const originalRequest = readJson(path.join(root, "decision.json.request.json"));
        const source = Object.hasOwn(originalRequest, "catalogPath") ? [] : decision.sourceBindings.inputHashes["snapshot.json"] ? ["--snapshot", "snapshot.json"] : ["--catalog", "catalog.json"];
        assert.equal(publish(root, originalRequest, source, "republished.json").status, "ready");
      }
    } finally {
      fs.writeFileSync(bundle, originalBundle);
    }
  });
});
