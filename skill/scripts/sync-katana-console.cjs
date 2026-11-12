"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { normalizeSnapshot, CAPABILITY_TERMS } = require("./design-system-catalog-core.cjs");
const { projectDesignSystemTokens } = require("./design-system-decision-core.cjs");

const SOURCE_PATH = "design/katana-console";
const REPOSITORY = "https://github.com/2233admin/KATANAview";
const LICENSE = "LicenseRef-User-Authorized-Internal-Reuse";
const SNAPSHOT_NAME = "katana-console-design-system-snapshot.json";
const LICENSE_NOTICE = "The upstream snapshot declares no repository open-source license. Copied with the owner's authorization for internal reuse; this is not an MIT/GPL grant or authorization for public redistribution. Upstream authorship and external dependency terms remain applicable.";
const EXPLICIT_CAPABILITIES = Object.freeze({
  DataGrid: ["data-table"], DOMLadder: ["data-table", "app-ui"], SmartTape: ["data-table", "list-group"],
  Watchlist: ["data-table", "search"], Screener: ["data-table", "search"], PanelFrame: ["card", "app-shell"],
  Workspaces: ["app-shell", "app-ui"], WorkspaceTabs: ["tabs"], CommandLine: ["command-palette", "text-input"],
  Controls: ["button", "text-input", "select", "toggle"], Toggle: ["toggle"], Calendar: ["date-picker"],
  Preferences: ["app-ui", "select", "toggle"], Talk: ["ai-chat", "conversation", "prompt-input"],
  AlertCenter: ["toast-notification", "error-state"], StatusBar: ["badge", "app-shell"],
});

