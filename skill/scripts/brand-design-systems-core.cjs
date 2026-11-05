"use strict";

// The brand design-system catalog: design systems "inspired by" real products and styles, each with
// DESIGN.md prose, a tokens.css in one shared semantic-token schema, a component fixture and a token
// report. The package carries the manifest (index, provenance, per-file size, Git blob id and
// SHA-256) and the licence texts; `sources fetch --bundle brand-design-systems` downloads the
// systems at the pinned revisions (skill/scripts/vendor-cache.cjs). `designmd search` and
// `designmd inspect` read them through this module.
//
// Every system is inspiration-only, like the dimabraven/design-md examples: an agent studies it and
// synthesises a product DESIGN.md; it never installs one as the product's system. The normalised
// front matter (Google DESIGN.md token groups) is derived here from tokens.css, with a recorded
// correction overlay applied, so systems can be compared token by token.

const fs = require("node:fs");
const path = require("node:path");
const { partialBundles, upstreamRoot } = require("./vendor-cache.cjs");
const { verifyTree } = require("./design-direction-library-core.cjs");

const schema = "design-pipeline.brand-design-systems-source.v1";
const verificationSchema = "design-pipeline.brand-design-systems-verification.v1";
const KIND = "design-system";
const ID_PREFIX = `design-md:${KIND}:`;
const SYSTEM_FILES = new Set(["manifest.json", "DESIGN.md", "USAGE.md", "tokens.css", "components.html", "source/token-contract.report.json"]);
const CORRECTION_FILES = new Set(["tokens.override.css", "DESIGN.sections.md"]);

function invalid(message, code = "INVALID_BRAND_DESIGN_SYSTEMS") {
  throw Object.assign(new Error(`brand design systems: ${message}`), { code });
}

function safeRelative(value, label) {
  if (typeof value !== "string" || !value || path.isAbsolute(value) || value.split(/[\\/]/).includes("..") || value.includes("\\")) invalid(`${label} must be a safe relative path`);
  return value;
}

// The packaged manifest under a skill root's vendor folder, or null.
function findManifest(skillRoot = path.resolve(__dirname, "..")) {
  return partialBundles(path.join(skillRoot, "vendor")).find((found) => found.schema === schema)?.manifestFile || null;
}

function checkTree(tree, label) {
  if (!tree || typeof tree !== "object") invalid(`${label} is missing`);
  safeRelative(tree.root, `${label}.root`);
  if (!Number.isInteger(tree.fileCount) || !Array.isArray(tree.objects) || tree.objects.length !== tree.fileCount) invalid(`${label}.objects does not match ${label}.fileCount`);
  if (!/^[a-f0-9]{64}$/.test(tree.treeSha256 || "")) invalid(`${label}.treeSha256 is invalid`);
  for (const [index, object] of tree.objects.entries()) {
    safeRelative(object.path, `${label}.objects[${index}].path`);
    if (!["100644", "100755"].includes(object.mode)) invalid(`${label}.objects[${index}].mode is invalid`);
    if (!/^[a-f0-9]{40}$/.test(object.oid || "")) invalid(`${label}.objects[${index}].oid is invalid`);
    if (!/^[a-f0-9]{64}$/.test(object.sha256 || "")) invalid(`${label}.objects[${index}].sha256 is invalid`);
    if (!Number.isInteger(object.size) || object.size < 0) invalid(`${label}.objects[${index}].size is invalid`);
  }
}

