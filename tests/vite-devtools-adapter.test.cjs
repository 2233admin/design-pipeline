"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const adapter = path.resolve(__dirname, "../skill/scripts/vite-devtools-adapter.cjs");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vite-devtools-adapter-"));
  const pkgRoot = path.join(root, "node_modules", "@vitejs", "devtools");
  fs.mkdirSync(pkgRoot, { recursive: true });
  fs.writeFileSync(path.join(pkgRoot, "package.json"), JSON.stringify({ name: "@vitejs/devtools", version: "0.4.8", bin: { "vite-devtools": "bin.js" } }));
  fs.writeFileSync(path.join(pkgRoot, "bin.js"), `
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const args = process.argv.slice(2);
const value = name => args[args.indexOf(name) + 1];
if (args[0] === 'build') {
  const out = value('--outDir');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><title>DevTools</title>');
  process.exit(0);
}
const host = value('--host');
const port = Number(value('--port'));
http.createServer((req, res) => { res.statusCode = 200; res.end('ok'); }).listen(port, host);
`);
  for (const [name, version] of [["vite", "8.1.5"], ["vite-plus", "0.2.6"]]) {
    const dir = path.join(root, "node_modules", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name, version }));
  }
  return root;
}

function run(root, args) {
  return spawnSync(process.execPath, [adapter, ...args, "--project-root", root], { encoding: "utf8", timeout: 10000, windowsHide: true });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

test("probe reports project-local Vite DevTools, Vite, and Vite+ versions", () => {
  const result = run(fixture(), ["probe"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).versions, { devtools: "0.4.8", vite: "8.1.5", vitePlus: "0.2.6" });
});

test("build invokes the project-local official CLI and records contained artifacts", () => {
  const root = fixture();
  const result = run(root, ["build", "--output-root", "evidence/devtools-build"]);
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.ok(fs.existsSync(path.join(root, "evidence", "devtools-build", "static", "index.html")));
  assert.equal(receipt.artifacts.length, 2);
});

test("start waits for readiness and stop consumes the persisted state", async () => {
  const root = fixture();
  const port = await freePort();
  const started = run(root, ["start", "--output-root", "evidence/devtools-run", "--port", String(port), "--timeout-ms", "5000"]);
  assert.equal(started.status, 0, started.stderr);
  assert.equal(JSON.parse(started.stdout).url, `http://127.0.0.1:${port}/__devtools/`);
  const stopped = run(root, ["stop", "--output-root", "evidence/devtools-run"]);
  assert.equal(stopped.status, 0, stopped.stderr);
});

test("adapter rejects output paths outside the target project", () => {
  const root = fixture();
  const result = run(root, ["build", "--output-root", path.resolve(root, "..", "escape")]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must stay below/);
});
