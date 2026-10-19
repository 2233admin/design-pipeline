"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { cliCommand, shellPath } = require("./workflows/shared.cjs");

const CHANGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARTIFACT_ROOTS = [
  ["openspec", "changes"],
  [".openspec", "changes"],
  ["spec", "changes"],
  ["docs", "design"],
  ["design", "changes"],
];
const BUDGET_THRESHOLDS = {
  small: 8,
  session: 24,
  program: 60,
};
const HANDOFF_START = "<!-- DESIGN-PIPELINE:DESIGN-SYNTHESIS:START -->";
const HANDOFF_END = "<!-- DESIGN-PIPELINE:DESIGN-SYNTHESIS:END -->";
const DESIGN_FOUNDATION_SECTIONS = [
  ["product context"],
  ["overview", "brand & style"],
  ["colors"],
  ["typography"],
  ["layout", "layout & spacing"],
  ["components"],
  ["do's and don'ts", "dos and don'ts"],
  ["source decisions", "evidence and adaptation"],
];

function fail(message) {
  throw new Error(message);
}

function nowIso() {
  const override = process.env.DESIGN_PIPELINE_NOW;
  if (!override) return new Date().toISOString();
  const parsed = new Date(override);
  if (Number.isNaN(parsed.getTime())) fail("DESIGN_PIPELINE_NOW must be a valid date-time");
  return parsed.toISOString();
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateChangeId(value) {
  if (!isNonEmptyString(value)) fail("--change-id is required");
  if (!CHANGE_ID_PATTERN.test(value) || value.length > 80) {
    fail("change id must be lowercase hyphen-case and at most 80 characters");
  }
  return value;
}

function validateProblem(value) {
  if (!isNonEmptyString(value)) fail("--problem is required");
  const problem = value.trim();
  if (problem.length > 4000) fail("--problem must be at most 4000 characters");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(problem)) {
    fail("--problem contains unsupported control characters");
  }
  return problem;
}

