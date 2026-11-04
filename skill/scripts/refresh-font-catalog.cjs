#!/usr/bin/env node
"use strict";

// Kernel for `fonts refresh`: reads every registered font file at its source's pinned revision by
// HTTP range from raw.githubusercontent.com (github.com/<repo>/raw redirects are refused by some
// proxies, and the GitHub API may be unauthorised), measures cmap, weights and stroke contrast,
// and writes a catalog whose content depends only on the sources and revisions read: the same
// revisions reproduce the same bytes. Reports JSON on stdout to the synchronous CLI.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const core = require("./font-catalog-core.cjs");

const RAW = "https://raw.githubusercontent.com";
const GITHUB_REPOSITORY = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/;
const CONCURRENCY = 6;

function repoOf(repository) {
  const match = GITHUB_REPOSITORY.exec(String(repository));
  if (!match) throw new Error(`unsupported repository ${repository}`);
  return `${match[1]}/${match[2]}`;
}

const rawUrl = (repository, revision, file) => `${RAW}/${repoOf(repository)}/${revision}/${file.split("/").map(encodeURIComponent).join("/")}`;

async function request(url, init = {}, attempts = 3) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(60000) });
      if (response.status === 404) return response;
      if (response.ok) return response;
      last = new Error(`HTTP ${response.status} for ${url}`);
      if (response.status === 403 || response.status === 401) break;
    } catch (error) {
      last = new Error(`${url}: ${error.cause?.message || error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  throw last;
}

async function text(url) {
  const response = await request(url);
  if (response.status === 404) return null;
  return Buffer.from(await response.arrayBuffer());
}

/** A remote file read by byte range; `size` comes from Content-Range. */
function remoteFile(url) {
  const state = { size: null };
  const read = async (offset, length) => {
    if (length <= 0) return Buffer.alloc(0);
    const response = await request(url, { headers: { Range: `bytes=${offset}-${offset + length - 1}` } });
    if (response.status === 404) throw Object.assign(new Error(`not found: ${url}`), { code: "NOT_FOUND" });
    if (response.status !== 206) throw new Error(`${url} ignored the Range request (HTTP ${response.status}); refusing a full download`);
    // A 206 must answer exactly the bytes asked for: a shifted, short or over-long body would be
    // measured as a different (smaller) font without any error.
    const header = response.headers.get("content-range") || "";
    const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(header.trim());
    if (!match) throw new Error(`${url} answered 206 without a usable Content-Range (${header || "none"})`);
    const [start, end, total] = match.slice(1).map(Number);
    const expectedEnd = Math.min(offset + length, total) - 1;
    const body = Buffer.from(await response.arrayBuffer());
    if (start !== offset || end !== expectedEnd || body.length !== expectedEnd - offset + 1) {
      throw new Error(`${url} answered bytes ${start}-${end} (${body.length} bytes) for ${offset}-${offset + length - 1}; refusing a misaligned or truncated range`);
    }
    if (offset + length > total) throw new Error(`${url}: a table at ${offset}+${length} runs past the ${total}-byte file`);
    state.size = total;
    return body;
  };
  return { read, state };
}

class Need {
  constructor(offset, length, key) {
    this.offset = offset;
    this.length = length;
    this.key = key;
  }
}

/** Measure one remote TTF/OTF: directory, small tables, then the 十 glyph by demand-driven reads. */
async function measureRemote(url) {
  const file = remoteFile(url);
  let head = await file.read(0, 12);
  const format = core.sniff(head);
  if (format !== "sfnt") throw new Error(`${url} is ${format || "not a font"}; the refresh reads plain TTF/OTF files`);
  head = Buffer.concat([head, await file.read(12, head.readUInt16BE(4) * 16)]);
  const directory = core.tableDirectory(head);
  const tables = {};
  for (const name of ["cmap", "name", "OS/2", "head", "fvar"]) {
    const entry = directory.tables[name];
    if (entry) tables[name] = await file.read(entry.offset, entry.length);
  }
  // Glyph data is read on demand: the measurement throws Need for a missing range, the range is
  // fetched, and the measurement reruns (a handful of rounds: loca, glyf, gvar header, offsets, data).
  const cache = new Map();
  const reader = {
    has: (name) => Boolean(directory.tables[name]),
    read: (name, offset, length) => {
      const key = `${name}:${offset}:${length}`;
      if (!cache.has(key)) throw new Need(directory.tables[name].offset + offset, length, key);
      return cache.get(key);
    },
  };
  for (let round = 0; ; round += 1) {
    try {
      const measured = core.guarded(url, () => core.measureFace((name) => tables[name] || null, reader));
      return {
        bytes: file.state.size,
        cmapSha256: crypto.createHash("sha256").update(tables.cmap).digest("hex"),
        ...measured,
      };
    } catch (error) {
      if (!(error instanceof Need) || round > 16) throw error;
      cache.set(error.key, await file.read(error.offset, error.length));
    }
  }
}

/** METADATA.pb text format: `key: value`, nested `key { ... }`; repeated keys become arrays. */
function parseTextproto(source) {
  const root = {};
  const stack = [root];
  const add = (object, key, value) => {
    if (Object.hasOwn(object, key)) object[key] = [].concat(object[key], [value]);
    else object[key] = value;
  };
  for (const raw of source.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    if (line === "}") {
      stack.pop();
      continue;
    }
    const open = /^(\w+)\s*\{$/.exec(line);
    if (open) {
      const child = {};
      add(stack.at(-1), open[1], child);
      stack.push(child);
      continue;
    }
    const pair = /^(\w+)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;
    let value = pair[2];
    if (value.startsWith('"')) value = JSON.parse(value);
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    add(stack.at(-1), pair[1], value);
  }
  return root;
}
const list = (value) => (value === undefined ? [] : [].concat(value));

const LICENSE_FILES = ["OFL.txt", "LICENSE.txt", "UFL.txt", "LICENSE"];
// What the licence text must contain for the declared licence id to be believed.
const LICENSE_MARKERS = {
  OFL: /SIL OPEN FONT LICENSE\s+Version 1\.1/i,
  APACHE2: /Apache License[\s\S]{0,40}Version 2\.0/i,
  UFL: /UBUNTU FONT LICEN[CS]E\s+Version 1\.0/i,
};

async function licenseEvidence(repository, revision, directory, names = LICENSE_FILES) {
  for (const name of names) {
    const file = directory ? `${directory}/${name}` : name;
    const url = rawUrl(repository, revision, file);
    const body = await text(url);
    if (!body) continue;
    const content = body.toString("utf8");
    const reserved = /with Reserved Font Names? ([^\n]+?)\.(?:\s|\[|$)/i.exec(content);
    const additional = /\[ADDITIONAL PERMISSION\]\s*([^\n]+)/i.exec(content);
    return {
      file: url,
      sha256: crypto.createHash("sha256").update(body).digest("hex"),
      reservedFontName: reserved ? reserved[1].trim().replace(/^"|"$/g, "") : null,
      additionalPermission: additional ? additional[1].trim() : null,
      content,
    };
  }
  return null;
}

/** Check the licence text against the declared id; returns the evidence without its body. */
function verifyLicense(evidence, licenseKey, where, source, problems) {
  if (!evidence) return null;
  const { content, ...kept } = evidence;
  const marker = LICENSE_MARKERS[licenseKey];
  kept.verified = Boolean(marker && marker.test(content));
  if (!kept.verified) {
    problems.push({ source: source.id, path: where, code: "FONT_LICENSE_MISMATCH", message: `${evidence.file} does not contain the ${licenseKey} licence text that is declared for it`, fix: "Read the licence text, then correct the declared licence in sources.json (or METADATA.pb upstream) before using the font." });
  }
  return kept;
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

function resolveHead(repository) {
  const child = spawnSync("git", ["ls-remote", repository, "HEAD"], { encoding: "utf8", timeout: 60000 });
  const sha = /^([0-9a-f]{40})\s+HEAD/m.exec(child.stdout || "");
  if (!sha) throw new Error(`could not resolve HEAD of ${repository} with git ls-remote (${(child.stderr || child.error?.message || "no output").trim()}); pass --revision <40-hex commit>`);
  return sha[1];
}

function familyRecord({ source, directory, family, category, override, licenseKey, licenseFields, files }) {
  const measuredContrast = files.map((file) => file.measured.contrast.value).filter((value) => value !== null);
  const contrast = measuredContrast.length ? Math.max(...measuredContrast) : null;
  return {
    family,
    source,
    directory,
    category,
    styles: core.styleTags({ category, contrast, override }),
    contrast,
    weights: [...new Set(files.flatMap((file) => file.weights))].sort((a, b) => a - b),
    license: licenseFields,
    files,
    licenseKey,
  };
}

async function refreshGoogle(source, revision, licenses, problems) {
  const directories = source.families;
  const families = await pool(directories, async (directory) => {
    const metadataUrl = rawUrl(source.repository, revision, `${directory}/METADATA.pb`);
    const body = await text(metadataUrl);
    if (!body) {
      problems.push({ source: source.id, path: directory, code: "FONT_SOURCE_MISSING", message: `${metadataUrl} is not found at ${revision}`, fix: "Remove the directory from sources.json or pin a revision that has it." });
      return null;
    }
    const metadata = parseTextproto(body.toString("utf8"));
    const licenseKey = String(metadata.license || "").toUpperCase();
    const evidence = verifyLicense(await licenseEvidence(source.repository, revision, directory), licenseKey, directory, source, problems);
    if (!evidence) problems.push({ source: source.id, path: directory, code: "FONT_LICENSE_TEXT_MISSING", severity: "warning", message: `no licence text (${LICENSE_FILES.join(", ")}) beside METADATA.pb at ${revision}; the licence is declared only by its \`license\` field`, fix: "Read the licence in the family's upstream repository (METADATA.pb `source.repository_url`) and keep that text with the font before shipping it." });
    const files = [];
    const byFile = new Map();
    for (const font of list(metadata.fonts)) {
      if (font.style !== "normal") continue;
      if (!byFile.has(font.filename)) byFile.set(font.filename, []);
      byFile.get(font.filename).push(font.weight);
    }
    for (const [filename, weights] of byFile) {
      const url = rawUrl(source.repository, revision, `${directory}/${filename}`);
      try {
        const measured = await measureRemote(url);
        files.push({ url, weights, measured });
      } catch (error) {
        problems.push({ source: source.id, path: `${directory}/${filename}`, code: "FONT_FILE_UNREADABLE", message: error.message, fix: "Check the file at the pinned revision, then refresh again." });
      }
    }
    if (!files.length) return null;
    const override = source.styleOverrides?.[directory]?.styles;
    return {
      directory,
      record: familyRecord({
        source: source.id,
        directory,
        family: metadata.name,
        category: metadata.category,
        override,
        licenseKey,
        licenseFields: {
          id: licenseKey,
          ...licenses[licenseKey],
          declaredIn: { file: metadataUrl, field: "license" },
          text: evidence,
        },
        files: files.map(({ url, weights, measured }) => ({ url, weights, measured })),
      }),
    };
  });
  return families.filter(Boolean);
}

