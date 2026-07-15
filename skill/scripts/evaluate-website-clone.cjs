#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const VERIFICATION_SCHEMA = "design-pipeline.website-cloning.verification.v1";
const MANIFEST_FILE = "website-cloning.json";
const CANONICAL_CAPABILITIES = {
  browser: [
    "navigate",
    "report-final-url-status",
    "set-viewport",
    "set-device-scale",
    "screenshot",
    "evaluate",
    "scroll",
    "click",
    "hover",
    "focus",
    "type",
    "resize",
    "wait-for-fonts",
    "wait-for-page-ready",
    "record-environment",
    "record-provenance",
  ],
  builder: ["read-spec", "read-evidence", "write-files", "run-project-checks"],
  evidence: [
    "render-reference",
    "render-implementation",
    "content-diff",
    "responsive-diff",
    "state-diff",
    "interaction-replay",
    "mapped-interaction-replay",
    "record-evidence-provenance",
  ],
};

function fail(message) {
  throw new Error(message);
}

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--change-root") {
      options.changeRoot = takeValue(argv, index, arg);
      index += 1;
    } else if (arg === "--evidence") {
      options.evidencePath = takeValue(argv, index, arg);
      index += 1;
    } else {
      fail(`unknown option: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node evaluate-website-clone.cjs --change-root <path> [--evidence <verification.json>]

Exit codes:
  0 exact/adaptive fidelity gate passed
  2 blocked because a port or required measurement is unavailable
  3 evidence is complete but the requested fidelity gate is not met
  1 invalid command or artifact`);
}