function normalizeHttpUrl(raw, label = "URL") {
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(`invalid ${label}: ${raw}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    fail(`${label} must use http or https`);
  }
  if (url.username || url.password) fail(`${label} must not contain credentials`);
  url.hash = "";
  return url.toString();
}

function normalizeTemplateLocator(raw) {
  if (!isNonEmptyString(raw)) fail("--template requires a non-empty value");
  const locator = raw.trim();
  if (locator.length > 300) fail("--template must be at most 300 characters");
  if (/[\u0000-\u001F]/.test(locator)) fail("--template contains control characters");
  if (/^https?:/i.test(locator)) return normalizeHttpUrl(locator, "template URL");
  return locator;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 62);
}

function stableId(value, fallback, usedIds) {
  const base = slugify(value) || fallback;
  let id = base;
  if (usedIds.has(id)) {
    const suffix = crypto.createHash("sha256").update(value).digest("hex").slice(0, 8);
    id = `${base.slice(0, 63)}-${suffix}`;
  }
  let counter = 1;
  const suffixed = id;
  while (usedIds.has(id)) {
    id = `${suffixed.slice(0, 63)}-${counter}`;
    counter += 1;
  }
  usedIds.add(id);
  return id;
}

function resolveProjectRoot(raw) {
  const root = path.resolve(raw || process.cwd());
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    fail(`project root does not exist: ${root}`);
  }
  return fs.realpathSync(root);
}

function findArtifactRoot(projectRoot) {
  for (const parts of ARTIFACT_ROOTS) {
    const candidate = path.join(projectRoot, ...parts);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      const realCandidate = fs.realpathSync(candidate);
      if (!pathIsInside(projectRoot, realCandidate)) {
        fail(`artifact root resolves outside the project: ${candidate}`);
      }
      return realCandidate;
    }
  }
  const fallback = path.join(projectRoot, "design", "changes");
  let existingAncestor = fallback;
  while (!fs.existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) fail(`cannot resolve artifact root parent: ${fallback}`);
    existingAncestor = parent;
  }
  if (!pathIsInside(projectRoot, fs.realpathSync(existingAncestor))) {
    fail(`artifact root resolves outside the project: ${fallback}`);
  }
  return fallback;
}

function slash(value) {
  return value.replaceAll("\\", "/");
}

function relativePath(from, to) {
  return slash(path.relative(from, to)) || ".";
}

function pathIsInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function resolveOutputPath(projectRoot, raw, flagName = "--output") {
  if (!isNonEmptyString(raw)) fail(`${flagName} requires a path`);
  if (path.isAbsolute(raw)) fail(`${flagName} must be project-relative`);
  const output = path.resolve(projectRoot, raw);
  if (!pathIsInside(projectRoot, output)) {
    fail(`${flagName} must stay inside the project root`);
  }
  return {
    absolute: output,
    relative: relativePath(projectRoot, output),
  };
}

function normalizeTrackerUrl(raw) {
  const normalized = normalizeHttpUrl(raw, "Wayfinder map URL");
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname;
  if (url.search) fail("Wayfinder map URL must not contain a query string");
  if (url.port) fail("Wayfinder map URL must not contain a custom port");
  const supported =
    (host === "github.com" &&
      (
        /^\/[^/]+\/[^/]+\/issues\/[1-9]\d*\/?$/.test(pathname) ||
        /^\/(?:orgs|users)\/[^/]+\/projects\/[1-9]\d*\/?$/.test(pathname)
      )) ||
    (host === "gitlab.com" &&
      /^\/[^/]+(?:\/[^/]+)+\/-\/issues\/[1-9]\d*\/?$/.test(pathname)) ||
    (host === "linear.app" &&
      /^\/[^/]+\/issue\/[A-Z][A-Z0-9]+-[1-9]\d*(?:\/[^/]+)?\/?$/.test(pathname)) ||
    (host.endsWith(".atlassian.net") &&
      /^\/browse\/[A-Z][A-Z0-9]+-[1-9]\d*\/?$/.test(pathname));
  if (!supported) {
    fail(
      "Wayfinder map URL must be a supported issue-tracker URL (GitHub Issues/Projects, GitLab Issues, Linear, or Jira)",
    );
  }
  return normalized;
}

function resolveExistingFileInside(root, raw, label) {
  if (!isNonEmptyString(raw) || path.isAbsolute(raw)) {
    fail(`${label} must be a relative file path`);
  }
  const realRoot = fs.realpathSync(root);
  const candidate = path.resolve(realRoot, raw);
  if (!pathIsInside(realRoot, candidate)) fail(`${label} must stay inside ${realRoot}`);
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    fail(`${label} does not exist or is not a file: ${raw}`);
  }
  const realFile = fs.realpathSync(candidate);
  if (!pathIsInside(realRoot, realFile)) fail(`${label} resolves outside ${realRoot}`);
  return {
    absolute: realFile,
    relative: relativePath(realRoot, realFile),
  };
}

function readJson(file, label = file) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${label} is invalid JSON: ${error.message}`);
  }
  if (!isObject(parsed)) fail(`${label} must contain a JSON object`);
  return parsed;
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  fs.writeFileSync(file, normalized, "utf8");
}

function writeJson(file, value) {
  writeFile(file, JSON.stringify(value, null, 2));
}

function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) writeFile(file, content);
}

function appendEvent(eventsPath, event) {
  const line = JSON.stringify(event);
  if (!fs.existsSync(eventsPath)) {
    writeFile(eventsPath, line);
    return;
  }
  const current = fs.readFileSync(eventsPath, "utf8");
  const separator = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  fs.appendFileSync(eventsPath, `${separator}${line}\n`, "utf8");
}

function mergeUnique(existing, additions) {
  return [...new Set([...(Array.isArray(existing) ? existing : []), ...additions])];
}

function replaceMarkedSection(existing, section) {
  const start = existing.indexOf(HANDOFF_START);
  const end = existing.indexOf(HANDOFF_END);
  if (start === -1 && end === -1) {
    return `${existing.trimEnd()}\n\n${section.trim()}\n`;
  }
  if (start === -1 || end === -1 || end < start) {
    fail("handoff.md contains a damaged design-synthesis marker block");
  }
  const after = end + HANDOFF_END.length;
  return `${existing.slice(0, start)}${section.trim()}${existing.slice(after)}`.trimEnd() + "\n";
}

function updateHandoff(file, section) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "# Handoff\n";
  writeFile(file, replaceMarkedSection(existing, section));
}

