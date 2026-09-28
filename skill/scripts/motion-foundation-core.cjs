"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MOTION_FOUNDATION_SCHEMA = "design-pipeline.motion-foundation.v0.1";
const MOTION_PRIMITIVE_REGISTRY = "design-pipeline.motion-primitives.v1";
const ANIMATION_JOB_SCHEMA = "design-pipeline.animation-job.v1";
const MOTION_GRAPH_SCHEMA = "design-pipeline.motion-graph.v1";
const LIFECYCLE_ADAPTER_SCHEMA = "design-pipeline.animation-lifecycle-adapter.v1";
const ANIMATION_RENDERERS = new Set(["dom", "svg", "canvas2d", "webgl", "3d"]);
const MOTION_EASINGS = new Set(["linear", "ease-in", "ease-out", "ease-in-out"]);
const LIFECYCLE_OPERATIONS = ["init", "resize", "update", "render", "dispose"];
const MOTION_POSTURES = new Set([
  "static",
  "minimal",
  "expressive",
  "cinematic",
  "procedural",
]);
const MOTION_FOUNDATION_SECTIONS = [
  {
    id: "motion thesis",
    aliases: [
      { value: "motion thesis", language: "en" },
      { value: "动效主张", language: "zh" },
    ],
  },
  {
    id: "motion principles",
    aliases: [
      { value: "motion principles", language: "en" },
      { value: "动效原则", language: "zh" },
    ],
  },
  {
    id: "motion vocabulary",
    aliases: [
      { value: "motion vocabulary", language: "en" },
      { value: "motion primitives", language: "en" },
      { value: "动效词汇", language: "zh" },
      { value: "运动原语", language: "zh" },
    ],
  },
  {
    id: "procedural motion",
    aliases: [
      { value: "procedural motion", language: "en" },
      { value: "程序化动效", language: "zh" },
    ],
  },
  {
    id: "runtime policy",
    aliases: [
      { value: "runtime policy", language: "en" },
      { value: "运行时策略", language: "zh" },
    ],
  },
  {
    id: "reduced motion",
    aliases: [
      { value: "reduced motion", language: "en" },
      { value: "减弱动效", language: "zh" },
    ],
  },
  {
    id: "source decisions",
    aliases: [
      { value: "source decisions", language: "en" },
      { value: "provenance", language: "en" },
      { value: "来源决策", language: "zh" },
      { value: "溯源", language: "zh" },
    ],
  },
];

function fail(message) {
  throw new Error(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pathIsInside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function resolveProjectRoot(raw) {
  const root = path.resolve(raw || process.cwd());
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    fail(`project root does not exist: ${root}`);
  }
  return fs.realpathSync(root);
}

function resolveMotionFile(projectRoot, raw) {
  if (!isNonEmptyString(raw)) fail("--motion-file requires a path");
  if (path.isAbsolute(raw)) fail("--motion-file must be project-relative");
  const motionFile = path.resolve(projectRoot, raw);
  if (!pathIsInside(projectRoot, motionFile)) {
    fail("--motion-file must stay inside --project-root");
  }
  return motionFile;
}

function slash(value) {
  return value.replaceAll("\\", "/");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeHeading(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail("MOTION.md must start with YAML frontmatter");
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(
      /^([A-Za-z][A-Za-z0-9-]*):\s*(?:"([^"]*)"|'([^']*)'|([^#\r\n]*?))\s*$/,
    );
    if (!entry) continue;
    values[entry[1]] = (entry[2] ?? entry[3] ?? entry[4]).trim();
  }
  return {
    raw: match[1],
    values,
  };
}

function validateFrontmatter(text) {
  const frontmatter = parseFrontmatter(text);
  if (frontmatter.values.schema !== MOTION_FOUNDATION_SCHEMA) {
    fail(`MOTION.md schema must be ${MOTION_FOUNDATION_SCHEMA}`);
  }
  if (!isNonEmptyString(frontmatter.values.name)) {
    fail("MOTION.md frontmatter must contain a non-empty name");
  }
  if (!MOTION_POSTURES.has(frontmatter.values.posture)) {
    fail(
      "MOTION.md posture must be static, minimal, expressive, cinematic, or procedural",
    );
  }
  if (frontmatter.values.primitiveRegistry !== MOTION_PRIMITIVE_REGISTRY) {
    fail(`MOTION.md primitiveRegistry must be ${MOTION_PRIMITIVE_REGISTRY}`);
  }
  return frontmatter;
}

function collectHeadings(text) {
  return [...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => ({
    value: normalizeHeading(match[1]),
    index: match.index,
    length: match[0].length,
  }));
}

