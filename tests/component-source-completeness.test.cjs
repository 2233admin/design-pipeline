"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { normalizeDesignSystemSnapshot, searchCatalog } = require("../skill/scripts/design-system-catalog-core.cjs");

const skillRoot = path.resolve(__dirname, "../skill");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(skillRoot, relative), "utf8"));
const isUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

// Independent source identity, not the index's own resolver. GitHub tree/blob URLs
// identify the owning repository; documentation paths remain distinct identities.
function sourceIdentity(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let pathname = url.pathname.replace(/\/+$/, "").replace(/\.git$/i, "");
  if (host === "github.com") pathname = pathname.split("/").slice(0, 3).join("/").toLowerCase();
  return `${host}${pathname}`;
}

function independentSources() {
  const sources = [];
  const add = (url, origin, registryEntry, discovery = {}) => {
    assert.ok(isUrl(url), `${origin} must supply an external source URL`);
    sources.push({ url, origin, registryEntry, ...discovery });
  };
  const vendorRoot = path.join(skillRoot, "vendor");
  const manifests = fs.readdirSync(vendorRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(vendorRoot, entry.name, "manifest.json")))
    .map((entry) => `vendor/${entry.name}/manifest.json`).sort();
  assert.ok(manifests.length >= 13, "all thirteen original vendor bundles must contribute to coverage");
  for (const filename of manifests) {
    const manifest = readJson(filename);
    if (Array.isArray(manifest.packs)) {
      const excluded = new Set((manifest.excluded || []).map(({ id }) => id));
      const packs = manifest.packs.filter(({ id }) => !excluded.has(id));
      assert.ok(packs.length, `${filename} must contribute its non-excluded packs`);
      for (const pack of packs) add(pack.repository, `${filename}#${pack.id}`, undefined, { localPaths: { manifest: filename } });
    } else {
      add(manifest.source.repository, filename, undefined, { localPaths: { manifest: filename } });
    }
  }

  const stack = readJson("references/frontend-stack-registry.json");
  for (const collection of ["uiLibraries", "tools"]) {
    assert.ok(stack[collection].length, `stack.${collection} must not be empty`);
    for (const entry of stack[collection].filter(({ source }) => isUrl(source))) {
      add(entry.source, `frontend-stack-registry.json#${collection}/${entry.id}`, entry);
      if (isUrl(entry.repository)) add(entry.repository, `frontend-stack-registry.json#${entry.id}/repository`, entry);
    }
  }
  const providers = readJson("references/component-providers.json").providers;
  assert.ok(providers.some(({ source }) => isUrl(source)), "external component providers must contribute sources");
  for (const entry of providers.filter(({ source }) => isUrl(source))) add(entry.source, `component-providers.json#${entry.id}`, entry);

  const profiles = readJson("references/companion-capabilities.json").profiles;
  assert.ok(profiles.length, "companion profiles must contribute sources");
  for (const entry of profiles) {
    const urls = new Set([entry.source, entry.sourceMeta?.url].filter(isUrl));
    for (const url of urls) add(url, `companion-capabilities.json#${entry.id}`, entry);
  }
  const designProfiles = readJson("references/design-system-provider-profiles.json").profiles;
  assert.ok(designProfiles.length, "design-system profiles must contribute sources");
  for (const entry of designProfiles) {
    const discovery = { group: `design-system-provider-profiles.json#${entry.id}` };
    add(entry.repositoryUrl, `${discovery.group}/repository`, undefined, discovery);
    add(entry.officialUrl, `${discovery.group}/documentation`, undefined, discovery);
  }
  add(readJson("references/astryx-design-system-snapshot.json").provenance.url, "astryx-design-system-snapshot.json", undefined, { localPaths: { catalog: "references/astryx-design-system-snapshot.json" } });
  add(readJson("references/prompt-motion/source-index.json").source.url, "prompt-motion/source-index.json", undefined, { localPaths: { catalog: "references/prompt-motion/source-index.json" } });
  const hyperframes = fs.readFileSync(path.join(skillRoot, "references/hyperframes.md"), "utf8");
  const sourceLine = hyperframes.match(/^- Source:\s*(https?:\/\/\S+)/m);
  assert.ok(sourceLine, "HyperFrames guide must declare its authoritative source");
  add(sourceLine[1], "hyperframes.md", undefined, { localPaths: { guide: "references/hyperframes.md" } });
  return sources;
}

function loadIndex() {
  return normalizeDesignSystemSnapshot(readJson("references/component-source-catalog.json"));
}