function validateManifest(manifest) {
  if (manifest.schema !== "design-pipeline.design-synthesis.v1") {
    fail("design-synthesis.json has an unsupported schema");
  }
  validateChangeId(manifest.changeId);
  if (!isNonEmptyString(manifest.artifactRoot) || !isNonEmptyString(manifest.projectRoot)) {
    fail("design-synthesis.json has invalid root paths");
  }
  if (!isObject(manifest.inputs) || !Array.isArray(manifest.inputs.references) || !Array.isArray(manifest.inputs.templates)) {
    fail("design-synthesis.json has invalid inputs");
  }
  if (!isObject(manifest.scope) || !Object.hasOwn(BUDGET_THRESHOLDS, manifest.scope.budget)) {
    fail("design-synthesis.json has an invalid scope budget");
  }
  if (!isObject(manifest.wayfinder) || !isObject(manifest.output) || !Array.isArray(manifest.evidence)) {
    fail("design-synthesis.json is missing state contracts");
  }
  return manifest;
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizedHeading(value) {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function validateDesignFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail("DESIGN.md must start with YAML frontmatter");
  const name = match[1].match(/^name:\s*(?:"([^"]+)"|'([^']+)'|([^#\r\n][^\r\n]*))$/m);
  if (!name) {
    fail("DESIGN.md frontmatter must contain a non-empty name");
  }
  return (name[1] || name[2] || name[3]).trim();
}

function validateDesignSections(text) {
  const headings = [...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) =>
    normalizedHeading(match[1]),
  );
  const missing = DESIGN_FOUNDATION_SECTIONS
    .filter((aliases) => !aliases.some((heading) => headings.includes(heading)))
    .map((aliases) => aliases[0]);
  if (missing.length) fail(`DESIGN.md is missing required sections: ${missing.join(", ")}`);
}

function validateSourceDecisions(text) {
  const heading = text.match(/^##\s+(?:source decisions|evidence and adaptation)\s*$/im);
  const remaining = text.slice(heading.index + heading[0].length);
  const nextHeading = remaining.match(/^##\s+/m);
  const section = nextHeading ? remaining.slice(0, nextHeading.index) : remaining;
  if (!/(?:\badopted\b|采纳|采用)/i.test(section) || !/(?:\brejected\b|拒绝|未采用)/i.test(section)) {
    fail("DESIGN.md Source Decisions must identify adopted and rejected source properties");
  }
}

// --- brand facts first (OpenSpec change brand-facts-first) -------------------------------------------
// Triggered only when Product Context declares `Real brands: <names>` (`none`, or no line: the project's
// own made-up brand, never blocked). Declared brands owe a sourced facts file, one real logo file and a
// sourced brand colour line each in Source Decisions. Findings are `{code, severity, message, fix}`.

const BRAND_LINE = /^\s*(?:[-*]\s*)?(?:\*\*)?(?:real brands?|真实品牌)(?:\*\*)?\s*[:：]\s*(.+?)\s*$/im;
const FACTS_LINE = /^\s*(?:[-*]\s*)?(?:\*\*)?(?:brand facts|品牌事实)(?:\*\*)?\s*[:：]\s*`?([^`\s]+)`?\s*$/im;
const LOGO_LINE = /^\s*(?:[-*]\s*)?(?:\*\*)?(?:logo|标志)\b/i;
const COLOUR_LINE = /^\s*(?:[-*]\s*)?(?:\*\*)?(?:brand colou?rs?|品牌色)\b/i;
const NO_BRAND = /^(?:none|n\/a|无|没有)\.?$/i;
const OWNER_SOURCE = /\bowner\b|所有者|用户提供/i;
const TEXT_ASSET = /\.(?:svg|css|html?|json|txt|md)$/i;
const LOGO_FILE = /\.(?:svg|png|webp|jpe?g)$/i;

function sectionText(text, aliases) {
  const headings = [...text.matchAll(/^##\s+(.+?)\s*$/gm)];
  const at = headings.findIndex((match) => aliases.includes(normalizedHeading(match[1])));
  if (at < 0) return "";
  const start = headings[at].index + headings[at][0].length;
  return text.slice(start, headings[at + 1] ? headings[at + 1].index : text.length);
}

// Project files a line cites: tokens that resolve to an existing file inside the project.
function citedFiles(line, projectRoot) {
  return line.split(/[\s()（）,，;；`]+/).filter((token) => /[./]/.test(token) && !/^https?:/i.test(token)).map((token) => {
    const absolute = path.resolve(projectRoot, token);
    return pathIsInside(projectRoot, absolute) && fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? absolute : null;
  }).filter(Boolean);
}

