"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertString,
  fail,
  readJson,
  resolveInside,
  sha256,
} = require("./contract-utils.cjs");
const BLUEPRINT_REGISTRY = require("../references/playground-blueprints.json");

const SCHEMA = "design-pipeline.playground.v1";
const REQUIRED_REASONS = [
  "explicit-playground",
  "interaction-better-than-text",
  "high-dimensional-visual",
  "parameter-sensitive",
];
const WAIVER_REASONS = [
  "narrow-change",
  "non-visual",
  "exact-primary-target",
  "fixed-design-spec",
  "direction-preview-sufficient",
];
const BUILTIN_ROUTES = new Map(BLUEPRINT_REGISTRY.routes.map((route) => [route.kind, route]));
const KINDS = [...BUILTIN_ROUTES.keys()];
const INTEGRATION_TARGETS = Object.freeze(Object.fromEntries(BLUEPRINT_REGISTRY.routes.map((route) => [route.kind, route.integrationTarget])));
const ALLOWED_INTEGRATION_TARGETS = new Set(BLUEPRINT_REGISTRY.allowedIntegrationTargets);
const CONTROL_TYPES = ["range", "select", "checkbox", "color", "text"];
const VERIFICATION_CHECKS = [
  "everyControlUpdatesState",
  "everyPresetAppliesDeclaredState",
  "previewUpdatesImmediately",
  "promptUpdatesImmediately",
  "copyMatchesPrompt",
  "keyboardOperable",
];
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function assertHash(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) fail("playground", `${label} must be a lowercase SHA-256`);
}

function assertId(value, label) {
  assertString(value, label, "playground");
  if (!ID.test(value)) fail("playground", `${label} must be a lowercase path-safe identifier`);
}

function assertArtifact(value, label, extension) {
  assertKeys(value, ["path", "sha256"], ["path", "sha256"], label, "playground");
  assertString(value.path, `${label}.path`, "playground");
  assertHash(value.sha256, `${label}.sha256`);
  if (extension && path.extname(value.path).toLowerCase() !== extension) {
    fail("playground", `${label}.path must end in ${extension}`);
  }
}

function readBoundArtifact(root, artifact, label, blockers, reasons, extension) {
  assertArtifact(artifact, label, extension);
  const file = resolveInside(root, artifact.path, label, { scope: "playground" });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    reasons.push("playground-file-missing");
    blockers.push(`${label} does not name an existing regular file: ${artifact.path}`);
    return { file, content: null };
  }
  const content = fs.readFileSync(file);
  if (sha256(content) !== artifact.sha256) {
    reasons.push("playground-hash-mismatch");
    blockers.push(`${label} hash does not match ${artifact.path}`);
  }
  return { file, content };
}

function valueMatches(control, value) {
  if (control.type === "checkbox") return typeof value === "boolean";
  if (control.type === "range") {
    return typeof value === "number" && Number.isFinite(value) && value >= control.min && value <= control.max;
  }
  if (control.type === "select") return typeof value === "string" && control.options.includes(value);
  return typeof value === "string";
}

function assertControl(control, index) {
  const label = `surface.controls[${index}]`;
  assertKeys(
    control,
    ["id", "label", "group", "type", "default"],
    ["id", "label", "group", "type", "default", "min", "max", "step", "options"],
    label,
    "playground",
  );
  assertId(control.id, `${label}.id`);
  for (const key of ["label", "group"]) assertString(control[key], `${label}.${key}`, "playground");
  assertEnum(control.type, CONTROL_TYPES, `${label}.type`, "playground");
  if (control.type === "range") {
    for (const key of ["min", "max", "step"]) {
      if (typeof control[key] !== "number" || !Number.isFinite(control[key])) {
        fail("playground", `${label}.${key} must be a finite number for a range control`);
      }
    }
    if (control.min >= control.max || control.step <= 0) fail("playground", `${label} has an invalid range`);
  } else if (Object.hasOwn(control, "min") || Object.hasOwn(control, "max") || Object.hasOwn(control, "step")) {
    fail("playground", `${label} may use min, max, and step only for a range control`);
  }
  if (control.type === "select") {
    if (!Array.isArray(control.options) || control.options.length < 2 || control.options.some((item) => typeof item !== "string" || !item)) {
      fail("playground", `${label}.options must contain at least two non-empty strings`);
    }
    if (new Set(control.options).size !== control.options.length) fail("playground", `${label}.options must be unique`);
  } else if (Object.hasOwn(control, "options")) {
    fail("playground", `${label}.options is allowed only for a select control`);
  }
  if (!valueMatches(control, control.default)) fail("playground", `${label}.default does not match its control contract`);
}