function sourceUrls(record) {
  const aliases = record.aliases || [];
  assert.ok(Array.isArray(aliases), `${record.id}.aliases must be an array`);
  for (const alias of aliases) {
    assert.ok(isUrl(alias), `${record.id}.aliases must contain HTTP(S) URLs`);
    assert.ok(new URL(alias).hostname, `${record.id}.aliases contains an invalid URL`);
  }
  return [record.provenance.url, ...aliases].filter(isUrl);
}

function requirePackagedPath(value, label, allowDirectory = false) {
  assert.equal(typeof value, "string", `${label} must be a local path string`);
  assert.ok(value.length && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value), `${label} must be package-relative`);
  const resolved = path.resolve(skillRoot, value.replace(/\\/g, "/"));
  const relative = path.relative(skillRoot, resolved);
  assert.ok(relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `${label} escapes skill/`);
  assert.ok(fs.existsSync(resolved), `${label} does not exist: ${value}`);
  assert.ok(allowDirectory || fs.statSync(resolved).isFile(), `${label} must point to a file`);
  const realRelative = path.relative(fs.realpathSync(skillRoot), fs.realpathSync(resolved));
  assert.ok(realRelative !== ".." && !realRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(realRelative), `${label} resolves outside skill/`);
}

test("every original inventory source is discoverable and registry sourceIds resolve to its canonical record", () => {
  const catalog = loadIndex();
  const records = searchCatalog(catalog).filter(({ recordType }) => recordType === "source");
  const missing = [];
  const groups = new Map();
  for (const expected of independentSources()) {
    const matches = records.filter((record) => sourceUrls(record).some((url) => sourceIdentity(url) === sourceIdentity(expected.url)));
    if (matches.length !== 1) {
      missing.push(`${expected.origin}: ${expected.url} (${matches.length} canonical sources)`);
      continue;
    }
    const record = matches[0];
    assert.ok(record.sourceId, `${expected.origin} needs a canonical sourceId`);
    if (expected.registryEntry) assert.equal(expected.registryEntry.sourceId, record.sourceId, `${expected.origin} must reference the canonical sourceId`);
    if (expected.group) {
      if (groups.has(expected.group)) assert.equal(record.sourceId, groups.get(expected.group), `${expected.group} URLs must share one source identity`);
      groups.set(expected.group, record.sourceId);
    }
    for (const [key, value] of Object.entries(expected.localPaths || {})) {
      assert.equal(record.localPaths?.[key], value, `${expected.origin} must link its original ${key}`);
    }
    assert.ok(searchCatalog(catalog, { query: record.sourceId }).some(({ id }) => id === record.id), `${expected.origin} is missing from public source search`);
  }
  assert.deepEqual(missing, [], `independently derived sources missing from consumer catalog:\n${missing.join("\n")}`);
});

test("every index local pointer exists and resolves within the packaged skill root", () => {
  const catalog = loadIndex();
  let checked = 0;
  for (const record of catalog.entries) {
    assert.ok(record.localPaths && typeof record.localPaths === "object" && !Array.isArray(record.localPaths), `${record.id} needs explicit localPaths`);
    for (const [key, value] of Object.entries(record.localPaths)) {
      assert.ok(["guide", "manifest", "catalog", "implementation"].includes(key), `${record.id} has an unrecognized local pointer: ${key}`);
      requirePackagedPath(value, `${record.id}.localPaths.${key}`, key === "implementation");
      checked += 1;
    }
    if (record.path !== undefined) { requirePackagedPath(record.path, `${record.id}.path`); checked += 1; }
    for (const [index, file] of (record.files || []).entries()) {
      requirePackagedPath(file.path, `${record.id}.files[${index}].path`);
      checked += 1;
    }
  }
  assert.ok(checked > 0, "packaged sources must expose local discovery pointers");
});