function invalid(message) { throw new Error(`KATANA import: ${message}`); }
function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function git(root, args, options = {}) {
  return execFileSync("git", ["-C", root, ...args], { windowsHide: true, maxBuffer: 128 * 1024 * 1024, ...options });
}
function safeRelativePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || /[\x00-\x1f:*?"<>|]/.test(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) invalid(`unsafe source path ${JSON.stringify(value)}`);
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.toLowerCase() === ".git" || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) invalid(`unsafe source path ${JSON.stringify(value)}`);
  return value;
}
function assertNoSymlink(target) {
  let current = path.resolve(target);
  while (true) {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) invalid(`symlink destination is not allowed: ${current}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}
function checkedTarget(root, relative) {
  safeRelativePath(relative);
  const target = path.resolve(root, ...relative.split("/"));
  if (!inside(root, target)) invalid("destination escaped the reference root");
  assertNoSymlink(target);
  return target;
}

function readCommittedFiles(sourceRoot, ref) {
  if (typeof ref !== "string" || !/^[a-f0-9]{40}$/i.test(ref)) invalid("--ref must be a full 40-character Git commit, not a moving branch or tag");
  const commit = git(sourceRoot, ["rev-parse", "--verify", `${ref}^{commit}`], { encoding: "utf8" }).trim();
  if (commit.toLowerCase() !== ref.toLowerCase()) invalid("--ref did not identify the requested commit");
  const tree = git(sourceRoot, ["ls-tree", "-rz", "--full-tree", commit, "--", SOURCE_PATH]).toString("utf8");
  const entries = tree.split("\0").filter(Boolean).map((record) => {
    const match = record.match(/^(\d{6}) (\S+) ([a-f0-9]+)\t([\s\S]+)$/);
    if (!match || match[2] !== "blob" || !["100644", "100755"].includes(match[1])) invalid("source contains a symlink, submodule or unsupported Git entry");
    if (!match[4].startsWith(`${SOURCE_PATH}/`)) invalid("unexpected source tree path");
    return { oid: match[3], sourcePath: match[4], path: safeRelativePath(match[4].slice(SOURCE_PATH.length + 1)) };
  }).sort((a, b) => a.path.localeCompare(b.path, "en"));
  if (!entries.length) invalid(`commit has no tracked ${SOURCE_PATH} files`);
  const caseInsensitive = new Set();
  for (const entry of entries) {
    const key = entry.path.toLowerCase();
    if (caseInsensitive.has(key)) invalid(`case-colliding source path ${entry.path}`);
    caseInsensitive.add(key);
  }
  const batch = git(sourceRoot, ["cat-file", "--batch"], { input: `${entries.map((entry) => entry.oid).join("\n")}\n` });
  let offset = 0;
  for (const entry of entries) {
    const end = batch.indexOf(10, offset);
    if (end < 0) invalid("incomplete Git blob header");
    const header = batch.subarray(offset, end).toString("ascii").match(/^([a-f0-9]+) blob (\d+)$/);
    if (!header || header[1] !== entry.oid) invalid("Git blob identity mismatch");
    const size = Number(header[2]);
    offset = end + 1;
    if (!Number.isSafeInteger(size) || offset + size >= batch.length || batch[offset + size] !== 10) invalid("incomplete Git blob body");
    entry.bytes = batch.subarray(offset, offset + size);
    offset += size + 1;
  }
  if (offset !== batch.length) invalid("unexpected Git blob batch data");
  return { commit, entries };
}

function maturityDeclarations(files) {
  const tools = files.get("project/tools.md");
  const rows = new Map();
  if (!tools) return rows;
  const lines = tools.toString("utf8").split(/\r?\n/);
  let inProgressTable = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^## 16\./.test(line)) inProgressTable = true;
    else if (inProgressTable && /^## /.test(line)) break;
    if (!inProgressTable || !line.startsWith("|")) continue;
    const columns = line.split("|").slice(1, -1).map((value) => value.trim());
    if (columns.length < 3) continue;
    for (const name of columns[1].match(/[A-Z][A-Za-z0-9]+/g) || []) rows.set(name, { declaration: columns[2], path: "project/tools.md", line: index + 1 });
  }
  return rows;
}

function componentMetadata(files) {
  const declarations = maturityDeclarations(files);
  const names = [...new Set([...files.keys()].map((name) => name.match(/^project\/components\/([A-Za-z0-9._-]+)\//)?.[1]).filter(Boolean))].sort();
  return names.map((name) => {
    const expectedReadme = `project/components/${name}/README.md`;
    const readmePath = files.has(expectedReadme) ? expectedReadme : null;
    const previewPath = `project/components/${name}/preview.html`;
    const declaration = declarations.get(name);
    return {
      id: name, name, path: `project/components/${name}`, readmePath,
      previewPath: files.has(previewPath) ? previewPath : null,
      sourceMaturity: declaration && /\bIMPLEMENTED\b/.test(declaration.declaration) ? "implemented-reported" : files.has(previewPath) ? readmePath ? "specification-with-preview" : "preview-only" : "specification-only",
      verificationStatus: "not-independently-verified",
      documentationMissing: !readmePath,
      maturityDeclaration: declaration?.declaration || "No explicit implementation maturity recorded in the source progress table; README and preview are reference material.",
      maturityEvidence: declaration ? { path: declaration.path, line: declaration.line } : { path: readmePath || (files.has(previewPath) ? previewPath : `project/components/${name}`), line: 1 },
    };
  });
}

function tokenIndex(source) {
  const tokens = {};
  const colors = new Map((source.color?.tokens || []).map((token) => [token.name, token]));
  function resolveColor(name, mode, seen = new Set()) {
    if (seen.has(name)) invalid(`cyclic color token ${name}`);
    seen.add(name);
    const raw = colors.get(name)?.value;
    const value = raw && typeof raw === "object" ? raw[mode] : raw;
    if (typeof value !== "string") invalid(`missing ${mode} color ${name}`);
    return value.replace(/\{([^}]+)\}/g, (_, alias) => resolveColor(alias, mode, new Set(seen)));
  }
  for (const name of colors.keys()) tokens[`color.${name}`] = { type: "color", value: [resolveColor(name, "paper"), resolveColor(name, "console")] };
  for (const section of ["spacing", "radius", "shadow", "border"]) {
    for (const token of source[section]?.tokens || []) {
      if (typeof token.value === "string" || typeof token.value === "number") tokens[`${section}.${token.name}`] = { value: token.value, type: section === "spacing" || section === "radius" ? "dimension" : section };
    }
  }
  for (const [name, value] of Object.entries(source.type?.families || {})) tokens[`font-family.${name}`] = { type: "fontFamily", value };
  for (const group of source.type?.groups || []) for (const style of group.styles || []) {
    for (const [key, type] of [["fontSize", "dimension"], ["lineHeight", "dimension"], ["letterSpacing", "dimension"], ["fontWeight", "fontWeight"]]) {
      const raw = style[key];
      if (typeof raw !== "string" && typeof raw !== "number") continue;
      const value = key === "fontWeight" && /^\d+$/.test(String(raw)) ? Number(raw) : raw === "0" && type === "dimension" ? "0px" : raw;
      tokens[`text.${style.name}.${key}`] = { type, value };
    }
  }
  if (!Object.keys(tokens).length) invalid("source tokens have no projectable values");
  return tokens;
}

function extractExternalLinks(entries) {
  const links = new Map();
  for (const entry of entries) {
    if (!/\.(?:md|html|css|js|json|py)$/i.test(entry.path)) continue;
    for (const raw of entry.bytes.toString("utf8").match(/https?:\/\/[^\s"'<>`()[\]{}]+/g) || []) {
      const url = raw.replace(/[.,;]+$/, "");
      if (!links.has(url)) links.set(url, new Set());
      links.get(url).add(entry.path);
    }
  }
  return [...links].sort(([a], [b]) => a.localeCompare(b, "en")).map(([url, paths]) => ({ url, paths: [...paths].sort() }));
}

