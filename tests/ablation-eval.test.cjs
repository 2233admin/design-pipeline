"use strict";

// evals/ablation：减层的技能目录只删声明的文件和指向它们的路由、剩下的仍过打包检查；场景的 DESIGN.md 合规；
// 打分分得开好封面、溢出的封面和色值不对的封面（假代理，不调模型）；results.tsv 的列钉住；盲评藏起变体名；判定规则按 README 走。

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { validateDesignFoundationText } = require("../skill/scripts/design-synthesis-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const evalRoot = path.join(repoRoot, "evals/ablation");
const fixtures = path.join(__dirname, "fixtures/ablation");
const load = (name) => import(path.join(evalRoot, name));

// 改这张表就是改 results.tsv 的列：旧结果目录将不能再追加，README 要一起改
const FROZEN_HEADER = [
  "client", "variant", "scenario", "run", "status",
  "score", "hygiene", "adherence", "rhythmScore", "contractOk", "contractIssues", "deliverable",
  "palettePixels", "paletteElements", "typeScale", "declaredFonts", "minFont", "belowMinFont",
  "overflow", "contrastFails", "compositionErrors", "compositionCodes", "contentCoverage",
  "hiddenWithoutMotion", "fakeControls", "antiSlopHard",
  "gapCount", "gapOnStep", "distinctGaps", "ratioCv", "leftEdges", "decorations", "decorationKinds", "decorationRepeat",
  "capture", "skillUsed", "skillEdited", "exit", "seconds", "workdir",
];

function tmp(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function browserTools() {
  try {
    resolvePuppeteer(repoRoot, require.resolve("puppeteer-core", { paths: [repoRoot] }));
    resolveBrowser();
    return { skip: false };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `no browser for the ablation render (${error.message})` };
  }
}
const tools = browserTools();

function walk(root, rel = "") {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(root, next));
    else out.push(next);
  }
  return out;
}

// 变体里的每一行都按原顺序出现在原文件里：只删了行，没有改或加
function isSubsequence(lines, of) {
  let at = 0;
  for (const line of lines) {
    while (at < of.length && of[at] !== line) at += 1;
    if (at === of.length) return false;
    at += 1;
  }
  return true;
}

test("markdown pruning drops the blocks that route to removed files and nothing else", async () => {
  const { mentionChecker, pruneMarkdown } = await load("variants.mjs");
  const mentions = mentionChecker(new Set(["references/gone.md"]), ["vendor/gone/"]);
  const text = [
    "# Guide",
    "",
    "Intro paragraph stays.",
    "",
    "| Task | Read |",
    "| --- | --- |",
    "| Keep | `references/kept.md` |",
    "| Drop | [gone](gone.md) |",
    "",
    "- kept item",
    "- dropped item `vendor/gone/upstream/x.md`",
    "  - its child goes too",
    "- parent kept",
    "  - child dropped (references/gone.md)",
    "",
    "## Gone section `references/gone.md`",
    "",
    "Everything here goes.",
    "",
    "### Nested also goes",
    "",
    "## Emptied",
    "",
    "Only a link to [gone](gone.md).",
    "",
    "## Kept",
    "",
    "Still here.",
  ].join("\n");
  const result = pruneMarkdown(text, (chunk) => mentions(chunk, "references/guide.md"));
  assert.equal(result.text, [
    "# Guide", "", "Intro paragraph stays.", "",
    "| Task | Read |", "| --- | --- |", "| Keep | `references/kept.md` |", "",
    "- kept item", "- parent kept", "",
    "## Kept", "", "Still here.",
  ].join("\n"));
  assert.equal(result.dropped.length, 6);
});

