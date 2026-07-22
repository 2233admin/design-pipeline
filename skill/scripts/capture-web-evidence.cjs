#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateReceipt } = require("./evidence-core.cjs");
const { fail, jsonResult, pathInside } = require("./contract-utils.cjs");

function parseArgs(argv) {
  const allowed = new Set(["--project-root", "--adapter-path", "--output-root", "--url", "--width", "--height", "--timeout-ms", "--playwright-module"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!allowed.has(name)) fail("evidence capture", `unknown option ${name}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("evidence capture", `${name} requires a value`);
    if (Object.hasOwn(result, name)) fail("evidence capture", `${name} may be provided only once`);
    result[name] = value;
    index += 1;
  }
  return result;
}

function required(options, name) {
  return options[name] || fail("evidence capture", `${name} is required`);
}

function positiveInteger(value, name, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) fail("evidence capture", `${name} must be an integer from 1 to ${maximum}`);
  return parsed;
}

function nearestExisting(target) {
  let current = target;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) fail("evidence capture", `no existing parent for ${target}`);
    current = parent;
  }
  return current;
}

function containedOutput(projectRoot, raw) {
  const outputRoot = path.resolve(raw);
  if (!pathInside(projectRoot, outputRoot) || outputRoot === projectRoot) fail("evidence capture", "--output-root must stay below --project-root");
  const existing = nearestExisting(path.dirname(outputRoot));
  const realParent = fs.realpathSync(existing);
  if (!pathInside(projectRoot, realParent)) fail("evidence capture", "--output-root resolves outside --project-root");
  if (fs.existsSync(outputRoot)) fail("evidence capture", "--output-root already exists");
  return outputRoot;
}

function validatedUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { fail("evidence capture", "--url must be a URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) fail("evidence capture", "--url must be credential-free HTTP(S)");
  return url.href;
}

function optionalModule(projectRoot, raw) {
  if (!raw) return null;
  const candidate = path.resolve(raw);
  if (!fs.existsSync(candidate)) fail("evidence capture", "--playwright-module does not exist");
  const real = fs.realpathSync(candidate);
  if (!pathInside(projectRoot, real)) fail("evidence capture", "--playwright-module must stay inside --project-root");
  return real;
}

function capture(options) {
  const projectRoot = fs.realpathSync(path.resolve(options["--project-root"] || process.cwd()));
  const adapterPath = fs.realpathSync(path.resolve(required(options, "--adapter-path")));
  if (!fs.statSync(adapterPath).isFile()) fail("evidence capture", "--adapter-path must be a file");
  const outputRoot = containedOutput(projectRoot, required(options, "--output-root"));
  const width = positiveInteger(options["--width"] || 1280, "--width", 16384);
  const height = positiveInteger(options["--height"] || 720, "--height", 16384);
  const timeout = positiveInteger(options["--timeout-ms"] || 30000, "--timeout-ms", 300000);
  const url = validatedUrl(required(options, "--url"));
  const playwrightModule = optionalModule(projectRoot, options["--playwright-module"]);
  const stage = `${outputRoot}.tmp-${process.pid}`;
  if (fs.existsSync(stage)) fail("evidence capture", `stale capture stage exists: ${stage}`);
  fs.mkdirSync(path.dirname(outputRoot), { recursive: true });
  if (!pathInside(projectRoot, fs.realpathSync(path.dirname(outputRoot)))) fail("evidence capture", "--output-root parent resolves outside --project-root");
  fs.mkdirSync(stage);
  try {
    const request = { schema: "design-pipeline.web-evidence-request.v1", url, viewport: { width, height }, outputRoot: stage };
    const env = {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || "",
      TEMP: stage,
      TMP: stage,
      DESIGN_PIPELINE_ADAPTER: "1",
      ...(playwrightModule ? { DESIGN_PIPELINE_PLAYWRIGHT_MODULE: playwrightModule } : {}),
    };
    const child = spawnSync(process.execPath, [adapterPath], { input: JSON.stringify(request), encoding: "utf8", env, timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    if (child.error) fail("evidence capture", child.error.message, { code: child.error.code === "ETIMEDOUT" ? "ADAPTER_TIMEOUT" : "ADAPTER_FAILED" });
    if (child.status !== 0) fail("evidence capture", `adapter exited ${child.status}: ${(child.stderr || "").trim()}`, { code: "ADAPTER_FAILED" });
    let parsed;
    try { parsed = JSON.parse(child.stdout); } catch (error) { fail("evidence capture", `adapter returned invalid JSON: ${error.message}`, { code: "ADAPTER_FAILED" }); }
    const receipt = validateReceipt(parsed, { evidenceRoot: stage, requireFiles: true });
    if (receipt.target.url !== url || receipt.target.viewport.width !== width || receipt.target.viewport.height !== height) {
      fail("evidence capture", "adapter receipt target does not match the capture request", { code: "ADAPTER_FAILED" });
    }
    if (fs.existsSync(outputRoot)) fail("evidence capture", "--output-root appeared during capture");
    fs.renameSync(stage, outputRoot);
    return receipt;
  } finally {
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
  }
}

try {
  const receipt = capture(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(jsonResult(true, { status: receipt.status, receipt }))}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`);
  process.exitCode = 1;
}

module.exports = { capture, containedOutput, parseArgs, validatedUrl };
