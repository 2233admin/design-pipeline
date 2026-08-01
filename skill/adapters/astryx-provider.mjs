import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const SCHEMA = "design-pipeline.design-system-provider-envelope.v1";
const TYPES = new Set(["manifest", "component", "docs", "template", "hook"]);
const MAX_BUFFER = 16 * 1024 * 1024;

function fail(message) {
  throw new Error(`Astryx provider adapter: ${message}`);
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function requiredLocalCli() {
  const rawRoot = process.env.DESIGN_PIPELINE_PROVIDER_ROOT;
  const rawCli = process.env.DESIGN_PIPELINE_ASTRYX_CLI_PATH;
  if (!rawRoot || !rawCli) fail("validated provider CLI path is required");
  const root = fs.realpathSync(rawRoot);
  const cli = fs.realpathSync(rawCli);
  if (!inside(root, cli) || !fs.statSync(cli).isFile() || ![".js", ".mjs"].includes(path.extname(cli).toLowerCase())) fail("provider CLI must stay inside the working root");
  return cli;
}

function parseArgs() {
  const values = process.argv.slice(2);
  const parsed = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    if (!["--api-version", "--type", "--id"].includes(key) || values[index + 1] === undefined) fail("unsupported provider arguments");
    parsed[key] = values[index + 1];
  }
  if (parsed["--api-version"] !== "1") fail("only apiVersion 1 is supported");
  if (!TYPES.has(parsed["--type"])) fail("unsupported provider command");
  if (parsed["--id"] !== undefined && (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(parsed["--id"]) || parsed["--id"].includes(".."))) fail("invalid resource id");
  return { apiVersion: parsed["--api-version"], type: parsed["--type"], id: parsed["--id"] };
}

function officialJson(cli, args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("DESIGN_PIPELINE_") && !/(?:proxy|token|credential|secret|password|authorization|api[_-]?key)/i.test(key)));
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: process.cwd(), env, encoding: "utf8", timeout: 8_000, maxBuffer: MAX_BUFFER, shell: false, windowsHide: true });
  if (result.error) fail(result.error.code === "ETIMEDOUT" ? "official CLI timed out" : result.error.message);
  if (result.status !== 0) fail(`official CLI exited with status ${result.status}`);
  try { return JSON.parse(result.stdout); }
  catch { fail("official CLI stdout is not JSON"); }
}

function officialPayload(raw, label) {
  if (!object(raw) || String(raw.apiVersion) !== "1" || !Object.hasOwn(raw, "data")) fail(`${label} output must be an apiVersion 1 envelope`);
  return raw.data;
}

function plainItems(raw, label) {
  const payload = officialPayload(raw, label);
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : null;
  if (!items) fail(`${label} output must contain items`);
  return items.map((item) => {
    const value = typeof item === "string" ? { id: item, name: item } : { ...item, id: item?.id || item?.name || item?.topic };
    if (!object(value) || typeof value.id !== "string" || !value.id.trim()) fail(`${label} item requires an id or name`);
    const named = typeof value.name === "string" && value.name.trim() ? value : { ...value, name: value.topic || value.id };
    return named.status === undefined ? { ...named, status: "stable" } : named;
  });
}

function categorizedItems(raw, type) {
  const payload = officialPayload(raw, type);
  const groups = payload?.[type === "hook" ? "hooks" : "components"] || payload?.components;
  if (!object(groups)) fail(`${type} output must contain categorized entries`);
  return Object.entries(groups).flatMap(([category, entries]) => {
    if (!Array.isArray(entries)) fail(`${type} category ${category} must be an array`);
    return entries.map((entry) => {
      if (!object(entry) || typeof entry.name !== "string" || !entry.name.trim()) fail(`${type} entry requires a name`);
      return { ...entry, id: entry.name, category: entry.category || category, ...(entry.status === undefined ? { status: "stable" } : {}) };
    });
  });
}

function mergeVariants(english, zh, dense, label) {
  const zhByName = new Map(zh.map((entry) => [entry.name, entry]));
  const denseByName = new Map(dense.map((entry) => [entry.name, entry]));
  if (zhByName.size !== english.length || denseByName.size !== english.length) fail(`${label} localized output does not match English entries`);
  return english.map((entry) => {
    const zhEntry = zhByName.get(entry.name);
    const denseEntry = denseByName.get(entry.name);
    if (!zhEntry || !denseEntry) fail(`${label} localized output is missing ${entry.name}`);
    return { ...entry, docsZh: zhEntry, docsDense: denseEntry };
  });
}

function select(items, id, label) {
  if (id === undefined) return { items };
  const item = items.find((candidate) => candidate.id === id);
  if (!item) fail(`${label} ${id} was not returned by the official CLI`);
  return item;
}

function manifest(cli) {
  const raw = officialJson(cli, ["manifest", "--json"]);
  const data = officialPayload(raw, "manifest");
  if (!object(data) || typeof data.version !== "string" || !data.version.trim()) fail("official manifest data.version is required");
  return { provider: { id: "astryx", version: data.version, license: "MIT" }, data };
}

function docs(cli, id) {
  if (id !== undefined) {
    const english = officialPayload(officialJson(cli, ["docs", id, "--json"]), `docs ${id}`);
    const zh = officialPayload(officialJson(cli, ["docs", id, "--zh", "--json"]), `docs ${id} --zh`);
    const dense = officialPayload(officialJson(cli, ["docs", id, "--dense", "--json"]), `docs ${id} --dense`);
    if (![english, zh, dense].every(object)) fail(`docs ${id} output is invalid`);
    const normalizedEnglish = english.status === undefined ? { ...english, status: "stable" } : english;
    const normalizedZh = zh.status === undefined ? { ...zh, status: "stable" } : zh;
    const normalizedDense = dense.status === undefined ? { ...dense, status: "stable" } : dense;
    return {
      ...normalizedEnglish,
      id,
      name: english.name || id,
      docsZh: { ...normalizedZh, id, name: zh.name || id },
      docsDense: { ...normalizedDense, id, name: dense.name || id },
    };
  }
  const topics = plainItems(officialJson(cli, ["docs", "--json"]), "docs");
  return { items: topics.map((topic) => ({ ...topic, ...docs(cli, topic.id), id: topic.id })) };
}

function resource(cli, type, id) {
  if (type === "docs") return docs(cli, id);
  if (type === "template") return select(plainItems(officialJson(cli, ["template", "--list", "--json"]), type), id, type);
  const args = (variant) => [type, "--list", "--detail", "full", ...(variant ? [variant] : []), "--json"];
  const items = mergeVariants(
    categorizedItems(officialJson(cli, args(null)), type),
    categorizedItems(officialJson(cli, args("--zh")), type),
    categorizedItems(officialJson(cli, args("--dense")), type),
    type,
  );
  return select(items, id, type);
}

try {
  const request = parseArgs();
  const cli = requiredLocalCli();
  let provider;
  let data;
  if (request.type === "manifest") ({ provider, data } = manifest(cli));
  else {
    const version = process.env.DESIGN_PIPELINE_PROVIDER_VERSION;
    if (!version) fail("manifest provider version is required before resource acquisition");
    provider = { id: "astryx", version, license: "MIT" };
    data = resource(cli, request.type, request.id);
  }
  process.stdout.write(JSON.stringify({ schema: SCHEMA, apiVersion: request.apiVersion, type: request.type, provider, data }));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