async function refreshFiles(source, revision, licenses, problems) {
  const evidence = verifyLicense(await licenseEvidence(source.repository, revision, "", [source.licenseFile]), source.license.toUpperCase(), source.licenseFile, source, problems);
  if (!evidence) problems.push({ source: source.id, path: source.licenseFile, code: "FONT_LICENSE_MISSING", message: `${source.licenseFile} is not found at ${revision}`, fix: "Point licenseFile at the licence text in the repository." });
  const files = await pool(source.files, async (entry) => {
    const url = rawUrl(source.repository, revision, entry.path);
    try {
      return { url, weights: [entry.weight], measured: await measureRemote(url) };
    } catch (error) {
      problems.push({ source: source.id, path: entry.path, code: "FONT_FILE_UNREADABLE", message: error.message, fix: "Check the path at the pinned revision, then refresh again." });
      return null;
    }
  });
  const present = files.filter(Boolean);
  if (!present.length) return [];
  const licenseKey = source.license.toUpperCase();
  return [{
    directory: source.id,
    record: familyRecord({
      source: source.id,
      directory: source.id,
      family: source.family,
      category: source.category,
      override: source.styles,
      licenseKey,
      licenseFields: { id: licenseKey, ...licenses[licenseKey], declaredIn: { file: evidence ? evidence.file : null, field: "licence text" }, text: evidence },
      files: present,
    }),
  }];
}