function loadManifest(manifestFile = findManifest()) {
  if (!manifestFile) invalid("manifest not found; reinstall the package");
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { invalid(`cannot read manifest: ${error.message}`); }
  if (manifest?.schema !== schema) invalid("unsupported manifest schema");
  if (!/^[a-z][a-z0-9-]*$/.test(manifest.bundle || "")) invalid("bundle id is invalid");
  if (!Array.isArray(manifest.packs) || !manifest.packs.length) invalid("packs must be a non-empty array");
  const packs = new Set();
  for (const pack of manifest.packs) {
    if (!/^[a-z][a-z0-9-]*$/.test(pack.id || "") || packs.has(pack.id)) invalid(`pack id ${pack.id} is invalid or duplicated`);
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(pack.repository || "")) invalid(`pack ${pack.id} repository is invalid`);
    if (!/^[a-f0-9]{40}$/.test(pack.revision || "") || !/^[a-f0-9]{40}$/.test(pack.gitTree || "")) invalid(`pack ${pack.id} revision or Git tree is invalid`);
    if (typeof pack.license !== "string" || !pack.license) invalid(`pack ${pack.id} license is missing`);
    packs.add(pack.id);
  }
  checkTree(manifest.snapshot, "snapshot");
  checkTree(manifest.fetched, "fetched");
  for (const object of [...manifest.snapshot.objects, ...manifest.fetched.objects]) {
    if (!packs.has(object.path.split("/")[0])) invalid(`object ${object.path} belongs to no recorded pack`);
  }
  if (manifest.boundary?.admission !== "reference-only" || manifest.boundary?.productDesignMd !== false) invalid("boundary must keep every system reference-only");
  const fetchedPaths = new Set(manifest.fetched.objects.map((object) => object.path));
  if (!Array.isArray(manifest.systems) || !manifest.systems.length) invalid("systems must be a non-empty array");
  const ids = new Set();
  for (const [index, system] of manifest.systems.entries()) {
    for (const key of ["id", "name", "category", "description", "pack", "dir"]) {
      if (typeof system[key] !== "string" || !system[key]) invalid(`systems[${index}].${key} is invalid`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(system.id) || ids.has(system.id)) invalid(`systems[${index}].id is invalid or duplicated`);
    ids.add(system.id);
    if (!packs.has(system.pack) || !system.dir.startsWith(`${system.pack}/`)) invalid(`systems[${index}] pack and dir disagree`);
    safeRelative(system.dir, `systems[${index}].dir`);
    if (!Array.isArray(system.files) || !["manifest.json", "DESIGN.md", "tokens.css"].every((file) => system.files.includes(file))) invalid(`systems[${index}] needs manifest.json, DESIGN.md and tokens.css`);
    for (const file of system.files) {
      if (!SYSTEM_FILES.has(file)) invalid(`systems[${index}] lists an unsupported file ${file}`);
      if (!fetchedPaths.has(`${system.dir}/${file}`)) invalid(`systems[${index}] file ${file} is not in the fetched inventory`);
    }
    if (system.corrections) {
      const { dir, files } = system.corrections;
      safeRelative(dir, `systems[${index}].corrections.dir`);
      if (!packs.has(dir.split("/")[0]) || !Array.isArray(files) || !files.length) invalid(`systems[${index}].corrections is invalid`);
      for (const file of files) {
        if (!CORRECTION_FILES.has(file) || !fetchedPaths.has(`${dir}/${file}`)) invalid(`systems[${index}].corrections file ${file} is not in the fetched inventory`);
      }
    }
  }
  return { manifest, manifestFile: path.resolve(manifestFile), root: path.dirname(path.resolve(manifestFile)) };
}

// status: "ready" (licences and fetched systems verified), "missing" (licences verified, systems
// not downloaded yet; `fetch` names the command), "blocked" (anything else, with `issues`).
function verifyBrandDesignSystems(manifestFile = findManifest(), options = {}) {
  let loaded;
  try { loaded = loadManifest(manifestFile); }
  catch (error) { return { schema: verificationSchema, status: "blocked", issues: [error.message] }; }
  const { manifest, root } = loaded;
  const issues = [];
  const shippedRoot = path.join(root, manifest.snapshot.root);
  if (!fs.existsSync(shippedRoot)) issues.push("shipped: root is missing");
  else issues.push(...verifyTree(shippedRoot, manifest.snapshot, "shipped"));
  const where = upstreamRoot(loaded.manifestFile, manifest, options);
  const fetched = { root: where.root, fileCount: manifest.fetched.fileCount, byteCount: manifest.fetched.byteCount, status: "ready" };
  if (!fs.existsSync(where.root)) fetched.status = "missing";
  else {
    const fetchedIssues = verifyTree(where.root, manifest.fetched, "fetched");
    if (fetchedIssues.length) fetched.status = "blocked";
    issues.push(...fetchedIssues);
  }
  const base = { schema: verificationSchema, bundle: manifest.bundle, systems: manifest.systems.length, packs: manifest.packs.map(({ id, revision }) => ({ id, revision })), fetched, issues };
  if (issues.length) return { ...base, status: "blocked", fetch: where.fetch };
  if (fetched.status === "missing") return { ...base, status: "missing", fetch: where.fetch, issues: [`design systems not downloaded yet; run ${where.fetch}`] };
  return { ...base, status: "ready" };
}

// ---- tokens.css -> Google DESIGN.md token groups ---------------------------------------------

