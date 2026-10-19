"use strict";

// What an agent writes for a replicate project's extract step, so a test about a later stage can
// start where it needs to. The foundations are the repository's own DESIGN.md and MOTION.md with the
// not-borrowed line a replicate extraction adds to Source Decisions; at standard and full a small
// design-system package whose tokens the DESIGN.md front matter carries.

const fs = require("node:fs");
const path = require("node:path");
const { decide, readState } = require("../../skill/scripts/workflow-core.cjs");
const { designMdTokens } = require("../../skill/scripts/design-system-package-core.cjs");
const fixtures = require("./reference-fixtures.cjs");

const repo = path.resolve(__dirname, "..", "..");
const NOT_BORROWED = "- Rejected the reference's content, copy, brand marks and logos.";

const TOKENS = {
  name: "Ledger",
  version: 1,
  color: {
    themes: [{ id: "light", name: "Paper" }, { id: "dark", name: "Night" }],
    tokens: [
      { name: "paper", value: { light: "#f5f0e6", dark: "#1d1a16" }, usage: "Page ground." },
      { name: "ink", value: { light: "#1f1c17", dark: "#f3ece3" }, usage: "Text on paper." },
    ],
  },
  type: {
    fonts: [],
    families: { sans: "system-ui, sans-serif" },
    groups: [{ name: "Text", family: "sans", styles: [{ name: "body", fontSize: "15px", lineHeight: 1.6, fontWeight: 400, usage: "Sentences." }] }],
  },
  spacing: { tokens: [{ name: "space-2", value: "8px", usage: "Inline gaps." }] },
  radius: { tokens: [{ name: "radius-none", value: "0px", usage: "Everything." }] },
  contrast: [{ text: "ink", on: ["paper"], min: 4.5 }],
};
const PACKAGE_FILES = {
  "README.md": "Ledger keeps records.\n\n## Content fundamentals\n\n- Plain words.\n\n## Visual foundations\n\nSet text in `ink` on `paper`.\n\n## Iconography\n\nNo icons.\n",
  "tokens.json": JSON.stringify(TOKENS, null, 1),
  "components/bundle.css": ".entry { color: var(--ink); }\n",
  "components/Entry/README.md": "# Entry\n\nOne record with its evidence.\n",
  "components/Entry/preview.html": '<!-- @dsCard group="Status" height=80 -->\n<!doctype html>\n<html>\n<head><meta charset="utf-8"></head>\n<body><div id="root" class="body">Entry</div></body>\n</html>\n',
  "components/Cover/preview.html": '<!-- @dsCard height=288 -->\n<!doctype html>\n<html><head></head><body><h1>Ledger</h1></body></html>\n',
};

function designText(withTokens) {
  const text = fs.readFileSync(path.join(repo, "DESIGN.md"), "utf8");
  if (!text.includes("### Rejected\n")) throw new Error("repository DESIGN.md changed shape; update the replicate fixture");
  const withRejection = text.replace("### Rejected\n", `### Rejected\n\n${NOT_BORROWED}\n`);
  return withTokens ? withRejection.replace(/^omitted:\n(?:[ \t]+.*\n)+/m, designMdTokens(TOKENS)) : withRejection;
}

// reference.md (what the reference step records) and the registered reference evidence.
function writeReference(root) {
  fs.writeFileSync(path.join(root, "reference.md"), "# Observed reference\nStructure, rhythm, type scale and timing.\n");
}
function writeEvidence(root) {
  fixtures.writeRaster(root, "reference.png");
  fixtures.writeReference(root, fixtures.planarReference());
}
function writeFoundations(root) {
  const system = readState(root).tier !== "quick";
  fs.writeFileSync(path.join(root, "DESIGN.md"), designText(system));
  fs.copyFileSync(path.join(repo, "MOTION.md"), path.join(root, "MOTION.md"));
  if (!system) return;
  for (const [rel, content] of Object.entries(PACKAGE_FILES)) {
    const file = path.join(root, "design-system", rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

// The owner's confirmation of the extraction, recorded as the agent records it.
function confirmExtraction(root, answer = "Yes, take the structure and the type scale, leave their copy and logo out.") {
  return decide(root, { by: "owner", stage: "extract", verdict: "accept", answer });
}

// Reference step through the owner's confirmed extraction.
function extractReplicate(root) {
  writeReference(root);
  writeEvidence(root);
  writeFoundations(root);
  return confirmExtraction(root);
}

module.exports = { confirmExtraction, extractReplicate, writeEvidence, writeFoundations, writeReference };
