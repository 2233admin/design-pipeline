"use strict";

// Frontend-only entry and decision consumers. They extend workflow-state.v1, not an extra gate.
const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, canonicalJson, fail, readJson, resolveInside, sha256 } = require("../contract-utils.cjs");
const { inspectProject } = require("../project-analysis-core.cjs");
const { validateReceipt } = require("../evidence-core.cjs");
const { validateDesignSystemDecision } = require("../design-system-decision-core.cjs");
const { cliCommand, invalidateCheckedEvidence, shellPath } = require("./shared.cjs");
const { normalizeSnapshot } = require("../design-system-catalog-core.cjs");

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
  return { request: options.query?.trim() || null, url: options.url || null, scope: options.scope || null, suppliedPurpose: options.purpose || (options.mode === "replicate" ? "faithful-reproduction" : null) };
}

function context(state) { return state.frontend || {}; }
function projectObservation(state, root) {
  const input = context(state);
  return inspectProject(root, { ...(input.request ? { query: input.request } : {}), ...(input.scope ? { scope: input.scope } : {}) });
}
function hasExistingContent(report) {
  return report.files.some(file => /\.(?:html?|[jt]sx|vue|svelte|css|scss)$/i.test(file.path))
    || report.entrypoints.some(entry => /(?:html|app|route|render)/i.test(entry.reason || ""));
}
function recognizedPurpose(state, report) {
  const input = context(state);
  if (input.suppliedPurpose) return input.suppliedPurpose;
  if (state.mode === "replicate") return "faithful-reproduction";
  const text = input.request || "";
  const faithful = /(?:\breproduc(?:e|ing|tion)\b|\breplicat(?:e|ing|ion)\b|\bclone\b|精确复刻|忠实复刻|复刻|照着做|一比一)/i.test(text)
    && !/(?:do not|don't|not|rather than|instead of|不要|不是|别)[^.!。\n]{0,35}(?:reproduc|replicat|clone|复刻|一比一)/i.test(text);
  const referenceRole = /(?:as (?:a )?reference|as inspiration|take inspiration|作为参考|只(?:作|做)?参考|借鉴)/i.test(text);
  if (faithful && referenceRole) return null;
  if (faithful) return "faithful-reproduction";
  if (input.url && /(?:reference|inspir(?:ation|ed)|参考|借鉴)/i.test(text)) return hasExistingContent(report) || /(?:existing|current|已有|现有)/i.test(text) ? "reference-for-existing" : "new";
  if (/(?:optimi[sz]e|improve|polish|redesign|优化|改进|美化|重设计)/i.test(text)) return "optimize-existing";
  if (input.url) return null;
  if (hasExistingContent(report) && !/(?:from scratch|new (?:site|page|component)|从零|新建|全新)/i.test(text)) return text ? null : "optimize-existing";
  return "new";
}

function fileHash(root, rel) {
  const file = resolveInside(root, rel, "frontend evidence", { scope: "workflow", mustExist: true });
  if (!fs.statSync(file).isFile()) fail("frontend entry", `evidence is not a file: ${rel}`);
  return "sha256:" + sha256(fs.readFileSync(file));
}
function hashesCurrent(root, hashes) {
  if (!hashes || !Object.keys(hashes).length) return false;
  try { return Object.entries(hashes).every(([rel, hash]) => fileHash(root, rel) === hash); } catch { return false; }
}
function observationFinished(state, root) {
  const record = state.decisions?.frontendObservation;
  return Boolean(record && record.context === digest(context(state)) && hashesCurrent(root, record.inputHashes));
}
function observedExistingSource(state, root) {
  const rel = state.decisions.frontendObservation?.reportPath;
  return Boolean(rel && hasExistingContent(readJson(resolveInside(root, rel, "frontend observation", { scope: "workflow", mustExist: true }), "frontend observation")));
}

function missingExistingSource(state, root) {
  if (!["optimize-existing", "reference-for-existing"].includes(state.decisions?.frontendPurpose?.choice)) return false;
  return !observedExistingSource(state, root);
}
function purposeFinished(state, root) {
  return observationFinished(state, root) && PURPOSES.includes(state.decisions?.frontendPurpose?.choice)
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
      guide: "references/workflow-web.md#observe",
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
      ? observedExistingSource(state, root)
        ? "Should this link guide improvements to the existing frontend, or should I reproduce it faithfully?"
        : "Should this link inspire a new frontend, or should I reproduce it faithfully?"
      : "Should I improve the existing frontend while preserving what it does, or make a new frontend?",
    guide: "references/workflow-web.md#purpose",
    instruction: "Use the observation already returned. Clarify only this unresolved purpose; do not ask about settled facts or require style vocabulary. Faithful reproduction retains fidelity and invariants; optimization preserves function, content and explicit brand while allowing layout and visual improvements.",
    choices: PURPOSES, record: `${command(root, "purpose")} --choice <purpose> --answer "<the owner's clarification>"`,
    why: "A material reference-versus-reproduction role must not be guessed.",
  }),
};

