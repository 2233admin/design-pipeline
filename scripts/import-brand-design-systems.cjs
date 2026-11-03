#!/usr/bin/env node
"use strict";

// Imports the brand design-system catalog from two reviewed checkouts:
//   - https://github.com/nexu-io/open-design (Apache-2.0): design-systems/<id>/ packages;
//   - https://github.com/feimacode/open-design-agent-kit (MIT): its own packages under
//     packages/content/local/design-systems/ and its correction overlays for open-design systems.
// Duplicates are resolved by system id: the richer package (more of the recorded files) wins and
// the other is recorded. The kit's generated claude-design-systems/ folders repeat the same systems
// in another format and are skipped; the importer checks that each of them maps to a chosen system.
//
// Only licence texts and the attribution README ship (skill/vendor/brand-design-systems/upstream/).
// The English system files are recorded in the manifest's `fetched` section with size, Git blob id
// and SHA-256 and are downloaded by `designer-pipeline sources fetch --bundle brand-design-systems`.
// Translations, previews, generated token exports and everything else stay upstream.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { copyTrackedFiles, fail, inspectCheckout } = require("./git-tree-snapshot.cjs");

const destination = path.resolve(__dirname, "../skill/vendor/brand-design-systems");
const SYSTEM_FILES = ["manifest.json", "DESIGN.md", "USAGE.md", "tokens.css", "components.html", "source/token-contract.report.json"];
const CORRECTION_FILES = ["DESIGN.sections.md", "tokens.override.css"];
const KIT_LOCAL = "packages/content/local";

const reviewed = {
  "open-design": {
    repository: "https://github.com/nexu-io/open-design",
    revision: "5a0c47777975ddb91d09c1c16b423a3ef74bf572",
    gitTree: "0fc60c4ad669d1f14c4ea12ec59acf96bdbeecdf",
    license: "Apache-2.0",
    licenseStart: "                                 Apache License\n                           Version 2.0, January 2004",
    systems: 152,
  },
  "open-design-agent-kit": {
    repository: "https://github.com/feimacode/open-design-agent-kit",
    revision: "927d4b6e6a29d8bfebdccadb4bb4a1b2a6438e73",
    gitTree: "1b7ae070ec44786afdb17e6c0898fe57fd2cbfa2",
    license: "MIT",
    copyright: "Copyright (c) 2026 Iven Xu",
    systems: 46,
    corrections: 57,
  },
  shippedTreeSha256: "412308b35f4031512f95ef0db854ef4847a2be4d316dea80954a957937f3b1cf",
  fetchedTreeSha256: "d4dbe0cf105a8fc82e4b1c978c063db46bcaa4a2005413044c8735118912f682",
};

