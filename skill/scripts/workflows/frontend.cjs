"use strict";

// Frontend-only entry and decision consumers. They extend workflow-state.v1, not an extra gate.
const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, canonicalJson, fail, readJson, resolveInside, sha256 } = require("../contract-utils.cjs");
const { inspectProject } = require("../project-analysis-core.cjs");
const { validateReceipt } = require("../evidence-core.cjs");
const { validateDesignSystemDecision } = require("../design-system-decision-core.cjs");
const { normalizeSnapshot } = require("../design-system-catalog-core.cjs");
const { resolveFrontendStack } = require("../frontend-stack-core.cjs");
const { cliCommand, invalidateCheckedEvidence, shellPath } = require("./shared.cjs");

const PURPOSES = ["new", "optimize-existing", "reference-for-existing", "faithful-reproduction"];
const isFrontend = state => ["web", "ui"].includes(state?.deliverable);
const digest = value => "sha256:" + sha256(canonicalJson(value));
const command = (root, stage) => `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage ${stage}`;
const nonEmpty = value => typeof value === "string" && Boolean(value.trim());

function createFrontendContext(options = {}) {
  if (options.purpose !== undefined) assertEnum(options.purpose, PURPOSES, "purpose", "frontend entry");
  if (options.mode === "replicate" && options.purpose && options.purpose !== "faithful-reproduction") fail("frontend entry", "replicate mode conflicts with this purpose; clarify reference versus reproduction rather than choosing silently");
  if (options.url !== undefined) {
    let url;
    try { url = new URL(options.url); } catch { fail("frontend entry", "--url must be a credential-free HTTP(S) link"); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) fail("frontend entry", "--url must be a credential-free HTTP(S) link");
  }
  for (const key of ["query", "scope"]) if (options[key] !== undefined && !nonEmpty(options[key])) fail("frontend entry", `${key} must be non-empty`);
  return { request: options.query?.trim() || null, url: options.url || null, scope: options.scope || null, workflowMode: options.mode === "freeform" ? "freeform" : "brief", suppliedPurpose: options.purpose || (options.mode === "replicate" ? "faithful-reproduction" : null) };
}