function validateSections(text) {
  const headings = collectHeadings(text);
  const selected = [];
  const missing = [];
  for (const section of MOTION_FOUNDATION_SECTIONS) {
    const match = section.aliases.find((alias) =>
      headings.some((heading) => heading.value === alias.value),
    );
    if (!match) {
      missing.push(section.id);
    } else {
      selected.push({ ...section, alias: match });
    }
  }
  if (missing.length) {
    fail(`MOTION.md is missing required sections: ${missing.join(", ")}`);
  }
  const languages = new Set(selected.map((section) => section.alias.language));
  if (languages.size > 1) {
    fail("MOTION.md required headings must be consistently English or Chinese");
  }
  return {
    headings,
    language: [...languages][0],
    selected,
  };
}

function sectionText(text, headings, aliases) {
  const heading = headings.find((item) => aliases.includes(item.value));
  if (!heading) return "";
  const next = headings.find((item) => item.index > heading.index);
  const start = heading.index + heading.length;
  return text.slice(start, next ? next.index : text.length);
}

function validateSectionContent(text, sections) {
  for (const section of sections.selected) {
    const body = sectionText(text, sections.headings, [section.alias.value]);
    if (!isNonEmptyString(body)) {
      fail(`MOTION.md ${section.id} section must not be empty`);
    }
  }
}

function validateSourceDecisions(text, sections) {
  const aliases = MOTION_FOUNDATION_SECTIONS
    .find((section) => section.id === "source decisions")
    .aliases.map((alias) => alias.value);
  const sourceText = sectionText(text, sections.headings, aliases);
  if (
    !/(?:\badopted\b|采纳|采用)/i.test(sourceText) ||
    !/(?:\brejected\b|拒绝|未采用)/i.test(sourceText)
  ) {
    fail(
      "MOTION.md Source Decisions must identify adopted and rejected source properties",
    );
  }
}

function validateReducedMotion(text, sections) {
  const aliases = MOTION_FOUNDATION_SECTIONS
    .find((section) => section.id === "reduced motion")
    .aliases.map((alias) => alias.value);
  const reducedText = sectionText(text, sections.headings, aliases);
  if (!/(?:\bsubstitute\b|\bfallback\b|替代|回退)/i.test(reducedText)) {
    fail("MOTION.md Reduced Motion must define a substitute or fallback");
  }
}

