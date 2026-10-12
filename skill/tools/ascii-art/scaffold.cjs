"use strict";

// Files for `composition scaffold --template ascii-art`. pieces.js carries the exact text of each
// vendored ascii.rest piece module, because Chromium does not load ES-module files from a file://
// page; ascii-art.js evaluates each source through a data: URL import, so the copied project runs
// from its own directory, opened directly or captured, with no network and no install.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { fail } = require("../../scripts/contract-utils.cjs");

const VENDOR = path.join(__dirname, "../../vendor/ascii-rest");

// JSON string syntax with every non-ASCII character escaped, so the script reads the same under
// any charset a browser assumes for a file:// script.
const asciiString = (text) => JSON.stringify(text).replace(/[\u007f-\uffff]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

function piecesScript(vendorRoot = VENDOR) {
  const manifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, "manifest.json"), "utf8"));
  const records = new Map(manifest.files.map((record) => [record.path, record]));
  const entries = manifest.pieces.map(({ slug }) => {
    const file = `dist/pieces/${slug}.js`;
    const bytes = fs.readFileSync(path.join(vendorRoot, manifest.snapshot.root, file));
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (records.get(file)?.sha256 !== sha256) fail("composition", `vendored ascii.rest ${file} does not match manifest.json; reinstall the skill`);
    return `    ${JSON.stringify(slug)}: { file: ${JSON.stringify(file)}, sha256: ${JSON.stringify(sha256)}, source: ${asciiString(bytes.toString("utf8"))} },`;
  });
  const { version, repository, revision } = manifest.source;
  return [
    "/*",
    ` * ascii.rest ${version} piece modules: MIT, Copyright (c) 2026 bas3line; see LICENSE.ascii-rest.`,
    ` * Upstream ${repository} at ${revision}.`,
    " * Written by `composition scaffold --template ascii-art` from design-pipeline's vendor bundle:",
    " * each source is the exact text of the upstream file, and sha256 hashes its UTF-8 bytes.",
    " * ascii-art.js evaluates a source as an ES module when a preset names its piece.",
    " */",
    "(function (root) {",
    "  \"use strict\";",
    "  const pieces = {",
    ...entries,
    "  };",
    "  if (typeof module === \"object\" && module && module.exports) module.exports = pieces;",
    "  else root.ASCII_ART_PIECES = pieces;",
    "})(typeof globalThis !== \"undefined\" ? globalThis : this);",
    "",
  ].join("\n");
}

function asciiArtFiles() {
  const read = (file) => fs.readFileSync(path.join(__dirname, file));
  return [
    ["index.html", read("study.html")],
    ["ascii-art.js", read("ascii-art.js")],
    ["presets.js", read("presets.js")],
    ["pieces.js", Buffer.from(piecesScript(), "utf8")],
    ["LICENSE.ascii-rest", fs.readFileSync(path.join(VENDOR, "upstream/LICENSE"))],
  ];
}

module.exports = { asciiArtFiles, piecesScript };