function readJson(file, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${file} (${error.message})`);
  }
  return value;
}

function writeJson(file, value) {
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temp, file);
}

function appendEvent(file, event) {
  const separator = fs.statSync(file).size > 0 && !fs.readFileSync(file, "utf8").endsWith("\n") ? "\n" : "";
  fs.appendFileSync(file, `${separator}${JSON.stringify(event)}\n`, "utf8");
}

function unique(values) {
  return [...new Set(values)];
}

function inspectPorts(ports, fidelity) {
  const blockers = [];
  for (const name of ["browser", "builder", "evidence"]) {
    const port = ports?.[name];
    if (!port || typeof port !== "object") {
      blockers.push(`${name} port is missing`);
      continue;
    }
    if (port.status !== "ready") blockers.push(`${name} port status is ${port.status || "missing"}`);
    if (typeof port.adapter !== "string" || !port.adapter.trim()) {
      blockers.push(`${name} port has no adapter`);
    }
    const required = [
      ...CANONICAL_CAPABILITIES[name],
      ...(Array.isArray(port.requiredCapabilities) ? port.requiredCapabilities : []),
    ];
    if (name === "evidence" && fidelity?.gates?.maxPixelDifferenceRatio !== null) {
      required.push("pixel-diff");
    }
    if (name === "evidence" && fidelity?.gates?.maxLayoutDeltaPx !== null) {
      required.push("layout-diff");
    }
    const available = new Set(
      Array.isArray(port.availableCapabilities) ? port.availableCapabilities : [],
    );
    for (const capability of required) {
      if (!available.has(capability)) blockers.push(`${name} port lacks ${capability}`);
    }
    if (port.lastProbe?.ok !== true) blockers.push(`${name} port has no successful capability probe`);
  }
  return unique(blockers);
}

function metric(result, name, blockers, minimum, maximum, required = true) {
  const value = result?.[name];
  if (!required && (value === undefined || value === null)) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    blockers.push(`${result?.targetId || "unknown target"}: ${name} is not measured`);
    return null;
  }
  if ((minimum !== undefined && value < minimum) || (maximum !== undefined && value > maximum)) {
    blockers.push(`${result.targetId}: ${name} is outside the valid range`);
    return null;
  }
  return value;
}

function viewportKey(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

function inspectTarget(target, result, fidelity) {
  const blockers = [];
  const mismatches = [];
  const gates = fidelity.gates;
  if (!result) {
    blockers.push(`${target.id}: verification result is missing`);
    return { blockers, mismatches };
  }

  const text = metric(result, "textCoverage", blockers, 0, 1);
  const assets = metric(result, "assetCoverage", blockers, 0, 1);
  const interactions = metric(result, "interactionCoverage", blockers, 0, 1);
  if (text !== null && text < gates.textCoverage) {
    mismatches.push(`${target.id}: text coverage ${text} < ${gates.textCoverage}`);
  }
  if (assets !== null && assets < gates.assetCoverage) {
    mismatches.push(`${target.id}: asset coverage ${assets} < ${gates.assetCoverage}`);
  }
  if (interactions !== null && interactions < gates.interactionCoverage) {
    mismatches.push(
      `${target.id}: interaction coverage ${interactions} < ${gates.interactionCoverage}`,
    );
  }
  if (!Array.isArray(result.viewports)) {
    blockers.push(`${target.id}: per-viewport verification is missing`);
  } else {
    const observed = new Map();
    for (const viewport of result.viewports) {
      const key = viewportKey(viewport || {});
      if (observed.has(key)) blockers.push(`${target.id}: duplicate viewport ${key}`);
      observed.set(key, viewport);
    }
    for (const declared of fidelity.viewports) {
      const key = viewportKey(declared);
      const viewport = observed.get(key);
      if (!viewport) {
        blockers.push(`${target.id}: viewport ${key} is missing`);
        continue;
      }
      const pixels = metric(
        { ...viewport, targetId: `${target.id} viewport ${key}` },
        "pixelDifferenceRatio",
        blockers,
        0,
        1,
        gates.maxPixelDifferenceRatio !== null,
      );
      const layout = metric(
        { ...viewport, targetId: `${target.id} viewport ${key}` },
        "maxLayoutDeltaPx",
        blockers,
        0,
        undefined,
        gates.maxLayoutDeltaPx !== null,
      );
      if (
        pixels !== null &&
        gates.maxPixelDifferenceRatio !== null &&
        pixels > gates.maxPixelDifferenceRatio
      ) {
        mismatches.push(
          `${target.id} viewport ${key}: pixel difference ${pixels} > ${gates.maxPixelDifferenceRatio}`,
        );
      }
      if (layout !== null && gates.maxLayoutDeltaPx !== null && layout > gates.maxLayoutDeltaPx) {
        mismatches.push(
          `${target.id} viewport ${key}: layout delta ${layout}px > ${gates.maxLayoutDeltaPx}px`,
        );
      }
      if (!Array.isArray(viewport.unresolvedDifferences)) {
        blockers.push(`${target.id} viewport ${key}: unresolvedDifferences is not recorded`);
      } else {
        for (const difference of viewport.unresolvedDifferences) {
          mismatches.push(`${target.id} viewport ${key}: ${difference}`);
        }
      }
    }
  }

  if (!Array.isArray(result.unresolvedDifferences)) {
    blockers.push(`${target.id}: unresolvedDifferences is not recorded`);
  } else {
    for (const difference of result.unresolvedDifferences) {
      mismatches.push(`${target.id}: ${difference}`);
    }
  }
  return { blockers, mismatches };
}

function inspectDifferenceList(label, differences, blockers, mismatches) {
  if (!Array.isArray(differences)) {
    blockers.push(`${label}: unresolvedDifferences is not recorded`);
    return;
  }
  for (const difference of differences) mismatches.push(`${label}: ${difference}`);
}

function pathIsPortable(changeRoot, evidencePath) {
  const resolved = path.resolve(changeRoot, evidencePath);
  const relative = path.relative(changeRoot, resolved);
  return !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) && fs.existsSync(resolved);
}

function inspectMappingDefinition(manifest, mapping, targetsById, blockers) {
  if (manifest.fidelity.mode === "exact" && mapping.kind === "replacement") {
    blockers.push(`${mapping.id}: replacement reference mapping requires adaptive fidelity`);
  }
  const source = targetsById.get(mapping.sourceTargetId);
  const destination = targetsById.get(mapping.destinationTargetId);
  if (!source || !destination) {
    blockers.push(`${mapping.id}: mapping target is unknown`);
  } else {
    if (source.role !== "reference") blockers.push(`${mapping.id}: source target must be reference`);
    if (destination.role !== "primary") blockers.push(`${mapping.id}: destination target must be primary`);
  }

  const [recordPath, recordAnchor] = String(mapping.designRecord || "").split("#", 2);
  const resolvedRecord = path.resolve(manifest.__changeRoot, recordPath);
  const validRecord =
    recordPath.replaceAll("\\", "/") === "design.md" &&
    recordAnchor === mapping.id &&
    pathIsPortable(manifest.__changeRoot, recordPath) &&
    fs.readFileSync(resolvedRecord, "utf8").includes(mapping.id);
  if (!validRecord) {
    blockers.push(`${mapping.id}: designRecord must be design.md#${mapping.id} and contain the mapping id`);
  }
}

