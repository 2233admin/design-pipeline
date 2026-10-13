"use strict";

// Change let-agents-discover-open-source-resources: the components decision's `discover` source and
// discovered/font manifest entries extend the existing v1 decision and validateComponentManifest.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { initState, nextAction, decide, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { validateComponentManifest } = require("../skill/scripts/design-system-catalog-core.cjs");

const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const PERMISSIVE = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Zlib", "Unlicense", "CC0-1.0", "OFL-1.1"];
const PAGE = '<!doctype html><style>@font-face { font-family: "InterVariable"; src: url("fonts/InterVariable.woff2") format("woff2"); font-display: swap; } body { font-family: "InterVariable", sans-serif; }</style><nav class="Navigation"><i class="ph-arrow-right"></i><div class="embla">Page</div></nav>';
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "web-discovery-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initState(root, { deliverable: "web", tier: "quick", mode: "brief" });
  fs.writeFileSync(path.join(root, "index.html"), PAGE);
  return root;
}

const owned = () => ({
  name: "Project navigation", sourceId: "index.html", availability: "project-owned", license: { state: "project-owned" },
  usedIn: [{ file: "index.html", marker: "Navigation", how: "Project navigation markup" }],
});
const icons = () => ({
  name: "Phosphor icons", kind: "icon", url: "https://github.com/phosphor-icons/core", revision: "v2.1.1", availability: "reference-link",
  license: { state: "verified", id: "MIT", evidence: ["https://github.com/phosphor-icons/core/blob/v2.1.1/LICENSE"] },
  usedIn: [{ file: "index.html", marker: "ph-arrow-right", how: "Import the arrow-right icon; keep the MIT copyright and license notice in LICENSES.md" }],
});
const carousel = () => ({
  name: "Embla carousel", kind: "library", url: "https://www.npmjs.com/package/embla-carousel", revision: "8.5.2", availability: "reference-link",
  license: { state: "verified", id: "MIT", evidence: ["https://unpkg.com/embla-carousel@8.5.2/LICENSE"] },
  usedIn: [{ file: "index.html", marker: "embla", how: "Install embla-carousel 8.5.2 and bundle it; keep its MIT license notice in LICENSES.md" }],
});
const font = () => ({
  name: "Inter", kind: "font", url: "https://github.com/rsms/inter", revision: "v4.1", availability: "reference-link",
  license: { state: "verified", id: "OFL-1.1", evidence: ["https://github.com/rsms/inter/blob/v4.1/LICENSE.txt"] },
  usedIn: [{ file: "index.html", marker: "InterVariable", how: "Self-host InterVariable.woff2 with @font-face; keep the OFL copyright and license notice beside the font files" }],
});

// Records the decision through the real decide, then checks that the validator and next agree.
function check(root, choice, answer, value, error) {
  decide(root, { stage: "components", choice, answer });
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify(value));
  const options = { root, decision: answer, componentSources: readState(root).decisions.componentSources };
  if (error) assert.throws(() => validateComponentManifest(value, options), error);
  else assert.equal(validateComponentManifest(value, options), value);
  assert.equal(nextAction(root).stage, error ? "build" : "probe");
}