async function discoverGoogle(source, problems) {
  if (!source.discovery) return null;
  try {
    const response = await request(source.discovery.url);
    const body = (await response.text()).replace(/^\)\]\}'\s*/, "");
    const families = JSON.parse(body).familyMetadataList || [];
    const pattern = new RegExp(source.discovery.subsets);
    const listed = new Set(source.families.map((directory) => directory.split("/").pop()));
    const cjk = families.filter((family) => family.subsets.some((subset) => pattern.test(subset)));
    return { url: source.discovery.url, matching: cjk.length, unlisted: cjk.map((family) => family.family).filter((name) => !listed.has(name.toLowerCase().replace(/[^a-z0-9]/g, ""))).sort() };
  } catch (error) {
    problems.push({ source: source.id, path: source.discovery.url, code: "FONT_DISCOVERY_UNREACHABLE", severity: "warning", message: error.message, fix: "Discovery is advisory; the refresh still measured the registered families." });
    return null;
  }
}

/**
 * The catalog parts after a refresh. With a base and a source id, the base keeps every other
 * source's families, revision and problems; cmaps no family references any more are dropped.
 */
function mergeCatalog(base, sourceId, fresh) {
  const keep = base && sourceId ? base : { families: [], problems: [], revisions: {}, cmaps: {} };
  const others = (list) => (list || []).filter((item) => item.source !== sourceId);
  const families = [...others(keep.families), ...fresh.families].sort((a, b) => a.source.localeCompare(b.source) || String(a.directory || a.family).localeCompare(String(b.directory || b.family)));
  const used = new Set(families.flatMap((family) => family.files.map((file) => file.cmap)));
  const cmaps = { ...(keep.cmaps || {}), ...fresh.cmaps };
  return {
    families,
    problems: [...others(keep.problems), ...fresh.problems].sort((a, b) => `${a.source}/${a.path}`.localeCompare(`${b.source}/${b.path}`)),
    revisions: Object.fromEntries(Object.entries({ ...Object.fromEntries(Object.entries(keep.revisions || {}).filter(([id]) => id !== sourceId)), ...fresh.revisions }).sort(([a], [b]) => a.localeCompare(b))),
    cmaps: Object.fromEntries(Object.entries(cmaps).filter(([id]) => used.has(id)).sort(([a], [b]) => a.localeCompare(b))),
  };
}