function inspectMappedProperties(mapping, result, blockers) {
  const groups = [
    ["adopted", mapping.adoptedProperties, result.verifiedAdoptedProperties],
    ["rejected", mapping.rejectedProperties, result.verifiedRejectedProperties],
  ];
  for (const [label, required, verified] of groups) {
    for (const property of required || []) {
      if (!Array.isArray(verified) || !verified.includes(property)) {
        blockers.push(`${mapping.id}: ${label} property is not verified: ${property}`);
      }
    }
  }
}

function inspectMappedState(changeRoot, mappingId, stateName, state, blockers, mismatches) {
  const label = `${mappingId}/${stateName}`;
  if (!state) {
    blockers.push(`${mappingId}: required state is not verified: ${stateName}`);
    return;
  }
  if (state.replayPassed !== true) mismatches.push(`${label}: replay failed`);
  inspectDifferenceList(label, state.unresolvedDifferences, blockers, mismatches);
  if (!Array.isArray(state.evidencePaths) || state.evidencePaths.length === 0) {
    blockers.push(`${label}: evidence path is missing`);
    return;
  }
  for (const evidencePath of state.evidencePaths) {
    if (!pathIsPortable(changeRoot, evidencePath)) {
      blockers.push(`${label}: evidence path is not portable: ${evidencePath}`);
    }
  }
}

function inspectMappingResult(manifest, mapping, result, blockers, mismatches) {
  if (!result) {
    blockers.push(`${mapping.id}: mapping verification is missing`);
    return;
  }
  const coverage = metric(result, "interactionCoverage", blockers, 0, 1);
  if (coverage !== null && coverage < 1) {
    mismatches.push(`${mapping.id}: interaction coverage ${coverage} < 1`);
  }
  if (result.replayPassed !== true) mismatches.push(`${mapping.id}: interaction replay failed`);
  inspectMappedProperties(mapping, result, blockers);

  const states = new Map(
    Array.isArray(result.states) ? result.states.map((state) => [state?.name, state]) : [],
  );
  for (const stateName of mapping.requiredStates || []) {
    inspectMappedState(
      manifest.__changeRoot,
      mapping.id,
      stateName,
      states.get(stateName),
      blockers,
      mismatches,
    );
  }
  inspectDifferenceList(mapping.id, result.unresolvedDifferences, blockers, mismatches);
}

function mappingResults(evidence, hasMappings, blockers) {
  const observed = new Map();
  if (!Array.isArray(evidence?.mappings)) {
    if (hasMappings) blockers.push("reference mapping verification is missing");
    return observed;
  }
  for (const result of evidence.mappings) {
    if (typeof result?.mappingId !== "string" || observed.has(result.mappingId)) {
      blockers.push("mapping verification ids must be present and unique");
    } else {
      observed.set(result.mappingId, result);
    }
  }
  return observed;
}

function inspectMappings(manifest, evidence) {
  const blockers = [];
  const mismatches = [];
  const mappings = Array.isArray(manifest.referenceMappings) ? manifest.referenceMappings : [];
  for (const target of manifest.targets.filter((candidate) => candidate.role === "reference")) {
    if (!mappings.some((mapping) => mapping.sourceTargetId === target.id)) {
      blockers.push(`${target.id}: explicit reference mapping is missing`);
    }
  }

  const targetsById = new Map(manifest.targets.map((target) => [target.id, target]));
  const observed = mappingResults(evidence, mappings.length > 0, blockers);
  for (const mapping of mappings) {
    inspectMappingDefinition(manifest, mapping, targetsById, blockers);
    inspectMappingResult(manifest, mapping, observed.get(mapping.id), blockers, mismatches);
  }
  return { blockers: unique(blockers), mismatches: unique(mismatches) };
}

