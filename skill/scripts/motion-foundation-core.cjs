"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MOTION_FOUNDATION_SCHEMA = "design-pipeline.motion-foundation.v0.1";
const MOTION_PRIMITIVE_REGISTRY = "design-pipeline.motion-primitives.v1";
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

module.exports = {
  MOTION_FOUNDATION_SCHEMA,
  MOTION_FOUNDATION_SECTIONS,
  MOTION_POSTURES,
  MOTION_PRIMITIVE_REGISTRY,
  checkMotionFoundation,
  validateMotionFoundationModel,
  validateMotionFoundationText,
};