test("each variant tree removes exactly its layer's files and routes, and still passes the package resource check", async (t) => {
  const { LAYERS, VARIANTS, buildVariants, packagedFiles } = await load("variants.mjs");
  const out = tmp(t, "ablation-variants-");
  const reports = buildVariants(VARIANTS, out);
  const packaged = packagedFiles();
  const bare = reports.find((report) => report.variant === "bare");
  assert.equal(bare.tree, null, "bare installs no skill");
  const full = reports.find((report) => report.variant === "full");
  assert.deepEqual(walk(full.tree).sort(), packaged, "full is the packaged skill tree unchanged");
  assert.ok(!packaged.some((file) => /^vendor\/(mengto-skills|iart-motion-skills)\/upstream\//.test(file)), "on-demand bundles stay out, as in the Release package");
  for (const layer of LAYERS) {
    const report = reports.find((entry) => entry.variant === `full-minus-${layer.id}`);
    const expected = packaged.filter((file) => layer.remove.some((entry) => (entry.endsWith("/") ? file.startsWith(entry) : file === entry)));
    assert.ok(expected.length > 0, `${layer.id} removes something`);
    assert.deepEqual(report.removed, expected, `${layer.id} removes exactly the declared files`);
    const files = walk(report.tree).sort();
    assert.deepEqual(files, packaged.filter((file) => !expected.includes(file)), `${layer.id} keeps every other file`);
    assert.ok(report.package.ok, `${layer.id} package check: ${report.package.problems.join("; ")}`);
    assert.ok(report.prunedMarkdown.length > 0, `${layer.id} removes at least one route`);
    for (const { path: kept } of layer.keptCode) assert.ok(files.includes(kept), `${layer.id} keeps ${kept}`);
    for (const { file } of report.prunedMarkdown) {
      const before = fs.readFileSync(path.join(repoRoot, "skill", file), "utf8").split("\n");
      const after = fs.readFileSync(path.join(report.tree, file), "utf8").split("\n");
      assert.ok(after.length < before.length && isSubsequence(after, before), `${layer.id}: ${file} only loses lines`);
    }
    assert.deepEqual(report.residual.filter((entry) => entry.file.endsWith(".md")), [], `${layer.id}: no Markdown still routes to removed files`);
    const resources = JSON.parse(fs.readFileSync(path.join(report.tree, "references/package-resources.json"), "utf8"));
    assert.ok(!resources.required.some((file) => expected.includes(file)), `${layer.id}: package-resources drops the removed files`);
    const route = spawnSync(process.execPath, [path.join(report.tree, "scripts/designer-pipeline.cjs"), "route", "--root", out, "--query", "make a poster cover", "--json"], { encoding: "utf8" });
    assert.equal(route.status, 0, `${layer.id}: the variant CLI still routes: ${route.stderr}`);
  }
  // 只有设计方向库的变体会让 doctor 报缺：库被 next 的方向步骤直接依赖，README 写明了这一点
  const doctor = spawnSync(process.execPath, [path.join(out, "full-minus-design-direction-library/design-pipeline/scripts/designer-pipeline.cjs"), "doctor", "--json"], { encoding: "utf8" });
  assert.equal(doctor.status, 2);
  const doctorResult = JSON.parse(doctor.stdout);
  assert.deepEqual((doctorResult.result ?? doctorResult).missing, ["vendor/design-direction-library/manifest.json"]);
});

test("skill use counts tool calls in stream-json, not the skill list Claude Code prints at start", async () => {
  const { skillUsedIn } = await load("lib.mjs");
  const init = JSON.stringify({ type: "system", subtype: "init", skills: ["design-pipeline"] });
  const read = JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "/w/.claude/skills/design-pipeline/SKILL.md" } }] } });
  const write = JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Write", input: { file_path: "/w/cover.html" } }] } });
  assert.equal(skillUsedIn([init, write].join("\n")), false);
  assert.equal(skillUsedIn([init, read, write].join("\n")), true);
  assert.equal(skillUsedIn("ran node .agents/skills/design-pipeline/scripts/designer-pipeline.cjs next"), true);
  assert.equal(skillUsedIn("wrote cover.html"), false);
});

test("a stale layer declaration fails the build instead of removing nothing", async () => {
  const { expandLayer } = await load("variants.mjs");
  assert.throws(() => expandLayer({ id: "stale", remove: ["references/no-such-file.md"] }, ["references/kept.md"]), /过时/);
});

test("scenarios declare a valid house style, fixed content and an output contract; rule packs exist per style", async () => {
  const { loadCase, scenarios, variantSetup, VARIANTS } = await load("suite.mjs");
  const { contentPieces, readStyle } = await load("measure.mjs");
  assert.deepEqual(scenarios(), ["cover-dark", "cover-light", "explainer-light", "hero-dark"]);
  for (const scenario of scenarios()) {
    const spec = loadCase(scenario);
    validateDesignFoundationText(fs.readFileSync(spec.designFile, "utf8"));
    const style = readStyle(spec.designFile);
    assert.ok(style.colors.length >= 7 && style.sizes.length >= 6, scenario);
    assert.ok(style.sizes.includes(spec.minFontPx) || style.sizes.some((size) => size >= spec.minFontPx), scenario);
    assert.ok(contentPieces(spec.contentFile).length >= 5, scenario);
    assert.ok(spec.width > 0 && spec.height > 0 && spec.deliverables.length >= 1, scenario);
    for (const variant of VARIANTS) {
      const setup = variantSetup(variant, scenario);
      assert.equal(Boolean(setup.skill), variant.startsWith("full"), `${variant} installs a skill only for full variants`);
      assert.ok(!/ablation|消融|variant|变体/.test(setup.agents), `${variant} rules do not reveal the experiment`);
    }
    assert.match(variantSetup("decision-tree", scenario).agents, /出图前自检/);
    assert.match(variantSetup("adjectives", scenario).agents, /高级/);
  }
  const explainer = contentPieces(loadCase("explainer-light").contentFile).join("").replace(/[^一-鿿]/g, "");
  assert.ok(explainer.length >= 350 && explainer.length <= 450, `explainer body is about 400 CJK characters (${explainer.length})`);
});