function inspectEvidence(manifest, evidence) {
  const blockers = [];
  const mismatches = [];
  if (!evidence) {
    return { blockers: ["verification evidence is missing"], mismatches };
  }
  if (evidence.schema !== VERIFICATION_SCHEMA) {
    blockers.push(`verification schema must be ${VERIFICATION_SCHEMA}`);
  }
  if (!Array.isArray(evidence.targets)) {
    blockers.push("verification targets must be an array");
    return { blockers, mismatches };
  }

  const results = new Map();
  for (const result of evidence.targets) {
    if (typeof result?.targetId !== "string" || results.has(result.targetId)) {
      blockers.push("verification target ids must be present and unique");
      continue;
    }
    results.set(result.targetId, result);
  }

  for (const target of manifest.targets.filter((candidate) => candidate.role === "primary")) {
    const inspected = inspectTarget(target, results.get(target.id), manifest.fidelity);
    blockers.push(...inspected.blockers);
    mismatches.push(...inspected.mismatches);
  }
  const mappingResult = inspectMappings(manifest, evidence);
  blockers.push(...mappingResult.blockers);
  mismatches.push(...mappingResult.mismatches);
  return { blockers: unique(blockers), mismatches: unique(mismatches) };
}

function relativePath(changeRoot, file) {
  const relative = path.relative(changeRoot, file).replaceAll("\\", "/");
  return relative || path.basename(file);
}

function updateTargetStates(manifest, verdict, targetFailures) {
  for (const target of manifest.targets) {
    if (verdict === "complete") {
      target.status = "complete";
      target.phase = "complete";
    } else if (target.status === "complete") {
      continue;
    } else if (verdict === "blocked") {
      target.status = "blocked";
    } else {
      target.status = targetFailures.has(target.id) ? "fidelity-limited" : "needs-review";
    }
  }
}

function updateState(changeRoot, state, verdict, reasons, now, reportPath) {
  const statePath = path.join(changeRoot, "state.json");
  if (!state) return "stage-6-gate-review";
  const prefixedReasons = reasons.map((reason) => `[website-cloning] ${reason}`);
  const priorBlockers = Array.isArray(state.blockers)
    ? state.blockers.filter((reason) => !String(reason).startsWith("[website-cloning]"))
    : [];
  state.status = verdict === "blocked" ? "blocked" : "needs-review";
  state.phase = "stage-6-gate-review";
  state.updatedAt = now;
  state.blockers = verdict === "complete" ? priorBlockers : [...priorBlockers, ...prefixedReasons];
  state.nextActions =
    verdict === "complete"
      ? ["Run the remaining design-pipeline gates before archiving or claiming delivery complete"]
      : verdict === "blocked"
        ? ["Resolve the missing port capabilities or measurements, then rerun the fidelity gate"]
        : ["Repair the recorded differences or accept an adaptive fidelity claim"];
  state.qa = {
    ...(state.qa || {}),
    websiteCloning: {
      status: verdict === "complete" ? "passed" : verdict === "blocked" ? "blocked" : "failed",
      evidenceRoot: reportPath,
      verdict,
    },
  };
  writeJson(statePath, state);
  return state.phase;
}

function updateHandoff(changeRoot, verdict, reasons, now, reportPath) {
  const handoffPath = path.join(changeRoot, "handoff.md");
  const existing = fs.existsSync(handoffPath) ? fs.readFileSync(handoffPath, "utf8") : "# Handoff\n";
  const next =
    verdict === "complete"
      ? "Run the remaining design-pipeline accessibility, motion, responsive, engineering, and headless gates."
      : verdict === "blocked"
        ? "Resolve missing capabilities or measurements, then rerun evaluation."
        : "Repair differences or explicitly accept adaptive fidelity.";
  const detail = reasons.length ? reasons.map((reason) => `- ${reason}`).join("\n") : "- None";
  const start = "<!-- DESIGN-PIPELINE:WEBSITE-CLONING-EVALUATION:START -->";
  const end = "<!-- DESIGN-PIPELINE:WEBSITE-CLONING-EVALUATION:END -->";
  const section = `${start}\n\n## Website Cloning Evaluation\n\n- Evaluated: ${now}\n- Verdict: \`${verdict}\`\n- Evidence: \`${reportPath}\`\n\n### Reasons\n\n${detail}\n\n### Next Action\n\n${next}\n\n${end}`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, "g");
  const updated = pattern.test(existing)
    ? existing.replace(pattern, section)
    : `${existing.trimEnd()}\n\n${section}\n`;
  fs.writeFileSync(handoffPath, updated, "utf8");
}