function buildResources(commit, entries) {
  const files = new Map(entries.map((entry) => [entry.path, entry.bytes]));
  const rawTokens = files.get("project/tokens.json");
  if (!rawTokens) invalid("source must include project/tokens.json");
  const components = componentMetadata(files);
  if (!components.length) invalid("source has no component reference files");
  const sourceUrl = `${REPOSITORY}/tree/${commit}/${SOURCE_PATH}`;
  const provenance = { source: "KATANA Console", license: LICENSE, url: sourceUrl, attribution: `KATANAview ${commit}; owner-authorized internal reuse`, sourceCommit: commit, licenseNotice: LICENSE_NOTICE };
  const componentEntries = components.map((component) => {
    const readme = component.readmePath ? files.get(component.readmePath).toString("utf8") : "Preview-only reference; no component README is present in the pinned source.";
    const firstParagraph = readme.replace(/^#[^\n]*\n/, "").split(/\n\s*\n/).find((paragraph) => paragraph.trim() && !paragraph.trim().startsWith(">")) || component.name;
    const capabilities = EXPLICIT_CAPABILITIES[component.name] || ["card", "app-ui"];
    for (const capability of capabilities) if (!Object.hasOwn(CAPABILITY_TERMS, capability)) invalid(`unsupported declared capability ${capability}`);
    return {
      id: component.id, name: component.name, category: "katana-console", status: "unknown",
      description: firstParagraph.trim().slice(0, 700), keywords: [component.name, "KATANA Console", ...capabilities],
      path: `katana-console/source/${component.path}`,
      ...(component.readmePath ? { readmePath: `katana-console/source/${component.readmePath}` } : {}),
      ...(component.previewPath ? { previewPath: `katana-console/source/${component.previewPath}` } : {}),
      sourceMaturity: component.sourceMaturity, verificationStatus: component.verificationStatus,
      documentationMissing: component.documentationMissing,
      maturityDeclaration: component.maturityDeclaration,
      maturityEvidence: { ...component.maturityEvidence, path: `katana-console/source/${component.maturityEvidence.path}` },
      routing: { capabilities, platforms: ["web"], mode: "reference-adaptation", evidenceStatus: "user-provided", degradation: "Reference specification or fixture only; adapt and verify in the consuming project. Declared capabilities do not attest implementation." },
      provenance: { url: `${REPOSITORY}/blob/${commit}/${SOURCE_PATH}/${component.readmePath || component.previewPath || component.path}`, sourceCommit: commit, sourcePath: `${SOURCE_PATH}/${component.readmePath || component.previewPath || component.path}` },
    };
  });
  const docs = [...files.keys()].filter((name) => name.endsWith(".md") && !name.includes("/components/") && (name === "README.md" || name.startsWith("project/"))).sort().map((name) => ({
    id: `foundation/${name.replace(/\.md$/, "")}`, name: name === "README.md" ? "KATANA Console overview" : path.posix.basename(name, ".md"),
    category: "foundation", status: "unknown", description: files.get(name).toString("utf8").slice(0, 700),
    path: `katana-console/source/${name}`, provenance: { url: `${REPOSITORY}/blob/${commit}/${SOURCE_PATH}/${name}`, sourceCommit: commit, sourcePath: `${SOURCE_PATH}/${name}` },
  }));
  docs.push({ id: "tokens", name: "KATANA Console foundation tokens", category: "tokens", status: "unknown", path: "katana-console/source/project/tokens.json", theme: { tokens: tokenIndex(JSON.parse(rawTokens.toString("utf8"))), modeMapping: { light: "paper", dark: "console" } } });
  const snapshot = { schema: "design-pipeline.design-system-snapshot.v1", version: "1", namespace: "katana-console", provenance, components: componentEntries, docs };
  const catalog = normalizeSnapshot(snapshot);
  projectDesignSystemTokens(catalog);
  const manifest = {
    formatVersion: 1, name: "KATANA Console", sourceCommit: commit,
    source: { repository: REPOSITORY, commit, path: SOURCE_PATH, readMethod: "git-object-only" },
    license: LICENSE, licenseNotice: LICENSE_NOTICE, fileCount: entries.length, componentCount: components.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.bytes.length, 0),
    files: entries.map((entry) => ({ path: entry.path, sourcePath: entry.sourcePath, sha256: sha256(entry.bytes), size: entry.bytes.length })),
    components, externalLinks: extractExternalLinks(entries),
    fontPolicy: "External font links and fallback families are preserved; importer never downloads fonts or other remote assets.",
    verificationStatus: "source-integrity-only; component conformance and visual acceptance are not evaluated",
  };
  return { manifest, snapshot };
}