async function main() {
  const args = JSON.parse(process.argv[2] || "{}");
  const sources = core.loadSources(args.sourcesFile || core.SOURCES_FILE);
  const selected = sources.sources.filter((source) => source.measure && (!args.source || source.id === args.source));
  if (args.source && !selected.length) throw new Error(`--source must be one of ${sources.sources.filter((s) => s.measure).map((s) => s.id).join(", ")}`);
  const problems = [];
  const revisions = {};
  const records = [];
  const discovery = {};
  for (const source of selected) {
    let revision = source.revision;
    if (args.revision) revision = args.revision === "head" ? resolveHead(source.repository) : args.revision;
    if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error(`revision for ${source.id} must be a 40-hex commit, got ${revision}`);
    // `pinned` is the registry pin in force: a cache refreshed under an older pin is stale after an upgrade.
    revisions[source.id] = { repository: source.repository, revision, pinned: source.revision };
    const found = source.kind === "google-fonts" ? await refreshGoogle(source, revision, sources.licenses, problems) : await refreshFiles(source, revision, sources.licenses, problems);
    records.push(...found);
    if (args.discover && source.kind === "google-fonts") discovery[source.id] = await discoverGoogle(source, problems);
  }
  // Dedupe cmaps: files with the same codepoint set share one encoded entry, keyed by its hash.
  const cmaps = {};
  const families = records
    .sort((a, b) => a.record.source.localeCompare(b.record.source) || a.directory.localeCompare(b.directory))
    .map(({ record }) => {
      let coverage = null;
      const files = record.files.map(({ url, measured, weights }) => {
        const encoded = core.encodeCodepoints(measured.codepoints);
        const id = crypto.createHash("sha256").update(encoded).digest("hex").slice(0, 16);
        cmaps[id] = encoded;
        const fileCoverage = core.coverageOf(new Set(measured.codepoints));
        // A family's coverage is its weakest file's, so a query never over-promises a weight.
        coverage = coverage ? Object.fromEntries(Object.entries(coverage).map(([key, value]) => [key, fileCoverage[key].covered < value.covered ? fileCoverage[key] : value])) : fileCoverage;
        return {
          url,
          weights,
          weightClass: measured.weightClass,
          weightAxis: measured.weightAxis,
          bytes: measured.bytes,
          version: measured.version,
          outlines: measured.outlines,
          checksumAdjustment: measured.checksumAdjustment,
          cmapSha256: measured.cmapSha256,
          codepoints: measured.codepoints.length,
          contrast: measured.contrast,
          cmap: id,
        };
      });
      const { licenseKey, ...rest } = record;
      return { ...rest, files, coverage };
    });
  // `--source <id>` replaces only that source's entries in the existing output (or, when there is
  // none yet, in the packaged catalog) and keeps every other source with its revision and problems.
  const output = path.resolve(args.output);
  let base = null;
  if (args.source) {
    const baseFile = fs.existsSync(output) ? output : core.CATALOG_FILE;
    try {
      base = JSON.parse(fs.readFileSync(baseFile, "utf8"));
    } catch {}
    if (!base || base.schema !== core.CATALOG_SCHEMA) throw new Error(`${baseFile} is not a ${core.CATALOG_SCHEMA} catalog to merge --source ${args.source} into; refresh without --source or pass another --output`);
  }
  const merged = mergeCatalog(base, args.source, { families, problems, revisions, cmaps });
  const catalog = {
    schema: core.CATALOG_SCHEMA,
    generator: "designer-pipeline fonts refresh",
    sourcesSchema: sources.schema,
    revisions: merged.revisions,
    glyphSets: Object.fromEntries(Object.entries(core.glyphSets()).map(([id, set]) => [id, { label: set.label, total: set.codepoints.length }])),
    contrast: { glyph: "十 (U+5341)", measure: "stem width at 85% height / bar thickness at 15% width; static files at their own weight, variable files at their heaviest wght instance (gvar applied); family value is its highest file", high: core.HIGH_CONTRAST },
    families: merged.families,
    problems: merged.problems,
    cmaps: merged.cmaps,
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const serialized = `${JSON.stringify(catalog, null, 1)}\n`;
  fs.writeFileSync(`${output}.tmp`, serialized);
  fs.renameSync(`${output}.tmp`, output);
  const status = problems.some((problem) => problem.severity !== "warning") ? "blocked" : "ready";
  process.stdout.write(`${JSON.stringify({
    status,
    output,
    bytes: Buffer.byteLength(serialized),
    sha256: crypto.createHash("sha256").update(serialized).digest("hex"),
    revisions,
    families: catalog.families.length,
    files: catalog.families.reduce((sum, family) => sum + family.files.length, 0),
    refreshed: Object.keys(revisions),
    problems,
    discovery,
  })}\n`);
  process.exitCode = status === "ready" ? 0 : 2;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`fonts refresh: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { mergeCatalog, parseTextproto, rawUrl, measureRemote };