test("CIEDE2000 matches the published reference pairs", async () => {
  const { deltaE2000 } = await load("measure.mjs");
  // Sharma, Wu, Dalal (2005), table 1, pairs 1, 2, 3 and 7
  assert.equal(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]).toFixed(4), "2.0425");
  assert.equal(deltaE2000([50, 3.1571, -77.2803], [50, 0, -82.7485]).toFixed(4), "2.8615");
  assert.equal(deltaE2000([50, 2.8361, -74.02], [50, 0, -82.7485]).toFixed(4), "3.4412");
  assert.equal(deltaE2000([50, 0, 0], [50, -1, 2]).toFixed(4), "2.3669");
});

test("rhythm proxies count gaps on the spacing unit, scale-ratio spread, left edges and repeated decorations", async () => {
  const { rhythm } = await load("measure.mjs");
  const text = (x, y, h, px) => ({ px, box: { x, y, w: 400, h } });
  const result = rhythm(
    [text(64, 100, 40, 30), text(64, 156, 24, 20), text(64, 196, 24, 20), text(120, 230, 50, 45)],
    [{ tag: "div", w: 20, h: 20, paint: "a" }, { tag: "div", w: 20, h: 20, paint: "a" }, { tag: "div", w: 300, h: 3, paint: "b" }],
    8,
  );
  assert.deepEqual([result.gapCount, result.gapOnStep, result.distinctGaps], [3, 0.667, 2]);
  assert.equal(result.leftEdges, 2);
  assert.equal(result.ratioCv, 0);
  assert.deepEqual([result.decorations, result.decorationKinds, result.decorationRepeat], [3, 2, 0.667]);
});

function writeRows(dir, rows) {
  const lines = [FROZEN_HEADER.join("\t"), ...rows.map((row) => FROZEN_HEADER.map((key) => row[key] ?? "").join("\t"))];
  fs.writeFileSync(path.join(dir, "results.tsv"), `${lines.join("\n")}\n`);
}

test("decision rules: a layer is kept, cut, flagged noisy or no-effect; a stamped-out look loses its measured win", async (t) => {
  const { compare, readTsv } = await load("report.mjs");
  const dir = tmp(t, "ablation-rules-");
  const scenarios = ["a", "b", "c", "d"];
  const rows = [];
  const fingerprint = (seed) => ({ cols: 2, rows: 1, gray: [seed, 255 - seed], mask: [1, seed % 2] });
  for (const scenario of scenarios) {
    for (let run = 1; run <= 3; run += 1) {
      const add = (variant, score, print) => {
        const capture = path.join(dir, `${variant}-${scenario}-${run}`);
        fs.mkdirSync(capture);
        fs.writeFileSync(path.join(capture, "fingerprint.json"), JSON.stringify(print));
        rows.push({ variant, scenario, run, status: "ok", score, capture });
      };
      add("full", 80 + run, fingerprint(run * 60));
      add("full-minus-x", 70 + run, fingerprint(run * 60 + 7));
      add("full-minus-y", 79 + run, fingerprint(run * 60 + 3));
      add("full-minus-z", [40, 85, 95][run - 1], fingerprint(run * 60 + 5));
      add("stamp", 95, fingerprint(9));
    }
  }
  writeRows(dir, rows);
  const parsed = readTsv(path.join(dir, "results.tsv"));
  const byCell = new Map();
  for (const row of parsed) {
    const key = `${row.variant}\t${row.scenario}`;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(row);
  }
  assert.equal(compare("full", "full-minus-x", byCell).verdict, "better");
  assert.equal(compare("full", "full-minus-y", byCell).verdict, "no-effect");
  assert.equal(compare("full", "full-minus-z", byCell).verdict, "noisy");
  const stamped = compare("stamp", "full", byCell);
  assert.ok(stamped.stampedA && !stamped.measuredBetter, "identical runs across scenarios do not win on measured scores");
  assert.equal(stamped.verdict, "no-effect");
  // 盲评够 12 局、胜率 ≥ 60% 时照样算赢：口味由盲评定
  const judge = Array.from({ length: 12 }, (_, index) => ({ left: "stamp", right: "full", winner: index < 8 ? "stamp" : "full" }));
  assert.equal(compare("stamp", "full", byCell, judge).verdict, "better");
  const worse = Array.from({ length: 12 }, (_, index) => ({ left: "full", right: "full-minus-y", winner: index < 4 ? "full" : "full-minus-y" }));
  assert.equal(compare("full", "full-minus-y", byCell, worse).verdict, "worse");
});

