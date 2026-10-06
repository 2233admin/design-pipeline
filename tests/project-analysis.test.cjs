"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const { inspectProject, LIMITS } = require("../skill/scripts/project-analysis-core.cjs");

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "project-analysis-"));
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

test("traces HTML entry through imports to renderer, shader, animation and commands", () => {
  const root = project({
    "package.json": JSON.stringify({ name: "badge", scripts: { dev: "vite", build: "vite build", test: "node --test test.cjs" }, dependencies: { three: "0.1", gsap: "1" } }),
    "index.html": '<script type="module" src="./src/main.js"></script>',
    "src/main.js": 'import { Badge } from "./Badge.js";\nimport "./styles.css";\nimport("./motion.js");\nimport(dynamicName);',
    "src/Badge.js": 'import { WebGLRenderer, ShaderMaterial } from "three";\nimport fragment from "./enamel.frag";\nexport function Badge() { return new ShaderMaterial({fragmentShader: fragment}); }',
    "src/motion.js": 'export function move() { requestAnimationFrame(move); }',
    "src/styles.css": ':root { --enamel-blue: #1133aa; }\n@keyframes shine { to { opacity: 1 } }',
    "src/enamel.frag": 'void main() { gl_FragColor = vec4(1.0); }',
  });
  const result = inspectProject(root, { query: "badge enamel animation" });
  assert.equal(result.method, "bounded-static-heuristic");
  assert.ok(result.entrypoints.some(entry => entry.path === "src/main.js" && entry.reason === "html-script"));
  assert.ok(result.dependencies.some(edge => edge.path === "src/main.js" && edge.target === "src/Badge.js"));
  assert.ok(result.dependencies.some(edge => edge.kind === "dynamic-import" && edge.target === "src/motion.js"));
  assert.ok(result.unknowns.some(item => item.code === "DYNAMIC_IMPORT_UNRESOLVED"));
  for (const kind of ["component", "renderer", "material", "shader", "animation", "tokens"]) {
    assert.ok(result.implementation.some(item => item.kind === kind), kind);
  }
  assert.equal(result.packages[0].scripts.build, "vite build");
  assert.ok(result.commands.some(item => item.name === "build" && item.command === "vite build" && item.path === "package.json"));
  assert.ok(result.implementation.every(item => item.line >= 1 && /^sha256:[a-f0-9]{64}$/.test(item.hash) && item.evidence));
  assert.equal(result.visualAcceptance, "not-evaluated");
});

test("finds multiple workspace packages and keeps alias resolution uncertain", () => {
  const root = project({
    "package.json": JSON.stringify({ name: "root", workspaces: ["packages/*"] }),
    "packages/widget/package.json": JSON.stringify({ name: "widget", exports: "./src/index.ts", scripts: { build: "tsc" } }),
    "packages/widget/src/index.ts": 'export { Badge } from "./Badge";',
    "packages/widget/src/Badge.tsx": 'import { motion } from "@shared/motion";\nexport function Badge() { return <div/>; }',
    "packages/shared/package.json": JSON.stringify({ name: "@shared/motion", main: "index.js" }),
    "packages/shared/index.js": 'export const spring = 0.1;',
  });
  const result = inspectProject(root);
  assert.equal(result.packages.length, 3);
  assert.ok(result.entrypoints.some(entry => entry.path === "packages/widget/src/index.ts" && entry.reason === "package-export"));
  assert.ok(result.dependencies.some(edge => edge.target === "packages/widget/src/Badge.tsx"));
  assert.ok(result.dependencies.some(edge => edge.specifier === "@shared/motion" && edge.status === "external-or-alias"));
  assert.ok(result.unknowns.some(item => item.code === "ALIAS_OR_PACKAGE_UNRESOLVED"));
});

test("Git discovery respects ignore rules and filters tracked secrets and upstream", () => {
  const root = project({
    ".gitignore": "ignored/\n",
    "index.html": '<script src="./main.js"></script>',
    "main.js": 'requestAnimationFrame(tick);',
    "ignored/secret.js": "secretMarkerShouldNotBeRead",
    ".env": "apiKeyShouldNotBeRead",
    "private/secret.js": "privateMarkerShouldNotBeRead",
    "upstream/library.js": "upstreamMarkerShouldNotBeRead",
    "node_modules/tool.js": "moduleMarkerShouldNotBeRead",
  });
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "add", ".env", "private", "upstream"]);
  const result = inspectProject(root);
  assert.equal(result.discovery.source, "git");
  assert.deepEqual(result.files.map(item => item.path), ["index.html", "main.js"]);
  assert.doesNotMatch(JSON.stringify(result), /ShouldNotBeRead/);
});

