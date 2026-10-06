"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const capture = path.resolve(__dirname, "../skill/scripts/capture-web-evidence.cjs");
const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const adapter = path.resolve(__dirname, "../skill/adapters/agent-browser.cjs");

// A stand-in for the agent-browser CLI. The capture host passes a bounded environment, so the fake
// reads its behavior from fake-config.json beside it and appends every call to calls.log.
const FAKE = String.raw`
const fs = require("node:fs");
const path = require("node:path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "fake-config.json"), "utf8"));
const args = process.argv.slice(2);
fs.appendFileSync(path.join(__dirname, "calls.log"), JSON.stringify(args) + "\n");
if (args[0] === "--version") { process.stdout.write("agent-browser 0.38.2\n"); process.exit(0); }
if (args.includes("close")) { process.stdout.write("closed\n"); process.exit(0); }
if (config.crash) { process.stderr.write("daemon failed to start"); process.exit(1); }
const commands = JSON.parse(fs.readFileSync(0, "utf8"));
const lifecycle = { reused: true };
const payload = {
  open: (c) => ({ url: c[1] }),
  set: () => ({ width: 800, height: 600 }),
  trace: (c) => {
    if (c[1] === "stop") fs.writeFileSync(c[2], JSON.stringify({ traceEvents: [{ name: "fake" }] }));
    return c[1] === "stop" ? { path: c[2], eventCount: 1 } : { started: true };
  },
  wait: () => ({ state: "networkidle" }),
  screenshot: (c) => { fs.writeFileSync(c[1], Buffer.from("fake-png")); return { path: c[1] }; },
  eval: () => ({ result: "<html><body><h1>Fake</h1></body></html>" }),
  console: () => ({ messages: [{ type: "error", text: "boom-console", args: [] }] }),
  errors: () => ({ errors: [{ text: "Error: boom-uncaught", line: 1, column: 2, url: null }] }),
  network: () => ({ requests: [{ method: "GET", url: "https://example.com/favicon.ico", status: 404, resourceType: "Other", mimeType: "text/html", headers: { Cookie: "secret" }, responseHeaders: { "Set-Cookie": "secret" }, requestId: "1", timestamp: 1 }] }),
  a11y: () => ({ axeVersion: "4.12.1", counts: { violations: 1, incomplete: 0, passes: 3, inapplicable: 9 }, violations: [{ id: "button-name", impact: "critical", nodes: [{ target: ["button"] }] }], incomplete: [], url: "https://example.com/" }),
  vitals: () => ({ fcp: 56, lcp: { startTime: 56 }, cls: { score: 0, entries: [] }, inp: null, ttfb: 1.6, phases: [] }),
};
const results = commands.map((command) => {
  if ((config.fail || []).includes(command[0])) return { command, success: false, result: null, error: command[0] + " failed" };
  return { command, success: true, result: { lifecycle, ...payload[command[0]](command) }, error: null };
});
process.stdout.write(JSON.stringify(results));
`;

function project(config = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-agent-browser-"));
  const tools = path.join(root, "tools");
  fs.mkdirSync(tools);
  fs.writeFileSync(path.join(tools, "agent-browser.cjs"), FAKE);
  fs.writeFileSync(path.join(tools, "fake-config.json"), JSON.stringify(config));
  const chrome = path.join(root, "chrome");
  fs.writeFileSync(chrome, "");
  return { root, tool: path.join(tools, "agent-browser.cjs"), chrome, calls: path.join(tools, "calls.log"), output: path.join(root, "evidence") };
}

function runCapture(fixture, extra = []) {
  const args = ["--project-root", fixture.root, "--adapter-path", adapter, "--output-root", fixture.output, "--url", "https://example.com/", "--width", "800", "--height", "600", ...extra];
  const result = spawnSync(process.execPath, [capture, ...args], { cwd: fixture.root, encoding: "utf8", windowsHide: true });
  return { status: result.status, envelope: JSON.parse(result.stdout) };
}

