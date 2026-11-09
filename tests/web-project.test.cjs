"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");
const { scaffoldWeb, startPreview } = require("../skill/scripts/web-project-core.cjs");
const { parseArgs } = require("../skill/scripts/cli-core.cjs");

const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "web-project-"));
const decision = (framework, styling = "none", ui = "none", status = "ready") => ({
  schema: "design-pipeline.frontend-stack-decision.v1",
  status,
  framework,
  selected: { styling: { id: styling, label: styling }, uiLibrary: { id: ui, label: ui } },
  blockers: status === "blocked" ? ["blocked for test"] : [],
});
const get = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], body: Buffer.concat(chunks).toString("utf8") }));
  }).on("error", reject);
});
// A raw request keeps `..` and encoded separators exactly as written; http.get would normalise some.
const rawStatus = (port, rawPath) => new Promise((resolve, reject) => {
  const socket = net.connect(port, "127.0.0.1", () => socket.write(`GET ${rawPath} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
  let data = "";
  socket.on("data", (chunk) => { data += chunk; });
  socket.on("end", () => resolve(Number(data.split(" ")[1])));
  socket.on("error", reject);
});
const readJson = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));

test("react + tailwindcss scaffold writes a buildable project with a section marker in index.html", () => {
  const dir = tmp();
  try {
    const result = scaffoldWeb(dir, decision("react", "tailwindcss", "radix-ui"));
    assert.equal(result.status, "scaffolded");
    for (const name of ["package.json", "vite.config.js", "index.html", "src/main.jsx", "src/style.css", "component-manifest.json", "WEB.md"]) assert.ok(fs.existsSync(path.join(dir, name)), name);
    const pkg = readJson(dir, "package.json");
    for (const dep of ["react", "react-dom"]) assert.match(pkg.dependencies[dep], /^\d+\.\d+\.\d+$/, dep);
    for (const dep of ["vite", "@vitejs/plugin-react", "tailwindcss", "@tailwindcss/vite"]) assert.match(pkg.devDependencies[dep], /^\d+\.\d+\.\d+$/, dep);
    assert.equal(pkg.scripts.build, "vite build");
    assert.match(fs.readFileSync(path.join(dir, "index.html"), "utf8"), /data-section="hero"/);
    assert.match(fs.readFileSync(path.join(dir, "src/style.css"), "utf8"), /@import "tailwindcss"/);
    assert.deepEqual(readJson(dir, "component-manifest.json"), { entries: [] });
    assert.ok(result.next.some((line) => line.includes("npm") && line.includes("install")));
    assert.ok(result.next.some((line) => line.includes("radix-ui")));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("each framework gets its entry and plugin; agnostic needs no framework plugin", () => {
  const cases = { vue: ["src/main.js", "@vitejs/plugin-vue"], svelte: ["src/main.js", "@sveltejs/vite-plugin-svelte"], solid: ["src/main.jsx", "vite-plugin-solid"], agnostic: ["src/main.js", null] };
  for (const [framework, [entry, plugin]] of Object.entries(cases)) {
    const dir = tmp();
    try {
      scaffoldWeb(dir, decision(framework));
      assert.ok(fs.existsSync(path.join(dir, entry)), `${framework} ${entry}`);
      const pkg = readJson(dir, "package.json");
      if (plugin) assert.ok(pkg.devDependencies[plugin], plugin);
      else assert.ok(!Object.keys(pkg.devDependencies).some((name) => name.includes("plugin")));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("scss and less styling add their compiler", () => {
  for (const [styling, dep, file] of [["scss", "sass", "src/style.scss"], ["less", "less", "src/style.less"]]) {
    const dir = tmp();
    try {
      scaffoldWeb(dir, decision("agnostic", styling));
      assert.ok(readJson(dir, "package.json").devDependencies[dep]);
      assert.ok(fs.existsSync(path.join(dir, file)), file);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("scaffold refuses to overwrite without --replace and keeps package.json fields with it", () => {
  const dir = tmp();
  try {
    scaffoldWeb(dir, decision("react"));
    assert.throws(() => scaffoldWeb(dir, decision("react")), (error) => error.code === "OUTPUT_EXISTS" && /--replace/.test(error.message));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ ...readJson(dir, "package.json"), name: "mine", custom: 1 }));
    scaffoldWeb(dir, decision("react"), { replace: true });
    const pkg = readJson(dir, "package.json");
    assert.equal(pkg.name, "mine");
    assert.equal(pkg.custom, 1);
    assert.ok(pkg.devDependencies.vite);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a blocked, malformed or reflex decision writes nothing", () => {
  const dir = tmp();
  try {
    assert.throws(() => scaffoldWeb(dir, decision("react", "none", "none", "blocked")), (error) => error.code === "BLOCKED");
    assert.throws(() => scaffoldWeb(dir, decision("reflex")), (error) => error.code === "UNSUPPORTED_FRAMEWORK");
    assert.throws(() => scaffoldWeb(dir, { schema: "nope" }), (error) => error.code === "CONTRACT_INVALID");
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the new flags are registered", () => {
  assert.doesNotThrow(() => parseArgs(["web", "scaffold", "--output", "x", "--decision", "d.json", "--replace"]));
  assert.doesNotThrow(() => parseArgs(["web", "preview", "--root", "x", "--port", "0", "--path", "dist", "--timeout-ms", "10"]));
});

test("preview serves index.html and files, and refuses to leave the root", async () => {
  const dir = tmp();
  const secret = `${path.basename(dir)}-secret.txt`;
  const outside = path.join(path.dirname(dir), secret);
  try {
    fs.writeFileSync(path.join(dir, "index.html"), "<h1>hi</h1>");
    fs.mkdirSync(path.join(dir, "a"));
    fs.writeFileSync(path.join(dir, "a", "x.css"), "b{}");
    fs.writeFileSync(outside, "secret");
    const preview = await startPreview(dir);
    try {
      assert.match(preview.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
      const home = await get(preview.url);
      assert.equal(home.status, 200);
      assert.match(home.type, /text\/html/);
      assert.equal(home.body, "<h1>hi</h1>");
      assert.match((await get(`${preview.url}a/x.css`)).type, /text\/css/);
      assert.equal((await get(`${preview.url}missing.js`)).status, 404);
      const port = Number(new URL(preview.url).port);
      for (const bad of [`/../${secret}`, `/%2e%2e/${secret}`, `/a/..%2f..%2f${secret}`]) {
        const status = await rawStatus(port, bad);
        assert.ok([400, 403, 404].includes(status), `${bad} -> ${status}`);
      }
    } finally { await preview.stop(); }
    await assert.rejects(get(preview.url));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(outside, { force: true }); }
});

test("the CLI preview rejects a root without index.html, prints the address and exits 0 after --timeout-ms", async () => {
  const dir = tmp();
  try {
    const empty = spawnSync(process.execPath, [cli, "web", "preview", "--root", dir, "--json"], { encoding: "utf8" });
    assert.equal(empty.status, 1);
    assert.match(empty.stdout, /INPUT_MISSING/);
    fs.writeFileSync(path.join(dir, "index.html"), "ok");
    const child = spawn(process.execPath, [cli, "web", "preview", "--root", dir, "--timeout-ms", "4000", "--json"], { stdio: ["ignore", "pipe", "pipe"] });
    const exited = new Promise((resolve) => child.on("exit", resolve));
    let stderr = "";
    const url = await new Promise((resolve, reject) => {
      child.stderr.on("data", (chunk) => { stderr += chunk; const match = /http:\/\/127\.0\.0\.1:\d+\//.exec(stderr); if (match) resolve(match[0]); });
      exited.then(() => reject(new Error(`exited early: ${stderr}`)));
    });
    assert.equal((await get(url)).body, "ok");
    assert.equal(await exited, 0);
    await assert.rejects(get(url));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("web scaffold through the CLI: exit 0, OUTPUT_EXISTS exit 1, blocked decision exit 2", () => {
  const dir = tmp();
  try {
    const file = path.join(dir, "decision.json");
    fs.writeFileSync(file, JSON.stringify(decision("svelte", "tailwindcss")));
    const out = path.join(dir, "site");
    const run = (target, ...extra) => spawnSync(process.execPath, [cli, "web", "scaffold", "--root", dir, "--output", target, "--decision", file, "--json", ...extra], { encoding: "utf8" });
    assert.equal(run(out).status, 0);
    const again = run(out);
    assert.equal(again.status, 1);
    assert.match(again.stdout, /OUTPUT_EXISTS/);
    assert.equal(run(out, "--replace").status, 0);
    fs.writeFileSync(file, JSON.stringify(decision("svelte", "none", "none", "blocked")));
    assert.equal(run(path.join(dir, "other")).status, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