test("decide records discover in canonical order and keeps scratch exclusive", t => {
  const root = fixture(t);
  decide(root, { stage: "components", choice: "discover,index,project,discover", answer: "Our components, then the index, then find more" });
  assert.deepEqual(readState(root).decisions.componentSources, ["project", "index", "discover"]);
  decide(root, { stage: "components", choice: "discover,index,github,project", answer: "Use https://github.com/example/library, then find more" });
  assert.deepEqual(readState(root).decisions.componentSources, ["project", "github", "index", "discover"]);
  decide(root, { stage: "components", choice: "discover", answer: "Find maintained open-source options" });
  assert.deepEqual(readState(root).decisions.componentSources, ["discover"]);
  for (const choice of ["scratch,discover", "discover,scratch"]) {
    assert.throws(() => decide(root, { stage: "components", choice, answer: "Write from scratch" }), /scratch cannot be combined/);
  }
  assert.deepEqual(readState(root).decisions.componentSources, ["discover"], "a rejected choice records nothing");
  const result = spawnSync(process.execPath, [cli, "decide", "--root", root, "--project-root", root, "--stage", "components", "--choice", "discover,library", "--answer", "Find more", "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /project,github,index,discover,scratch/);
});

test("adding discover to a recorded decision invalidates checked evidence through the existing lineage", t => {
  const root = fixture(t);
  decide(root, { stage: "components", choice: "project", answer: "Use project components" });
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify({ entries: [owned()] }));
  fs.writeFileSync(path.join(root, "interaction.json"), "{}");
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"]);
  assert.equal(nextAction(root).type, "done");
  decide(root, { stage: "components", choice: "project,discover", answer: "Use project components" });
  assert.equal(readState(root).gates.interaction, undefined);
  assert.equal(nextAction(root).stage, "probe");
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"]);
  decide(root, { stage: "components", choice: "discover,project", answer: "Use project components" });
  assert.equal(readState(root).gates.interaction.status, "passed", "re-recording the identical set keeps the pass");
});

test("components ask offers discover and recommends project, index, then discover", t => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-discovery-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const ask = nextAction(root);
  assert.equal(ask.stage, "components");
  assert.equal(ask.options.length, 5);
  assert.match(ask.options[3], /find.*open-source.*librar.*packages.*icon/i);
  assert.match(ask.recommended, /project.*first.*index.*find more/i);
  assert.match(ask.recommended, /project,index,discover/);
  assert.match(ask.record, /--choice <project\|github\|index\|discover\|scratch, comma-separated>/);
  assert.match(ask.why, /discover/);
  const answer = "Project components first, then the index, then find more";
  const record = ask.record.replace("<project|github|index|discover|scratch, comma-separated>", "project,index,discover").replace('"<the user\'s reply>"', JSON.stringify(answer));
  const decided = spawnSync(record, { cwd: outside, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(decided.status, 0, decided.stdout + decided.stderr);
  assert.deepEqual(readState(root).decisions.componentSources, ["project", "index", "discover"]);
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8", windowsHide: true });
  assert.match(help.stdout, /components requires --choice <project\|github\|index\|discover\|scratch, comma-separated>/);
});

test("build instruction searches the index first, routes discovery and fonts, and keeps the runtime self-contained", t => {
  const root = fixture(t);
  decide(root, { stage: "components", choice: "project,index,discover", answer: "Project components, the index, then find more" });
  const instruction = nextAction(root).instruction;
  assert.match(instruction, /search the index first/i);
  assert.match(instruction, /nothing indexed fits.*maintained open-source/s);
  assert.match(instruction, /pinned revision/);
  assert.match(instruction, /record its entry before using it/);
  assert.match(instruction, /prefer genuinely reusing/i);
  assert.match(instruction, /tools\/open-source-design\.md/);
  assert.match(instruction, /tools\/fonts\.md/);
  assert.match(instruction, /rather than silently defaulting to the system stack; use the system stack only when the page's direction deliberately calls for it/);
  assert.match(instruction, /self-host/);
  assert.match(instruction, /references\/web-motion\.md#self-contained-pages/);
  assert.match(instruction, new RegExp(PERMISSIVE.slice(0, -1).map(escape).join(", ") + ",? or OFL-1\\.1"));
  decide(root, { stage: "components", choice: "project,index", answer: "Project components, then the index" });
  const withoutDiscover = nextAction(root).instruction;
  assert.doesNotMatch(withoutDiscover, /nothing indexed fits/);
  assert.match(withoutDiscover, /tools\/fonts\.md/);
  // Standard and full brief builds extend a treatment, which is what may call for the system stack.
  const standard = fs.mkdtempSync(path.join(os.tmpdir(), "web-discovery-standard-"));
  t.after(() => fs.rmSync(standard, { recursive: true, force: true }));
  initState(standard, { deliverable: "web", tier: "standard", mode: "brief" });
  decide(standard, { stage: "intake", answer: "A product page" });
  decide(standard, { stage: "reference", answer: "none" });
  fs.writeFileSync(path.join(standard, "concepts.md"), "# Concepts");
  decide(standard, { stage: "concept", choice: "1" });
  decide(standard, { stage: "components", choice: "project,index,discover", answer: "Project components, the index, then find more" });
  const treatment = nextAction(standard);
  assert.equal(treatment.stage, "build");
  assert.match(treatment.instruction, /use the system stack only when the treatment deliberately calls for it/);
});

test("a discovered source with pinned license provenance completes build", t => {
  const root = fixture(t);
  check(root, "project,index,discover", "Project components, the index, then find more", { entries: [owned(), icons(), carousel()] });
  const study = icons();
  study.url = "https://phosphoricons.com/";
  study.license = { state: "unverified", id: "NOASSERTION", evidence: ["https://phosphoricons.com/"] };
  study.usedIn[0].how = "Study the arrow icon's geometry and reimplement it independently";
  check(root, "discover", "Find maintained open-source icons", { entries: [study] });
  const commercial = carousel();
  commercial.license = { state: "commercial", id: "LicenseRef-Commercial", evidence: ["https://www.npmjs.com/package/embla-carousel"] };
  commercial.usedIn[0].how = "Study the carousel's drag physics and reimplement them";
  check(root, "discover", "Find maintained open-source options", { entries: [commercial] });
});

test("a discovered source without pinned license provenance is rejected with the missing field", t => {
  const root = fixture(t);
  const answer = "Find maintained open-source icons";
  for (const [mutate, rule] of [
    [value => { delete value.revision; }, /entries\[0\]\.revision must pin/],
    [value => { value.revision = " "; }, /entries\[0\]\.revision must pin/],
    [value => { delete value.license.id; }, /entries\[0\]\.license\.id must give the SPDX/],
    [value => { delete value.license.evidence; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.evidence = []; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.evidence = ["LICENSE"]; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.evidence = ["http://github.com/phosphor-icons/core/blob/v2.1.1/LICENSE"]; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.state = "project-owned"; }, /entries\[0\] discovered sources and fonts use license\.state verified, unverified or commercial/],
    [value => { value.license.state = "platform"; }, /entries\[0\] discovered sources and fonts use license\.state verified, unverified or commercial/],
  ]) {
    const value = icons();
    mutate(value);
    check(root, "discover", answer, { entries: [value] }, rule);
  }
});

test("a discovered url must be https without credentials", t => {
  const root = fixture(t);
  for (const url of ["http://example.com/library", "https://user:secret@example.com/library", "ftp://example.com/library"]) {
    check(root, "discover", "Find maintained open-source icons", { entries: [{ ...icons(), url }] }, /entries\[0\]\.url must be an https source without credentials, or a project file/);
  }
});

test("a discovered entry outside the recorded componentSources names the discover category", t => {
  const root = fixture(t);
  check(root, "project,index", "Project components, then the index", { entries: [owned(), icons()] }, /entries\[1\] source category discover is not in the recorded componentSources project,index/);
  check(root, "github", "Use https://github.com/example/library", { entries: [carousel()] }, /entries\[0\] source category discover is not in the recorded componentSources github/);
  check(root, "scratch", "Write from scratch", { fromScratch: true, entries: [icons()] }, /entries\[0\] external source contradicts fromScratch/);
  check(root, "project,index,discover", "Project components, the index, then find more", { entries: [owned(), icons()] });
});

test("copying or importing a discovered source requires a verified permissive license", t => {
  const root = fixture(t);
  const answer = "Find maintained open-source options";
  for (const id of [...PERMISSIVE, "mit"]) {
    const value = carousel();
    value.license.id = id;
    check(root, "discover", answer, { entries: [value] });
  }
  for (const id of ["GPL-3.0-only", "MIT OR Apache-2.0", "LicenseRef-Custom"]) {
    const value = carousel();
    value.license.id = id;
    check(root, "discover", answer, { entries: [value] }, /copying or importing a discovered source requires license\.state verified and a permissive license\.id/);
    value.usedIn[0].how = "Adapt the carousel markup";
    check(root, "discover", answer, { entries: [value] }, /allows only study\/reimplementation/);
    value.usedIn[0].how = "Study the carousel's drag physics and reimplement them";
    check(root, "discover", answer, { entries: [value] });
  }
  const unverified = carousel();
  unverified.license.state = "unverified";
  check(root, "discover", answer, { entries: [unverified] }, /requires license\.state verified and a permissive license\.id/);
  const unnoticed = carousel();
  unnoticed.usedIn[0].how = "Install embla-carousel 8.5.2 and bundle it";
  check(root, "discover", answer, { entries: [unnoticed] }, /notice handling/);
});

test("font entries need provenance but no component category, under reuse and scratch", t => {
  const root = fixture(t);
  check(root, "project", "Use project components", { entries: [owned(), font()] });
  check(root, "scratch", "从零写", { fromScratch: true, entries: [font()] });
  const unpinned = font();
  delete unpinned.revision;
  check(root, "scratch", "从零写", { fromScratch: true, entries: [unpinned] }, /entries\[0\]\.revision must pin/);
  const unevidenced = font();
  unevidenced.license.evidence = [];
  check(root, "project", "Use project components", { entries: [owned(), unevidenced] }, /entries\[1\]\.license\.evidence must be a non-empty array of https URLs/);
  check(root, "project", "Use project components", { entries: [font()] }, /at least one non-font entry/);
  const indexed = {
    name: "Inter from good-css", kind: "font", sourceId: "vojtaholik/good-css", availability: "bundled-implementation", license: { state: "verified" },
    usedIn: [{ file: "index.html", marker: "InterVariable", how: "Self-host the Inter files; keep the OFL copyright and license notice beside them" }],
  };
  check(root, "project", "Use project components", { entries: [owned(), indexed] });
  fs.mkdirSync(path.join(root, "fonts"));
  fs.writeFileSync(path.join(root, "fonts/HouseSans.woff2"), "font bytes");
  fs.writeFileSync(path.join(root, "styles.css"), '@font-face { font-family: "House Sans"; src: url("fonts/HouseSans.woff2") format("woff2"); }');
  const projectFont = {
    name: "House Sans", kind: "font", sourceId: "fonts/HouseSans.woff2", availability: "project-owned", license: { state: "project-owned" },
    usedIn: [{ file: "styles.css", marker: "House Sans", how: "The project's own brand face" }],
  };
  check(root, "scratch", "Write from scratch", { fromScratch: true, entries: [projectFont] });
  const restricted = font();
  restricted.license.id = "LicenseRef-ITF-Free-Font";
  check(root, "project", "Use project components", { entries: [owned(), restricted] }, /font the page loads ships its files with the project/);
  restricted.usedIn[0].how = "Study the letterforms for custom lettering";
  check(root, "project", "Use project components", { entries: [owned(), restricted] });
  const silent = font();
  silent.usedIn[0].how = "Self-host InterVariable.woff2 with @font-face";
  check(root, "project", "Use project components", { entries: [owned(), silent] }, /notice handling/);
  check(root, "project", "Use project components", { entries: [{ ...owned(), kind: "widget" }] }, /entries\[0\]\.kind must be component, library, icon or font/);
});

test("a URL matching an indexed source keeps the existing citation rule", t => {
  const root = fixture(t);
  const answer = "Search the index, then find more";
  const cited = url => ({
    ...carousel(), name: "Navigation", url,
    license: { state: "verified", id: "MIT", evidence: ["https://github.com/shadcn-ui/ui/blob/a85299a9edd2a961e32f01ced86963a852652bd2/LICENSE.md"] },
  });
  for (const url of ["https://github.com/shadcn-ui/ui", "https://github.com/Shadcn-UI/ui.git", "https://github.com/shadcn-ui/ui/tree/main/apps/v4", "https://ui.shadcn.com/docs/components/navigation-menu"]) {
    check(root, "index,discover", answer, { entries: [cited(url)] }, /entries\[0\]\.url matches the indexed source shadcn-ui\/ui: cite it by sourceId/);
  }
  check(root, "discover", "Find more", { entries: [cited("https://pro.reactbits.dev/docs/app-ui")] }, /indexed source reactbits-pro: cite it by sourceId/);
  check(root, "discover", "Find more", { entries: [cited("https://motion.dev/docs/react-animation")] }, /indexed source motiondivision\/motion: cite it by sourceId/);
  const named = { ...cited("https://github.com/shadcn-ui/ui"), license: { state: "verified" } };
  delete named.revision;
  check(root, "github,discover", "Use https://github.com/shadcn-ui/ui", { entries: [named] });
  named.license.state = "unverified";
  named.usedIn[0].how = "Study and reimplement Navigation";
  check(root, "github,discover", "Use https://github.com/shadcn-ui/ui", { entries: [named] }, /must match the indexed source/);
  check(root, "github,discover", "Use https://github.com/example/library", { entries: [cited("https://github.com/example/library/tree/main/src")] },
    /entries\[0\]\.url links inside the named GitHub repository example\/library; cite the repository URL https:\/\/github\.com\/example\/library/);
  const bySourceId = { ...named, sourceId: "shadcn-ui/ui", license: { state: "verified" } };
  delete bySourceId.url;
  bySourceId.usedIn = [{ file: "index.html", marker: "Navigation", how: "Install the Navigation component; keep the MIT copyright and license notices in LICENSES.md" }];
  check(root, "index,discover", answer, { entries: [bySourceId] });
});