// Declarations of the first top-level `:root { … }` block; comments removed, values trimmed.
function rootDeclarations(css) {
  const text = String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
  const start = text.search(/(^|[}\s;])\s*:root\s*\{/);
  if (start < 0) return new Map();
  const open = text.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < text.length; end += 1) {
    if (text[end] === "{") depth += 1;
    else if (text[end] === "}" && --depth === 0) break;
  }
  const declarations = new Map();
  for (const match of text.slice(open + 1, end).matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]*);/g)) {
    declarations.set(match[1].slice(2), match[2].replace(/\s+/g, " ").trim());
  }
  return declarations;
}

// A declaration's value with whole-value var() aliases followed; an undefined alias uses its
// fallback (`var(--x, fallback)`), as CSS does.
function resolveValue(declarations, name, seen = new Set()) {
  const value = declarations.get(name);
  if (value === undefined || seen.has(name)) return undefined;
  seen.add(name);
  return followAlias(declarations, value, seen);
}

function followAlias(declarations, value, seen = new Set()) {
  const alias = String(value).match(/^var\(\s*--([A-Za-z0-9_-]+)\s*(?:,\s*(.*))?\)$/);
  if (!alias) return value;
  const resolved = declarations.has(alias[1]) ? resolveValue(declarations, alias[1], seen) : undefined;
  if (resolved !== undefined) return resolved;
  return alias[2] !== undefined && alias[2].trim() ? followAlias(declarations, alias[2].trim(), seen) : undefined;
}

const hex2 = (number) => Math.round(Math.max(0, Math.min(255, number))).toString(16).padStart(2, "0");
const NAMED = { black: [0, 0, 0], white: [1, 1, 1] };

// sRGB <-> OKLab (Björn Ottosson's reference matrices), for oklch() values and color-mix(in oklab, …).
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map((channel) => Math.max(0, Math.min(1, fromLinear(channel))));
}

// Splits top-level comma-separated arguments.
function splitArguments(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of text) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) { parts.push(current.trim()); current = ""; } else current += character;
  }
  parts.push(current.trim());
  return parts;
}

// An opaque colour as [r, g, b] in 0..1 plus alpha, or null. Understands hex, rgb()/rgba(),
// oklch(), black/white, var() aliases and color-mix(in oklab|srgb, A [p%], B [q%]).
function parseColor(value, declarations, depth = 0) {
  if (typeof value !== "string" || depth > 8) return null;
  const text = value.trim().toLowerCase();
  if (NAMED[text]) return { rgb: NAMED[text], alpha: 1 };
  if (/^var\(/.test(text)) {
    const resolved = declarations ? followAlias(declarations, text) : undefined;
    return resolved === undefined || resolved === text ? null : parseColor(resolved, declarations, depth + 1);
  }
  let match = text.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (match) {
    const digits = match[1].length <= 4 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
    const byte = (offset) => Number.parseInt(digits.slice(offset, offset + 2), 16);
    return { rgb: [byte(0) / 255, byte(2) / 255, byte(4) / 255], alpha: digits.length === 8 ? byte(6) / 255 : 1 };
  }
  const alphaOf = (raw) => (raw === undefined ? 1 : raw.endsWith("%") ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw));
  match = text.match(/^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (match) {
    const channel = (raw) => (raw.endsWith("%") ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw) / 255);
    return { rgb: [channel(match[1]), channel(match[2]), channel(match[3])], alpha: alphaOf(match[4]) };
  }
  match = text.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/);
  if (match) {
    const L = match[1].endsWith("%") ? Number.parseFloat(match[1]) / 100 : Number.parseFloat(match[1]);
    const C = Number.parseFloat(match[2]);
    const hue = (Number.parseFloat(match[3]) * Math.PI) / 180;
    return { rgb: oklabToRgb([L, C * Math.cos(hue), C * Math.sin(hue)]), alpha: alphaOf(match[4]) };
  }
  match = text.match(/^color-mix\(\s*in\s+(oklab|srgb)\s*,(.*)\)$/);
  if (match) {
    const args = splitArguments(match[2]);
    if (args.length !== 2) return null;
    const parts = args.map((arg) => {
      const weighted = arg.match(/^(.*?)\s+([\d.]+)%$/);
      return { color: parseColor(weighted ? weighted[1] : arg, declarations, depth + 1), weight: weighted ? Number.parseFloat(weighted[2]) / 100 : null };
    });
    if (parts.some((part) => !part.color || part.color.alpha < 1)) return null;
    let [p1, p2] = parts.map((part) => part.weight);
    if (p1 === null && p2 === null) { p1 = 0.5; p2 = 0.5; }
    else if (p1 === null) p1 = 1 - p2;
    else if (p2 === null) p2 = 1 - p1;
    const total = p1 + p2;
    // Percentages summing under 100% make the mix translucent; that is not an opaque token colour.
    if (!(total > 0) || total < 0.9999) return null;
    const space = match[1] === "oklab" ? [rgbToOklab, oklabToRgb] : [(rgb) => rgb, (rgb) => rgb];
    const [a, b] = parts.map((part) => space[0](part.color.rgb));
    return { rgb: space[1](a.map((value, index) => (value * p1 + b[index] * p2) / total)), alpha: 1 };
  }
  return null;
}

