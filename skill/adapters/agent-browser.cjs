#!/usr/bin/env node
"use strict";

// Web evidence adapter over vercel-labs/agent-browser (Apache-2.0): one isolated session and one
// `batch --json` call fill every artifact of the v1 evidence receipt. The executable and the
// browser come only from the host's explicit options, never from ambient discovery: inside the
// bounded adapter environment agent-browser finds no browser on its own (measured 2026-10-06).

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");

const ARTIFACTS = {
  screenshot: "page.png",
  trace: "trace.json.gz",
  dom: "page.html",
  console: "console.json",
  network: "network.json",
  accessibility: "accessibility.json",
  performance: "performance.json",
};
const IDLE_TIMEOUT = "2m";

function tool() {
  const bin = process.env.DESIGN_PIPELINE_AGENT_BROWSER;
  if (!bin || !path.isAbsolute(bin)) throw new Error("DESIGN_PIPELINE_AGENT_BROWSER must be an explicit absolute path");
  // Windows npm shims (.cmd) need a shell, which would also route the capture URL through it.
  if (/\.(cmd|bat|ps1)$/i.test(bin)) throw new Error("DESIGN_PIPELINE_AGENT_BROWSER must not be a shell shim; pass node_modules/agent-browser/bin/agent-browser.js or the native executable");
  // The npm wrapper (bin/agent-browser.js) picks the native binary for this platform.
  return /\.[cm]?js$/i.test(bin) ? { command: process.execPath, prefix: [bin] } : { command: bin, prefix: [] };
}

function run(args, input) {
  const { command, prefix } = tool();
  const child = spawnSync(command, [...prefix, ...args], { input, encoding: "utf8", env: process.env, windowsHide: true, maxBuffer: 64 << 20 });
  if (child.error) throw child.error;
  return child;
}

function version() {
  const child = run(["--version"]);
  const match = /(\d+\.\d+\.\d+\S*)/.exec(child.stdout || "");
  if (child.status !== 0 || !match) throw new Error(`agent-browser --version failed: ${(child.stderr || child.stdout || "").trim()}`);
  return match[1];
}

function withoutLifecycle(result) {
  const { lifecycle, ...rest } = result || {};
  return rest;
}