function assertValues(values, controls, label) {
  if (!values || typeof values !== "object" || Array.isArray(values)) fail("playground", `${label} must be an object`);
  assertKeys(values, controls.map((control) => control.id), controls.map((control) => control.id), label, "playground");
  for (const control of controls) {
    if (!valueMatches(control, values[control.id])) fail("playground", `${label}.${control.id} does not match its control contract`);
  }
}

function assertSurface(surface) {
  assertKeys(surface, ["kind", "blueprint", "title", "context", "artifact", "controls", "presets"], ["kind", "blueprint", "title", "context", "artifact", "controls", "presets"], "surface", "playground");
  assertId(surface.kind, "surface.kind");
  assertKeys(surface.blueprint, ["source", "id"], ["source", "id", "artifact", "integrationTarget"], "surface.blueprint", "playground");
  assertEnum(surface.blueprint.source, ["builtin", "change"], "surface.blueprint.source", "playground");
  assertId(surface.blueprint.id, "surface.blueprint.id");
  if (surface.blueprint.source === "builtin") {
    if (Object.hasOwn(surface.blueprint, "artifact") || Object.hasOwn(surface.blueprint, "integrationTarget")) {
      fail("playground", "a builtin blueprint is selected only by id; its artifact and target come from the bundled registry");
    }
  } else {
    assertArtifact(surface.blueprint.artifact, "surface.blueprint.artifact", ".md");
    assertEnum(surface.blueprint.integrationTarget, [...ALLOWED_INTEGRATION_TARGETS], "surface.blueprint.integrationTarget", "playground");
  }
  for (const key of ["title", "context"]) assertString(surface[key], `surface.${key}`, "playground");
  assertArtifact(surface.artifact, "surface.artifact", ".html");
  if (!Array.isArray(surface.controls) || surface.controls.length < 1 || surface.controls.length > 24) {
    fail("playground", "surface.controls must contain one to 24 controls");
  }
  surface.controls.forEach(assertControl);
  const controlIds = surface.controls.map((control) => control.id);
  if (new Set(controlIds).size !== controlIds.length) fail("playground", "surface control IDs must be unique");
  if (!Array.isArray(surface.presets) || surface.presets.length < 3 || surface.presets.length > 5) {
    fail("playground", "surface.presets must contain three to five cohesive presets");
  }
  const presetIds = [];
  for (let index = 0; index < surface.presets.length; index += 1) {
    const preset = surface.presets[index];
    const label = `surface.presets[${index}]`;
    assertKeys(preset, ["id", "name", "values"], ["id", "name", "values"], label, "playground");
    assertId(preset.id, `${label}.id`);
    assertString(preset.name, `${label}.name`, "playground");
    assertValues(preset.values, surface.controls, `${label}.values`);
    presetIds.push(preset.id);
  }
  if (new Set(presetIds).size !== presetIds.length) fail("playground", "surface preset IDs must be unique");
}

function blueprintDescriptor(surface) {
  if (surface.blueprint.source === "builtin") {
    const route = BUILTIN_ROUTES.get(surface.kind);
    if (!route || route.blueprint !== surface.blueprint.id) {
      fail("playground", `no builtin blueprint route matches ${surface.kind}/${surface.blueprint.id}`);
    }
    const file = path.resolve(__dirname, "..", route.path);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail("playground", `bundled blueprint is missing: ${route.path}`);
    return {
      source: "builtin",
      id: route.blueprint,
      sha256: sha256(fs.readFileSync(file)),
      integrationTarget: route.integrationTarget,
    };
  }
  return {
    source: "change",
    id: surface.blueprint.id,
    sha256: surface.blueprint.artifact.sha256,
    integrationTarget: surface.blueprint.integrationTarget,
  };
}