// A colour value as lowercase hex (#rrggbb, or #rrggbbaa when translucent); null when unsupported.
function hexColor(value, declarations = null) {
  const color = parseColor(value, declarations);
  if (!color) return null;
  const rgb = `#${color.rgb.map((channel) => hex2(channel * 255)).join("")}`;
  return color.alpha >= 1 ? rgb : `${rgb}${hex2(color.alpha * 255)}`;
}

function firstFamily(stack) {
  if (typeof stack !== "string" || !stack) return null;
  const first = stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
  return first || null;
}

const DIMENSION = /^-?(?:\d+|\d*\.\d+)(?:px|rem|em)$/;
const NUMBER = /^(?:\d+|\d*\.\d+)$/;

// Google DESIGN.md colour names <- shared token-schema names.
const COLOR_NAMES = [
  ["primary", "accent"], ["on-primary", "accent-on"], ["primary-hover", "accent-hover"], ["primary-active", "accent-active"],
  ["background", "bg"], ["surface", "surface"], ["surface-warm", "surface-warm"],
  ["on-surface", "fg"], ["on-surface-variant", "fg-2"], ["muted", "muted"], ["meta", "meta"],
  ["outline", "border"], ["outline-variant", "border-soft"],
  ["success", "success"], ["warning", "warn"], ["error", "danger"],
];
const TYPE_STYLES = [
  ["display", "display", "text-4xl", "leading-tight", "tracking-display"],
  ["headline", "display", "text-2xl", "leading-tight", "tracking-display"],
  ["title", "display", "text-xl", "leading-tight", null],
  ["body-lg", "body", "text-lg", "leading-body", null],
  ["body", "body", "text-base", "leading-body", null],
  ["body-sm", "body", "text-sm", "leading-body", null],
  ["label", "body", "text-xs", "leading-body", null],
  ["code", "mono", "text-sm", "leading-body", null],
];
const ROUNDED_NAMES = [["xs", "radius-xs"], ["sm", "radius-sm"], ["md", "radius-md"], ["lg", "radius-lg"], ["xl", "radius-xl"], ["full", "radius-pill"]];

