"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const capture = path.resolve(__dirname, "../skill/scripts/capture-web-evidence.cjs");

function run(args, cwd) {
  return spawnSync(process.execPath, [capture, ...args], { cwd, encoding: "utf8", windowsHide: true });
}

test("capture publishes validated metadata and rejects adapter-owned receipt collisions", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-web-adapter-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const adapter = path.join(root, "fake-adapter.cjs");
  const output = path.join(root, "evidence");
  fs.writeFileSync(adapter, `
const crypto=require("node:crypto");const fs=require("node:fs");const path=require("node:path");
let input="";process.stdin.setEncoding("utf8");process.stdin.on("data",c=>input+=c);process.stdin.on("end",()=>{const request=JSON.parse(input);const keys=["screenshot","trace","dom","console","network","accessibility","performance"];const artifacts={};const hashes={};for(const key of keys){const name=key+".txt";const bytes=Buffer.from(key+"\\n");fs.writeFileSync(path.join(request.outputRoot,name),bytes);artifacts[key]=name;hashes[key]=crypto.createHash("sha256").update(bytes).digest("hex");}process.stdout.write(JSON.stringify({schema:"design-pipeline.evidence-receipt.v1",id:"fake-capture",status:"complete",adapter:{id:"fake",version:"1.0.0",availability:"available",probe:{ok:true,message:"ready"}},target:{url:request.url,viewport:request.viewport},capturedAt:"2026-07-23T00:00:00.000Z",artifacts,hashes,redaction:{status:"not-required",notes:[]}}));});
`);
  const result = run(["--project-root", root, "--adapter-path", adapter, "--output-root", output, "--url", "https://example.com", "--width", "800", "--height", "600"], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.ok, true);
  assert.equal(envelope.receipt.status, "complete");
  assert.ok(fs.existsSync(path.join(output, "trace.txt")));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, "receipt.json"), "utf8")), envelope.receipt);
  fs.appendFileSync(adapter, '\nprocess.stdin.on("end",()=>fs.writeFileSync(path.join(JSON.parse(input).outputRoot,"receipt.json"),"adapter-owned"));\n');
  const collisionRoot = path.join(root, "collision");
  const collision = run(["--project-root", root, "--adapter-path", adapter, "--output-root", collisionRoot, "--url", "https://example.com"], root);
  assert.equal(collision.status, 1, collision.stdout || collision.stderr);
  assert.equal(JSON.parse(collision.stdout).ok, false);
  assert.equal(fs.existsSync(collisionRoot), false);
  assert.equal(fs.readdirSync(root).some((name) => name.startsWith("collision.tmp-")), false);
});

test("capture rejects artifacts reached through an absolute linked parent before publication", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-web-adapter-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const adapter = path.join(root, "linked-parent-adapter.cjs");
  const output = path.join(root, "evidence");
  fs.writeFileSync(adapter, `
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => input += chunk);
process.stdin.on("end", () => {
  const request = JSON.parse(input);
  const payload = path.resolve(request.outputRoot, "payload");
  const alias = path.join(request.outputRoot, "alias");
  const bytes = Buffer.from("<html><body>linked parent</body></html>\\n");
  fs.mkdirSync(payload);
  fs.writeFileSync(path.join(payload, "dom.html"), bytes);
  fs.symlinkSync(payload, alias, process.platform === "win32" ? "junction" : "dir");
  process.stdout.write(JSON.stringify({
    schema: "design-pipeline.evidence-receipt.v1",
    id: "linked-parent-capture",
    status: "partial",
    adapter: { id: "fake", version: "1.0.0", availability: "available", probe: { ok: true, message: "ready" } },
    target: { url: request.url, viewport: request.viewport },
    capturedAt: "2026-07-23T00:00:00.000Z",
    artifacts: { screenshot: null, trace: null, dom: "alias/dom.html", console: null, network: null, accessibility: null, performance: null },
    hashes: { dom: crypto.createHash("sha256").update(bytes).digest("hex") },
    redaction: { status: "not-required", notes: [] },
  }));
});
`);
  const result = run(["--project-root", root, "--adapter-path", adapter, "--output-root", output, "--url", "https://example.com"], root);
  assert.equal(result.status, 1, result.stdout || result.stderr);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.ok, false);
  assert.match(envelope.error.message, /artifacts\.dom.*link/i);
  assert.equal(fs.existsSync(output), false);
  assert.equal(fs.readdirSync(root).some((name) => name.startsWith("evidence.tmp-")), false);
});

test("missing adapters and output roots outside the project fail closed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-web-adapter-"));
  const missing = run(["--project-root", root, "--adapter-path", path.join(root, "missing.cjs"), "--output-root", path.join(root, "evidence"), "--url", "https://example.com"], root);
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).ok, false);
  const adapter = path.join(root, "adapter.cjs");
  fs.writeFileSync(adapter, "process.exit(0);\n");
  const escaped = run(["--project-root", root, "--adapter-path", adapter, "--output-root", path.join(root, "..", "outside"), "--url", "https://example.com"], root);
  assert.equal(escaped.status, 1);
  assert.match(JSON.parse(escaped.stdout).error.message, /output-root must stay (?:inside|below)/);
});

test("capture validates authority before execution and removes failed partial output", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-web-adapter-"));
  const adapter = path.join(root, "adapter.cjs");
  const marker = path.join(root, "executed.txt");
  fs.writeFileSync(adapter, `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "yes");process.exit(1);\n`);
  const credentialed = run(["--project-root", root, "--adapter-path", adapter, "--output-root", path.join(root, "credentialed"), "--url", "https://user:secret@example.com"], root);
  assert.equal(credentialed.status, 1);
  assert.equal(fs.existsSync(marker), false);
  const failedOutput = path.join(root, "failed");
  const failed = run(["--project-root", root, "--adapter-path", adapter, "--output-root", failedOutput, "--url", "https://example.com"], root);
  assert.equal(failed.status, 1);
  assert.equal(fs.existsSync(marker), true);
  assert.equal(fs.existsSync(failedOutput), false);
  assert.equal(fs.readdirSync(root).some((name) => name.startsWith("failed.tmp-")), false);
});
