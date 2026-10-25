#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { canonicalTree, fail } = require("./git-tree-snapshot.cjs");
const { sha256, aggregateLicenses, REVISION, PACKAGES, SCOPE, entry, fontPolicy } = require("./import-answer-me-with-html.cjs");
const ROOT = path.resolve(__dirname, "../skill/vendor/answer-me-with-html");
const OUTPUT = path.resolve(__dirname, "../skill/tools/answer-me-with-html/renderer.mjs");
const TREE = "612fdee283ec1b05b4be35de4bfef712ecfe3a4abab5c91f428aab57252413d8";
const RUNTIME_SHA256 = "12d1dbce667574d3e068c08ca66dd6d84ea39ffd2eb7935014d18ac813a06e4b";
const GIT_TREE = "e3684e39408d93ce89b12ebe4a5dc756f3571df1";
const DEPENDENCY_TREES = {
  "@dagrejs/dagre": "3be504929f5308c0122b65b2deb869242eb3be293db83b1576600b0051e5e05f",
  "@dagrejs/graphlib": "7e4fa4266dc4a6dea801f12e93a460201c7e6305988ab6587e702834ecfaa6f2",
  marked: "56eb0d8a6b3d5b58841aac5caf4d6a837c7c3c01fed5a5033eec90bb185105f5",
  temml: "776aea797671d075a389560503d406137c3409ec10c864ff28f6b63781108c36",
  esbuild: "9dd0126a0a3332692ff8b0ba962c02b5111212cbaea6f940865fdb5a1b92e692"
};
function filesIn(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((item) => {
    const file = relative ? `${relative}/${item.name}` : item.name;
    if (fs.lstatSync(path.join(root, file)).isSymbolicLink()) fail(`symlink resource is forbidden: ${file}`);
    return item.isDirectory() ? filesIn(root, file) : [file];
  }).sort();
}
function checkedFile(root, file, hash) {
  if (!file || path.isAbsolute(file) || file.includes("\\") || file.split("/").includes("..")) fail(`unsafe provenance path: ${file}`);
  const target = path.join(root, file);
  if (!fs.lstatSync(target).isFile() || sha256(fs.readFileSync(target)) !== hash) fail(`resource hash mismatch: ${file}`);
}
function same(actual, expected, label) { if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} inventory mismatch`); }
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(`missing or malformed JSON resource ${file}: ${error.message}`); }
}
function validateSources(root = ROOT, { runtime = false, output = OUTPUT } = {}) {
  const manifest = readJson(path.join(root, "manifest.json"));
  if (manifest.schema !== "design-pipeline.answer-me-with-html-source.v1" || manifest.source?.revision !== REVISION || manifest.source?.gitTree !== GIT_TREE || manifest.snapshot?.treeSha256 !== TREE || manifest.snapshot?.fileCount !== 107) fail("reviewed source provenance mismatch");
  same(manifest.source.scope, SCOPE, "source scope");
  const snapshot = path.join(root, "upstream");
  same(filesIn(snapshot), manifest.snapshot.objects.map((item) => item.path).sort(), "source files");
  let byteCount = 0;
  for (const object of manifest.snapshot.objects) {
    if (!["100644", "100755"].includes(object.mode)) fail(`unsupported Git mode: ${object.path}`);
    checkedFile(snapshot, object.path, object.sha256);
    const bytes = fs.readFileSync(path.join(snapshot, object.path));
    if (bytes.length !== object.size || crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex") !== object.oid) fail(`Git blob mismatch: ${object.path}`);
    byteCount += bytes.length;
  }
  if (manifest.snapshot.byteCount !== byteCount || canonicalTree(snapshot, manifest.snapshot.objects.map((item) => item.path)) !== TREE) fail("reviewed snapshot tree mismatch");
  const lock = readJson(path.join(snapshot, "package-lock.json"));
  same(manifest.dependencies.map((item) => item.name), PACKAGES, "dependency closure");
  for (const dependency of manifest.dependencies) {
    const pin = lock.packages[`node_modules/${dependency.name}`];
    if (!pin || pin.version !== dependency.version || pin.integrity !== dependency.integrity || dependency.root !== `dependencies/${dependency.name}`) fail(`dependency pin mismatch: ${dependency.name}`);
    const base = path.join(root, dependency.root);
    same(filesIn(base), dependency.files.map((item) => item.path).sort(), `dependency ${dependency.name}`);
    for (const resource of dependency.files) checkedFile(base, resource.path, resource.sha256);
    if (dependency.treeSha256 !== DEPENDENCY_TREES[dependency.name] || canonicalTree(base, dependency.files.map((item) => item.path)) !== DEPENDENCY_TREES[dependency.name]) fail(`immutable dependency tree mismatch: ${dependency.name}`);
    if (dependency.name === "temml") same(dependency.excluded, ["dist/Temml.woff2"], "font exclusion");
  }
  const notices = ["upstream/LICENSE", "licenses/dagre-LICENSE.txt", "licenses/graphlib-LICENSE.txt", "licenses/marked-LICENSE.txt", "licenses/temml-LICENSE.txt", "licenses/esbuild-LICENSE.txt", "licenses/KaTeX-LICENSE.txt", "licenses/Apache-2.0.txt", "licenses/temml-inherited-NOTICE.txt"];
  same(manifest.licenses.map((item) => item.path), notices, "required notices");
  for (const notice of manifest.licenses) checkedFile(root, notice.path, notice.sha256);
  for (const dependency of manifest.dependencies) {
    const leaf = dependency.name.split("/").at(-1);
    const licenseFile = dependency.files.find((resource) => ["LICENSE", "LICENSE.md"].includes(resource.path))?.path;
    if (!licenseFile || sha256(fs.readFileSync(path.join(root, `licenses/${leaf}-LICENSE.txt`))) !== sha256(fs.readFileSync(path.join(root, dependency.root, licenseFile)))) fail(`dependency notice differs from pinned archive: ${dependency.name}`);
  }
  checkedFile(root, "licenses/KaTeX-LICENSE.txt", "766ccc1f306c885aa45542a9846bbd0a505b27a0374f146778171c2254ce18e3");
  checkedFile(root, "licenses/Apache-2.0.txt", "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30");
  const inheritedNotice = fs.readFileSync(path.join(snapshot, "src/math-load.js"), "utf8").split("*/")[0] + "*/\n";
  checkedFile(root, "licenses/temml-inherited-NOTICE.txt", sha256(inheritedNotice));
  for (const resource of manifest.maintained) checkedFile(root, resource.path, resource.sha256);
  same(manifest.maintained.map((item) => item.path), ["maintained/runtime-entry.mjs", "maintained/font-policy.json"], "maintained inputs");
  if (fs.readFileSync(path.join(root, "maintained/runtime-entry.mjs"), "utf8") !== entry) fail("maintained entry differs from importer");
  same(readJson(path.join(root, "maintained/font-policy.json")), fontPolicy, "font policy");
  same(manifest.fontPolicy, fontPolicy, "font provenance");
  checkedFile(root, "LICENSES.txt", manifest.aggregate?.sha256);
  if (fs.readFileSync(path.join(root, "LICENSES.txt"), "utf8") !== aggregateLicenses(root, manifest.licenses)) fail("aggregate notices are incomplete");
  if (runtime) {
    if (!manifest.build?.output?.sha256) fail("missing runtime build provenance");
    if (manifest.build.output.sha256 !== RUNTIME_SHA256 || sha256(fs.readFileSync(output)) !== RUNTIME_SHA256) fail("generated runtime hash mismatch");
    for (const script of manifest.build.scripts) checkedFile(path.resolve(__dirname, ".."), script.path, script.sha256);
  }
  return manifest;
}
function replaceReviewed(source, pattern, replacement, count, label) {
  const matches = typeof pattern === "string" ? source.split(pattern).length - 1 : [...source.matchAll(pattern)].length;
  if (matches !== count) fail(`reviewed overlay ${label} expected ${count} occurrences, received ${matches}`);
  return typeof pattern === "string" ? source.replaceAll(pattern, replacement) : source.replace(pattern, replacement);
}
async function buildRuntime(source, { check = false } = {}) {
  const manifest = validateSources();
  const esbuildFile = path.join(source, "node_modules/esbuild/lib/main.js");
  const expected = manifest.dependencies.find((item) => item.name === "esbuild").files.find((item) => item.path === "lib/main.js");
  if (sha256(fs.readFileSync(esbuildFile)) !== expected.sha256) fail("installed esbuild differs from locked package");
  const esbuild = require(esbuildFile);
  if (esbuild.version !== "0.28.2") fail("esbuild must be 0.28.2");
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "answer-html-build-"));
  try {
    fs.cpSync(path.join(ROOT, "upstream"), path.join(stage, "upstream"), { recursive: true });
    fs.cpSync(path.join(ROOT, "maintained"), path.join(stage, "maintained"), { recursive: true });
    for (const dependency of manifest.dependencies.filter((item) => item.role === "runtime")) fs.cpSync(path.join(ROOT, dependency.root), path.join(stage, "node_modules", dependency.name), { recursive: true });
    const { composeRuntime, composeRtlRuntime } = await import(pathToFileURL(path.join(stage, "upstream/src/runtime/compose.js")).href);
    const read = (file) => fs.readFileSync(path.join(stage, "upstream", file), "utf8").replace(/\r\n?/g, "\n");
    const mathCssInput = fs.readFileSync(path.join(stage, "node_modules/temml/dist/Temml-Local.css"), "utf8").replace(/\r\n?/g, "\n");
    let mathCss = replaceReviewed(mathCssInput, /@font-face\s*\{[^}]*\}/g, "", 1, "excluded-font-face");
    mathCss = replaceReviewed(mathCss, /font-family:\s*["']?Temml["']?\s*;/g, "font-family: math;", 3, "local-math-font");
    const assets = {
      VERSION: "0.5.2", BASE_CSS: read("src/themes/base.css"), RUNTIME_JS: composeRuntime((file) => read(`src/runtime/${file}`)), RTL_JS: composeRtlRuntime((file) => read(`src/runtime/${file}`)),
      DIFF_CSS: read("src/themes/diff.css"), DELTA_CSS: read("src/themes/delta.css"), RTL_CSS: read("src/themes/rtl.css"), MATH_CSS: `${mathCss}\n${read("src/themes/math.css")}`, DELTA_JS: read("src/runtime/delta.js"),
      UPDATE_CSS: "", UPDATE_JS: "", VIDEO_CSS: "", VIDEO_JS: "", VIDEO_EXPORT_JS: "", VIDEO_MUX_JS: ""
    };
    const overlays = [{ path: "node_modules/temml/dist/Temml-Local.css", inputSha256: sha256(mathCssInput), outputSha256: sha256(mathCss), purpose: "Exclude noncommercial font; use local MathML fonts" }];
    const min = fs.readFileSync(path.join(stage, "node_modules/temml/dist/temml.min.js"), "utf8");
    const result = await esbuild.build({
      absWorkingDir: stage, entryPoints: ["maintained/runtime-entry.mjs"], outfile: "renderer.mjs", write: false, bundle: true, platform: "node", format: "esm", target: "node22", legalComments: "eof", metafile: true,
      banner: { js: "// biome-ignore-all lint format assist: generated byte-exact renderer\n// Generated by scripts/build-answer-me-with-html-runtime.cjs; do not edit. Reviewed answer-me-with-html v0.5.2." },
      plugins: [
        { name: "maintained-offline-assets", setup(build) { build.onLoad({ filter: /src[\\/]assets\.js$/ }, () => ({ loader: "js", contents: Object.entries(assets).map(([name, value]) => `export const ${name} = ${JSON.stringify(value)};`).join("\n") })); } },
        { name: "reviewed-include-policy", setup(build) {
          build.onLoad({ filter: /src[\\/](code|markdown|images)\.js$/ }, ({ path: file }) => {
            const original = fs.readFileSync(file, "utf8");
            const leaf = path.basename(file);
            let adapted = original;
            if (leaf === "code.js") {
              adapted = replaceReviewed(adapted, "function readSlice(ref, range, baseDir)", "export function readSlice(ref, range, baseDir)", 1, "preflight-code-reader");
              adapted = replaceReviewed(adapted, "readSlice(opts.src, range, baseDir) ?? ", "", 1, "cached-code-only");
            } else if (leaf === "markdown.js") {
              adapted = replaceReviewed(adapted, "function wrapSpacedImages(text)", "export function wrapSpacedImages(text)", 1, "shared-markdown-normalization");
            } else {
              adapted = replaceReviewed(adapted, "readImage(ref, baseDir) ?? known.get(ref)", "known.get(ref)", 1, "cached-image-only");
            }
            overlays.push({ path: `upstream/src/${leaf}`, inputSha256: sha256(original), outputSha256: sha256(adapted), purpose: "Expose original preflight primitives; render only vetted cached includes" });
            return { loader: "js", contents: adapted };
          });
        } },
        { name: "reviewed-lazy-temml", setup(build) {
          build.onResolve({ filter: /^answer-html-lazy-temml$/ }, () => ({ path: "temml", namespace: "temml-string" }));
          build.onLoad({ filter: /.*/, namespace: "temml-string" }, () => ({ loader: "js", contents: `import { runInThisContext } from 'node:vm';\nlet cached;\nexport function loadTemml() { return cached ??= runInThisContext(${JSON.stringify(`(function () {\n${min}\nreturn temml;\n})()`)}); }\n` }));
        } }
      ], logLevel: "silent"
    });
    const graph = result.metafile.outputs["renderer.mjs"];
    if (!graph) fail("missing generated output graph");
    const external = graph.imports.filter((item) => item.external).map((item) => item.path).sort();
    if (external.some((file) => !["node:fs", "node:path", "node:os", "node:url", "node:vm"].includes(file))) fail(`undeclared runtime external: ${external.join(", ")}`);
    const inputs = Object.entries(graph.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([file, value]) => ({ path: file, bytesInOutput: value.bytesInOutput })).sort((a, b) => a.path.localeCompare(b.path));
    if (inputs.some((item) => /^upstream\/src\/(cli|config|home|housekeeping|state|update|serve|sys)\.js$|^upstream\/src\/video\//.test(item.path))) fail("forbidden execution module in runtime closure");
    const bytes = result.outputFiles[0].contents;
    const build = {
      node: process.versions.node, esbuild: esbuild.version, target: "node22", format: "esm", entry: "maintained/runtime-entry.mjs", lazyTemml: true,
      scripts: ["scripts/import-answer-me-with-html.cjs", "scripts/build-answer-me-with-html-runtime.cjs", "scripts/git-tree-snapshot.cjs"].map((file) => ({ path: file, sha256: sha256(fs.readFileSync(path.resolve(__dirname, "..", file))) })),
      inputs, externals: external, overlays: overlays.sort((a, b) => a.path.localeCompare(b.path)), assets: Object.keys(assets).filter((key) => assets[key]).map((name) => ({ name, sha256: sha256(assets[name]), bytes: Buffer.byteLength(assets[name]) })),
      output: { path: "skill/tools/answer-me-with-html/renderer.mjs", sha256: sha256(bytes), bytes: bytes.length }
    };
    if (check) {
      validateSources(ROOT, { runtime: true });
      if (!fs.readFileSync(OUTPUT).equals(Buffer.from(bytes)) || manifest.build.output.sha256 !== build.output.sha256) fail("rebuild output differs from immutable runtime provenance");
    } else {
      if (manifest.build && manifest.build.output.sha256 !== build.output.sha256) fail("rebuild differs; review source/build changes explicitly before refreshing provenance");
      fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
      fs.writeFileSync(OUTPUT, bytes);
      manifest.build = build;
      fs.writeFileSync(path.join(ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    return build;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}
if (require.main === module) (async () => {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const index = args.indexOf("--source");
  if (index < 0 || !args[index + 1] || args.some((arg, at) => at !== index && at !== index + 1 && arg !== "--check")) fail("Usage: node scripts/build-answer-me-with-html-runtime.cjs --source <checkout-with-pinned-npm-ci> [--check]");
  console.log(JSON.stringify(await buildRuntime(path.resolve(args[index + 1]), { check })));
})().catch((error) => { console.error(`FAIL ${error.message}`); process.exitCode = 1; });
module.exports = { validateSources, buildRuntime, filesIn, TREE, GIT_TREE, replaceReviewed };