function capture(request, session, chrome) {
  const stage = request.outputRoot;
  const rawTrace = path.join(stage, "trace.json");
  const steps = [
    ["blank", ["open", "about:blank"]],
    ["viewport", ["set", "viewport", String(request.viewport.width), String(request.viewport.height)]],
    ["traceStart", ["trace", "start"]],
    ["navigate", ["open", request.url]],
    ["idle", ["wait", "--load", "networkidle"]],
    ["screenshot", ["screenshot", path.join(stage, ARTIFACTS.screenshot), "--full"]],
    ["dom", ["eval", "document.documentElement.outerHTML"]],
    ["console", ["console"]],
    ["errors", ["errors"]],
    ["network", ["network", "requests"]],
    ["a11y", ["a11y"]],
    ["vitals", ["vitals"]],
    ["traceStop", ["trace", "stop", rawTrace]],
  ];
  // The host kills the adapter on timeout before `close` can run; the idle timeout then shuts the
  // orphaned daemon and its browser down instead of the default one hour.
  const launch = ["--session", session, "--idle-timeout", IDLE_TIMEOUT, ...(chrome ? ["--executable-path", chrome] : [])];
  const child = run([...launch, "batch", "--json"], JSON.stringify(steps.map(([, command]) => command)));
  let results;
  try { results = JSON.parse(child.stdout); } catch { throw new Error(`agent-browser batch returned no JSON (exit ${child.status}): ${(child.stderr || "").trim()}`); }
  if (!Array.isArray(results)) throw new Error("agent-browser batch output must be an array");

  // Batch results come back in command order; a missing or unsuccessful entry is a failed step.
  const outcome = new Map(steps.map(([id, command], index) => {
    const entry = results[index];
    const ok = Boolean(entry && entry.success === true && Array.isArray(entry.command) && entry.command[0] === command[0]);
    return [id, ok ? withoutLifecycle(entry.result) : null];
  }));
  const failed = steps.filter(([id]) => outcome.get(id) === null).map(([, command]) => command.slice(0, 2).join(" "));
  const write = (key, content) => fs.writeFileSync(path.join(stage, ARTIFACTS[key]), content);
  const artifacts = Object.fromEntries(Object.keys(ARTIFACTS).map((key) => [key, null]));

  if (outcome.get("screenshot") && fs.existsSync(path.join(stage, ARTIFACTS.screenshot))) artifacts.screenshot = ARTIFACTS.screenshot;

  const dom = outcome.get("dom");
  if (dom && typeof dom.result === "string") {
    write("dom", dom.result);
    artifacts.dom = ARTIFACTS.dom;
  }

  const consoleResult = outcome.get("console");
  const errorsResult = outcome.get("errors");
  if (consoleResult && errorsResult) {
    const messages = (consoleResult.messages || []).map(({ type, text }) => ({ type, text }));
    const pageErrors = (errorsResult.errors || []).map(({ text }) => ({ type: "pageerror", text }));
    write("console", JSON.stringify([...messages, ...pageErrors], null, 2));
    artifacts.console = ARTIFACTS.console;
  }

  const network = outcome.get("network");
  if (network) {
    const requests = (network.requests || []).map(({ method, url, status, resourceType, mimeType }) => ({ method, url, status, resourceType, mimeType }));
    write("network", JSON.stringify(requests, null, 2));
    artifacts.network = ARTIFACTS.network;
  }

  const a11y = outcome.get("a11y");
  if (a11y) {
    const { axeVersion, counts, violations, incomplete } = a11y;
    write("accessibility", JSON.stringify({ axeVersion, counts, violations, incomplete }, null, 2));
    artifacts.accessibility = ARTIFACTS.accessibility;
  }

  const vitals = outcome.get("vitals");
  if (vitals) {
    write("performance", JSON.stringify(vitals, null, 2));
    artifacts.performance = ARTIFACTS.performance;
  }

  if (outcome.get("traceStop") && fs.existsSync(rawTrace)) {
    write("trace", zlib.gzipSync(fs.readFileSync(rawTrace)));
    artifacts.trace = ARTIFACTS.trace;
  }
  if (fs.existsSync(rawTrace)) fs.rmSync(rawTrace);
  return { artifacts, failed };
}

function main() {
  const request = JSON.parse(fs.readFileSync(0, "utf8"));
  const chrome = process.env.DESIGN_PIPELINE_CHROME || null;
  if (chrome && !path.isAbsolute(chrome)) throw new Error("DESIGN_PIPELINE_CHROME must be an absolute path");
  const toolVersion = version();
  const session = `dp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  let outcome;
  let closed = false;
  try {
    outcome = capture(request, session, chrome);
  } finally {
    closed = run(["--session", session, "close"]).status === 0;
  }
  const { artifacts, failed } = outcome;
  // A failed close does not change what was captured, so it does not make the receipt partial; the
  // probe message names it, and the session's idle timeout still shuts the browser down.
  const notes = [
    failed.length ? `agent-browser commands failed: ${failed.join(", ")}` : "agent-browser capture completed",
    ...(closed ? [] : [`close failed; the session shuts down after the ${IDLE_TIMEOUT} idle timeout`]),
  ];
  const hashes = {};
  for (const [key, name] of Object.entries(artifacts)) {
    if (name) hashes[key] = crypto.createHash("sha256").update(fs.readFileSync(path.join(request.outputRoot, name))).digest("hex");
  }
  // A failed navigation or idle wait means the artifacts may show the wrong page.
  const complete = failed.length === 0 && Object.values(artifacts).every(Boolean);
  process.stdout.write(JSON.stringify({
    schema: "design-pipeline.evidence-receipt.v1",
    id: `web-${Date.now()}`,
    status: complete ? "complete" : "partial",
    adapter: {
      id: "agent-browser",
      version: toolVersion,
      availability: "available",
      probe: { ok: true, message: notes.join("; ") },
    },
    target: { url: request.url, viewport: request.viewport },
    capturedAt: new Date().toISOString(),
    artifacts,
    hashes,
    redaction: artifacts.network
      ? { status: "applied", notes: ["network.json keeps method, url, status, resourceType and mimeType; request and response headers are removed"] }
      : { status: "not-required", notes: [] },
  }));
}

try {
  main();
} catch (error) {
  process.stderr.write(error.stack || error.message);
  process.exitCode = 1;
}