function invalidateFrontend(state) {
  state.decisions ||= {};
  state.decisions.frontendRevision = (state.decisions.frontendRevision || 0) + 1;
  delete state.decisions.concept;
  delete state.decisions.conceptNotes;
  delete state.decisions.variants;
  invalidateCheckedEvidence(state);
  // Description/section/draft verdicts remain historical; their upstream binding is no longer valid.
}
function recordObservation(state, root, options) {
  if (!nonEmpty(options.answer)) fail("frontend entry", "--answer must contain the observations and limits already delivered to the owner");
  const report = projectObservation(state, root), input = context(state);
  const captureHashes = input.url ? captureInputs(root, options.artifact, input.url) : {};
  if (!input.url && options.artifact) fail("frontend entry", "a link capture applies only when a link was supplied");
  const bytes = canonicalJson(report);
  const rel = `.design-pipeline/frontend-observation-${sha256(bytes)}.json`;
  const target = resolveInside(root, rel, "frontend observation", { scope: "workflow" });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8") !== bytes) fail("frontend entry", "observation output collides with unrelated bytes", { code: "OUTPUT_COLLISION" });
  if (!fs.existsSync(target)) fs.writeFileSync(target, bytes, { flag: "wx" });
  const previous = state.decisions.frontendObservation;
  state.decisions.frontendObservation = { context: digest(input), reportPath: rel, summary: options.answer.trim(), inputHashes: { [rel]: fileHash(root, rel), ...captureHashes }, observedSourceHashes: Object.fromEntries(report.files.map(file => [file.path, file.hash])), visualAcceptance: "not-evaluated" };
  const purpose = recognizedPurpose(state, report);
  if (purpose) state.decisions.frontendPurpose = { choice: purpose, source: input.suppliedPurpose ? "request" : "recognition", observation: digest(state.decisions.frontendObservation), statement: input.request || purpose };
  else delete state.decisions.frontendPurpose;
  if (previous && digest(previous) !== digest(state.decisions.frontendObservation)) invalidateFrontend(state);
  if (purpose === "faithful-reproduction") state.mode = "replicate";
}
function recordPurpose(state, root, options) {
  if (!observationFinished(state, root)) fail("frontend entry", "return a current bounded observation before clarifying purpose", { code: "WORKFLOW_NOT_READY" });
  assertEnum(options.choice, PURPOSES, "purpose", "frontend entry");
  if (!nonEmpty(options.answer)) fail("frontend entry", "--answer must be the owner's actual purpose clarification");
  if (context(state).suppliedPurpose && context(state).suppliedPurpose !== options.choice) fail("frontend entry", "the supplied purpose is already explicit; restart with the changed request instead of silently overriding it");
  const previous = state.decisions.frontendPurpose?.choice;
  state.decisions.frontendPurpose = { choice: options.choice, source: "reply", statement: options.answer.trim(), observation: digest(state.decisions.frontendObservation) };
  if (previous !== options.choice) invalidateFrontend(state);
  if (options.choice === "faithful-reproduction") state.mode = "replicate";
}