function evaluate(options) {
  if (!options.changeRoot) fail("--change-root is required");
  const changeRoot = path.resolve(options.changeRoot);
  if (!fs.existsSync(changeRoot) || !fs.statSync(changeRoot).isDirectory()) {
    fail(`change root does not exist: ${changeRoot}`);
  }
  const manifestPath = path.join(changeRoot, MANIFEST_FILE);
  const manifest = readJson(manifestPath, "website-cloning manifest");
  Object.defineProperty(manifest, "__changeRoot", { value: changeRoot, enumerable: false });
  for (const required of ["state.json", "events.jsonl", "handoff.md"]) {
    if (!fs.existsSync(path.join(changeRoot, required))) fail(`${required} is required in the change root`);
  }
  const state = readJson(path.join(changeRoot, "state.json"), "state");
  if (!Array.isArray(manifest.targets) || !manifest.fidelity?.gates) {
    fail("website-cloning manifest is missing targets or fidelity gates");
  }
  if (
    typeof manifest.changeId !== "string" ||
    state.changeId !== manifest.changeId ||
    path.basename(changeRoot) !== manifest.changeId
  ) {
    fail("state.json, website-cloning manifest, and change-root ids must match");
  }

  let evidence = null;
  let reportPath = null;
  if (options.evidencePath) {
    const evidencePath = path.resolve(options.evidencePath);
    const relativeEvidence = path.relative(changeRoot, evidencePath);
    if (
      !relativeEvidence ||
      relativeEvidence.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeEvidence)
    ) {
      fail("verification evidence must be a file inside the change root");
    }
    evidence = readJson(evidencePath, "verification evidence");
    reportPath = relativePath(changeRoot, evidencePath);
  }

  const portBlockers = inspectPorts(manifest.ports, manifest.fidelity);
  const evidenceResult = inspectEvidence(manifest, evidence);
  const blockers = unique([...portBlockers, ...evidenceResult.blockers]);
  const mismatches = evidenceResult.mismatches;
  const verdict = blockers.length
    ? "blocked"
    : mismatches.length
      ? "fidelity-limited"
      : "complete";
  const reasons = verdict === "blocked" ? blockers : mismatches;
  const now = new Date().toISOString();
  const targetFailures = new Set(
    reasons.map((reason) => String(reason).split(":", 1)[0]).filter(Boolean),
  );

  manifest.status = verdict;
  manifest.verification = {
    status: verdict === "complete" ? "passed" : verdict === "blocked" ? "blocked" : "failed",
    evaluatedAt: now,
    reportPath,
    reasons,
  };
  updateTargetStates(manifest, verdict, targetFailures);
  writeJson(manifestPath, manifest);

  const phase = updateState(changeRoot, state, verdict, reasons, now, reportPath);
  appendEvent(path.join(changeRoot, "events.jsonl"), {
    ts: now,
    phase,
    type: verdict === "complete" ? "verification-passed" : "verification-failed",
    summary: `Website-cloning fidelity gate verdict: ${verdict}.`,
    files: [MANIFEST_FILE],
    evidence: reportPath ? [reportPath] : [],
    nextActions:
      verdict === "complete"
        ? ["Run the remaining design-pipeline gates"]
        : verdict === "blocked"
          ? ["Resolve missing capabilities or measurements"]
          : ["Repair differences or accept adaptive fidelity"],
  });
  updateHandoff(changeRoot, verdict, reasons, now, reportPath || "not-provided");

  console.log(`Website-cloning verdict: ${verdict}`);
  for (const reason of reasons) console.log(`- ${reason}`);
  process.exitCode = verdict === "complete" ? 0 : verdict === "blocked" ? 2 : 3;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) printHelp();
  else evaluate(options);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
