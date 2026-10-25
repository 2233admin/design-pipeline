#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { canonicalTree, copyTrackedFiles, inspectCheckout, fail } = require("./git-tree-snapshot.cjs");
const REVISION = "4da5ae89ac435683110aa1b8707d9d4170184c55";
const ROOT = path.resolve(__dirname, "../skill/vendor/answer-me-with-html");
const PACKAGES = ["@dagrejs/dagre", "@dagrejs/graphlib", "marked", "temml", "esbuild"];
const SCOPE = ["LICENSE", "package.json", "package-lock.json", "README.md", "src/**", "scripts/**", "skills/**/*.md", "examples/**"];
const selected = (file) => ["LICENSE", "package.json", "package-lock.json", "README.md"].includes(file) || /^(src|scripts|examples)\//.test(file) || /^skills\/.*\.md$/.test(file);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const fontPolicy = { embeddedFont: false, excluded: "temml/dist/Temml.woff2", reason: "Pinned font nameID13 prohibits commercial use (FontCreator home edition); package MIT does not resolve this conflicting embedded grant.", replacement: "Local system MathML fonts; no downloaded or bundled font", observedCopyright: "Copyright (c) 2009-2010 Design Science, Inc.; Copyright (c) 2014-2018 Khan Academy; Copyright (c) 2021 Ron Kok", licenseNameID13: "This font is made with the home edition of FontCreator. You may not use this font for commercial purposes.", licenseNameID14: "https://www.high-logic.com/font-license-agreement" };
const entry = `// Maintained library entry; original upstream files remain unchanged.
import { renderDoc as upstreamRenderDoc } from '../upstream/src/render.js';
import { RUNTIME_JS, RTL_JS, DELTA_JS } from '../upstream/src/assets.js';
import { useTemml, mayHaveMath } from '../upstream/src/math.js';
import { loadTemml } from 'answer-html-lazy-temml';
export { parseDoc } from '../upstream/src/parse.js';
export { parseCodeArgs, readSlice } from '../upstream/src/code.js';
export { wrapSpacedImages } from '../upstream/src/markdown.js';
export { lexer, walkTokens } from 'marked';
export { hasDelta } from '../upstream/src/render.js';
export const runtimeAssets = Object.freeze({ RUNTIME_JS, RTL_JS, DELTA_JS });
export const version = '0.5.2';
export function renderDoc(source, overrides = {}, defaults = {}, { baseDir, codeDir, knownImages, knownCode } = {}) {
  if (mayHaveMath(String(source))) useTemml(loadTemml());
  return upstreamRenderDoc(source, overrides, defaults, { baseDir, codeDir, knownImages, knownCode });
}
`;
const katexLicense = `The MIT License (MIT)\n\nCopyright (c) 2013-2020 Khan Academy and other contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;

// npm archives are verified against the reviewed lock's SHA512 before extracting.
// Only regular package files are materialized; links and traversal are refused.
function tarFiles(archive) {
  const tar = zlib.gunzipSync(archive);
  const result = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const text = (start, length) => header.subarray(start, start + length).toString("utf8").replace(/\0.*$/, "");
    const name = [text(345, 155), text(0, 100)].filter(Boolean).join("/");
    const size = parseInt(text(124, 12).trim(), 8) || 0;
    const type = text(156, 1);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) fail("invalid npm tar size");
    if (type === "0" || type === "") {
      if (!name.startsWith("package/") || name.includes("\\") || name.split("/").includes("..")) fail(`unsafe npm tar path: ${name}`);
      const file = name.slice(8);
      if (result.has(file)) fail(`duplicate npm tar path: ${file}`);
      result.set(file, Buffer.from(tar.subarray(offset + 512, offset + 512 + size)));
    } else if (type !== "5" && type !== "x" && type !== "g") fail(`unsupported npm tar entry: ${name} (${type})`);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return result;
}
function writeFile(root, file, bytes) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
function aggregateLicenses(root, licenses) {
  return "answer-me-with-html redistribution notices\nOriginal source, bundled dependencies and inherited grants. No Temml font is distributed; see maintained/font-policy.json.\n\n" + licenses.map((notice) => `===== ${notice.name} (${notice.version || "reviewed source"}) =====\nSource: ${notice.source}\n\n${fs.readFileSync(path.join(root, notice.path), "utf8").trimEnd()}\n`).join("\n");
}
async function importSnapshot(source, reviewedAt, destination = ROOT) {
  const checkout = inspectCheckout(source, { include: selected });
  if (checkout.revision !== REVISION) fail(`source revision must be reviewed ${REVISION}; received ${checkout.revision}`);
  for (const file of ["LICENSE", "package.json", "package-lock.json", "src/render.js", "scripts/inline-assets.mjs"]) if (!checkout.blobs.has(file)) fail(`missing required source: ${file}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".answer-html-stage-"));
  try {
    const lock = JSON.parse(checkout.blobs.get("package-lock.json"));
    copyTrackedFiles(path.join(stage, "upstream"), checkout.indexEntries, checkout.blobs);
    const dependencies = [];
    const licenses = [{ name: "answer-me-with-html", version: "0.5.2", path: "upstream/LICENSE", source: `https://github.com/2233admin/answer-me-with-html/blob/${REVISION}/LICENSE` }];
    for (const name of PACKAGES) {
      const pinned = lock.packages[`node_modules/${name}`];
      if (!pinned?.integrity?.startsWith("sha512-")) fail(`missing pinned integrity: ${name}`);
      const leaf = name.split("/").at(-1);
      const url = `https://registry.npmjs.org/${name}/-/${leaf}-${pinned.version}.tgz`;
      const response = await fetch(url);
      if (!response.ok) fail(`cannot obtain pinned archive: ${name}: ${response.status}`);
      const archive = Buffer.from(await response.arrayBuffer());
      if (`sha512-${crypto.createHash("sha512").update(archive).digest("base64")}` !== pinned.integrity) fail(`archive integrity mismatch: ${name}`);
      const files = tarFiles(archive);
      const pkg = JSON.parse(files.get("package.json"));
      if (pkg.name !== name || pkg.version !== pinned.version) fail(`archive package mismatch: ${name}`);
      const excluded = name === "temml" ? ["dist/Temml.woff2"] : [];
      const inventory = [];
      for (const [file, bytes] of files) {
        if (excluded.includes(file)) continue;
        const resource = `dependencies/${name}/${file}`;
        writeFile(stage, resource, bytes);
        inventory.push({ path: file, size: bytes.length, sha256: sha256(bytes) });
      }
      inventory.sort((a, b) => a.path.localeCompare(b.path));
      const license = files.get("LICENSE") || files.get("LICENSE.md");
      if (!license) fail(`missing complete package license: ${name}`);
      const noticePath = `licenses/${leaf}-LICENSE.txt`;
      writeFile(stage, noticePath, license);
      licenses.push({ name, version: pinned.version, license: pkg.license, path: noticePath, source: url, sha256: sha256(license) });
      dependencies.push({ name, version: pinned.version, license: pkg.license, role: name === "esbuild" ? "maintenance-build" : "runtime", archive: url, integrity: pinned.integrity, archiveSha256: sha256(archive), root: `dependencies/${name}`, treeSha256: canonicalTree(path.join(stage, "dependencies", name), inventory.map((item) => item.path)), excluded, files: inventory });
    }
    writeFile(stage, "licenses/KaTeX-LICENSE.txt", katexLicense);
    licenses.push({ name: "KaTeX inherited Temml code", version: "0.16.0 notice", license: "MIT", path: "licenses/KaTeX-LICENSE.txt", source: "https://github.com/KaTeX/KaTeX/blob/v0.16.0/LICENSE", sha256: sha256(katexLicense) });
    const apacheUrl = "https://www.apache.org/licenses/LICENSE-2.0.txt";
    const apacheResponse = await fetch(apacheUrl);
    if (!apacheResponse.ok) fail(`cannot obtain Apache license: ${apacheResponse.status}`);
    const apacheLicense = Buffer.from(await apacheResponse.arrayBuffer());
    if (sha256(apacheLicense) !== "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30") fail("Apache license integrity mismatch");
    writeFile(stage, "licenses/Apache-2.0.txt", apacheLicense);
    licenses.push({ name: "Temml inherited React utilities and mhchem", license: "Apache-2.0", path: "licenses/Apache-2.0.txt", source: apacheUrl });
    const inheritedNotice = checkout.blobs.get("src/math-load.js").toString("utf8").split("*/")[0] + "*/\n";
    writeFile(stage, "licenses/temml-inherited-NOTICE.txt", inheritedNotice);
    licenses.push({ name: "Temml inherited third-party attribution", path: "licenses/temml-inherited-NOTICE.txt", source: `https://github.com/2233admin/answer-me-with-html/blob/${REVISION}/src/math-load.js` });
    writeFile(stage, "maintained/runtime-entry.mjs", entry);
    writeFile(stage, "maintained/font-policy.json", `${JSON.stringify(fontPolicy, null, 2)}\n`);
    writeFile(stage, "LICENSES.txt", aggregateLicenses(stage, licenses));
    const files = checkout.indexEntries.map((item) => item.path);
    const manifest = {
      schema: "design-pipeline.answer-me-with-html-source.v1",
      source: { repository: "https://github.com/2233admin/answer-me-with-html", canonicalRepository: "https://github.com/QingYunA/answer-me-with-html", revision: REVISION, gitTree: checkout.gitTree, committedAt: checkout.committedAt, reviewedAt, version: "0.5.2", scope: SCOPE },
      snapshot: { root: "upstream", fileCount: files.length, byteCount: checkout.indexEntries.reduce((sum, item) => sum + item.size, 0), treeSha256: canonicalTree(path.join(stage, "upstream"), files), objects: checkout.indexEntries.map((item) => ({ ...item, sha256: sha256(checkout.blobs.get(item.path)) })) },
      dependencies, licenses: licenses.map((notice) => ({ ...notice, sha256: sha256(fs.readFileSync(path.join(stage, notice.path))) })),
      maintained: ["maintained/runtime-entry.mjs", "maintained/font-policy.json"].map((file) => ({ path: file, sha256: sha256(fs.readFileSync(path.join(stage, file))) })),
      aggregate: { path: "LICENSES.txt", sha256: sha256(fs.readFileSync(path.join(stage, "LICENSES.txt"))) },
      fontPolicy,
      boundary: { mode: "bounded-offline-renderer", consumerDependencies: false, executesCli: false, ambientConfiguration: false, acceptance: "not-assessed" }
    };
    writeFile(stage, "manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
    const backup = `${destination}.backup-${process.pid}`;
    if (fs.existsSync(backup)) fail(`stale import backup: ${backup}`);
    const old = fs.existsSync(destination);
    if (old) fs.renameSync(destination, backup);
    try { fs.renameSync(stage, destination); } catch (error) { if (old) fs.renameSync(backup, destination); throw error; }
    if (old) fs.rmSync(backup, { recursive: true, force: true });
    return manifest;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}
function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (!["--source", "--reviewed-at"].includes(flag) || !argv[index + 1] || result[flag]) fail(`invalid option: ${flag}`);
    result[flag] = argv[index + 1];
  }
  if (!result["--source"] || !/^\d{4}-\d{2}-\d{2}$/.test(result["--reviewed-at"] || "") || new Date(result["--reviewed-at"]).toISOString().slice(0, 10) !== result["--reviewed-at"]) fail("required: --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD");
  return result;
}
if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  const result = await importSnapshot(path.resolve(args["--source"]), args["--reviewed-at"]);
  console.log(JSON.stringify({ status: "imported", revision: result.source.revision, files: result.snapshot.fileCount, treeSha256: result.snapshot.treeSha256 }));
})().catch((error) => { console.error(`FAIL ${error.message}`); process.exitCode = 1; });
module.exports = { importSnapshot, aggregateLicenses, sha256, REVISION, selected, PACKAGES, SCOPE, entry, fontPolicy };
