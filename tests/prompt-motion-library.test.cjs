"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { loadLibrary, templates } = require("../skill/tools/prompt-motion/library.cjs");

const pkg = path.resolve(__dirname, "../skill");
const cli = path.join(pkg, "scripts/designer-pipeline.cjs");

test("offline curated search separates reusable recipes from homepage-only cases", () => {
  const result = templates({ query: "ui loop" });
  assert.ok(result.templates.some((item) => item.id === "ui-state-loop"));
  assert.equal(result.indexedCases, undefined);
  assert.equal(templates({ query: "rendered" }).templates.length, 0, "search does not match status field names");
  const indexed = templates({ query: "stephanlivera", all: true });
  assert.ok(indexed.indexedCases.some((item) => item.id === "stephanlivera-df17a2" && item.status === "indexed"));
  const recipe = templates({ template: "ui-state-loop" }).template;
  assert.ok(recipe.inputs.length && recipe.sequence.length && recipe.invariants.length);
  assert.ok(recipe.sourceCases.every((entry) => entry.url.endsWith(entry.id)));
  assert.deepEqual(recipe.observation, { basis: "page-prompt", videoWatched: false, audioHeard: false, rendered: false });
  assert.throws(() => templates({ template: "not-a-template" }), /unknown template/);
  assert.throws(() => templates({ template: "ui-state-loop", all: true }), /cannot be combined/);
});

test("relocated package resolves its own catalog and rejects broken source, guide and observation identities", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-motion-library-"));
  try {
    const { catalog, index } = loadLibrary();
    const files = ["tools/prompt-motion/library.cjs", "scripts/contract-utils.cjs", "references/prompt-motion/source-index.json", "references/prompt-motion/templates.json", ...new Set(catalog.templates.flatMap((item) => item.relatedGuides))];
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      fs.copyFileSync(path.join(pkg, file), path.join(temp, file));
    }
    const relocated = require(path.join(temp, "tools/prompt-motion/library.cjs"));
    assert.equal(relocated.templates({ template: "ui-state-loop" }).template.id, "ui-state-loop");
    const file = path.join(temp, "references/prompt-motion/templates.json");
    for (const [mutate, expected] of [
      [(data) => { data.templates[1].id = data.templates[0].id; }, /duplicate id/],
      [(data) => { data.templates[0].sources = ["unreviewed-case"]; }, /unknown source/],
      [(data) => { data.templates[0].observation.rendered = true; }, /cannot claim/],
      [(data) => { data.templates[0].renderedUrl = "https://example.invalid/film.mp4"; }, /unsupported properties/],
      [(data) => { data.templates[0].observation.video = "https://example.invalid/film.mp4"; }, /unsupported properties/],
      [(data) => { data.templates[0].relatedGuides = ["../outside.md"]; }, /must stay inside/],
      [(data) => { data.templates[0].relatedGuides = ["references/prompt-motion"]; }, /regular file/],
    ]) {
      const data = structuredClone(catalog);
      mutate(data);
      fs.writeFileSync(file, JSON.stringify(data));
      assert.throws(() => relocated.loadLibrary(), expected);
    }
    fs.writeFileSync(file, JSON.stringify(catalog));
    for (const [mutate, expected] of [
      [(data) => { data.entries[0].promptShared = null; }, /availability must be explicit/],
      [(data) => { data.entries[0].video = "https://example.invalid/film.mp4"; }, /unsupported properties/],
    ]) {
      const data = structuredClone(index);
      mutate(data);
      fs.writeFileSync(path.join(temp, "references/prompt-motion/source-index.json"), JSON.stringify(data));
      assert.throws(() => relocated.loadLibrary(), expected);
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test("public film templates CLI is read-only and retains recipe-only limits", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-motion-cli-"));
  try {
    fs.writeFileSync(path.join(root, "user.txt"), "keep this input");
    const run = (...args) => spawnSync(process.execPath, [cli, "film", "templates", "--root", root, ...args, "--json"], { encoding: "utf8", windowsHide: true });
    const selected = run("--template", "ui-state-loop");
    assert.equal(selected.status, 0, selected.stdout + selected.stderr);
    assert.equal(JSON.parse(selected.stdout).template.status, "recipe");
    const indexed = run("--all", "--query", "stephanlivera");
    assert.equal(indexed.status, 0, indexed.stdout + indexed.stderr);
    assert.ok(JSON.parse(indexed.stdout).indexedCases.length);
    assert.equal(run("--template", "not-a-template").status, 1);
    assert.equal(run("--unknown-library-flag").status, 1);
    assert.deepEqual(fs.readdirSync(root), ["user.txt"]);
    assert.equal(fs.readFileSync(path.join(root, "user.txt"), "utf8"), "keep this input");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