test("the fake client run separates a good cover from an overflowing and an off-palette one; the judge never sees variant names", { skip: tools.skip }, async (t) => {
  const { HEADER } = await load("suite.mjs");
  assert.deepEqual(HEADER, FROZEN_HEADER, "results.tsv columns are frozen");
  const out = tmp(t, "ablation-run-");
  const home = tmp(t, "ablation-home-");
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const fake = JSON.stringify([process.execPath, path.join(fixtures, "fake-client.mjs")]);
  const run = spawnSync(process.execPath, [path.join(evalRoot, "run.mjs"), "--client", "claude", "--command", fake, "--variants", "bare,full,full-minus-taste-skill", "--scenarios", "cover-dark", "--runs", "1", "--out", out], { encoding: "utf8", env, timeout: 300000 });
  assert.equal(run.status, 0, run.stderr);
  const { readTsv } = await load("report.mjs");
  const lines = fs.readFileSync(path.join(out, "results.tsv"), "utf8").split("\n");
  assert.equal(lines[0], FROZEN_HEADER.join("\t"));
  const rows = Object.fromEntries(readTsv(path.join(out, "results.tsv")).map((row) => [row.variant, row]));
  const good = rows.full;
  const overflow = rows.bare;
  const offPalette = rows["full-minus-taste-skill"];
  for (const row of [good, overflow, offPalette]) {
    assert.equal(row.status, "ok");
    assert.equal(row.contractOk, true, row.contractIssues);
    assert.equal(row.contentCoverage, 1);
  }
  assert.equal(good.overflow, 0);
  assert.ok(good.palettePixels > 0.95 && good.typeScale === 1 && good.belowMinFont === 0);
  assert.ok(overflow.overflow > 0 && overflow.belowMinFont > 0, "the overflowing cover is caught");
  assert.ok(offPalette.palettePixels < 0.2 && offPalette.overflow === 0, "the off-palette cover is caught by palette distance alone");
  assert.ok(good.score > overflow.score + 10 && good.score > offPalette.score + 10, `scores separate: ${good.score} / ${overflow.score} / ${offPalette.score}`);
  assert.equal(good.skillUsed, true);
  assert.equal(good.skillEdited, false);
  assert.ok(fs.existsSync(path.join(good.capture, "screenshot.png")));

  // 再追加一轮时列必须一致：换了列的结果文件直接拒绝
  const other = tmp(t, "ablation-wrong-");
  fs.writeFileSync(path.join(other, "results.tsv"), "client\tvariant\n");
  const refused = spawnSync(process.execPath, [path.join(evalRoot, "run.mjs"), "--client", "claude", "--command", fake, "--variants", "bare", "--scenarios", "cover-dark", "--runs", "1", "--out", other], { encoding: "utf8", env });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /列和这个实测不一样/);

  // 用户级装着 design-pipeline 时拒绝跑：bare 也会读到它
  fs.mkdirSync(path.join(home, ".agents/skills/design-pipeline"), { recursive: true });
  const guarded = spawnSync(process.execPath, [path.join(evalRoot, "run.mjs"), "--client", "claude", "--command", fake, "--variants", "bare", "--scenarios", "cover-dark", "--runs", "1", "--out", tmp(t, "ablation-guard-")], { encoding: "utf8", env });
  assert.notEqual(guarded.status, 0);
  assert.match(guarded.stderr, /用户级目录装着 design-pipeline/);

  const judgeCommand = JSON.stringify([process.execPath, path.join(fixtures, "fake-judge.mjs")]);
  const judged = spawnSync(process.execPath, [path.join(evalRoot, "judge.mjs"), "--out", out, "--judge", "codex", "--command", judgeCommand, "--seed", "3"], { encoding: "utf8", env });
  assert.equal(judged.status, 0, judged.stderr);
  const games = readTsv(path.join(out, "judge.tsv"));
  assert.equal(games.length, 2, "full against bare and against full-minus-taste-skill");
  for (const game of games) {
    assert.equal(game.winner, game.left, "the fake judge always picks A, which is the left variant");
    const transcript = fs.readFileSync(game.transcript, "utf8");
    const promptText = transcript.split("----- 收到的提示词 -----")[1].split("----- 结束 -----")[0];
    for (const name of ["bare", "full", "minus", "taste-skill", "variant", "变体", "消融"]) assert.ok(!promptText.includes(name), `the judge prompt does not contain ${name}`);
    assert.match(promptText, /A\.png/);
  }
  // 同一家的模型评自己出的图要显式允许
  const same = spawnSync(process.execPath, [path.join(evalRoot, "judge.mjs"), "--out", out, "--judge", "claude", "--command", judgeCommand], { encoding: "utf8", env });
  assert.notEqual(same.status, 0);
  assert.match(same.stderr, /换另一家/);
});
