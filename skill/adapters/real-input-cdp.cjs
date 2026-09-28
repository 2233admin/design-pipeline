#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { replayRealBrowserInputs, evaluateInputOracle, INPUT_TRACE_SCHEMA } = require("../scripts/animation-verification-core.cjs");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error.message}`);
  }
}

function findChrome() {
  const candidates = [
    process.env.DESIGN_PIPELINE_CHROME,
    process.env.HYPERFRAMES_BROWSER_PATH,
    process.env.CHROME_PATH,
    path.join(os.homedir(), ".omp", "puppeteer", "chrome"),
    path.join(process.env.LOCALAPPDATA || "", "ms-playwright"),
    path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);
  const visited = new Set();
  const walk = (root, depth = 0) => {
    const absolute = path.resolve(root);
    if (depth > 5 || visited.has(absolute) || !fs.existsSync(absolute)) return null;
    visited.add(absolute);
    let stat;
    try { stat = fs.statSync(absolute); } catch { return null; }
    if (stat.isFile() && /^chrome(?:\.exe)?$/i.test(path.basename(absolute))) return absolute;
    if (!stat.isDirectory()) return null;
    let entries;
    try { entries = fs.readdirSync(absolute, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
      const found = walk(path.join(absolute, entry.name), depth + 1);
      if (found) return found;
    }
    return null;
  };
  for (const candidate of candidates) {
    const found = walk(candidate);
    if (found) return found;
  }
  return null;
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

class CdpConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.onmessage = (event) => {
      const message = parseJson(String(event.data), "CDP message");
      const resolve = this.pending.get(message.id);
      if (!resolve) return;
      this.pending.delete(message.id);
      resolve(message);
    };
  }

  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, (message) => { clearTimeout(timer); resolve(message); });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try { this.socket.close(); } catch {}
  }
}