test("scope cannot escape project and explicit unsafe scope is rejected", () => {
  const root = project({ "src/main.js": "export const ok = true;", ".env": "doNotRead" });
  assert.throws(() => inspectProject(root, { scope: "../outside" }), /inside/);
  assert.throws(() => inspectProject(root, { scope: ".env" }), /excluded/);
  const result = inspectProject(root, { scope: "src" });
  assert.deepEqual(result.files.map(item => item.path), ["src/main.js"]);
});

test("changed source changes evidence hash and large discovery never claims complete", () => {
  const root = project({ "main.js": "requestAnimationFrame(tick);" });
  const first = inspectProject(root);
  fs.writeFileSync(path.join(root, "main.js"), "requestAnimationFrame(tock);");
  assert.notEqual(inspectProject(root).files[0].hash, first.files[0].hash);
  for (let index = 0; index < LIMITS.files + 2; index++) fs.writeFileSync(path.join(root, `file-${index}.js`), "export const value = 1;");
  const result = inspectProject(root);
  assert.equal(result.status, "partial");
  assert.equal(result.discovery.truncated, true);
  assert.ok(result.unknowns.some(item => item.code === "FILE_LIMIT"));
  assert.ok(result.files.length <= LIMITS.files);
});

test("oversized source and unresolved local imports remain explicit unknowns", () => {
  const root = project({ "main.js": 'import "./missing.js";', "huge.js": "x".repeat(LIMITS.fileBytes + 1) });
  const result = inspectProject(root);
  assert.equal(result.status, "partial");
  assert.ok(result.unknowns.some(item => item.code === "FILE_SIZE_LIMIT"));
  assert.ok(result.unknowns.some(item => item.code === "LOCAL_IMPORT_UNRESOLVED"));
  assert.ok(result.dependencies.some(edge => edge.specifier === "./missing.js" && edge.target === null));
});

test("reads multiline imports and plain relative HTML URLs with exact line evidence", () => {
  const root = project({
    "index.html": '<script src="src/main.js"></script>',
    "src/main.js": '\nimport {\n Badge\n} from "./Badge";\n',
    "src/Badge.tsx": 'export function Badge() { return <div/>; }',
  });
  const result = inspectProject(root);
  assert.ok(result.entrypoints.some(entry => entry.path === "src/main.js" && entry.reason === "html-script"));
  const edge = result.dependencies.find(item => item.target === "src/Badge.tsx");
  assert.equal(edge.line, 2);
  assert.equal(edge.evidence, "import {");
});

test("evidence and unknown report limits remain bounded and explicit", () => {
  const source = Array.from({ length: LIMITS.evidence + 10 }, (_, index) => `import "package-${index}";`).join("\n");
  const result = inspectProject(project({ "main.js": source }));
  assert.equal(result.status, "partial");
  assert.equal(result.discovery.truncated, true);
  assert.ok(result.unknowns.some(item => item.code === "EVIDENCE_LIMIT" || item.code === "UNKNOWN_LIMIT"));
  assert.ok(result.dependencies.length <= LIMITS.evidence);
  assert.ok(result.unknowns.length <= LIMITS.evidence + 1);
});

test("ignored nested project is inspected without using its parent Git inventory", () => {
  const parent = project({
    ".gitignore": "preview/\n",
    ".env": "parentSecretShouldNotBeRead",
    "sibling.js": "siblingShouldNotBeRead",
    "preview/index.html": '<script src="main.js"></script>',
    "preview/main.js": "requestAnimationFrame(tick);",
    "preview/private/secret.js": "nestedSecretShouldNotBeRead",
  });
  execFileSync("git", ["init", "-q", parent]);
  const result = inspectProject(path.join(parent, "preview"));
  assert.equal(result.discovery.source, "directory");
  assert.deepEqual(result.files.map(item => item.path), ["index.html", "main.js"]);
  assert.ok(result.unknowns.some(item => item.code === "GIT_ROOT_MISMATCH"));
  assert.equal(result.discovery.ignoreRules, "explicit-exclusions-only");
  assert.doesNotMatch(JSON.stringify(result), /ShouldNotBeRead/);
});