function writeResources(outputRoot, entries, resources) {
  outputRoot = path.resolve(outputRoot);
  assertNoSymlink(outputRoot);
  const vendorRoot = checkedTarget(outputRoot, "katana-console");
  const sourceRoot = checkedTarget(outputRoot, "katana-console/source");
  checkedTarget(outputRoot, "katana-console/manifest.json");
  checkedTarget(outputRoot, SNAPSHOT_NAME);
  for (const entry of entries) checkedTarget(outputRoot, `katana-console/source/${entry.path}`);
  const stage = checkedTarget(outputRoot, `katana-console/.import-${process.pid}-${crypto.randomBytes(6).toString("hex")}`);
  fs.mkdirSync(stage, { recursive: true });
  try {
    for (const entry of entries) {
      const destination = checkedTarget(stage, entry.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, entry.bytes);
    }
    // Only the verified, declared source subtree is replaced; preview/docs siblings remain intact.
    assertNoSymlink(sourceRoot);
    if (!inside(vendorRoot, sourceRoot)) invalid("invalid replacement target");
    if (fs.existsSync(sourceRoot)) fs.rmSync(sourceRoot, { recursive: true });
    fs.renameSync(stage, sourceRoot);
    fs.writeFileSync(checkedTarget(outputRoot, "katana-console/manifest.json"), `${JSON.stringify(resources.manifest, null, 2)}\n`);
    fs.writeFileSync(checkedTarget(outputRoot, SNAPSHOT_NAME), `${JSON.stringify(resources.snapshot, null, 2)}\n`);
  } finally {
    if (fs.existsSync(stage) && inside(vendorRoot, stage)) fs.rmSync(stage, { recursive: true });
  }
}

function syncKatanaConsole(options) {
  const sourceRoot = path.resolve(options.sourceRoot || "");
  if (!options.sourceRoot) invalid("--source-root is required");
  const { commit, entries } = readCommittedFiles(sourceRoot, options.ref);
  const resources = buildResources(commit, entries);
  const outputRoot = options.outputRoot || path.resolve(__dirname, "..", "references");
  writeResources(outputRoot, entries, resources);
  return { sourceCommit: commit, fileCount: entries.length, componentCount: resources.manifest.componentCount, outputRoot: path.resolve(outputRoot), snapshot: path.join(path.resolve(outputRoot), SNAPSHOT_NAME) };
}

function main(args) {
  if (args.includes("--help")) {
    console.log("Usage: node sync-katana-console.cjs --source-root <KATANAview checkout> --ref <full Git commit> [--output-root <references directory>]");
    return;
  }
  const options = {};
  const names = { "--source-root": "sourceRoot", "--ref": "ref", "--output-root": "outputRoot" };
  for (let index = 0; index < args.length; index += 2) {
    if (!names[args[index]] || !args[index + 1] || args[index + 1].startsWith("--")) invalid(`unsupported or incomplete argument ${args[index]}`);
    if (Object.hasOwn(options, names[args[index]])) invalid(`duplicate argument ${args[index]}`);
    options[names[args[index]]] = args[index + 1];
  }
  console.log(JSON.stringify(syncKatanaConsole(options), null, 2));
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { safeRelativePath, readCommittedFiles, buildResources, syncKatanaConsole, LICENSE, SOURCE_PATH, SNAPSHOT_NAME };