test("record IDs and canonical sourceIds are unique and normalized source identities are never registered twice", () => {
  const { entries } = loadIndex();
  const sources = entries.filter(({ recordType }) => recordType === "source");
  assert.ok(sources.length, "index must contain canonical source records");
  assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length, "record IDs must be unique");
  assert.equal(new Set(sources.map(({ sourceId }) => sourceId)).size, sources.length, "canonical sourceIds must be unique");
  const identities = new Map();
  for (const record of sources) {
    assert.equal(typeof record.sourceId, "string", `${record.id} needs sourceId`);
    assert.ok(record.sourceId.trim(), `${record.id} sourceId must not be empty`);
    for (const identity of new Set(sourceUrls(record).map(sourceIdentity))) {
      assert.ok(!identities.has(identity), `${identity} is registered by both ${identities.get(identity)} and ${record.sourceId}`);
      identities.set(identity, record.sourceId);
    }
  }
  const bySourceId = new Map(sources.map((record) => [record.sourceId, record]));
  for (const record of entries) {
    const source = bySourceId.get(record.sourceId);
    assert.ok(source, `${record.id} points to an unregistered sourceId ${record.sourceId}`);
    if (record.recordType === "source") continue;
    const repository = record.provenance.repository;
    if (isUrl(repository)) {
      assert.ok(sourceUrls(source).some((url) => sourceIdentity(url) === sourceIdentity(repository)), `${record.id} sourceId must identify its original repository`);
    } else if (isUrl(record.provenance.url)) {
      const componentUrl = new URL(record.provenance.url);
      assert.ok(sourceUrls(source).some((url) => {
        const sourceUrl = new URL(url);
        return sourceIdentity(url) === sourceIdentity(record.provenance.url)
          || (sourceUrl.origin === componentUrl.origin && componentUrl.pathname.startsWith(`${sourceUrl.pathname.replace(/\/+$/, "")}/`));
      }), `${record.id} sourceId must identify its original documentation source`);
    }
    assert.equal(record.license.state, source.license.state, `${record.id} must use the canonical source's license state`);
    assert.equal(record.license.id, source.license.id, `${record.id} must use the canonical source's license identifier`);
  }
});

test("source records declare an external URL or ownership boundary and explicit license evidence with safe availability", () => {
  const { entries } = loadIndex();
  const sources = entries.filter(({ recordType }) => recordType === "source");
  assert.ok(sources.length, "index must contain canonical source records");
  const states = new Set(["verified", "unverified", "commercial", "project-owned", "platform"]);
  for (const record of entries) {
    assert.ok(["source", "component", "method", "template"].includes(record.recordType), `${record.id} needs explicit recordType`);
    assert.ok(["bundled-implementation", "reference-link", "metadata-only", "project-owned"].includes(record.availability), `${record.id} needs explicit availability`);
    assert.ok(states.has(record.license?.state), `${record.id} needs an explicit license state`);
    assert.ok(Array.isArray(record.license.evidence) && record.license.evidence.length && record.license.evidence.every((evidence) => typeof evidence === "string" && evidence.trim()), `${record.id} needs nonempty license evidence`);
    if (["unverified", "commercial"].includes(record.license.state)) {
      assert.ok(["reference-link", "metadata-only"].includes(record.availability), `${record.id} must not offer uncertain/commercial code as bundled implementation`);
      assert.ok(!["package", "registry-copy"].includes(record.routing?.mode), `${record.id} must remain study/reimplementation only`);
      for (const key of ["package", "install"]) assert.equal(record.routing?.[key], undefined, `${record.id} must not publish executable adoption metadata`);
      assert.equal(record.provenance.sourceCode, undefined, `${record.id} must not publish a code-copy pointer`);
    }
  }
  for (const record of sources) {
    assert.ok(isUrl(record.provenance.url) || ["project-owned", "platform"].includes(record.license.state), `${record.id} needs a source URL or explicit ownership boundary`);
  }
});

test("MengTo discovery projection is equivalent to the pinned original vendor manifest", () => {
  const manifest = readJson("vendor/mengto-skills/manifest.json");
  const projection = readJson("references/mengto-skills-catalog.json");
  assert.equal(sourceIdentity(projection.source), sourceIdentity(manifest.source.repository));
  assert.equal(projection.revision, manifest.source.revision, "projection must follow the bundled revision");
  assert.equal(projection.license, manifest.source.license);
  assert.equal(projection.count, manifest.skills.length);
  const categories = {};
  for (const skill of manifest.skills) (categories[skill.category] ||= []).push(skill.name);
  for (const names of Object.values(categories)) names.sort();
  const projectedCategories = Object.fromEntries(Object.entries(projection.categories).map(([category, names]) => [category, [...names].sort()]));
  assert.deepEqual(projectedCategories, categories, "category membership must equal the original manifest, not just its count");
  for (const [route, names] of Object.entries(projection.routes)) {
    for (const name of names) assert.ok(manifest.skills.some((skill) => skill.name === name), `${route} points to an absent bundled skill: ${name}`);
  }
});
