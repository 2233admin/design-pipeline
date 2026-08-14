#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { fail, pathInside, sortValue } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.vite-devtools-receipt.v1";
const STATE = "vite-devtools-state.json";

function parse(argv) {
  const command = argv[0];
  if (!["probe", "start", "stop", "build"].includes(command)) fail("vite devtools", "command must be probe, start, stop, or build");
  const allowed = new Set(["--project-root", "--output-root", "--config", "--host", "--port", "--base", "--timeout-ms"]);
  const options = {};
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!allowed.has(key) || !value || value.startsWith("--") || Object.hasOwn(options, key)) fail("vite devtools", `invalid option ${key}`);
    options[key] = value;
  }
  return { command, options };
}

function integer(raw, label, fallback, minimum, maximum) {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) fail("vite devtools", `${label} must be an integer from ${minimum} to ${maximum}`);
  return value;
}

function roots(options, requireOutput = false) {
  const projectRoot = fs.realpathSync(path.resolve(options["--project-root"] || process.cwd()));
  const rawOutput = options["--output-root"];
  if (requireOutput && !rawOutput) fail("vite devtools", "--output-root is required");
  const outputRoot = rawOutput ? path.resolve(projectRoot, rawOutput) : null;
  if (outputRoot && (!pathInside(projectRoot, outputRoot) || outputRoot === projectRoot)) fail("vite devtools", "--output-root must stay below --project-root");
  return { projectRoot, outputRoot };
}

function localPackage(projectRoot, name, required = false) {
  const file = path.join(projectRoot, "node_modules", ...name.split("/"), "package.json");
  if (!fs.existsSync(file)) {
    if (required) fail("vite devtools", `${name} is not installed in the target project`);
    return null;
  }
  const real = fs.realpathSync(file);
  if (!pathInside(projectRoot, real)) fail("vite devtools", `${name} resolves outside the target project`);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(real, "utf8")); } catch (error) { fail("vite devtools", `${name} package metadata is invalid: ${error.message}`); }
  return { directory: path.dirname(real), manifest, version: String(manifest.version || "unknown") };
}

