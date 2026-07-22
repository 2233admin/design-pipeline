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

test("an explicit fake web adapter captures deterministic files and a valid receipt", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-web-adapter-"));
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