function checkBlueprint(root, surface, blockers, reasons) {
  const descriptor = blueprintDescriptor(surface);
  if (descriptor.source === "change") {
    const artifact = readBoundArtifact(root, surface.blueprint.artifact, "change blueprint", blockers, reasons, ".md");
    if (artifact.content) {
      const text = artifact.content.toString("utf8");
      for (const heading of ["Required Surface", "State And Output", "QA"]) {
        if (!new RegExp(`^## ${heading}\\s*$`, "m").test(text)) {
          reasons.push("playground-blueprint-incomplete");
          blockers.push(`change blueprint must contain ## ${heading}`);
        }
      }
    }
  }
  return descriptor;
}

function inspectHtml(html, surface, blockers, reasons) {
  const requiredMarkers = [
    "data-design-playground",
    "data-playground-controls",
    "data-playground-preview",
    "data-playground-prompt",
    "data-playground-copy",
  ];
  for (const marker of requiredMarkers) {
    if (!new RegExp(`${marker}(?:\\s|=|>)`, "i").test(html)) {
      reasons.push("playground-marker-missing");
      blockers.push(`playground HTML has no ${marker} marker`);
    }
  }
  for (const control of surface.controls) {
    const id = control.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`data-playground-control\\s*=\\s*["']${id}["']`, "i").test(html)) {
      reasons.push("playground-control-missing");
      blockers.push(`playground HTML has no control binding for ${control.id}`);
    }
  }
  for (const preset of surface.presets) {
    const id = preset.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`data-playground-preset\\s*=\\s*["']${id}["']`, "i").test(html)) {
      reasons.push("playground-preset-missing");
      blockers.push(`playground HTML has no preset binding for ${preset.id}`);
    }
  }
  const externalPatterns = [
    /<script\b[^>]*\bsrc\s*=/i,
    /<link\b[^>]*\bhref\s*=/i,
    /<(?:img|video|audio|source|iframe)\b[^>]*\b(?:src|srcset|poster)\s*=\s*["'](?!data:)/i,
    /@import\s+/i,
    /\b(?:src|href)\s*=\s*["']\s*https?:/i,
    /\b(?:fetch|import)\s*\(/i,
    /\bimport\s+(?:["']|[^;\r\n]*\bfrom\s*["'])/i,
    /\b(?:XMLHttpRequest|WebSocket|EventSource)\b/,
    /navigator\.sendBeacon\s*\(/,
    /\b(?:(?:window|document)\.)?(?:location|open)\s*(?:\.|\(|=)/i,
    /<base\b/i,
    /<form\b[^>]*\baction\s*=/i,
  ];
  const cssUrls = [...html.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi)].map((match) => match[2].trim());
  const externalCssUrl = cssUrls.some((value) => !value.startsWith("data:") && !value.startsWith("#"));
  if (externalPatterns.some((pattern) => pattern.test(html)) || externalCssUrl) {
    reasons.push("playground-external-dependency");
    blockers.push("playground HTML must be self-contained and cannot load external scripts, styles, or assets");
  }
  const cspTag = html.match(/<meta\b(?=[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'])[^>]*>/i)?.[0] || "";
  const csp = cspTag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
  const cspDirectives = new Map();
  const duplicateDirectives = new Set();
  for (const raw of csp.split(";")) {
    const parts = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const [name, ...sources] = parts;
    if (cspDirectives.has(name)) duplicateDirectives.add(name);
    else cspDirectives.set(name, sources);
  }
  const cspPolicy = new Map([
    ["default-src", ["'none'"]],
    ["connect-src", ["'none'"]],
    ["form-action", ["'none'"]],
    ["frame-src", ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'none'"]],
    ["font-src", ["'none'"]],
    ["media-src", ["'none'"]],
    ["worker-src", ["'none'"]],
    ["manifest-src", ["'none'"]],
    ["script-src", ["'unsafe-inline'"]],
    ["style-src", ["'unsafe-inline'"]],
    ["img-src", ["data:"]],
  ]);
  for (const [directive, expected] of cspPolicy) {
    const sources = cspDirectives.get(directive);
    if (duplicateDirectives.has(directive) || !sources || JSON.stringify(sources) !== JSON.stringify(expected)) {
      reasons.push("playground-csp-incomplete");
      blockers.push(`playground CSP must define ${directive} exactly once as ${expected.join(" ")}`);
    }
  }
  for (const directive of cspDirectives.keys()) {
    if (!cspPolicy.has(directive)) {
      reasons.push("playground-csp-incomplete");
      blockers.push(`playground CSP contains unsupported override directive ${directive}`);
    }
  }

  const updateBody = html.match(/function\s+updateAll\s*\([^)]*\)\s*\{([\s\S]*?)\}/)?.[1] || "";
  const renderBody = html.match(/function\s+renderPreview\s*\([^)]*\)\s*\{([\s\S]*?)\}/)?.[1] || "";
  const promptBody = html.match(/function\s+updatePrompt\s*\([^)]*\)\s*\{([\s\S]*?)\}/)?.[1] || "";
  const hasControlCollection = /querySelectorAll\s*\([^)]*data-playground-control/.test(html);
  const hasPresetCollection = /querySelectorAll\s*\([^)]*data-playground-preset/.test(html);
  const hasControlEvents = /addEventListener\s*\(\s*["']input["']/.test(html) && /addEventListener\s*\(\s*["']change["']/.test(html);
  const hasControlStateWrite = /state\s*\[\s*control\.dataset\.playgroundControl\s*\]\s*=/.test(html);
  const hasPresetEvent = /addEventListener\s*\(\s*["']click["']/.test(html)
    && /Object\.assign\s*\(\s*state\s*,\s*presetValues\s*\[\s*preset\.dataset\.playgroundPreset\s*\]\s*\)/.test(html);
  const hasRenderMutation = /(?:textContent|innerHTML)\s*=|(?:style|dataset)\.[a-zA-Z0-9_-]+\s*=|setAttribute\s*\(/.test(renderBody);
  const hasPromptMutation = /textContent\s*=/.test(promptBody);
  if (!updateBody.includes("renderPreview(") || !updateBody.includes("updatePrompt(") || !hasControlCollection || !hasPresetCollection || !hasControlEvents || !hasControlStateWrite || !hasPresetEvent || !hasRenderMutation || !hasPromptMutation) {
    reasons.push("playground-live-update-missing");
    blockers.push("playground HTML must bind every declared control and preset to one updateAll() path that mutates both preview and prompt output");
  }
  if (!/navigator\.clipboard\.writeText\s*\(\s*document\.querySelector\s*\(\s*["']\[data-playground-prompt\]["']\s*\)\.textContent\s*\)/.test(html)) {
    reasons.push("playground-copy-missing");
    blockers.push("playground HTML must copy the current generated prompt text through the Clipboard API");
  }
}

function changedControlIds(surface, values) {
  return surface.controls
    .filter((control) => !Object.is(values[control.id], control.default))
    .map((control) => control.id);
}

function selectionStateSha256(surface, values, changedIds) {
  const normalized = {
    values: Object.fromEntries(surface.controls.map((control) => [control.id, values[control.id]])),
    changedControlIds: changedIds,
  };
  return sha256(Buffer.from(JSON.stringify(normalized)));
}

function surfaceContractSha256(surface) {
  const blueprint = blueprintDescriptor(surface);
  const controls = surface.controls.map((control) => ({
    id: control.id,
    label: control.label,
    group: control.group,
    type: control.type,
    default: control.default,
    ...(control.type === "range" ? { min: control.min, max: control.max, step: control.step } : {}),
    ...(control.type === "select" ? { options: [...control.options] } : {}),
  }));
  const presets = surface.presets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    values: Object.fromEntries(surface.controls.map((control) => [control.id, preset.values[control.id]])),
  }));
  return sha256(Buffer.from(JSON.stringify({
    kind: surface.kind,
    blueprint,
    title: surface.title,
    context: surface.context,
    artifactSha256: surface.artifact.sha256,
    controls,
    presets,
  })));
}

function assertVerificationShape(verification, applicability) {
  assertKeys(
    verification,
    ["status", "method", "checkedAt", "surfaceSha256", "checks", "evidence"],
    ["status", "method", "checkedAt", "surfaceSha256", "checks", "evidence"],
    "verification",
    "playground",
  );
  if (applicability === "waived") {
    if (verification.status !== "waived" || verification.method !== null || verification.checkedAt !== null || verification.surfaceSha256 !== null || verification.checks !== null || verification.evidence !== null) {
      fail("playground", "a waived playground has a fully null waived verification");
    }
    return;
  }
  assertEnum(verification.status, ["pending", "passed"], "verification.status", "playground");
  if (verification.status === "pending") {
    if (verification.method !== null || verification.checkedAt !== null || verification.surfaceSha256 !== null || verification.checks !== null || verification.evidence !== null) {
      fail("playground", "a pending playground verification has null method, time, checks, and evidence");
    }
    return;
  }
  assertEnum(verification.method, ["browser", "manual-browser"], "verification.method", "playground");
  assertString(verification.checkedAt, "verification.checkedAt", "playground");
  if (Number.isNaN(new Date(verification.checkedAt).getTime())) fail("playground", "verification.checkedAt must be an ISO date-time");
  assertHash(verification.surfaceSha256, "verification.surfaceSha256");
  assertKeys(verification.checks, VERIFICATION_CHECKS, VERIFICATION_CHECKS, "verification.checks", "playground");
  for (const check of VERIFICATION_CHECKS) {
    if (verification.checks[check] !== true) fail("playground", `verification.checks.${check} must be true`);
  }
  assertArtifact(verification.evidence, "verification.evidence", ".json");
}

function checkVerificationEvidence(root, receipt, blockers, reasons) {
  if (receipt.verification.status !== "passed") {
    reasons.push("playground-verification-pending");
    blockers.push("browser verification must pass before playground selection or integration");
    return;
  }
  const evidence = readBoundArtifact(root, receipt.verification.evidence, "verification evidence", blockers, reasons, ".json");
  if (!evidence.content) return;
  let report;
  try {
    report = JSON.parse(evidence.content.toString("utf8"));
  } catch {
    reasons.push("playground-verification-invalid");
    blockers.push("verification evidence is not valid JSON");
    return;
  }
  try {
    assertKeys(report, ["schema", "changeId", "method", "checkedAt", "surfaceSha256", "checks"], ["schema", "changeId", "method", "checkedAt", "surfaceSha256", "checks"], "verification evidence", "playground");
    if (report.schema !== "design-pipeline.playground-verification.v1") fail("playground", "verification evidence uses an unsupported schema");
    const expectedSurfaceSha256 = surfaceContractSha256(receipt.surface);
    if (report.changeId !== receipt.changeId || report.method !== receipt.verification.method || report.checkedAt !== receipt.verification.checkedAt) {
      fail("playground", "verification evidence identity does not match the playground receipt");
    }
    if (report.surfaceSha256 !== expectedSurfaceSha256 || receipt.verification.surfaceSha256 !== expectedSurfaceSha256) {
      fail("playground", "verification evidence does not bind the current playground surface contract");
    }
    assertKeys(report.checks, VERIFICATION_CHECKS, VERIFICATION_CHECKS, "verification evidence checks", "playground");
    for (const check of VERIFICATION_CHECKS) {
      if (report.checks[check] !== true || report.checks[check] !== receipt.verification.checks[check]) {
        fail("playground", `verification evidence check ${check} is not a matching pass`);
      }
    }
  } catch (error) {
    reasons.push("playground-verification-invalid");
    blockers.push(error.message);
  }
}

function blockedResult(reason, blocker, details = {}) {
  return { status: "blocked", reason, reasons: [reason], blockers: [blocker], ...details };
}

function checkPlayground(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const stage = options.stage || "build";
  assertEnum(stage, ["build", "selection", "integration"], "stage", "playground");
  const artifactName = options.artifact || "playground.json";
  const receiptPath = resolveInside(root, artifactName, "playground receipt", { scope: "playground" });
  if (!fs.existsSync(receiptPath) || !fs.statSync(receiptPath).isFile()) {
    return blockedResult("playground-receipt-missing", `change ${artifactName} does not exist`, { stage, artifact: receiptPath });
  }

  const receipt = readJson(receiptPath, "playground");
  assertKeys(receipt, ["schema", "changeId", "applicability", "surface", "selection", "verification", "integration"], ["schema", "changeId", "applicability", "surface", "selection", "verification", "integration"], "receipt", "playground");
  if (receipt.schema !== SCHEMA) fail("playground", `unsupported schema ${String(receipt.schema)}`);
  assertString(receipt.changeId, "changeId", "playground");
  if (receipt.changeId !== path.basename(root)) fail("playground", "changeId must match the change-root directory name");
  assertKeys(receipt.applicability, ["status", "reason", "rationale"], ["status", "reason", "rationale"], "applicability", "playground");
  assertString(receipt.applicability.rationale, "applicability.rationale", "playground");
  assertEnum(receipt.applicability.status, ["required", "waived"], "applicability.status", "playground");

  if (receipt.applicability.status === "waived") {
    assertEnum(receipt.applicability.reason, WAIVER_REASONS, "applicability.reason", "playground");
    if (receipt.surface !== null) fail("playground", "a waived playground has a null surface");
    assertKeys(receipt.selection, ["status", "values", "changedControlIds", "stateSha256", "prompt"], ["status", "values", "changedControlIds", "stateSha256", "prompt"], "selection", "playground");
    assertKeys(receipt.integration, ["status", "target"], ["status", "target"], "integration", "playground");
    if (receipt.selection?.status !== "waived" || receipt.integration?.status !== "waived") {
      fail("playground", "a waived playground has waived selection and integration states");
    }
    if (receipt.selection.values !== null || receipt.selection.stateSha256 !== null || receipt.selection.prompt !== null || !Array.isArray(receipt.selection.changedControlIds) || receipt.selection.changedControlIds.length !== 0) {
      fail("playground", "a waived playground has no selected values, changed controls, or prompt");
    }
    if (receipt.integration.target !== null) fail("playground", "a waived playground has no integration target");
    assertVerificationShape(receipt.verification, "waived");
    return { status: "ready", reason: "playground-waived", reasons: [], blockers: [], stage, applicable: false, waiver: receipt.applicability.reason, artifact: receiptPath };
  }

  assertEnum(receipt.applicability.reason, REQUIRED_REASONS, "applicability.reason", "playground");
  assertSurface(receipt.surface);
  assertVerificationShape(receipt.verification, "required");
  assertKeys(receipt.selection, ["status", "values", "changedControlIds", "stateSha256", "prompt"], ["status", "values", "changedControlIds", "stateSha256", "prompt"], "selection", "playground");
  assertEnum(receipt.selection.status, ["pending", "selected"], "selection.status", "playground");
  assertKeys(receipt.integration, ["status", "target"], ["status", "target"], "integration", "playground");
  assertEnum(receipt.integration.status, ["pending", "applied"], "integration.status", "playground");
  if (receipt.selection.status === "pending" && (receipt.selection.values !== null || receipt.selection.stateSha256 !== null || receipt.selection.prompt !== null || !Array.isArray(receipt.selection.changedControlIds) || receipt.selection.changedControlIds.length !== 0)) {
    fail("playground", "a pending selection has null values and prompt with no changed controls");
  }
  if (receipt.integration.status === "pending" && receipt.integration.target !== null) {
    fail("playground", "a pending integration has a null target");
  }

  const blockers = [];
  const reasons = [];
  const blueprint = checkBlueprint(root, receipt.surface, blockers, reasons);
  const htmlArtifact = readBoundArtifact(root, receipt.surface.artifact, "surface artifact", blockers, reasons, ".html");
  if (htmlArtifact.content) inspectHtml(htmlArtifact.content.toString("utf8"), receipt.surface, blockers, reasons);

  if (stage === "selection" || stage === "integration") {
    checkVerificationEvidence(root, receipt, blockers, reasons);
    if (receipt.selection.status !== "selected") {
      reasons.push("playground-selection-pending");
      blockers.push("playground selection is pending; persist the chosen state and generated prompt");
    } else {
      assertValues(receipt.selection.values, receipt.surface.controls, "selection.values");
      const expectedChanged = changedControlIds(receipt.surface, receipt.selection.values);
      if (!Array.isArray(receipt.selection.changedControlIds) || receipt.selection.changedControlIds.some((item) => typeof item !== "string")) {
        fail("playground", "selection.changedControlIds must be an array of control IDs");
      }
      if (JSON.stringify(receipt.selection.changedControlIds) !== JSON.stringify(expectedChanged)) {
        fail("playground", "selection.changedControlIds must exactly match non-default controls in declaration order");
      }
      assertHash(receipt.selection.stateSha256, "selection.stateSha256");
      if (receipt.selection.stateSha256 !== selectionStateSha256(receipt.surface, receipt.selection.values, expectedChanged)) {
        fail("playground", "selection.stateSha256 does not match the canonical selected state");
      }
      const promptArtifact = readBoundArtifact(root, receipt.selection.prompt, "selection prompt", blockers, reasons, ".md");
      if (promptArtifact.content) {
        const prompt = promptArtifact.content.toString("utf8").trim();
        if (prompt.length < 40 || /^[\[{]/.test(prompt) || /(?:^|\n)\s*[a-z0-9-]+\s*=/.test(prompt)) {
          reasons.push("playground-prompt-not-natural-language");
          blockers.push("selection prompt must be a contextual natural-language instruction, not a value dump");
        }
      }
    }
  }

  if (stage === "integration") {
    if (receipt.integration.status !== "applied") {
      reasons.push("playground-integration-pending");
      blockers.push("playground output has not been applied to its governed change artifact");
    } else if (receipt.selection.status === "selected") {
      const targetName = blueprint.integrationTarget;
      const target = readBoundArtifact(root, receipt.integration.target, "integration target", blockers, reasons, ".md");
      if (path.resolve(target.file) !== path.join(root, targetName)) {
        reasons.push("playground-integration-target-invalid");
        blockers.push(`a ${receipt.surface.kind} playground must integrate with the change-root ${targetName}`);
      }
      if (target.content) {
        const text = target.content.toString("utf8");
        for (const [name, value] of [
          ["playground-kind", receipt.surface.kind],
          ["playground-artifact-sha256", receipt.surface.artifact.sha256],
          ["playground-state-sha256", receipt.selection.stateSha256],
          ["playground-prompt-sha256", receipt.selection.prompt.sha256],
        ]) {
          const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (!new RegExp(`${name}:\\s*${escaped}(?:\\s|$)`, "i").test(text)) {
            reasons.push("playground-integration-binding-missing");
            blockers.push(`integration target does not bind ${name}`);
          }
        }
      }
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    status: blockers.length ? "blocked" : "ready",
    reason: uniqueReasons[0] || null,
    reasons: uniqueReasons,
    blockers,
    stage,
    applicable: true,
    controlCount: receipt.surface.controls.length,
    presetCount: receipt.surface.presets.length,
    blueprint: { source: blueprint.source, id: blueprint.id, sha256: blueprint.sha256 },
    selectionStatus: receipt.selection.status,
    integrationStatus: receipt.integration.status,
    artifact: receiptPath,
  };
}

module.exports = {
  CONTROL_TYPES,
  INTEGRATION_TARGETS,
  KINDS,
  REQUIRED_REASONS,
  SCHEMA,
  WAIVER_REASONS,
  VERIFICATION_CHECKS,
  checkPlayground,
  selectionStateSha256,
  surfaceContractSha256,
};