// Token groups from tokens.css with an optional correction overlay (`:root` declarations that win).
// Colours become hex (color-mix and oklch are computed); values that are neither a supported colour
// nor a plain dimension are listed in `omitted`.
function normalizeTokens(tokensCss, overrideCss = null) {
  const declarations = rootDeclarations(tokensCss);
  for (const [name, value] of rootDeclarations(overrideCss)) declarations.set(name, value);
  const omitted = [];
  const colors = {};
  for (const [name, token] of COLOR_NAMES) {
    if (!declarations.has(token)) continue;
    const color = hexColor(resolveValue(declarations, token), declarations);
    if (color) colors[name] = color;
    else omitted.push(`--${token}`);
  }
  const typography = {};
  for (const [name, family, size, leading, tracking] of TYPE_STYLES) {
    const fontFamily = firstFamily(resolveValue(declarations, `font-${family}`));
    const fontSize = resolveValue(declarations, size);
    if (!fontFamily || !DIMENSION.test(fontSize || "")) { if (declarations.has(size)) omitted.push(`--${size}`); continue; }
    const style = { fontFamily, fontSize };
    const lineHeight = resolveValue(declarations, leading);
    if (NUMBER.test(lineHeight || "") || DIMENSION.test(lineHeight || "")) style.lineHeight = lineHeight;
    const letterSpacing = tracking ? resolveValue(declarations, tracking) : undefined;
    if (DIMENSION.test(letterSpacing || "")) style.letterSpacing = letterSpacing;
    typography[name] = style;
  }
  const rounded = {};
  for (const [name, token] of ROUNDED_NAMES) {
    const value = resolveValue(declarations, token);
    if (value === undefined) continue;
    if (DIMENSION.test(value) || value === "0") rounded[name] = value === "0" ? "0px" : value;
    else omitted.push(`--${token}`);
  }
  const spacing = {};
  const spaceTokens = [...declarations.keys()].filter((name) => /^space-\d+$/.test(name)).sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  for (const token of spaceTokens) {
    const value = resolveValue(declarations, token);
    if (DIMENSION.test(value || "")) spacing[token] = value;
    else omitted.push(`--${token}`);
  }
  for (const [name, token] of [["section", "section-y-desktop"], ["container", "container-max"], ["gutter", "container-gutter-desktop"]]) {
    const value = resolveValue(declarations, token);
    if (DIMENSION.test(value || "")) spacing[name] = value;
  }
  return { colors, typography, rounded, spacing, omitted };
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function paletteSignature(tokens) {
  const { colors } = tokens;
  const mode = colors.background ? (luminance(colors.background) < 0.2 ? "dark" : "light") : "unknown";
  const parts = [mode];
  if (colors.primary) parts.push(`primary ${colors.primary}`);
  if (colors.background) parts.push(`background ${colors.background}`);
  if (colors["on-surface"]) parts.push(`text ${colors["on-surface"]}`);
  if (colors.surface && colors.surface !== colors.background) parts.push(`surface ${colors.surface}`);
  return {
    mode,
    primary: colors.primary || null,
    background: colors.background || null,
    text: colors["on-surface"] || null,
    surface: colors.surface || null,
    signature: parts.join(" · "),
  };
}

const quote = (value) => JSON.stringify(String(value));

// The normalised Google-format front matter. Inspiration-only: never a product DESIGN.md.
function frontMatter(system, tokens, source = null) {
  const lines = ["---", `# inspiration-only: ${system.name}${source ? ` from ${source}` : ""}, not a product DESIGN.md`, "version: alpha", `name: ${quote(system.name)}`, `description: ${quote(system.description)}`];
  if (Object.keys(tokens.colors).length) lines.push("colors:", ...Object.entries(tokens.colors).map(([name, value]) => `  ${name}: ${quote(value)}`));
  if (Object.keys(tokens.typography).length) {
    lines.push("typography:");
    for (const [name, style] of Object.entries(tokens.typography)) {
      lines.push(`  ${name}:`, `    fontFamily: ${quote(style.fontFamily)}`, `    fontSize: ${style.fontSize}`);
      if (style.lineHeight !== undefined) lines.push(`    lineHeight: ${style.lineHeight}`);
      if (style.letterSpacing !== undefined) lines.push(`    letterSpacing: ${style.letterSpacing}`);
    }
  }
  if (Object.keys(tokens.rounded).length) lines.push("rounded:", ...Object.entries(tokens.rounded).map(([name, value]) => `  ${name}: ${value}`));
  if (Object.keys(tokens.spacing).length) lines.push("spacing:", ...Object.entries(tokens.spacing).map(([name, value]) => `  ${name}: ${value}`));
  lines.push("---");
  return `${lines.join("\n")}\n`;
}

// ---- search and inspect ------------------------------------------------------------------------

function normalize(text) {
  return String(text).toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

// `options.verification` reuses a result the caller already computed for the same manifest.
function readyCatalog(options = {}) {
  const manifestFile = options.manifestFile || findManifest();
  const verification = options.verification || verifyBrandDesignSystems(manifestFile, options);
  return { manifestFile, verification };
}

function requireReady(verification) {
  if (verification.status === "missing") {
    throw Object.assign(new Error(`brand design systems are not downloaded yet. Fix: run ${verification.fetch}`), { code: "TOOL_MISSING", details: { fetch: verification.fetch } });
  }
  if (verification.status !== "ready") {
    const where = verification.fetched?.root;
    invalid(`verification failed (${verification.issues.join("; ")})${where ? `. Fix: remove ${where} and run ${verification.fetch}` : ""}`, "SOURCE_CHANGED");
  }
}

function describe(loaded, root, system) {
  const at = (relative) => path.join(root, ...relative.split("/"));
  const read = (relative) => fs.readFileSync(at(relative), "utf8");
  const override = system.corrections?.files.includes("tokens.override.css") ? read(`${system.corrections.dir}/tokens.override.css`) : null;
  const tokens = normalizeTokens(read(`${system.dir}/tokens.css`), override);
  const files = Object.fromEntries(system.files.map((file) => [file, at(`${system.dir}/${file}`)]));
  if (system.corrections) for (const file of system.corrections.files) files[`corrections/${file}`] = at(`${system.corrections.dir}/${file}`);
  const pack = loaded.manifest.packs.find((candidate) => candidate.id === system.pack);
  return {
    entry: {
      id: `${ID_PREFIX}${system.id}`,
      slug: system.id,
      kind: KIND,
      name: system.name,
      category: system.category,
      description: system.description,
      origin: system.origin || null,
      source: pack.repository,
      revision: pack.revision,
      license: pack.license,
      palette: paletteSignature(tokens),
      upstreamFrontMatter: system.upstreamFrontMatter === true,
      contentPath: files["DESIGN.md"],
      files,
      corrections: system.corrections ? { decision: system.corrections.decision || null, source: loaded.manifest.packs.find((candidate) => candidate.id === system.corrections.dir.split("/")[0]).repository } : null,
      admission: "reference-only",
      status: "reference-only",
      executableReady: false,
      instruction: INSTRUCTION,
    },
    tokens,
  };
}

const INSTRUCTION = "Inspiration-only: study it and synthesise a product DESIGN.md; never install it, or its front matter, as the product's DESIGN.md.";

// One score for examples and systems alike: the whole phrase in the text 100, else 4 per token;
// then +200 when the phrase is the name or id, +8 per token found as a word in the head (id, name,
// category, description, palette signature). An empty query scores every entry 1.
function scoreEntry(phrase, head, content, exact) {
  if (!phrase) return 1;
  const tokens = phrase.split(" ").filter((token) => token.length > 1);
  const haystack = `${head} ${content}`;
  let score = haystack.includes(phrase) ? 100 : tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 4 : 0), 0);
  if (score > 0) {
    if (exact.some((value) => normalize(value) === phrase)) score += 200;
    score += tokens.reduce((sum, token) => sum + (` ${head} `.includes(` ${token} `) ? 8 : 0), 0);
  }
  return score;
}