const hasUrl = (line) => /https?:\/\/[^\s)]+/i.test(line);
const hasSource = (line) => hasUrl(line) || OWNER_SOURCE.test(line);

function brandFactFindings(text, projectRoot) {
  const context = sectionText(text, ["product context"]);
  const declared = (context.match(BRAND_LINE) || [])[1];
  if (!declared || NO_BRAND.test(declared.trim())) return [];
  const brands = declared.split(/[,，、;；]/).map((name) => name.trim()).filter(Boolean);
  const out = [];
  const add = (code, message, fix) => out.push({ code, severity: "error", message, fix });
  const protocol = "ask the owner for the asset, else find the official brand or press page and download the file into the project; never fill a value in from memory";

  // The facts file: every fact carries its source and every brand has a fact.
  const factsRel = (context.match(FACTS_LINE) || [])[1];
  const factsFile = factsRel ? path.resolve(projectRoot, factsRel) : null;
  if (!factsFile || !pathIsInside(projectRoot, factsFile) || !fs.existsSync(factsFile) || !fs.statSync(factsFile).isFile()) {
    add("brand-facts-missing", `Product Context declares real brands (${brands.join(", ")}) but its Brand facts line does not name an existing file${factsRel ? ` (${factsRel})` : ""}.`,
      "Verify each brand and product (official site, release information) into a facts file in the change directory, one `- <fact> (source: <https url>)` line per fact, and add `Brand facts: <path>` under Product Context.");
  } else {
    const facts = fs.readFileSync(factsFile, "utf8").split(/\r?\n/).filter((line) => /^\s*[-*]\s+/.test(line));
    for (const line of facts.filter((item) => !hasSource(item))) {
      add("brand-fact-unsourced", `Fact without a source in ${factsRel}: "${line.trim().slice(0, 80)}".`, "Add the official page it came from as `(source: <https url>)`, or `(source: owner)` if the owner stated it, or delete the fact.");
    }
    for (const brand of brands.filter((name) => !facts.some((line) => line.toLowerCase().includes(name.toLowerCase())))) {
      add("brand-facts-uncovered", `${factsRel} holds no fact about ${brand}.`, `Verify ${brand} (whether the product exists, which release, its specs) from its official site and record the facts with sources.`);
    }
  }

  // The brand spec in Source Decisions: one real logo and a sourced colour line per brand.
  const lines = sectionText(text, ["source decisions", "evidence and adaptation"]).split(/\r?\n/);
  for (const brand of brands) {
    const mine = (pattern) => lines.filter((line) => pattern.test(line) && line.toLowerCase().includes(brand.toLowerCase()));
    const logos = mine(LOGO_LINE);
    if (!logos.length) {
      add("brand-logo-missing", `Source Decisions has no Logo line for ${brand}.`, `Get the official logo (${protocol}), then add \`Logo - ${brand}: <project file> (source: <https url>)\`. If no official logo can be found, stop and ask the owner; do not draw one.`);
    }
    if (logos.length > 1) {
      add("brand-logo-multiple", `Source Decisions lists ${logos.length} logos for ${brand}.`, `Keep one official logo per product on the page: delete all but one Logo line for ${brand}.`);
    }
    for (const line of logos) {
      if (!citedFiles(line, projectRoot).some((file) => LOGO_FILE.test(file))) {
        add("brand-logo-file-missing", `The ${brand} Logo line names no existing logo file (svg, png, webp or jpg) inside the project.`, "Download the official logo into the project and name its path on the line; the page references that file and never redraws the mark.");
      }
      if (!hasSource(line)) add("brand-logo-unsourced", `The ${brand} Logo line has no source.`, "Add `(source: <official https url>)`, or `(source: owner)` if the owner supplied the file.");
    }
    const colours = mine(COLOUR_LINE);
    if (!colours.length) {
      add("brand-colour-missing", `Source Decisions has no Brand colour line for ${brand}.`, `Take the colours from the official assets (${protocol}) and add \`Brand colour - ${brand}: #RRGGBB (source: <https url or downloaded file>)\`, or \`Brand colour - ${brand}: none\` if the page uses none of its colours.`);
    }
    for (const line of colours) {
      const hexes = line.match(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/gi) || [];
      if (!hexes.length) {
        if (!/\bnone\b|无/i.test(line)) add("brand-colour-unsourced", `The ${brand} Brand colour line holds no colour value and does not say none.`, "Write the hex values taken from the official assets, or `none`.");
        continue;
      }
      if (hasSource(line)) continue;
      const cited = citedFiles(line, projectRoot);
      if (!cited.length) {
        add("brand-colour-unsourced", `The ${brand} Brand colour line gives ${hexes.join(", ")} with no source.`, "Add `(source: <official https url or downloaded asset file>)`; never keep a colour recalled from memory.");
        continue;
      }
      // A cited text asset (svg, css, html) must hold the value; a binary image cannot be searched.
      const body = cited.filter((file) => TEXT_ASSET.test(file)).map((file) => fs.readFileSync(file, "utf8").toLowerCase()).join("\n");
      if (body) {
        for (const hex of hexes.filter((value) => !body.includes(value.toLowerCase()))) {
          add("brand-colour-not-in-source", `${hex} does not appear in the asset the ${brand} Brand colour line cites.`, "Read the value from the cited asset (grep its hex codes) and correct the line, or cite the asset that holds it.");
        }
      }
    }
  }
  return out;
}