function validateFoundationSafety(text) {
  const forbidden = [
    { pattern: /<script\b/i, label: "script tag" },
    {
      pattern: /```/,
      label: "code fence",
    },
    { pattern: /=>/, label: "JavaScript arrow function" },
    { pattern: /\b(?:eval|Function)\s*\(/, label: "dynamic code execution" },
    { pattern: /\brequire\s*\(/, label: "CommonJS import" },
    { pattern: /\bimport\s*\(/, label: "dynamic import" },
  ];
  const match = forbidden.find((rule) => rule.pattern.test(text));
  if (match) {
    fail(`MOTION.md definitions must be declarative; found ${match.label}`);
  }
}

function sectionById(text, sections, id) {
  const aliases = MOTION_FOUNDATION_SECTIONS
    .find((section) => section.id === id)
    .aliases.map((alias) => alias.value);
  return sectionText(text, sections.headings, aliases);
}

function markdownLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replaceAll("`", "")
        .trim(),
    )
    .filter(Boolean);
}

function normalizedSectionText(text) {
  return markdownLines(text).join(" ");
}

function decisionValue(text, pattern) {
  const line = markdownLines(text).find((candidate) => pattern.test(candidate));
  if (!line) return "";
  return line.replace(pattern, "").replace(/^[\s:：-]+/, "").trim();
}

function normalizeMotionFoundation(text, frontmatter, sections, selectedPrimitives) {
  const sourceText = sectionById(text, sections, "source decisions");
  const reducedText = sectionById(text, sections, "reduced motion");
  const proceduralText = sectionById(text, sections, "procedural motion");
  const runtimeText = sectionById(text, sections, "runtime policy");
  return {
    schema: MOTION_FOUNDATION_SCHEMA,
    name: frontmatter.values.name,
    posture: frontmatter.values.posture,
    primitiveRegistry: frontmatter.values.primitiveRegistry,
    principles: markdownLines(sectionById(text, sections, "motion principles")),
    primitives: selectedPrimitives,
    proceduralMotion: {
      policy:
        frontmatter.values.posture === "static"
          ? "disabled"
          : "declarative-only",
      description: normalizedSectionText(proceduralText),
    },
    runtimePolicy: {
      summary: normalizedSectionText(runtimeText),
    },
    reducedMotion: {
      substitute: normalizedSectionText(reducedText),
    },
    sourceDecisions: [
      {
        source: "MOTION.md",
        adopted: decisionValue(sourceText, /^(?:adopted\b|采纳|采用)/i),
        rejected: decisionValue(sourceText, /^(?:rejected\b|拒绝|未采用)/i),
        codeCopied: false,
      },
    ],
  };
}

function validateMotionIdentity(model) {
  if (model.schema !== MOTION_FOUNDATION_SCHEMA) {
    fail(`normalized motion schema must be ${MOTION_FOUNDATION_SCHEMA}`);
  }
  if (!isNonEmptyString(model.name) || !MOTION_POSTURES.has(model.posture)) {
    fail("normalized motion foundation has an invalid name or posture");
  }
  if (model.primitiveRegistry !== MOTION_PRIMITIVE_REGISTRY) {
    fail(`normalized primitiveRegistry must be ${MOTION_PRIMITIVE_REGISTRY}`);
  }
}

function validateMotionCollections(model) {
  if (
    !Array.isArray(model.principles) ||
    model.principles.length === 0 ||
    !model.principles.every(isNonEmptyString)
  ) {
    fail("normalized motion foundation must contain non-empty principles");
  }
  if (
    !Array.isArray(model.primitives) ||
    !model.primitives.every(
      (primitive) =>
        isNonEmptyString(primitive) &&
        /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(primitive),
    )
  ) {
    fail("normalized motion primitives do not match the registry id contract");
  }
}

function validateMotionPolicies(model) {
  if (
    !model.proceduralMotion ||
    typeof model.proceduralMotion !== "object" ||
    !["disabled", "declarative-only"].includes(model.proceduralMotion.policy)
  ) {
    fail("normalized proceduralMotion policy is invalid");
  }
  if (
    !model.runtimePolicy ||
    typeof model.runtimePolicy !== "object" ||
    Array.isArray(model.runtimePolicy)
  ) {
    fail("normalized runtimePolicy must be an object");
  }
  if (!isNonEmptyString(model.reducedMotion?.substitute)) {
    fail("normalized reducedMotion must contain a substitute");
  }
  validateProceduralGenerators(model.proceduralMotion.generators);
}

function validateProceduralGenerators(generators) {
  if (generators === undefined) return;
  if (!Array.isArray(generators)) {
    fail("normalized proceduralMotion.generators must be an array");
  }
  for (const generator of generators) {
    if (
      !generator ||
      typeof generator !== "object" ||
      Array.isArray(generator) ||
      !/^procedural\./.test(generator.id) ||
      !generator.parameters ||
      typeof generator.parameters !== "object" ||
      Array.isArray(generator.parameters) ||
      !isNonEmptyString(generator.reducedMotion) ||
      (generator.seed !== undefined &&
        !Number.isInteger(generator.seed) &&
        typeof generator.seed !== "string")
    ) {
      fail("normalized proceduralMotion generator does not match the schema");
    }
  }
}

function validateMotionSourceDecisions(model) {
  if (
    !Array.isArray(model.sourceDecisions) ||
    model.sourceDecisions.length === 0 ||
    !model.sourceDecisions.every(
      (decision) =>
        decision &&
        typeof decision === "object" &&
        typeof decision.source === "string" &&
        (decision.license === undefined || typeof decision.license === "string") &&
        isNonEmptyString(decision.adopted) &&
        isNonEmptyString(decision.rejected) &&
        decision.codeCopied === false,
    )
  ) {
    fail("normalized sourceDecisions must record adopted and rejected properties");
  }
}

function validateMotionFoundationModel(model) {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    fail("normalized motion foundation must be an object");
  }
  const allowedFields = [
    "schema",
    "name",
    "posture",
    "primitiveRegistry",
    "principles",
    "primitives",
    "proceduralMotion",
    "runtimePolicy",
    "reducedMotion",
    "sourceDecisions",
  ];
  const unsupported = Object.keys(model).filter(
    (field) => !allowedFields.includes(field),
  );
  if (unsupported.length) {
    fail(`normalized motion foundation has unsupported fields: ${unsupported.join(", ")}`);
  }
  validateMotionIdentity(model);
  validateMotionCollections(model);
  validateMotionPolicies(model);
  validateMotionSourceDecisions(model);
  return model;
}

function loadPrimitiveIds() {
  const registryFile = path.join(
    __dirname,
    "..",
    "references",
    "motion-primitives.json",
  );
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryFile, "utf8"));
  } catch (error) {
    fail(`motion primitive registry is invalid JSON: ${error.message}`);
  }
  if (
    registry.schema !== MOTION_PRIMITIVE_REGISTRY ||
    !Array.isArray(registry.primitives)
  ) {
    fail("motion primitive registry has an unsupported contract");
  }
  const ids = registry.primitives.map((primitive) => primitive && primitive.id);
  if (
    ids.some((id) => !isNonEmptyString(id)) ||
    new Set(ids).size !== ids.length
  ) {
    fail("motion primitive registry must contain unique non-empty ids");
  }
  return new Set(ids);
}