test("empty inspection is partial and cannot stand in for repository understanding", () => {
  const result = inspectProject(project({ "notes.txt": "No supported source here" }));
  assert.equal(result.status, "partial");
  assert.ok(result.unknowns.some(item => item.code === "NO_SOURCE_READ"));
});

test("query retrieves source lines and follows only observed import paths within budget", () => {
  const root = project({
    "index.html": '<script type="module" src="./src/main.js"></script>',
    "src/main.js": 'import { createEnamelMaterial } from "./Badge.js";\ncreateEnamelMaterial();',
    "src/Badge.js": 'import shader from "./enamel.frag";\nexport function createEnamelMaterial() {\n // 珐琅 relief uses the imported shader\n return shader;\n}',
    "src/enamel.frag": 'void main() { gl_FragColor = vec4(1.0); }',
    "src/unrelated.js": 'export function Noise() { return Math.random(); }',
  });
  const result = inspectProject(root, { query: "createEnamelMaterial 珐琅" });
  assert.equal(result.queryResults.method, "literal-source-terms");
  assert.deepEqual(result.queryResults.terms, ["createenamelmaterial", "珐琅"]);
  const definition = result.queryResults.matches.find(item => item.path === "src/Badge.js" && item.line === 2);
  assert.ok(definition);
  assert.deepEqual(definition.matchedTerms, ["createenamelmaterial"]);
  assert.ok(result.queryResults.matches.some(item => item.line === 3 && item.matchedTerms.includes("珐琅")));
  const chain = result.queryResults.connections.find(item => item.relation === "entrypoint-to-match" && item.to.path === "src/Badge.js");
  assert.equal(chain.from.path, "index.html");
  assert.deepEqual(chain.edges.map(edge => edge.target), ["src/main.js", "src/Badge.js"]);
  assert.ok(result.queryResults.connections.some(item => item.relation === "match-dependency" && item.from.path === "src/Badge.js" && item.to.path === "src/enamel.frag"));
  assert.ok(result.queryResults.connections.some(item => item.relation === "match-dependent" && item.from.path === "src/main.js" && item.to.path === "src/Badge.js"));
  assert.ok(result.queryResults.connections.every(item => item.from.path !== "src/unrelated.js" && item.to.path !== "src/unrelated.js"));
  const references = result.queryResults.matches.concat(result.queryResults.connections.flatMap(item => [item.from, item.to, ...item.edges]));
  for (const reference of references) {
    assert.equal(reference.hash, result.files.find(file => file.path === reference.path).hash);
    assert.equal(reference.evidence, fs.readFileSync(path.join(root, reference.path), "utf8").split(/\r?\n/)[reference.line - 1].trim().slice(0, 240));
  }
  const missing = inspectProject(root, { query: "nonexistent_component_xyz" });
  assert.deepEqual(missing.queryResults.matches, []);
  assert.deepEqual(missing.queryResults.connections, []);
  assert.ok(missing.unknowns.some(item => item.code === "QUERY_NO_MATCH"));
  const many = inspectProject(project({ "index.html": '<script src="./main.js"></script>', "main.js": "// enamel\n".repeat(40) }), { query: "enamel" });
  assert.equal(many.queryResults.matches.length, 32);
  assert.equal(many.status, "partial");
  assert.ok(many.unknowns.some(item => item.code === "QUERY_MATCH_LIMIT"));
  const deep = { "index.html": '<script src="./step0.js"></script>' };
  for (let index = 0; index < LIMITS.queryHops; index++) deep[`step${index}.js`] = `import "./step${index + 1}.js";`;
  deep[`step${LIMITS.queryHops}.js`] = "export const soughtMaterial = 1;";
  const bounded = inspectProject(project(deep), { query: "soughtMaterial" });
  assert.equal(bounded.status, "partial");
  assert.ok(bounded.unknowns.some(item => item.code === "QUERY_HOP_LIMIT"));
  assert.ok(bounded.queryResults.connections.every(item => item.edges.length <= LIMITS.queryHops));
  const full = inspectProject(project({ "main.js": Array.from({ length: LIMITS.evidence + 1 }, (_, index) => `import "package-${index}";`).join("\n") }), { query: "package-0" });
  assert.ok(full.unknowns.some(item => item.code === "QUERY_EVIDENCE_LIMIT"));
  const records = full.entrypoints.length + full.dependencies.length + full.implementation.length + full.packages.length + full.commands.length + full.queryResults.matches.length + full.queryResults.connections.reduce((sum, item) => sum + 3 + item.edges.length, 0);
  assert.ok(records <= LIMITS.evidence);
});