function context(state) { return state.frontend || {}; }
function projectObservation(state, root, capturePaths = state.decisions?.frontendObservation?.capturePaths || []) {
  const input = context(state);
  const report = inspectProject(root, { ...(input.request ? { query: input.request } : {}), ...(input.scope ? { scope: input.scope } : {}) });
  const captured = new Set(capturePaths);
  if (!captured.size) return report;
  return { ...report, sourcePaths: sourcePaths(report).filter(rel => !captured.has(rel)),
    files: report.files.filter(file => !captured.has(file.path)), entrypoints: report.entrypoints.filter(entry => !captured.has(entry.path)),
    dependencies: report.dependencies.filter(entry => !captured.has(entry.path)), implementation: report.implementation.filter(entry => !captured.has(entry.path)),
    discovery: { ...report.discovery, exclusions: [...report.discovery.exclusions, ...capturePaths] } };
}
function hasExistingContent(report) {
  return report.files.some(file => /\.(?:html?|[cm]?[jt]sx?|vue|svelte|css|scss|less)$/i.test(file.path))
    || report.entrypoints.some(entry => /(?:html|app|route|render)/i.test(entry.reason || ""));
}
function recognizedPurpose(state, report) {
  const input = context(state);
  if (input.suppliedPurpose) return input.suppliedPurpose;
  const text = input.request || "";
  const faithful = text.split(/[.;；。\n]/).some(clause =>
    /(?:faithful(?:ly)?|exact(?:ly)?|reproduc|replicat|clone|精确复刻|忠实复刻|复刻|照着做|一比一)/i.test(clause)
      && !/(?:do\s+not|don't|not|never|avoid|rather than|instead of|不要|不需要|不是|不想|无需|别)[^,，]{0,40}(?:faithful|exact|reproduc|replicat|clone|复刻|一比一)/i.test(clause));
  const referenceRole = /(?:as (?:a )?reference|as inspiration|take inspiration|作为参考|只(?:作|做)?参考|借鉴|参考.*(?:优化|改进))/i.test(text);
  if (faithful && referenceRole) return null;
  if (faithful) return "faithful-reproduction";
  if (input.url && /(?:reference|inspir(?:ation|ed)|参考|借鉴)/i.test(text)) return hasExistingContent(report) || /(?:existing|current|已有|现有)/i.test(text) ? "reference-for-existing" : "new";
  if (input.url) return null;
  if (/(?:optimi[sz]e|improve|polish|redesign|优化|改进|美化|重设计)/i.test(text)) return "optimize-existing";
  if (hasExistingContent(report) && !/(?:from scratch|new (?:site|page|component)|从零|新建|全新)/i.test(text)) return null;
  return "new";
}

function fileHash(root, rel) {
  const file = resolveInside(root, rel, "frontend evidence", { scope: "workflow", mustExist: true });
  if (!fs.statSync(file).isFile()) fail("frontend entry", `evidence is not a file: ${rel}`);
  return "sha256:" + sha256(fs.readFileSync(file));
}

// A source observation is an input baseline, not a promise that implementation never edits it.
// Only outputs dispatched through existing workflow/task authority may diverge from that baseline.
const EDITABLE_SOURCE = /\.(?:html?|[cm]?[jt]sx?|vue|svelte|css|scss|sass|less|glsl|frag|vert|wgsl)$/i;
const WORKFLOW_PROCESS_OUTPUTS = {
  "design-system": ["frontend-stack-request.json", "frontend-stack-decision.json", "design-system-catalog.json", "capability-inventory.json", "design-system-request.json", "design-system-decision.json"],
  reference: ["reference.md", "reference-evidence.json"],
  concepts: ["concepts.html", "concepts.md"],
  description: ["brief.md"],
  probe: ["interaction.json"],
};
const transactionReports = new WeakMap();
const transactionRoles = new WeakMap();
function currentSourceReport(state, root) {
  // Public consumers read a new state object at each transaction boundary.
  if (!transactionReports.has(state)) transactionReports.set(state, projectObservation(state, root));
  return transactionReports.get(state);
}
function inSourceScope(rel, scope) { return scope.endsWith("/") ? rel.startsWith(scope) : rel === scope; }
function sourcePaths(report) { return report.sourcePaths || report.files.map(file => file.path); }
function sourceVersion(root, rel) {
  const stat = fs.statSync(resolveInside(root, rel, "source version", { scope: "workflow", mustExist: true }));
  return { size: stat.size, mtime: stat.mtimeMs, ctime: stat.ctimeMs, inode: stat.ino };
}
function authorizationCurrent(state, record) {
  return record?.entry === entryDigest(state) && record.decision === decisionDigest(state)
    && record.revision === (state.decisions?.frontendRevision || 0);
}
function authorizedSourceScopes(state) {
  const record = state.decisions?.frontendOutputs;
  return authorizationCurrent(state, record) && Array.isArray(record.scopes) ? record.scopes : [];
}
function processSourcePaths(state, root) {
  if (transactionRoles.has(state)) return transactionRoles.get(state);
  const dispatched = state.decisions?.frontendOutputs;
  const paths = new Set([
    ...(authorizationCurrent(state, dispatched) ? dispatched.processPaths || [] : []),
    ...(state.decisions?.frontendObservation?.capturePaths || []),
  ]);
  // A default publication is recognized by full replay and current bindings, never its filename
  // or schema label alone. Explicitly named publications are admitted by recordDesignSystem.
  try { for (const rel of boundDecision(root, "design-system-decision.json").processPaths) paths.add(rel); } catch { /* Unadmitted files remain product sources. */ }
  const consumed = state.decisions?.designSystem;
  if (consumed?.path && consumed.entry === entryDigest(state) && consumed.processPaths?.includes(consumed.path)) {
    // Receipt-owned identities outlive byte staleness; decisionStatus invalidates that receipt.
    // A new entry/decision replaces these identities, unlike expired dispatch permissions.
    for (const rel of consumed.processPaths) paths.add(rel);
  }
  const checked = dispatched?.checked;
  if (checked?.entry === entryDigest(state)) {
    for (const [rel, hash] of Object.entries(checked.processHashes || {})) {
      try { if (fileHash(root, rel) === hash) paths.add(rel); } catch { /* Changed former outputs are product candidates until redispatched. */ }
    }
  }
  // Existing native controller records have their own validated state/event consistency contract.
  try {
    const native = require("../control-runtime-core.cjs").readState(root);
    if (native.state.extensions?.frontend?.projectRoot && path.resolve(native.state.extensions.frontend.projectRoot) === path.resolve(root)) {
      paths.add(path.relative(root, native.stateFile).split(path.sep).join("/"));
    }
  } catch { /* A schema-shaped product JSON is not a native controller. */ }
  transactionRoles.set(state, paths);
  return paths;
}
function projectSourcePaths(state, root, report, admitted = []) {
  const process = new Set([...processSourcePaths(state, root), ...admitted]);
  return sourcePaths(report).filter(rel => !process.has(rel));
}
function sourceSnapshotCurrent(state, root, record, admitted = []) {
  if (!Array.isArray(record.observedSourcePaths) || !record.observedSourceHashes
      || record.observedSourcePaths.some(rel => !Object.hasOwn(record.observedSourceHashes, rel) && !Object.hasOwn(record.unreadSourceVersions || {}, rel))) return false;
  try {
    const report = currentSourceReport(state, root);
    const process = new Set([...processSourcePaths(state, root), ...admitted]);
    const scopes = authorizedSourceScopes(state);
    const checked = state.decisions?.frontendOutputs?.checked;
    const checkedScopes = checked?.entry === entryDigest(state) ? checked.scopes : [];
    const checkedHashes = checkedScopes.length ? checked.hashes : {};
    const mutable = rel => scopes.some(scope => inSourceScope(rel, scope));
    const replaced = rel => checkedScopes.some(scope => inSourceScope(rel, scope));
    const upstream = rel => !process.has(rel) && !mutable(rel);
    const original = record.observedSourcePaths.filter(rel => !replaced(rel));
    const expected = [...new Set([...original, ...Object.keys(checkedHashes)])].filter(upstream).sort();
    const current = projectSourcePaths(state, root, report, admitted).filter(upstream).sort();
    if (canonicalJson(current) !== canonicalJson(expected)) return false;
    for (const [rel, version] of Object.entries(record.unreadSourceVersions || {})) {
      if (!upstream(rel) || replaced(rel)) continue;
      if (canonicalJson(sourceVersion(root, rel)) !== canonicalJson(version) || report.files.some(file => file.path === rel)) return false;
    }
    const hashes = { ...Object.fromEntries(Object.entries(record.observedSourceHashes).filter(([rel]) => !replaced(rel))), ...checkedHashes };
    return Object.entries(hashes).every(([rel, hash]) => !upstream(rel)
      || (!Object.hasOwn(checkedHashes, rel) && !report.files.some(file => file.path === rel) ? false : fileHash(root, rel) === hash));
  } catch { return false; }
}
function normalizeSourceScopes(root, scopes) {
  return scopes.map(scope => {
    const file = resolveInside(root, scope, "frontend output scope", { scope: "workflow" });
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (!rel) fail("frontend entry", "source outputs need a literal file or bounded directory, not the project root");
    return rel + (scope.endsWith("/") ? "/" : "");
  });
}
function authorizeSourceOutputs(state, root, scopes, processPaths = []) {
  if (!isFrontend(state) || !purposeFinished(state, root)) fail("frontend entry", "current observation and purpose must precede source-edit authorization", { code: "WORKFLOW_NOT_READY" });
  const normalized = normalizeSourceScopes(root, scopes);
  const current = state.decisions.frontendOutputs;
  const active = authorizationCurrent(state, current);
  const combined = [...new Set([...(active ? current.scopes : []), ...normalized])].sort();
  const process = [...new Set([...(active ? current.processPaths || [] : []), ...normalizeSourceScopes(root, processPaths)])].sort();
  const value = { entry: entryDigest(state), decision: decisionDigest(state), revision: state.decisions.frontendRevision || 0, scopes: combined, processPaths: process,
    ...(current?.checked?.entry === entryDigest(state) ? { checked: current.checked } : {}) };
  if (canonicalJson(current || null) === canonicalJson(value)) return false;
  state.decisions.frontendOutputs = value;
  transactionRoles.delete(state);
  return true;
}
function authorizeWorkflowOutputs(state, root, stage, action) {
  if (!isFrontend(state) || action.type !== "run") return false;
  const original = new Set(state.decisions?.frontendObservation?.observedSourcePaths || []);
  const process = (WORKFLOW_PROCESS_OUTPUTS[stage] || []).filter(rel => !original.has(rel));
  let scopes = process;
  if (stage === "work" && state.deliverable === "ui") {
    try {
      const native = require("../control-runtime-core.cjs").readState(root);
      if (path.resolve(native.state.extensions?.frontend?.projectRoot || "") === path.resolve(root)) return false;
    } catch { /* Standalone UI work retains its existing bounded source authority. */ }
  }
  if (["build", "work"].includes(stage)) {
    requireRuntimeDecision(state, root);
    const observed = Object.keys(state.decisions.frontendObservation.observedSourceHashes);
    scopes = [...observed.filter(rel => EDITABLE_SOURCE.test(rel)), ...["index.html", "component-manifest.json", "DESIGN.md", "MOTION.md"].filter(rel => !original.has(rel))];
  }
  if (!scopes.length) return false;
  const changed = authorizeSourceOutputs(state, root, scopes, process);
  action.sourceScope = authorizedSourceScopes(state);
  return changed;
}
function outputInputs(state, root) {
  const scopes = authorizedSourceScopes(state);
  return scopes.length ? sourcePaths(currentSourceReport(state, root)).filter(rel => scopes.some(scope => inSourceScope(rel, scope))) : [];
}
function recordCheckedSourceOutputs(state, root, hashes, scopes = authorizedSourceScopes(state)) {
  if (!authorizationCurrent(state, state.decisions?.frontendOutputs)) fail("frontend entry", "checked outputs have no current source-edit authority", { code: "WORKFLOW_NOT_READY" });
  const normalized = normalizeSourceScopes(root, scopes);
  const process = processSourcePaths(state, root);
  const observed = Object.fromEntries(Object.entries(hashes).filter(([rel]) => !process.has(rel) && normalized.some(scope => inSourceScope(rel, scope))));
  // These hashes come from the actual existing verifier/artifact receipt, not reconstructed files.
  const previous = state.decisions.frontendOutputs.checked;
  const kept = previous?.entry === entryDigest(state) ? previous : { scopes: [], hashes: {} };
  const keptHashes = Object.fromEntries(Object.entries(kept.hashes).filter(([rel]) => !normalized.some(scope => inSourceScope(rel, scope))));
  const processHashes = Object.fromEntries(Object.entries(hashes).filter(([rel]) => state.decisions.frontendOutputs.processPaths?.includes(rel)));
  state.decisions.frontendOutputs.checked = { ...kept, entry: entryDigest(state), scopes: [...new Set([...kept.scopes, ...normalized])].sort(), hashes: { ...keptHashes, ...observed }, processHashes: { ...kept.processHashes, ...processHashes } };
}
function recordConsumedProcessOutputs(state, root, stage) {
  const record = state.decisions?.frontendOutputs;
  if (!authorizationCurrent(state, record)) return;
  const paths = (WORKFLOW_PROCESS_OUTPUTS[stage] || []).filter(rel => record.processPaths?.includes(rel) && fs.existsSync(path.join(root, rel)));
  if (!paths.length) return;
  const checked = record.checked?.entry === entryDigest(state) ? record.checked : { entry: entryDigest(state), scopes: [], hashes: {} };
  record.checked = { ...checked, processHashes: { ...checked.processHashes, ...Object.fromEntries(paths.map(rel => [rel, fileHash(root, rel)])) } };
  transactionRoles.delete(state);
}
function hashesCurrent(root, hashes) {
  if (!hashes || !Object.keys(hashes).length) return false;
  try { return Object.entries(hashes).every(([rel, hash]) => fileHash(root, rel) === hash); } catch { return false; }
}
function observationFinished(state, root, admitted = []) {
  const record = state.decisions?.frontendObservation;
  return Boolean(record && record.context === digest(context(state)) && hashesCurrent(root, record.inputHashes) && sourceSnapshotCurrent(state, root, record, admitted));
}
function missingExistingSource(state, root) {
  if (!["optimize-existing", "reference-for-existing"].includes(state.decisions?.frontendPurpose?.choice)) return false;
  const rel = state.decisions.frontendObservation?.reportPath;
  return !rel || !hasExistingContent(readJson(resolveInside(root, rel, "frontend observation", { scope: "workflow", mustExist: true }), "frontend observation"));
}
function purposeFinished(state, root, admitted = []) {
  return observationFinished(state, root, admitted) && PURPOSES.includes(state.decisions?.frontendPurpose?.choice)
    && state.decisions.frontendPurpose.observation === digest(state.decisions.frontendObservation) && !missingExistingSource(state, root);
}
function captureInputs(root, rel, expectedUrl) {
  const file = resolveInside(root, rel, "frontend link capture", { scope: "workflow", mustExist: true });
  const receipt = validateReceipt(readJson(file, "frontend link capture"), { evidenceRoot: path.dirname(file), requireFiles: true });
  if (!["complete", "partial"].includes(receipt.status) || receipt.adapter.availability !== "available"
      || receipt.adapter.probe.ok !== true || receipt.redaction.status === "blocked" || !receipt.capturedAt
      || (!receipt.artifacts.dom && !receipt.artifacts.screenshot)) fail("frontend entry", "link observation needs an available capture with actual DOM or screenshot evidence, not an observed flag", { code: "FRONTEND_OBSERVATION_REQUIRED" });
  if (new URL(receipt.target.url).href !== new URL(expectedUrl).href) fail("frontend entry", "capture target differs from the supplied link", { code: "FRONTEND_SOURCE_MISMATCH" });
  const files = [file, ...Object.values(receipt.artifacts).filter(Boolean).map(raw => path.join(path.dirname(file), raw))];
  return Object.fromEntries(files.map(source => {
    const relative = path.relative(root, source).split(path.sep).join("/");
    return [relative, fileHash(root, relative)];
  }));
}

const OBSERVE = {
  id: "observe", finished: observationFinished,
  action: (state, root) => {
    const report = projectObservation(state, root), input = context(state);
    return {
      type: "run", observation: report, suppliedLink: input.url || null,
      instruction: `First read only: inspect the named source findings within ${input.scope || "the bounded project scope"}; do not change source files. Tell the owner what content, functions and explicit brand constraints you actually found, and the observation limits.${input.url ? ` Open only the supplied page (${input.url}) using the existing host/browser evidence capture; inspect its main layout and relevant interaction, then report the observation before any question. Keep its existing evidence-receipt.v1 with real DOM or screenshot bytes.` : " No rendered page was observed by this static inspection; an empty result establishes only that no source content was found within its stated scope and exclusions."} Record the summary you delivered; this is not owner design acceptance. Then ask only unresolved questions that change the direction.`,
      record: `${command(root, "observe")} --answer "<observations and limits already told to the owner>"${input.url ? " --artifact <capture/evidence.json>" : ""}`,
      why: "Look at the supplied starting point before questioning or changing it; preserve evidence without inventing observation or approval.",
      visualAcceptance: "not-evaluated",
    };
  },
};
const PURPOSE = {
  id: "purpose", finished: purposeFinished,
  action: (state, root) => missingExistingSource(state, root) ? {
    type: "blocked", blocker: { kind: "frontend-source", reason: "The bounded observation found no existing frontend source for the explicit improvement purpose.", needs: "The actual existing frontend project or a narrower source scope." },
    instruction: "Inspect the provided project/scope read-only and locate its frontend before asking for unreachable source information. Do not silently turn optimization into a new build or invent existing content.",
  } : ({
    type: "ask", question: context(state).url
      ? "Should this link guide improvements to the existing frontend, or should I reproduce it faithfully?"
      : "Should I improve the existing frontend while preserving what it does, or make a new frontend?",
    instruction: "Use the observation already returned. Clarify only this unresolved purpose; do not ask about settled facts or require style vocabulary. Faithful reproduction retains fidelity and invariants; optimization preserves function, content and explicit brand while allowing layout and visual improvements.",
    choices: PURPOSES, record: `${command(root, "purpose")} --choice <purpose> --answer "<the owner's clarification>"`,
    why: "A material reference-versus-reproduction role must not be guessed.",
  }),
};

function invalidateFrontend(state) {
  state.decisions ||= {};
  state.decisions.frontendRevision = (state.decisions.frontendRevision || 0) + 1;
  transactionRoles.delete(state);
  const checked = state.decisions.frontendOutputs?.checked;
  if (checked) state.decisions.frontendOutputs = { checked };
  else delete state.decisions.frontendOutputs;
  delete state.decisions.concept;
  delete state.decisions.conceptNotes;
  delete state.decisions.variants;
  invalidateCheckedEvidence(state);
  // Description/section/draft verdicts remain historical; their upstream binding is no longer valid.
}
function recordObservation(state, root, options) {
  if (!nonEmpty(options.answer)) fail("frontend entry", "--answer must contain the observations and limits already delivered to the owner");
  const input = context(state);
  const captureHashes = input.url ? captureInputs(root, options.artifact, input.url) : {};
  if (!input.url && options.artifact) fail("frontend entry", "a link capture applies only when a link was supplied");
  const capturePaths = Object.keys(captureHashes);
  const report = projectObservation(state, root, capturePaths);
  const bytes = canonicalJson(report);
  const rel = `.design-pipeline/frontend-observation-${sha256(bytes)}.json`;
  const target = resolveInside(root, rel, "frontend observation", { scope: "workflow" });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8") !== bytes) fail("frontend entry", "observation output collides with unrelated bytes", { code: "OUTPUT_COLLISION" });
  if (!fs.existsSync(target)) fs.writeFileSync(target, bytes, { flag: "wx" });
  const previous = state.decisions.frontendObservation;
  const previousPurpose = state.decisions.frontendPurpose;
  transactionReports.delete(state);
  transactionRoles.delete(state);
  const observedPaths = projectSourcePaths(state, root, report, capturePaths);
  const observedSet = new Set(observedPaths);
  const observedSourceHashes = Object.fromEntries(report.files.filter(file => observedSet.has(file.path)).map(file => [file.path, file.hash]));
  const unreadSourceVersions = Object.fromEntries(observedPaths.filter(rel => !Object.hasOwn(observedSourceHashes, rel)).map(rel => [rel, sourceVersion(root, rel)]));
  state.decisions.frontendObservation = { context: digest(input), reportPath: rel, summary: options.answer.trim(), inputHashes: { [rel]: fileHash(root, rel), ...captureHashes }, capturePaths, observedSourcePaths: observedPaths, observedSourceHashes, unreadSourceVersions, visualAcceptance: "not-evaluated" };
  const retainedReply = previous?.context === digest(input) && previousPurpose?.source === "reply" ? previousPurpose : null;
  const purpose = retainedReply?.choice || recognizedPurpose(state, report);
  if (purpose) state.decisions.frontendPurpose = { ...(retainedReply || { choice: purpose, source: input.suppliedPurpose ? "request" : "recognition", statement: input.request || purpose }), observation: digest(state.decisions.frontendObservation) };
  else delete state.decisions.frontendPurpose;
  if (previous && digest(previous) !== digest(state.decisions.frontendObservation)) invalidateFrontend(state);
  state.mode = purpose === "faithful-reproduction" ? "replicate" : input.workflowMode || "brief";
}
function recordPurpose(state, root, options) {
  if (!observationFinished(state, root)) fail("frontend entry", "return a current bounded observation before clarifying purpose", { code: "WORKFLOW_NOT_READY" });
  assertEnum(options.choice, PURPOSES, "purpose", "frontend entry");
  if (!nonEmpty(options.answer)) fail("frontend entry", "--answer must be the owner's actual purpose clarification");
  if (context(state).suppliedPurpose && context(state).suppliedPurpose !== options.choice) fail("frontend entry", "the supplied purpose is already explicit; restart with the changed request instead of silently overriding it");
  const previous = state.decisions.frontendPurpose?.choice;
  state.decisions.frontendPurpose = { choice: options.choice, source: "reply", statement: options.answer.trim(), observation: digest(state.decisions.frontendObservation) };
  if (previous !== options.choice) invalidateFrontend(state);
  state.mode = options.choice === "faithful-reproduction" ? "replicate" : context(state).workflowMode || "brief";
}

function boundDecision(root, rel) {
  const file = resolveInside(root, rel, "design-system decision", { scope: "workflow", mustExist: true });
  const value = readJson(file, "design-system decision");
  validateDesignSystemDecision(value);
  if (value.status !== "ready") fail("frontend decision", "the design-system decision is not ready", { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
  if (!nonEmpty(value.sourceBindings?.requestPath) || !hashesCurrent(root, value.sourceBindings?.inputHashes)
      || !Object.hasOwn(value.sourceBindings.inputHashes, value.sourceBindings.requestPath)) fail("frontend decision", "decision request/source bindings are missing or stale; rerun design-system decide", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  const supplied = readJson(resolveInside(root, value.sourceBindings.requestPath, "design-system request", { scope: "workflow", mustExist: true }), "design-system request");
  const processPaths = new Set([rel, value.sourceBindings.requestPath]);
  for (const [pathField, valueField] of [["frontendStackDecisionPath", "frontendStackDecision"], ["capabilityInventoryPath", "capabilityInventory"], ["catalogPath", "catalog"]]) {
    if (supplied[pathField] === undefined) continue;
    const source = resolveInside(root, supplied[pathField], pathField, { scope: "workflow", mustExist: true });
    const relative = path.relative(root, source).split(path.sep).join("/");
    if (supplied[valueField] !== undefined || !Object.hasOwn(value.sourceBindings.inputHashes, relative)) fail("frontend decision", `unbound or conflicting ${pathField}`, { code: "DESIGN_SYSTEM_DECISION_STALE" });
    supplied[valueField] = readJson(source, valueField);
    processPaths.add(relative);
    delete supplied[pathField];
  }
  const comparable = { ...value.request };
  if (supplied.catalog === undefined) delete comparable.catalog; // Retain the validated immutable catalog snapshot selected by the CLI.
  if (supplied.allowCanary === undefined) delete comparable.allowCanary; // Existing explicit CLI override.
  if (canonicalJson(supplied) !== canonicalJson(comparable)) fail("frontend decision", "the replay request differs from its bound source; republish with design-system decide", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  const governingSource = value.projectAuthority?.source;
  let governingPath = null;
  if (typeof governingSource === "string" && governingSource !== "project" && !/^https?:\/\//i.test(governingSource)) {
    const source = resolveInside(root, governingSource, "project governing source", { scope: "workflow", mustExist: true });
    governingPath = path.relative(root, source).split(path.sep).join("/");
    if (!Object.hasOwn(value.sourceBindings.inputHashes, governingPath)) fail("frontend decision", "project governing source is not bound to the decision", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  }
  for (const source of Object.keys(value.sourceBindings.inputHashes)) {
    if (processPaths.has(source) || source === governingPath) continue;
    try {
      const data = readJson(resolveInside(root, source, "bound process source", { scope: "workflow", mustExist: true }), "bound process source");
      if (canonicalJson(data) === canonicalJson(value.request.catalog)) processPaths.add(source);
      else if (canonicalJson(normalizeSnapshot(data)) === canonicalJson(value.request.catalog)) processPaths.add(source);
    } catch { /* Other bound inputs remain product-owned; a schema label is not role proof. */ }
  }
  const inputHashes = { ...value.sourceBindings.inputHashes, [rel]: fileHash(root, rel) };
  const stackRequest = "frontend-stack-request.json";
  try {
    const data = readJson(resolveInside(root, stackRequest, "stack request", { scope: "workflow", mustExist: true }), "stack request");
    const registry = readJson(path.join(__dirname, "../../references/frontend-stack-registry.json"), "stack registry");
    const skills = readJson(path.join(__dirname, "../../references/mengto-skills-catalog.json"), "stack skills");
    if (canonicalJson(resolveFrontendStack(data, registry, skills)) === canonicalJson(value.request.frontendStackDecision)) {
      processPaths.add(stackRequest);
      inputHashes[stackRequest] = fileHash(root, stackRequest);
    }
  } catch { /* Unreplayed requests do not acquire a process role. */ }
  return { value, inputHashes, processPaths: [...processPaths], sha256: fileHash(root, rel) };
}
function decisionStatus(state, root, options = {}) {
  const record = state.decisions?.designSystem;
  if (!record || !nonEmpty(record.path)) return { status: "missing", reason: "No consumed design-system-decision.v1 is recorded." };
  if (!purposeFinished(state, root)) return { status: "stale", reason: "Frontend observation evidence or purpose is missing or changed." };
  try {
    const current = boundDecision(root, record.path);
    if (record.sha256 !== current.sha256 || !hashesCurrent(root, record.inputHashes)) return { status: "stale", reason: "The consumed decision or its request/source evidence changed or was removed." };
    if (record.entry !== entryDigest(state)) return { status: "stale", reason: "Frontend purpose or observed source snapshot changed after the decision." };
    if (options.runtime && current.value.mode === "reference" && (!current.value.projectAuthority || !Object.keys(state.decisions.frontendObservation.observedSourceHashes).length)) return { status: "blocked", reason: "Reference-only research cannot authorize runtime adoption; retain an actually observed project-owned system or record explicit custom/adopt/substitute authority." };
    return { status: "ready", ...current };
  } catch (error) { return { status: "invalid", reason: error.message }; }
}
function entryDigest(state) { return digest({ context: context(state), observation: state.decisions?.frontendObservation || null, purpose: state.decisions?.frontendPurpose || null }); }
function decisionDigest(state) { return digest({ entry: entryDigest(state), decision: state.decisions?.designSystem || null, revision: state.decisions?.frontendRevision || 0 }); }
function decisionInputs(state) { return [...new Set([...Object.keys(state.decisions?.frontendObservation?.inputHashes || {}), ...Object.keys(state.decisions?.designSystem?.inputHashes || {})])]; }
const DESIGN_SYSTEM = {
  id: "design-system", finished: (state, root) => decisionStatus(state, root).status === "ready",
  action: (state, root) => ({
    type: "run", instruction: "Use the existing v1 frontend-stack/design-system decision. Preserve the observed project-owned system for optimization. If the owner explicitly requested scratch, record selection.basis owner-scratch with their exact request/reply: no catalog search or extra interview solely for scratch. Otherwise decompose actual capabilities and compare catalog candidates; fallback/substitution needs searches, rejections, compatibility, rationale and owner selection. Unknown library identity needs clarification, never a familiar-library guess. Reference-only research does not authorize dependencies. Publish with design-system decide, then consume the current artifact using record.",
    command: `${cliCommand()} design-system decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --artifact design-system-request.json --write --output design-system-decision.json`,
    record: `${command(root, "design-system")} --artifact design-system-decision.json [--answer "<owner reply already received, if the selection source is reply>"]`,
    verification: decisionStatus(state, root), why: "Directions/spec/tasks and implementation follow a validated decision, not a product-phrase miss or a ready/approved flag.",
  }),
};
function recordDesignSystem(state, root, options) {
  const rel = options.artifact;
  if (!nonEmpty(rel)) fail("frontend decision", "--artifact is required: the published design-system decision");
  const current = boundDecision(root, rel), authority = current.value.selection?.authority;
  if (!purposeFinished(state, root, current.processPaths)) fail("frontend decision", "observe and resolve the supplied frontend purpose before consuming its decision", { code: "WORKFLOW_NOT_READY" });
  if (authority?.actor === "owner") {
    const supplied = [context(state).request, state.decisions.frontendPurpose?.statement].filter(Boolean);
    if (authority.source === "request" && !supplied.includes(authority.text)) fail("frontend decision", "owner authority must match the supplied request, not an asserted approval", { code: "DESIGN_SYSTEM_OWNER_MISMATCH" });
    if (authority.source === "reply" && options.answer !== authority.text) fail("frontend decision", "--answer must record the actual owner reply used by this decision", { code: "DESIGN_SYSTEM_OWNER_MISMATCH" });
  }
  if (current.value.selection?.basis === "preserve-existing" && !Object.keys(state.decisions.frontendObservation.observedSourceHashes).length) fail("frontend decision", "preserving an existing system needs an actual observed project source, not a declaration in an empty project", { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
  const previous = state.decisions.designSystem;
  const runtimeChoice = digest({ mode: current.value.mode, selected: current.value.selected, projectAuthority: current.value.projectAuthority, stack: current.value.frontendStackDecision });
  const entry = entryDigest(state);
  if (!previous || previous.runtimeChoice !== runtimeChoice || previous.entry !== entry) {
    delete state.decisions.components;
    delete state.decisions.componentSources;
  }
  state.decisions.designSystem = { path: rel, sha256: current.sha256, inputHashes: current.inputHashes, processPaths: current.processPaths, entry, runtimeChoice, mode: current.value.mode, selection: current.value.selection, visualAcceptance: "not-evaluated" };
  if (!previous || digest(previous) !== digest(state.decisions.designSystem)) invalidateFrontend(state);
  transactionRoles.delete(state);
}
function synchronizeFrontend(state, root) {
  if (!isFrontend(state)) return false;
  if (!state.frontend) state.frontend = createFrontendContext({ mode: state.mode });
  const record = state.decisions?.designSystem;
  const current = record && decisionStatus(state, root);
  if (!current || current.status === "ready" || record.invalidated === current.reason) return false;
  record.invalidated = current.reason;
  invalidateFrontend(state);
  return true;
}
function requireRuntimeDecision(state, root) {
  const result = decisionStatus(state, root, { runtime: true });
  if (result.status !== "ready") fail("frontend decision", result.reason, { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
  return result;
}
function optimizationBoundary(state) {
  const purpose = state.decisions?.frontendPurpose?.choice;
  return purpose === "faithful-reproduction"
    ? "Faithful reproduction: preserve the supplied reference's fidelity and invariants; do not replace it with a preferred style."
    : ["optimize-existing", "reference-for-existing"].includes(purpose)
      ? "Improve layout and visual treatment while preserving existing functions, product content and explicit brand constraints. A supplied reference guides design, not replacement business content. Material overall-style changes use the current owner concept/description decisions; already-authorized small work adds no approval."
      : "Use the settled request and source evidence; do not invent product facts or owner acceptance.";
}

function projectFrontendState(root) {
  const file = path.join(root, ".design-pipeline", "state.json");
  if (!fs.existsSync(file)) return null;
  const state = readJson(file, "frontend workflow state");
  return state.schema === "design-pipeline.workflow-state.v1" && isFrontend(state) ? state : null;
}
function nativeFrontendStatus(nativeState, options = {}) {
  const binding = nativeState.extensions?.frontend;
  if (!binding) return null;
  try {
    if (!isFrontend(binding) || !nonEmpty(binding.projectRoot) || !path.isAbsolute(binding.projectRoot)) fail("frontend decision", "native frontend context is invalid");
    const root = fs.realpathSync.native(binding.projectRoot);
    const state = projectFrontendState(root);
    if (!state || state.deliverable !== binding.deliverable) fail("frontend decision", "the bound frontend workflow is missing or has a different deliverable");
    const current = decisionStatus(state, root, options);
    if (current.status !== "ready") return current;
    const inputHashes = Object.fromEntries(decisionInputs(state).map(rel => [rel, fileHash(root, rel)]));
    return { status: "ready", root, decisionPath: state.decisions.designSystem.path, inputHashes, digest: digest({ decision: decisionDigest(state), inputHashes }) };
  } catch (error) { return { status: "invalid", reason: error.message }; }
}
const NATIVE_FRONTEND_PHASES = new Set(["directions", "design-spec", "motion-spec", "tasks", "implementation", "gate-review", "verification", "release-readiness"]);
const NATIVE_FRONTEND_RUNTIME_PHASES = new Set(["implementation", "gate-review", "verification", "release-readiness"]);
const CONTROL_FRONTEND_PHASES = new Set(["direction-synthesis", "direction-lock", "foundations", "component-routing", "anchor-screen", "critical-flows", "interaction-states", "implementation", "runtime-verification", "package"]);
const CONTROL_FRONTEND_RUNTIME_PHASES = new Set(["implementation", "runtime-verification", "package"]);
function frontendPhasePolicy(phase, registry = "design-pipeline.phases.v2") {
  const control = registry === "design-pipeline.control.v1";
  return { protected: (control ? CONTROL_FRONTEND_PHASES : NATIVE_FRONTEND_PHASES).has(phase), runtime: (control ? CONTROL_FRONTEND_RUNTIME_PHASES : NATIVE_FRONTEND_RUNTIME_PHASES).has(phase) };
}

module.exports = { DESIGN_SYSTEM, NATIVE_FRONTEND_PHASES, NATIVE_FRONTEND_RUNTIME_PHASES, OBSERVE, PURPOSE, PURPOSES, authorizeSourceOutputs, authorizeWorkflowOutputs, boundDecision, createFrontendContext, decisionDigest, decisionInputs, decisionStatus, entryDigest, frontendPhasePolicy, isFrontend, nativeFrontendStatus, observationFinished, optimizationBoundary, outputInputs, projectFrontendState, purposeFinished, recordCheckedSourceOutputs, recordConsumedProcessOutputs, recordDesignSystem, recordObservation, recordPurpose, requireRuntimeDecision, synchronizeFrontend };