function executable(projectRoot) {
  const pkg = localPackage(projectRoot, "@vitejs/devtools", true);
  const relative = typeof pkg.manifest.bin === "string" ? pkg.manifest.bin : pkg.manifest.bin?.["vite-devtools"];
  if (typeof relative !== "string" || !relative) fail("vite devtools", "@vitejs/devtools does not publish the vite-devtools binary");
  const file = path.resolve(pkg.directory, relative);
  if (!pathInside(pkg.directory, file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) fail("vite devtools", "vite-devtools binary is missing or escapes its package");
  return { file, version: pkg.version };
}

function versions(projectRoot) {
  return sortValue({
    devtools: localPackage(projectRoot, "@vitejs/devtools")?.version || null,
    vite: localPackage(projectRoot, "vite")?.version || null,
    vitePlus: localPackage(projectRoot, "vite-plus")?.version || null,
  });
}

function hash(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function receipt(command, projectRoot, status, details = {}) {
  return sortValue({ schema: SCHEMA, command, status, projectRoot, completedAt: new Date().toISOString(), versions: versions(projectRoot), ...details });
}

function containedConfig(projectRoot, raw) {
  if (!raw) return null;
  const file = path.resolve(projectRoot, raw);
  if (!pathInside(projectRoot, file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) fail("vite devtools", "--config must be a project-contained file");
  return file;
}

function requestOk(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => { response.resume(); resolve(response.statusCode >= 200 && response.statusCode < 500); });
    request.setTimeout(500, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

async function waitFor(url, child, timeout) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (child.exitCode !== null) return false;
    if (await requestOk(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

function prepareOutput(projectRoot, outputRoot, allowExisting = false) {
  const parent = path.dirname(outputRoot);
  fs.mkdirSync(parent, { recursive: true });
  if (!pathInside(projectRoot, fs.realpathSync(parent))) fail("vite devtools", "--output-root parent resolves outside the target project");
  if (fs.existsSync(outputRoot) && !allowExisting) fail("vite devtools", "--output-root already exists");
  fs.mkdirSync(outputRoot, { recursive: allowExisting });
}

async function start(options) {
  const { projectRoot, outputRoot } = roots(options, true);
  prepareOutput(projectRoot, outputRoot);
  const binary = executable(projectRoot);
  const host = options["--host"] || "127.0.0.1";
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) fail("vite devtools", "--host must be loopback");
  const port = integer(options["--port"], "--port", 9999, 1024, 65535);
  const timeout = integer(options["--timeout-ms"], "--timeout-ms", 15000, 100, 300000);
  const config = containedConfig(projectRoot, options["--config"]);
  const stdout = path.join(outputRoot, "stdout.log");
  const stderr = path.join(outputRoot, "stderr.log");
  const outFd = fs.openSync(stdout, "a");
  const errFd = fs.openSync(stderr, "a");
  const args = [binary.file, "--root", projectRoot, "--host", host, "--port", String(port), "--no-open", ...(config ? ["--config", config] : [])];
  const child = spawn(process.execPath, args, { cwd: projectRoot, detached: true, windowsHide: true, stdio: ["ignore", outFd, errFd], env: { PATH: process.env.PATH || "", SYSTEMROOT: process.env.SYSTEMROOT || "" } });
  fs.closeSync(outFd); fs.closeSync(errFd);
  const url = `http://${host === "::1" ? "[::1]" : host}:${port}/__devtools/`;
  if (!(await waitFor(url, child, timeout))) {
    try { process.kill(child.pid); } catch {}
    fail("vite devtools", `server did not become ready; inspect ${path.relative(projectRoot, stderr)}`);
  }
  child.unref();
  const state = { schema: SCHEMA, pid: child.pid, url, host, port, version: binary.version, startedAt: new Date().toISOString(), stdout: path.relative(outputRoot, stdout), stderr: path.relative(outputRoot, stderr) };
  fs.writeFileSync(path.join(outputRoot, STATE), `${JSON.stringify(sortValue(state), null, 2)}\n`);
  return receipt("start", projectRoot, "complete", { url, pid: child.pid, outputRoot: path.relative(projectRoot, outputRoot), artifacts: [{ type: "state", path: path.relative(projectRoot, path.join(outputRoot, STATE)), sha256: hash(path.join(outputRoot, STATE)) }] });
}

function stop(options) {
  const { projectRoot, outputRoot } = roots(options, true);
  if (!fs.existsSync(outputRoot)) fail("vite devtools", "--output-root does not exist");
  const stateFile = path.join(outputRoot, STATE);
  if (!fs.existsSync(stateFile)) fail("vite devtools", "Vite DevTools state is missing");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  if (!Number.isInteger(state.pid) || state.pid < 1) fail("vite devtools", "Vite DevTools state has an invalid pid");
  let stopped = true;
  try { process.kill(state.pid); } catch (error) { if (error.code !== "ESRCH") throw error; stopped = false; }
  const stoppedAt = new Date().toISOString();
  fs.writeFileSync(stateFile, `${JSON.stringify(sortValue({ ...state, stoppedAt }), null, 2)}\n`);
  return receipt("stop", projectRoot, "complete", { pid: state.pid, stopped, url: state.url, outputRoot: path.relative(projectRoot, outputRoot) });
}

function build(options) {
  const { projectRoot, outputRoot } = roots(options, true);
  prepareOutput(projectRoot, outputRoot);
  const binary = executable(projectRoot);
  const config = containedConfig(projectRoot, options["--config"]);
  const base = options["--base"] || "/";
  if (!base.startsWith("/") || base.includes("\\")) fail("vite devtools", "--base must be a URL path");
  const buildRoot = path.join(outputRoot, "static");
  const args = [binary.file, "build", "--root", projectRoot, "--outDir", buildRoot, "--base", base, ...(config ? ["--config", config] : [])];
  const child = spawnSync(process.execPath, args, { cwd: projectRoot, encoding: "utf8", windowsHide: true, timeout: integer(options["--timeout-ms"], "--timeout-ms", 120000, 100, 300000), maxBuffer: 4 * 1024 * 1024, env: { PATH: process.env.PATH || "", SYSTEMROOT: process.env.SYSTEMROOT || "" } });
  fs.writeFileSync(path.join(outputRoot, "stdout.log"), child.stdout || "");
  fs.writeFileSync(path.join(outputRoot, "stderr.log"), child.stderr || "");
  if (child.error || child.status !== 0) fail("vite devtools", child.error?.message || `build exited ${child.status}`);
  const artifacts = ["stdout.log", "stderr.log"].map((name) => ({ type: "log", path: path.relative(projectRoot, path.join(outputRoot, name)), sha256: hash(path.join(outputRoot, name)) }));
  return receipt("build", projectRoot, "complete", { outputRoot: path.relative(projectRoot, outputRoot), staticRoot: path.relative(projectRoot, buildRoot), artifacts });
}

async function main() {
  const { command, options } = parse(process.argv.slice(2));
  const projectRoot = roots(options).projectRoot;
  const result = command === "probe" ? receipt("probe", projectRoot, versions(projectRoot).devtools ? "complete" : "unavailable") : command === "start" ? await start(options) : command === "stop" ? stop(options) : build(options);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