function boundDecision(root, rel) {
  const file = resolveInside(root, rel, "design-system decision", { scope: "workflow", mustExist: true });
  const value = readJson(file, "design-system decision");
  validateDesignSystemDecision(value);
  if (value.status !== "ready") fail("frontend decision", "the design-system decision is not ready", { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
  if (!nonEmpty(value.sourceBindings?.requestPath) || !hashesCurrent(root, value.sourceBindings?.inputHashes)
      || !Object.hasOwn(value.sourceBindings.inputHashes, value.sourceBindings.requestPath)) fail("frontend decision", "decision request/source bindings are missing or stale; rerun design-system decide", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  const supplied = readJson(resolveInside(root, value.sourceBindings.requestPath, "design-system request", { scope: "workflow", mustExist: true }), "design-system request");
  for (const [pathField, valueField] of [["frontendStackDecisionPath", "frontendStackDecision"], ["capabilityInventoryPath", "capabilityInventory"], ["catalogPath", "catalog"]]) {
    if (supplied[pathField] === undefined) continue;
    const source = resolveInside(root, supplied[pathField], pathField, { scope: "workflow", mustExist: true });
    const relative = path.relative(root, source).split(path.sep).join("/");
    if (supplied[valueField] !== undefined || !Object.hasOwn(value.sourceBindings.inputHashes, relative)) fail("frontend decision", `unbound or conflicting ${pathField}`, { code: "DESIGN_SYSTEM_DECISION_STALE" });
    supplied[valueField] = readJson(source, valueField);
    delete supplied[pathField];
  }
  const catalogSource = value.sourceBindings.catalogSource;
  if (!catalogSource) fail("frontend decision", "catalog provenance is missing; republish with design-system decide", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  if (supplied.catalog !== undefined) {
    if (catalogSource.kind !== "request") fail("frontend decision", "catalog source contradicts the bound request", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  } else if (catalogSource.kind === "bundled") {
    supplied.catalog = normalizeSnapshot(readJson(path.resolve(__dirname, "../../references/astryx-design-system-snapshot.json"), "bundled catalog snapshot"));
  } else if (["catalog", "snapshot"].includes(catalogSource.kind)) {
    const source = readJson(resolveInside(root, catalogSource.path, "catalog source", { scope: "workflow", mustExist: true }), "catalog source");
    supplied.catalog = catalogSource.kind === "snapshot" ? normalizeSnapshot(source) : source;
  } else fail("frontend decision", "the bound request contains no catalog source", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  const comparable = { ...value.request };
  if (supplied.allowCanary === undefined) delete comparable.allowCanary; // Existing explicit CLI override.
  if (canonicalJson(supplied) !== canonicalJson(comparable)) fail("frontend decision", "the replay request differs from its bound source; republish with design-system decide", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  const governingSource = value.projectAuthority?.source;
  if (typeof governingSource === "string" && governingSource !== "project" && !/^https?:\/\//i.test(governingSource)) {
    const source = resolveInside(root, governingSource, "project governing source", { scope: "workflow", mustExist: true });
    const relative = path.relative(root, source).split(path.sep).join("/");
    if (!Object.hasOwn(value.sourceBindings.inputHashes, relative)) fail("frontend decision", "project governing source is not bound to the decision", { code: "DESIGN_SYSTEM_DECISION_STALE" });
  }
  return { value, inputHashes: { ...value.sourceBindings.inputHashes, [rel]: fileHash(root, rel) }, sha256: fileHash(root, rel) };
}
function decisionStatus(state, root, options = {}) {
  const record = state.decisions?.designSystem;
  if (!record || !nonEmpty(record.path)) return { status: "missing", reason: "No consumed design-system-decision.v1 is recorded." };
  if (!purposeFinished(state, root)) return { status: "stale", reason: "Frontend observation evidence or purpose is missing or changed." };
  try {
    const current = boundDecision(root, record.path);
    if (record.sha256 !== current.sha256 || !hashesCurrent(root, record.inputHashes)) return { status: "stale", reason: "The consumed decision or its request/source evidence changed or was removed." };
    if (record.entry !== entryDigest(state)) return { status: "stale", reason: "Frontend purpose or observed source snapshot changed after the decision." };
    if (record.runtimeChoice !== digest({ mode: current.value.mode, selected: current.value.selected, projectAuthority: current.value.projectAuthority, stack: current.value.frontendStackDecision })) return { status: "stale", reason: "The consumed runtime choice is not bound to its validated decision." };
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
    guide: "references/workflow-web.md#design-system",
    command: `${cliCommand()} design-system decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --artifact design-system-request.json --write --output design-system-decision.json`,
    record: `${command(root, "design-system")} --artifact design-system-decision.json [--answer "<owner reply already received, if the selection source is reply>"]`,
    verification: decisionStatus(state, root), why: "Directions/spec/tasks and implementation follow a validated decision, not a product-phrase miss or a ready/approved flag.",
  }),
};
function recordDesignSystem(state, root, options) {
  if (!purposeFinished(state, root)) fail("frontend decision", "observe and resolve the supplied frontend purpose before consuming its decision", { code: "WORKFLOW_NOT_READY" });
  const rel = options.artifact;
  if (!nonEmpty(rel)) fail("frontend decision", "--artifact is required: the published design-system decision");
  const current = boundDecision(root, rel), authority = current.value.selection?.authority;
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
  state.decisions.designSystem = { path: rel, sha256: current.sha256, inputHashes: current.inputHashes, entry, runtimeChoice, mode: current.value.mode, selection: current.value.selection, visualAcceptance: "not-evaluated" };
  if (!previous || digest(previous) !== digest(state.decisions.designSystem)) invalidateFrontend(state);
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
const NATIVE_FRONTEND_PHASES = new Set(["directions", "design-spec", "motion-spec", "tasks", "implementation", "qa", "release"]);

module.exports = { DESIGN_SYSTEM, NATIVE_FRONTEND_PHASES, OBSERVE, PURPOSE, PURPOSES, boundDecision, createFrontendContext, decisionDigest, decisionInputs, decisionStatus, entryDigest, isFrontend, nativeFrontendStatus, observationFinished, optimizationBoundary, projectFrontendState, purposeFinished, recordDesignSystem, recordObservation, recordPurpose, requireRuntimeDecision, synchronizeFrontend };