function validateBrandFacts(text, projectRoot) {
  const findings = brandFactFindings(text, projectRoot);
  if (findings.length) fail(`DESIGN.md brand facts are unverified: ${findings.map((item) => `${item.message} Fix: ${item.fix}`).join(" ")}`);
}

function validateActiveChange(text, activeChangeId) {
  if (!activeChangeId) return;
  const escaped = activeChangeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(escaped, "i").test(text)) {
    fail("DESIGN.md must link or name the active synthesis change");
  }
}

function validateDesignFoundationText(text, options = {}) {
  if (!isNonEmptyString(text)) fail("DESIGN.md must not be empty");
  const name = validateDesignFrontmatter(text);
  validateDesignSections(text);
  validateSourceDecisions(text);
  validateActiveChange(text, options.activeChangeId);
  return {
    name,
    sha256: sha256Text(text),
  };
}

function checkDesignFoundation(options = {}) {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const designFile = resolveOutputPath(
    projectRoot,
    options.designFile || "DESIGN.md",
    "--design-file",
  );
  if (!fs.existsSync(designFile.absolute)) {
    return {
      schema: "design-pipeline.foundation-check.v1",
      status: "synthesis-required",
      projectRoot,
      designFile: designFile.relative,
      nextCommand:
        `${cliCommand(path.resolve(__dirname, "init-design-synthesis.cjs"))} --change-id <change-id> --problem "<problem>" --project-root ${shellPath(projectRoot)} --output ${shellPath(designFile.relative)}`,
    };
  }
  if (!fs.statSync(designFile.absolute).isFile()) fail("--design-file must identify a file");
  const realFile = fs.realpathSync(designFile.absolute);
  if (!pathIsInside(projectRoot, realFile)) {
    fail("--design-file resolves outside --project-root");
  }
  const designText = fs.readFileSync(realFile, "utf8");
  const validated = validateDesignFoundationText(designText);
  validateBrandFacts(designText, projectRoot);
  return {
    schema: "design-pipeline.foundation-check.v1",
    status: "ready",
    projectRoot,
    designFile: designFile.relative,
    name: validated.name,
    sha256: validated.sha256,
  };
}

module.exports = {
  BUDGET_THRESHOLDS,
  CHANGE_ID_PATTERN,
  DESIGN_FOUNDATION_SECTIONS,
  HANDOFF_END,
  HANDOFF_START,
  appendEvent,
  brandFactFindings,
  checkDesignFoundation,
  fail,
  findArtifactRoot,
  isNonEmptyString,
  isObject,
  mergeUnique,
  normalizeHttpUrl,
  normalizeTrackerUrl,
  normalizeTemplateLocator,
  nowIso,
  pathIsInside,
  readJson,
  relativePath,
  resolveExistingFileInside,
  resolveOutputPath,
  resolveProjectRoot,
  sha256Text,
  slash,
  stableId,
  updateHandoff,
  validateChangeId,
  validateDesignFoundationText,
  validateManifest,
  validateProblem,
  writeFile,
  writeIfMissing,
  writeJson,
};