// Equal scores rank bundled examples before catalog systems, then by id.
function compareScored(left, right) {
  return right.score - left.score || (left.entry.kind === KIND) - (right.entry.kind === KIND) || left.entry.id.localeCompare(right.entry.id);
}

function searchBrandDesignSystems({ query = "", limit = 20, ...options } = {}) {
  const { manifestFile, verification } = readyCatalog(options);
  requireReady(verification);
  const loaded = loadManifest(manifestFile);
  const root = verification.fetched.root;
  const phrase = normalize(query);
  const scored = [];
  for (const system of loaded.manifest.systems) {
    const { entry } = describe(loaded, root, system);
    const head = normalize(`${system.id} ${system.name} ${system.category} ${system.description} ${entry.palette.signature}`);
    const score = scoreEntry(phrase, head, normalize(fs.readFileSync(entry.contentPath, "utf8")), [system.name, system.id]);
    if (score > 0) scored.push({ score, entry });
  }
  return {
    bundle: loaded.manifest.bundle,
    systems: loaded.manifest.systems.length,
    results: scored.sort(compareScored).slice(0, limit),
  };
}

function inspectBrandDesignSystem(id, options = {}) {
  const { manifestFile, verification } = readyCatalog(options);
  requireReady(verification);
  const loaded = loadManifest(manifestFile);
  const system = loaded.manifest.systems.find((candidate) => `${ID_PREFIX}${candidate.id}` === id);
  if (!system) throw Object.assign(new Error(`entry not found: ${id}`), { code: "ENTRY_NOT_FOUND" });
  const { entry, tokens } = describe(loaded, verification.fetched.root, system);
  return {
    schema: "design-pipeline.design-md-source-inspect.v1",
    status: "ready",
    entry,
    admission: "reference-only",
    executableReady: false,
    frontMatter: frontMatter(system, tokens, entry.source),
    tokens: { colors: tokens.colors, typography: tokens.typography, rounded: tokens.rounded, spacing: tokens.spacing },
    omittedTokens: tokens.omitted,
    instruction: INSTRUCTION,
  };
}

module.exports = {
  ID_PREFIX,
  INSTRUCTION,
  KIND,
  compareScored,
  findManifest,
  frontMatter,
  hexColor,
  inspectBrandDesignSystem,
  loadManifest,
  normalizeTokens,
  paletteSignature,
  rootDeclarations,
  schema,
  scoreEntry,
  searchBrandDesignSystems,
  verifyBrandDesignSystems,
};