const sha256 = (content) => crypto.createHash("sha256").update(content).digest("hex");
const byPath = (left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (!["--open-design", "--agent-kit", "--reviewed-at"].includes(token)) fail(`unknown option: ${token}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) fail(`${token} requires a value`);
    options[token.slice(2)] = value;
  }
  if (!options["open-design"] || !options["agent-kit"]) fail("--open-design and --agent-kit are required");
  const date = options["reviewed-at"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail("--reviewed-at requires a valid YYYY-MM-DD");
  return { openDesign: path.resolve(options["open-design"]), agentKit: path.resolve(options["agent-kit"]), reviewedAt: date };
}

function isText(content) {
  if (content.includes(0)) return false;
  try { new TextDecoder("utf-8", { fatal: true }).decode(content); return true; } catch { return false; }
}

// Only the paths the import reads; the rest of each repository is never loaded.
const SCOPE = {
  "open-design": (file) => file === "LICENSE" || file.startsWith("design-systems/"),
  "open-design-agent-kit": (file) => file === "LICENSE" || file.startsWith(`${KIT_LOCAL}/design-systems/`) || file.startsWith(`${KIT_LOCAL}/notices/`)
    || file === `${KIT_LOCAL}/design-system-sources.json` || /^claude-design-systems\/[^/]+\/project\/tokens\.json$/.test(file),
};

function checkout(id, source, pins) {
  const pin = pins[id];
  const inspected = inspectCheckout(source, { include: SCOPE[id] });
  if (inspected.revision !== pin.revision) fail(`${id}: source revision must be the reviewed ${pin.revision}; received ${inspected.revision}`);
  if (inspected.gitTree !== pin.gitTree) fail(`${id}: source Git tree does not match the reviewed tree`);
  const license = inspected.blobs.get("LICENSE")?.toString("utf8") || "";
  if (pin.license === "MIT" ? !(license.startsWith("MIT License") && license.includes(pin.copyright)) : !license.startsWith(pin.licenseStart)) fail(`${id}: source LICENSE does not match the reviewed ${pin.license} licence`);
  const entries = new Map(inspected.indexEntries.map((entry) => [entry.path, entry]));
  return { ...inspected, entries };
}

function json(checkoutData, file) {
  try { return JSON.parse(checkoutData.blobs.get(file).toString("utf8")); }
  catch (error) { fail(`cannot parse ${file}: ${error.message}`); }
}

// The DESIGN.md tagline: the first blockquote after the title that is not a Category or Surface
// line, else the first prose line after the title, without emphasis markers.
function tagline(design) {
  const lines = design.split(/\r?\n/);
  const title = lines.findIndex((line) => /^# /.test(line));
  const after = lines.slice(title + 1, title + 40);
  for (const line of after) {
    const match = line.match(/^>\s*(.+)$/);
    if (match && !/^(Category|Surface):/i.test(match[1])) return match[1].trim();
  }
  const prose = after.find((line) => line.trim() && !/^(#|>|---|\||[-*] |```)/.test(line.trim()));
  return prose ? prose.replace(/\*\*|`/g, "").trim() : null;
}

function systemRecord(pack, data, dir, id) {
  const manifest = json(data, `${dir}/manifest.json`);
  if (manifest.id !== id) fail(`${pack}: ${dir}/manifest.json id ${manifest.id} does not match its folder`);
  for (const key of ["name", "category", "description"]) if (typeof manifest[key] !== "string" || !manifest[key].trim()) fail(`${pack}: ${dir}/manifest.json has no ${key}`);
  const files = SYSTEM_FILES.filter((file) => data.entries.has(`${dir}/${file}`));
  for (const file of ["DESIGN.md", "tokens.css"]) if (!files.includes(file)) fail(`${pack}: ${dir} has no ${file}`);
  const design = data.blobs.get(`${dir}/DESIGN.md`).toString("utf8");
  // Generic generator copy says nothing about the system; the DESIGN.md tagline does.
  const description = /^Bundled OpenDesign package for /.test(manifest.description) ? tagline(design) || manifest.description : manifest.description;
  return {
    id,
    name: manifest.name.trim(),
    category: manifest.category.trim(),
    description: description.trim(),
    origin: typeof manifest.source?.origin === "string" ? manifest.source.origin : null,
    pack,
    dir: `${pack}/${dir}`,
    files,
    ...(/^---\r?\n/.test(design) ? { upstreamFrontMatter: true } : {}),
  };
}

function section(entries, blobs, root) {
  const objects = entries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size, sha256: sha256(blobs.get(file)) }));
  const lines = objects.map((object) => `${object.path}\0${object.sha256}\n`);
  return {
    root,
    fileCount: objects.length,
    byteCount: objects.reduce((sum, object) => sum + object.size, 0),
    treeSha256: sha256(lines.join("")),
    executableFiles: objects.filter((object) => object.mode === "100755").map((object) => object.path),
    objects,
  };
}

// Builds the manifest from the two checkouts. `pins` defaults to the reviewed pins; tests pass their
// own to check determinism on fixture repositories. The command line always uses the reviewed pins.
function build(openDesignSource, agentKitSource, reviewedAt, pins = reviewed) {
  const od = checkout("open-design", openDesignSource, pins);
  const kit = checkout("open-design-agent-kit", agentKitSource, pins);
  const shipped = [];
  const fetched = [];
  const blobs = new Map();
  const take = (list, pack, data, file) => {
    const entry = data.entries.get(file);
    if (!entry) fail(`${pack}: missing ${file}`);
    const content = data.blobs.get(file);
    if (!isText(content)) fail(`${pack}: ${file} is not UTF-8 text`);
    if (entry.mode !== "100644") fail(`${pack}: ${file} has mode ${entry.mode}`);
    const stored = `${pack}/${file}`;
    blobs.set(stored, content);
    list.push({ ...entry, path: stored });
  };

  take(shipped, "open-design", od, "LICENSE");
  take(shipped, "open-design", od, "design-systems/README.md");
  take(shipped, "open-design-agent-kit", kit, "LICENSE");
  take(shipped, "open-design-agent-kit", kit, `${KIT_LOCAL}/notices/LICENSE-awesome-ios-design-md.txt`);

  const folders = (data, prefix) => [...new Set([...data.entries.keys()].filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length).split("/")[0]))].sort();

  const systems = new Map();
  for (const id of folders(od, "design-systems/")) {
    if (!od.entries.has(`design-systems/${id}/manifest.json`)) continue; // README.md, _schema
    systems.set(id, systemRecord("open-design", od, `design-systems/${id}`, id));
  }
  if (systems.size !== pins["open-design"].systems) fail(`open-design: expected ${pins["open-design"].systems} systems; found ${systems.size}`);

  const decisions = kit.entries.has(`${KIT_LOCAL}/design-system-sources.json`) ? json(kit, `${KIT_LOCAL}/design-system-sources.json`) : {};
  const duplicates = [];
  let kitSystems = 0;
  let corrections = 0;
  for (const id of folders(kit, `${KIT_LOCAL}/design-systems/`)) {
    const dir = `${KIT_LOCAL}/design-systems/${id}`;
    if (kit.entries.has(`${dir}/manifest.json`)) {
      kitSystems += 1;
      const record = systemRecord("open-design-agent-kit", kit, dir, id);
      const existing = systems.get(id);
      if (existing) {
        // Prefer the richer package; record the one left out.
        const keep = record.files.length > existing.files.length ? record : existing;
        const drop = keep === record ? existing : record;
        duplicates.push({ id, kept: keep.dir, skipped: drop.dir });
        systems.set(id, keep);
      } else systems.set(id, record);
      continue;
    }
    const files = CORRECTION_FILES.filter((file) => kit.entries.has(`${dir}/${file}`));
    if (!files.length) fail(`open-design-agent-kit: ${dir} is neither a package nor a correction overlay`);
    const target = systems.get(id);
    if (!target || target.pack !== "open-design") fail(`open-design-agent-kit: correction overlay ${id} has no open-design system`);
    const decision = decisions[id];
    target.corrections = {
      dir: `open-design-agent-kit/${dir}`,
      files,
      ...(decision ? { decision: { color: decision.color, type: decision.type, reason: decision.reason } } : {}),
    };
    corrections += 1;
  }
  if (kitSystems !== pins["open-design-agent-kit"].systems) fail(`open-design-agent-kit: expected ${pins["open-design-agent-kit"].systems} packages; found ${kitSystems}`);
  if (corrections !== pins["open-design-agent-kit"].corrections) fail(`open-design-agent-kit: expected ${pins["open-design-agent-kit"].corrections} correction overlays; found ${corrections}`);

  // The kit's Claude Design exports repeat chosen systems; each must map to one.
  const exports = folders(kit, "claude-design-systems/").filter((id) => kit.entries.has(`claude-design-systems/${id}/project/tokens.json`));
  for (const id of exports) if (!systems.has(id)) fail(`open-design-agent-kit: claude-design-systems/${id} has no chosen system`);

  const chosen = [...systems.values()].sort((left, right) => (left.id < right.id ? -1 : 1));
  for (const system of chosen) {
    const pack = system.pack === "open-design" ? od : kit;
    const inRepo = system.dir.slice(system.pack.length + 1);
    for (const file of system.files) take(fetched, system.pack, pack, `${inRepo}/${file}`);
    if (system.corrections) {
      const inKit = system.corrections.dir.slice("open-design-agent-kit/".length);
      for (const file of system.corrections.files) take(fetched, "open-design-agent-kit", kit, `${inKit}/${file}`);
    }
  }
  shipped.sort(byPath);
  fetched.sort(byPath);

  const pack = (id, data) => {
    const pin = pins[id];
    return {
      id,
      repository: pin.repository,
      revision: data.revision,
      gitTree: data.gitTree,
      committedAt: data.committedAt,
      license: pin.license,
      ...(pin.copyright ? { copyright: pin.copyright } : {}),
      reviewedAt,
    };
  };
  const manifest = {
    schema: "design-pipeline.brand-design-systems-source.v1",
    bundle: "brand-design-systems",
    packs: [pack("open-design", od), pack("open-design-agent-kit", kit)],
    licenses: [
      { path: "upstream/open-design/LICENSE", license: "Apache-2.0", scope: "open-design systems; per-system provenance in each manifest.json and design-systems/README.md" },
      { path: "upstream/open-design-agent-kit/LICENSE", license: "MIT", copyright: pins["open-design-agent-kit"].copyright, scope: "open-design-agent-kit systems and correction overlays" },
      { path: `upstream/open-design-agent-kit/${KIT_LOCAL}/notices/LICENSE-awesome-ios-design-md.txt`, license: "MIT", copyright: "Copyright (c) 2026 Muhammed Eliwat", scope: "open-design-agent-kit systems adapted from Meliwat/awesome-ios-design-md" },
    ],
    dedupe: {
      rule: "One system per id. When both sources ship a package with the same id, the one with more of the recorded files is kept. open-design-agent-kit correction overlays (tokens.override.css, DESIGN.sections.md) are attached to the open-design system they correct, and tokens.override.css wins when tokens are normalised. open-design-agent-kit claude-design-systems/ repeats the same systems in another format and is skipped.",
      duplicates,
      skippedExports: exports.length,
    },
    snapshot: section(shipped, blobs, "upstream"),
    fetched: section(fetched, blobs, "fetched"),
    systems: chosen,
    boundary: {
      mode: "reference-material",
      admission: "reference-only",
      productDesignMd: false,
      trademarks: "Brand-referencing systems are aesthetic studies of public products, not official assets of those brands.",
      executesUpstreamScripts: false,
      installsUpstreamDependencies: false,
    },
  };
  return { manifest, shipped, blobs };
}

// Pretty JSON with one line per file object and per system, so the manifest stays small and diffable.
function serialize(manifest) {
  const lines = [];
  const text = JSON.stringify(manifest, (key, value) => {
    if ((key === "objects" || key === "systems") && Array.isArray(value)) return value.map((item) => { lines.push(JSON.stringify(item)); return `\u0000${lines.length - 1}`; });
    return value;
  }, 2);
  return `${text.replace(/"\\u0000(\d+)"/g, (match, index) => lines[Number(index)])}\n`;
}

function importSnapshot(options) {
  const { manifest, shipped, blobs } = build(options.openDesign, options.agentKit, options.reviewedAt);
  if (manifest.snapshot.treeSha256 !== reviewed.shippedTreeSha256 || manifest.fetched.treeSha256 !== reviewed.fetchedTreeSha256) {
    fail(`content does not match the reviewed hashes (shipped ${manifest.snapshot.treeSha256}, fetched ${manifest.fetched.treeSha256})`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fail(`stale import backup already exists: ${backup}`);
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".brand-design-systems-stage-"));
  let movedOld = false;
  try {
    copyTrackedFiles(path.join(stage, "upstream"), shipped, blobs);
    fs.writeFileSync(path.join(stage, "manifest.json"), serialize(manifest));
    if (fs.existsSync(destination)) { fs.renameSync(destination, backup); movedOld = true; }
    fs.renameSync(stage, destination);
  } catch (error) {
    if (!fs.existsSync(destination) && movedOld && fs.existsSync(backup)) fs.renameSync(backup, destination);
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
  if (movedOld) fs.rmSync(backup, { recursive: true, force: true });
  return manifest;
}

if (require.main !== module) module.exports = { build, reviewed, serialize };
else try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) process.stdout.write("Usage: node scripts/import-brand-design-systems.cjs --open-design <clean-reviewed-checkout> --agent-kit <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n");
  else {
    const manifest = importSnapshot(options);
    process.stdout.write(`${JSON.stringify({ status: "imported", systems: manifest.systems.length, shipped: manifest.snapshot.fileCount, fetched: manifest.fetched.fileCount, fetchedBytes: manifest.fetched.byteCount })}\n`);
  }
} catch (error) {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
}
