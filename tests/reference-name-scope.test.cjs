"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { allowedFiles, allowedFolder, formerNameHits, isAllowed } = require("../scripts/reference-name-scope.cjs");

const repoRoot = path.resolve(__dirname, "..");
// The name is assembled so that this file itself stays outside the rule.
const name = ["hua", "shu"].join("");
const spaced = ["Hua", "Shu"].join(" ");
const underscored = ["hua", "shu"].join("_");

function repository(t, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "name-scope-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (args) => {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  };
  git(["init", "--quiet"]);
  for (const [file, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), body);
  }
  git(["add", "--force", "."]);
  return dir;
}

test("the name is allowed inside its vendored folder, the notices and the importer only", (t) => {
  assert.equal(allowedFolder, "skill/vendor/design-direction-library/");
  assert.deepEqual([...allowedFiles].sort(), ["THIRD_PARTY_NOTICES.md", "scripts/import-design-direction-library.cjs"]);
  const dir = repository(t, {
    ["skill/vendor/design-direction-library/manifest.json"]: `{"source":"${name}-design"}\n`,
    [`skill/vendor/design-direction-library/upstream/${name}.md`]: `${name}\n`,
    [`skill/vendor/design-direction-library/upstream/${spaced} notes.md`]: `${underscored}\n`,
    "THIRD_PARTY_NOTICES.md": `${name}-design\n`,
    "scripts/import-design-direction-library.cjs": `"https://github.com/x/${name}-design"\n`,
    "skill/SKILL.md": "neutral\n",
  });
  const result = formerNameHits(dir);
  assert.equal(result.ok, true, result.hits.join(", "));
  assert.deepEqual(result.hits, []);
});

test("every other tracked path or content still fails, including look-alike locations", (t) => {
  const cases = {
    "skill/SKILL.md": `uses ${name}\n`,
    "skill/references/design-direction-library.md": `paths under ${name}-design\n`,
    "docs/features.md": `${spaced}\n`,
    "tests/other.test.cjs": `${underscored}\n`,
    "scripts/import-other.cjs": `${name}\n`,
    "scripts/import-design-direction-library.cjs.bak": `${name}\n`,
    [`skill/vendor/${name}-design/x.md`]: "clean\n",
    ["skill/vendor/design-direction-library-extra/x.md"]: `${name}\n`,
    [`skill/vendor/${name}-design.md`]: "clean\n",
    [`skill/vendor/other/${name}-design/x.md`]: "clean\n",
    [`docs/${name}-notes.md`]: "clean\n",
    [`skill/vendor/${name.toUpperCase()}-design/x.md`]: "clean\n",
    "THIRD_PARTY_NOTICES.md.orig": `${name}\n`,
    "binary.bin": Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(` ${name.toUpperCase()} `)]),
  };
  const dir = repository(t, cases);
  const result = formerNameHits(dir);
  assert.equal(result.ok, false);
  assert.deepEqual(result.hits, Object.keys(cases).sort());
});

test("a repository with no match passes, and the rule lives in the shared checker used by QA", (t) => {
  assert.deepEqual(formerNameHits(repository(t, { "README.md": "plain\n" })), { ok: true, hits: [] });
  assert.equal(isAllowed("skill/vendor/design-direction-library/upstream/x"), true);
  assert.equal(isAllowed("skill/vendor/design-direction-library"), false);
  assert.equal(isAllowed(`skill/vendor/${name}-design/upstream/x`), false);
  assert.equal(isAllowed("skill/SKILL.md"), false);
  const qa = fs.readFileSync(path.join(repoRoot, "scripts/qa.cjs"), "utf8");
  assert.match(qa, /require\("\.\/reference-name-scope\.cjs"\)/);
  assert.match(qa, /formerNameHits\(repoRoot\)/);
  // The checker and the QA runner stay outside their own rule.
  const pattern = new RegExp(`${name.slice(0, 3)}[\\s_.-]*${name.slice(3)}`, "i");
  for (const file of ["scripts/reference-name-scope.cjs", "scripts/qa.cjs", "tests/reference-name-scope.test.cjs", "tests/design-direction-library.test.cjs", "skill/SKILL.md", "skill/references/design-direction-library.md"]) {
    assert.equal(pattern.test(fs.readFileSync(path.join(repoRoot, file), "utf8")), false, file);
  }
});
