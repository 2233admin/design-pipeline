"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ENVELOPE_SCHEMA = "design-pipeline.design-system-provider-envelope.v1";
const RECEIPT_SCHEMA = "design-pipeline.design-system-provider-receipt.v1";
const SNAPSHOT_SCHEMA = "design-pipeline.design-system-snapshot.v1";
const ALLOWED_TYPES = Object.freeze(["manifest", "component", "docs", "template", "hook"]);
const TIMEOUT_MS = 10_000;
const MIN_TIMEOUT_MS = 10;
const MAX_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 16 * 1024 * 1024;
const profilesFile = path.join(__dirname, "..", "references", "design-system-provider-profiles.json");
const bundledAstryxAdapter = path.join(__dirname, "..", "adapters", "astryx-provider.mjs");
const discoveredAstryxCli = path.join("node_modules", "@astryxdesign", "cli", "clients", "cli", "bin", "astryx.mjs");

function providerError(message, code = "PROVIDER_INVALID", details = {}) {
  const error = new Error(`design-system provider: ${message}`);
  error.code = code;
  error.details = details;
  return error;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function canonicalJson(value) {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function containedExistingFile(root, raw, label) {
  if (typeof raw !== "string" || !raw.trim()) throw providerError(`${label} is required`, "PATH_INVALID");
  const base = fs.realpathSync(path.resolve(root));
  const candidate = path.resolve(root, raw);
  if (!inside(path.resolve(root), candidate) || !fs.existsSync(candidate)) {
    throw providerError(`${label} must be an existing file inside the working root`, "PATH_INVALID");
  }
  const actual = fs.realpathSync(candidate);
  if (!inside(base, actual) || !fs.statSync(actual).isFile()) {
    throw providerError(`${label} resolves outside the working root`, "PATH_ESCAPE");
  }
  return actual;
}

function safeEnvironment(source = process.env) {
  const blocked = /(?:proxy|token|credential|secret|password|passwd|authorization|api[_-]?key)/i;
  return Object.fromEntries(Object.entries(source).filter(([key]) => !blocked.test(key) && !key.startsWith("DESIGN_PIPELINE_")));
}

function executableScript(root, raw, label) {
  const file = containedExistingFile(root, raw, label);
  if (![".js", ".mjs"].includes(path.extname(file).toLowerCase())) throw providerError(`${label} must end in .js or .mjs`, "ADAPTER_DENIED");
  return file;
}

function resolveExecution(options, root, profile) {
  if (options.adapterPath !== undefined) return { adapter: executableScript(root, options.adapterPath, "adapterPath"), providerCli: null };
  if (profile.id !== "astryx") throw providerError("adapterPath is required for this provider", "PATH_INVALID");
  const providerCli = executableScript(root, options.providerCliPath === undefined ? discoveredAstryxCli : options.providerCliPath, "providerCliPath");
  return { adapter: fs.realpathSync(bundledAstryxAdapter), providerCli };
}

function loadProfiles() {
  return JSON.parse(fs.readFileSync(profilesFile, "utf8"));
}

function profileFor(id) {
  const profile = loadProfiles().profiles.find((item) => item.id === id);
  if (!profile) throw providerError(`unknown provider ${id}`, "PROVIDER_UNKNOWN");
  return profile;
}

function validateProviderEnvelope(value, expected) {
  if (!isObject(value)) throw providerError("adapter output must be a JSON object", "ENVELOPE_INVALID");
  const keys = ["schema", "apiVersion", "type", "provider", "data"];
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw providerError("adapter envelope has unsupported or missing properties", "ENVELOPE_INVALID", { extras });
  }
  if (value.schema !== ENVELOPE_SCHEMA) throw providerError(`adapter schema must be ${ENVELOPE_SCHEMA}`, "SCHEMA_UNSUPPORTED");
  if (!ALLOWED_TYPES.includes(value.type) || value.type !== expected.type) throw providerError(`adapter type must be ${expected.type}`, "TYPE_MISMATCH");
  if (value.apiVersion !== expected.apiVersion) throw providerError(`adapter apiVersion must be ${expected.apiVersion}`, "VERSION_MISMATCH");
  if (!isObject(value.provider) || Object.keys(value.provider).some((key) => !["id", "version", "license"].includes(key))) {
    throw providerError("adapter provider metadata is invalid", "ENVELOPE_INVALID");
  }
  for (const key of ["id", "version", "license"]) {
    if (typeof value.provider[key] !== "string" || !value.provider[key].trim()) throw providerError(`adapter provider.${key} is required`, "ENVELOPE_INVALID");
  }
  if (value.provider.id !== expected.profile.id) throw providerError("adapter provider id does not match the selected profile", "PROVIDER_MISMATCH");
  if (value.provider.license !== expected.profile.license) throw providerError("adapter license does not match the provider profile", "LICENSE_MISMATCH");
  if (expected.providerVersion !== undefined && value.provider.version !== expected.providerVersion) throw providerError("adapter provider version changed during acquisition", "VERSION_MISMATCH");
  if (!isObject(value.data)) throw providerError("adapter data must be an object", "ENVELOPE_INVALID");
  if (expected.id !== undefined && value.data.id !== expected.id) throw providerError(`adapter data.id must be ${expected.id}`, "ID_MISMATCH");
  return value;
}

function commandArgs(type, apiVersion, id) {
  if (!ALLOWED_TYPES.includes(type)) throw providerError(`unsupported command type ${String(type)}`, "COMMAND_DENIED");
  if (id !== undefined && (typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(id) || id.includes(".."))) {
    throw providerError("resource id contains unsupported characters", "COMMAND_DENIED");
  }
  return ["--api-version", apiVersion, "--type", type, ...(id === undefined ? [] : ["--id", id])];
}

function runProviderCommand(options) {
  const root = path.resolve(options.root || process.cwd());
  const profile = profileFor(options.providerId || "astryx");
  const apiVersion = options.apiVersion || profile.apiVersions[0];
  if (!profile.apiVersions.includes(apiVersion)) throw providerError(`unsupported apiVersion ${apiVersion}`, "VERSION_UNSUPPORTED");
  if (options.channel === "canary" && profile.canary.default !== "allow") throw providerError("canary provider acquisition is denied by default", "CANARY_DENIED");
  const { adapter, providerCli } = resolveExecution(options, root, profile);
  const timeoutMs = options.timeoutMs === undefined ? (providerCli ? MAX_TIMEOUT_MS : TIMEOUT_MS) : options.timeoutMs;
  if (!Number.isInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    throw providerError(`timeoutMs must be an integer from ${MIN_TIMEOUT_MS} to ${MAX_TIMEOUT_MS}`, "TIMEOUT_INVALID");
  }
  const args = commandArgs(options.type, apiVersion, options.id);
  const environment = safeEnvironment(options.env || process.env);
  if (providerCli) {
    environment.DESIGN_PIPELINE_ASTRYX_CLI_PATH = providerCli;
    environment.DESIGN_PIPELINE_PROVIDER_ROOT = fs.realpathSync(root);
    if (options.providerVersion) environment.DESIGN_PIPELINE_PROVIDER_VERSION = options.providerVersion;
  }
  const result = spawnSync(process.execPath, [adapter, ...args], {
    cwd: root,
    env: environment,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER,
    shell: false,
    windowsHide: true,
  });
  const command = [process.execPath, path.relative(root, adapter), ...args];
  if (result.error) {
    const timedOut = result.error.code === "ETIMEDOUT";
    throw providerError(timedOut ? "adapter timed out" : result.error.message, timedOut ? "ADAPTER_TIMEOUT" : "ADAPTER_FAILED", { command });
  }
  if (result.status !== 0) throw providerError(`adapter exited with status ${result.status}`, "ADAPTER_EXIT", { command, status: result.status });
  let envelope;
  try { envelope = JSON.parse(result.stdout); }
  catch { throw providerError("adapter stdout is not JSON", "ADAPTER_JSON", { command }); }
  validateProviderEnvelope(envelope, { type: options.type, id: options.id, apiVersion, profile, providerVersion: options.providerVersion });
  if (/canary/i.test(envelope.provider.version) && options.allowCanary !== true) throw providerError("canary provider versions are denied by default", "CANARY_DENIED");
  return { envelope, command, sha256: sha256(canonicalJson(envelope)), providerCliSha256: providerCli ? sha256(fs.readFileSync(providerCli)) : null };
}

function selectedIds(type, selections) {
  const requested = selections?.[type];
  if (requested === undefined) return null;
  if (!Array.isArray(requested) || !requested.every((id) => typeof id === "string")) throw providerError(`selections.${type} must be string ids`);
  return [...new Set(requested)].sort();
}

function normalizeSnapshot(snapshot) {
  try {
    const catalog = require("./design-system-catalog-core.cjs");
    if (typeof catalog.normalizeDesignSystemSnapshot !== "function") return null;
    return catalog.normalizeDesignSystemSnapshot(snapshot);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND" && /design-system-catalog-core/.test(error.message)) return null;
    throw error;
  }
}

function collectionItems(records, type) {
  return records.filter((record) => record.envelope.type === type).flatMap((record) => {
    const data = record.envelope.data;
    const items = Array.isArray(data.items) ? data.items : [data];
    return items.map((item) => {
      if (!isObject(item) || typeof item.id !== "string" || !item.id.trim()) throw providerError(`${type} envelope items require ids`, "ENVELOPE_INVALID");
      return typeof item.name === "string" && item.name.trim() ? item : { ...item, name: item.id };
    });
  });
}

function validateSnapshotStatuses(snapshot, allowCanary = false) {
  const prerelease = new Set(["canary", "beta", "experimental"]);
  for (const collection of ["components", "docs", "templates", "hooks"]) {
    for (const entry of snapshot[collection]) {
      if (entry.status === "stable") continue;
      if (allowCanary === true && prerelease.has(entry.status)) continue;
      const status = typeof entry.status === "string" && entry.status ? entry.status : "missing";
      throw providerError(`${collection} ${entry.id} has denied status ${status}`, "STATUS_DENIED", { collection, id: entry.id, status });
    }
  }
  return snapshot;
}

function acquireDesignSystemProvider(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const profile = profileFor(options.providerId || "astryx");
  const apiVersion = options.apiVersion || profile.apiVersions[0];
  const records = [];
  const failures = [];
  let manifest;
  try {
    const first = runProviderCommand({ ...options, root, providerId: profile.id, apiVersion, type: "manifest" });
    records.push(first);
    manifest = first.envelope;
    for (const type of ALLOWED_TYPES.slice(1)) {
      const ids = selectedIds(type, options.selections);
      for (const id of ids === null ? [undefined] : ids) {
        const record = runProviderCommand({ ...options, root, providerId: profile.id, apiVersion, providerVersion: manifest.provider.version, type, ...(id === undefined ? {} : { id }) });
        records.push(record);
      }
    }
    const providerCliHashes = new Set(records.map((record) => record.providerCliSha256).filter(Boolean));
    if (providerCliHashes.size > 1) throw providerError("provider CLI changed during acquisition", "VERSION_MISMATCH");
  } catch (error) {
    failures.push({ code: error.code || "PROVIDER_FAILED", message: error.message, details: error.details || {} });
  }
  const provider = records[0]?.envelope.provider || { id: profile.id, version: null, license: profile.license };
  let snapshot = null;
  let catalog = null;
  if (!failures.length) {
    try {
      snapshot = {
        schema: SNAPSHOT_SCHEMA,
        version: "1",
        namespace: profile.id,
        provenance: {
          source: profile.name,
          url: profile.officialUrl,
          license: provider.license,
          attribution: `${profile.name} ${provider.version}`,
        },
        components: collectionItems(records, "component"),
        docs: [{
          id: "provider-manifest",
          name: `${profile.name} provider manifest`,
          category: "provider",
          status: "stable",
          provider: { id: provider.id, name: profile.name, version: provider.version, apiVersion, repositoryUrl: profile.repositoryUrl },
          runtime: isObject(manifest.data.runtime) ? manifest.data.runtime : profile.compatibility,
          ...(isObject(manifest.data.theme) ? { theme: manifest.data.theme } : {}),
          ...(manifest.data.revision ? { revision: manifest.data.revision } : {}),
        }, ...collectionItems(records, "docs")],
        templates: collectionItems(records, "template"),
        hooks: collectionItems(records, "hook"),
      };
      validateSnapshotStatuses(snapshot, options.allowCanary === true);
      catalog = normalizeSnapshot(snapshot);
    } catch (error) {
      snapshot = null;
      failures.push({ code: error.code || "PROVIDER_FAILED", message: error.message, details: error.details || {} });
    }
  }
  const receipt = {
    schema: RECEIPT_SCHEMA,
    status: failures.length ? "failed" : "complete",
    provider,
    apiVersion,
    commands: records.map(({ command, envelope, sha256: hash }) => ({ type: envelope.type, id: envelope.data.id || null, argv: command, sha256: hash })),
    license: profile.license,
    loss: manifest?.data.loss || [],
    failures,
    providerCliSha256: records.find((record) => record.providerCliSha256)?.providerCliSha256 || null,
    snapshotSha256: snapshot ? sha256(canonicalJson(snapshot)) : null,
  };
  if (options.output) atomicWriteProviderJson(root, options.output, { snapshot, catalog, receipt });
  return { status: receipt.status, snapshot, ...(catalog ? { catalog } : {}), receipt };
}

function atomicWriteProviderJson(root, raw, value) {
  const base = fs.realpathSync(path.resolve(root));
  const target = path.resolve(base, raw);
  if (!inside(base, target)) throw providerError("output must stay inside the working root", "PATH_ESCAPE");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const actualParent = fs.realpathSync(path.dirname(target));
  if (!inside(base, actualParent)) throw providerError("output parent resolves outside the working root", "PATH_ESCAPE");
  const temporary = path.join(actualParent, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  try {
    fs.writeFileSync(temporary, canonicalJson(value), { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return target;
}

module.exports = {
  ALLOWED_TYPES,
  ENVELOPE_SCHEMA,
  MAX_BUFFER,
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
  RECEIPT_SCHEMA,
  TIMEOUT_MS,
  acquireDesignSystemProvider,
  atomicWriteProviderJson,
  loadProfiles,
  runProviderCommand,
  safeEnvironment,
  validateSnapshotStatuses,
  validateProviderEnvelope,
};