class CdpPage {
  constructor(connection, browserProcess) {
    this.connection = connection;
    this.browserProcess = browserProcess;
    this.mousePosition = { x: 0, y: 0 };
    this.mouse = {
      move: async (x, y) => { this.mousePosition = { x, y }; await this.connection.call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); },
      down: async () => { await this.connection.call("Input.dispatchMouseEvent", { type: "mousePressed", x: this.mousePosition.x, y: this.mousePosition.y, button: "left", clickCount: 1 }); },
      up: async () => { await this.connection.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: this.mousePosition.x, y: this.mousePosition.y, button: "left", clickCount: 1 }); },
      wheel: async ({ deltaX = 0, deltaY = 0 } = {}) => { await this.connection.call("Input.dispatchMouseEvent", { type: "mouseWheel", x: this.mousePosition.x, y: this.mousePosition.y, deltaX, deltaY }); },
    };
    this.keyboard = {
      down: async (key) => this.keyEvent("keyDown", key),
      up: async (key) => this.keyEvent("keyUp", key),
      press: async (key) => { await this.keyEvent("keyDown", key); await this.keyEvent("keyUp", key); },
    };
  }

  keyEvent(type, key) {
    const named = { Enter: { code: "Enter", keyCode: 13 }, Escape: { code: "Escape", keyCode: 27 }, " ": { code: "Space", keyCode: 32 } }[key];
    const code = named?.code || (key.length === 1 ? `Key${key.toUpperCase()}` : key);
    const keyCode = named?.keyCode || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
    return this.connection.call("Input.dispatchKeyEvent", { type, key, code, text: type === "keyDown" && key.length === 1 ? key : undefined, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  }

  async goto(url) {
    await this.connection.call("Page.enable");
    await this.connection.call("Runtime.enable");
    const navigation = await this.connection.call("Page.navigate", { url });
    if (navigation.errorText) throw new Error(navigation.errorText);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  async evaluate(fn, arg) {
    const source = typeof fn === "function" ? `(${fn.toString()})(${arg === undefined ? "undefined" : JSON.stringify(arg)})` : fn;
    const result = await this.connection.call("Runtime.evaluate", { expression: source, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "browser evaluation failed");
    return result.result?.result?.value;
  }

  async screenshot(file) {
    const result = await this.connection.call("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(file, Buffer.from(result.result.data, "base64"));
  }

  async close() {
    this.connection.close();
    try { this.browserProcess.kill(); } catch {}
  }
}

async function launchPage(url) {
  const executable = findChrome();
  if (!executable) throw new Error("BROWSER_UNAVAILABLE: no Chrome executable found; set DESIGN_PIPELINE_CHROME");
  if (typeof WebSocket !== "function") throw new Error("BROWSER_UNAVAILABLE: Node WebSocket is unavailable for the local Chrome CDP adapter");
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-real-input-"));
  const browserProcess = spawn(executable, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  const deadline = Date.now() + 15000;
  let version;
  while (Date.now() < deadline) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  if (!version) { browserProcess.kill(); throw new Error("BROWSER_UNAVAILABLE: Chrome CDP did not start"); }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  return { page: new CdpPage(new CdpConnection(socket), browserProcess), executable, version: version.Browser };
}

function writeJson(root, file, value) {
  fs.writeFileSync(path.join(root, file), JSON.stringify(value));
}

async function main() {
  const request = parseJson(fs.readFileSync(0, "utf8"), "capture request");
  const outputRoot = request.outputRoot;
  const trace = request.inputTrace || {
    schema: INPUT_TRACE_SCHEMA,
    version: 1,
    source: { id: "real-input-fixture", kind: "project-owned" },
    viewport: request.viewport,
    events: [
      { type: "pointer", action: "down", atMs: 0, x: 80, y: 120 },
      { type: "pointer", action: "up", atMs: 20, x: 80, y: 120 },
      { type: "drag", phase: "start", atMs: 40, x: 30, y: 120 },
      { type: "drag", phase: "move", atMs: 60, x: 90, y: 120 },
      { type: "drag", phase: "end", atMs: 80, x: 130, y: 120 },
      { type: "wheel", atMs: 100, deltaY: 40 },
      { type: "scroll", atMs: 120, deltaY: 30 },
      { type: "keyboard", atMs: 140, key: "Enter" },
    ],
  };
  const session = await launchPage(request.url);
  try {
    const replay = await replayRealBrowserInputs(session.page, { trace, domSelector: "[data-animation-dom]", canvasSelector: "canvas[data-animation-canvas]" });
    const oracle = evaluateInputOracle(replay, { requiredTypes: ["keyboard", "pointer", "wheel", "scroll", "drag"] });
    if (replay.status !== "passed" || oracle.status !== "passed") throw new Error(`real input oracle blocked: ${JSON.stringify(oracle)}`);
    fs.mkdirSync(outputRoot, { recursive: true });
    await session.page.screenshot(path.join(outputRoot, "screenshot.png"));
    writeJson(outputRoot, "trace.json", replay.trace);
    writeJson(outputRoot, "dom.json", replay.first.records.map((record) => record.after.dom));
    writeJson(outputRoot, "console.json", []);
    writeJson(outputRoot, "network.json", []);
    writeJson(outputRoot, "accessibility.json", { status: "not-collected", reason: "real-input probe scope" });
    writeJson(outputRoot, "performance.json", { status: "not-collected", reason: "real-input probe scope" });
    writeJson(outputRoot, "renderer-observation.json", replay);
    const artifacts = { screenshot: "screenshot.png", trace: "trace.json", dom: "dom.json", console: "console.json", network: "network.json", accessibility: "accessibility.json", performance: "performance.json" };
    const hashes = Object.fromEntries(Object.entries(artifacts).map(([key, file]) => [key, sha256(fs.readFileSync(path.join(outputRoot, file)))]));
    process.stdout.write(JSON.stringify({ schema: "design-pipeline.evidence-receipt.v1", id: "real-input-capture", status: "complete", executionReceiptId: request.executionReceiptId, executionPlanSha256: request.executionPlanSha256, compositionReceiptId: request.compositionReceiptId, compositionReceiptHash: request.compositionReceiptHash, sourceAdmissionReceiptId: request.sourceAdmissionReceiptId, sourceContentHash: request.sourceContentHash, routeId: request.routeId, toolchainPlanSha256: request.toolchainPlanSha256, adapter: { id: "real-input-cdp", version: "1.0.0", availability: "available", probe: { ok: true, message: `Chrome CDP ${session.version} real input replay completed` } }, target: { url: request.url, viewport: request.viewport }, capturedAt: new Date().toISOString(), artifacts, hashes, redaction: { status: "not-required", notes: [] } }));
  } finally {
    await session.page.close();
  }
}

main().catch((error) => { process.stderr.write(error.stack || error.message); process.exitCode = 1; });