function selectedPrimitiveIds(text, sections) {
  const sectionIds = ["motion vocabulary", "procedural motion"];
  const selectedText = sectionIds
    .map((sectionId) => {
      const aliases = MOTION_FOUNDATION_SECTIONS
        .find((section) => section.id === sectionId)
        .aliases.map((alias) => alias.value);
      return sectionText(text, sections.headings, aliases);
    })
    .join("\n");
  return [
    ...new Set(
      [...selectedText.matchAll(/\bprimitive:\s*([a-z0-9]+(?:[.-][a-z0-9]+)+)\b/gi)]
        .map((match) => match[1].toLowerCase()),
    ),
  ];
}

function validatePrimitiveSelection(text, posture, sections) {
  const selected = selectedPrimitiveIds(text, sections);
  if (posture === "static" && selected.length > 0) {
    fail("Static MOTION.md must not select moving primitive ids");
  }
  if (posture !== "static" && selected.length === 0) {
    fail("Non-static MOTION.md must select at least one primitive registry id");
  }
  const registered = loadPrimitiveIds();
  const unknown = selected.filter((id) => !registered.has(id));
  if (unknown.length) {
    fail(`MOTION.md selects unknown primitive ids: ${unknown.join(", ")}`);
  }
  return selected;
}

function validateMotionFoundationText(text) {
  if (!isNonEmptyString(text)) fail("MOTION.md must not be empty");
  const frontmatter = validateFrontmatter(text);
  const sections = validateSections(text);
  validateSectionContent(text, sections);
  validateSourceDecisions(text, sections);
  validateReducedMotion(text, sections);
  validateFoundationSafety(text);
  const selectedPrimitives = validatePrimitiveSelection(
    text,
    frontmatter.values.posture,
    sections,
  );
  const foundation = validateMotionFoundationModel(
    normalizeMotionFoundation(text, frontmatter, sections, selectedPrimitives),
  );
  return {
    name: frontmatter.values.name,
    posture: frontmatter.values.posture,
    language: sections.language,
    primitiveRegistry: frontmatter.values.primitiveRegistry,
    selectedPrimitives,
    foundation,
    sha256: sha256Text(text),
  };
}

function checkMotionFoundation(options = {}) {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const motionFile = resolveMotionFile(
    projectRoot,
    options.motionFile || "MOTION.md",
  );
  const relativeMotionFile = slash(path.relative(projectRoot, motionFile));
  if (!fs.existsSync(motionFile)) {
    return {
      schema: "design-pipeline.motion-foundation-check.v1",
      status: "synthesis-required",
      projectRoot,
      motionFile: relativeMotionFile,
      nextAction:
        "Synthesize project MOTION.md from product requirements and references/motion-foundation.md",
    };
  }
  if (!fs.statSync(motionFile).isFile()) {
    fail("--motion-file must identify a file");
  }
  const realFile = fs.realpathSync(motionFile);
  if (!pathIsInside(projectRoot, realFile)) {
    fail("--motion-file resolves outside --project-root");
  }
  const validated = validateMotionFoundationText(
    fs.readFileSync(realFile, "utf8"),
  );
  return {
    schema: "design-pipeline.motion-foundation-check.v1",
    status: "ready",
    projectRoot,
    motionFile: relativeMotionFile,
    ...validated,
  };
}

function animationPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function animationAllowedFields(value, allowed, label) {
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unsupported.length) fail(`${label} has unsupported fields: ${unsupported.join(", ")}`);
}

