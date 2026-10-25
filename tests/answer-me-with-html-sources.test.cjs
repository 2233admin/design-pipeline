"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { validateSources, filesIn } = require("../scripts/build-answer-me-with-html-runtime.cjs");
const { upstreamFiles } = require("../skill/scripts/upstream-path.cjs");

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "skill/vendor/answer-me-with-html");
const renderer = path.join(repoRoot, "skill/tools/answer-me-with-html/renderer.mjs");
const rendererHash = "12d1dbce667574d3e068c08ca66dd6d84ea39ffd2eb7935014d18ac813a06e4b";
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const inventory = (root) => filesIn(root).map((file) => [file, hash(fs.readFileSync(path.join(root, file)))]);

function withCopiedVendor(callback) {
  const original = inventory(vendorRoot);
  const originalRenderer = hash(fs.readFileSync(renderer));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "answer-html-sources-test-"));
  const root = path.join(temporary, "vendor");
  try {
    fs.cpSync(vendorRoot, root, { recursive: true });
    callback({ root, temporary, manifest: readJson(path.join(root, "manifest.json")) });
  } finally {
    try {
      assert.deepEqual(inventory(vendorRoot), original, "original vendor remains byte-exact");
      assert.equal(hash(fs.readFileSync(renderer)), originalRenderer, "original renderer remains byte-exact");
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
}

function saveManifest(root, manifest) {
  writeJson(path.join(root, "manifest.json"), manifest);
}

function appendAndRehash(root, resource) {
  const target = path.join(root, resource.path);
  fs.appendFileSync(target, "\n// source integrity test corruption\n");
  const bytes = fs.readFileSync(target);
  resource.sha256 = hash(bytes);
  resource.size = bytes.length;
  return bytes;
}

test("answer-me-with-html validates complete reviewed source, dependencies, notices and font exclusions", () => {
  const provenance = validateSources(vendorRoot, { runtime: true, output: renderer });
  assert.equal(provenance.schema, "design-pipeline.answer-me-with-html-source.v1");
  assert.equal(provenance.source.revision, "4da5ae89ac435683110aa1b8707d9d4170184c55");
  assert.equal(provenance.source.gitTree, "e3684e39408d93ce89b12ebe4a5dc756f3571df1");
  assert.equal(provenance.snapshot.treeSha256, "612fdee283ec1b05b4be35de4bfef712ecfe3a4abab5c91f428aab57252413d8");
  assert.equal(provenance.snapshot.fileCount, 107);
  assert.equal(provenance.snapshot.objects.length, 107);
  assert.deepEqual(provenance.snapshot.objects.map((item) => item.path).sort(), upstreamFiles(filesIn(path.join(vendorRoot, "upstream"))).files.sort());
  assert.deepEqual(provenance.dependencies.map(({ name, version }) => [name, version]), [
    ["@dagrejs/dagre", "3.1.1"], ["@dagrejs/graphlib", "4.0.5"], ["marked", "18.0.14"], ["temml", "0.14.0"], ["esbuild", "0.28.2"]
  ]);
  for (const dependency of provenance.dependencies) {
    assert.deepEqual(dependency.files.map((item) => item.path).sort(), filesIn(path.join(vendorRoot, dependency.root)), dependency.name);
  }
  assert.deepEqual(provenance.licenses.map((item) => item.path), [
    "upstream/LICENSE", "licenses/dagre-LICENSE.txt", "licenses/graphlib-LICENSE.txt", "licenses/marked-LICENSE.txt",
    "licenses/temml-LICENSE.txt", "licenses/esbuild-LICENSE.txt", "licenses/KaTeX-LICENSE.txt",
    "licenses/Apache-2.0.txt", "licenses/temml-inherited-NOTICE.txt"
  ]);
  assert.equal(provenance.licenses.find((item) => item.path === "licenses/Apache-2.0.txt").license, "Apache-2.0");
  assert.deepEqual(provenance.fontPolicy, {
    embeddedFont: false,
    excluded: "temml/dist/Temml.woff2",
    reason: "Pinned font nameID13 prohibits commercial use (FontCreator home edition); package MIT does not resolve this conflicting embedded grant.",
    replacement: "Local system MathML fonts; no downloaded or bundled font",
    observedCopyright: "Copyright (c) 2009-2010 Design Science, Inc.; Copyright (c) 2014-2018 Khan Academy; Copyright (c) 2021 Ron Kok",
    licenseNameID13: "This font is made with the home edition of FontCreator. You may not use this font for commercial purposes.",
    licenseNameID14: "https://www.high-logic.com/font-license-agreement"
  });
  assert.deepEqual(provenance.dependencies.find((item) => item.name === "temml").excluded, ["dist/Temml.woff2"]);
  assert.equal(filesIn(vendorRoot).includes("dependencies/temml/dist/Temml.woff2"), false);
  assert.equal(provenance.build.output.sha256, rendererHash);
  assert.equal(hash(fs.readFileSync(renderer)), rendererHash, "renderer independently matches immutable reviewed SHA256");
});

test("rehashed original source cannot replace the independently reviewed tree", () => {
  withCopiedVendor(({ root, manifest }) => {
    const object = manifest.snapshot.objects.find((item) => item.path === "src/math-load.js");
    const oldSize = object.size;
    const bytes = appendAndRehash(path.join(root, "upstream"), object);
    object.oid = crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    manifest.snapshot.byteCount += bytes.length - oldSize;
    saveManifest(root, manifest);
    assert.throws(() => validateSources(root), /reviewed snapshot tree mismatch/);
  });
});

test("rehashed dependency resource cannot replace the immutable dependency tree", () => {
  withCopiedVendor(({ root, manifest }) => {
    const dependency = manifest.dependencies.find((item) => item.name === "marked");
    appendAndRehash(path.join(root, dependency.root), dependency.files.find((item) => item.path === "bin/main.js"));
    saveManifest(root, manifest);
    assert.throws(() => validateSources(root), /immutable dependency tree mismatch: marked/);
  });
});

for (const notice of ["licenses/Apache-2.0.txt", "licenses/temml-inherited-NOTICE.txt"]) {
  test(`missing required notice is rejected: ${notice}`, () => {
    withCopiedVendor(({ root }) => {
      const target = path.join(root, notice);
      fs.unlinkSync(target);
      assert.throws(() => validateSources(root), (error) => error.code === "ENOENT" && error.path === target);
    });
  });
  test(`removing required notice from provenance is rejected: ${notice}`, () => {
    withCopiedVendor(({ root, manifest }) => {
      manifest.licenses = manifest.licenses.filter((item) => item.path !== notice);
      saveManifest(root, manifest);
      assert.throws(() => validateSources(root), /required notices inventory mismatch/);
    });
  });
}

test("rehashed font policy cannot authorize the originally excluded font", () => {
  withCopiedVendor(({ root, manifest }) => {
    const resource = manifest.maintained.find((item) => item.path === "maintained/font-policy.json");
    const target = path.join(root, resource.path);
    const policy = readJson(target);
    policy.embeddedFont = true;
    writeJson(target, policy);
    resource.sha256 = hash(fs.readFileSync(target));
    manifest.fontPolicy = policy;
    saveManifest(root, manifest);
    assert.throws(() => validateSources(root), /font policy inventory mismatch/);
  });
});

test("the original dependency font exclusion cannot be removed", () => {
  withCopiedVendor(({ root, manifest }) => {
    manifest.dependencies.find((item) => item.name === "temml").excluded = [];
    saveManifest(root, manifest);
    assert.throws(() => validateSources(root), /font exclusion inventory mismatch/);
  });
});

test("rehashed generated renderer cannot replace the immutable reviewed runtime", () => {
  withCopiedVendor(({ root, temporary, manifest }) => {
    const output = path.join(temporary, "renderer.mjs");
    fs.copyFileSync(renderer, output);
    fs.appendFileSync(output, "\n// runtime integrity test corruption\n");
    const bytes = fs.readFileSync(output);
    manifest.build.output.sha256 = hash(bytes);
    manifest.build.output.bytes = bytes.length;
    saveManifest(root, manifest);
    assert.throws(() => validateSources(root, { runtime: true, output }), /generated runtime hash mismatch/);
  });
});