function calls(fixture) {
  return fs.existsSync(fixture.calls) ? fs.readFileSync(fixture.calls, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
}

test("agent-browser fills every artifact and the receipt is complete", () => {
  const fixture = project();
  const { status, envelope } = runCapture(fixture, ["--agent-browser", fixture.tool, "--chrome", fixture.chrome]);
  assert.equal(status, 0, JSON.stringify(envelope));
  const { receipt } = envelope;
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.adapter.id, "agent-browser");
  assert.equal(receipt.adapter.version, "0.38.2");
  assert.deepEqual(Object.values(receipt.artifacts).filter((value) => value === null), []);

  const read = (key) => fs.readFileSync(path.join(fixture.output, receipt.artifacts[key]), "utf8");
  assert.deepEqual(JSON.parse(read("console")), [{ type: "error", text: "boom-console" }, { type: "pageerror", text: "Error: boom-uncaught" }]);
  assert.deepEqual(JSON.parse(read("network")), [{ method: "GET", url: "https://example.com/favicon.ico", status: 404, resourceType: "Other", mimeType: "text/html" }]);
  assert.equal(read("network").includes("secret"), false);
  assert.equal(receipt.redaction.status, "applied");
  assert.equal(JSON.parse(read("accessibility")).violations[0].id, "button-name");
  assert.equal(JSON.parse(read("performance")).fcp, 56);
  assert.equal(read("dom").includes("<h1>Fake</h1>"), true);
  assert.equal(read("performance").includes("lifecycle"), false);
  const trace = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(fixture.output, receipt.artifacts.trace))));
  assert.equal(trace.traceEvents[0].name, "fake");
  assert.equal(fs.existsSync(path.join(fixture.output, "trace.json")), false);

  const log = calls(fixture);
  const batch = log.find((args) => args.includes("batch"));
  assert.deepEqual(batch.slice(batch.indexOf("--executable-path"), batch.indexOf("--executable-path") + 2), ["--executable-path", fs.realpathSync(fixture.chrome)]);
  assert.equal(batch[batch.indexOf("--idle-timeout") + 1], "2m");
  const session = batch[batch.indexOf("--session") + 1];
  assert.deepEqual(log.at(-1), ["--session", session, "close"]);
});

test("a failed command leaves its artifact null and the receipt partial", () => {
  const fixture = project({ fail: ["a11y"] });
  const { status, envelope } = runCapture(fixture, ["--agent-browser", fixture.tool]);
  assert.equal(status, 0, JSON.stringify(envelope));
  assert.equal(envelope.receipt.status, "partial");
  assert.equal(envelope.receipt.artifacts.accessibility, null);
  assert.equal(Object.hasOwn(envelope.receipt.hashes, "accessibility"), false);
  assert.match(envelope.receipt.adapter.probe.message, /a11y/);
});

test("a failed idle wait keeps the receipt partial even with every artifact present", () => {
  const fixture = project({ fail: ["wait"] });
  const { envelope } = runCapture(fixture, ["--agent-browser", fixture.tool]);
  assert.equal(envelope.receipt.status, "partial");
  assert.deepEqual(Object.values(envelope.receipt.artifacts).filter((value) => value === null), []);
  assert.match(envelope.receipt.adapter.probe.message, /wait --load/);
});

test("a crashed batch fails the capture, still closes the session and leaves no output", () => {
  const fixture = project({ crash: true });
  const { status, envelope } = runCapture(fixture, ["--agent-browser", fixture.tool]);
  assert.equal(status, 1);
  assert.equal(envelope.ok, false);
  assert.match(envelope.error.message, /no JSON/);
  assert.equal(calls(fixture).at(-1).includes("close"), true);
  assert.equal(fs.existsSync(fixture.output), false);
});

test("the adapter fails closed without an explicit tool inside the project", () => {
  const missing = project();
  const withoutTool = runCapture(missing);
  assert.equal(withoutTool.envelope.ok, false);
  assert.match(withoutTool.envelope.error.message, /DESIGN_PIPELINE_AGENT_BROWSER/);

  const outside = project();
  const elsewhere = project();
  const escaped = runCapture(outside, ["--agent-browser", elsewhere.tool]);
  assert.equal(escaped.status, 1);
  assert.match(escaped.envelope.error.message, /--agent-browser must stay inside --project-root/);
  assert.deepEqual(calls(elsewhere), []);
});

test("the public CLI forwards --agent-browser and --chrome to the capture host", () => {
  const fixture = project();
  const result = spawnSync(process.execPath, [cli, "evidence", "capture", "--project-root", fixture.root, "--adapter-path", adapter, "--output-root", fixture.output, "--url", "https://example.com/", "--agent-browser", fixture.tool, "--chrome", fixture.chrome, "--json"], { cwd: fixture.root, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stdout || result.stderr);
  assert.equal(JSON.parse(result.stdout).receipt.status, "complete");
});