function animationFinite(value, label, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${label} must be a finite number`);
  if (options.min !== undefined && value < options.min) fail(`${label} must be >= ${options.min}`);
  if (options.integer && !Number.isInteger(value)) fail(`${label} must be an integer`);
}

function animationText(value, label) {
  if (!isNonEmptyString(value)) fail(`${label} must be a non-empty string`);
}

function validatePerformanceBudget(budget, label, fields, extraObservedFields = []) {
  animationPlainObject(budget, label);
  const observedFields = ["observed", "observedMaxMs", "observedCount", "observedBytes", ...extraObservedFields];
  animationAllowedFields(budget, ["applicable", ...fields, "maxLongFrames", ...observedFields], label);
  if (typeof budget.applicable !== "boolean") fail(`${label}.applicable must be boolean`);
  if (!budget.applicable) {
    if ([...fields, "maxLongFrames", ...observedFields].some((field) => budget[field] !== undefined)) fail(`${label} must omit limits and observations when not applicable`);
    return budget;
  }
  for (const field of fields) {
    if (budget[field] === undefined) fail(`${label}.${field} is required when applicable`);
    animationFinite(budget[field], `${label}.${field}`, { min: field === "targetFps" ? 1 : 0, integer: ["max", "maxCount", "maxBytes", "targetFps", "maxLongFrames"].includes(field) });
  }
  if (budget.maxLongFrames !== undefined) {
    if (!fields.includes("maxMs")) fail(`${label}.maxLongFrames is only valid for frame budgets`);
    animationFinite(budget.maxLongFrames, `${label}.maxLongFrames`, { min: 0, integer: true });
  }
  for (const field of observedFields) {
    if (budget[field] !== undefined) animationFinite(budget[field], `${label}.${field}`, { min: 0, integer: ["observed", "observedCount", "observedBytes"].includes(field) });
  }
  const countLimit = budget.max ?? budget.maxCount;
  const countObservation = budget.observed ?? budget.observedCount;
  if (countLimit !== undefined && countObservation !== undefined && countObservation > countLimit) fail(`${label} observed count exceeds budget`);
  if (budget.maxBytes !== undefined && budget.observedBytes !== undefined && budget.observedBytes > budget.maxBytes) fail(`${label} observed bytes exceeds budget`);
  const frameObservation = budget.observedMaxMs ?? (fields.includes("maxMs") ? budget.observed : undefined);
  if (budget.maxMs !== undefined && frameObservation !== undefined && frameObservation > budget.maxMs) fail(`${label} observed frame time exceeds budget`);
  if (budget.maxInputLatencyMs !== undefined && budget.observedInputLatencyMs !== undefined && budget.observedInputLatencyMs > budget.maxInputLatencyMs) fail(`${label} observed input latency exceeds budget`);
  if (budget.maxCpuMs !== undefined && budget.observedCpuMs !== undefined && budget.observedCpuMs > budget.maxCpuMs) fail(`${label} observed CPU time exceeds budget`);
  return budget;
}

function validatePerformanceBudgets(budgets) {
  animationPlainObject(budgets, "performance budgets");
  animationAllowedFields(budgets, ["object", "particle", "texture", "frame"], "performance budgets");
  for (const field of ["object", "particle", "texture", "frame"]) {
    if (!budgets[field]) fail(`performance budgets.${field} is required`);
  }
  validatePerformanceBudget(budgets.object, "performance budgets.object", ["max"]);
  validatePerformanceBudget(budgets.particle, "performance budgets.particle", ["max"]);
  validatePerformanceBudget(budgets.texture, "performance budgets.texture", ["maxCount", "maxBytes"]);
  validatePerformanceBudget(budgets.frame, "performance budgets.frame", ["maxMs", "targetFps", "maxLongFrames", "maxInputLatencyMs", "maxCpuMs"], ["observedInputLatencyMs", "observedCpuMs"]);
  return budgets;
}

function validateDeterministicInputs(deterministic) {
  animationPlainObject(deterministic, "deterministic inputs");
  animationAllowedFields(deterministic, ["seed", "input", "viewport", "dpr", "reducedMotion"], "deterministic inputs");
  if (!(Number.isInteger(deterministic.seed) || isNonEmptyString(deterministic.seed))) {
    fail("deterministic inputs.seed must be an integer or non-empty string");
  }
  animationPlainObject(deterministic.input, "deterministic inputs.input");
  animationPlainObject(deterministic.viewport, "deterministic inputs.viewport");
  animationFinite(deterministic.viewport.width, "deterministic inputs.viewport.width", { min: 1, integer: true });
  animationFinite(deterministic.viewport.height, "deterministic inputs.viewport.height", { min: 1, integer: true });
  animationFinite(deterministic.dpr, "deterministic inputs.dpr", { min: 0.01 });
  if (typeof deterministic.reducedMotion !== "boolean") fail("deterministic inputs.reducedMotion must be boolean");
  return deterministic;
}

function validateMotionGraph(graph) {
  animationPlainObject(graph, "motion graph");
  animationAllowedFields(graph, ["schema", "id", "durationMs", "tracks", "responses", "semanticCarrier", "reducedMotion"], "motion graph");
  if (graph.schema !== MOTION_GRAPH_SCHEMA) fail(`motion graph schema must be ${MOTION_GRAPH_SCHEMA}`);
  animationText(graph.id, "motion graph.id");
  animationFinite(graph.durationMs, "motion graph.durationMs", { min: 0 });
  if (!Array.isArray(graph.tracks)) fail("motion graph.tracks must be an array");
  const trackIds = new Set();
  graph.tracks.forEach((track, index) => {
    const label = `motion graph.tracks[${index}]`;
    animationPlainObject(track, label);
    animationAllowedFields(track, ["id", "subject", "property", "from", "to", "startMs", "durationMs", "ease", "staggerMs"], label);
    for (const key of ["id", "subject", "property"]) animationText(track[key], `${label}.${key}`);
    if (trackIds.has(track.id)) fail(`motion graph track id is duplicated: ${track.id}`);
    trackIds.add(track.id);
    if (track.from === undefined || track.to === undefined) fail(`${label} must declare from and to`);
    if (track.ease !== undefined) {
      animationText(track.ease, `${label}.ease`);
      if (!MOTION_EASINGS.has(track.ease)) fail(`${label}.ease is unsupported`);
    }
    animationFinite(track.startMs, `${label}.startMs`, { min: 0 });
    animationFinite(track.durationMs, `${label}.durationMs`, { min: 0 });
    if (track.startMs + track.durationMs > graph.durationMs) fail(`${label} ends after graph.durationMs`);
    if (track.staggerMs !== undefined) animationFinite(track.staggerMs, `${label}.staggerMs`, { min: 0 });
  });
  if (!Array.isArray(graph.responses)) fail("motion graph.responses must be an array");
  const responseIds = new Set();
  graph.responses.forEach((response, index) => {
    const label = `motion graph.responses[${index}]`;
    animationPlainObject(response, label);
    animationAllowedFields(response, ["id", "input", "boundedRange", "settle", "interruption"], label);
    for (const key of ["id", "input", "settle", "interruption"]) animationText(response[key], `${label}.${key}`);
    if (responseIds.has(response.id)) fail(`motion graph response id is duplicated: ${response.id}`);
    responseIds.add(response.id);
    animationPlainObject(response.boundedRange, `${label}.boundedRange`);
    animationAllowedFields(response.boundedRange, ["min", "max"], `${label}.boundedRange`);
    animationFinite(response.boundedRange.min, `${label}.boundedRange.min`);
    animationFinite(response.boundedRange.max, `${label}.boundedRange.max`);
    if (response.boundedRange.min > response.boundedRange.max) fail(`${label}.boundedRange min exceeds max`);
  });
  animationText(graph.semanticCarrier, "motion graph.semanticCarrier");
  animationPlainObject(graph.reducedMotion, "motion graph.reducedMotion");
  animationAllowedFields(graph.reducedMotion, ["mode", "description"], "motion graph.reducedMotion");
  if (!["resting-state", "discrete-state"].includes(graph.reducedMotion.mode)) fail("motion graph.reducedMotion.mode is invalid");
  animationText(graph.reducedMotion.description, "motion graph.reducedMotion.description");
  return graph;
}

function validateLifecycleAdapter(adapter) {
  const contract = adapter && adapter.contract ? adapter.contract : adapter;
  animationPlainObject(contract, "lifecycle adapter");
  animationAllowedFields(contract, ["schema", "id", "renderer", "operations", "ownership", "containment", "cleanup"], "lifecycle adapter");
  if (contract.schema !== LIFECYCLE_ADAPTER_SCHEMA) fail(`lifecycle adapter schema must be ${LIFECYCLE_ADAPTER_SCHEMA}`);
  animationText(contract.id, "lifecycle adapter.id");
  if (!ANIMATION_RENDERERS.has(contract.renderer)) fail("lifecycle adapter.renderer is unsupported");
  animationPlainObject(contract.operations, "lifecycle adapter.operations");
  animationAllowedFields(contract.operations, LIFECYCLE_OPERATIONS, "lifecycle adapter.operations");
  for (const operation of LIFECYCLE_OPERATIONS) {
    if (contract.operations[operation] !== true && typeof contract.operations[operation] !== "function") {
      fail(`lifecycle adapter.operations.${operation} must be true or callable`);
    }
  }
  animationPlainObject(contract.ownership, "lifecycle adapter.ownership");
  animationAllowedFields(contract.ownership, ["owner", "resources"], "lifecycle adapter.ownership");
  animationText(contract.ownership.owner, "lifecycle adapter.ownership.owner");
  if (!Array.isArray(contract.ownership.resources)) fail("lifecycle adapter.ownership.resources must be an array");
  contract.ownership.resources.forEach((resource, index) => {
    const label = `lifecycle adapter.ownership.resources[${index}]`;
    animationPlainObject(resource, label);
    animationAllowedFields(resource, ["id", "kind", "owner", "disposable"], label);
    for (const key of ["id", "kind", "owner"]) animationText(resource[key], `${label}.${key}`);
    if (typeof resource.disposable !== "boolean") fail(`${label}.disposable must be boolean`);
  });
  animationPlainObject(contract.containment, "lifecycle adapter.containment");
  animationAllowedFields(contract.containment, ["root", "boundary"], "lifecycle adapter.containment");
  animationText(contract.containment.root, "lifecycle adapter.containment.root");
  animationText(contract.containment.boundary, "lifecycle adapter.containment.boundary");
  animationPlainObject(contract.cleanup, "lifecycle adapter.cleanup");
  animationAllowedFields(contract.cleanup, ["observable", "checks"], "lifecycle adapter.cleanup");
  if (contract.cleanup.observable !== true) fail("lifecycle adapter.cleanup.observable must be true");
  if (!Array.isArray(contract.cleanup.checks) || contract.cleanup.checks.length === 0 || !contract.cleanup.checks.every((check) => isNonEmptyString(check))) {
    fail("lifecycle adapter.cleanup.checks must contain named checks");
  }
  return contract;
}

function validateAnimationJob(job) {
  animationPlainObject(job, "animation job");
  animationAllowedFields(job, ["schema", "id", "motionGraph", "deterministic", "mechanism", "skin", "renderer", "lifecycle", "budgets"], "animation job");
  if (job.schema !== ANIMATION_JOB_SCHEMA) fail(`animation job schema must be ${ANIMATION_JOB_SCHEMA}`);
  animationText(job.id, "animation job.id");
  validateMotionGraph(job.motionGraph);
  validateDeterministicInputs(job.deterministic);
  animationPlainObject(job.mechanism, "animation job.mechanism");
  animationAllowedFields(job.mechanism, ["purpose", "subject", "channels", "parameters"], "animation job.mechanism");
  animationText(job.mechanism.purpose, "animation job.mechanism.purpose");
  animationText(job.mechanism.subject, "animation job.mechanism.subject");
  if (job.mechanism.channels !== undefined && (!Array.isArray(job.mechanism.channels) || !job.mechanism.channels.every((channel) => isNonEmptyString(channel)))) fail("animation job.mechanism.channels must be string array");
  if (job.mechanism.parameters !== undefined) animationPlainObject(job.mechanism.parameters, "animation job.mechanism.parameters");
  animationPlainObject(job.skin, "animation job.skin");
  animationPlainObject(job.renderer, "animation job.renderer");
  animationAllowedFields(job.renderer, ["kind", "adapterId"], "animation job.renderer");
  if (!ANIMATION_RENDERERS.has(job.renderer.kind)) fail("animation job.renderer.kind is unsupported");
  if (job.renderer.adapterId !== undefined) animationText(job.renderer.adapterId, "animation job.renderer.adapterId");
  if (job.renderer.kind !== job.lifecycle.renderer) fail("animation job renderer kind does not match lifecycle adapter renderer");
  if (job.renderer.adapterId !== undefined && job.renderer.adapterId !== job.lifecycle.id) fail("animation job renderer adapterId does not match lifecycle adapter id");
  validateLifecycleAdapter(job.lifecycle);
  validatePerformanceBudgets(job.budgets);
  return job;
}

function normalizeAnimationJob(input) {
  animationPlainObject(input, "animation job");
  const job = { ...input };
  if (job.motionGraph === undefined && job.graph !== undefined) job.motionGraph = job.graph;
  if (job.budgets === undefined && job.performance && job.performance.budgets) job.budgets = job.performance.budgets;
  if (typeof job.renderer === "string") job.renderer = { kind: job.renderer };
  delete job.lifecycleAdapter;
  delete job.adapter;
  return job;
}

function animationEase(name, progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (name === "ease-in") return p * p;
  if (name === "ease-out") return 1 - (1 - p) * (1 - p);
  if (name === "ease-in-out") return p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2;
  return p;
}

function animationInterpolate(from, to, progress) {
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * progress;
  if (Array.isArray(from) && Array.isArray(to) && from.length === to.length && from.every((value, index) => typeof value === "number" && typeof to[index] === "number")) {
    return from.map((value, index) => value + (to[index] - value) * progress);
  }
  return progress < 1 ? from : to;
}

function sampleMotionGraph(graph, authoredTimeMs, options = {}) {
  validateMotionGraph(graph);
  animationFinite(authoredTimeMs, "authoredTimeMs", { min: 0 });
  if (!options || typeof options !== "object" || Array.isArray(options)) fail("sample options must be an object");
  animationAllowedFields(options, ["reducedMotion"], "sample options");
  if (options.reducedMotion !== undefined && typeof options.reducedMotion !== "boolean") fail("sample options.reducedMotion must be boolean");
  const reducedMotion = options.reducedMotion === true;
  const requestedTimeMs = Math.min(graph.durationMs, authoredTimeMs);
  const renderTimeMs = reducedMotion ? graph.durationMs : requestedTimeMs;
  const values = {};
  for (const track of graph.tracks) {
    const progress = track.durationMs === 0 ? (renderTimeMs >= track.startMs ? 1 : 0) : (renderTimeMs - track.startMs) / track.durationMs;
    values[track.id] = animationInterpolate(track.from, track.to, animationEase(track.ease, progress));
  }
  return { graphId: graph.id, timeMs: requestedTimeMs, authoredTimeMs: requestedTimeMs, renderTimeMs, values, settled: requestedTimeMs >= graph.durationMs, reducedMotion, resting: reducedMotion };
}

function createLifecycleAdapter(definition) {
  animationPlainObject(definition, "lifecycle adapter definition");
  const handlers = definition.handlers || definition.operations || definition;
  const callbacks = {};
  for (const operation of LIFECYCLE_OPERATIONS) {
    if (typeof handlers[operation] !== "function") fail(`lifecycle adapter requires callable ${operation}`);
    callbacks[operation] = handlers[operation];
  }
  const contract = {
    schema: definition.schema || LIFECYCLE_ADAPTER_SCHEMA,
    id: definition.id,
    renderer: definition.renderer,
    operations: Object.fromEntries(LIFECYCLE_OPERATIONS.map((operation) => [operation, true])),
    ownership: definition.ownership,
    containment: definition.containment,
    cleanup: definition.cleanup,
  };
  validateLifecycleAdapter(contract);
  let disposed = false;
  let initialized = false;
  const resources = new Map(contract.ownership.resources.map((resource) => [resource.id, { ...resource, released: false }]));
  const api = {
    contract,
    init(...args) { if (disposed) fail("lifecycle adapter is disposed"); initialized = true; return callbacks.init(...args); },
    resize(...args) { if (disposed) fail("lifecycle adapter is disposed"); return callbacks.resize(...args); },
    update(...args) { if (disposed) fail("lifecycle adapter is disposed"); return callbacks.update(...args); },
    render(...args) { if (disposed) fail("lifecycle adapter is disposed"); return callbacks.render(...args); },
    dispose(...args) { if (disposed) return; callbacks.dispose(...args); disposed = true; for (const resource of resources.values()) resource.released = true; },
    releaseResource(id) { const resource = resources.get(id); if (!resource) fail(`unknown lifecycle resource: ${id}`); resource.released = true; },
    cleanupStatus() { return { initialized, disposed, resources: [...resources.values()].map((resource) => ({ id: resource.id, released: resource.released })) }; },
  };
  return api;
}

function createAnimationJob(input) {
  const normalized = normalizeAnimationJob(input);
  validateAnimationJob(normalized);
  const adapter = input.lifecycleAdapter || input.adapter || null;
  if (adapter) {
    const adapterContract = adapter.contract || adapter;
    if (normalized.lifecycle.id !== adapterContract.id) fail("animation job lifecycle ownership does not match runtime lifecycle adapter");
    if (normalized.renderer.kind !== adapterContract.renderer) fail("animation job renderer kind does not match runtime lifecycle adapter");
    if (normalized.renderer.adapterId !== undefined && normalized.renderer.adapterId !== adapterContract.id) fail("animation job renderer adapterId does not match runtime lifecycle adapter");
  }
  if (adapter) validateLifecycleAdapter(adapter);
  let disposed = false;
  let initialized = false;
  let currentTimeMs = 0;
  const callAdapter = (operation, value) => {
    if (!adapter) return;
    if (typeof adapter[operation] !== "function") fail(`lifecycle adapter operation ${operation} is unavailable`);
    return adapter[operation](value);
  };
  const state = () => ({ jobId: normalized.id, timeMs: currentTimeMs, phase: disposed ? "disposed" : currentTimeMs >= normalized.motionGraph.durationMs ? "settled" : "active", initialized, disposed });
  const init = () => { if (disposed) fail("animation job is disposed"); if (!initialized) { callAdapter("init", { jobId: normalized.id, deterministic: normalized.deterministic }); initialized = true; } return state(); };
  const sample = (timeMs = currentTimeMs) => { if (disposed) fail("animation job is disposed"); return { ...sampleMotionGraph(normalized.motionGraph, timeMs, { reducedMotion: normalized.deterministic.reducedMotion }), deterministic: normalized.deterministic }; };
  const seek = (timeMs) => { const frame = sample(timeMs); currentTimeMs = frame.timeMs; callAdapter("update", frame); callAdapter("render", frame); return frame; };
  const settle = () => seek(normalized.motionGraph.durationMs);
  const reset = () => seek(0);
  const dispose = () => { if (disposed) return state(); if (!initialized) init(); callAdapter("dispose"); disposed = true; return state(); };
  init();
  return {
    contract: normalized,
    init,
    sample,
    seek,
    settle,
    reset,
    dispose,
    state,
    cleanup: () => adapter && typeof adapter.cleanupStatus === "function" ? adapter.cleanupStatus() : { initialized, disposed },
  };
}
module.exports = {
  MOTION_FOUNDATION_SCHEMA,
  MOTION_FOUNDATION_SECTIONS,
  MOTION_POSTURES,
  MOTION_PRIMITIVE_REGISTRY,
  checkMotionFoundation,
  validateMotionFoundationModel,
  validateMotionFoundationText,
  ANIMATION_JOB_SCHEMA,
  MOTION_GRAPH_SCHEMA,
  LIFECYCLE_ADAPTER_SCHEMA,
  ANIMATION_RENDERERS,
  MOTION_EASINGS,
  LIFECYCLE_OPERATIONS,
  validateAnimationJob,
  normalizeAnimationJob,
  validateMotionGraph,
  sampleMotionGraph,
  validateLifecycleAdapter,
  createLifecycleAdapter,
  validatePerformanceBudgets,
  validateDeterministicInputs,
  createAnimationJob,
};
